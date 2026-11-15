import type { Payload, PayloadRequest } from "payload";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON
} from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import {
  attachMemberKeyGrants,
  catchUpKeyGrantTargets,
  findActiveWallet,
  type CatchUpResult
} from "../../commerce/keys/activation";
import {
  inCommerceTransaction,
  lockCommerce,
  relationshipID,
  type CommerceDocument
} from "../../commerce/_shared/transaction";
import type { MemberPrincipal } from "../contracts";
import { withWalletWrite } from "./access";
import { walletLockKey, type WalletConfig } from "./config";
import {
  storedPasskeyCoordinates,
  verifyWalletBind,
  verifyWalletRegistration,
  walletBindOptions,
  walletRegistrationOptions,
  WalletCredentialError,
  type RelyingParty,
  type WalletCredential
} from "./credentials";
import { safeConfigHash, type PredictSafe, type SafeCandidate } from "./safe";

/*
 * Member wallet activation (ADR-0005, plan: SERVER VERIFICATION).
 *
 * register: options -> verify creates a `pending` wallet for a new ES256 wallet
 *   passkey and returns its bind options.
 * bind: options fixes one credential and its server-computed Safe candidate in
 *   a single-use challenge; verify checks a fresh wallet-bind assertion and,
 *   under the member+chain lock, activates the wallet and attaches intents.
 *
 * Every step needs a session under 15 minutes old. A challenge is burned in
 * its own committed transaction before the response is verified, so a failed
 * attempt can never be retried. Identity comes from the fresh canonical
 * session on every call; eligibility (verified email, not suspended, a paid
 * member entitlement) is rechecked at completion. One active wallet per
 * member and chain: the same wallet replays to its existing state, a
 * different one is refused. Nothing retires a wallet.
 */

export type WalletErrorCode =
  | "UNAUTHENTICATED"
  | "EMAIL_REQUIRED"
  | "FRESH_AUTH_REQUIRED"
  | "NOT_ELIGIBLE"
  | "WALLET_ACTIVE"
  | "WALLET_CONFLICT"
  | "INCOMPATIBLE_CREDENTIAL"
  | "UNKNOWN_CREDENTIAL"
  | "INVALID_CHALLENGE"
  | "INVALID_ASSERTION"
  | "INVALID_REGISTRATION"
  | "LIMIT_REACHED"
  | "UNAVAILABLE";
export class WalletError extends Error {
  constructor(readonly code: WalletErrorCode) {
    super(code);
    this.name = "WalletError";
  }
}

export const FRESH_SESSION_MS = 15 * 60_000;
const CHALLENGE_MS = 5 * 60_000;
/** Bounds per member: open (unused, unexpired) challenges and pending wallet passkeys. */
export const MAX_OPEN_CHALLENGES = 5;
export const MAX_PENDING_WALLETS = 3;
/** A registered wallet passkey that was never approved is removed by the sweep after this long. */
export const STALE_PENDING_MS = 7 * 24 * 60 * 60_000;
const LIVE_STATES = [
  "awaiting_wallet",
  "pending",
  "submitted",
  "granted",
  "failed_retryable",
  "ambiguous"
];

type Transact = <T>(work: (req: PayloadRequest) => Promise<T>) => Promise<T>;
export type WalletDependencies = {
  rp: RelyingParty;
  config: WalletConfig;
  predict: PredictSafe;
  transact: Transact;
  now?: () => Date;
};

/** Production transactions: a fresh request per unit of work, in its own PostgreSQL transaction. */
export const payloadTransact =
  (payload: Payload): Transact =>
  (work) => {
    const req = { payload, context: {} } as unknown as PayloadRequest;
    return inCommerceTransaction(req, () => work(req));
  };

type BindCandidate = {
  source: "sign_in_passkey" | "wallet_passkey";
  signInPasskey: string | null;
  credential: WalletCredential;
  safe: SafeCandidate;
};
type Principal = MemberPrincipal & { sessionId: string };

const find = async (
  req: PayloadRequest,
  collection: string,
  where: Record<string, unknown>,
  limit = 10
): Promise<CommerceDocument[]> =>
  (
    await req.payload.find({
      collection: collection as never,
      where: where as never,
      limit,
      depth: 0,
      overrideAccess: true,
      req
    })
  ).docs as unknown as CommerceDocument[];
const create = (
  req: PayloadRequest,
  collection: string,
  data: Record<string, unknown>
) =>
  withWalletWrite(req, () =>
    req.payload.create({
      collection: collection as never,
      data: data as never,
      overrideAccess: true,
      req
    })
  ) as Promise<unknown> as Promise<CommerceDocument>;
const update = (
  req: PayloadRequest,
  collection: string,
  id: string,
  data: Record<string, unknown>
) =>
  withWalletWrite(req, () =>
    req.payload.update({
      collection: collection as never,
      id,
      data: data as never,
      overrideAccess: true,
      req
    })
  ) as Promise<unknown> as Promise<CommerceDocument>;
const identityOf = (value: unknown): string | null =>
  value === null || value === undefined ? null : relationshipID(value);

function principalOf(principal: MemberPrincipal | null, now: Date): Principal {
  if (!principal || !principal.sessionId)
    throw new WalletError("UNAUTHENTICATED");
  if (!principal.emailVerified) throw new WalletError("EMAIL_REQUIRED");
  const age = now.getTime() - principal.sessionCreatedAt.getTime();
  if (!Number.isFinite(age) || age < 0 || age > FRESH_SESSION_MS)
    throw new WalletError("FRESH_AUTH_REQUIRED");
  return principal as Principal;
}

/** Paid entitlement: a live member key-grant intent whose payment succeeded. Two reads, whatever the number of intents. */
export async function hasPaidEntitlement(
  req: PayloadRequest,
  memberID: string
): Promise<boolean> {
  const intents = await find(
    req,
    "commerce-key-grant-intents",
    {
      and: [
        { beneficiaryUser: { equals: memberID } },
        { recipientMode: { equals: "member_safe" } },
        { state: { in: LIVE_STATES } }
      ]
    },
    50
  );
  if (!intents.length) return false;
  const payments = await find(
    req,
    "transactions",
    {
      and: [
        {
          id: {
            in: [
              ...new Set(
                intents.map((intent) => relationshipID(intent.payment))
              )
            ]
          }
        },
        { status: { equals: "succeeded" } }
      ]
    },
    1
  );
  return payments.length > 0;
}

async function assertEligible(
  req: PayloadRequest,
  principal: MemberPrincipal
): Promise<void> {
  const user = (await req.payload.findByID({
    collection: "users" as never,
    id: principal.userId,
    depth: 0,
    overrideAccess: true,
    req,
    disableErrors: true
  })) as unknown as CommerceDocument | null;
  if (
    !user ||
    user.membershipStatus === "suspended" ||
    !(await hasPaidEntitlement(req, principal.userId))
  )
    throw new WalletError("NOT_ELIGIBLE");
}

const challengeOf = (response: {
  response?: { clientDataJSON?: unknown };
}): string => {
  try {
    const value = decodeClientDataJSON(
      String(response.response?.clientDataJSON)
    ).challenge;
    if (typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value))
      return value;
  } catch {
    /* rejected below */
  }
  throw new WalletError("INVALID_CHALLENGE");
};

function credentialOf(row: CommerceDocument): WalletCredential {
  return {
    credentialID: String(row.credentialID),
    publicKey: String(row.publicKey),
    counter: Number(row.counter),
    transports: (Array.isArray(row.transports)
      ? row.transports
      : []) as AuthenticatorTransportFuture[],
    coordinates: {
      x: String(row.publicKeyX) as `0x${string}`,
      y: String(row.publicKeyY) as `0x${string}`
    }
  };
}
function safeOf(row: CommerceDocument): SafeCandidate {
  return {
    chainID: Number(row.chainID),
    safeVersion: String(row.safeVersion),
    saltNonce: String(row.saltNonce),
    verifierAddress: String(row.verifierAddress),
    ownerAddress: String(row.ownerAddress),
    safeAddress: String(row.safeAddress),
    proxyFactoryAddress: String(row.proxyFactoryAddress),
    singletonAddress: String(row.singletonAddress),
    configHash: String(row.configHash)
  };
}
const walletKey = (safe: SafeCandidate) =>
  `${safe.chainID}:${safe.safeAddress.toLowerCase()}`;

function walletRow(
  principal: MemberPrincipal,
  rp: RelyingParty,
  candidate: BindCandidate
): Record<string, unknown> {
  const { credential, safe } = candidate;
  return {
    member: principal.userId,
    chainID: safe.chainID,
    walletKey: walletKey(safe),
    memberWalletKey: `${principal.userId}:${walletKey(safe)}`,
    credentialSource: candidate.source,
    signInPasskey: candidate.signInPasskey,
    credentialID: credential.credentialID,
    publicKey: credential.publicKey,
    publicKeyX: credential.coordinates.x,
    publicKeyY: credential.coordinates.y,
    transports: credential.transports,
    rpID: rp.rpID,
    origin: rp.origin,
    counter: credential.counter,
    verifierAddress: safe.verifierAddress,
    ownerAddress: safe.ownerAddress,
    safeAddress: safe.safeAddress,
    proxyFactoryAddress: safe.proxyFactoryAddress,
    singletonAddress: safe.singletonAddress,
    safeVersion: safe.safeVersion,
    saltNonce: safe.saltNonce,
    configHash: safe.configHash
  };
}

/** A unique-index rejection (another member's active wallet, a duplicate slot) is a conflict, never a raw storage error. */
async function asConflict<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof WalletError) throw error;
    const text = error instanceof Error ? `${error.name} ${error.message}` : "";
    if (/ValidationError|unique|duplicate|invalid/i.test(text))
      throw new WalletError("WALLET_CONFLICT");
    throw error;
  }
}

/** Another member already holds this Safe as an active wallet (proved by their bind assertion). */
async function activeElsewhere(
  req: PayloadRequest,
  memberID: string,
  key: string
): Promise<boolean> {
  const [row] = await find(
    req,
    "member-wallets",
    { activeWalletKey: { equals: key } },
    1
  );
  return Boolean(row && identityOf(row.member) !== memberID);
}

export function createWalletActivation(deps: WalletDependencies) {
  const now = deps.now ?? (() => new Date());
  const lockKey = (memberID: string) =>
    walletLockKey(memberID, deps.config.chainID);
  const expiry = () => new Date(now().getTime() + CHALLENGE_MS).toISOString();

  async function predict(credential: WalletCredential): Promise<SafeCandidate> {
    let safe: SafeCandidate;
    try {
      safe = await deps.predict({
        credentialID: credential.credentialID,
        coordinates: credential.coordinates,
        config: deps.config
      });
    } catch {
      throw new WalletError("UNAVAILABLE");
    }
    if (
      safe.chainID !== deps.config.chainID ||
      safe.safeVersion !== deps.config.safeVersion ||
      safe.saltNonce !== deps.config.saltNonce ||
      safe.configHash !==
        safeConfigHash({ ...safe, coordinates: credential.coordinates })
    )
      throw new WalletError("UNAVAILABLE");
    return safe;
  }

  /** Bound open challenges per member; a request beyond the bound is refused, not queued. */
  async function assertChallengeRoom(
    req: PayloadRequest,
    memberID: string
  ): Promise<void> {
    const rows = await find(
      req,
      "member-wallet-challenges",
      { member: { equals: memberID } },
      100
    );
    const open = rows.filter(
      (row) =>
        !row.consumedAt &&
        new Date(String(row.expiresAt)).getTime() > now().getTime()
    );
    if (open.length >= MAX_OPEN_CHALLENGES)
      throw new WalletError("LIMIT_REACHED");
  }
  async function pendingWallets(
    req: PayloadRequest,
    memberID: string
  ): Promise<CommerceDocument[]> {
    return (
      await find(req, "member-wallets", { member: { equals: memberID } }, 50)
    ).filter((row) => row.status === "pending");
  }

  /**
   * Burns the challenge in its own transaction and commits, before anything is
   * verified: a failed verification leaves it used. Expiry, purpose, member and
   * session are checked on the row as it stands under the member lock.
   */
  async function burnChallenge(
    principal: Principal,
    value: string,
    purpose: "wallet-register" | "wallet-bind"
  ): Promise<CommerceDocument> {
    return deps.transact(async (req) => {
      await lockCommerce(req, [lockKey(principal.userId)]);
      const [row] = await find(
        req,
        "member-wallet-challenges",
        { challenge: { equals: value } },
        1
      );
      if (
        !row ||
        row.purpose !== purpose ||
        identityOf(row.member) !== principal.userId ||
        row.sessionID !== principal.sessionId ||
        row.consumedAt ||
        new Date(String(row.expiresAt)).getTime() <= now().getTime()
      )
        throw new WalletError("INVALID_CHALLENGE");
      await update(req, "member-wallet-challenges", row.id, {
        consumedAt: now().toISOString()
      });
      return row;
    });
  }

  async function storeBindChallenge(
    req: PayloadRequest,
    principal: Principal,
    candidate: BindCandidate
  ) {
    const options = await walletBindOptions({
      rp: deps.rp,
      credential: candidate.credential
    });
    await create(req, "member-wallet-challenges", {
      member: principal.userId,
      sessionID: principal.sessionId,
      purpose: "wallet-bind",
      challenge: options.challenge,
      credentialID: candidate.credential.credentialID,
      candidate,
      candidateDigest: candidate.safe.configHash,
      expiresAt: expiry()
    });
    return options;
  }

  return {
    async registerOptions(input: MemberPrincipal | null) {
      const principal = principalOf(input, now());
      return deps.transact(async (req) => {
        await lockCommerce(req, [lockKey(principal.userId)]);
        await assertEligible(req, principal);
        if (await findActiveWallet(req, principal.userId, deps.config.chainID))
          throw new WalletError("WALLET_ACTIVE");
        if (
          (await pendingWallets(req, principal.userId)).length >=
          MAX_PENDING_WALLETS
        )
          throw new WalletError("LIMIT_REACHED");
        await assertChallengeRoom(req, principal.userId);
        const known = [
          ...(await find(
            req,
            "passkeys",
            { user: { equals: principal.userId } },
            50
          )),
          ...(await find(
            req,
            "member-wallets",
            { member: { equals: principal.userId } },
            50
          ))
        ];
        const options = await walletRegistrationOptions({
          rp: deps.rp,
          userID: principal.userId,
          userName: principal.email ?? "Sophomores member",
          excludeCredentialIDs: known.map((row) =>
            String(row.credentialId ?? row.credentialID)
          )
        });
        await create(req, "member-wallet-challenges", {
          member: principal.userId,
          sessionID: principal.sessionId,
          purpose: "wallet-register",
          challenge: options.challenge,
          expiresAt: expiry()
        });
        return options;
      });
    },

    async registerVerify(
      input: MemberPrincipal | null,
      response: RegistrationResponseJSON
    ) {
      const principal = principalOf(input, now());
      const value = challengeOf(response);
      await burnChallenge(principal, value, "wallet-register");
      let credential: WalletCredential;
      try {
        credential = await verifyWalletRegistration({
          rp: deps.rp,
          challenge: value,
          response
        });
      } catch (error) {
        throw new WalletError(
          error instanceof WalletCredentialError
            ? error.code
            : "INVALID_REGISTRATION"
        );
      }
      const safe = await predict(credential); // read-only RPC, before any transaction
      return deps.transact(async (req) => {
        await lockCommerce(req, [lockKey(principal.userId)]);
        await assertEligible(req, principal);
        if (await findActiveWallet(req, principal.userId, deps.config.chainID))
          throw new WalletError("WALLET_ACTIVE");
        const pending = await pendingWallets(req, principal.userId);
        if (pending.length >= MAX_PENDING_WALLETS)
          throw new WalletError("LIMIT_REACHED");
        if (
          pending.some((row) => row.walletKey === walletKey(safe)) ||
          (await activeElsewhere(req, principal.userId, walletKey(safe)))
        )
          throw new WalletError("WALLET_CONFLICT");
        const candidate: BindCandidate = {
          source: "wallet_passkey",
          signInPasskey: null,
          credential,
          safe
        };
        await asConflict(() =>
          create(req, "member-wallets", {
            ...walletRow(principal, deps.rp, candidate),
            status: "pending"
          })
        );
        await assertChallengeRoom(req, principal.userId);
        return storeBindChallenge(req, principal, candidate);
      });
    },

    async bindOptions(input: MemberPrincipal | null, credentialID: string) {
      const principal = principalOf(input, now());
      // Resolve the candidate without holding a transaction across the RPC read.
      const known = await deps.transact(async (req) => {
        await assertEligible(req, principal);
        const active = await findActiveWallet(
          req,
          principal.userId,
          deps.config.chainID
        );
        const [wallet] = await find(
          req,
          "member-wallets",
          {
            and: [
              { member: { equals: principal.userId } },
              { credentialID: { equals: credentialID } }
            ]
          },
          1
        );
        if (active && wallet?.status !== "active")
          throw new WalletError("WALLET_CONFLICT");
        if (wallet) return { wallet };
        const [passkey] = await find(
          req,
          "passkeys",
          {
            and: [
              { user: { equals: principal.userId } },
              { credentialId: { equals: credentialID } }
            ]
          },
          1
        );
        return { passkey };
      });
      let candidate: BindCandidate;
      if (known.wallet) {
        candidate = {
          source: known.wallet.credentialSource as BindCandidate["source"],
          signInPasskey: (known.wallet.signInPasskey as string | null) ?? null,
          credential: credentialOf(known.wallet),
          safe: safeOf(known.wallet)
        };
      } else if (known.passkey) {
        const coordinates = storedPasskeyCoordinates(
          String(known.passkey.publicKey)
        );
        if (!coordinates) throw new WalletError("INCOMPATIBLE_CREDENTIAL");
        const credential: WalletCredential = {
          credentialID,
          publicKey: Buffer.from(
            String(known.passkey.publicKey),
            "base64"
          ).toString("base64url"),
          counter: Number(known.passkey.counter) || 0,
          coordinates,
          transports: String(known.passkey.transports ?? "")
            .split(",")
            .filter(Boolean) as AuthenticatorTransportFuture[]
        };
        candidate = {
          source: "sign_in_passkey",
          signInPasskey: known.passkey.id,
          credential,
          safe: await predict(credential)
        };
      } else throw new WalletError("UNKNOWN_CREDENTIAL");
      return deps.transact(async (req) => {
        await lockCommerce(req, [lockKey(principal.userId)]);
        if (
          await activeElsewhere(
            req,
            principal.userId,
            walletKey(candidate.safe)
          )
        )
          throw new WalletError("WALLET_CONFLICT");
        await assertChallengeRoom(req, principal.userId);
        return storeBindChallenge(req, principal, candidate);
      });
    },

    async bindVerify(
      input: MemberPrincipal | null,
      response: AuthenticationResponseJSON
    ) {
      const principal = principalOf(input, now());
      const value = challengeOf(response);
      const row = await burnChallenge(principal, value, "wallet-bind");
      const candidate = row.candidate as BindCandidate;
      if (
        response.id !== row.credentialID ||
        candidate?.credential?.credentialID !== row.credentialID ||
        candidate.safe.chainID !== deps.config.chainID ||
        row.candidateDigest !== candidate.safe.configHash ||
        candidate.safe.configHash !==
          safeConfigHash({
            ...candidate.safe,
            coordinates: candidate.credential.coordinates
          })
      )
        throw new WalletError("INVALID_CHALLENGE");
      return deps.transact(async (req) => {
        await lockCommerce(req, [lockKey(principal.userId)]);
        await assertEligible(req, principal);
        const key = walletKey(candidate.safe);
        const [active] = await find(
          req,
          "member-wallets",
          {
            activeSlot: { equals: `${principal.userId}:${deps.config.chainID}` }
          },
          1
        );
        if (
          (active && active.walletKey !== key) ||
          (!active && (await activeElsewhere(req, principal.userId, key)))
        )
          throw new WalletError("WALLET_CONFLICT");
        const [pending] = active
          ? []
          : await find(
              req,
              "member-wallets",
              { memberWalletKey: { equals: `${principal.userId}:${key}` } },
              1
            );
        const stored = active ?? pending;
        const credential = stored ? credentialOf(stored) : candidate.credential;
        let counter: number;
        try {
          counter = await verifyWalletBind({
            rp: deps.rp,
            challenge: value,
            credential,
            response
          });
        } catch {
          throw new WalletError("INVALID_ASSERTION");
        }
        const bound = {
          status: "active",
          activeSlot: `${principal.userId}:${deps.config.chainID}`,
          activeWalletKey: key,
          boundAt: now().toISOString(),
          counter: Math.max(counter, credential.counter),
          bindChallenge: row.id
        };
        if (active) {
          if (counter > credential.counter)
            await update(req, "member-wallets", active.id, { counter });
        } else if (pending) {
          await asConflict(() =>
            update(req, "member-wallets", pending.id, bound)
          );
        } else {
          await asConflict(() =>
            create(req, "member-wallets", {
              ...walletRow(principal, deps.rp, candidate),
              ...bound
            })
          );
        }
        const attached = await attachMemberKeyGrants(
          req,
          {
            memberID: principal.userId,
            chainID: deps.config.chainID,
            safeAddress: candidate.safe.safeAddress
          },
          deps.config
        );
        return {
          status: "active" as const,
          replay: Boolean(active),
          attached: attached.length
        };
      });
    }
  };
}

export type WalletActivation = ReturnType<typeof createWalletActivation>;

export type SweepResult = {
  challengesPurged: number;
  pendingPurged: number;
  attach: CatchUpResult;
  more: boolean;
};

/**
 * Explicitly invoked maintenance sweep (no scheduler yet): purges expired
 * challenges and pending wallet passkeys never approved within
 * STALE_PENDING_MS, then attaches intents whose hold cleared. Bounded per run;
 * `more` says another run is needed rather than truncating silently.
 */
export async function sweepWalletActivation({
  payload,
  config,
  now = () => new Date(),
  limit = 200,
  transact = payloadTransact(payload)
}: {
  payload: Payload;
  config: WalletConfig | null;
  now?: () => Date;
  limit?: number;
  transact?: Transact;
}): Promise<SweepResult> {
  const purge = async (collection: string, where: Record<string, unknown>) =>
    transact(async (req) => {
      const rows = await find(req, collection, where, limit + 1);
      for (const row of rows.slice(0, limit))
        await withWalletWrite(req, () =>
          req.payload.delete({
            collection: collection as never,
            id: row.id,
            overrideAccess: true,
            req
          })
        );
      return {
        purged: Math.min(rows.length, limit),
        more: rows.length > limit
      };
    });
  const challenges = await purge("member-wallet-challenges", {
    expiresAt: { less_than: now().toISOString() }
  });
  const pending = await purge("member-wallets", {
    and: [
      { status: { equals: "pending" } },
      {
        createdAt: {
          less_than: new Date(now().getTime() - STALE_PENDING_MS).toISOString()
        }
      }
    ]
  });
  const attach = await catchUpKeyGrantTargets({
    payload,
    config,
    limit,
    transact
  });
  return {
    challengesPurged: challenges.purged,
    pendingPurged: pending.purged,
    attach,
    more: challenges.more || pending.more || attach.more
  };
}
