import type { PayloadRequest } from "payload";
import { loadWalletConfig, predictMemberSafe } from "../../member-auth/wallet/safe";
import { withCommerceWrite } from "../access";
import { MAX_ORDER_UNITS } from "../contracts";
import { lockCommerce, readCommerce, relationshipID, requirePaymentTransaction, updateCommerce, type CommerceDocument } from "../_shared/transaction";
import { keyGrantOperationKey, parseKeyGrantTarget, type KeyGrantTarget } from "./contracts";
import { recordKeyGrantIntents } from "./intents";
import { readMemberWalletBinding, lockMemberWallet, recordMemberWallet } from "./member-wallet";
import { guestTicketTarget, resolveEventTicketTarget, sameTicketTarget } from "../event-tickets";
import { purchaseSnapshotSchema } from "../purchase-snapshot";

const intents = "commerce-key-grant-intents";
type Environment = Readonly<Record<string, string | undefined>>;
type Binding = Readonly<{ member: string; chainID: number; recipient: string }>;
type Unbound = "disabled" | "wallet-missing" | "conflict";
type AttachmentResult = "attached" | "already-attached" | "held" | Unbound;

export function walletGrantConfiguration(env: Environment) {
  const lock = env.MEMBER_WALLET_LOCK_ADDRESS;
  if (lock === undefined) return null;
  const wallet = loadWalletConfig(env);
  if (!wallet) return null;
  if (!/^0x[0-9a-fA-F]{40}$/.test(lock) || BigInt(lock) <= 1n) throw new Error("Invalid member wallet grant lock");
  return { wallet, lock: lock.toLowerCase() };
}

async function resolveBinding(req: PayloadRequest, member: string, env: Environment): Promise<Binding | Unbound> {
  const config = loadWalletConfig(env);
  if (!config) return "disabled";
  const safe = await predictMemberSafe(config, member);
  const wallet = await readMemberWalletBinding(req, member);
  if (!wallet) return "wallet-missing";
  const exact = Object.entries(safe).every(([field, value]) => Reflect.get(wallet, field) === value);
  if (!exact || wallet.status !== "active" || relationOfWallet(wallet.member) !== member ||
    wallet.activeSlot !== member || wallet.walletKey !== `${safe.chainID}:${safe.safeAddress}`) return "conflict";
  return { member, chainID: safe.chainID, recipient: safe.safeAddress };
}

const relationOfWallet = (value: unknown) => value == null ? null : relationshipID(value);

class WalletEntitlementMismatch extends Error {}

function validateIntent(intent: CommerceDocument, previous: CommerceDocument, binding: Binding, admission: CommerceDocument, payment: CommerceDocument) {
  const order = relationshipID(previous.order);
  if (intent.id !== previous.id || relationshipID(intent.order) !== order ||
    relationshipID(intent.entitlement) !== admission.id || relationshipID(intent.payment) !== payment.id ||
    relationshipID(intent.beneficiaryUser) !== binding.member || intent.recipientMode !== "member_safe" ||
    relationshipID(admission.order) !== order || relationshipID(admission.transaction) !== payment.id ||
    relationshipID(admission.buyer) !== binding.member || relationshipID(payment.order) !== order ||
    relationshipID(payment.customer) !== binding.member ||
    intent.operationKey !== previous.operationKey || typeof admission.unit !== "number" ||
    intent.operationKey !== keyGrantOperationKey(order, admission.unit)) throw new WalletEntitlementMismatch("Wallet attachment entitlement identity mismatch");
}

function attachmentDecision(intent: CommerceDocument, admission: CommerceDocument, payment: CommerceDocument, target: KeyGrantTarget) {
  if (intent.cancelRequested === true || admission.status === "revoked" || admission.benefitReview === true ||
    admission.returnAcceptedAt != null || payment.status !== "succeeded" ||
    payment.commerceReviewHold === true || payment.commerceResolutionConflict === true) return "held";
  if (intent.target != null) {
    if (!["pending", "submitted", "granted", "failed_retryable", "ambiguous"].includes(String(intent.state))) return "conflict";
    const stored = parseKeyGrantTarget(intent.target);
    return stored.chainID === target.chainID && stored.lock === target.lock && stored.recipient === target.recipient && stored.ticketTier === target.ticketTier
      ? "already-attached" : "conflict";
  }
  if (intent.state !== "awaiting_wallet" || intent.attempts !== 0 ||
    ["attemptID", "dispatchStartedAt", "signer", "nonce", "txHash", "sentAt", "lastSentAt", "submittedAt",
      "settledTxHash", "tokenID", "grantedAt", "cancelledAt", "cancelAttemptID", "cancelStartedAt", "cancelSigner",
      "cancelNonce", "cancelTxHash", "cancelSubmittedAt", "cancelLastSentAt"]
      .some((field) => intent[field] != null) ||
    [intent.sends, intent.cancelSends].some((value) => value != null && (!Array.isArray(value) || value.length !== 0))) return "conflict";
  return "attach";
}

/** Caller already holds order-benefits -> admission -> member-wallet. */
async function attachLocked(req: PayloadRequest, previous: CommerceDocument, binding: Binding, env: Environment): Promise<AttachmentResult> {
  await lockCommerce(req, [`key-grant:${String(previous.operationKey)}`]);
  const intent = await readCommerce(req, intents, previous.id);
  const admission = await readCommerce(req, "commerce-admissions", relationshipID(previous.entitlement));
  const payment = await readCommerce(req, "transactions", relationshipID(previous.payment));
  validateIntent(intent, previous, binding, admission, payment);
  let lock: string;
  if (admission.ticketTier === "guest" || admission.ticketTier === "member") {
    const pinned = guestTicketTarget.safeParse(admission.ticketTarget);
    if (!pinned.success || pinned.data.chainID !== binding.chainID) return "conflict";
    const order = await readCommerce(req, "orders", relationshipID(admission.order));
    const snapshot = purchaseSnapshotSchema.safeParse(order.commerceSnapshot);
    if (!snapshot.success || snapshot.data.eventID !== relationshipID(admission.event) ||
      snapshot.data.customerID !== binding.member ||
      (admission.ticketTier === "guest"
        ? snapshot.data.version !== 3 || !sameTicketTarget(snapshot.data.ticketTarget, pinned.data)
        : snapshot.data.version !== 2 || !snapshot.data.editionEntitlements.freeLaunchTicket)) return "conflict";
    const event = await readCommerce(req, "commerce-events", relationshipID(admission.event));
    try {
      if (!sameTicketTarget(resolveEventTicketTarget(event, admission.ticketTier, snapshot.data.productID), pinned.data)) return "conflict";
    } catch { return "conflict"; }
    lock = pinned.data.lock;
  } else {
    if (admission.ticketTier != null || admission.ticketTarget != null) return "conflict";
    const config = walletGrantConfiguration(env);
    if (!config) return "disabled";
    lock = config.lock;
  }
  const target = parseKeyGrantTarget({ chainID: binding.chainID, lock, recipient: binding.recipient,
    ...(admission.ticketTier === "guest" ? { ticketTier: "guest" } : {}) });
  const decision = attachmentDecision(intent, admission, payment, target);
  if (decision !== "attach") return decision;
  await withCommerceWrite(req, () => updateCommerce(req, intents, intent.id, { state: "pending", target }));
  return "attached";
}

/** One known, owed intent; never scans, provisions another wallet, or reads a provider. */
export async function attachBoundMemberWalletGrant(req: PayloadRequest, id: string, env: Environment = process.env): Promise<AttachmentResult> {
  await requirePaymentTransaction(req);
  const previous = await readCommerce(req, intents, id);
  const order = relationshipID(previous.order);
  const member = relationshipID(previous.beneficiaryUser);
  await lockCommerce(req, [`order-benefits:${order}`]);
  await lockCommerce(req, [`admission:${relationshipID(previous.entitlement)}`]);
  await lockMemberWallet(req, member);
  const binding = await resolveBinding(req, member, env);
  return typeof binding === "string" ? binding : attachLocked(req, previous, binding, env);
}

/** Every order and admission lock on the page precedes every wallet and intent lock. */
export async function attachWalletCatchUpPage(
  req: PayloadRequest, page: readonly CommerceDocument[], env: Environment, deadline: () => void,
) {
  await requirePaymentTransaction(req);
  for (const [prefix, field] of [["order-benefits", "order"], ["admission", "entitlement"], ["member-wallet", "beneficiaryUser"]] as const) {
    // lockCommerce sorts each batch; check between locks, not only after a batch.
    const keys = [...new Set(page.map((row) => `${prefix}:${relationshipID(row[field])}`))].sort();
    for (const key of keys) {
      deadline();
      await lockCommerce(req, [key]);
    }
  }
  const outcomes: AttachmentResult[] = [];
  for (const row of page) {
    deadline();
    const binding = await resolveBinding(req, relationshipID(row.beneficiaryUser), env);
    if (typeof binding === "string") {
      outcomes.push(binding);
      continue;
    }
    try { outcomes.push(await attachLocked(req, row, binding, env)); }
    catch (error) {
      if (!(error instanceof WalletEntitlementMismatch)) throw error;
      outcomes.push("conflict");
    }
  }
  deadline();
  return outcomes;
}

type Settlement = Parameters<typeof recordKeyGrantIntents>[0];

/** Same owned payment request; only admission rows created or validated by this settlement. */
export async function recordSettlementWalletGrants(input: Settlement, env: Environment = process.env) {
  const { req, beneficiaryID, admissions } = input;
  await requirePaymentTransaction(req);
  if (admissions.length < 1 || admissions.length > MAX_ORDER_UNITS ||
    new Set(admissions.map(({ id }) => id)).size !== admissions.length) throw new Error("Invalid settlement wallet work size");
  await lockCommerce(req, admissions.map(({ id }) => `admission:${id}`));
  const wallet = await recordMemberWallet(req, beneficiaryID, env);
  const binding = wallet === "disabled" || wallet === "config-drift" ? "disabled" : await resolveBinding(req, beneficiaryID, env);
  if (binding === "conflict" || binding === "wallet-missing") throw new Error("Settlement wallet binding is inconsistent");
  const recorded = await recordKeyGrantIntents(input);
  if (typeof binding !== "string") {
    for (const intent of recorded) {
      const result = await attachLocked(req, intent, binding, env);
      if (result === "conflict") throw new Error("Settlement wallet target conflicts with its intent");
    }
  }
}
