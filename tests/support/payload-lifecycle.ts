import type { Payload } from "payload";
import type { Pool } from "pg";

/** Capture immediately after getPayload(), before issuing test queries. */
export function capturePayloadTestLifecycle(
  payload: Pick<Payload, "db" | "destroy">,
  continuations: ReadonlySet<Promise<unknown>> = new Set(),
  joinTimeoutMs = 10_000
): () => Promise<void> {
  const pool = payload.db.pool as Pool;
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
    // Since @payloadcms/db-postgres 3.94.2 releases its own startup client,
    // the test only owns draining the pool, not releasing that client.
    try { await pool.end(); }
    catch (error) { failures.push(error); }
    if (failures.length) throw new AggregateError(failures, "Payload test teardown failed after cleanup");
  };
}
