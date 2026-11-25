import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { writeSync } from "node:fs";
import type { Config, SanitizedConfig } from "payload";

/*
 * The key-grant queue receipt (src/lib/commerce/keys/queue-receipt.ts; VPS plan v4 H1), run before every supervised
 * key-job run:
 *
 *   node --import tsx scripts/key-grant-queue-read.ts --signer 0x<grant signer address, as gate 1 printed it>
 *
 * One JSON line per intent the tick could act on (intent UUID, state, attempts, nonce, hash flags, target check),
 * then {"receipt":"complete","intents":n,"byState":{...}}. Anything less than a complete read prints
 * {"receipt":"receipt_incomplete"} and exits 1, so an empty list always means an empty queue.
 *
 * Read only, like key-cancel-export.ts: the key job's read role (sophomores_key_grant_read), its own connection with
 * every transaction read only (default_transaction_read_only, checked), schema push and migrations off, no database
 * creation. No RPC, no signer key: the signer is given as its public address.
 */
async function readQueue(): Promise<string[]> {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--signer" || !/^0x[0-9a-fA-F]{40}$/.test(args[1] ?? "")) throw new Error("usage");
  const signer = args[1]!;
  if (process.env.PAYLOAD_DROP_DATABASE || process.env.PAYLOAD_MIGRATING) throw new Error("Unexpected database mode");
  const [{ default: canonical }, { getPayload }, { readKeyGrantQueue }, polygon] = await Promise.all([
    import("../src/payload.config"), import("payload"), import("../src/lib/commerce/keys/queue-receipt"),
    import("../src/lib/commerce/keys/unlock/polygon"),
  ]);
  const pins = { ...polygon.polygonPins, eventLocks: polygon.polygonEventLocks(process.env) };
  const config = await canonical;
  const logger = { options: { level: "silent" } } satisfies Config["logger"];
  const payload = await getPayload({
    config: { ...config, typescript: { ...config.typescript, autoGenerate: false }, logger: logger as SanitizedConfig["logger"],
      admin: { ...config.admin, importMap: { ...config.admin.importMap, autoGenerate: false } } },
    disableDBConnect: true, disableOnInit: true,
  });
  const db = payload.db as unknown as PostgresAdapter;
  let pool: PostgresAdapter["pool"] | undefined;
  try {
    if (db.name !== "postgres" || !db.pg || !db.connect) throw new Error("Unexpected database adapter");
    db.push = false;
    db.prodMigrations = undefined;
    db.disableCreateDatabase = true;
    pool = new db.pg.Pool({ connectionString: db.poolOptions.connectionString, max: 2, connectionTimeoutMillis: 5000,
      statement_timeout: 10_000, options: "-c default_transaction_read_only=on" });
    pool.on("error", () => { /* The pending query reports failure; never print driver details. */ });
    const { rows } = await pool.query("SHOW default_transaction_read_only");
    if (rows[0]?.default_transaction_read_only !== "on") throw new Error("Receipt connection is not read only");
    db.pool = pool;
    await db.connect();
    const receipt = await readKeyGrantQueue({ payload, signer, pins });
    return [...receipt.lines.map((line) => JSON.stringify(line)), JSON.stringify(receipt.summary)];
  } finally {
    try { await payload.destroy(); } finally { await pool?.end(); }
  }
}

void readQueue().then((lines) => {
  for (const line of lines) writeSync(1, line + "\n");
  process.exit(0);
}, () => { writeSync(1, '{"receipt":"receipt_incomplete"}\n'); process.exit(1); });
