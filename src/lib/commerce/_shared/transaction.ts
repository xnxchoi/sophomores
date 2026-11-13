import { randomUUID } from "node:crypto";
import { postgresAdapter, sql, type PostgresAdapter, type PostgresAdapterArgs } from "@payloadcms/db-postgres";
import { APIError, type CollectionSlug, type PayloadRequest } from "payload";

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
  label: "Claim" | "Payment";
  payload: PayloadRequest["payload"];
  activePayload: PayloadRequest["payload"];
  activeAdapter: PostgresAdapter;
  restorePayload?: () => void;
};
const claimOwners = new WeakMap<PayloadRequest, ClaimOwnership>();
const paymentEnds = new WeakMap<PayloadRequest, { token: string; state: "unknown" | "committed" | "rolled-back" }>();

export function paymentTransactionToken(req: PayloadRequest): string | undefined {
  const owner = claimOwners.get(req);
  return owner?.label === "Payment" ? owner.transactionID : undefined;
}

export function assertPaymentRollback(req: PayloadRequest, token: string | undefined): void {
  const end = paymentEnds.get(req);
  if (!token || end?.token !== token || end.state !== "rolled-back") throw new Error("Payment rollback acknowledgement unavailable");
}

export async function requirePaymentTransaction(req: PayloadRequest): Promise<void> {
  if (!paymentTransactionToken(req)) throw new Error("Payment requires its native transaction owner");
  await assertClaimOwnership(req);
}

/** Opt-in only: ordinary domain/return requests retain their existing behavior. */
async function assertClaimOwnership(req: PayloadRequest): Promise<void> {
  const owner = claimOwners.get(req);
  if (!owner) return;
  const transactionID = await req.transactionID;
  if (owner.contaminated || req.payload !== owner.activePayload || (owner.payload.db as unknown) !== owner.adapter ||
      (req.payload.db as unknown) !== owner.activeAdapter || owner.adapter.sessions !== owner.sessions ||
      transactionID !== owner.transactionID || !owner.session || owner.sessions[owner.transactionID] !== owner.session || owner.session.db !== owner.transaction) {
    owner.contaminated = true;
    throw new Error(`${owner.label} transaction ownership lost`);
  }
}

/** Only native rejection of our private sentinel proves SQL rollback completed. */
export async function inClaimTransaction<T>(req: PayloadRequest, action: () => Promise<T>): Promise<T> {
  return inOwnedTransaction(req, action, "Claim");
}

/** New financial boundaries never borrow a caller-owned transaction. */
export async function inPaymentTransaction<T>(req: PayloadRequest, action: () => Promise<T>): Promise<T> {
  const existing = claimOwners.get(req);
  if (existing) {
    existing.contaminated = true;
    throw new Error("Payment requires its own transaction");
  }
  if (paymentEnds.get(req)?.state === "unknown") throw new Error("Payment transaction outcome unknown");
  return inOwnedTransaction(req, action, "Payment");
}

/** Private carrier is rethrown only after the native rollback sentinel is acknowledged. */
class OfficialPaymentRejection extends Error {
  constructor(readonly response: Response) { super("Official payment operation rejected"); }
}

/** Official 4xx/5xx responses survive acknowledged rollback; unproved completion is 503. */
export async function inPaymentEndpoint(req: PayloadRequest, handler: (req: PayloadRequest) => Response | Promise<Response>): Promise<Response> {
  const logger = req.payload.logger;
  try {
    return await inPaymentTransaction(req, async () => {
      const response = await handler(req);
      if (!response.ok) {
        // Never log a response body, request, provider evidence or driver error.
        logger.error({ msg: "Official payment endpoint rejected", cause: "official-response-rejected", status: response.status });
        throw new OfficialPaymentRejection(response);
      }
      return response;
    });
  } catch (error) {
    if (error instanceof OfficialPaymentRejection) return error.response;
    if (error instanceof APIError) {
      logger.error({ msg: "Official payment endpoint rejected", cause: "official-api-rejection", status: error.status });
      throw error;
    }
    logger.error({ msg: "Payment endpoint completion unconfirmed", cause: "native-transaction-completion-unconfirmed" });
    throw new APIError("Payment transaction outcome unknown", 503);
  }
}

/** Guard direct official Local API/raw-adapter effects, not just project helpers. */
function protectPaymentRequest(req: PayloadRequest, owner: ClaimOwnership): void {
  const guard = (target: object, adapter: boolean) => new Proxy(target, {
    set() {
      owner.contaminated = true;
      throw new Error("Payment request cannot mutate the shared Payload or adapter");
    },
    deleteProperty() {
      owner.contaminated = true;
      throw new Error("Payment request cannot mutate the shared Payload or adapter");
    },
    get(target, key, receiver) {
      const value: unknown = Reflect.get(target, key, receiver);
      if (typeof value !== "function") return value;
      return async (...args: unknown[]) => {
        if (claimOwners.get(req) !== owner) throw new Error("Payment transaction owner expired");
        await assertClaimOwnership(req);
        if (adapter && ["beginTransaction", "commitTransaction", "rollbackTransaction"].includes(String(key))) {
          owner.contaminated = true;
          throw new Error("Payment transaction cannot be ended by an inner caller");
        }
        const input = args[0];
        const scopedRequest = input && typeof input === "object" && "req" in input ? input.req : undefined;
        // Payload 3.92.1 findByID projects only transactionID for db.findOne.
        const ownedProjection = adapter && scopedRequest !== null && typeof scopedRequest === "object"
          && "transactionID" in scopedRequest && Object.hasOwn(scopedRequest, "transactionID")
          && Reflect.ownKeys(scopedRequest).length === 1
          && typeof req.transactionID === "string" && req.transactionID.length > 0
          && scopedRequest.transactionID === req.transactionID;
        if (scopedRequest !== req && !ownedProjection) {
          owner.contaminated = true;
          throw new Error("Payment operation requires its owned request");
        }
        const result: unknown = await Reflect.apply(value, target, args);
        await assertClaimOwnership(req);
        return result;
      };
    },
  });
  owner.activeAdapter = guard(owner.adapter, true) as PostgresAdapter;
  const guardedPayload = guard(owner.payload, false);
  owner.activePayload = new Proxy(owner.payload, {
    get(target, key, receiver) {
      if (key === "db") return owner.activeAdapter;
      return Reflect.get(guardedPayload, key, receiver);
    },
  });
  bindPaymentPayload(req, owner);
}

/** Installed Local API arrows call createLocalReq with the original singleton. */
function bindPaymentPayload(req: PayloadRequest, owner: ClaimOwnership): void {
  const descriptor = Object.getOwnPropertyDescriptor(req, "payload");
  if (!descriptor || !("value" in descriptor) || !descriptor.configurable || !descriptor.writable) {
    throw new Error("Unsupported payment request payload binding");
  }
  let current = owner.activePayload;
  const get = () => current;
  Object.defineProperty(req, "payload", { configurable: true, enumerable: descriptor.enumerable, get,
    set: (next: PayloadRequest["payload"]) => {
      if (next === owner.payload || next === owner.activePayload) return;
      owner.contaminated = true;
      current = next;
    },
  });
  owner.restorePayload = () => {
    if (Object.getOwnPropertyDescriptor(req, "payload")?.get !== get) return;
    Object.defineProperty(req, "payload", { ...descriptor, value: current === owner.activePayload ? owner.payload : current });
  };
}

async function inOwnedTransaction<T>(req: PayloadRequest, action: () => Promise<T>, label: "Claim" | "Payment"): Promise<T> {
  if (claimOwners.has(req) || await req.transactionID) throw new Error(`${label} requires its own transaction`);
  const adapter = req.payload.db as unknown as PostgresAdapter;
  if (adapter.name !== "postgres" || !adapter.sessions || !adapter.drizzle?.transaction) throw new Error(`${label} transaction unavailable`);
  await adapter.initializing;
  const transactionOptions = adapter.transactionOptions as PostgresAdapterArgs["transactionOptions"];
  if (!adapter.migrationDir || typeof adapter.migrationDir !== "string") throw new Error(`${label} transaction configuration unavailable`);
  // Synchronous factory construction only, in the same supported module graph.
  // The concrete migration directory avoids discovery; no init/connect, pool or
  // payload mutation occurs. Native require identity would reject bundled Next.
  const enabledBegin = postgresAdapter({ pool: {}, migrationDir: adapter.migrationDir }).init({ payload: req.payload }).beginTransaction;
  if (transactionOptions === false || adapter.beginTransaction !== enabledBegin) throw new Error(`${label} requires enabled transactions`);
  if (claimOwners.has(req) || await req.transactionID) throw new Error(`${label} requires its own transaction`);
  const owner: ClaimOwnership = { adapter, sessions: adapter.sessions, transactionID: randomUUID(), contaminated: false,
    label, payload: req.payload, activePayload: req.payload, activeAdapter: adapter };
  if (label === "Payment") paymentEnds.set(req, { token: owner.transactionID, state: "unknown" });
  const rollbackSentinel = new Error("Owned claim callback rejected");
  let callbackError: unknown;
  let callbackRejected = false;
  let callbackCompleted = false;
  let callbackResult: { value: T } | undefined;
  claimOwners.set(req, owner);
  try {
    const result = await adapter.drizzle.transaction<{ value: T }>(async (transaction) => {
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
      if (label === "Payment") protectPaymentRequest(req, owner);
      try {
        const value = await action();
        await assertClaimOwnership(req);
        callbackCompleted = true;
        callbackResult = { value };
        return callbackResult;
      } catch (error) {
        await assertClaimOwnership(req);
        callbackError = error;
        callbackRejected = true;
        throw rollbackSentinel;
      }
    }, transactionOptions);
    await assertClaimOwnership(req);
    if (!callbackCompleted || callbackRejected || result !== callbackResult) throw new Error("Unexpected native transaction settlement");
    if (label === "Payment") paymentEnds.set(req, { token: owner.transactionID, state: "committed" });
    return result.value;
  } catch (error) {
    if (error === rollbackSentinel && callbackRejected) {
      await assertClaimOwnership(req);
      if (label === "Payment") paymentEnds.set(req, { token: owner.transactionID, state: "rolled-back" });
      throw callbackError;
    }
    // A driver error could itself be the original APIError. Never let that
    // impersonate the private native rollback acknowledgement at the endpoint.
    throw new Error(`${label} transaction outcome unknown`, { cause: error });
  } finally {
    if (owner.session && owner.sessions[owner.transactionID] === owner.session) delete owner.sessions[owner.transactionID];
    if (req.transactionID === owner.transactionID) delete req.transactionID;
    if (claimOwners.get(req) === owner) claimOwners.delete(req);
    owner.restorePayload?.();
  }
}
