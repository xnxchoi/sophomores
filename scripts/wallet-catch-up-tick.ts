import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { fstatSync, writeSync } from "node:fs";
import type { Config, SanitizedConfig } from "payload";

async function tick() {
  const fd = Number(process.env.SPHMRS_WALLET_LOCK_FD);
  if (!Number.isInteger(fd) || fd < 3 || !fstatSync(fd).isFile()) throw new Error("Missing runner custody");
  if (process.env.PAYLOAD_DROP_DATABASE || process.env.PAYLOAD_MIGRATING) throw new Error("Unexpected database mode");
  const [{ default: canonical }, { getPayload }, { runWalletCatchUpTick }, { walletGrantConfiguration }] = await Promise.all([
    import("../src/payload.config"), import("payload"),
    import("../src/lib/commerce/keys/wallet-catch-up-runner"), import("../src/lib/commerce/keys/wallet-attachment"),
  ]);
  if (!walletGrantConfiguration(process.env)) throw new Error("Wallet attachment is disabled");
  const config = await canonical;
  const logger = { options: { level: "silent" } } satisfies Config["logger"];
  const payload = await getPayload({
    config: { ...config, typescript: { ...config.typescript, autoGenerate: false },
      // Silence startup logs before they reach the receipt channel. Payload's
      // SanitizedConfig deep-requires Pino options that getLogger leaves optional.
      logger: logger as SanitizedConfig["logger"],
      admin: { ...config.admin, importMap: { ...config.admin.importMap, autoGenerate: false } } },
    disableDBConnect: true, disableOnInit: true,
  });
  const db = payload.db as unknown as PostgresAdapter;
  let pool: PostgresAdapter["pool"] | undefined;
  try {
    if (db.name !== "postgres" || db.push !== false || db.prodMigrations || db.readReplicaOptions?.length ||
        Object.values(db.extensions).some(Boolean) || !db.connect || db.poolOptions.connectionString !== process.env.DATABASE_URI) {
      throw new Error("Unexpected runner database adapter");
    }
    db.disableCreateDatabase = true;
    if (!db.pg) throw new Error("PostgreSQL driver unavailable");
    pool = new db.pg.Pool({ connectionString: db.poolOptions.connectionString, max: 3,
      connectionTimeoutMillis: 5000, statement_timeout: 3000, lock_timeout: 1000,
      idle_in_transaction_session_timeout: 4000 });
    pool.on("error", () => { /* Pending operation reports failure; never print driver details. */ });
    const { rows } = await pool.query("SELECT current_database() AS name, current_user AS role");
    if (!process.env.SPHMRS_WALLET_DB_NAME || !process.env.SPHMRS_WALLET_DB_ROLE ||
        rows[0]?.name !== process.env.SPHMRS_WALLET_DB_NAME || rows[0]?.role !== process.env.SPHMRS_WALLET_DB_ROLE) {
      throw new Error("Unexpected runner database identity");
    }
    db.pool = pool;
    await db.connect();
    return await runWalletCatchUpTick(payload);
  } finally {
    try { await payload.destroy(); } finally { await pool?.end(); }
  }
}

void tick().then(result => { writeSync(1, JSON.stringify(result) + "\n"); process.exit(0); },
  () => { writeSync(1, '{"outcome":"failure"}\n'); process.exit(1); });
