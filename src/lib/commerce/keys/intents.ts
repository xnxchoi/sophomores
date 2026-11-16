import type { PayloadRequest } from "payload";
import { withCommerceWrite } from "../access";
import { createCommerce, findCommerce, lockCommerce, readCommerce, relationshipID, updateCommerce, type CommerceDocument } from "../_shared/transaction";
import { lockMemberWallet } from "./member-wallet";
import { keyGrantOperationKey } from "./contracts";

type RecordInput = { req: PayloadRequest; orderID: string; transactionID: string; beneficiaryID: string; admissions: CommerceDocument[] };

/**
 * ADR-0004. Runs on the settling req, inside the settlement transaction, after
 * admissions exist: one intent per admission, created `awaiting_wallet`.
 * Replay is a no-op; a row with a different identity is corruption and throws,
 * rolling the settlement back. No chain or network call happens here.
 *
 * The member+chain wallet lock is taken first (lockMemberWallet). Once the
 * intents exist, the function it returns creates the member's wallet if it is
 * missing and attaches them, so settlement, a hold release and the catch-up
 * sweep for one member never interleave (./member-wallet).
 */
export async function recordKeyGrantIntents({ req, orderID, transactionID, beneficiaryID, admissions }: RecordInput): Promise<CommerceDocument[]> {
  const attachToActiveWallet = await lockMemberWallet(req, beneficiaryID);
  const intents: CommerceDocument[] = [];
  for (const admission of admissions) {
    const unit = Number(admission.unit);
    if (relationshipID(admission.order) !== orderID || relationshipID(admission.transaction) !== transactionID || relationshipID(admission.buyer) !== beneficiaryID) throw new Error("Key grant entitlement does not match its order");
    const operationKey = keyGrantOperationKey(orderID, unit);
    await lockCommerce(req, [`key-grant:${operationKey}`]);
    const existing = await findCommerce(req, "commerce-key-grant-intents", "operationKey", operationKey);
    if (existing) {
      if (relationshipID(existing.order) !== orderID || relationshipID(existing.payment) !== transactionID || relationshipID(existing.entitlement) !== admission.id
        || relationshipID(existing.beneficiaryUser) !== beneficiaryID || existing.recipientMode !== "member_safe") throw new Error("Key grant identity mismatch");
      intents.push(existing);
      continue;
    }
    intents.push(await createCommerce(req, "commerce-key-grant-intents", {
      operationKey, order: orderID, payment: transactionID, entitlement: admission.id,
      beneficiaryUser: beneficiaryID, recipientMode: "member_safe", state: "awaiting_wallet",
    }));
  }
  const attached = new Set(await attachToActiveWallet());
  return attached.size ? Promise.all(intents.map((intent) => attached.has(intent.id) ? readCommerce(req, "commerce-key-grant-intents", intent.id) : intent)) : intents;
}

/**
 * ADR-0009, local part: when an order's benefits are revoked, never-dispatched
 * intents are cancelled; dispatched or granted ones keep their evidence and are
 * flagged (`cancelRequested`) for the separate cancel authority: a dispatched
 * grant is reconciled first, then `cancelKeyGrants` (./worker) cancels it on chain.
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
