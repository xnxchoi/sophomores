import { writeSync } from "node:fs";
import type { Config, SanitizedConfig } from "payload";

/*
 * Read-only export of refunded keys the owner must cancel from his own wallet (ADR-0008, ADR-0011: the lock manager is
 * the owner's wallet, never a key on our host; deployment/KEY-GRANTS.md has his steps). One JSON line per key:
 * order, chain, lock, token ID and the key owner's address (a member's wallet: personal data, so it goes only to the
 * owner's own terminal and is never pasted into chat or tickets). It writes nothing; the key-grant tick marks each one
 * cancelled once the chain shows it. A failure prints {"outcome":"failure"} with no details and exits 1.
 */
async function exportCancels() {
  if (process.env.PAYLOAD_DROP_DATABASE || process.env.PAYLOAD_MIGRATING) throw new Error("Unexpected database mode");
  const [{ default: canonical }, { getPayload }, { parseKeyGrantTarget }] = await Promise.all([
    import("../src/payload.config"), import("payload"), import("../src/lib/commerce/keys/contracts"),
  ]);
  const config = await canonical;
  const logger = { options: { level: "silent" } } satisfies Config["logger"];
  const payload = await getPayload({
    config: { ...config, typescript: { ...config.typescript, autoGenerate: false }, logger: logger as SanitizedConfig["logger"],
      admin: { ...config.admin, importMap: { ...config.admin.importMap, autoGenerate: false } } },
    disableOnInit: true,
  });
  try {
    const lines: string[] = [];
    for (let page = 1; ; page++) {
      const found = await payload.find({
        collection: "commerce-key-grant-intents" as never, depth: 0, overrideAccess: true, limit: 100, page, sort: "createdAt",
        where: { and: [{ state: { equals: "granted" } }, { cancelRequested: { equals: true } }, { tokenID: { exists: true } }] } as never,
      });
      for (const doc of found.docs as unknown as Record<string, unknown>[]) {
        const target = parseKeyGrantTarget(doc.target as never);
        lines.push(JSON.stringify({ order: String(doc.order), chainID: target.chainID, lock: target.lock, tokenID: String(doc.tokenID), owner: target.recipient }));
      }
      if (!found.hasNextPage) break;
    }
    return lines;
  } finally {
    await payload.destroy();
  }
}

void exportCancels().then(lines => {
  for (const line of lines) writeSync(1, line + "\n");
  writeSync(1, JSON.stringify({ outcome: "exported", count: lines.length }) + "\n");
  process.exit(0);
}, () => { writeSync(1, '{"outcome":"failure"}\n'); process.exit(1); });
