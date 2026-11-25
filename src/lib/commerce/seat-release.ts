import type { PayloadRequest } from "payload";
import { usesUnlockEvents } from "./event-tickets";
import { lockOrderReservation } from "./reservations";
import { withCommerceWrite } from "./access";
import { z } from "zod";
import { createCommerce, findCommerce, inCommerceTransaction, lockCommerce, readCommerce, relationshipID, updateCommerce, counter } from "./_shared/transaction";

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

/** The sweep's durable cursor: a ledger row holding the last admission id scanned (null: start again from the first). */
export const seatSweepScope = "reconciliation-seat-sweep";
export const seatSweepSchema = z.strictObject({ after: z.uuid().nullable() });

/**
 * The durable catch-up (Review-A, 24 Nov): retries the release for refunded admissions whose seat is not yet released.
 * Fair and bounded: each pass scans at most `limit` candidate admissions in id order, starting after the durable cursor,
 * then moves the cursor past them; at the end it starts again from the first. Rows that are still ineligible (keys
 * valid) or whose release failed are revisited on the next round, never ahead of the rest. Each order runs in its own
 * transaction; a failure is logged and skipped. Auth's key tick calls it every pass, after reconciling owner-signed
 * cancels; the refund and the key worker still release right away where they can. Returns how many seats it released
 * and how many steps failed (an order skipped, or the cursor not saved), so a caller with no logger can still report it.
 */
export async function releaseInvalidatedSeatsSweep({ req, limit = 25, now = Date.now() }: { req: PayloadRequest; limit?: number; now?: number }): Promise<{ released: number; failed: number }> {
  if (await req.transactionID) throw new Error("The seat sweep runs each order in its own transaction");
  const cursor = await findCommerce(req, "commerce-reconciliations", "scope", seatSweepScope);
  const after = cursor ? seatSweepSchema.parse(cursor.state).after : null;
  const found = await req.payload.find({ collection: "commerce-admissions" as never, depth: 0, overrideAccess: true, limit, sort: "id", req,
    where: { and: [{ status: { equals: "revoked" } }, { benefitReview: { equals: true } }, { seatReleasedAt: { exists: false } }, { checkedInAt: { exists: false } },
      ...(after ? [{ id: { greater_than: after } }] : [])] } });
  const scanned = found.docs as unknown as { id: string; order?: unknown }[];
  const orders = new Set(scanned.flatMap((admission) => admission.order == null ? [] : [relationshipID(admission.order)]));
  let released = 0, failed = 0;
  for (const orderID of orders) {
    try { released += await inCommerceTransaction(req, () => withCommerceWrite(req, () => releaseInvalidatedSeats({ req, orderID, now }))); }
    catch { failed++; req.payload.logger?.error({ msg: "Seat release sweep: order skipped until its next turn", orderID }); }
  }
  const next = scanned.length < limit ? null : String(scanned[scanned.length - 1].id);
  try {
    await inCommerceTransaction(req, () => withCommerceWrite(req, async () => {
      const row = await findCommerce(req, "commerce-reconciliations", "scope", seatSweepScope);
      const state = { after: next };
      if (row) await updateCommerce(req, "commerce-reconciliations", row.id, { state });
      else await createCommerce(req, "commerce-reconciliations", { scope: seatSweepScope, state });
    }));
  } catch { failed++; req.payload.logger?.error({ msg: "Seat release sweep: cursor not saved; the next pass repeats this window" }); }
  return { released, failed };
}
