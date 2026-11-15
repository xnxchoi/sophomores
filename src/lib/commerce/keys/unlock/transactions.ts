import {
  BaseError, createPublicClient, createWalletClient, http, isAddressEqual, keccak256, parseTransaction, TransactionNotFoundError, TransactionReceiptNotFoundError,
  type Address, type Hex, type LocalAccount, type TransactionReceipt, type Transport,
} from "viem";
import { baseSepolia } from "viem/chains";
import { signerAccountID, type BroadcastOutcome, type RebroadcastOutcome, type TransactionFee } from "../contracts";

/*
 * What the Unlock grant adapter and the cancel adapter share: one signer's
 * transactions on one chain. Only Base Sepolia (84532) is enabled; every other
 * chain is refused until an owner-approved slice enables it (ADR-0010).
 *
 * Nonces: one lane per signer account in this process. A signed transaction
 * holds the lane until it is broadcast or released (or `holdMs` passes, after
 * which it can no longer be broadcast). A new nonce is the largest of the
 * chain's `pending` count, the lane's next local nonce, and the worker's floor
 * (one past this signer's highest nonce still in flight in the database, so two
 * processes never share one). A nonce recorded on an intent stays that
 * intent's until it settles: it is never handed to another transaction, even
 * after an unclear broadcast the node turns out not to hold; that intent's own
 * replacement fills the gap.
 */

/**
 * Blocks a receipt must be buried under (its own block counts as one) before
 * it is trusted, success or revert. Per chain, because reorg depth differs.
 * - 84532 Base Sepolia: OP-stack sequencer ordering; reorgs are rare and shallow.
 *   10 blocks is about 20 s.
 * - 137 Polygon PoS: set ahead of enablement (refused below). Polygon has
 *   reorged far deeper than Base: the largest publicly reported was 157 blocks
 *   (February 2023). 256 blocks (about 9 min at ~2 s) clears that with margin.
 *   The cost is a longer "key pending" after payment; the payment is unaffected.
 */
export const confirmationDepth: Readonly<Record<number, number>> = { 84532: 10, 137: 256 };

/**
 * Highest `maxFeePerGas` (wei) any transaction of ours may carry, first sends
 * and replacements alike, per enabled chain.
 * - 84532 Base Sepolia: 0.05 gwei, ten times its floor base fee of 0.005 gwei
 *   (flat at 5,000,000 wei in every block sampled on 2026-11-16). A grant's gas
 *   at the ceiling costs about 0.00001 ETH, within the throwaway signer's means.
 * Polygon (137) gets its own value with its enablement slice.
 */
export const maxFeeCeiling: Readonly<Record<number, bigint>> = { 84532: 50_000_000n };

const networks: Readonly<Record<number, { chain: typeof baseSepolia; rpc: string }>> = {
  [baseSepolia.id]: { chain: baseSepolia, rpc: "https://sepolia.base.org" },
};

export type Inspection =
  | { status: "mined" | "reverted"; receipt: TransactionReceipt }
  | { status: "pending" | "not_found" | "unavailable" };

type Lane = { next?: number; tail: Promise<void> };
const lanes = new Map<string, Lane>();

/** Waits for the lane and returns its release (idempotent). */
async function enter(lane: Lane): Promise<() => void> {
  const before = lane.tail;
  let open!: () => void;
  lane.tail = new Promise<void>((resolve) => { open = resolve; });
  await before;
  let done = false;
  return () => { if (!done) { done = true; open(); } };
}

type Fees = { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
const ceil = (value: bigint, numerator: bigint, denominator: bigint) => (value * numerator + denominator - 1n) / denominator;
const larger = (x: bigint, y: bigint) => x > y ? x : y;

/**
 * Fees for re-signing a nonce: each of `maxFeePerGas` and the tip is the larger
 * of 1.25x its previous value and the network's current estimate, clamped to
 * the ceiling. Nodes accept a replacement only when BOTH rise strictly and by
 * at least 10% (geth's default price bump), so when no such raise fits under
 * the ceiling there is none: `null`.
 */
export function replacementFee(previous: TransactionFee, estimate: Fees, ceiling: bigint): Fees | null {
  const before = { maxFeePerGas: BigInt(previous.maxFeePerGas), maxPriorityFeePerGas: BigInt(previous.maxPriorityFeePerGas) };
  let maxFeePerGas = larger(ceil(before.maxFeePerGas, 5n, 4n), estimate.maxFeePerGas);
  let maxPriorityFeePerGas = larger(larger(ceil(before.maxPriorityFeePerGas, 5n, 4n), before.maxPriorityFeePerGas + 1n), estimate.maxPriorityFeePerGas);
  if (maxFeePerGas > ceiling) maxFeePerGas = ceiling;
  if (maxPriorityFeePerGas > maxFeePerGas) maxPriorityFeePerGas = maxFeePerGas;
  const raised = (next: bigint, prior: bigint) => next > prior && next >= ceil(prior, 11n, 10n);
  return raised(maxFeePerGas, before.maxFeePerGas) && raised(maxPriorityFeePerGas, before.maxPriorityFeePerGas) ? { maxFeePerGas, maxPriorityFeePerGas } : null;
}

export type SignerTransactionsOptions = { chainID: number; account: LocalAccount; transport?: Transport; holdMs?: number };

/** One signer's transactions on one enabled chain. Throws for any chain but Base Sepolia. */
export function createSignerTransactions({ chainID, account, transport, holdMs = 60_000 }: SignerTransactionsOptions) {
  const network = Object.hasOwn(networks, chainID) ? networks[chainID] : undefined;
  if (!network) throw new Error(`Unlock transactions are refused on chain ${chainID}: only Base Sepolia (84532) is enabled until an owner-approved slice enables more`);
  const depth = BigInt(confirmationDepth[chainID]);
  const ceiling = maxFeeCeiling[chainID];
  const rpc = transport ?? http(network.rpc);
  const client = createPublicClient({ chain: network.chain, transport: rpc });
  const wallet = createWalletClient({ account, chain: network.chain, transport: rpc });
  const signer = signerAccountID(chainID, account.address);
  const lane = lanes.get(signer) ?? { tail: Promise.resolve() };
  lanes.set(signer, lane);
  const held = new Map<string, { signed: Hex; nonce: number; release: () => void; timer: ReturnType<typeof setTimeout> }>();

  /** The transport must serve this chain before anything is read from it. */
  let chainConfirmed = false;
  const onChain = async (): Promise<boolean> => chainConfirmed ||= (await client.getChainId()) === chainID;

  async function inspect(txHash: Hex): Promise<Inspection> {
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
    client, signer, address: account.address as Address, ceiling, onChain, inspect,

    /** Holds this signer's lane until the returned release (or a signed transaction's broadcast/release). */
    hold: () => enter(lane),

    /** The next nonce: never below the chain's pending count, this lane's own sends, or the worker's floor. */
    async nextNonce(floor: number): Promise<number> {
      const pending = await client.getTransactionCount({ address: account.address, blockTag: "pending" });
      return Math.max(pending, lane.next ?? 0, floor);
    },

    /** Whether the chain already counts `nonce` as used, by the latest block (`pending` would include our own stuck one). */
    async nonceConsumed(nonce: number): Promise<boolean> {
      return (await client.getTransactionCount({ address: account.address, blockTag: "latest" })) > nonce;
    },

    estimateFees: (): Promise<Fees> => client.estimateFeesPerGas() as Promise<Fees>,

    /**
     * Signs one transaction while the caller holds the lane, and keeps it held
     * (through `release`) until broadcast, release or expiry. Nothing is sent.
     * RPC errors propagate for the caller to map to a not-sent code.
     */
    async sign(release: () => void, request: { to: Address; data: Hex; nonce: number; fees?: Fees }): Promise<{ txHash: Hex; raw: Hex; nonce: number; fee: TransactionFee } | "fee_above_ceiling"> {
      const prepared = await wallet.prepareTransactionRequest({ to: request.to, data: request.data, nonce: request.nonce, ...request.fees });
      if ((prepared.maxFeePerGas ?? prepared.gasPrice ?? 0n) > ceiling) return "fee_above_ceiling";
      const signed = await wallet.signTransaction(prepared);
      const sent = parseTransaction(signed);
      const txHash = keccak256(signed);
      const timer = setTimeout(() => { held.delete(txHash); release(); }, holdMs);
      timer.unref?.();
      held.set(txHash, { signed, nonce: request.nonce, release, timer });
      return { txHash, raw: signed, nonce: request.nonce, fee: { maxFeePerGas: String(sent.maxFeePerGas), maxPriorityFeePerGas: String(sent.maxPriorityFeePerGas) } };
    },

    /**
     * Sends a signed transaction. The hash is computed from the signed bytes, so
     * any failure of the send itself is `unknown`, for reconciliation to settle.
     */
    async broadcast({ txHash }: { txHash: string }): Promise<BroadcastOutcome> {
      const hash = txHash.toLowerCase() as Hex;
      const transaction = held.get(hash);
      if (!transaction) return { kind: "definitelyNotSent", code: "not_prepared" }; // released, expired or never signed here
      held.delete(hash);
      clearTimeout(transaction.timer);
      try {
        const answered = await client.sendRawTransaction({ serializedTransaction: transaction.signed });
        return answered.toLowerCase() === hash ? { kind: "submitted" } : { kind: "unknown" };
      } catch {
        return { kind: "unknown" };
      } finally {
        lane.next = Math.max(lane.next ?? 0, transaction.nonce + 1);
        transaction.release();
      }
    },

    /**
     * Re-sends recorded signed bytes unchanged: the same hash at the same nonce,
     * so it can never become a second transaction. A node that already holds it
     * answers "already known"; one that has mined the nonce answers "nonce too low".
     */
    async rebroadcast({ raw }: { raw: string }): Promise<RebroadcastOutcome> {
      const hash = keccak256(raw as Hex);
      try {
        const answered = await client.sendRawTransaction({ serializedTransaction: raw as Hex });
        return answered.toLowerCase() === hash ? { kind: "accepted" } : { kind: "unknown" };
      } catch (error) {
        const text = (error instanceof BaseError ? `${error.details} ${error.shortMessage}` : String(error)).toLowerCase();
        if (text.includes("already known")) return { kind: "accepted" };
        if (text.includes("nonce too low")) return { kind: "nonceConsumed" };
        return { kind: "unknown" };
      }
    },

    /** Abandons a signed transaction that will never be broadcast, freeing the lane. */
    release({ txHash }: { txHash: string }): void {
      const transaction = held.get(txHash.toLowerCase());
      if (!transaction) return;
      held.delete(txHash.toLowerCase());
      clearTimeout(transaction.timer);
      transaction.release();
    },

    /**
     * The receipt of `txHash`, only once it is to `to` and buried at the chain's
     * depth; `null` while that cannot be shown (not mined, too shallow, another
     * chain, unreachable).
     */
    async buriedReceipt(txHash: Hex, to: Address): Promise<TransactionReceipt | null> {
      try { if (!(await onChain())) return null; } catch { return null; }
      const seen = await inspect(txHash);
      if (seen.status !== "mined" && seen.status !== "reverted") return null;
      if (!seen.receipt.to || !isAddressEqual(seen.receipt.to, to)) return null;
      let head: bigint;
      try { head = await client.getBlockNumber({ cacheTime: 0 }); } catch { return null; }
      return head - seen.receipt.blockNumber + 1n < depth ? null : seen.receipt;
    },
  };
}
