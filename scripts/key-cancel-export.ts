import type { PostgresAdapter } from "@payloadcms/db-postgres";
import { writeSync } from "node:fs";
import type { Config, SanitizedConfig } from "payload";

/*
 * Read-only export of refunded keys the owner must cancel from his own wallet (ADR-0008, ADR-0011: the lock manager is
 * the owner's wallet, never a key on our host; deployment/KEY-GRANTS.md has his steps).
 *
 * Scope (Review-A, 24 Nov): token IDs are unique only per lock, so only keys on chain 137 and on a pinned Polygon lock
 * (the Signet lock or a configured event lock, KEY_GRANT_POLYGON_EVENT_LOCKS) are listed for cancelling, each labelled
 * with its lock. Any other refunded key is listed only as {"order","skipped":"not_a_pinned_polygon_lock"}, with no
 * token or address, for a person to look at.
 *
 * Structurally read-only (Review-A): its own connection runs every transaction read only
 * (default_transaction_read_only), schema push and migrations are off, and database creation is disabled, so any write
 * fails in PostgreSQL. The key owner's address is a member's wallet (personal data): it goes only to the owner's own
 * terminal. A failure prints {"outcome":"failure"} with no details and exits 1.
 */
async function exportCancels() {
  if (process.env.PAYLOAD_DROP_DATABASE || process.env.PAYLOAD_MIGRATING) throw new Error("Unexpected database mode");
  const [{ default: canonical }, { getPayload }, { parseKeyGrantTarget }, polygon] = await Promise.all([
    import("../src/payload.config"), import("payload"), import("../src/lib/commerce/keys/contracts"),
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
    if (rows[0]?.default_transaction_read_only !== "on") throw new Error("Export connection is not read only");
    db.pool = pool;
    await db.connect();
    const lines: string[] = [];
    let cancel = 0;
    let skipped = 0;
    for (let page = 1; ; page++) {
      const found = await payload.find({
        collection: "commerce-key-grant-intents" as never, depth: 0, overrideAccess: true, limit: 100, page, sort: "createdAt",
        where: { and: [{ state: { equals: "granted" } }, { cancelRequested: { equals: true } }, { tokenID: { exists: true } }] } as never,
      });
      for (const doc of found.docs as unknown as Record<string, unknown>[]) {
        const order = String(doc.order);
        let target: ReturnType<typeof parseKeyGrantTarget> | null = null;
        try { target = parseKeyGrantTarget(doc.target as never); } catch { target = null; }
        if (!target || target.chainID !== polygon.POLYGON_CHAIN_ID || !polygon.polygonLockPinned(target.lock, pins)) {
          skipped++;
          lines.push(JSON.stringify({ order, skipped: "not_a_pinned_polygon_lock" }));
          continue;
        }
        cancel++;
        const lockKind = target.lock.toLowerCase() === pins.lock.toLowerCase() ? "signet" : "event";
        lines.push(JSON.stringify({ order, chainID: target.chainID, lock: target.lock, lockKind, tokenID: String(doc.tokenID), owner: target.recipient }));
      }
      if (!found.hasNextPage) break;
    }
    lines.push(JSON.stringify({ outcome: "exported", cancel, skipped }));
    return lines;
  } finally {
    try { await payload.destroy(); } finally { await pool?.end(); }
  }
}

void exportCancels().then(lines => {
  for (const line of lines) writeSync(1, line + "\n");
  process.exit(0);
}, () => { writeSync(1, '{"outcome":"failure"}\n'); process.exit(1); });
