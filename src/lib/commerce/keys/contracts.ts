// Key-grant intents (ADR-0004): payment settlement records the key a paid
// entitlement is owed; a separate worker grants it on chain. Pure contracts
// shared by the collection hooks, the settle step, the worker and the reader.

export const keyGrantStates = ["awaiting_wallet", "pending", "submitted", "granted", "failed_retryable", "ambiguous", "cancelled"] as const;
export type KeyGrantState = (typeof keyGrantStates)[number];

export const recipientModes = ["member_safe", "guest_email"] as const;
export type RecipientMode = (typeof recipientModes)[number];

/** Chains a key may be granted on (ADR-0006): Base and Base Sepolia. */
export const keyGrantChains = [8453, 84532] as const;

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
  granted: [],
  cancelled: [],
};

export function canTransition(from: KeyGrantState, to: KeyGrantState): boolean {
  return from === to ? from === "submitted" : transitions[from].includes(to);
}

/** Identity fields fixed at creation; never rewritten by replay or workers. */
export const keyGrantIdentityFields = ["operationKey", "order", "payment", "entitlement", "beneficiaryUser", "recipientMode"] as const;

export function keyGrantOperationKey(orderID: string, unit: number): string {
  if (!orderID || !Number.isSafeInteger(unit) || unit < 1) throw new Error("Invalid key-grant entitlement");
  return `unlock-grant:v1:${orderID}:${unit}`;
}

export type KeyGrantTarget = { chainID: number; lock: string; recipient: string };

/** What a chain adapter reports for one dispatch. No concrete adapter exists yet (ADR-0008). */
export type SubmitOutcome =
  | { kind: "submitted"; txHash: string }
  | { kind: "confirmed"; txHash: string; tokenID: string }
  | { kind: "definitelyNotSent"; code: string }
  | { kind: "unknown"; txHash?: string };

export type ReconcileOutcome =
  | { kind: "confirmed"; tokenID: string }
  | { kind: "definitelyReverted"; code: string }
  | { kind: "unknown" };

export interface KeyGrantAdapter {
  submit(input: { intentID: string; attemptID: string; target: KeyGrantTarget }): Promise<SubmitOutcome>;
  reconcile(input: { intentID: string; txHash: string; target: KeyGrantTarget }): Promise<ReconcileOutcome>;
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
    || typeof target.recipient !== "string" || !addressPattern.test(target.recipient)) throw new Error("Invalid key-grant target");
  return { chainID: target.chainID as number, lock: target.lock, recipient: target.recipient };
}

/** Page-facing key states; internals (targets, hashes, errors) never leave the server. */
export type KeyStatus = "no_key" | "key_pending" | "key_issued";

export function keyStatusOf(states: readonly KeyGrantState[]): KeyStatus {
  const live = states.filter((state) => state !== "cancelled");
  if (!live.length) return "no_key";
  return live.every((state) => state === "granted") ? "key_issued" : "key_pending";
}
