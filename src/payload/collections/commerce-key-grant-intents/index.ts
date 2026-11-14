import { APIError, type CollectionConfig } from "payload";
import { ledgerCollection, relation } from "@/lib/commerce/_shared/collection";
import { commerceServerWrite } from "@/lib/commerce/access";
import { canTransition, isTxHash, keyGrantIdentityFields, keyGrantStates, parseKeyGrantTarget, recipientModes, type KeyGrantState } from "@/lib/commerce/keys/contracts";
import { relationshipID } from "@/lib/commerce/_shared/transaction";

const identityValue = (value: unknown): string | null => value === null || value === undefined ? null
  : typeof value === "object" ? relationshipID(value) : String(value);

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
      return data;
    }],
  },
};
