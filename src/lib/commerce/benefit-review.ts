import type { PayloadRequest } from "payload";
import { withCommerceWrite } from "./access";
import { lockOrderReservation } from "./reservations";
import { findCommerce, lockCommerce, readCommerce, relationshipID, updateCommerce, counter } from "./_shared/transaction";

type BenefitReviewInput = { req: PayloadRequest; orderID: string; providerEventID: string; reason: string };

async function projectBenefitReview({ req, orderID, providerEventID, reason }: BenefitReviewInput, revoke: boolean): Promise<void> {
  if (!providerEventID || providerEventID.length > 200 || !reason || reason.length > 200) throw new Error("Verified benefit-review evidence is required");
  const { reservation } = await lockOrderReservation({ req, orderID });
  await lockCommerce(req, [`order-benefits:${orderID}`]);
  const order = await readCommerce(req, "orders", orderID);
  if (!Array.isArray(order.transactions) || order.transactions.length !== 1) throw new Error("Order transaction unavailable");
  const transactionID = relationshipID(order.transactions[0]);
  await withCommerceWrite(req, () => updateCommerce(req, "transactions", transactionID, { commerceReviewHold: true }));
  for (let unit = 1; unit <= counter(reservation.quantity); unit++) {
    const admission = await findCommerce(req, "commerce-admissions", "orderUnitKey", `${orderID}:${unit}`);
    if (!admission) throw new Error("Settled admission unavailable");
    await lockCommerce(req, [`admission:${admission.id}`]);
    const current = await readCommerce(req, "commerce-admissions", admission.id);
    const redeemed = await req.payload.find({ collection: "commerce-redemptions" as never, where: { admission: { equals: admission.id } }, limit: 1, depth: 0, overrideAccess: true, req });
    const used = current.status === "checked-in" || !!current.checkedInAt || redeemed.totalDocs > 0;
    await updateCommerce(req, "commerce-admissions", admission.id, {
      benefitReview: true, benefitHoldEvidence: providerEventID, benefitHoldReason: reason,
      ...(revoke && !used ? { status: "revoked" } : {}),
    });
  }
}

/** Trusted verified-provider caller only; never exposed as a generic cancel API. */
export async function holdOrderBenefits(input: BenefitReviewInput): Promise<void> {
  return projectBenefitReview(input, false);
}

/** Used attendance/redemption audit is preserved; unused benefits are revoked. */
export async function revokeOrderBenefits(input: BenefitReviewInput): Promise<void> {
  return projectBenefitReview(input, true);
}
