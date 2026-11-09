import { createHash } from "node:crypto";
import type { PayloadRequest } from "payload";
import { counter, createCommerce, findCommerce, lockCommerce, readCommerce, relationshipID, updateCommerce, type CommerceDocument } from "./_shared/transaction";

type ReservationInput = { req: PayloadRequest; attemptID: string; customerID: string; releaseID: string; productID: string; eventID: string; quantity: number; snapshotHash: string };
type ReservationAction = { req: PayloadRequest; attemptID: string };
export type VerifiedReleaseReason = "confirmed-cancel" | "accepted-return" | "verified-failure";

function allowanceKey(customerID: string, releaseID: string): string {
  return createHash("sha256").update(JSON.stringify([customerID, releaseID])).digest("hex");
}

function resourceKeys(customerID: string, releaseID: string, productID: string, eventID: string): string[] {
  return [`event:${eventID}`, `product:${productID}`, `allowance:${allowanceKey(customerID, releaseID)}`];
}

export async function lockReservationContext(req: PayloadRequest, attemptID: string) {
  await lockCommerce(req, [`attempt:${attemptID}`]);
  const reservation = await findCommerce(req, "commerce-reservations", "attemptID", attemptID);
  if (!reservation) throw new Error("Reservation not found");
  const customerID = relationshipID(reservation.customer);
  const productID = relationshipID(reservation.product);
  const eventID = relationshipID(reservation.event);
  const releaseID = String(reservation.releaseID);
  await lockCommerce(req, resourceKeys(customerID, releaseID, productID, eventID));
  const allowance = await findCommerce(req, "commerce-allowances", "accountReleaseKey", allowanceKey(customerID, releaseID));
  if (!allowance) throw new Error("Missing reservation allowance");
  const product = await req.payload.db.findOne<CommerceDocument>({ collection: "products", where: { id: { equals: productID } }, draftsEnabled: false, req });
  if (!product) throw new Error("Canonical product is missing");
  const event = await readCommerce(req, "commerce-events", eventID);
  return { reservation, allowance, product, event };
}

export async function lockOrderReservation({ req, orderID }: { req: PayloadRequest; orderID: string }) {
  const order = await readCommerce(req, "orders", orderID);
  if (order.commerceVersion !== "commerce-v1") throw new Error("Legacy order has no commerce reservation");
  const context = await lockReservationContext(req, String(order.commerceAttemptID));
  if (!context.reservation.order || relationshipID(context.reservation.order) !== orderID) throw new Error("Order reservation linkage mismatch");
  return context;
}

export async function reservePurchase(input: ReservationInput): Promise<CommerceDocument> {
  const { req, attemptID, customerID, productID, eventID, releaseID, quantity, snapshotHash } = input;
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 3) throw new Error("Purchase quantity must be between one and three");
  if (!attemptID || !customerID || !eventID || !productID || releaseID !== productID || !/^[a-f0-9]{64}$/.test(snapshotHash)) throw new Error("Invalid reservation identity or snapshot");
  await lockCommerce(req, [`attempt:${attemptID}`]);
  const previous = await findCommerce(req, "commerce-reservations", "attemptID", attemptID);
  if (previous) {
    if (previous.snapshotHash !== snapshotHash || relationshipID(previous.customer) !== customerID || relationshipID(previous.product) !== productID || relationshipID(previous.event) !== eventID || previous.releaseID !== releaseID || previous.quantity !== quantity || previous.state === "released") throw new Error("Reservation attempt cannot be rebound or reopened");
    await lockCommerce(req, resourceKeys(customerID, releaseID, productID, eventID));
    return previous;
  }
  await lockCommerce(req, resourceKeys(customerID, releaseID, productID, eventID));
  const product = await req.payload.db.findOne<CommerceDocument>({ collection: "products", where: { id: { equals: productID } }, draftsEnabled: false, req });
  if (!product) throw new Error("Canonical product is missing");
  const event = await readCommerce(req, "commerce-events", eventID);
  const now = Date.now();
  const saleStart = new Date(String(product.saleStartsAt)).getTime();
  const saleEnd = new Date(String(product.saleEndsAt)).getTime();
  if (!product.publicationApproved || product._status !== "published" || !event.publicationApproved || relationshipID(product.event) !== eventID || !Number.isFinite(saleStart) || !Number.isFinite(saleEnd) || saleStart >= saleEnd || now < saleStart || now >= saleEnd) throw new Error("Product is not available for purchase");
  const productReserved = counter(product.reservedQuantity);
  const eventReserved = counter(event.reservedQuantity);
  if (counter(product.inventory) - productReserved < quantity || counter(event.capacity) - counter(event.committedQuantity) - eventReserved < quantity) throw new Error("Insufficient product or guaranteed admission capacity");
  const key = allowanceKey(customerID, releaseID);
  const allowance = await findCommerce(req, "commerce-allowances", "accountReleaseKey", key);
  const reserved = allowance ? counter(allowance.reservedQuantity) : 0;
  const paid = allowance ? counter(allowance.paidQuantity) : 0;
  if (reserved + paid + quantity > 3) throw new Error("Account release allowance exceeded");
  if (allowance) await updateCommerce(req, "commerce-allowances", allowance.id, { reservedQuantity: reserved + quantity });
  else await createCommerce(req, "commerce-allowances", { accountReleaseKey: key, customer: customerID, releaseID, reservedQuantity: quantity, paidQuantity: 0 });
  await req.payload.db.updateOne({ collection: "products", id: productID, data: { reservedQuantity: { $inc: quantity } }, req });
  await req.payload.db.updateOne({ collection: "commerce-events" as never, id: eventID, data: { reservedQuantity: { $inc: quantity } }, req });
  return createCommerce(req, "commerce-reservations", { attemptID, customer: customerID, product: productID, event: eventID, releaseID, quantity, snapshotHash, state: "reserved" });
}

export async function settleReservation({ req, attemptID, orderID }: ReservationAction & { orderID: string }): Promise<CommerceDocument> {
  const { reservation, allowance, product, event } = await lockReservationContext(req, attemptID);
  if (reservation.state === "settled") {
    if (relationshipID(reservation.order) !== orderID) throw new Error("Reservation already belongs to another order");
    return reservation;
  }
  if (reservation.state !== "reserved") throw new Error("Released reservation cannot settle");
  const quantity = counter(reservation.quantity);
  if (counter(allowance.reservedQuantity) < quantity || counter(product.reservedQuantity) < quantity || counter(event.reservedQuantity) < quantity) throw new Error("Reservation counters are inconsistent");
  await updateCommerce(req, "commerce-allowances", allowance.id, { reservedQuantity: counter(allowance.reservedQuantity) - quantity, paidQuantity: counter(allowance.paidQuantity) + quantity });
  // Plugin finalization alone decrements actual inventory in this transaction.
  await req.payload.db.updateOne({ collection: "products", id: product.id, data: { reservedQuantity: { $inc: -quantity } }, req });
  await req.payload.db.updateOne({ collection: "commerce-events" as never, id: event.id, data: { reservedQuantity: { $inc: -quantity }, committedQuantity: { $inc: quantity } }, req });
  return updateCommerce(req, "commerce-reservations", reservation.id, { state: "settled", order: orderID });
}

export async function releaseReservation({ req, attemptID, verifiedReason, providerEventID }: ReservationAction & { verifiedReason: VerifiedReleaseReason; providerEventID: string }): Promise<CommerceDocument> {
  if (!["confirmed-cancel", "accepted-return", "verified-failure"].includes(verifiedReason) || !providerEventID) throw new Error("A verified release reason and evidence identifier are required");
  const { reservation, allowance, product, event } = await lockReservationContext(req, attemptID);
  if (reservation.state === "released") return reservation;
  const settled = reservation.state === "settled";
  if (settled && verifiedReason === "verified-failure") throw new Error("Paid order cannot be released as failed");
  if (!settled && verifiedReason === "accepted-return") throw new Error("Unpaid order cannot have an accepted return");
  const returnedUnits = Array.isArray(reservation.returnedUnits) ? reservation.returnedUnits : [];
  const quantity = counter(reservation.quantity) - returnedUnits.length;
  const allowanceField = settled ? "paidQuantity" : "reservedQuantity";
  const eventField = settled ? "committedQuantity" : "reservedQuantity";
  if (counter(allowance[allowanceField]) < quantity || (!settled && counter(product.reservedQuantity) < quantity)) throw new Error("Release counters are inconsistent");
  await updateCommerce(req, "commerce-allowances", allowance.id, { [allowanceField]: counter(allowance[allowanceField]) - quantity });
  let releasedCapacity = settled ? 0 : quantity;
  if (!settled) await req.payload.db.updateOne({ collection: "products", id: product.id, data: { reservedQuantity: { $inc: -quantity } }, req });
  if (settled) {
    const orderID = relationshipID(reservation.order);
    await lockCommerce(req, [`order-benefits:${orderID}`]);
    for (let unit = 1; unit <= counter(reservation.quantity); unit++) {
      const admission = await findCommerce(req, "commerce-admissions", "orderUnitKey", `${orderID}:${unit}`);
      if (!admission) throw new Error("Paid reservation is missing its admission");
      await lockCommerce(req, [`admission:${admission.id}`]);
      const current = await readCommerce(req, "commerce-admissions", admission.id);
      const redemptions = await req.payload.find({ collection: "commerce-redemptions" as never, where: { admission: { equals: admission.id } }, limit: 1, depth: 0, overrideAccess: true, req });
      const used = current.status === "checked-in" || !!current.checkedInAt || redemptions.totalDocs > 0;
      if (!used && !returnedUnits.includes(unit)) releasedCapacity++;
      await updateCommerce(req, "commerce-admissions", admission.id, { ...(used ? {} : { status: "revoked", eventAccountKey: null }), benefitReview: true, benefitHoldEvidence: providerEventID });
    }
  }
  if (counter(event[eventField]) < releasedCapacity) throw new Error("Release capacity counters are inconsistent");
  await req.payload.db.updateOne({ collection: "commerce-events" as never, id: event.id, data: { [eventField]: { $inc: -releasedCapacity } }, req });
  // Return stock disposition is deliberately separate: releasing the allowance
  // never makes a physical item saleable again.
  return updateCommerce(req, "commerce-reservations", reservation.id, { state: "released", releaseReason: verifiedReason, providerEventID });
}
