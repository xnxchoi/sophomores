import type { PayloadRequest } from "payload";
import { isCmsSuperAdmin } from "@/lib/auth/access";
import { lockOrderReservation } from "./reservations";
import { counter, findCommerce, lockCommerce, readCommerce, updateCommerce } from "./_shared/transaction";

function unitIndexes(value: unknown, quantity: number): number[] {
  if (!Array.isArray(value) || value.some((unit) => !Number.isSafeInteger(unit) || unit < 1 || unit > quantity) || new Set(value).size !== value.length) throw new Error("Return units must be distinct purchased unit indexes");
  return [...value].sort((a, b) => a - b);
}

export async function acceptUnitReturns({ req, orderID, units, evidenceID, usedBenefitsReviewed = false }: {
  req: PayloadRequest; orderID: string; units: number[]; evidenceID: string; usedBenefitsReviewed?: boolean;
}): Promise<{ newlyAcceptedUnits: number[] }> {
  if (!isCmsSuperAdmin(req.user)) throw new Error("Commerce administrator access required");
  if (!evidenceID.trim() || evidenceID.length > 200 || units.length === 0) throw new Error("Explicit unit return evidence is required");
  const { reservation, allowance, event } = await lockOrderReservation({ req, orderID });
  if (reservation.state !== "settled" && !(reservation.state === "released" && ["confirmed-cancel", "accepted-return"].includes(String(reservation.releaseReason)))) throw new Error("Only paid units can have an accepted physical return");
  const quantity = counter(reservation.quantity);
  const indexes = unitIndexes(units, quantity);
  const alreadyReturned = unitIndexes(reservation.returnedUnits ?? [], quantity);
  const newlyAcceptedUnits = indexes.filter((unit) => !alreadyReturned.includes(unit));
  if (newlyAcceptedUnits.length === 0) return { newlyAcceptedUnits };
  await lockCommerce(req, [`order-benefits:${orderID}`]);
  let unusedReturnedUnits = 0;
  for (const unit of newlyAcceptedUnits) {
    const admission = await findCommerce(req, "commerce-admissions", "orderUnitKey", `${orderID}:${unit}`);
    if (!admission) throw new Error("Returned unit admission unavailable");
    await lockCommerce(req, [`admission:${admission.id}`]);
    const current = await readCommerce(req, "commerce-admissions", admission.id);
    const redemptions = await req.payload.find({ collection: "commerce-redemptions" as never, where: { admission: { equals: admission.id } }, limit: 1, depth: 0, overrideAccess: true, req });
    const used = current.status === "checked-in" || !!current.checkedInAt || redemptions.totalDocs > 0;
    if (used && !usedBenefitsReviewed) throw new Error("Used attendance or perks require explicit manual return review");
    if (!used) unusedReturnedUnits++;
    await updateCommerce(req, "commerce-admissions", admission.id, {
      ...(used ? {} : { status: "revoked", eventAccountKey: null }), benefitReview: true,
      returnAcceptedAt: new Date().toISOString(), returnEvidence: evidenceID,
      returnAcceptedBy: String(req.user!.id),
      returnReviewApproved: usedBenefitsReviewed, stockDisposition: "pending-inspection",
    });
  }
  // A previously confirmed full cancellation has already restored allowance;
  // subsequent physical returns only add disposition/audit, never credit twice.
  const releaseQuantity = reservation.state === "settled" ? newlyAcceptedUnits.length : 0;
  const releaseCapacity = reservation.state === "settled" ? unusedReturnedUnits : 0;
  if (counter(allowance.paidQuantity) < releaseQuantity || counter(event.committedQuantity) < releaseCapacity) throw new Error("Return allowance counters are inconsistent");
  await updateCommerce(req, "commerce-allowances", allowance.id, { paidQuantity: counter(allowance.paidQuantity) - releaseQuantity });
  await req.payload.db.updateOne({ collection: "commerce-events" as never, id: event.id, data: { committedQuantity: { $inc: -releaseCapacity } }, req });
  const returnedUnits = [...alreadyReturned, ...newlyAcceptedUnits].sort((a, b) => a - b);
  await updateCommerce(req, "commerce-reservations", reservation.id, {
    returnedUnits,
    ...(returnedUnits.length === quantity && reservation.state === "settled" ? { state: "released", releaseReason: "accepted-return", providerEventID: evidenceID } : {}),
  });
  return { newlyAcceptedUnits };
}

export async function disposeReturnedUnits({ req, orderID, units, disposition }: {
  req: PayloadRequest; orderID: string; units: number[]; disposition: "restock" | "do-not-restock";
}): Promise<{ disposedUnits: number[] }> {
  if (!isCmsSuperAdmin(req.user)) throw new Error("Commerce administrator access required");
  if (!["restock", "do-not-restock"].includes(disposition) || units.length === 0) throw new Error("Explicit stock disposition is required");
  const { reservation, product } = await lockOrderReservation({ req, orderID });
  const indexes = unitIndexes(units, counter(reservation.quantity));
  await lockCommerce(req, [`order-benefits:${orderID}`]);
  const disposedUnits: number[] = [];
  for (const unit of indexes) {
    const admission = await findCommerce(req, "commerce-admissions", "orderUnitKey", `${orderID}:${unit}`);
    if (!admission) throw new Error("Returned unit unavailable");
    await lockCommerce(req, [`admission:${admission.id}`]);
    const current = await readCommerce(req, "commerce-admissions", admission.id);
    if (!current.returnAcceptedAt) throw new Error("Only accepted physical-return units may be disposed");
    if (current.stockDisposition === disposition) continue;
    if (current.stockDisposition !== "pending-inspection") throw new Error("Unit disposition is already final");
    if (disposition === "restock") {
      const updated = await req.payload.db.updateOne({ collection: "products", id: product.id, data: { inventory: { $inc: 1 } }, req });
      if (!updated) throw new Error("Returned stock could not be restored");
    }
    await updateCommerce(req, "commerce-admissions", admission.id, { stockDisposition: disposition, stockDispositionBy: String(req.user!.id), stockDisposedAt: new Date().toISOString() });
    disposedUnits.push(unit);
  }
  return { disposedUnits };
}
