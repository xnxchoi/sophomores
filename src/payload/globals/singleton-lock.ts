import { sql } from "@payloadcms/db-postgres";
import type { GlobalBeforeOperationHook, PayloadRequest } from "payload";

type Session = { db?: { execute?: (query: unknown) => Promise<unknown> } };

/**
 * Serializes every write of a global. Payload decides whether a global exists, and so whether to insert or
 * update its single row, after `beforeOperation` and inside the request's transaction
 * (`globals/operations/update.js`). Each writer takes one transaction-scoped advisory lock keyed on the slug
 * before that read, the pattern of `lockCommerce` (`src/lib/commerce/_shared/transaction.ts`). An Admin save
 * and the startup seed then run one after the other in either order, and the second sees the first one's
 * row. PostgreSQL releases the lock when the transaction commits or rolls back; taking it again in the same
 * transaction returns at once.
 */
export async function lockGlobal(
  req: PayloadRequest,
  slug: string
): Promise<void> {
  const transactionID = await req.transactionID;
  const sessions = (
    req.payload.db as unknown as { sessions?: Record<string, Session> }
  ).sessions;
  const db = transactionID ? sessions?.[String(transactionID)]?.db : undefined;
  if (!db || typeof db.execute !== "function")
    throw new Error(`Saving the ${slug} global needs a PostgreSQL transaction`);
  await db.execute(
    sql`SELECT pg_advisory_xact_lock(hashtextextended(${`global:${slug}`}, 0))`
  );
}

/** Each editorial global runs this before Payload reads it for an update. */
export const lockGlobalBeforeUpdate: GlobalBeforeOperationHook = async ({
  args,
  global,
  operation,
  req
}) => {
  if (operation === "update") await lockGlobal(req, global.slug);
  return args;
};
