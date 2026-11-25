import { join } from "node:path";
import { parseEnv } from "node:util";
import { createPublicClient, type Hex, type Transport } from "viem";
import { polygon } from "viem/chains";
import { readOwnerOnly, signerDirectory } from "./signer";

/*
 * Read-only validation of the Polygon RPC the key-grant tick will use (deployment/KEY-GRANTS.md, go-live gate 1).
 * It reads blocks only: no account, no signing, no transaction. Results are fixed codes and numbers; never the URL
 * (an Alchemy URL carries its key in the path) and never an error's message.
 */

/** Where the owner keeps the RPC URL on the tick host: KEY_GRANT_POLYGON_RPC_URL=https://..., mode 0600. */
export const polygonRpcFile = join(signerDirectory, "polygon-rpc.env");

export class RpcFileError extends Error {
  override name = "RpcFileError";
}

/** The https RPC URL from an owner-only file; fixed messages only. */
export async function loadPolygonRpcUrl(file = polygonRpcFile, uid = process.getuid?.()): Promise<string> {
  let text: string;
  try { text = await readOwnerOnly(file, uid); } catch { throw new RpcFileError("rpc_file_unreadable_or_not_owner_only"); }
  let url: string | undefined;
  try { url = parseEnv(text).KEY_GRANT_POLYGON_RPC_URL; } catch { throw new RpcFileError("rpc_file_unparsable"); }
  if (!url || !/^https:\/\/[^\s/]+\/\S*$/.test(url)) throw new RpcFileError("rpc_url_missing_or_not_https");
  return url;
}

/** Finalized lag above this many blocks fails the check: Polygon finalizes within a few blocks. */
const MAX_FINALIZED_LAG = 128n;

export type PolygonRpcCheck = {
  outcome: "pass" | "fail";
  failures: string[];
  chainId?: number;
  latest?: string;
  safe?: string | "unsupported";
  finalized?: string;
  finalizedLagBlocks?: number;
  walked?: number;
  latencyMs?: { calls: number; median: number; max: number };
};

/** Chain 137; finalized, safe and latest tags; the finalized block numbered at its height; a by-hash parent walk. */
export async function checkPolygonRpc(transport: Transport, { walk = 10 }: { walk?: number } = {}): Promise<PolygonRpcCheck> {
  const client = createPublicClient({ chain: polygon, transport });
  const times: number[] = [];
  const timed = async <T>(read: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    try { return await read(); } finally { times.push(performance.now() - start); }
  };
  const result: PolygonRpcCheck = { outcome: "fail", failures: [] };
  const fail = (code: string) => { result.failures.push(code); };
  try {
    result.chainId = await timed(() => client.getChainId());
    if (result.chainId !== 137) fail("chain_not_137");
    const latest = await timed(() => client.getBlock({ blockTag: "latest" }));
    const finalized = await timed(() => client.getBlock({ blockTag: "finalized" }));
    try { result.safe = String((await timed(() => client.getBlock({ blockTag: "safe" }))).number); } catch { result.safe = "unsupported"; }
    if (latest.number === null || finalized.number === null || !finalized.hash) { fail("block_tags_incomplete"); return finish(); }
    result.latest = String(latest.number);
    result.finalized = String(finalized.number);
    if (finalized.number > latest.number) fail("finalized_past_latest");
    else {
      result.finalizedLagBlocks = Number(latest.number - finalized.number);
      if (latest.number - finalized.number > MAX_FINALIZED_LAG) fail("finalized_lagging");
    }
    const numbered = await timed(() => client.getBlock({ blockNumber: finalized.number! }));
    if (numbered.hash?.toLowerCase() !== finalized.hash.toLowerCase()) fail("finalized_not_numbered_block");
    let hash: Hex = finalized.hash;
    result.walked = 0;
    for (let step = 0; step < walk; step++) {
      const block = await timed(() => client.getBlock({ blockHash: hash }));
      if (block.number !== finalized.number - BigInt(step) || block.hash?.toLowerCase() !== hash.toLowerCase()) { fail("walk_broken"); break; }
      result.walked++;
      hash = block.parentHash;
    }
  } catch {
    fail("rpc_error"); // a refused, rate-limited or unreachable call: no message, it may carry the URL
  }
  return finish();

  function finish(): PolygonRpcCheck {
    const sorted = [...times].sort((a, b) => a - b);
    if (sorted.length) result.latencyMs = { calls: sorted.length, median: Math.round(sorted[Math.floor(sorted.length / 2)]), max: Math.round(sorted.at(-1)!) };
    result.outcome = result.failures.length ? "fail" : "pass";
    return result;
  }
}
