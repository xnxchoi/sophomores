import type { PayloadRequest } from "payload";
import { loadWalletConfig, predictMemberSafe } from "../../member-auth/wallet/safe";
import { withCommerceWrite } from "../access";
import { MAX_ORDER_UNITS } from "../contracts";
import { lockCommerce, readCommerce, relationshipID, requirePaymentTransaction, updateCommerce, type CommerceDocument } from "../_shared/transaction";
import { keyGrantOperationKey, parseKeyGrantTarget, type KeyGrantTarget } from "./contracts";
import { recordKeyGrantIntents } from "./intents";
import { readMemberWalletBinding, lockMemberWallet, recordMemberWallet } from "./member-wallet";

const intents = "commerce-key-grant-intents";
type Environment = Readonly<Record<string, string | undefined>>;
type Binding = Readonly<{ member: string; target: KeyGrantTarget }>;
type Unbound = "disabled" | "wallet-missing" | "conflict";
type AttachmentResult = "attached" | "already-attached" | "held" | Unbound;

async function resolveBinding(req: PayloadRequest, member: string, env: Environment): Promise<Binding | Unbound> {
  const lock = env.MEMBER_WALLET_LOCK_ADDRESS;
  if (lock === undefined) return "disabled";
  const config = loadWalletConfig(env);
  if (!config) return "disabled";
  if (!/^0x[0-9a-fA-F]{40}$/.test(lock) || BigInt(lock) <= 1n) throw new Error("Invalid member wallet grant lock");
  const safe = await predictMemberSafe(config, member);
  const wallet = await readMemberWalletBinding(req, member);
  if (!wallet) return "wallet-missing";
  const exact = Object.entries(safe).every(([field, value]) => Reflect.get(wallet, field) === value);
  if (!exact || wallet.status !== "active" || relationOfWallet(wallet.member) !== member ||
    wallet.activeSlot !== member || wallet.walletKey !== `${safe.chainID}:${safe.safeAddress}`) return "conflict";
  return { member, target: parseKeyGrantTarget({ chainID: safe.chainID, lock: lock.toLowerCase(), recipient: safe.safeAddress }) };
}

const relationOfWallet = (value: unknown) => value == null ? null : relationshipID(value);

function validateIntent(intent: CommerceDocument, previous: CommerceDocument, binding: Binding, admission: CommerceDocument, payment: CommerceDocument) {
  const order = relationshipID(previous.order);
  if (intent.id !== previous.id || relationshipID(intent.order) !== order ||
    relationshipID(intent.entitlement) !== admission.id || relationshipID(intent.payment) !== payment.id ||
    relationshipID(intent.beneficiaryUser) !== binding.member || intent.recipientMode !== "member_safe" ||
    relationshipID(admission.order) !== order || relationshipID(admission.transaction) !== payment.id ||
    relationshipID(admission.buyer) !== binding.member || relationshipID(payment.order) !== order ||
    relationshipID(payment.customer) !== binding.member ||
    intent.operationKey !== previous.operationKey || typeof admission.unit !== "number" ||
    intent.operationKey !== keyGrantOperationKey(order, admission.unit)) throw new Error("Wallet attachment entitlement identity mismatch");
}

function attachmentDecision(intent: CommerceDocument, admission: CommerceDocument, payment: CommerceDocument, target: KeyGrantTarget) {
  if (intent.cancelRequested === true || admission.status === "revoked" || admission.benefitReview === true ||
    admission.returnAcceptedAt != null || payment.status !== "succeeded" ||
    payment.commerceReviewHold === true || payment.commerceResolutionConflict === true) return "held";
  if (intent.target != null) {
    if (!["pending", "submitted", "granted", "failed_retryable", "ambiguous"].includes(String(intent.state))) return "conflict";
    const stored = parseKeyGrantTarget(intent.target);
    return stored.chainID === target.chainID && stored.lock === target.lock && stored.recipient === target.recipient
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
async function attachLocked(req: PayloadRequest, previous: CommerceDocument, binding: Binding): Promise<AttachmentResult> {
  await lockCommerce(req, [`key-grant:${String(previous.operationKey)}`]);
  const intent = await readCommerce(req, intents, previous.id);
  const admission = await readCommerce(req, "commerce-admissions", relationshipID(previous.entitlement));
  const payment = await readCommerce(req, "transactions", relationshipID(previous.payment));
  validateIntent(intent, previous, binding, admission, payment);
  const decision = attachmentDecision(intent, admission, payment, binding.target);
  if (decision !== "attach") return decision;
  await withCommerceWrite(req, () => updateCommerce(req, intents, intent.id, { state: "pending", target: binding.target }));
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
  return typeof binding === "string" ? binding : attachLocked(req, previous, binding);
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
      const result = await attachLocked(req, intent, binding);
      if (result === "conflict") throw new Error("Settlement wallet target conflicts with its intent");
    }
  }
}
