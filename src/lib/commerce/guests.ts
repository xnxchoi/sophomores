import { createHash, randomBytes } from "node:crypto";
import type { PayloadRequest } from "payload";
import { isCmsSuperAdmin } from "@/lib/auth/access";
import { isPayloadActiveMember } from "@/lib/member-auth/payload-runtime";
import { commerceSnapshotSchema } from "./contracts";
import { commerceSnapshotHash } from "./snapshot-hash";
import { lockAdmissionBenefits } from "./_shared/benefits";
import { createCommerce, findCommerce, lockCommerce, readCommerce, relationshipID, updateCommerce, type CommerceDocument } from "./_shared/transaction";

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex");
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
  const snapshot = commerceSnapshotSchema.parse(order.commerceSnapshot);
  const reservation = await findCommerce(req, "commerce-reservations", "attemptID", String(order.commerceAttemptID));
  if (!reservation || reservation.state !== "settled" || relationshipID(reservation.order) !== orderID || reservation.snapshotHash !== commerceSnapshotHash(snapshot) || reservation.quantity !== snapshot.quantity || relationshipID(reservation.customer) !== snapshot.customerID) throw new Error("Order is not backed by its settled immutable reservation");
  if (!Array.isArray(order.transactions) || !order.transactions.some((value) => relationshipID(value) === transactionID)) throw new Error("Order transaction does not match");
  const transaction = await readCommerce(req, "transactions", transactionID);
  if (transaction.status !== "succeeded" || relationshipID(transaction.order) !== orderID || relationshipID(transaction.customer) !== snapshot.customerID || transaction.amount !== snapshot.totalAmount || transaction.currency !== snapshot.currency) throw new Error("Admission requires a succeeded matching transaction");
  const result: CommerceDocument[] = [];
  for (let unit = 1; unit <= snapshot.quantity; unit++) {
    const orderUnitKey = `${orderID}:${unit}`;
    const previous = await findCommerce(req, "commerce-admissions", "orderUnitKey", orderUnitKey);
    if (previous) {
      if (relationshipID(previous.transaction) !== transactionID || relationshipID(previous.event) !== snapshot.eventID || relationshipID(previous.buyer) !== snapshot.customerID) throw new Error("Admission grant identity mismatch");
      result.push(previous);
    } else result.push(await createCommerce(req, "commerce-admissions", { orderUnitKey, order: orderID, transaction: transactionID, event: snapshot.eventID, buyer: snapshot.customerID, unit, status: "available" }));
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

export async function buyerAdmissions({ req, orderID }: { req: PayloadRequest; orderID: string }): Promise<{ admissionID: string; unit: number; name: string; status: string; reviewRequired: boolean; claimed: boolean }[]> {
  const customerID = accountID(req);
  const order = await readCommerce(req, "orders", orderID);
  const snapshot = commerceSnapshotSchema.parse(order.commerceSnapshot);
  if (order.commerceVersion !== "commerce-v1" || snapshot.customerID !== customerID) throw new Error("Order admissions unavailable");
  const result = await req.payload.find({ collection: "commerce-admissions" as never, where: { and: [{ order: { equals: orderID } }, { buyer: { equals: customerID } }] }, limit: 3, depth: 0, overrideAccess: true, req });
  return (result.docs as unknown as CommerceDocument[]).map((admission) => ({ admissionID: admission.id, unit: Number(admission.unit), name: String(admission.guestName ?? ""), status: String(admission.status), reviewRequired: admission.benefitReview === true, claimed: !!admission.claimedAccount }));
}

export async function issueGuestClaim({ req, admissionID }: { req: PayloadRequest; admissionID: string }): Promise<{ token: string; expiresAt: string }> {
  const buyerID = accountID(req);
  const admission = await lockAdmissionBenefits(req, admissionID);
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
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("Invalid guest claim");
  const claim = await findCommerce(req, "commerce-claims", "tokenDigest", digest(token));
  if (!claim) throw new Error("Invalid guest claim");
  const admissionID = relationshipID(claim.admission);
  const admission = await lockAdmissionBenefits(req, admissionID);
  const currentClaim = await readCommerce(req, "commerce-claims", claim.id);
  const expiresAt = new Date(String(currentClaim.expiresAt)).getTime();
  if (currentClaim.tokenDigest !== digest(token) || currentClaim.consumedAt || currentClaim.revokedAt || !Number.isFinite(expiresAt) || Date.now() >= expiresAt || !["available", "checked-in"].includes(String(admission.status)) || admission.claimedAccount) throw new Error("Invalid or consumed guest claim");
  const customer = await readCommerce(req, "users", customerID);
  if (customer.emailVerified !== true || customer.banned === true || !await activeMember(customerID)) throw new Error("Individually verified email and authoritative phone binding are required");
  const eventID = relationshipID(admission.event);
  const event = await readCommerce(req, "commerce-events", eventID);
  const cutoff = new Date(String(event.claimCutoffAt)).getTime();
  if (!Number.isFinite(cutoff) || Date.now() >= cutoff) throw new Error("Guest claim cutoff has passed");
  const eventAccountKey = digest(JSON.stringify([eventID, customerID]));
  await lockCommerce(req, [`event-account:${eventAccountKey}`]);
  if (await findCommerce(req, "commerce-admissions", "eventAccountKey", eventAccountKey)) throw new Error("This account already has an admission for this event");
  await updateCommerce(req, "commerce-admissions", admissionID, { claimedAccount: customerID, eventAccountKey, status: admission.status === "checked-in" ? "checked-in" : "claimed" });
  await updateCommerce(req, "commerce-claims", claim.id, { consumedAt: new Date().toISOString() });
  return { admissionID };
}

export async function checkInGuest({ req, admissionID }: { req: PayloadRequest; admissionID: string }): Promise<void> {
  operatorID(req);
  const admission = await lockAdmissionBenefits(req, admissionID);
  if (admission.status === "checked-in") return;
  if (!["available", "claimed"].includes(String(admission.status)) || !admission.guestName) throw new Error("Check-in requires this guest's named paid admission");
  await updateCommerce(req, "commerce-admissions", admissionID, { status: "checked-in", checkedInAt: new Date().toISOString() });
}

export async function redeemGuestBenefit({ req, admissionID, kind, actionID }: { req: PayloadRequest; admissionID: string; kind: "part-i-drink" | "shared-transfer"; actionID: string }): Promise<{ ordinal: number }> {
  const operator = operatorID(req);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(actionID) || !["part-i-drink", "shared-transfer"].includes(kind)) throw new Error("A valid idempotent benefit action is required");
  const admission = await lockAdmissionBenefits(req, admissionID);
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
  await readCommerce(req, "commerce-events", eventID);
  const admissions = await req.payload.find({ collection: "commerce-admissions" as never, where: { and: [{ event: { equals: eventID } }, { status: { in: ["available", "claimed", "checked-in"] } }] }, limit: 100, page, sort: "id", depth: 0, overrideAccess: true, req });
  const result = [];
  for (const record of admissions.docs as unknown as CommerceDocument[]) {
    const transfer = await req.payload.find({ collection: "commerce-redemptions" as never, where: { and: [{ admission: { equals: record.id } }, { kind: { equals: "shared-transfer" } }] }, limit: 1, depth: 0, overrideAccess: true, req });
    result.push({ admissionID: record.id, name: String(record.guestName ?? ""), checkedIn: record.status === "checked-in", transferRedeemed: transfer.totalDocs > 0, reviewRequired: record.benefitReview === true, registered: !!record.claimedAccount, transferEligible: record.status === "checked-in" && !!record.claimedAccount && record.benefitReview !== true && !record.returnAcceptedAt });
  }
  return { docs: result, page, totalDocs: admissions.totalDocs, hasNextPage: admissions.hasNextPage };
}
