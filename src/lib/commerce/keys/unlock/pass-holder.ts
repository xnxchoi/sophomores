import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import { createPublicClient, isAddressEqual, type Abi, type Address, type Transport } from "viem";
import { polygon } from "viem/chains";
import { loadPolygonRpcUrl, polygonRpcTransport, walletPassRpcFile } from "./rpc-check";
import { POLYGON_CHAIN_ID } from "./polygon";
import { untracedFetch } from "./untraced-fetch";

/*
 * Serve-time proof for a hosted Wallet pass (Review-A HOLD, 25 Nov): right before our server asks Unlock for a pass,
 * the key must still be valid and still owned by the member's recorded Safe, read live on Polygon. A static invariant
 * cannot cover drift (a lock manager can re-enable transfers or expire a key at any time). Fails closed: a missing or
 * refused RPC file, a wrong chain, no block hash, a non-canonical block, a timeout, a revert or any other error answers
 * false, and the caller then fetches nothing.
 * - Both reads are pinned to ONE block by hash with requireCanonical (EIP-1898), so they describe the same canonical
 *   state (Review-A, H).
 * - One deadline covers all three stages (chain id, block, reads) (Review-A, M).
 * - The RPC goes through untracedFetch, never Next's patched fetch, so the Alchemy key stays out of trace spans (M).
 * - The deadline also aborts: one AbortSignal reaches every request and is checked before each stage, so no work goes
 *   on once the check has answered false (Review-A, 26 Nov, LOW).
 */
export type PassKey = { lock: string; tokenID: string; recipient: string };
export type PassHolderCheck = (key: PassKey) => Promise<boolean>;

const lockAbi = PublicLockV14.abi as Abi;
export const PASS_HOLDER_DEADLINE_MS = 5_000;

export function createPassHolderCheck({ loadUrl = () => loadPolygonRpcUrl(walletPassRpcFile, process.getuid?.(), "WALLET_PASS_POLYGON_RPC_URL"),
  transportFor = (url: string, signal: AbortSignal) => polygonRpcTransport(url, {
    fetchFn: ((input, init) => untracedFetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, signal]) : signal })) as typeof fetch,
    timeout: PASS_HOLDER_DEADLINE_MS }),
  deadlineMs = PASS_HOLDER_DEADLINE_MS }: { loadUrl?: () => Promise<string>; transportFor?: (url: string, signal: AbortSignal) => Transport; deadlineMs?: number } = {}): PassHolderCheck {
  return async ({ lock, tokenID, recipient }) => {
    if (!/^[1-9][0-9]{0,76}$/.test(tokenID)) return false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = new AbortController();
    const expired = new Promise<false>(resolve => { timer = setTimeout(() => { stop.abort(); resolve(false); }, deadlineMs); });
    const live = () => { if (stop.signal.aborted) throw new Error("Pass holder check expired"); };
    const check = (async () => {
      const url = await loadUrl();
      live();
      const client = createPublicClient({ chain: polygon, transport: transportFor(url, stop.signal) });
      if (await client.getChainId() !== POLYGON_CHAIN_ID) return false;
      live();
      const block = await client.getBlock({ blockTag: "latest" });
      if (!block?.hash) return false;
      live();
      const at = { address: lock as Address, abi: lockAbi, args: [BigInt(tokenID)], blockHash: block.hash, requireCanonical: true } as const;
      const [valid, owner] = await Promise.all([
        client.readContract({ ...at, functionName: "isValidKey" }),
        client.readContract({ ...at, functionName: "ownerOf" }),
      ]);
      return valid === true && typeof owner === "string" && isAddressEqual(owner as Address, recipient as Address);
    })().catch(() => false);
    try { return await Promise.race([check, expired]); }
    finally { clearTimeout(timer); stop.abort(); }
  };
}
