import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import { createPublicClient, isAddressEqual, type Abi, type Address, type Transport } from "viem";
import { polygon } from "viem/chains";
import { loadPolygonRpcUrl, polygonRpcTransport, walletPassRpcFile } from "./rpc-check";
import { POLYGON_CHAIN_ID } from "./polygon";

/*
 * Serve-time proof for a hosted Wallet pass (Review-A HOLD, 25 Nov): right before our server asks Unlock for a pass,
 * the key must still be valid and still owned by the member's recorded Safe, read live on Polygon. A static invariant
 * cannot cover drift (a lock manager can re-enable transfers or expire a key at any time). Fails closed: a missing or
 * refused RPC file, a wrong chain, a timeout, a revert or any other error answers false, and the caller then fetches
 * nothing. Reads only (eth_chainId, eth_blockNumber, eth_call), both calls at one block.
 */
export type PassKey = { lock: string; tokenID: string; recipient: string };
export type PassHolderCheck = (key: PassKey) => Promise<boolean>;

const lockAbi = PublicLockV14.abi as Abi;

export function createPassHolderCheck({ loadUrl = () => loadPolygonRpcUrl(walletPassRpcFile, process.getuid?.(), "WALLET_PASS_POLYGON_RPC_URL"),
  transportFor = polygonRpcTransport }: { loadUrl?: () => Promise<string>; transportFor?: (url: string) => Transport } = {}): PassHolderCheck {
  return async ({ lock, tokenID, recipient }) => {
    try {
      if (!/^[1-9][0-9]{0,76}$/.test(tokenID)) return false;
      const client = createPublicClient({ chain: polygon, transport: transportFor(await loadUrl()) });
      if (await client.getChainId() !== POLYGON_CHAIN_ID) return false;
      const blockNumber = await client.getBlockNumber();
      const at = { address: lock as Address, abi: lockAbi, args: [BigInt(tokenID)], blockNumber } as const;
      const [valid, owner] = await Promise.all([
        client.readContract({ ...at, functionName: "isValidKey" }),
        client.readContract({ ...at, functionName: "ownerOf" }),
      ]);
      return valid === true && typeof owner === "string" && isAddressEqual(owner as Address, recipient as Address);
    } catch {
      return false;
    }
  };
}
