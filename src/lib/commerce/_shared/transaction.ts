import { sql, type PostgresAdapter } from "@payloadcms/db-postgres";
import type { CollectionSlug, PayloadRequest } from "payload";

export type CommerceDocument = Record<string, unknown> & { id: string };

export async function lockCommerce(req: PayloadRequest, keys: string[]): Promise<void> {
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
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${`commerce:${key}`}, 0))`);
  }
}

export async function readCommerce(req: PayloadRequest, collection: string, id: string): Promise<CommerceDocument> {
  return await req.payload.findByID({ collection: collection as CollectionSlug, id, depth: 0, overrideAccess: true, req }) as unknown as CommerceDocument;
}

export async function findCommerce(req: PayloadRequest, collection: string, field: string, value: string): Promise<CommerceDocument | undefined> {
  const result = await req.payload.find({ collection: collection as CollectionSlug, where: { [field]: { equals: value } }, limit: 1, depth: 0, overrideAccess: true, req });
  return result.docs[0] as unknown as CommerceDocument | undefined;
}

export async function createCommerce(req: PayloadRequest, collection: string, data: Record<string, unknown>): Promise<CommerceDocument> {
  return await req.payload.create({ collection: collection as CollectionSlug, data: data as never, overrideAccess: true, req }) as unknown as CommerceDocument;
}

export async function updateCommerce(req: PayloadRequest, collection: string, id: string, data: Record<string, unknown>): Promise<CommerceDocument> {
  return await req.payload.update({ collection: collection as CollectionSlug, id, data: data as never, overrideAccess: true, req }) as unknown as CommerceDocument;
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
