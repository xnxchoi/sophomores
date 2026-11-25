import { writeSync } from "node:fs";

/*
 * Read-only check of the owner's Polygon RPC before go-live (deployment/KEY-GRANTS.md, live gate 1):
 *
 *   node --import tsx scripts/key-grant-rpc-check.ts [--file <path>]     (default ~/.config/sphmrs/polygon-rpc.env)
 *
 * The file must be owner-only (0600, not a symlink) and hold KEY_GRANT_POLYGON_RPC_URL=https://... It reads blocks
 * only: no signer file, no account, no transaction. It prints one JSON line with fixed codes, block numbers, the URL's
 * host (never its path, which carries the provider key) and latency; exit 0 on pass, 1 otherwise.
 */
async function run() {
  const argv = process.argv.slice(2);
  if (!(argv.length === 0 || (argv.length === 2 && argv[0] === "--file"))) return { outcome: "fail", failures: ["bad_args"] };
  const [{ http }, { checkPolygonRpc, loadPolygonRpcUrl, polygonRpcFile }] = await Promise.all([
    import("viem"), import("../src/lib/commerce/keys/unlock/rpc-check"),
  ]);
  let url: string;
  try { url = await loadPolygonRpcUrl(argv[1] ?? polygonRpcFile); } catch (error) { return { outcome: "fail", failures: [error instanceof Error ? error.message : "rpc_file"] }; }
  const host = new URL(url).host;
  return { host, ...(await checkPolygonRpc(http(url, { retryCount: 0, timeout: 10_000 }))) };
}

void run().then(result => { writeSync(1, JSON.stringify(result) + "\n"); process.exit(result.outcome === "pass" ? 0 : 1); },
  () => { writeSync(1, JSON.stringify({ outcome: "fail", failures: ["unexpected"] }) + "\n"); process.exit(1); });
