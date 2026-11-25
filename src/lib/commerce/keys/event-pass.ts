import type { PayloadRequest } from "payload";
import { readCommerce, relationshipID, type CommerceDocument } from "../_shared/transaction";
import { guestTicketTarget, matchesFrozenEventTicket, sameTicketTarget, sharedTicketMode, sharedEventTicketsEnabled } from "../event-tickets";
import { purchaseSnapshotSchema } from "../purchase-snapshot";
import { isTxHash, keyGrantOperationKey, keyGrantStates, memberEventGrantOperationKey, MEMBER_EVENT_GRANT, parseKeyGrantTarget, ticketTokenIdentity } from "./contracts";
import { loadWalletConfig, predictMemberSafe } from "../../member-auth/wallet/safe";
import type { PassKey } from "./unlock/pass-holder";
import type { PassEvent } from "./google-wallet-pass";

/** Not yet granted and not cancelled: the existing key_pending ticket state (keyStatusOf). */
const issuing = new Set<string>(keyGrantStates.filter(state => state !== "granted" && state !== "cancelled"));
type PassMode = "own" | "hosted";
type PassSources = { kind: "ready"; mode: PassMode; applePassURL: string | null; androidPassURL: string | null; key: PassKey; event: PassEvent | null };

/**
 * Google Wallet has its own switch, off by default for both tiers (Cordy, 25 Nov): Unlock builds the Google object ID
 * as <issuer>.<class>.<keyId>, with no lock or network, so it collides across locks (locksmith createPassObject.ts).
 */
const googleWalletEnabled = () => process.env.UNLOCK_GOOGLE_WALLET_PASSES_ENABLED === "1";

/**
 * Our own passes (owner GO, 26 Nov) take over from Unlock-hosted ones; both are off by default. Own passes still read
 * Unlock's signed QR from the hosted Android route (unlock/hosted-barcode.ts), so UNLOCK_PASS_ORIGIN stays required.
 * The own Apple pass is the next slice: until it lands, own mode offers Google only.
 */
const passMode = (): PassMode | null =>
  process.env.OWN_WALLET_PASSES_ENABLED === "1" ? "own" : process.env.UNLOCK_HOSTED_PASSES_ENABLED === "1" ? "hosted" : null;

/** What the own pass shows of the event: its name and Part I times, nothing else. */
function passEventOf(event: CommerceDocument): PassEvent | null {
  const name = typeof event.name === "string" ? event.name.trim() : "";
  const startsAt = Date.parse(String(event.partIStartsAt ?? ""));
  const endsAt = Date.parse(String(event.partIEndsAt ?? ""));
  if (!name || name.length > 200 || !Number.isFinite(startsAt)) return null;
  return { id: String(event.id), name, startsAt: new Date(startsAt).toISOString(),
    endsAt: Number.isFinite(endsAt) && endsAt > startsAt ? new Date(endsAt).toISOString() : null };
}

/**
 * Called only after the order and admission have been scoped to the verified buyer. No provider requests.
 * "pending" only once the same ownership chain holds up to the payment; any other refusal is null, whatever its cause.
 */
async function resolveEventPassSources(req: PayloadRequest, admission: CommerceDocument, order: CommerceDocument, buyer: string): Promise<PassSources | "pending" | null> {
  if (req.user?.collection !== "users" || String(req.user.id) !== buyer) return null;
  const host = process.env.UNLOCK_PASS_ORIGIN;
  const mode = passMode();
  if (!host || !mode || admission.benefitReview ||
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
  if (!matchesFrozenEventTicket(event, tier, snapshot.data.productID, pinned.data)) return null;
  const passEvent = passEventOf(event);
  if (mode === "own" && !passEvent) return null;
  const { docs, totalDocs } = await req.payload.find({ collection: "commerce-key-grant-intents", req,
    where: { and: [{ entitlement: { equals: admission.id } }, ...(memberEvent ? [{ purpose: { equals: MEMBER_EVENT_GRANT } }] : [])] }, limit: 2, depth: 0, overrideAccess: true });
  const [intent] = docs;
  if (totalDocs !== 1 || docs.length !== 1 || !intent || intent.cancelRequested ||
    (intent.state !== "granted" && !issuing.has(String(intent.state))) ||
    relationshipID(intent.entitlement) !== admission.id || typeof admission.unit !== "number" ||
    intent.operationKey !== (memberEvent ? memberEventGrantOperationKey(order.id, admission.unit) : keyGrantOperationKey(order.id, admission.unit)) ||
    intent.recipientMode !== "member_safe" || relationshipID(intent.beneficiaryUser) !== buyer ||
    relationshipID(intent.order) !== order.id || relationshipID(intent.payment) !== relationshipID(admission.transaction)) return null;
  const payment = await readCommerce(req, "transactions", relationshipID(intent.payment));
  if (payment.status !== "succeeded" || payment.commerceReviewHold || payment.commerceResolutionConflict ||
    relationshipID(payment.customer) !== buyer || relationshipID(payment.order) !== order.id) return null;
  if (intent.state !== "granted") return "pending";
  if (!isTxHash(intent.settledTxHash) || !Number.isFinite(Date.parse(intent.grantedAt ?? "")) ||
    !intent.tokenID || !/^(0|[1-9][0-9]{0,77})$/.test(intent.tokenID) ||
    BigInt(intent.tokenID) >= 1n << 256n) return null;
  let recipient: string;
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
    recipient = safe.safeAddress;
  } catch { return null; }
  const route = `/v2/pass/137/${pinned.data.lock}/${intent.tokenID}`;
  return {
    kind: "ready",
    mode,
    event: passEvent,
    applePassURL: mode === "hosted" ? new URL(route + "/ios", origin).href : null,
    // Hosted Google Wallet: shared Guest tickets, and member tickets (owner ruling, 25 Nov: "and add the wallet pass now",
    // option (a)), only behind its own switch. Own mode reads this route for Unlock's QR only, for every tier: our object
    // IDs include the lock, so the hosted route's cross-lock collision doesn't apply.
    androidPassURL: mode === "own" || (googleWalletEnabled() && ((shared && tier === "guest") || tier === "member"))
      ? new URL(route + "/android", origin).href : null,
    // What the serve-time chain check must still find (pass-holder.ts): this key, valid, owned by the member's Safe.
    key: { lock: pinned.data.lock, tokenID: intent.tokenID, recipient },
  };
}

export type WalletPassState = "ready" | "pending" | "unavailable";

/** The card's Wallet pass: our own same-origin links when the key is issued; otherwise only its state, never a reason. */
export async function readEventPassLinks(req: PayloadRequest, admission: CommerceDocument, order: CommerceDocument, buyer: string):
  Promise<{ walletPass: WalletPassState; applePassURL: string | null; androidPassURL: string | null }> {
  const sources = await resolveEventPassSources(req, admission, order, buyer);
  if (!sources || sources === "pending") return { walletPass: sources ?? "unavailable", applePassURL: null, androidPassURL: null };
  const route = `/api/commerce/orders/${encodeURIComponent(order.id)}/admissions/${encodeURIComponent(admission.id)}/wallet-pass`;
  return { walletPass: "ready", applePassURL: sources.applePassURL ? route + "/ios" : null,
    androidPassURL: sources.androidPassURL ? route + "/android" : null };
}

export async function readOwnedEventPassSource(req: PayloadRequest, buyer: string, orderID: string, admissionID: string,
  platform: "ios" | "android"): Promise<{ url: string; key: PassKey; mode: PassMode; event: PassEvent | null } | null> {
  const order = await req.payload.findByID({ collection: "orders", id: orderID, overrideAccess: false,
    disableErrors: true, depth: 0, req });
  if (!order || order.id !== orderID || order.commerceVersion !== "commerce-v1" || relationshipID(order.customer) !== buyer) return null;
  const admission = await readCommerce(req, "commerce-admissions", admissionID);
  if (admission.id !== admissionID) return null;
  const sources = await resolveEventPassSources(req, admission, { ...order }, buyer);
  if (!sources || sources === "pending") return null;
  const url = platform === "ios" ? sources.applePassURL : sources.androidPassURL;
  return url ? { url, key: sources.key, mode: sources.mode, event: sources.event } : null;
}
