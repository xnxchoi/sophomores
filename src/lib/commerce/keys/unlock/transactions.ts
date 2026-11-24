import {
  BaseError, createPublicClient, createWalletClient, isAddressEqual, keccak256, parseTransaction, recoverTransactionAddress, TransactionNotFoundError, TransactionReceiptNotFoundError, withTimeout,
  type Address, type Hex, type LocalAccount, type TransactionReceipt, type Transport,
} from "viem";
import { baseSepolia, polygon } from "viem/chains";
import { signerAccountID, type BroadcastOutcome, type RebroadcastOutcome, type TransactionFee } from "../contracts";
import { POLYGON_CHAIN_ID, polygonKeyGrantsLive } from "./polygon";

/*
 * What the Unlock grant adapter and the cancel adapter share: one signer's
 * transactions on one chain. Base Sepolia (84532) is enabled; Polygon (137) is
 * enabled only while the owner's go-live switch is on (KEY_GRANT_POLYGON_LIVE=1,
 * ./polygon); every other chain is refused (ADR-0010).
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

const SEND_RPC_TIMEOUT_MS = 5_000;

/**
 * Blocks a receipt must be buried under (its own block counts as one) before
 * it is trusted, success or revert. Per chain, because reorg depth differs.
 * - 84532 Base Sepolia: OP-stack sequencer ordering; reorgs are rare and shallow.
 *   10 blocks is about 20 s.
 * - 137 Polygon PoS: enabled behind the go-live switch. Polygon has
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
 * - 137 Polygon PoS: 3,000 gwei. The USD 0.10 cap per transaction (ADR-0026)
 *   divided by a grant's gas: the owner's grant used 168,913 gas (Base Sepolia's
 *   proof the same), so at the ceiling a grant costs at most about 0.51 POL, USD
 *   0.04 at POL USD 0.076 (24 Nov quote), and stays under USD 0.10 until POL
 *   passes about USD 0.19. Polygon's usual base fee is tens to a few hundred
 *   gwei, so this leaves room for spikes without letting one cost run away; a
 *   grant above the ceiling is refused unsent (`fee_above_ceiling`). Recheck it
 *   if POL's price moves far.
 */
export const maxFeeCeiling: Readonly<Record<number, bigint>> = { 84532: 50_000_000n, 137: 3_000_000_000_000n };

// Typed as Base Sepolia's chain: both are plain EIP-1559 chains, and viem's chain union does not narrow for signing.
const networks: Readonly<Record<number, { chain: typeof baseSepolia }>> = {
  [baseSepolia.id]: { chain: baseSepolia },
  [polygon.id]: { chain: polygon as unknown as typeof baseSepolia },
};

/**
 * ADR-0026: the worst case of one transaction (its gas limit times its max fee per gas, in wei) may not pass the
 * approved budget; a transaction over it is not signed (or not re-sent) and is parked for a person.
 * - 84532 Base Sepolia: 0.00005 ETH, a million gas at its ceiling (test funds).
 * - 137 Polygon: the owner's approved POL budget, KEY_GRANT_POLYGON_MAX_COST_WEI, converted from USD 0.10 at approval
 *   time (deployment/KEY-GRANTS.md). Required while Polygon is on, a positive integer no larger than 5 POL; without
 *   it no Polygon transaction is built.
 */
export const MAX_POLYGON_COST_WEI = 5n * 10n ** 18n;
export function maxCostWei(chainID: number, env: Readonly<Record<string, string | undefined>> = process.env): bigint | null {
  if (chainID === baseSepolia.id) return 50_000_000_000_000n;
  if (chainID !== POLYGON_CHAIN_ID) return null;
  const value = env.KEY_GRANT_POLYGON_MAX_COST_WEI;
  if (!value || !/^[1-9][0-9]{0,30}$/.test(value)) return null;
  const budget = BigInt(value);
  return budget <= MAX_POLYGON_COST_WEI ? budget : null;
}

/** Whether this process may transact on `chainID` now: Base Sepolia always; Polygon only while the switch is on. */
export function chainEnabled(chainID: number, env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  if (chainID === POLYGON_CHAIN_ID) return polygonKeyGrantsLive(env);
  return chainID === baseSepolia.id;
}

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

/** The adapter's check that recorded bytes are its own operation (target lock and function). */
export type RecordedOperation = (transaction: { to: Address; data: Hex }) => boolean;

export type SignerTransactionsOptions = {
  chainID: number; account: LocalAccount; transport?: Transport; holdMs?: number;
  /** Where the go-live switch is read (default: process.env). */
  env?: Readonly<Record<string, string | undefined>>;
};

/** One signer's transactions on one enabled chain. Throws for a chain that is not enabled (chainEnabled). */
export function createSignerTransactions({ chainID, account, transport, holdMs = 60_000, env = process.env }: SignerTransactionsOptions) {
  const network = Object.hasOwn(networks, chainID) && chainEnabled(chainID, env) ? networks[chainID] : undefined;
  if (!network) throw new Error(`Unlock transactions are refused on chain ${chainID}: Base Sepolia (84532) is enabled, and Polygon (137) only while KEY_GRANT_POLYGON_LIVE=1`);
  const budget = maxCostWei(chainID, env);
  if (budget === null) throw new Error(`Unlock transactions are refused on chain ${chainID}: no approved fee budget (KEY_GRANT_POLYGON_MAX_COST_WEI)`);
  const overBudget = (gas: bigint | undefined, maxFeePerGas: bigint | undefined) =>
    gas === undefined || maxFeePerGas === undefined || maxFeePerGas > ceiling || gas * maxFeePerGas > budget;
  const depth = BigInt(confirmationDepth[chainID]);
  const ceiling = maxFeeCeiling[chainID];
  if (!transport) throw new Error("Unlock requires an explicit transport");
  const rpc: Transport = options => transport({ ...options, timeout: SEND_RPC_TIMEOUT_MS });
  const client = createPublicClient({ chain: network.chain, transport: rpc });
  const wallet = createWalletClient({ account, chain: network.chain, transport: rpc });
  // Also bound caller-supplied transports that ignore their timeout setting.
  // Timeout means unknown, not non-execution: the request may still have reached the node.
  const sendRaw = (raw: Hex) => withTimeout(() => client.sendRawTransaction({ serializedTransaction: raw }),
    { timeout: SEND_RPC_TIMEOUT_MS });
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
      if (overBudget(prepared.gas, prepared.maxFeePerGas ?? prepared.gasPrice)) return "fee_above_ceiling";
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
        const answered = await sendRaw(transaction.signed);
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
    async rebroadcast({ raw }: { raw: string }, recorded: RecordedOperation): Promise<RebroadcastOutcome> {
      // Fail closed before any RPC (Review-A, 24 Nov): only our own signer's transaction, on this chain, of the
      // adapter's own operation, within the fee budget, is ever re-sent.
      let sent: ReturnType<typeof parseTransaction>;
      let from: Address;
      try {
        sent = parseTransaction(raw as Hex);
        from = await recoverTransactionAddress({ serializedTransaction: raw as Parameters<typeof recoverTransactionAddress>[0]["serializedTransaction"] });
      } catch { return { kind: "refused", code: "rebroadcast_unreadable" }; }
      if (sent.type !== "eip1559" || sent.chainId !== chainID || !isAddressEqual(from, account.address) || !sent.to || (sent.value ?? 0n) !== 0n
        || !recorded({ to: sent.to, data: sent.data ?? "0x" })) return { kind: "refused", code: "rebroadcast_mismatch" };
      if (overBudget(sent.gas, sent.maxFeePerGas)) return { kind: "refused", code: "fee_above_cap" };
      const hash = keccak256(raw as Hex);
      try {
        const answered = await sendRaw(raw as Hex);
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

    /** Canonical reads at this hash satisfy the same depth as a settled receipt. */
    async buriedBlockHash(): Promise<Hex | null> {
      const head = await client.getBlockNumber({ cacheTime: 0 });
      if (head + 1n < depth) return null;
      const block = await client.getBlock({ blockNumber: head - depth + 1n });
      return block.number === head - depth + 1n ? block.hash : null;
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
