import type { PayloadRequest } from "payload";
import { withCommerceWrite } from "../access";
import { createCommerce, findCommerce, lockCommerce, readCommerce, relationshipID, updateCommerce, type CommerceDocument } from "../_shared/transaction";
import { sharedTicketTarget } from "../event-tickets";
import { keyGrantOperationKey, memberEventGrantOperationKey, MEMBER_EVENT_GRANT } from "./contracts";

type RecordInput = { req: PayloadRequest; orderID: string; transactionID: string; beneficiaryID: string; admissions: CommerceDocument[] };

/**
 * ADR-0004. Runs on the settling req, inside the settlement transaction, after
 * admissions exist: one intent per entitlement, created `awaiting_wallet`.
 * A shared Member unit owes two distinct entitlements: its Signet and its seat.
 * Replay is a no-op; a row with a different identity is corruption and throws,
 * rolling the settlement back. No chain or network call happens here.
 */
export async function recordKeyGrantIntents({ req, orderID, transactionID, beneficiaryID, admissions }: RecordInput): Promise<CommerceDocument[]> {
  const intents: CommerceDocument[] = [];
  for (const admission of admissions) {
    const separateMemberTicket = admission.ticketTier === "member" && sharedTicketTarget.safeParse(admission.ticketTarget).success;
    intents.push(await recordIntent({ req, orderID, transactionID, beneficiaryID }, admission, "primary"));
    if (separateMemberTicket) intents.push(await recordIntent({ req, orderID, transactionID, beneficiaryID }, admission, MEMBER_EVENT_GRANT));
  }
  return intents;
}

async function recordIntent({ req, orderID, transactionID, beneficiaryID }: Omit<RecordInput, "admissions">, admission: CommerceDocument, purpose: "primary" | typeof MEMBER_EVENT_GRANT) {
  const unit = Number(admission.unit);
  if (relationshipID(admission.order) !== orderID || relationshipID(admission.transaction) !== transactionID || relationshipID(admission.buyer) !== beneficiaryID) throw new Error("Key grant entitlement does not match its order");
  const operationKey = purpose === MEMBER_EVENT_GRANT ? memberEventGrantOperationKey(orderID, unit) : keyGrantOperationKey(orderID, unit);
  await lockCommerce(req, [`key-grant:${operationKey}`]);
  const existing = await findCommerce(req, "commerce-key-grant-intents", "operationKey", operationKey);
  if (existing) {
    if (relationshipID(existing.order) !== orderID || relationshipID(existing.payment) !== transactionID || relationshipID(existing.entitlement) !== admission.id
      || relationshipID(existing.beneficiaryUser) !== beneficiaryID || existing.recipientMode !== "member_safe" || (existing.purpose ?? "primary") !== purpose) throw new Error("Key grant identity mismatch");
    return existing;
  }
  return createCommerce(req, "commerce-key-grant-intents", {
    operationKey, order: orderID, payment: transactionID, entitlement: admission.id,
    beneficiaryUser: beneficiaryID, recipientMode: "member_safe", purpose,
  });
}

/**
 * ADR-0009, local part: when an order's benefits are revoked, never-dispatched
 * intents are cancelled; dispatched or granted ones keep their evidence and are
 * flagged for the separate cancel authority (not built yet).
 */
export async function cancelOrderKeyGrants(req: PayloadRequest, orderID: string, admissionIDs: ReadonlySet<string>): Promise<void> {
  const found = await req.payload.find({ collection: "commerce-key-grant-intents" as never, where: { order: { equals: orderID } }, limit: 10, depth: 0, overrideAccess: true, req });
  for (const row of found.docs as unknown as CommerceDocument[]) {
    if (!admissionIDs.has(relationshipID(row.entitlement))) continue;
    await lockCommerce(req, [`key-grant:${String(row.operationKey)}`]);
    // Decide from the record as it stands under the lock: a worker may have
    // dispatched it between the scan and the lock.
    const intent = await readCommerce(req, "commerce-key-grant-intents", row.id);
    const state = String(intent.state);
    const data = ["awaiting_wallet", "pending", "failed_retryable"].includes(state)
      ? { state: "cancelled", cancelledAt: new Date().toISOString() }
      : state === "cancelled" || intent.cancelRequested === true ? null : { cancelRequested: true };
    if (data) await withCommerceWrite(req, () => updateCommerce(req, "commerce-key-grant-intents", intent.id, data));
  }
}
