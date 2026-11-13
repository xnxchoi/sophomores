import type { Payload } from "payload";
import type { Pool, PoolClient } from "pg";

/** Capture immediately after getPayload(), before issuing test queries. */
export function capturePayloadTestLifecycle(
  payload: Pick<Payload, "db" | "destroy">,
  continuations: ReadonlySet<Promise<unknown>> = new Set(),
  joinTimeoutMs = 10_000
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
    // Report joined failures only after cleanup, including a bounded abort join.
    const failures: unknown[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        Promise.all([...continuations].map((continuation) => continuation.catch((error) => { failures.push(error); }))),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error(`Payload continuation join timed out after ${joinTimeoutMs} ms`)), joinTimeoutMs);
        }),
      ]);
    } catch (error) {
      failures.push(error);
    } finally {
      clearTimeout(timer);
    }
    for (const id of Object.keys(payload.db.sessions ?? {})) {
      try { await payload.db.rollbackTransaction(id); }
      catch (error) { failures.push(error); }
    }
    try { await payload.destroy(); }
    catch (error) { failures.push(error); }
    try { retainedStartupClient.release(); }
    catch (error) { failures.push(error); }
    try { await pool.end(); }
    catch (error) { failures.push(error); }
    if (failures.length) throw new AggregateError(failures, "Payload test teardown failed after cleanup");
  };
}
