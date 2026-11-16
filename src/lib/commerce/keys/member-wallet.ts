import type { Payload, PayloadRequest } from "payload";
import { withCommerceWrite } from "../access";
import {
  inCommerceTransaction,
  lockCommerce,
  readCommerce,
  relationshipID,
  updateCommerce,
  type CommerceDocument
} from "../_shared/transaction";
import { withWalletWrite } from "../../member-auth/wallet/access";
import {
  loadWalletConfig,
  walletLockKey,
  type WalletConfig
} from "../../member-auth/wallet/config";
import { predictMemberSafe } from "../../member-auth/wallet/safe";
import { parseKeyGrantTarget, type KeyGrantTarget } from "./contracts";

/*
 * Member wallets and the key-grant handoff (ADR-0004, ADR-0013). When a
 * membership payment settles, the member gets their one active wallet, a Safe
 * owned by the custody key we hold, with its address computed offline (no
 * network call in the settle transaction). Each eligible awaiting intent then
 * gets its write-once target and moves to `pending` for the worker.
 *
 * Everything happens under the member+chain lock `member-wallet:<member>:<chain>`,
 * taken before any `key-grant:<operationKey>` lock; no path takes reservation
 * or admission locks after it. Settlement takes it before recording intents.
 *
 * Held intents (admission under review, revoked or returned; payment review
 * hold; cancellation requested) and cancelled intents are left untouched.
 * When an admission review hold is released, the admissions hook attaches
 * that member's intents (attachForMember); `catchUpKeyGrantTargets` is the
 * explicitly invoked sweep for everything else, including members who paid
 * before the custody owner was configured. No path retires a wallet or
 * replaces a target.
 */

const PAGE = 25;
const MAX_ROWS = 500;

export type ActiveWallet = {
  memberID: string;
  chainID: number;
  safeAddress: string;
};
export type HoldReason = "admission_hold" | "payment_hold" | "cancel_requested";

/** Pure hold rule shared by attach and the page reader, so both read holds the same way. */
export function keyGrantHold(
  intent: CommerceDocument,
  admission: CommerceDocument | null | undefined,
  payment: CommerceDocument | null | undefined
): HoldReason | null {
  if (intent.cancelRequested === true) return "cancel_requested";
  if (
    !admission ||
    admission.status === "revoked" ||
    admission.benefitReview === true ||
    admission.returnAcceptedAt
  )
    return "admission_hold";
  if (
    !payment ||
    payment.status !== "succeeded" ||
    payment.commerceReviewHold === true
  )
    return "payment_hold";
  return null;
}

/** Why an awaiting intent may not take a target yet; null when it may. */
async function holdReason(
  req: PayloadRequest,
  intent: CommerceDocument
): Promise<string | null> {
  if (intent.state !== "awaiting_wallet") return "state";
  if (intent.recipientMode !== "member_safe") return "mode";
  if (intent.target) return "targeted";
  if (intent.cancelRequested === true) return "cancel_requested";
  return keyGrantHold(
    intent,
    await readCommerce(
      req,
      "commerce-admissions",
      relationshipID(intent.entitlement)
    ),
    await readCommerce(req, "transactions", relationshipID(intent.payment))
  );
}

const targetFor = (
  wallet: ActiveWallet,
  config: WalletConfig
): KeyGrantTarget =>
  parseKeyGrantTarget({
    chainID: wallet.chainID,
    lock: config.lock,
    recipient: wallet.safeAddress
  });

/**
 * Attach every eligible awaiting intent of one member. The caller holds the
 * member+chain lock inside its transaction. Returns the IDs it moved.
 */
export async function attachMemberKeyGrants(
  req: PayloadRequest,
  wallet: ActiveWallet,
  config: WalletConfig
): Promise<string[]> {
  if (wallet.chainID !== config.chainID)
    throw new Error("Wallet chain does not match the key-grant chain");
  const target = targetFor(wallet, config);
  const moved: string[] = [];
  const found = await req.payload.find({
    collection: "commerce-key-grant-intents" as never,
    depth: 0,
    overrideAccess: true,
    req,
    limit: MAX_ROWS,
    sort: "createdAt",
    where: {
      and: [
        { beneficiaryUser: { equals: wallet.memberID } },
        { state: { equals: "awaiting_wallet" } },
        { recipientMode: { equals: "member_safe" } }
      ]
    } as never
  });
  for (const row of found.docs as unknown as CommerceDocument[]) {
    await lockCommerce(req, [`key-grant:${String(row.operationKey)}`]);
    // Decide from the record as it stands under its own lock.
    const intent = await readCommerce(
      req,
      "commerce-key-grant-intents",
      row.id
    );
    if (
      relationshipID(intent.beneficiaryUser) !== wallet.memberID ||
      (await holdReason(req, intent))
    )
      continue;
    await withCommerceWrite(req, () =>
      updateCommerce(req, "commerce-key-grant-intents", intent.id, {
        target,
        state: "pending",
        nextAttemptAt: null
      })
    );
    moved.push(intent.id);
  }
  return moved;
}

/** The member's active wallet on a chain, read inside the caller's transaction. */
export async function findActiveWallet(
  req: PayloadRequest,
  memberID: string,
  chainID: number
): Promise<ActiveWallet | null> {
  const found = await req.payload.find({
    collection: "member-wallets" as never,
    depth: 0,
    overrideAccess: true,
    req,
    limit: 1,
    where: { activeSlot: { equals: `${memberID}:${chainID}` } } as never
  });
  const row = (found.docs as unknown as CommerceDocument[])[0];
  if (
    !row ||
    row.status !== "active" ||
    relationshipID(row.member) !== memberID ||
    Number(row.chainID) !== chainID
  )
    return null;
  return { memberID, chainID, safeAddress: String(row.safeAddress) };
}

/**
 * The member's active wallet, created if missing. The caller holds the
 * member+chain lock inside its transaction, so this is idempotent: a replay
 * finds the wallet the first call wrote. An existing wallet is never replaced,
 * even if the configured owner has changed since, because keys may already be
 * granted to it.
 */
export async function ensureMemberWallet(
  req: PayloadRequest,
  memberID: string,
  config: WalletConfig
): Promise<ActiveWallet> {
  const existing = await findActiveWallet(req, memberID, config.chainID);
  if (existing) return existing;
  const safe = predictMemberSafe({
    chainID: config.chainID,
    owner: config.owner,
    memberID
  });
  await withWalletWrite(req, () =>
    req.payload.create({
      collection: "member-wallets" as never,
      depth: 0,
      overrideAccess: true,
      req,
      data: {
        member: memberID,
        chainID: safe.chainID,
        status: "active",
        activeSlot: `${memberID}:${safe.chainID}`,
        walletKey: `${safe.chainID}:${safe.safeAddress.toLowerCase()}`,
        safeAddress: safe.safeAddress,
        ownerAddress: safe.ownerAddress,
        threshold: safe.threshold,
        saltNonce: safe.saltNonce,
        safeVersion: safe.safeVersion,
        proxyFactoryAddress: safe.proxyFactoryAddress,
        singletonAddress: safe.singletonAddress,
        fallbackHandlerAddress: safe.fallbackHandlerAddress,
        configHash: safe.configHash,
        boundAt: new Date().toISOString()
      } as never
    })
  );
  return { memberID, chainID: safe.chainID, safeAddress: safe.safeAddress };
}

/** Under the caller's lock: the member's wallet (created if missing), then every eligible intent attached. */
const ensureAndAttach = async (
  req: PayloadRequest,
  memberID: string,
  config: WalletConfig
): Promise<string[]> =>
  attachMemberKeyGrants(
    req,
    await ensureMemberWallet(req, memberID, config),
    config
  );

/** Invalid wallet configuration must never fail a payment or a hold release: it reads as unconfigured. */
function walletConfig(req: PayloadRequest): WalletConfig | null {
  try {
    return loadWalletConfig();
  } catch {
    req.payload.logger.error({
      msg: "Member wallet configuration is invalid; key-grant intents stay awaiting a wallet"
    });
    return null;
  }
}

/**
 * Settlement side, called by recordKeyGrantIntents before any intent lock.
 * Takes the member+chain lock; the caller records its intents and then calls
 * the returned function, which creates the member's wallet if it is missing
 * and attaches them.
 */
export async function lockMemberWallet(
  req: PayloadRequest,
  memberID: string
): Promise<() => Promise<string[]>> {
  // Unconfigured: no wallet is created, and intents stay awaiting a wallet.
  const config = walletConfig(req);
  if (!config) return async () => [];
  await lockCommerce(req, [walletLockKey(memberID, config.chainID)]);
  return () => ensureAndAttach(req, memberID, config);
}

/**
 * Attach one member's eligible intents under the member+chain lock, in the
 * caller's transaction (or a new one), creating the wallet if it is missing.
 * Used where a hold is released.
 */
export async function attachForMember(
  req: PayloadRequest,
  memberID: string
): Promise<string[]> {
  const config = walletConfig(req);
  if (!config) return [];
  return inCommerceTransaction(req, async () => {
    await lockCommerce(req, [walletLockKey(memberID, config.chainID)]);
    return ensureAndAttach(req, memberID, config);
  });
}

export type CatchUpResult = { moved: number; members: number; more: boolean };

/**
 * Explicitly invoked sweep for intents that became eligible later, or whose
 * member paid before the custody owner was configured. Each member is handled
 * in its own short transaction under its lock. Bounded: it reports `more: true` instead of silently stopping when
 * more members remain than one pass handles.
 */
type Transact = <T>(work: (req: PayloadRequest) => Promise<T>) => Promise<T>;
const ownTransaction =
  (payload: Payload): Transact =>
  (work) => {
    const req = { payload, context: {} } as unknown as PayloadRequest;
    return inCommerceTransaction(req, () => work(req));
  };

export async function catchUpKeyGrantTargets({
  payload,
  config = loadWalletConfig(),
  limit = MAX_ROWS,
  transact = ownTransaction(payload)
}: {
  payload: Payload;
  config?: WalletConfig | null;
  limit?: number;
  transact?: Transact;
}): Promise<CatchUpResult> {
  if (!config) return { moved: 0, members: 0, more: false };
  const members = new Set<string>();
  let more = false;
  for (let page = 1; ; page++) {
    const found = await transact((req) =>
      req.payload.find({
        collection: "commerce-key-grant-intents" as never,
        depth: 0,
        overrideAccess: true,
        limit: PAGE,
        page,
        sort: "createdAt",
        req,
        where: {
          and: [
            { state: { equals: "awaiting_wallet" } },
            { recipientMode: { equals: "member_safe" } }
          ]
        } as never
      })
    );
    for (const row of found.docs as unknown as CommerceDocument[]) {
      if (!row.beneficiaryUser) continue;
      const member = relationshipID(row.beneficiaryUser);
      if (members.size >= limit && !members.has(member)) {
        more = true;
        break;
      }
      members.add(member);
    }
    if (more || !found.hasNextPage) break;
  }
  let moved = 0;
  for (const memberID of members) {
    moved += await transact(async (req) => {
      await lockCommerce(req, [walletLockKey(memberID, config.chainID)]);
      return (await ensureAndAttach(req, memberID, config)).length;
    });
  }
  return { moved, members: members.size, more };
}
