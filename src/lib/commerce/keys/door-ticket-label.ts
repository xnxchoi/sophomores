import { createHmac } from "node:crypto";
import type { Endpoint, PayloadRequest } from "payload";
import { z } from "zod";
import { isCmsStaff } from "@/lib/auth/access";
import { isReviewCopyRequest, staffAuthOrigin } from "@/lib/auth/review-editor-policy";
import { assertCommerceBrowserAuthority } from "../access";
import { optionalRelationshipID, purchaseSnapshotSchema } from "../purchase-snapshot";
import { readCommerce, relationshipID } from "../_shared/transaction";
import { matchesFrozenEventTicket, sameTicketTarget, sharedEventTicketsEnabled, sharedTicketConfiguration } from "../event-tickets";
import { isTxHash, keyGrantOperationKey, memberEventGrantOperationKey, MEMBER_EVENT_GRANT, parseKeyGrantTarget, ticketTokenIdentity } from "./contracts";

const lookup = z.strictObject({
  eventID: z.uuid(),
  lock: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  tokenID: z.string().regex(/^[1-9][0-9]{0,77}$/),
});

async function readLabel(req: PayloadRequest, { eventID, lock, tokenID }: z.infer<typeof lookup>) {
  const event = await readCommerce(req, "commerce-events", eventID);
  const config = sharedTicketConfiguration.safeParse(event.unlockTicketConfiguration);
  const requestedLock = lock.toLowerCase();
  if (event.checkInAuthority !== "unlock-events" || !config.success ||
    (requestedLock !== config.data.eventLock && requestedLock !== config.data.guestLock)) return null;
  const chainID = config.data.chainID;
  const expected = { chainID, lock: requestedLock, mode: "shared" } as const;
  if (!sharedEventTicketsEnabled(eventID, expected)) return null;
  const ticketTokenKey = ticketTokenIdentity(chainID, requestedLock, tokenID);
  if (!ticketTokenKey) return null;
  const found = await req.payload.find({
    collection: "commerce-key-grant-intents", where: { ticketTokenKey: { equals: ticketTokenKey } },
    limit: 2, depth: 0, overrideAccess: true, req,
  });
  const [intent] = found.docs;
  if (found.totalDocs !== 1 || found.docs.length !== 1 || !intent || intent.tokenID !== tokenID ||
    intent.state !== "granted" || intent.cancelRequested || intent.recipientMode !== "member_safe" ||
    !isTxHash(intent.settledTxHash) || !Number.isFinite(Date.parse(intent.grantedAt ?? ""))) return null;
  const target = parseKeyGrantTarget(intent.target);
  const tier = target.ticketTier;
  if (target.ticketMode !== "shared" || (tier !== "member" && tier !== "guest") ||
    ticketTokenIdentity(target.chainID, target.lock, tokenID) !== ticketTokenKey) return null;
  const admission = await readCommerce(req, "commerce-admissions", relationshipID(intent.entitlement));
  const sponsor = relationshipID(admission.buyer);
  const orderID = relationshipID(admission.order);
  const paymentID = relationshipID(admission.transaction);
  if (relationshipID(admission.event) !== eventID || admission.ticketTier !== tier ||
    !sameTicketTarget(admission.ticketTarget, expected) || admission.status !== "available" ||
    admission.benefitReview || admission.returnAcceptedAt || admission.claimedAccount != null ||
    relationshipID(intent.beneficiaryUser) !== sponsor || relationshipID(intent.order) !== orderID ||
    relationshipID(intent.payment) !== paymentID || typeof admission.unit !== "number" ||
    (tier === "member" ? intent.purpose !== MEMBER_EVENT_GRANT || intent.operationKey !== memberEventGrantOperationKey(orderID, admission.unit)
      : (intent.purpose ?? "primary") !== "primary" || intent.operationKey !== keyGrantOperationKey(orderID, admission.unit))) return null;

  const order = await readCommerce(req, "orders", orderID);
  const payment = await readCommerce(req, "transactions", paymentID);
  const snapshot = purchaseSnapshotSchema.safeParse(order.commerceSnapshot);
  if (order.commerceVersion !== "commerce-v1" || (order.status !== "processing" && order.status !== "completed") ||
    relationshipID(order.customer) !== sponsor || payment.status !== "succeeded" || optionalRelationshipID(payment.order) !== orderID ||
    relationshipID(payment.customer) !== sponsor || payment.commerceReviewHold || payment.commerceResolutionConflict ||
    !snapshot.success || snapshot.data.customerID !== sponsor || snapshot.data.eventID !== eventID ||
    !matchesFrozenEventTicket(event, tier, snapshot.data.productID, expected) ||
    admission.unit > snapshot.data.quantity ||
    (tier === "guest" ? snapshot.data.version !== 3 || !sameTicketTarget(snapshot.data.ticketTarget, expected)
      : snapshot.data.version !== 2 || !sameTicketTarget(snapshot.data.memberTicketTarget, expected))) return null;

  const sponsorRef = createHmac("sha256", req.payload.secret)
    .update(JSON.stringify(["event-door-sponsor-v1", eventID, sponsor])).digest("hex").slice(0, 24);
  return { tier, sponsorRef };
}

const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff", Vary: "Cookie, Authorization" };
const staffRates = new Map<string, { count: number; expires: number }>();
const unavailable = () => Response.json({ tier: null }, { status: 404, headers });

/** Read-only label. It is never proof of live key validity or authority to admit. */
export const doorTicketLabelEndpoint: Endpoint = {
  path: "/commerce/events/:eventID/ticket-label/:lock/:tokenID",
  method: "get",
  handler: async (req) => {
    if (!isCmsStaff(req.user) || !req.user?.id || !req.url) return unavailable();
    const parsed = lookup.safeParse(req.routeParams);
    if (!parsed.success || process.env.UNLOCK_SHARED_TICKET_EVENT_ID !== parsed.data.eventID) return unavailable();
    try {
      const request = new Request(req.url, { headers: req.headers });
      if (isReviewCopyRequest(request)) return unavailable();
      assertCommerceBrowserAuthority(req, staffAuthOrigin(), "read");
      const now = Date.now();
      for (const [id, rate] of staffRates) if (rate.expires <= now) staffRates.delete(id);
      const id = String(req.user.id);
      const rate = staffRates.get(id);
      if (rate ? rate.count >= 60 : staffRates.size >= 1024) return Response.json({ tier: null }, { status: 429, headers });
      staffRates.set(id, { count: (rate?.count ?? 0) + 1, expires: rate?.expires ?? now + 60_000 });
      const label = await readLabel(req, parsed.data);
      return label ? Response.json(label, { headers }) : unavailable();
    } catch {
      return unavailable();
    }
  },
};
