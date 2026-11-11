import { randomUUID } from "node:crypto";
import { postgresAdapter, sql, type PostgresAdapter, type PostgresAdapterArgs } from "@payloadcms/db-postgres";
import type { CollectionSlug, PayloadRequest } from "payload";

export type CommerceDocument = Record<string, unknown> & { id: string };

export async function lockCommerce(req: PayloadRequest, keys: string[]): Promise<void> {
  await assertClaimOwnership(req);
  const transactionID = await req.transactionID;
  const database = req.payload.db;
  if (database.name !== "postgres" || !("sessions" in database) || !database.sessions || typeof database.sessions !== "object") {
    throw new Error("Commerce requires an active PostgreSQL transaction");
  }
  const adapter = database as unknown as PostgresAdapter;
  const transaction = transactionID && adapter.sessions?.[String(transactionID)]?.db;
  if (!transaction || typeof transaction.execute !== "function") throw new Error("Commerce requires an active PostgreSQL transaction");
  // The adapter's actual transaction, not its pool: these locks survive until the
  // caller commits/rolls back every plugin write made with this same request.
  for (const key of [...new Set(keys)].sort()) {
    await assertClaimOwnership(req);
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`commerce:${key}`}, 0))`);
    await assertClaimOwnership(req);
  }
}

export async function readCommerce(req: PayloadRequest, collection: string, id: string): Promise<CommerceDocument> {
  await assertClaimOwnership(req);
  const document = await req.payload.findByID({ collection: collection as CollectionSlug, id, depth: 0, overrideAccess: true, req }) as unknown as CommerceDocument;
  await assertClaimOwnership(req);
  return document;
}

export async function findCommerce(req: PayloadRequest, collection: string, field: string, value: string): Promise<CommerceDocument | undefined> {
  await assertClaimOwnership(req);
  const result = await req.payload.find({ collection: collection as CollectionSlug, where: { [field]: { equals: value } }, limit: 1, depth: 0, overrideAccess: true, req });
  await assertClaimOwnership(req);
  return result.docs[0] as unknown as CommerceDocument | undefined;
}

export async function createCommerce(req: PayloadRequest, collection: string, data: Record<string, unknown>): Promise<CommerceDocument> {
  await assertClaimOwnership(req);
  const document = await req.payload.create({ collection: collection as CollectionSlug, data: data as never, overrideAccess: true, req }) as unknown as CommerceDocument;
  await assertClaimOwnership(req);
  return document;
}

export async function updateCommerce(req: PayloadRequest, collection: string, id: string, data: Record<string, unknown>): Promise<CommerceDocument> {
  await assertClaimOwnership(req);
  const document = await req.payload.update({ collection: collection as CollectionSlug, id, data: data as never, overrideAccess: true, req }) as unknown as CommerceDocument;
  await assertClaimOwnership(req);
  return document;
}

export function relationshipID(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value && typeof value === "object" && "id" in value) return String(value.id);
  throw new Error("Missing commerce relationship");
}

export function counter(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 0) throw new Error("Invalid commerce counter");
  return Number(value);
}

export async function inCommerceTransaction<T>(req: PayloadRequest, action: () => Promise<T>): Promise<T> {
  if (await req.transactionID) return action();
  const transactionID = await req.payload.db.beginTransaction();
  if (!transactionID) throw new Error("PostgreSQL transaction unavailable");
  req.transactionID = transactionID;
  try {
    const result = await action();
    await req.payload.db.commitTransaction(transactionID);
    return result;
  } catch (error) {
    await req.payload.db.rollbackTransaction(transactionID);
    throw error;
  } finally {
    delete req.transactionID;
  }
}


type ClaimOwnership = {
  adapter: PostgresAdapter;
  sessions: PostgresAdapter["sessions"];
  transactionID: string;
  session?: PostgresAdapter["sessions"][string];
  transaction?: PostgresAdapter["sessions"][string]["db"];
  contaminated: boolean;
};
const claimOwners = new WeakMap<PayloadRequest, ClaimOwnership>();

/** Opt-in only: legacy payment/return requests retain their existing behavior. */
async function assertClaimOwnership(req: PayloadRequest): Promise<void> {
  const owner = claimOwners.get(req);
  if (!owner) return;
  const transactionID = await req.transactionID;
  if (owner.contaminated || (req.payload.db as unknown) !== owner.adapter || owner.adapter.sessions !== owner.sessions ||
      transactionID !== owner.transactionID || !owner.session || owner.sessions[owner.transactionID] !== owner.session || owner.session.db !== owner.transaction) {
    owner.contaminated = true;
    throw new Error("Claim transaction ownership lost");
  }
}

/** Only native rejection of our private sentinel proves SQL rollback completed. */
export async function inClaimTransaction<T>(req: PayloadRequest, action: () => Promise<T>): Promise<T> {
  if (claimOwners.has(req) || await req.transactionID) throw new Error("Claim requires its own transaction");
  const adapter = req.payload.db as unknown as PostgresAdapter;
  if (adapter.name !== "postgres" || !adapter.sessions || !adapter.drizzle?.transaction) throw new Error("Claim transaction unavailable");
  await adapter.initializing;
  const transactionOptions = adapter.transactionOptions as PostgresAdapterArgs["transactionOptions"];
  if (!adapter.migrationDir || typeof adapter.migrationDir !== "string") throw new Error("Claim transaction configuration unavailable");
  // Synchronous factory construction only, in the same supported module graph.
  // The concrete migration directory avoids discovery; no init/connect, pool or
  // payload mutation occurs. Native require identity would reject bundled Next.
  const enabledBegin = postgresAdapter({ pool: {}, migrationDir: adapter.migrationDir }).init({ payload: req.payload }).beginTransaction;
  if (transactionOptions === false || adapter.beginTransaction !== enabledBegin) throw new Error("Claim requires enabled transactions");
  if (claimOwners.has(req) || await req.transactionID) throw new Error("Claim requires its own transaction");
  const owner: ClaimOwnership = { adapter, sessions: adapter.sessions, transactionID: randomUUID(), contaminated: false };
  const rollbackSentinel = new Error("Owned claim callback rejected");
  let callbackError: unknown;
  let callbackRejected = false;
  let callbackCompleted = false;
  claimOwners.set(req, owner);
  try {
    const result = await adapter.drizzle.transaction<T>(async (transaction) => {
      if (owner.session || await req.transactionID || (req.payload.db as unknown) !== adapter || adapter.sessions !== owner.sessions) {
        owner.contaminated = true;
        throw new Error("Unexpected claim callback ownership");
      }
      // Payload commit/rollback may be called by hooks inside this callback. Do
      // not await native completion here: mark contamination and return promptly.
      const contaminate = async () => { owner.contaminated = true; };
      owner.transaction = transaction;
      owner.session = { db: transaction, reject: contaminate, resolve: contaminate };
      owner.sessions[owner.transactionID] = owner.session;
      req.transactionID = owner.transactionID;
      try {
        const value = await action();
        await assertClaimOwnership(req);
        callbackCompleted = true;
        return value;
      } catch (error) {
        await assertClaimOwnership(req);
        callbackError = error;
        callbackRejected = true;
        throw rollbackSentinel;
      }
    }, transactionOptions);
    await assertClaimOwnership(req);
    if (!callbackCompleted || callbackRejected) throw new Error("Unexpected native claim settlement");
    return result;
  } catch (error) {
    if (error === rollbackSentinel && callbackRejected) {
      await assertClaimOwnership(req);
      throw callbackError;
    }
    // A driver error could itself be the original APIError. Never let that
    // impersonate the private native rollback acknowledgement at the endpoint.
    throw new Error("Claim transaction outcome unknown", { cause: error });
  } finally {
    if (owner.session && owner.sessions[owner.transactionID] === owner.session) delete owner.sessions[owner.transactionID];
    if (req.transactionID === owner.transactionID) delete req.transactionID;
    if (claimOwners.get(req) === owner) claimOwners.delete(req);
  }
}
