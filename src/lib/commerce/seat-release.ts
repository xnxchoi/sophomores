import type { PayloadRequest } from "payload";
import { usesUnlockEvents } from "./event-tickets";
import { lockOrderReservation } from "./reservations";
import { findCommerce, lockCommerce, readCommerce, updateCommerce, counter } from "./_shared/transaction";

/**
 * Unlock events: a refunded seat (owner, 24 Nov: "yes, cancel. release seat.").
 *
 * releaseReservation keeps an Unlock event's capacity on cancellation, because entry happens outside our records:
 * until Unlock invalidates the key, its QR still admits (ADR-0012), and selling the seat again could overbook. So a
 * refunded admission's seat is released here, only once every key owed for it is authoritatively invalid: each of its
 * intents is `cancelled`, either never sent (cancelled at the refund) or cancelled on chain and reconciled by the key
 * worker. Also only before Part I starts, only after a verified full cancellation, and never for a used admission.
 * Called after the refund's benefit revocation and after the key worker marks an intent cancelled; idempotent per
 * admission (`seatReleasedAt`). Takes the reservation locks first, as settlement and release do.
 */
export async function releaseInvalidatedSeats({ req, orderID, now = Date.now() }: { req: PayloadRequest; orderID: string; now?: number }): Promise<number> {
  const { reservation, event } = await lockOrderReservation({ req, orderID });
  if (!event || !usesUnlockEvents(event)) return 0;
  if (reservation.state !== "released" || reservation.releaseReason !== "confirmed-cancel") return 0;
  if (!(now < new Date(String(event.partIStartsAt)).getTime())) return 0;
  await lockCommerce(req, [`order-benefits:${orderID}`]);
  let released = 0;
  for (let unit = 1; unit <= counter(reservation.quantity); unit++) {
    const admission = await findCommerce(req, "commerce-admissions", "orderUnitKey", `${orderID}:${unit}`);
    if (!admission) continue;
    await lockCommerce(req, [`admission:${admission.id}`]);
    const current = await readCommerce(req, "commerce-admissions", admission.id);
    if (current.seatReleasedAt || current.status !== "revoked" || current.checkedInAt) continue;
    const redemptions = await req.payload.find({ collection: "commerce-redemptions" as never, where: { admission: { equals: admission.id } }, limit: 1, depth: 0, overrideAccess: true, req });
    if (redemptions.totalDocs > 0) continue;
    const intents = await req.payload.find({ collection: "commerce-key-grant-intents" as never, where: { entitlement: { equals: admission.id } }, limit: 0, pagination: false, depth: 0, overrideAccess: true, req });
    if ((intents.docs as unknown as { state?: unknown }[]).some((intent) => intent.state !== "cancelled")) continue;
    await updateCommerce(req, "commerce-admissions", admission.id, { seatReleasedAt: new Date(now).toISOString() });
    released++;
  }
  if (released) {
    if (counter(event.committedQuantity) < released) throw new Error("Release capacity counters are inconsistent");
    await req.payload.db.updateOne({ collection: "commerce-events" as never, id: event.id, data: { committedQuantity: { $inc: -released } }, req });
  }
  return released;
}
