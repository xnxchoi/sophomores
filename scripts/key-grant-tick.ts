import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { writeSync } from "node:fs";
import type { Config, SanitizedConfig } from "payload";
import type { RpcFileCode } from "../src/lib/commerce/keys/unlock/rpc-check";

/*
 * One key-grant tick (src/lib/commerce/keys/grant-catch-up.ts): reconcile, replace, dispatch owed keys, then mark
 * refunded keys cancelled once the owner's wallet has cancelled them on chain (no cancel key on this host), then release
 * refunded Unlock event seats whose keys are all invalid. Run it on
 * a schedule on the signer host (deployment/KEY-GRANTS.md). With KEY_GRANT_POLYGON_LIVE off it
 * prints {"outcome":"off"} and exits before loading Payload, a signer or an RPC. It prints one JSON line and never a
 * key, an address book or an error's details. A failure prints {"outcome":"failure","reason":<fixed code>} and exits 1:
 * rpc_url_in_env, rpc_file_* / rpc_url_not_allowed (the owner-only RPC file), no_budget, bad_event_locks, signer_refused, or unexpected (anything else, including the database).
 * The Payload logger is silent here, so a seat-sweep failure shows as seatSweepFailures in that line and as one fixed
 * stderr line, {"event":"seat_sweep_failed","count":n}; the tick still exits 0 and the next tick retries.
 */
const RUN_LOCK = "sphmrs:key-grant-tick:v1";

/** A known, fixed precondition failure: its code is printed, never a message. */
class TickRefusal extends Error {
  constructor(readonly reason: "rpc_url_in_env" | RpcFileCode | "no_budget" | "bad_event_locks" | "signer_refused") { super(reason); }
}

async function tick() {
  const polygon = await import("../src/lib/commerce/keys/unlock/polygon");
  if (!polygon.polygonKeyGrantsLive(process.env)) return { outcome: "off" };
  if (process.env.PAYLOAD_DROP_DATABASE || process.env.PAYLOAD_MIGRATING) throw new Error("Unexpected database mode");
  // The RPC URL (it carries the provider key) comes only from the owner-only file, through the checked loader; never
  // from the environment or a sourced shell file (Review-A, 25 Nov).
  if (process.env.KEY_GRANT_POLYGON_RPC_URL !== undefined) throw new TickRefusal("rpc_url_in_env");
  const rpcCheck = await import("../src/lib/commerce/keys/unlock/rpc-check");
  let rpc: string;
  try { rpc = await rpcCheck.loadPolygonRpcUrl(); } catch (error) { throw new TickRefusal(error instanceof rpcCheck.RpcFileError ? error.code : "rpc_file_missing"); }
  // Every precondition is checked before Payload or the site config is loaded.
  const { maxCostWei } = await import("../src/lib/commerce/keys/unlock/transactions");
  if (maxCostWei(polygon.POLYGON_CHAIN_ID, process.env) === null) throw new TickRefusal("no_budget");
  try { polygon.polygonEventLocks(process.env); } catch { throw new TickRefusal("bad_event_locks"); }
  // The signer next: a missing or wrong key stops the tick before any database work.
  let granter: Awaited<ReturnType<typeof polygon.loadPolygonKeyGranterAccount>>;
  try { granter = await polygon.loadPolygonKeyGranterAccount(); } catch { throw new TickRefusal("signer_refused"); }
  const [{ default: canonical }, { getPayload }, { createUnlockKeyGrantAdapter }, { runKeyGrantTick }] = await Promise.all([
    import("../src/payload.config"), import("payload"),
    import("../src/lib/commerce/keys/unlock/adapter"), import("../src/lib/commerce/keys/grant-catch-up"),
  ]);
  const grant = createUnlockKeyGrantAdapter({ chainID: polygon.POLYGON_CHAIN_ID, account: granter, transport: rpcCheck.polygonRpcTransport(rpc) });
  const config = await canonical;
  const logger = { options: { level: "silent" } } satisfies Config["logger"];
  const payload = await getPayload({
    config: { ...config, typescript: { ...config.typescript, autoGenerate: false }, logger: logger as SanitizedConfig["logger"],
      admin: { ...config.admin, importMap: { ...config.admin.importMap, autoGenerate: false } } },
    disableOnInit: true,
  });
  try {
    const db = payload.db as unknown as PostgresAdapter;
    if (db.name !== "postgres" || !db.pool) throw new Error("Unexpected database adapter");
    const pool = db.pool;
    // One tick at a time across processes and hosts: a session-level advisory lock on its own connection.
    const acquire = async () => {
      const client = await pool.connect();
      try {
        const { rows } = await client.query("SELECT pg_try_advisory_lock(hashtext($1)) AS ok", [RUN_LOCK]);
        if (rows[0]?.ok !== true) { client.release(); return null; }
      } catch (error) { client.release(); throw error; }
      return async () => {
        try { await client.query("SELECT pg_advisory_unlock(hashtext($1))", [RUN_LOCK]); } finally { client.release(); }
      };
    };
    // Alert lines are written synchronously, like the result line, so none is lost when the process exits.
    return await runKeyGrantTick({ payload, grant, acquire, log: (line) => writeSync(2, line + "\n") });
  } finally {
    await payload.destroy();
  }
}

void tick().then(result => { writeSync(1, JSON.stringify(result) + "\n"); process.exit(0); },
  (error: unknown) => {
    writeSync(1, JSON.stringify({ outcome: "failure", reason: error instanceof TickRefusal ? error.reason : "unexpected" }) + "\n");
    process.exit(1);
  });
