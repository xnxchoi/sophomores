// Key-grant intents (ADR-0004): payment settlement records the key a paid
// entitlement is owed; a separate worker grants it on chain. Pure contracts
// shared by the collection hooks, the settle step, the worker and the reader.

export const keyGrantStates = ["awaiting_wallet", "pending", "submitted", "granted", "failed_retryable", "ambiguous", "cancelled"] as const;
export type KeyGrantState = (typeof keyGrantStates)[number];

export const recipientModes = ["member_safe", "guest_email"] as const;
export type RecipientMode = (typeof recipientModes)[number];

/** Chains a key may be granted on (ADR-0010): Polygon live, Base Sepolia for testing. The adapter still refuses all but 84532. */
export const keyGrantChains = [137, 84532] as const;

/**
 * Allowed state moves. `submitted` is written BEFORE the adapter is called, so a
 * crash leaves evidence; only proven non-execution returns work to `pending`.
 * `ambiguous` (possibly broadcast) is never retried automatically.
 */
const transitions: Record<KeyGrantState, readonly KeyGrantState[]> = {
  awaiting_wallet: ["pending", "cancelled"],
  pending: ["submitted", "cancelled"],
  submitted: ["submitted", "granted", "failed_retryable", "ambiguous"],
  failed_retryable: ["pending", "cancelled"],
  ambiguous: ["granted", "failed_retryable"],
  // Only the on-chain cancel (ADR-0009) ends a granted key, with recorded evidence.
  granted: ["cancelled"],
  cancelled: [],
};

export function canTransition(from: KeyGrantState, to: KeyGrantState): boolean {
  return from === to ? from === "submitted" : transitions[from].includes(to);
}

/** Identity fields fixed at creation; never rewritten by replay or workers. */
export const keyGrantIdentityFields = ["operationKey", "order", "payment", "entitlement", "beneficiaryUser", "recipientMode", "purpose"] as const;

export function keyGrantOperationKey(orderID: string, unit: number): string {
  if (!orderID || !Number.isSafeInteger(unit) || unit < 1) throw new Error("Invalid key-grant entitlement");
  return `unlock-grant:v1:${orderID}:${unit}`;
}

export type KeyGrantTarget = {
  chainID: number; lock: string; recipient: string; ticketTier?: "member" | "guest"; ticketMode?: "shared";
};
export const MEMBER_EVENT_GRANT = "member-event" as const;

export function memberEventGrantOperationKey(orderID: string, unit: number): string {
  return `${keyGrantOperationKey(orderID, unit)}:member-event`;
}

export function ticketTokenIdentity(chainID: number, lock: string, tokenID: unknown): string | null {
  if (!keyGrantChains.some((chain) => chain === chainID) || !addressPattern.test(lock) || BigInt(lock) <= 1n ||
    typeof tokenID !== "string" || !/^[1-9][0-9]{0,77}$/.test(tokenID) || BigInt(tokenID) >= 1n << 256n) return null;
  return `${chainID}:${lock.toLowerCase()}:${tokenID}`;
}

/** A signer on one chain, as a CAIP-10 account ID: `eip155:<chainID>:<lowercase address>`. Nonces and the signer lock are per account. */
export function signerAccountID(chainID: number, address: string): string {
  if (!Number.isSafeInteger(chainID) || chainID < 1 || !addressPattern.test(address)) throw new Error("Invalid signer account");
  return `eip155:${chainID}:${address.toLowerCase()}`;
}

/** EIP-1559 fees of one signed transaction, in wei, as decimal strings (JSON has no bigint). */
export type TransactionFee = { maxFeePerGas: string; maxPriorityFeePerGas: string };
/**
 * One signed transaction recorded on an intent before it was broadcast: the
 * first send, then each replacement. For grants, `raw` is retained only after
 * a broadcast was attempted, for unchanged re-send; `accepted` turns
 * true once a node answered with its hash; `rebroadcasts` counts unanswered
 * re-sends. Entries recorded without `raw` count as accepted.
 */
export type RecordedSend = TransactionFee & { txHash: string; sentAt: string; raw?: string; accepted?: boolean; rebroadcasts?: number };

/**
 * A dispatch is two adapter steps so the worker can make the hash durable in
 * between (write-ahead): `prepare` builds and signs one grant without sending it,
 * the worker records its hash, nonce and fee on the intent, then `broadcast`
 * sends it. Nothing is ever sent by `prepare`, so any failure there is proven
 * non-execution.
 */
export type PrepareOutcome =
  | { kind: "prepared"; txHash: string; raw: string; nonce: number; fee: TransactionFee }
  | { kind: "definitelyNotSent"; code: string };

/**
 * A replacement re-signs the same grant at the same nonce with a higher fee.
 * `nonceConsumed`: the chain already counts that nonce as used, so one of the
 * recorded transactions (or something else) mined; nothing is signed, and
 * reconcile settles it. Exactly one transaction per nonce can ever mine.
 */
export type ReplaceOutcome =
  | { kind: "prepared"; txHash: string; raw: string; fee: TransactionFee }
  | { kind: "nonceConsumed" }
  | { kind: "definitelyNotSent"; code: string };

/**
 * Re-sending recorded bytes: `accepted` when the node answers with the hash or
 * already holds it; `nonceConsumed` when the node says the nonce is used.
 */
/** `refused`: the recorded bytes failed a check (chain, sender, lock, operation or fee budget) and were not sent. */
/**
 * A re-send names the dispatch record it belongs to: the bytes must hash to that record's transaction, carry its
 * nonce, and be its own operation (Review-A, 24 Nov). `tokenID` is the cancelled key's, for a cancel.
 */
export type RebroadcastInput = { raw: string; txHash: string; nonce: number; target: KeyGrantTarget; tokenID?: string };

export type RebroadcastOutcome = { kind: "accepted" } | { kind: "nonceConsumed" } | { kind: "unknown" } | { kind: "refused"; code: string };

export type BroadcastOutcome =
  | { kind: "submitted" }
  | { kind: "definitelyNotSent"; code: string }
  | { kind: "unknown" };

export type ReconcileOutcome =
  | { kind: "confirmed"; tokenID: string }
  | { kind: "definitelyReverted"; code: string }
  | { kind: "unknown" };

/**
 * Not-sent codes that retrying cannot fix until someone acts (a chain enabled,
 * a target corrected, an existing key resolved). The worker parks these in
 * `failed_retryable` with the code instead of retrying them.
 */
export const parkedGrantCodes = ["chain_not_enabled", "lock_not_enabled", "invalid_target", "recipient_has_key"] as const;

/**
 * Codes that end automatic replacement of a stuck grant; it stays `ambiguous`
 * (and reconciled) for a person, and its signer's new grants are held.
 */
export const grantBroadcastPending = "grant_broadcast_pending";
export const grantBroadcastSuppressed = "grant_broadcast_suppressed";
export const grantRecoveryHeld = "grant_recovery_held";
export const grantBroadcastStops = [grantBroadcastPending, grantBroadcastSuppressed, grantRecoveryHeld] as const;

export const ticketTokenConflict = "ticket_token_conflict";
export const replacementStopCodes = [ticketTokenConflict, "replacement_exhausted", "replacement_fee_ceiling", "replacement_write_ahead_failed", "replacement_rebroadcast_failed", "replacement_rebroadcast_refused", ...grantBroadcastStops] as const;
/** The same stop codes for a cancel; its key stays granted (and reconciled), and the manager's new cancels are held. */
export const cancelReplacementStopCodes = ["cancel_replacement_exhausted", "cancel_replacement_fee_ceiling", "cancel_replacement_write_ahead_failed", "cancel_replacement_rebroadcast_failed", "cancel_replacement_rebroadcast_refused"] as const;

export interface KeyGrantAdapter {
  /** The grant signer's CAIP-10 account; the worker's signer lock and nonce floor are per account. */
  readonly signer: string;
  /**
   * Builds and signs one grant at a nonce no lower than `nonceFloor` (one past
   * this signer's highest in-flight nonce). A prepared grant holds its signer
   * until `broadcast` or `release`.
   */
  prepare(input: { intentID: string; attemptID: string; target: KeyGrantTarget; nonceFloor: number }): Promise<PrepareOutcome>;
  /** Re-signs a stuck grant at its recorded `nonce`, with fees above `previous` and under the chain's ceiling. */
  prepareReplacement(input: { intentID: string; target: KeyGrantTarget; nonce: number; previous: TransactionFee }): Promise<ReplaceOutcome>;
  /** Sends a prepared grant. Called only after its hash is durable on the intent. */
  broadcast(input: { intentID: string; txHash: string }): Promise<BroadcastOutcome>;
  /** Abandons a prepared grant that will never be broadcast, freeing its signer. */
  release(input: { txHash: string }): void;
  /** Re-sends recorded signed bytes unchanged (same hash, same nonce), only if they match their dispatch record. */
  rebroadcast(input: RebroadcastInput): Promise<RebroadcastOutcome>;
  reconcile(input: { intentID: string; txHash: string; target: KeyGrantTarget }): Promise<ReconcileOutcome>;
}

/**
 * ADR-0009 cancel. `confirmedKeyInvalid`: canonical evidence at confirmation depth shows the key is invalid
 * (already cancelled or expired), so nothing needs sending.
 */
export type CancelPrepareOutcome =
  | { kind: "prepared"; txHash: string; raw: string; nonce: number; fee: TransactionFee }
  | { kind: "confirmedKeyInvalid" }
  | { kind: "definitelyNotSent"; code: string };

export type CancelReconcileOutcome =
  | { kind: "confirmed" }
  | { kind: "definitelyReverted"; code: string }
  | { kind: "unknown" };

/** Cancel codes that wait for a person; the worker never retries them. */
export const parkedCancelCodes = ["chain_not_enabled", "lock_not_enabled", "invalid_target", "invalid_token", "token_mismatch", "not_lock_manager", "cancel_signer_is_granter", "cancel_reverted"] as const;

/**
 * The separate lock-manager authority (ADR-0008); never the grant signer. Same
 * write-ahead shape as grants: prepare signs, the worker records the hash, then
 * broadcast sends.
 */
export interface KeyCancelAdapter {
  readonly signer: string;
  prepareCancel(input: { intentID: string; target: KeyGrantTarget; tokenID: string; nonceFloor: number }): Promise<CancelPrepareOutcome>;
  /** Re-signs a stuck cancel at its recorded `nonce`, with fees above `previous` and under the chain's ceiling. */
  prepareCancelReplacement(input: { intentID: string; target: KeyGrantTarget; tokenID: string; nonce: number; previous: TransactionFee }): Promise<ReplaceOutcome>;
  broadcast(input: { intentID: string; txHash: string }): Promise<BroadcastOutcome>;
  release(input: { txHash: string }): void;
  rebroadcast(input: RebroadcastInput): Promise<RebroadcastOutcome>;
  reconcileCancel(input: { txHash: string; target: KeyGrantTarget; tokenID: string }): Promise<CancelReconcileOutcome>;
}

const txHashPattern = /^0x[0-9a-f]{64}$/i;
const addressPattern = /^0x[0-9a-f]{40}$/i;

export function isTxHash(value: unknown): value is string {
  return typeof value === "string" && txHashPattern.test(value);
}

export function parseKeyGrantTarget(value: unknown): KeyGrantTarget {
  const target = value as Partial<KeyGrantTarget> | null;
  if (!target || typeof target !== "object" || !keyGrantChains.includes(target.chainID as never)
    || typeof target.lock !== "string" || !addressPattern.test(target.lock)
    || typeof target.recipient !== "string" || !addressPattern.test(target.recipient)
    || (target.ticketMode !== undefined && target.ticketMode !== "shared") ||
    (target.ticketMode === "shared" ? target.ticketTier !== "guest" && target.ticketTier !== "member"
      : target.ticketTier !== undefined && target.ticketTier !== "guest")) throw new Error("Invalid key-grant target");
  return { chainID: target.chainID as number, lock: target.lock, recipient: target.recipient,
    ...(target.ticketTier ? { ticketTier: target.ticketTier } : {}),
    ...(target.ticketMode ? { ticketMode: target.ticketMode } : {}) };
}

/** Page-facing key states; internals (targets, hashes, errors) never leave the server. */
export type KeyStatus = "no_key" | "key_pending" | "key_issued";

export function keyStatusOf(states: readonly KeyGrantState[]): KeyStatus {
  const live = states.filter((state) => state !== "cancelled");
  if (!live.length) return "no_key";
  return live.every((state) => state === "granted") ? "key_issued" : "key_pending";
}
