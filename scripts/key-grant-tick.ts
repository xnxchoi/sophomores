import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { writeSync } from "node:fs";
import type { Config, SanitizedConfig } from "payload";

/*
 * One key-grant tick (src/lib/commerce/keys/grant-catch-up.ts): reconcile, replace, dispatch owed keys, then mark
 * refunded keys cancelled once the owner's wallet has cancelled them on chain (no cancel key on this host). Run it on
 * a schedule on the signer host (deployment/KEY-GRANTS.md). With KEY_GRANT_POLYGON_LIVE off it
 * prints {"outcome":"off"} and exits before loading Payload, a signer or an RPC. It prints one JSON line and never a
 * key, an address book or an error's details; a failure prints {"outcome":"failure"} and exits 1.
 */
const RUN_LOCK = "sphmrs:key-grant-tick:v1";

async function tick() {
  const polygon = await import("../src/lib/commerce/keys/unlock/polygon");
  if (!polygon.polygonKeyGrantsLive(process.env)) return { outcome: "off" };
  if (process.env.PAYLOAD_DROP_DATABASE || process.env.PAYLOAD_MIGRATING) throw new Error("Unexpected database mode");
  const rpc = process.env.KEY_GRANT_POLYGON_RPC_URL;
  if (!rpc || !rpc.startsWith("https://")) throw new Error("KEY_GRANT_POLYGON_RPC_URL must be an https URL");
  // The signer first: a missing or wrong key stops the tick before any database work.
  const granter = await polygon.loadPolygonKeyGranterAccount();
  const [{ http }, { default: canonical }, { getPayload }, { createUnlockKeyGrantAdapter }, { runKeyGrantTick }] = await Promise.all([
    import("viem"), import("../src/payload.config"), import("payload"),
    import("../src/lib/commerce/keys/unlock/adapter"), import("../src/lib/commerce/keys/grant-catch-up"),
  ]);
  const grant = createUnlockKeyGrantAdapter({ chainID: polygon.POLYGON_CHAIN_ID, account: granter, transport: http(rpc, { retryCount: 0, timeout: 10_000 }) });
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
    return await runKeyGrantTick({ payload, grant, acquire });
  } finally {
    await payload.destroy();
  }
}

void tick().then(result => { writeSync(1, JSON.stringify(result) + "\n"); process.exit(0); },
  () => { writeSync(1, '{"outcome":"failure"}\n'); process.exit(1); });
