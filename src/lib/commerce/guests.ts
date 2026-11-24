import { createHash, randomBytes } from "node:crypto";
import { APIError, type PayloadRequest } from "payload";
import { isCmsSuperAdmin } from "@/lib/auth/access";
import { isPayloadActiveMember } from "@/lib/member-auth/payload-runtime";
import { purchaseSnapshotSchema } from "./purchase-snapshot";
import { commerceSnapshotHash } from "./snapshot-hash";
import { lockAdmissionBenefits } from "./_shared/benefits";
import { createCommerce, findCommerce, lockCommerce, readCommerce, relationshipID, updateCommerce, type CommerceDocument } from "./_shared/transaction";
import { eventAccountKey } from "./event-account";
import { resolveEventTicketTarget, sameTicketTarget, usesUnlockEvents } from "./event-tickets";
import { readEventApplePass } from "./keys/event-pass";

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Existing keys represent either an activated claim or immutable buyer self occupancy. */
function admissionOccupancy(admission: CommerceDocument): { eventID: string; accountID: string } | undefined {
  if (admission.eventAccountKey == null) return;
  const eventID = relationshipID(admission.event);
  const claimed = admission.claimedAccount != null;
  const accountID = relationshipID(claimed ? admission.claimedAccount : admission.buyer);
  if (!eventID || !accountID || admission.eventAccountKey !== eventAccountKey(eventID, accountID) || (!claimed && admission.unit !== 1)) throw new Error("Admission occupancy is inconsistent");
  return { eventID, accountID };
}

function accountID(req: PayloadRequest): string {
  if (req.user?.collection !== "users") throw new Error("A verified canonical customer account is required");
  return String(req.user.id);
}

function operatorID(req: PayloadRequest): string {
  if (!isCmsSuperAdmin(req.user)) throw new Error("Commerce administrator access required");
  return String(req.user!.id);
}

export async function grantOrderAdmissions({ req, orderID, transactionID }: { req: PayloadRequest; orderID: string; transactionID: string }): Promise<CommerceDocument[]> {
  await lockCommerce(req, [`order-admissions:${orderID}`]);
  const order = await readCommerce(req, "orders", orderID);
  if (order.commerceVersion !== "commerce-v1") throw new Error("Legacy orders do not grant commerce admissions");
  const snapshot = purchaseSnapshotSchema.parse(order.commerceSnapshot);
  if (snapshot.eventID === null) throw new Error("Order does not include admission");
  const reservation = await findCommerce(req, "commerce-reservations", "attemptID", String(order.commerceAttemptID));
  if (!reservation || reservation.state !== "settled" || relationshipID(reservation.order) !== orderID || reservation.snapshotHash !== commerceSnapshotHash(snapshot) || reservation.quantity !== snapshot.quantity || relationshipID(reservation.customer) !== snapshot.customerID) throw new Error("Order is not backed by its settled immutable reservation");
  const guest = snapshot.version === 3;
  const memberTicket = snapshot.version === 2 ? snapshot.memberTicketTarget : undefined;
  if (memberTicket) {
    const event = await readCommerce(req, "commerce-events", snapshot.eventID);
    if (!sameTicketTarget(memberTicket, resolveEventTicketTarget(event, "member", snapshot.productID))) throw new Error("Member Ticket settlement target mismatch");
  }
  if (!guest && reservation.ticketTarget != null) throw new Error("Unexpected Guest ticket reservation target");
  if (guest) {
    const event = await readCommerce(req, "commerce-events", snapshot.eventID);
    if (!event || relationshipID(reservation.event) !== snapshot.eventID || relationshipID(reservation.product) !== snapshot.productID ||
      !sameTicketTarget(reservation.ticketTarget, snapshot.ticketTarget) ||
      !sameTicketTarget(resolveEventTicketTarget(event, "guest", snapshot.productID), snapshot.ticketTarget)) throw new Error("Guest ticket settlement target mismatch");
  }
  if (!Array.isArray(order.transactions) || !order.transactions.some((value) => relationshipID(value) === transactionID)) throw new Error("Order transaction does not match");
  const transaction = await readCommerce(req, "transactions", transactionID);
  if (transaction.status !== "succeeded" || relationshipID(transaction.order) !== orderID || relationshipID(transaction.customer) !== snapshot.customerID || transaction.amount !== snapshot.totalAmount || transaction.currency !== snapshot.currency) throw new Error("Admission requires a succeeded matching transaction");
  // Pre-read and validate every expected unit before any create: the caller's
  // transaction owns rollback, but partial/corrupt historical grants are not new work.
  const previous: (CommerceDocument | undefined)[] = [];
  for (let unit = 1; unit <= snapshot.quantity; unit++) previous.push(await findCommerce(req, "commerce-admissions", "orderUnitKey", `${orderID}:${unit}`));
  for (const [index, admission] of previous.entries()) {
    if (!admission) continue;
    if (admission.orderUnitKey !== `${orderID}:${index + 1}` || admission.unit !== index + 1 || relationshipID(admission.order) !== orderID || relationshipID(admission.transaction) !== transactionID || relationshipID(admission.event) !== snapshot.eventID || relationshipID(admission.buyer) !== snapshot.customerID) throw new Error("Admission grant identity mismatch");
    if (guest && (admission.ticketTier !== "guest" || admission.claimedAccount != null || admission.eventAccountKey != null ||
      !sameTicketTarget(admission.ticketTarget, snapshot.ticketTarget))) throw new Error("Guest admission identity mismatch");
    if (memberTicket && (admission.ticketTier !== "member" || admission.claimedAccount != null ||
      admission.eventAccountKey !== eventAccountKey(snapshot.eventID, snapshot.customerID) ||
      !sameTicketTarget(admission.ticketTarget, memberTicket))) throw new Error("Member Ticket admission identity mismatch");
    admissionOccupancy(admission);
  }
  const existing = previous.filter((admission) => admission !== undefined);
  // Expected keys alone cannot reveal an orphan with a corrupt key or extra unit.
  const byOrder = await req.payload.find({ collection: "commerce-admissions" as never, where: { order: { equals: orderID } }, limit: snapshot.quantity + 1, depth: 0, overrideAccess: true, req });
  const orderRows = byOrder.docs as unknown as CommerceDocument[];
  if (byOrder.totalDocs !== orderRows.length || orderRows.length !== existing.length || orderRows.some((admission) => {
    const unit = Number(admission.unit);
    return !Number.isSafeInteger(unit) || unit < 1 || unit > snapshot.quantity || admission.orderUnitKey !== `${orderID}:${unit}` || previous[unit - 1]?.id !== admission.id;
  })) throw new Error("Admission grant identity mismatch");
  if (existing.length) {
    if (existing.length !== snapshot.quantity) throw new Error("Partial admission grant requires reconciliation");
    return existing;
  }
  const occupancyKey = eventAccountKey(snapshot.eventID, snapshot.customerID);
  // Last in this path's lock order, shared with claims. Never acquire existing
  // admission/order-benefit locks after this account/event authority.
  if (!guest) await lockCommerce(req, [`event-account:${occupancyKey}`]);
  const occupied = guest ? undefined : await findCommerce(req, "commerce-admissions", "eventAccountKey", occupancyKey);
  if (occupied) {
    const occupancy = admissionOccupancy(occupied);
    if (!occupancy || occupancy.eventID !== snapshot.eventID || occupancy.accountID !== snapshot.customerID) throw new Error("Admission occupancy is inconsistent");
  }
  if (memberTicket && occupied) throw new Error("Member Ticket seat already occupied");
  const result: CommerceDocument[] = [];
  for (let unit = 1; unit <= snapshot.quantity; unit++) {
    result.push(await createCommerce(req, "commerce-admissions", { orderUnitKey: `${orderID}:${unit}`, order: orderID, transaction: transactionID, event: snapshot.eventID, buyer: snapshot.customerID, unit, status: "available",
      ...(guest ? { ticketTier: "guest", ticketTarget: snapshot.ticketTarget } : memberTicket ? { ticketTier: "member", ticketTarget: memberTicket } : {}),
      ...(!guest && unit === 1 && !occupied ? { eventAccountKey: occupancyKey } : {}) }));
  }
  return result;
}

export async function assignGuestName({ req, admissionID, guestName }: { req: PayloadRequest; admissionID: string; guestName: string }): Promise<void> {
  const buyerID = accountID(req);
  const name = guestName.trim();
  if (!name || name.length > 100 || /[\u0000-\u001f]/.test(name)) throw new Error("A valid guest name is required");
  const admission = await lockAdmissionBenefits(req, admissionID);
  if (relationshipID(admission.buyer) !== buyerID || admission.status !== "available") throw new Error("Guest names lock after claim or check-in");
  await updateCommerce(req, "commerce-admissions", admissionID, { guestName: name });
}

export async function buyerAdmissions({ req, orderID }: { req: PayloadRequest; orderID: string }) {
  const customerID = accountID(req);
  // MEMBER: the parent order is read with the buyer's own order access first, so a foreign
  // and a missing order look the same and nothing privileged runs for either.
  const order = await req.payload.findByID({ collection: "orders" as never, id: orderID, overrideAccess: false, disableErrors: true, depth: 0, req }) as unknown as CommerceDocument | null;
  if (!order) throw new Error("Order admissions unavailable");
  const snapshot = purchaseSnapshotSchema.parse(order.commerceSnapshot);
  if (order.commerceVersion !== "commerce-v1" || snapshot.customerID !== customerID) throw new Error("Order admissions unavailable");
  // SYSTEM projection: admissions stay server-only; bound to the verified order and buyer, projected fields only.
  const result = await req.payload.find({ collection: "commerce-admissions" as never, where: { and: [{ order: { equals: orderID } }, { buyer: { equals: customerID } }] }, limit: 3, depth: 0, overrideAccess: true, req });
  return Promise.all((result.docs as unknown as CommerceDocument[]).map(async (admission) => ({
    admissionID: admission.id, unit: Number(admission.unit), name: String(admission.guestName ?? ""),
    status: String(admission.status), reviewRequired: admission.benefitReview === true, claimed: !!admission.claimedAccount,
    ...(admission.ticketTier === "guest" || admission.ticketTier === "member" ? {
      ticketTier: admission.ticketTier, applePassURL: await readEventApplePass(req, admission, order, customerID),
    } : {}),
  })));
}

export async function issueGuestClaim({ req, admissionID }: { req: PayloadRequest; admissionID: string }): Promise<{ token: string; expiresAt: string }> {
  const buyerID = accountID(req);
  const admission = await lockAdmissionBenefits(req, admissionID);
  if (admission.ticketTier != null) throw new APIError("Event tickets do not use claim links", 409, undefined, true);
  if (admissionOccupancy(admission)) throw new Error("Occupied admissions cannot issue gift claims");
  if (relationshipID(admission.buyer) !== buyerID || !["available", "checked-in"].includes(String(admission.status)) || admission.claimedAccount || !admission.guestName) throw new Error("Assign an unregistered admission before issuing its claim");
  const event = await readCommerce(req, "commerce-events", relationshipID(admission.event));
  const cutoff = new Date(String(event.claimCutoffAt)).getTime();
  if (!Number.isFinite(cutoff) || Date.now() >= cutoff) throw new Error("Guest claim cutoff has passed");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(cutoff).toISOString();
  const previous = await findCommerce(req, "commerce-claims", "admission", admissionID);
  const data = { admission: admissionID, tokenDigest: digest(token), expiresAt, consumedAt: null, revokedAt: null };
  if (previous) await updateCommerce(req, "commerce-claims", previous.id, data);
  else await createCommerce(req, "commerce-claims", data);
  return { token, expiresAt };
}

export async function claimGuestAdmission({ req, token }: { req: PayloadRequest; token: string }, activeMember: (customerID: string) => Promise<boolean> = isPayloadActiveMember): Promise<{ admissionID: string }> {
  const customerID = accountID(req);
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new APIError("Invalid guest claim", 400, { code: "CLAIM_INVALID" }, true);
  const claim = await findCommerce(req, "commerce-claims", "tokenDigest", digest(token));
  if (!claim) throw new APIError("Invalid guest claim", 400, { code: "CLAIM_INVALID" }, true);
  const admissionID = relationshipID(claim.admission);
  const admission = await lockAdmissionBenefits(req, admissionID);
  if (admission.ticketTier != null) throw new APIError("Guest claim is unavailable", 409, { code: "CLAIM_UNAVAILABLE" }, true);
  const currentClaim = await readCommerce(req, "commerce-claims", claim.id);
  const expiresAt = new Date(String(currentClaim.expiresAt)).getTime();
  if (currentClaim.tokenDigest !== digest(token)) throw new APIError("Invalid guest claim", 400, { code: "CLAIM_INVALID" }, true);
  if (!Number.isFinite(expiresAt)) throw new Error("Guest claim expiry is invalid");
  if (currentClaim.revokedAt) throw new APIError("Guest claim is unavailable", 409, { code: "CLAIM_UNAVAILABLE" }, true);
  // Only the original claimant can recover a lost receipt; all other consumed
  // bearers retain their private rejection and its existing precedence.
  const recovering = !!currentClaim.consumedAt && admission.claimedAccount != null && relationshipID(admission.claimedAccount) === customerID && ["claimed", "checked-in"].includes(String(admission.status));
  if (currentClaim.consumedAt && !recovering) throw new APIError("Guest claim is consumed", 409, { code: "CLAIM_CONSUMED" }, true);
  if (recovering) {
    const consumedAt = new Date(String(currentClaim.consumedAt)).getTime();
    if (currentClaim.id !== claim.id || relationshipID(currentClaim.admission) !== admissionID || admission.id !== admissionID || !Number.isFinite(consumedAt) || consumedAt > Date.now()) throw new Error("Claim recovery linkage is inconsistent");
  }
  if (Date.now() >= expiresAt) throw new APIError("Guest claim cutoff has passed", 410, { code: "CLAIM_EXPIRED" }, true);
  const occupancy = admissionOccupancy(admission);
  if (recovering) {
    if (!occupancy || occupancy.accountID !== customerID) throw new Error("Claim recovery occupancy is inconsistent");
  } else if (occupancy || !["available", "checked-in"].includes(String(admission.status)) || admission.claimedAccount) throw new APIError("Guest claim is unavailable", 409, { code: "CLAIM_UNAVAILABLE" }, true);
  const customer = await readCommerce(req, "users", customerID);
  if (customer.emailVerified !== true || customer.banned === true || !await activeMember(customerID)) throw new APIError("Individually verified account eligibility is required", 403, { code: "ACCOUNT_NOT_ELIGIBLE" }, true);
  const eventID = relationshipID(admission.event);
  const event = await readCommerce(req, "commerce-events", eventID);
  const cutoff = new Date(String(event.claimCutoffAt)).getTime();
  if (!Number.isFinite(cutoff)) throw new Error("Guest event claim cutoff is invalid");
  if (Date.now() >= cutoff) throw new APIError("Guest claim cutoff has passed", 410, { code: "CLAIM_EXPIRED" }, true);
  const eventAccountKey = digest(JSON.stringify([eventID, customerID]));
  await lockCommerce(req, [`event-account:${eventAccountKey}`]);
  const occupied = await findCommerce(req, "commerce-admissions", "eventAccountKey", eventAccountKey);
  if (recovering) {
    if (!occupied || occupied.id !== admissionID || relationshipID(occupied.claimedAccount) !== customerID || relationshipID(occupied.event) !== eventID || occupied.eventAccountKey !== eventAccountKey) throw new Error("Claim recovery occupancy is inconsistent");
    return { admissionID };
  }
  if (occupied) {
    const occupancy = admissionOccupancy(occupied);
    if (!occupancy || occupancy.eventID !== eventID || occupancy.accountID !== customerID) throw new Error("Admission occupancy is inconsistent");
    throw new APIError("This account already has an admission for this event", 409, { code: "EVENT_ALREADY_BOUND" }, true);
  }
  await updateCommerce(req, "commerce-admissions", admissionID, { claimedAccount: customerID, eventAccountKey, status: admission.status === "checked-in" ? "checked-in" : "claimed" });
  await updateCommerce(req, "commerce-claims", claim.id, { consumedAt: new Date().toISOString() });
  return { admissionID };
}

export async function checkInGuest({ req, admissionID }: { req: PayloadRequest; admissionID: string }): Promise<void> {
  operatorID(req);
  // Match settlement's event-before-benefits lock order. Changing the event
  // to Unlock authority cannot race an already-authorized local write.
  const preliminary = await readCommerce(req, "commerce-admissions", admissionID);
  const eventID = relationshipID(preliminary.event);
  await lockCommerce(req, [`event:${eventID}`]);
  const admission = await lockAdmissionBenefits(req, admissionID);
  if (relationshipID(admission.event) !== eventID) throw new Error("Admission event changed");
  const event = await readCommerce(req, "commerce-events", eventID);
  if (usesUnlockEvents(event) || admission.ticketTier != null) {
    throw new APIError("Use Unlock EVENTS for entry and name lookup", 409, { code: "UNLOCK_EVENTS_CHECK_IN" }, true);
  }
  if (admission.status === "checked-in") return;
  if (!["available", "claimed"].includes(String(admission.status)) || !admission.guestName) throw new Error("Check-in requires this guest's named paid admission");
  await updateCommerce(req, "commerce-admissions", admissionID, { status: "checked-in", checkedInAt: new Date().toISOString() });
}

export async function redeemGuestBenefit({ req, admissionID, kind, actionID }: { req: PayloadRequest; admissionID: string; kind: "part-i-drink" | "shared-transfer"; actionID: string }): Promise<{ ordinal: number }> {
  const operator = operatorID(req);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(actionID) || !["part-i-drink", "shared-transfer"].includes(kind)) throw new Error("A valid idempotent benefit action is required");
  const admission = await lockAdmissionBenefits(req, admissionID);
  if (admission.ticketTier != null || usesUnlockEvents(await readCommerce(req, "commerce-events", relationshipID(admission.event)))) throw new Error("Local redemption is unavailable for Unlock tickets");
  if (admission.status !== "checked-in" || !admission.claimedAccount) throw new Error("Benefits require this guest's checked-in admission");
  const redemptionKey = digest(JSON.stringify([admissionID, kind, actionID]));
  const previous = await findCommerce(req, "commerce-redemptions", "redemptionKey", redemptionKey);
  if (previous) return { ordinal: Number(previous.ordinal) };
  const result = await req.payload.find({ collection: "commerce-redemptions" as never, where: { and: [{ admission: { equals: admissionID } }, { kind: { equals: kind } }] }, limit: 5, depth: 0, overrideAccess: true, req });
  const limit = kind === "part-i-drink" ? 4 : 1;
  if (result.totalDocs >= limit) throw new Error("Guest benefit is fully redeemed");
  if (kind === "part-i-drink") {
    const event = await readCommerce(req, "commerce-events", relationshipID(admission.event));
    const now = Date.now();
    const start = new Date(String(event.partIStartsAt)).getTime();
    const end = new Date(String(event.partIEndsAt)).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || now < start || now >= end) throw new Error("Individual drinks are available only during Part I");
  }
  const ordinal = result.totalDocs + 1;
  await createCommerce(req, "commerce-redemptions", { redemptionKey, admission: admissionID, operator, kind, ordinal, redeemedAt: new Date().toISOString() });
  return { ordinal };
}

export async function guestManifest({ req, eventID, page = 1 }: { req: PayloadRequest; eventID: string; page?: number }) {
  operatorID(req);
  if (!Number.isSafeInteger(page) || page < 1) throw new Error("Invalid manifest page");
  const event = await readCommerce(req, "commerce-events", eventID);
  const admissions = await req.payload.find({ collection: "commerce-admissions" as never, where: { and: [{ event: { equals: eventID } }, { status: { in: ["available", "claimed", "checked-in"] } }] }, limit: 100, page, sort: "id", depth: 0, overrideAccess: true, req });
  const result = [];
  for (const record of admissions.docs as unknown as CommerceDocument[]) {
    const transfer = await req.payload.find({ collection: "commerce-redemptions" as never, where: { and: [{ admission: { equals: record.id } }, { kind: { equals: "shared-transfer" } }] }, limit: 1, depth: 0, overrideAccess: true, req });
    const external = usesUnlockEvents(event) || record.ticketTier != null;
    result.push({ admissionID: record.id, name: String(record.guestName ?? ""), checkedIn: external ? null : record.status === "checked-in", transferRedeemed: transfer.totalDocs > 0, reviewRequired: record.benefitReview === true, registered: !!record.claimedAccount, transferEligible: !external && record.status === "checked-in" && !!record.claimedAccount && record.benefitReview !== true && !record.returnAcceptedAt });
  }
  return { docs: result, page, totalDocs: admissions.totalDocs, hasNextPage: admissions.hasNextPage };
}
