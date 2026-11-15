import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import {
  BaseError, ContractFunctionRevertedError, createPublicClient, createWalletClient, encodeFunctionData, getAddress, http, isAddressEqual, keccak256,
  maxUint256, parseEventLogs, TransactionNotFoundError, TransactionReceiptNotFoundError, zeroAddress,
  type Abi, type Address, type Hex, type LocalAccount, type TransactionReceipt, type Transport,
} from "viem";
import { baseSepolia } from "viem/chains";
import { isTxHash, parseKeyGrantTarget, type KeyGrantAdapter, type KeyGrantTarget, type ReconcileOutcome, type SubmitOutcome } from "../contracts";

/*
 * ADR-0004 chain adapter for an Unlock PublicLock v14, signed by the grant-only
 * signer (ADR-0008). `submit` grants one key per call; `reconcile` reads the
 * receipt. Base mainnet (8453) is refused until an owner-approved slice lifts it.
 *
 * Honest outcomes: everything up to and including signing happens before
 * broadcast, so a failure there is `definitelyNotSent`. The hash is computed from
 * the signed bytes first, so any failure from the broadcast call itself is
 * `unknown` with that hash, for reconciliation to settle. A grant is `confirmed`
 * only when its receipt shows exactly one mint, from this lock, to the target.
 */

const lockAbi = PublicLockV14.abi as Abi;
const BASE_MAINNET = 8453;
const networks: Record<number, { chain: typeof baseSepolia; rpc: string }> = {
  [baseSepolia.id]: { chain: baseSepolia, rpc: "https://sepolia.base.org" },
};

export type GrantInspection =
  | { status: "mined" | "reverted"; receipt: TransactionReceipt }
  | { status: "pending" | "not_found" | "unavailable" };

export type UnlockKeyGrantAdapter = KeyGrantAdapter & { inspect(txHash: Hex): Promise<GrantInspection> };

export type UnlockKeyGrantAdapterOptions = {
  chainID: number;
  account: LocalAccount;
  /** Defaults to the public Base Sepolia RPC. Tests pass a scripted transport. */
  transport?: Transport;
  now?: () => Date;
};

const notSent = (code: string): SubmitOutcome => ({ kind: "definitelyNotSent", code });
const unknown: ReconcileOutcome = { kind: "unknown" };
const reverted = (error: unknown): boolean => error instanceof BaseError && error.walk((cause) => cause instanceof ContractFunctionRevertedError) instanceof ContractFunctionRevertedError;

export function createUnlockKeyGrantAdapter({ chainID, account, transport, now = () => new Date() }: UnlockKeyGrantAdapterOptions): UnlockKeyGrantAdapter {
  if (chainID === BASE_MAINNET) throw new Error("Key grants on Base mainnet (8453) are refused until an owner-approved slice enables them");
  const network = networks[chainID];
  if (!network) throw new Error(`Key grants are not enabled on chain ${chainID}`);
  const rpc = transport ?? http(network.rpc);
  const client = createPublicClient({ chain: network.chain, transport: rpc });
  const wallet = createWalletClient({ account, chain: network.chain, transport: rpc });

  /** The target, only if it is well formed and on this adapter's chain. */
  const targetHere = (value: KeyGrantTarget): { lock: Address; recipient: Address } | "invalid" | "elsewhere" => {
    let target: KeyGrantTarget;
    try { target = parseKeyGrantTarget(value); } catch { return "invalid"; }
    if (target.chainID !== chainID) return "elsewhere";
    return { lock: getAddress(target.lock), recipient: getAddress(target.recipient) };
  };

  async function inspect(txHash: Hex): Promise<GrantInspection> {
    try {
      const receipt = await client.getTransactionReceipt({ hash: txHash });
      return { status: receipt.status === "success" ? "mined" : "reverted", receipt };
    } catch (error) {
      if (!(error instanceof TransactionReceiptNotFoundError)) return { status: "unavailable" };
    }
    try {
      await client.getTransaction({ hash: txHash });
      return { status: "pending" };
    } catch (error) {
      return { status: error instanceof TransactionNotFoundError ? "not_found" : "unavailable" };
    }
  }

  return {
    inspect,

    async submit({ target: value }) {
      const target = targetHere(value);
      if (target === "invalid") return notSent("invalid_target");
      if (target === "elsewhere") return notSent("chain_not_enabled");
      let signed: Hex;
      try {
        // Key expiry and supply are the lock's own configuration, not decided here.
        const duration = await client.readContract({ address: target.lock, abi: lockAbi, functionName: "expirationDuration" }) as bigint;
        const expiry = duration === maxUint256 ? maxUint256 : BigInt(Math.floor(now().getTime() / 1000)) + duration;
        const args = [[target.recipient], [expiry], [zeroAddress]] as const;
        await client.simulateContract({ account, address: target.lock, abi: lockAbi, functionName: "grantKeys", args });
        const request = await wallet.prepareTransactionRequest({ to: target.lock, data: encodeFunctionData({ abi: lockAbi, functionName: "grantKeys", args }) });
        signed = await wallet.signTransaction(request);
      } catch (error) {
        return notSent(reverted(error) ? "simulation_reverted" : "rpc_unavailable");
      }
      const txHash = keccak256(signed);
      try {
        const answered = await client.sendRawTransaction({ serializedTransaction: signed });
        return answered.toLowerCase() === txHash ? { kind: "submitted", txHash } : { kind: "unknown", txHash };
      } catch {
        return { kind: "unknown", txHash };
      }
    },

    async reconcile({ txHash, target: value }) {
      const target = targetHere(value);
      if (typeof target === "string" || !isTxHash(txHash)) return unknown;
      const seen = await inspect(txHash as Hex);
      if (seen.status !== "mined" && seen.status !== "reverted") return unknown;
      if (!seen.receipt.to || !isAddressEqual(seen.receipt.to, target.lock)) return unknown;
      if (seen.status === "reverted") return { kind: "definitelyReverted", code: "tx_reverted" };
      const transfers = parseEventLogs({ abi: lockAbi, eventName: "Transfer", logs: seen.receipt.logs })
        .filter((log) => isAddressEqual(log.address, target.lock)) as unknown as { args: { from: Address; to: Address; tokenId: bigint } }[];
      if (transfers.length !== 1) return unknown;
      const [{ args }] = transfers;
      if (!isAddressEqual(args.from, zeroAddress) || !isAddressEqual(args.to, target.recipient)) return unknown;
      return { kind: "confirmed", tokenID: args.tokenId.toString() };
    },
  };
}
