import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { writeSync } from "node:fs";
import type { Config, SanitizedConfig } from "payload";
import type { RpcFileCode } from "../src/lib/commerce/keys/unlock/rpc-check";

/*
 * One-shot recovery reconcile for ONE Polygon grant intent whose receipt fell further below the finalized block than
 * the tick walks (ANCESTRY_CAP, 256 blocks; the tick prints {"event":"key_grant_over_cap","intent":<id>}). Run by a
 * person, from the tick's host and env (deployment/KEY-GRANTS.md, "Over-cap recovery"):
 *
 *   node --import tsx scripts/key-grant-reconcile-one.ts --intent <intent id> --tx <recorded tx hash> --walk <blocks>
 *
 * --walk is the ancestry walk budget for this run: more than 256, at most 20,000 (MAX_RECOVERY_WALK). The same
 * canonical and parentHash-ancestry checks apply; a definitive result makes the same attempt- and hash-fenced write
 * as the tick (worker.ts reconcileOneKeyGrant). It never signs, sends or replaces a transaction: its account can only
 * refuse to sign, so the go-live switch is enabled for this process's reads alone. It holds the tick's run lock, so it
 * never runs beside a tick. It prints one JSON line: {"outcome":"settled","state":...}, {"outcome":"unknown"[,"code"]},
 * or {"outcome":"refused","reason":<fixed code>} (exit 1): bad_args, rpc_url_in_env, rpc_file_* / rpc_url_not_allowed (the owner-only RPC file), no_budget, tick_running, not_found,
 * not_in_flight, hash_not_recorded, or unexpected. Never a key, an address or an error's details.
 */
const RUN_LOCK = "sphmrs:key-grant-tick:v1";

class Refusal extends Error {
  constructor(readonly reason: "bad_args" | "rpc_url_in_env" | RpcFileCode | "no_budget" | "tick_running") { super(reason); }
}

function parseArgs(argv: readonly string[]): { intentID: string; txHash: string; walk: bigint } {
  const value = (flag: string) => { const at = argv.indexOf(flag); return at >= 0 ? argv[at + 1] : undefined; };
  const intentID = value("--intent"), txHash = value("--tx"), walk = value("--walk");
  if (argv.length !== 6 || !intentID || !/^[A-Za-z0-9_-]{1,64}$/.test(intentID) || !txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)
    || !walk || !/^[1-9][0-9]{0,5}$/.test(walk) || BigInt(walk) <= 256n || BigInt(walk) > 20_000n) throw new Refusal("bad_args");
  return { intentID, txHash, walk: BigInt(walk) };
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (process.env.PAYLOAD_DROP_DATABASE || process.env.PAYLOAD_MIGRATING) throw new Error("Unexpected database mode");
  const polygon = await import("../src/lib/commerce/keys/unlock/polygon");
  // The RPC URL (it carries the provider key) comes only from the owner-only file, through the checked loader; never
  // from the environment or a sourced shell file (Review-A, 25 Nov).
  if (process.env.KEY_GRANT_POLYGON_RPC_URL !== undefined) throw new Refusal("rpc_url_in_env");
  const rpcCheck = await import("../src/lib/commerce/keys/unlock/rpc-check");
  let rpc: string;
  try { rpc = await rpcCheck.loadPolygonRpcUrl(); } catch (error) { throw new Refusal(error instanceof rpcCheck.RpcFileError ? error.code : "rpc_file_missing"); }
  const env = { ...process.env, KEY_GRANT_POLYGON_LIVE: "1" }; // reads only: the account below cannot sign
  const { maxCostWei } = await import("../src/lib/commerce/keys/unlock/transactions");
  if (maxCostWei(polygon.POLYGON_CHAIN_ID, env) === null) throw new Refusal("no_budget");
  const [{ toAccount }, { default: canonical }, { getPayload }, { createUnlockKeyGrantAdapter }, { reconcileOneKeyGrant }] = await Promise.all([
    import("viem/accounts"), import("../src/payload.config"), import("payload"),
    import("../src/lib/commerce/keys/unlock/adapter"), import("../src/lib/commerce/keys/worker"),
  ]);
  const neverSigns = async (): Promise<never> => { throw new Error("The recovery reconcile never signs"); };
  const readOnly = toAccount({ address: polygon.POLYGON_KEY_GRANTER, signMessage: neverSigns, signTransaction: neverSigns, signTypedData: neverSigns });
  const adapter = createUnlockKeyGrantAdapter({ chainID: polygon.POLYGON_CHAIN_ID, account: readOnly, env, ancestryCap: args.walk,
    transport: rpcCheck.polygonRpcTransport(rpc) });
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
    const client = await db.pool.connect();
    try {
      const { rows } = await client.query("SELECT pg_try_advisory_lock(hashtext($1)) AS ok", [RUN_LOCK]);
      if (rows[0]?.ok !== true) throw new Refusal("tick_running");
      try {
        return await reconcileOneKeyGrant({ payload, adapter, intentID: args.intentID, txHash: args.txHash });
      } finally {
        await client.query("SELECT pg_advisory_unlock(hashtext($1))", [RUN_LOCK]);
      }
    } finally {
      client.release();
    }
  } finally {
    await payload.destroy();
  }
}

void run().then(result => { writeSync(1, JSON.stringify(result) + "\n"); process.exit(result.outcome === "refused" ? 1 : 0); },
  (error: unknown) => {
    writeSync(1, JSON.stringify({ outcome: "refused", reason: error instanceof Refusal ? error.reason : "unexpected" }) + "\n");
    process.exit(1);
  });
