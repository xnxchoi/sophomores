import type { Payload, PayloadRequest } from "payload";
import { withCommerceWrite } from "../access";
import { inCommerceTransaction, lockCommerce, readCommerce, relationshipID, updateCommerce, type CommerceDocument } from "../_shared/transaction";
import { loadWalletConfig, walletLockKey, type WalletConfig } from "../../member-auth/wallet/config";
import { parseKeyGrantTarget, type KeyGrantTarget } from "./contracts";

/*
 * Wallet handoff for key-grant intents (ADR-0004, ADR-0005). An intent waits
 * `awaiting_wallet` until its member activates; then, under the member+chain
 * lock, it gets its write-once target and moves to `pending` for the worker.
 *
 * Lost wakeups: activation scans under the lock after its wallet row is
 * written; settlement takes the same lock before it records intents and then
 * attaches to an active wallet itself. Whichever transaction commits first,
 * the other sees its rows. Lock order is always wallet lock, then
 * `key-grant:<operationKey>`; neither path takes reservation or admission
 * locks after the wallet lock.
 *
 * Held intents (admission under review, revoked or returned; payment review
 * hold; cancellation requested) and cancelled intents are left untouched.
 * No path here retires a wallet or replaces a target (lost-passkey recovery is
 * not built).
 */

const PAGE = 25;
const MAX_ROWS = 500;

export type ActiveWallet = { memberID: string; chainID: number; safeAddress: string };

/** Why an awaiting intent may not take a target yet; null when it may. */
async function holdReason(req: PayloadRequest, intent: CommerceDocument): Promise<string | null> {
  if (intent.state !== "awaiting_wallet") return "state";
  if (intent.recipientMode !== "member_safe") return "mode";
  if (intent.target) return "targeted";
  if (intent.cancelRequested === true) return "cancel_requested";
  const admission = await readCommerce(req, "commerce-admissions", relationshipID(intent.entitlement));
  if (admission.status === "revoked" || admission.benefitReview === true || admission.returnAcceptedAt) return "admission_hold";
  const payment = await readCommerce(req, "transactions", relationshipID(intent.payment));
  if (payment.status !== "succeeded" || payment.commerceReviewHold === true) return "payment_hold";
  return null;
}

/** True when an intent is owed a key but is on hold (review, return, refund) rather than waiting on the member. */
export async function isHeldKeyGrant(req: PayloadRequest, intent: CommerceDocument): Promise<boolean> {
  if (intent.state === "cancelled" || intent.recipientMode !== "member_safe") return false;
  if (intent.cancelRequested === true) return true;
  const reason = await holdReason(req, { ...intent, state: "awaiting_wallet", target: null });
  return reason === "admission_hold" || reason === "payment_hold";
}

const targetFor = (wallet: ActiveWallet, config: WalletConfig): KeyGrantTarget =>
  parseKeyGrantTarget({ chainID: wallet.chainID, lock: config.lock, recipient: wallet.safeAddress });

/**
 * Attach every eligible awaiting intent of one member. The caller holds the
 * member+chain lock inside its transaction. Returns the IDs it moved.
 */
export async function attachMemberKeyGrants(req: PayloadRequest, wallet: ActiveWallet, config: WalletConfig): Promise<string[]> {
  if (wallet.chainID !== config.chainID) throw new Error("Wallet chain does not match the key-grant chain");
  const target = targetFor(wallet, config);
  const moved: string[] = [];
  const found = await req.payload.find({ collection: "commerce-key-grant-intents" as never, depth: 0, overrideAccess: true, req, limit: MAX_ROWS, sort: "createdAt",
    where: { and: [{ beneficiaryUser: { equals: wallet.memberID } }, { state: { equals: "awaiting_wallet" } }, { recipientMode: { equals: "member_safe" } }] } as never });
  for (const row of found.docs as unknown as CommerceDocument[]) {
    await lockCommerce(req, [`key-grant:${String(row.operationKey)}`]);
    // Decide from the record as it stands under its own lock.
    const intent = await readCommerce(req, "commerce-key-grant-intents", row.id);
    if (relationshipID(intent.beneficiaryUser) !== wallet.memberID || await holdReason(req, intent)) continue;
    await withCommerceWrite(req, () => updateCommerce(req, "commerce-key-grant-intents", intent.id, { target, state: "pending", nextAttemptAt: null }));
    moved.push(intent.id);
  }
  return moved;
}

/** The member's active wallet on a chain, read inside the caller's transaction. */
export async function findActiveWallet(req: PayloadRequest, memberID: string, chainID: number): Promise<ActiveWallet | null> {
  const found = await req.payload.find({ collection: "member-wallets" as never, depth: 0, overrideAccess: true, req, limit: 1,
    where: { activeSlot: { equals: `${memberID}:${chainID}` } } as never });
  const row = (found.docs as unknown as CommerceDocument[])[0];
  if (!row || row.status !== "active" || relationshipID(row.member) !== memberID || Number(row.chainID) !== chainID) return null;
  return { memberID, chainID, safeAddress: String(row.safeAddress) };
}

/**
 * Settlement side, called by recordKeyGrantIntents before any intent lock.
 * Takes the member+chain lock; the caller records its intents and then calls
 * the returned function, which attaches them when the member already has an
 * active wallet.
 */
export async function lockMemberWallet(req: PayloadRequest, memberID: string): Promise<() => Promise<string[]>> {
  // Unconfigured activation binds no wallet, so there is nothing to race with.
  // Invalid wallet configuration must never fail a payment: it reads as unconfigured.
  let config: WalletConfig | null = null;
  try { config = loadWalletConfig(); }
  catch { req.payload.logger.error({ msg: "Member wallet configuration is invalid; key-grant intents stay awaiting a wallet" }); }
  if (!config) return async () => [];
  await lockCommerce(req, [walletLockKey(memberID, config.chainID)]);
  return async () => {
    const wallet = await findActiveWallet(req, memberID, config.chainID);
    return wallet ? attachMemberKeyGrants(req, wallet, config) : [];
  };
}

/**
 * Bounded catch-up for intents that became eligible after activation (a hold
 * cleared). Each member is handled in its own short transaction under its
 * lock. Activation replay runs the single-member form; scheduling this pass
 * from the worker is a recorded follow-up.
 */
export async function catchUpKeyGrantTargets({ payload, config = loadWalletConfig(), limit = MAX_ROWS }: { payload: Payload; config?: WalletConfig | null; limit?: number }): Promise<number> {
  if (!config) return 0;
  const members = new Set<string>();
  for (let page = 1; members.size < limit; page++) {
    const found = await payload.find({ collection: "commerce-key-grant-intents" as never, depth: 0, overrideAccess: true, limit: PAGE, page, sort: "createdAt",
      where: { and: [{ state: { equals: "awaiting_wallet" } }, { recipientMode: { equals: "member_safe" } }] } as never });
    for (const row of found.docs as unknown as CommerceDocument[]) if (row.beneficiaryUser) members.add(relationshipID(row.beneficiaryUser));
    if (!found.hasNextPage) break;
  }
  let moved = 0;
  for (const memberID of members) {
    const req = { payload, context: {} } as unknown as PayloadRequest;
    moved += await inCommerceTransaction(req, async () => {
      await lockCommerce(req, [walletLockKey(memberID, config.chainID)]);
      const wallet = await findActiveWallet(req, memberID, config.chainID);
      return wallet ? (await attachMemberKeyGrants(req, wallet, config)).length : 0;
    });
  }
  return moved;
}
