import { writeSync } from "node:fs";

/*
 * Read-only check of the owner's Polygon RPC before go-live (deployment/KEY-GRANTS.md, live gate 1):
 *
 *   node --import tsx scripts/key-grant-rpc-check.ts [--file <path>]     (default ~/.config/sphmrs/polygon-rpc.env)
 *
 * The file must be owner-only (0600, not a symlink) and hold KEY_GRANT_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/<key>
 * (nothing else is accepted; redirects are errors). It reads blocks
 * only: no signer file, no account, no transaction. It prints one JSON line with fixed codes, block numbers, the URL's
 * host (never its path, which carries the provider key) and latency; exit 0 on pass, 1 otherwise.
 */
async function run() {
  const argv = process.argv.slice(2);
  if (!(argv.length === 0 || (argv.length === 2 && argv[0] === "--file"))) return { outcome: "fail", failures: ["bad_args"] };
  const { checkPolygonRpc, loadPolygonRpcUrl, polygonRpcFile, polygonRpcTransport, RpcFileError } = await import("../src/lib/commerce/keys/unlock/rpc-check");
  let url: string;
  try { url = await loadPolygonRpcUrl(argv[1] ?? polygonRpcFile); } catch (error) { return { outcome: "fail", failures: [error instanceof RpcFileError ? error.code : "rpc_file"] }; }
  return { host: new URL(url).host, ...(await checkPolygonRpc(polygonRpcTransport(url))) };
}

void run().then(result => { writeSync(1, JSON.stringify(result) + "\n"); process.exit(result.outcome === "pass" ? 0 : 1); },
  () => { writeSync(1, JSON.stringify({ outcome: "fail", failures: ["unexpected"] }) + "\n"); process.exit(1); });
