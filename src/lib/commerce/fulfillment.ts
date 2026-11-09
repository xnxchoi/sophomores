import type { PayloadRequest } from "payload";
import { isCmsSuperAdmin } from "@/lib/auth/access";
import { withCommerceWrite } from "./access";
import { lockOrderReservation } from "./reservations";
import { lockOrderBenefits } from "./_shared/benefits";
import { lockCommerce, readCommerce, updateCommerce } from "./_shared/transaction";

type FulfillmentStatus = "pending" | "packed" | "shipped" | "delivered" | "return-requested" | "returned";
const transitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  pending: ["packed"], packed: ["shipped"], shipped: ["delivered", "return-requested"],
  delivered: ["return-requested"], "return-requested": ["returned"], returned: [],
};

export async function updateOrderFulfillment({ req, orderID, status, carrier, trackingNumber, actionID }: {
  req: PayloadRequest; orderID: string; status: FulfillmentStatus; carrier?: string; trackingNumber?: string; actionID: string;
}): Promise<void> {
  if (!isCmsSuperAdmin(req.user)) throw new Error("Commerce administrator access required");
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(actionID) || !Object.hasOwn(transitions, status)) throw new Error("Invalid fulfillment action");
  const { reservation } = await lockOrderReservation({ req, orderID });
  // Returns are physical reverse logistics, not permission to grant benefits or
  // ship again. Keep serialization with payment review while allowing operators
  // to receive audited returns from held or cancelled orders.
  if (status === "return-requested" || status === "returned") await lockCommerce(req, [`order-benefits:${orderID}`]);
  else await lockOrderBenefits(req, orderID);
  await lockCommerce(req, [`fulfillment:${orderID}`]);
  const order = await readCommerce(req, "orders", orderID);
  if (order.commerceVersion !== "commerce-v1") throw new Error("Historical orders are not managed by commerce fulfillment");
  const fulfillment = (order.fulfillment ?? {}) as Record<string, unknown>;
  const current = String(fulfillment.status ?? "pending") as FulfillmentStatus;
  if (current === status) return;
  if (!transitions[current]?.includes(status)) throw new Error("Invalid fulfillment state transition");
  if (status === "shipped" && (!carrier?.trim() || !trackingNumber?.trim() || carrier.length > 100 || trackingNumber.length > 120)) throw new Error("Shipment requires a carrier and tracking number");
  if (status === "returned" && (!Array.isArray(reservation.returnedUnits) || reservation.returnedUnits.length !== Number(reservation.quantity))) throw new Error("Accept each physically returned unit before marking the whole order returned");
  await withCommerceWrite(req, () => updateCommerce(req, "orders", orderID, { fulfillment: {
    ...fulfillment, status,
    ...(status === "shipped" ? { carrier: carrier!.trim(), trackingNumber: trackingNumber!.trim(), shippedAt: new Date().toISOString() } : {}),
    ...(status === "delivered" ? { deliveredAt: new Date().toISOString() } : {}),
    ...(status === "returned" ? { returnDisposition: "pending-inspection" } : {}),
  } }));
}
