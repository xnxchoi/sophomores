import { createHash } from "node:crypto";
import type { PayloadRequest } from "payload";
import { MAX_ORDER_UNITS, MEMBERSHIP_RELEASE } from "./contracts";
import { keyGrantStates, MEMBER_EVENT_GRANT, memberEventGrantOperationKey, parseKeyGrantTarget } from "./keys/contracts";
import { assertGuestSponsorMembership } from "./membership";
import { optionalRelationshipID, purchaseSnapshotSchema, reservationAllowance } from "./purchase-snapshot";
import { resolveEventTicketTarget, guestTicketTarget, sameTicketTarget, usesUnlockEvents, unlockEventTicketConfiguration, sharedTicketMode, sharedTicketTarget, sharedEventTicketsEnabled, sharedGuestSalePin, SHARED_GUEST_LIMIT } from "./event-tickets";
import { counter, createCommerce, findCommerce, lockCommerce, readCommerce, relationshipID, updateCommerce, type CommerceDocument } from "./_shared/transaction";
import { RefundTermsChanged, refundPolicy, refundTerms, sameRefundTerms, type RefundTerms } from "./refund-policy";

type ReservationInput = { /** The refund terms shown beside Pay, for a guest purchase (Review-B r4). */ refundTerms?: RefundTerms; req: PayloadRequest; attemptID: string; customerID: string; releaseID: string; productID: string; eventID: string | null; variantID?: string; quantity: number; accountLimit: number; snapshotHash: string; productVersion?: string; variantVersion?: string; ticketTarget?: unknown; memberTicketTarget?: unknown };
type ReservationAction = { req: PayloadRequest; attemptID: string };
export type VerifiedReleaseReason = "confirmed-cancel" | "accepted-return" | "verified-failure";

function allowanceKey(customerID: string, releaseID: string): string {
  return createHash("sha256").update(JSON.stringify([customerID, releaseID])).digest("hex");
}

function resourceKeys(customerID: string, productID: string, eventID: string | null, guest = false): string[] {
  return [...(eventID === null ? [] : [`event:${eventID}`]), `product:${productID}`,
    `allowance:${allowanceKey(customerID, reservationAllowance(productID, eventID, guest))}`];
}

export async function lockReservationContext(req: PayloadRequest, attemptID: string) {
  await lockCommerce(req, [`attempt:${attemptID}`]);
  const reservation = await findCommerce(req, "commerce-reservations", "attemptID", attemptID);
  if (!reservation) throw new Error("Reservation not found");
  const customerID = relationshipID(reservation.customer);
  const productID = relationshipID(reservation.product);
  const eventID = optionalRelationshipID(reservation.event);
  const guest = reservation.ticketTarget != null;
  if (guest && (eventID === null || !guestTicketTarget.safeParse(reservation.ticketTarget).success || reservation.releaseID !== productID)) throw new Error("Guest reservation identity mismatch");
  const releaseID = reservationAllowance(productID, eventID, guest);
  if (reservation.releaseID !== productID && (eventID === null || reservation.releaseID !== MEMBERSHIP_RELEASE)) {
    throw new Error("Reservation release identity mismatch");
  }
  await lockCommerce(req, resourceKeys(customerID, productID, eventID, guest));
  const allowance = await findCommerce(req, "commerce-allowances", "accountReleaseKey", allowanceKey(customerID, releaseID));
  if (!allowance || allowance.releaseID !== releaseID || relationshipID(allowance.customer) !== customerID) {
    throw new Error("Missing or mismatched reservation allowance");
  }
  const product = await req.payload.db.findOne<CommerceDocument>({ collection: "products", where: { id: { equals: productID } }, draftsEnabled: false, req });
  if (!product) throw new Error("Canonical product is missing");
  const event = eventID === null ? null : await readCommerce(req, "commerce-events", eventID);
  return { reservation, allowance, product, event };
}

export async function lockOrderReservation({ req, orderID }: { req: PayloadRequest; orderID: string }) {
  const order = await readCommerce(req, "orders", orderID);
  if (order.commerceVersion !== "commerce-v1") throw new Error("Legacy order has no commerce reservation");
  const context = await lockReservationContext(req, String(order.commerceAttemptID));
  const snapshot = purchaseSnapshotSchema.parse(order.commerceSnapshot);
  if (!context.reservation.order || relationshipID(context.reservation.order) !== orderID ||
    optionalRelationshipID(context.reservation.event) !== snapshot.eventID ||
    relationshipID(context.reservation.product) !== snapshot.productID ||
    context.reservation.releaseID !== snapshot.releaseID ||
    (snapshot.version === 3 ? !sameTicketTarget(context.reservation.ticketTarget, snapshot.ticketTarget) : context.reservation.ticketTarget != null)) throw new Error("Order reservation linkage mismatch");
  return { ...context, snapshot };
}

/**
 * A return or cancellation frees the allowance, but an issued key is revoked
 * separately (ADR-0009). Until every key this account was owed from a membership
 * order is cancelled, a repurchase would queue a second grant, so it waits.
 *
 * Every live key of the account is read in id order with a keyset cursor
 * (`id > last`), not an offset. The cancel worker commits under its own intent
 * lock, so the live set can shrink between pages; a keyset cursor never skips a
 * row when earlier rows leave. Keys are only ever added by settlement, which
 * holds this same account allowance lock, so none can appear mid-read.
 *
 * Each key is classified by its own order: commerce-v1 orders are membership
 * orders (every v1 settle grants membership). Any other order, such as an event
 * or invitation, is independent. A key whose order is missing or unreadable
 * fails closed. System read under the account's allowance lock.
 */
const LIVE_MEMBERSHIP_KEY = "An earlier membership key is not yet cancelled";

/** Ignore a Member Event intent only when it proves a distinct, pinned entitlement. */
async function assertMemberEventIdentity(req: PayloadRequest, customer: string, intent: CommerceDocument, order: CommerceDocument) {
  const snapshot = purchaseSnapshotSchema.safeParse(order.commerceSnapshot);
  const admission = await readCommerce(req, "commerce-admissions", relationshipID(intent.entitlement));
  const pinned = snapshot.success && snapshot.data.version === 2 ? snapshot.data.memberTicketTarget : undefined;
  const paymentID = relationshipID(intent.payment);
  if (order.commerceVersion !== "commerce-v1" || !snapshot.success || !pinned || !snapshot.data.eventID ||
    snapshot.data.customerID !== customer || relationshipID(order.customer) !== customer ||
    relationshipID(admission.buyer) !== customer || relationshipID(intent.beneficiaryUser) !== customer ||
    relationshipID(admission.order) !== order.id || relationshipID(admission.event) !== snapshot.data.eventID ||
    relationshipID(admission.transaction) !== paymentID || !Array.isArray(order.transactions) ||
    order.transactions.length !== 1 || relationshipID(order.transactions[0]) !== paymentID ||
    intent.recipientMode !== "member_safe" || admission.unit !== 1 || admission.orderUnitKey !== `${order.id}:1` ||
    admission.ticketTier !== "member" || !sameTicketTarget(admission.ticketTarget, pinned) ||
    intent.operationKey !== memberEventGrantOperationKey(order.id, admission.unit)) throw new Error("Member Event grant identity is inconsistent");
  if (intent.target == null) {
    if (intent.state !== "awaiting_wallet") throw new Error("Member Event grant identity is inconsistent");
    return;
  }
  const target = parseKeyGrantTarget(intent.target);
  if (target.ticketTier !== "member" || !sameTicketTarget(pinned, { chainID: target.chainID, lock: target.lock, mode: target.ticketMode })) {
    throw new Error("Member Event grant identity is inconsistent");
  }
}

async function assertNoLiveMembershipKey(req: PayloadRequest, customerID: string): Promise<void> {
  const live = keyGrantStates.filter((state) => state !== "cancelled");
  const pageSize = 50;
  for (let after: string | null = null; ;) {
    const found = await req.payload.find({ collection: "commerce-key-grant-intents" as never, req, overrideAccess: true, depth: 0, limit: pageSize, sort: "id",
      where: { and: [{ beneficiaryUser: { equals: customerID } }, { state: { in: live } }, ...(after === null ? [] : [{ id: { greater_than: after } }])] } });
    const docs = found.docs as unknown as CommerceDocument[];
    for (const intent of docs) {
      if (intent.order == null) throw new Error(LIVE_MEMBERSHIP_KEY);
      // A missing or unreadable order throws here, so the purchase fails closed.
      const order = await readCommerce(req, "orders", relationshipID(intent.order));
      if (intent.purpose === MEMBER_EVENT_GRANT) {
        await assertMemberEventIdentity(req, customerID, intent, order);
        continue;
      }
      if (intent.purpose != null && intent.purpose !== "primary") throw new Error("Key grant purpose is inconsistent");
      if (order.commerceVersion === "commerce-v1") {
        const snapshot = purchaseSnapshotSchema.safeParse(order.commerceSnapshot);
        if (snapshot.success && snapshot.data.version === 3) continue;
        // A key attributed to a book-only order is itself an integrity failure.
        if (snapshot.success && snapshot.data.eventID === null) throw new Error("Unexpected grant on a book-only order");
        throw new Error(LIVE_MEMBERSHIP_KEY);
      }
    }
    if (docs.length < pageSize) return;
    after = String(docs[docs.length - 1].id);
  }
}

/** The account's allowance row for this product's namespace (SYSTEM: the allowance ledger is server-only). */
async function readAccountAllowance(req: PayloadRequest, customerID: string, productID: string, eventID: string | null, guest = false) {
  const namespace = reservationAllowance(productID, eventID, guest);
  const key = allowanceKey(customerID, namespace);
  const allowance = await findCommerce(req, "commerce-allowances", "accountReleaseKey", key);
  return { namespace, key, allowance, reserved: allowance ? counter(allowance.reservedQuantity) : 0, paid: allowance ? counter(allowance.paidQuantity) : 0 };
}

/**
 * Whether `quantity` more units fit the account, under the same rule reservePurchase enforces: reserved + paid within the
 * limit and, for the membership token, no live earlier key. Read-only and unlocked, so it is advisory: the cart uses it to
 * refuse a line early with a clear reason, and reservePurchase, under its locks, stays authoritative. SYSTEM reads of
 * server-only ledgers; it answers yes or no and never returns them. Integrity and storage failures propagate (fail closed).
 */
export async function accountAllowanceAdmits(req: PayloadRequest, { customerID, productID, eventID, quantity, accountLimit, guest = false }:
  { customerID: string; productID: string; eventID: string | null; quantity: number; accountLimit: number; guest?: boolean }): Promise<boolean> {
  const { namespace, reserved, paid } = await readAccountAllowance(req, customerID, productID, eventID, guest);
  if (reserved + paid + quantity > accountLimit) return false;
  if (namespace !== MEMBERSHIP_RELEASE) return true;
  try { await assertNoLiveMembershipKey(req, customerID); }
  catch (error) { if (error instanceof Error && error.message === LIVE_MEMBERSHIP_KEY) return false; throw error; }
  return true;
}

export async function reservePurchase(input: ReservationInput): Promise<CommerceDocument> {
  const { req, attemptID, customerID, productID, eventID, releaseID, quantity, accountLimit, snapshotHash, variantID } = input;
  // The limit is the rule recorded in the hashed server snapshot, not a global constant.
  if (!Number.isSafeInteger(accountLimit) || accountLimit < 1 || accountLimit > MAX_ORDER_UNITS || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > accountLimit) throw new Error("Purchase quantity exceeds the recorded account limit");
  // Commerce v1 sells the membership token only: one allowance per account, across products.
  const ticket = input.ticketTarget === undefined ? null : guestTicketTarget.parse(input.ticketTarget);
  const memberTicket = input.memberTicketTarget === undefined ? null : sharedTicketTarget.parse(input.memberTicketTarget);
  if (memberTicket && (!eventID || !variantID || ticket)) throw new Error("Invalid Member Ticket reservation");
  if (!attemptID || !customerID || !productID || (ticket ? !eventID || !!variantID || releaseID !== productID || productID === MEMBERSHIP_RELEASE : variantID ? releaseID !== productID : !eventID || releaseID !== MEMBERSHIP_RELEASE)
    || !/^[a-f0-9]{64}$/.test(snapshotHash)) throw new Error("Invalid reservation identity or snapshot");
  await lockCommerce(req, [`attempt:${attemptID}`]);
  const previous = await findCommerce(req, "commerce-reservations", "attemptID", attemptID);
  if (previous) {
    if (previous.snapshotHash !== snapshotHash || relationshipID(previous.customer) !== customerID || relationshipID(previous.product) !== productID || optionalRelationshipID(previous.event) !== eventID || previous.releaseID !== releaseID || previous.quantity !== quantity || previous.state === "released") throw new Error("Reservation attempt cannot be rebound or reopened");
    if (ticket ? !sameTicketTarget(previous.ticketTarget, ticket) : previous.ticketTarget != null) throw new Error("Reservation ticket target cannot change");
    await lockCommerce(req, resourceKeys(customerID, productID, eventID, !!ticket));
    return previous;
  }
  await lockCommerce(req, resourceKeys(customerID, productID, eventID, !!ticket));
  const product = await req.payload.db.findOne<CommerceDocument>({ collection: "products", where: { id: { equals: productID } }, draftsEnabled: false, req });
  if (!product) throw new Error("Canonical product is missing");
  const event = eventID === null ? null : await readCommerce(req, "commerce-events", eventID);
  if (ticket && (!event || !sameTicketTarget(resolveEventTicketTarget(event, "guest", productID), ticket))) throw new Error("Guest ticket lock configuration changed");
  if (ticket && sharedTicketMode(ticket)) {
    const sale = sharedGuestSalePin();
    if (accountLimit !== SHARED_GUEST_LIMIT || !event || sale?.eventID !== event.id ||
      sale.productID !== productID || !sharedEventTicketsEnabled(event.id, ticket)) {
      throw new Error("Shared Guest Ticket reservation unavailable");
    }
    await assertGuestSponsorMembership(req, customerID);
  }
  if (event?.unlockTicketConfiguration != null && !ticket) {
    const config = unlockEventTicketConfiguration.safeParse(event.unlockTicketConfiguration);
    if (!config.success || config.data.guestProductID === productID) throw new Error("Guest offer cannot be reserved as membership");
    if ((memberTicket || "mode" in config.data) && (!memberTicket || !sharedEventTicketsEnabled(event.id, memberTicket) ||
      !sameTicketTarget(memberTicket, resolveEventTicketTarget(event, "member", productID)))) throw new Error("Shared Member Ticket reservation unavailable");
  }
  if (memberTicket && !event?.unlockTicketConfiguration) throw new Error("Shared Member Ticket configuration unavailable");
  const variant = variantID ? await readCommerce(req, "variants", variantID) : null;
  const now = Date.now();
  const saleStart = new Date(String(product.saleStartsAt)).getTime();
  const saleEnd = new Date(String(product.saleEndsAt)).getTime();
  if (!product.publicationApproved || product._status !== "published" ||
    (event && (!event.publicationApproved || optionalRelationshipID(product.event) !== eventID)) ||
    (variant && (product.commerceModel !== "native-edition-v2" || product.updatedAt !== input.productVersion ||
      optionalRelationshipID(variant.product) !== productID || variant._status !== "published" || variant.publicationApproved !== true ||
      variant.updatedAt !== input.variantVersion)) ||
    !Number.isFinite(saleStart) || !Number.isFinite(saleEnd) || saleStart >= saleEnd || now < saleStart || now >= saleEnd) throw new Error("Product is not available for purchase");
  const productReserved = counter(product.reservedQuantity);
  const capacity = event && (memberTicket || (ticket && sharedTicketMode(ticket)))
    ? Math.min(counter(event.capacity), counter(event.transportCapacity)) : event ? counter(event.capacity) : null;
  if (counter((variant ?? product).inventory) - productReserved < quantity ||
    (event && capacity !== null && capacity - counter(event.committedQuantity) - counter(event.reservedQuantity) < quantity)) throw new Error("Insufficient product or guaranteed admission capacity");
  const { namespace, key, allowance, reserved, paid } = await readAccountAllowance(req, customerID, productID, eventID, !!ticket);
  // Single membership token per account (owner, 22 Nov), under the snapshot's recorded limit.
  if (reserved + paid + quantity > accountLimit) throw new Error("Account membership allowance exceeded");
  if (namespace === MEMBERSHIP_RELEASE) await assertNoLiveMembershipKey(req, customerID);
  // The refund terms shown beside Pay, checked again under the event lock against the event as read here and a clock
  // sampled after every read above (Review-B r4): a change (an edited start, a cutoff crossed while this request waited)
  // throws before any write, so the attempt and its reservation roll back together.
  if (ticket && input.refundTerms !== undefined) {
    const terms = refundTerms(refundPolicy({ version: 3, kind: "guest-ticket-v1", eventID }), event?.partIStartsAt, Date.now());
    if (!sameRefundTerms(input.refundTerms, terms)) throw new RefundTermsChanged(terms);
  }
  if (allowance) await updateCommerce(req, "commerce-allowances", allowance.id, { reservedQuantity: reserved + quantity });
  else await createCommerce(req, "commerce-allowances", { accountReleaseKey: key, customer: customerID, releaseID: namespace, reservedQuantity: quantity, paidQuantity: 0 });
  await req.payload.db.updateOne({ collection: "products", id: productID, data: { reservedQuantity: { $inc: quantity } }, req });
  if (eventID !== null) await req.payload.db.updateOne({ collection: "commerce-events" as never, id: eventID, data: { reservedQuantity: { $inc: quantity } }, req });
  return createCommerce(req, "commerce-reservations", { attemptID, customer: customerID, product: productID, event: eventID, releaseID, quantity, snapshotHash, state: "reserved", ...(ticket ? { ticketTarget: ticket } : {}) });
}


export async function settleReservation({ req, attemptID, orderID }: ReservationAction & { orderID: string }): Promise<CommerceDocument> {
  const { reservation, allowance, product, event } = await lockReservationContext(req, attemptID);
  if (reservation.state === "settled") {
    if (relationshipID(reservation.order) !== orderID) throw new Error("Reservation already belongs to another order");
    return reservation;
  }
  if (reservation.state !== "reserved") throw new Error("Released reservation cannot settle");
  const quantity = counter(reservation.quantity);
  if (counter(allowance.reservedQuantity) < quantity || counter(product.reservedQuantity) < quantity || (event && counter(event.reservedQuantity) < quantity)) throw new Error("Reservation counters are inconsistent");
  await updateCommerce(req, "commerce-allowances", allowance.id, { reservedQuantity: counter(allowance.reservedQuantity) - quantity, paidQuantity: counter(allowance.paidQuantity) + quantity });
  // Plugin finalization alone decrements actual inventory in this transaction.
  await req.payload.db.updateOne({ collection: "products", id: product.id, data: { reservedQuantity: { $inc: -quantity } }, req });
  if (event) await req.payload.db.updateOne({ collection: "commerce-events" as never, id: event.id, data: { reservedQuantity: { $inc: -quantity }, committedQuantity: { $inc: quantity } }, req });
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
  const ticket = guestTicketTarget.safeParse(reservation.ticketTarget);
  // Keep a paid shared Guest slot charged against the cap while its key may still be usable.
  if (!settled || !ticket.success || !sharedTicketMode(ticket.data)) {
    await updateCommerce(req, "commerce-allowances", allowance.id, { [allowanceField]: counter(allowance[allowanceField]) - quantity });
  }
  let releasedCapacity = settled ? 0 : quantity;
  if (!settled) await req.payload.db.updateOne({ collection: "products", id: product.id, data: { reservedQuantity: { $inc: -quantity } }, req });
  if (settled && event) {
    const orderID = relationshipID(reservation.order);
    await lockCommerce(req, [`order-benefits:${orderID}`]);
    for (let unit = 1; unit <= counter(reservation.quantity); unit++) {
      const admission = await findCommerce(req, "commerce-admissions", "orderUnitKey", `${orderID}:${unit}`);
      if (!admission) throw new Error("Paid reservation is missing its admission");
      await lockCommerce(req, [`admission:${admission.id}`]);
      const current = await readCommerce(req, "commerce-admissions", admission.id);
      const redemptions = await req.payload.find({ collection: "commerce-redemptions" as never, where: { admission: { equals: admission.id } }, limit: 1, depth: 0, overrideAccess: true, req });
      // Unknown external attendance must not release capacity or be recorded as unused.
      const used = usesUnlockEvents(event) || current.status === "checked-in" || !!current.checkedInAt || redemptions.totalDocs > 0;
      if (!used && !returnedUnits.includes(unit)) releasedCapacity++;
      await updateCommerce(req, "commerce-admissions", admission.id, { ...(used ? {} : { status: "revoked", eventAccountKey: null }), benefitReview: true, benefitHoldEvidence: providerEventID });
    }
  }
  if (event) {
    if (counter(event[eventField]) < releasedCapacity) throw new Error("Release capacity counters are inconsistent");
    await req.payload.db.updateOne({ collection: "commerce-events" as never, id: event.id, data: { [eventField]: { $inc: -releasedCapacity } }, req });
  }
  // Return stock disposition is deliberately separate: releasing the allowance
  // never makes a physical item saleable again.
  return updateCommerce(req, "commerce-reservations", reservation.id, { state: "released", releaseReason: verifiedReason, providerEventID });
}
