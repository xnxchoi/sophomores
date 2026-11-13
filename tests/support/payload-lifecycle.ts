import type { Payload } from "payload";
import type { Pool, PoolClient } from "pg";

/** Capture immediately after getPayload(), before issuing test queries. */
export function capturePayloadTestLifecycle(
  payload: Pick<Payload, "db" | "destroy">,
  continuations: ReadonlySet<Promise<unknown>> = new Set()
): () => Promise<void> {
  const pool = payload.db.pool as Pool;
  // Installed @payloadcms/db-postgres/dist/connect.js:4-38 retains its first
  // pool.connect() client for its reconnect listener, and drizzle/dist/destroy.js
  // does not close it. pg exposes no public enumeration of borrowed clients.
  // Capture exactly that startup client in this test-owned instance, never all
  // clients or process handles. Revisit when the installed adapter fixes this.
  const retainedStartupClient = (pool as unknown as { _clients: PoolClient[] })
    ._clients[0];
  if (!retainedStartupClient)
    throw new Error("Payload test adapter startup client is unavailable.");
  return async () => {
    // Runner abort can start outer after hooks before an inner body settles.
    // Join those bodies (whose rejections are asserted by their tests) first.
    await Promise.allSettled(continuations);
    try {
      for (const id of Object.keys(payload.db.sessions ?? {}))
        await payload.db.rollbackTransaction(id);
      await payload.destroy();
    } finally {
      retainedStartupClient.release();
      await pool.end();
    }
  };
}
