import type { PayloadRequest } from "payload";
import { lockCommerce, readCommerce, relationshipID, type CommerceDocument } from "./transaction";

export async function lockOrderBenefits(req: PayloadRequest, orderID: string): Promise<CommerceDocument> {
  await lockCommerce(req, [`order-benefits:${orderID}`]);
  const order = await readCommerce(req, "orders", orderID);
  if (order.commerceVersion !== "commerce-v1") throw new Error("Order benefits unavailable");
  if (!Array.isArray(order.transactions) || order.transactions.length !== 1) throw new Error("Order settlement unavailable");
  const transaction = await readCommerce(req, "transactions", relationshipID(order.transactions[0]));
  if (transaction.commerceReviewHold === true || transaction.status !== "succeeded" || relationshipID(transaction.order) !== orderID) throw new Error("Order payment is held for review");
  return order;
}

export async function lockAdmissionBenefits(req: PayloadRequest, admissionID: string): Promise<CommerceDocument> {
  const preliminary = await readCommerce(req, "commerce-admissions", admissionID);
  await lockOrderBenefits(req, relationshipID(preliminary.order));
  await lockCommerce(req, [`admission:${admissionID}`]);
  const admission = await readCommerce(req, "commerce-admissions", admissionID);
  if (admission.benefitReview === true || admission.returnAcceptedAt) throw new Error("Admission benefits are held for review");
  return admission;
}
