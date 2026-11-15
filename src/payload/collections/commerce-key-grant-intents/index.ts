import { APIError, type CollectionConfig } from "payload";
import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";
import { commerceServerWrite } from "@/lib/commerce/access";
import { canTransition, isTxHash, keyGrantIdentityFields, keyGrantStates, parseKeyGrantTarget, recipientModes, type KeyGrantState, type RecordedSend } from "@/lib/commerce/keys/contracts";
import { relationshipID } from "@/lib/commerce/_shared/transaction";

const identityValue = (value: unknown): string | null => value === null || value === undefined ? null
  : typeof value === "object" ? relationshipID(value) : String(value);
const changes = (data: Record<string, unknown>, originalDoc: Record<string, unknown>, field: string): boolean =>
  field in data && (data[field] ?? null) !== (originalDoc[field] ?? null);

/** Recorded sends are append-only: a new list keeps every earlier entry, in order, and adds at the end. */
function checkSends(next: unknown, previous: unknown, txHash: unknown): void {
  if (next == null) {
    if (Array.isArray(previous) && previous.length) throw new APIError("Recorded sends are append-only", 409);
    return;
  }
  if (!Array.isArray(next)) throw new APIError("Recorded sends must be a list", 400);
  for (const send of next as RecordedSend[]) {
    if (!send || !isTxHash(send.txHash) || !/^\d{1,78}$/.test(String(send.maxFeePerGas)) || !/^\d{1,78}$/.test(String(send.maxPriorityFeePerGas))) throw new APIError("Invalid transaction hash or fee in recorded sends", 400);
  }
  const before = Array.isArray(previous) ? previous as RecordedSend[] : [];
  // Field by field: stored JSON comes back with its keys reordered.
  const same = (x: RecordedSend, y: RecordedSend) => (["txHash", "maxFeePerGas", "maxPriorityFeePerGas", "sentAt"] as const).every((field) => String(x[field]) === String(y?.[field]));
  if (next.length < Math.max(1, before.length) || before.some((send, index) => !same(send, next[index] as RecordedSend))) throw new APIError("Recorded sends are append-only", 409);
  if (txHash && (next[0] as RecordedSend).txHash !== txHash) throw new APIError("The intent's hash must be its first recorded send", 409);
}

/** ADR-0004: one row per paid entitlement; the worker moves it to `granted`. */
export const CommerceKeyGrantIntents: CollectionConfig = {
  ...ledgerCollection("commerce-key-grant-intents", [
    { name: "operationKey", type: "text", required: true, unique: true },
    relation("order", "orders"), relation("payment", "transactions"),
    { name: "entitlement", type: "relationship", relationTo: "commerce-admissions", required: true, unique: true, index: true },
    { name: "beneficiaryUser", type: "relationship", relationTo: "users", index: true },
    { name: "recipientMode", type: "select", required: true, options: [...recipientModes] },
    { name: "state", type: "select", required: true, index: true, defaultValue: "awaiting_wallet", options: [...keyGrantStates] },
    { name: "target", type: "json" },
    { name: "txHash", type: "text" },
    { name: "tokenID", type: "text" },
    { name: "attempts", type: "number", required: true, min: 0, defaultValue: 0 },
    { name: "attemptID", type: "text" },
    { name: "dispatchStartedAt", type: "date" },
    { name: "submittedAt", type: "date" },
    { name: "grantedAt", type: "date" },
    { name: "cancelledAt", type: "date" },
    { name: "cancelRequested", type: "checkbox", defaultValue: false },
    { name: "nextAttemptAt", type: "date", index: true },
    { name: "lastErrorCode", type: "text", maxLength: 80 },
    // Written ahead of each broadcast, so every transaction that could mine is on record.
    { name: "signer", type: "text", index: true },
    { name: "nonce", type: "number", min: 0 },
    { name: "sends", type: "json" },
    { name: "lastSentAt", type: "date", index: true },
    { name: "settledTxHash", type: "text" },
    // ADR-0009 cancel, by the separate lock-manager authority.
    { name: "cancelAttemptID", type: "text" },
    { name: "cancelStartedAt", type: "date" },
    { name: "cancelSigner", type: "text", index: true },
    { name: "cancelNonce", type: "number", min: 0 },
    { name: "cancelTxHash", type: "text" },
    { name: "cancelSubmittedAt", type: "date" },
  ]),
  hooks: {
    beforeChange: [({ data, originalDoc, operation, req }) => {
      if (!commerceServerWrite(req)) throw new APIError("Key grants are server owned", 403);
      if (operation === "create") {
        if (data.state !== "awaiting_wallet" && data.state !== undefined) throw new APIError("Key grants start awaiting a wallet", 400);
        if (data.recipientMode === "member_safe" && !data.beneficiaryUser) throw new APIError("Member key grants need a beneficiary", 400);
        if (data.recipientMode === "guest_email") throw new APIError("Guest key grants are not enabled yet", 400);
        return { ...data, state: "awaiting_wallet", attempts: 0 };
      }
      for (const field of keyGrantIdentityFields) {
        if (field in data && identityValue(data[field]) !== identityValue(originalDoc[field])) throw new APIError("Key-grant identity is immutable", 409);
      }
      const from = originalDoc.state as KeyGrantState;
      const to = (data.state ?? from) as KeyGrantState;
      if (to !== from && !canTransition(from, to)) throw new APIError(`Key grant cannot move from ${from} to ${to}`, 409);
      if (originalDoc.target && "target" in data && JSON.stringify(data.target) !== JSON.stringify(originalDoc.target)) throw new APIError("Key-grant target is write-once", 409);
      if (to === "pending") parseKeyGrantTarget(data.target ?? originalDoc.target);
      if ("txHash" in data && data.txHash != null && !isTxHash(data.txHash)) throw new APIError("Invalid transaction hash", 400);
      // A retry after proven non-execution (failed_retryable -> pending) starts a new
      // attempt and clears the old one's hash; otherwise a recorded hash never changes.
      const retry = from === "failed_retryable" && to === "pending";
      if (originalDoc.txHash && "txHash" in data && data.txHash !== originalDoc.txHash && !(retry && data.txHash === null)) throw new APIError("Recorded transaction hash cannot change", 409);
      if (to === "granted" && !(data.tokenID ?? originalDoc.tokenID)) throw new APIError("A granted key needs confirmation evidence", 409);
      if (originalDoc.cancelRequested === true && data.cancelRequested === false) throw new APIError("Key cancellation request cannot be reset", 409);
      // Write-ahead evidence: an attempt's signer and nonce never change, its sends only grow,
      // and only a proven-nonexecution retry starts over with none.
      const merged = { ...originalDoc, ...data };
      for (const field of ["signer", "nonce"]) {
        if (originalDoc[field] != null && changes(data, originalDoc, field) && !(retry && data[field] === null)) throw new APIError(`Recorded ${field} cannot change`, 409);
      }
      if ("sends" in data && !(retry && data.sends === null)) checkSends(data.sends, originalDoc.sends, merged.txHash);
      if (data.settledTxHash != null) {
        const recorded = [merged.txHash, ...(Array.isArray(merged.sends) ? (merged.sends as RecordedSend[]).map((send) => send.txHash) : [])];
        if (!recorded.includes(data.settledTxHash)) throw new APIError("A settled hash must be one the intent recorded", 409);
      }
      if ("cancelTxHash" in data && data.cancelTxHash != null && !isTxHash(data.cancelTxHash)) throw new APIError("Invalid transaction hash", 400);
      // A recorded cancel transaction never changes; an attempt proven unsent is cleared as a whole.
      if (originalDoc.cancelTxHash && changes(data, originalDoc, "cancelTxHash")) {
        const clearsAttempt = data.cancelTxHash === null && ["cancelAttemptID", "cancelNonce", "cancelSigner"].every((field) => field in data && data[field] === null);
        if (!clearsAttempt || to === "cancelled") throw new APIError("Recorded cancel transaction cannot change", 409);
      }
      if (from === "granted" && to === "cancelled") {
        if (originalDoc.cancelRequested !== true) throw new APIError("A granted key is cancelled only when cancellation was requested", 409);
        if (!merged.cancelledAt || !(merged.cancelTxHash || merged.lastErrorCode === "key_not_valid")) throw new APIError("A cancelled key needs cancel evidence", 409);
      }
      return data;
    }],
  },
};
