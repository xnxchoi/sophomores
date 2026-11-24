import type { PayloadRequest } from "payload";
import { withCommerceWrite } from "./access";
import { lockCommerce, readCommerce, updateCommerce } from "./_shared/transaction";

// Request-private, like the transaction's verified-cancellation capability (portone/review.ts): only a verified full
// cancellation on this request may move this one order to refunded. Serializable request data and generic REST or CMS
// writes cannot forge it.
const verifiedRefunds = new WeakMap<PayloadRequest, string>();
export const isVerifiedOrderRefund = (req: PayloadRequest, orderID: string): boolean => verifiedRefunds.get(req) === orderID;

export const refundableOrderStatuses: readonly string[] = ["processing", "completed"];
export type OrderRefundSource = "provider" | "admin";

/**
 * SYSTEM: called inside the verified full-cancellation transaction, after the order's benefits were revoked and its
 * reservation released. Moves a commerce-v1 order to `refunded` once and records how. An order that is already
 * refunded (a replayed or second cancellation event) keeps its first record; returns whether this call wrote it.
 */
export async function recordOrderRefund({ req, orderID, transactionID, providerEventID, source }: {
  req: PayloadRequest; orderID: string; transactionID: string; providerEventID: string; source: OrderRefundSource;
}): Promise<boolean> {
  // Same key as settlement and benefit review, so a refund never interleaves with them.
  await lockCommerce(req, [`order-benefits:${orderID}`]);
  const order = await readCommerce(req, "orders", orderID);
  if (order.commerceVersion !== "commerce-v1" || !refundableOrderStatuses.includes(String(order.status))) return false;
  verifiedRefunds.set(req, orderID);
  try {
    await withCommerceWrite(req, () => updateCommerce(req, "orders", orderID, {
      status: "refunded",
      commerceRefund: { refundedAt: new Date().toISOString(), source, providerEventID, transactionID },
    }));
  } finally {
    verifiedRefunds.delete(req);
  }
  return true;
}
