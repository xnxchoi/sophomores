import type { PayloadRequest } from "payload";
import { readCommerce, relationshipID, type CommerceDocument } from "../_shared/transaction";
import { guestTicketTarget, resolveEventTicketTarget, sameTicketTarget, sharedTicketMode, sharedEventTicketsEnabled } from "../event-tickets";
import { purchaseSnapshotSchema } from "../purchase-snapshot";
import { isTxHash, keyGrantOperationKey, memberEventGrantOperationKey, MEMBER_EVENT_GRANT, parseKeyGrantTarget, ticketTokenIdentity } from "./contracts";
import { loadWalletConfig, predictMemberSafe } from "../../member-auth/wallet/safe";

/** Called only after the order and admission have been scoped to the verified buyer. No provider requests. */
export async function readEventApplePass(req: PayloadRequest, admission: CommerceDocument, order: CommerceDocument, buyer: string) {
  const host = process.env.UNLOCK_PASS_ORIGIN;
  if (!host || process.env.UNLOCK_HOSTED_PASSES_ENABLED !== "1" || admission.benefitReview ||
    relationshipID(admission.buyer) !== buyer || relationshipID(admission.order) !== order.id ||
    admission.returnAcceptedAt || !["available", "claimed", "checked-in"].includes(String(admission.status))) return null;
  let origin: URL;
  try {
    origin = new URL(host);
    if (origin.protocol !== "https:" || origin.origin !== host) return null;
  } catch { return null; }
  const tier = admission.ticketTier;
  const pinned = guestTicketTarget.safeParse(admission.ticketTarget);
  const snapshot = purchaseSnapshotSchema.safeParse(order.commerceSnapshot);
  if ((tier !== "guest" && tier !== "member") || !pinned.success || pinned.data.chainID !== 137 ||
    !snapshot.success || snapshot.data.customerID !== buyer || snapshot.data.eventID !== relationshipID(admission.event) ||
    (tier === "guest" ? snapshot.data.version !== 3 || !sameTicketTarget(snapshot.data.ticketTarget, pinned.data) : snapshot.data.version !== 2)) return null;
  const shared = sharedTicketMode(pinned.data);
  if (shared && (!sharedEventTicketsEnabled(relationshipID(admission.event), pinned.data) ||
    (tier === "member" && (snapshot.data.version !== 2 || !sameTicketTarget(snapshot.data.memberTicketTarget, pinned.data))))) return null;
  const memberEvent = shared && tier === "member";
  const event = await readCommerce(req, "commerce-events", relationshipID(admission.event));
  try {
    if (!sameTicketTarget(resolveEventTicketTarget(event, tier, snapshot.data.productID), pinned.data)) return null;
  } catch { return null; }
  const { docs, totalDocs } = await req.payload.find({ collection: "commerce-key-grant-intents", req,
    where: { and: [{ entitlement: { equals: admission.id } }, ...(memberEvent ? [{ purpose: { equals: MEMBER_EVENT_GRANT } }] : [])] }, limit: 2, depth: 0, overrideAccess: true });
  const [intent] = docs;
  if (totalDocs !== 1 || docs.length !== 1 || !intent || intent.state !== "granted" || intent.cancelRequested ||
    relationshipID(intent.entitlement) !== admission.id || typeof admission.unit !== "number" ||
    intent.operationKey !== (memberEvent ? memberEventGrantOperationKey(order.id, admission.unit) : keyGrantOperationKey(order.id, admission.unit)) ||
    intent.recipientMode !== "member_safe" || relationshipID(intent.beneficiaryUser) !== buyer ||
    relationshipID(intent.order) !== order.id || relationshipID(intent.payment) !== relationshipID(admission.transaction) ||
    !isTxHash(intent.settledTxHash) || !Number.isFinite(Date.parse(intent.grantedAt ?? "")) ||
    !intent.tokenID || !/^(0|[1-9][0-9]{0,77})$/.test(intent.tokenID) ||
    BigInt(intent.tokenID) >= 1n << 256n) return null;
  const payment = await readCommerce(req, "transactions", relationshipID(intent.payment));
  if (payment.status !== "succeeded" || payment.commerceReviewHold || payment.commerceResolutionConflict ||
    relationshipID(payment.customer) !== buyer || relationshipID(payment.order) !== order.id) return null;
  try {
    const target = parseKeyGrantTarget(intent.target);
    if (target.chainID !== 137 || target.lock !== pinned.data.lock || (target.ticketTier === "guest") !== (tier === "guest")) return null;
    if (shared && (target.ticketMode !== shared || target.ticketTier !== tier ||
      intent.ticketTokenKey !== ticketTokenIdentity(target.chainID, target.lock, intent.tokenID))) return null;
    const config = loadWalletConfig();
    if (!config || config.chainID !== 137) return null;
    const safe = await predictMemberSafe(config, buyer);
    const wallets = await req.payload.find({ collection: "member-wallets", req, overrideAccess: true, depth: 0, limit: 2,
      where: { activeSlot: { equals: buyer } } });
    const [wallet] = wallets.docs;
    if (wallets.totalDocs !== 1 || !wallet || wallet.status !== "active" || relationshipID(wallet.member) !== buyer ||
      target.recipient !== safe.safeAddress || wallet.walletKey !== `137:${safe.safeAddress}` ||
      !Object.entries(safe).every(([key, value]) => Reflect.get(wallet, key) === value)) return null;
  } catch { return null; }
  // Google's hosted pass identity has not been verified as lock-scoped.
  return new URL(`/v2/pass/137/${pinned.data.lock}/${intent.tokenID}/ios`, origin).href;
}
