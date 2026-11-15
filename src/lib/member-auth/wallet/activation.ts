import type { Payload, PayloadRequest } from "payload";
import type { AuthenticationResponseJSON, AuthenticatorTransportFuture, RegistrationResponseJSON } from "@simplewebauthn/server";
import { decodeClientDataJSON } from "@simplewebauthn/server/helpers";
import { attachMemberKeyGrants, findActiveWallet } from "../../commerce/keys/activation";
import { inCommerceTransaction, lockCommerce, relationshipID, type CommerceDocument } from "../../commerce/_shared/transaction";
import type { MemberPrincipal } from "../contracts";
import { withWalletWrite } from "./access";
import { walletLockKey, type WalletConfig } from "./config";
import { storedPasskeyCoordinates, verifyWalletBind, verifyWalletRegistration, walletBindOptions, walletRegistrationOptions, WalletCredentialError,
  type RelyingParty, type WalletCredential } from "./credentials";
import { safeConfigHash, type PredictSafe, type SafeCandidate } from "./safe";

/*
 * Member wallet activation (ADR-0005, plan: SERVER VERIFICATION).
 *
 * register: options -> verify creates a `pending` wallet for a new ES256 wallet
 *   passkey and returns its bind options. Needs a session under 15 minutes old.
 * bind: options fixes one credential and its server-computed Safe candidate in
 *   a single-use challenge; verify checks a fresh wallet-bind assertion and,
 *   under the member+chain lock, activates the wallet and attaches intents.
 *
 * Identity comes from the fresh canonical session on every call; eligibility
 * (verified email, not suspended, a paid member entitlement) is rechecked at
 * completion. One active wallet per member and chain: the same wallet replays
 * to its existing state, a different one is refused. Nothing retires a wallet.
 */

export type WalletErrorCode = "UNAUTHENTICATED" | "EMAIL_REQUIRED" | "FRESH_AUTH_REQUIRED" | "NOT_ELIGIBLE" | "WALLET_ACTIVE" | "WALLET_CONFLICT"
  | "INCOMPATIBLE_CREDENTIAL" | "UNKNOWN_CREDENTIAL" | "INVALID_CHALLENGE" | "INVALID_ASSERTION" | "INVALID_REGISTRATION" | "UNAVAILABLE";
export class WalletError extends Error {
  constructor(readonly code: WalletErrorCode) { super(code); this.name = "WalletError"; }
}

export const FRESH_SESSION_MS = 15 * 60_000;
const CHALLENGE_MS = 5 * 60_000;

type Transact = <T>(work: (req: PayloadRequest) => Promise<T>) => Promise<T>;
export type WalletDependencies = {
  rp: RelyingParty;
  config: WalletConfig;
  predict: PredictSafe;
  transact: Transact;
  now?: () => Date;
};

/** Production transactions: a fresh request per unit of work, in its own PostgreSQL transaction. */
export const payloadTransact = (payload: Payload): Transact => (work) => {
  const req = { payload, context: {} } as unknown as PayloadRequest;
  return inCommerceTransaction(req, () => work(req));
};

type BindCandidate = {
  source: "sign_in_passkey" | "wallet_passkey";
  signInPasskey: string | null;
  credential: WalletCredential;
  safe: SafeCandidate;
};

const find = async (req: PayloadRequest, collection: string, where: Record<string, unknown>, limit = 10): Promise<CommerceDocument[]> =>
  (await req.payload.find({ collection: collection as never, where: where as never, limit, depth: 0, overrideAccess: true, req })).docs as unknown as CommerceDocument[];
const create = (req: PayloadRequest, collection: string, data: Record<string, unknown>) =>
  withWalletWrite(req, () => req.payload.create({ collection: collection as never, data: data as never, overrideAccess: true, req })) as Promise<unknown> as Promise<CommerceDocument>;
const update = (req: PayloadRequest, collection: string, id: string, data: Record<string, unknown>) =>
  withWalletWrite(req, () => req.payload.update({ collection: collection as never, id, data: data as never, overrideAccess: true, req })) as Promise<unknown> as Promise<CommerceDocument>;

function principalOf(principal: MemberPrincipal | null): MemberPrincipal & { sessionId: string } {
  if (!principal || !principal.sessionId) throw new WalletError("UNAUTHENTICATED");
  if (!principal.emailVerified) throw new WalletError("EMAIL_REQUIRED");
  return principal as MemberPrincipal & { sessionId: string };
}

/** Paid entitlement: a live member key-grant intent whose payment succeeded. Phone binding alone is not membership. */
export async function hasPaidEntitlement(req: PayloadRequest, memberID: string): Promise<boolean> {
  const intents = await find(req, "commerce-key-grant-intents", { and: [{ beneficiaryUser: { equals: memberID } }, { recipientMode: { equals: "member_safe" } },
    { state: { in: ["awaiting_wallet", "pending", "submitted", "granted", "failed_retryable", "ambiguous"] } }] }, 50);
  for (const intent of intents) {
    const payment = await req.payload.findByID({ collection: "transactions" as never, id: relationshipID(intent.payment), depth: 0, overrideAccess: true, req, disableErrors: true }) as unknown as CommerceDocument | null;
    if (payment?.status === "succeeded") return true;
  }
  return false;
}

async function assertEligible(req: PayloadRequest, principal: MemberPrincipal): Promise<void> {
  const user = await req.payload.findByID({ collection: "users" as never, id: principal.userId, depth: 0, overrideAccess: true, req, disableErrors: true }) as unknown as CommerceDocument | null;
  if (!user || user.membershipStatus === "suspended" || !await hasPaidEntitlement(req, principal.userId)) throw new WalletError("NOT_ELIGIBLE");
}

const challengeOf = (response: { response?: { clientDataJSON?: unknown } }): string => {
  try {
    const value = decodeClientDataJSON(String(response.response?.clientDataJSON)).challenge;
    if (typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value)) return value;
  } catch { /* rejected below */ }
  throw new WalletError("INVALID_CHALLENGE");
};

function credentialOf(row: CommerceDocument): WalletCredential {
  return { credentialID: String(row.credentialID), publicKey: String(row.publicKey), counter: Number(row.counter),
    transports: (Array.isArray(row.transports) ? row.transports : []) as AuthenticatorTransportFuture[],
    coordinates: { x: String(row.publicKeyX) as `0x${string}`, y: String(row.publicKeyY) as `0x${string}` } };
}
function safeOf(row: CommerceDocument): SafeCandidate {
  return { chainID: Number(row.chainID), safeVersion: String(row.safeVersion), saltNonce: String(row.saltNonce), verifierAddress: String(row.verifierAddress),
    ownerAddress: String(row.ownerAddress), safeAddress: String(row.safeAddress), proxyFactoryAddress: String(row.proxyFactoryAddress),
    singletonAddress: String(row.singletonAddress), configHash: String(row.configHash) };
}
const walletKey = (safe: SafeCandidate) => `${safe.chainID}:${safe.safeAddress.toLowerCase()}`;

function walletRow(principal: MemberPrincipal, rp: RelyingParty, candidate: BindCandidate): Record<string, unknown> {
  const { credential, safe } = candidate;
  return { member: principal.userId, chainID: safe.chainID, walletKey: walletKey(safe), credentialSource: candidate.source, signInPasskey: candidate.signInPasskey,
    credentialID: credential.credentialID, publicKey: credential.publicKey, publicKeyX: credential.coordinates.x, publicKeyY: credential.coordinates.y,
    transports: credential.transports, rpID: rp.rpID, origin: rp.origin, counter: credential.counter, verifierAddress: safe.verifierAddress,
    ownerAddress: safe.ownerAddress, safeAddress: safe.safeAddress, proxyFactoryAddress: safe.proxyFactoryAddress, singletonAddress: safe.singletonAddress,
    safeVersion: safe.safeVersion, saltNonce: safe.saltNonce, configHash: safe.configHash };
}

export function createWalletActivation(deps: WalletDependencies) {
  const now = deps.now ?? (() => new Date());
  const lockKey = (memberID: string) => walletLockKey(memberID, deps.config.chainID);

  async function predict(credential: WalletCredential): Promise<SafeCandidate> {
    let safe: SafeCandidate;
    try { safe = await deps.predict({ credentialID: credential.credentialID, coordinates: credential.coordinates, config: deps.config }); }
    catch { throw new WalletError("UNAVAILABLE"); }
    if (safe.chainID !== deps.config.chainID || safe.safeVersion !== deps.config.safeVersion || safe.saltNonce !== deps.config.saltNonce
      || safe.configHash !== safeConfigHash({ ...safe, coordinates: credential.coordinates })) throw new WalletError("UNAVAILABLE");
    return safe;
  }

  /** Reads and checks a challenge for this member session and purpose. */
  async function openChallenge(req: PayloadRequest, principal: MemberPrincipal & { sessionId: string }, value: string, purpose: "wallet-register" | "wallet-bind"): Promise<CommerceDocument> {
    const [row] = await find(req, "member-wallet-challenges", { challenge: { equals: value } }, 1);
    if (!row || row.purpose !== purpose || relationshipID(row.member) !== principal.userId || row.sessionID !== principal.sessionId
      || row.consumedAt || new Date(String(row.expiresAt)).getTime() <= now().getTime()) throw new WalletError("INVALID_CHALLENGE");
    return row;
  }
  async function consume(req: PayloadRequest, row: CommerceDocument): Promise<void> {
    const current = await req.payload.findByID({ collection: "member-wallet-challenges" as never, id: row.id, depth: 0, overrideAccess: true, req }) as unknown as CommerceDocument;
    if (current.consumedAt) throw new WalletError("INVALID_CHALLENGE");
    await update(req, "member-wallet-challenges", row.id, { consumedAt: now().toISOString() });
  }
  const expiry = () => new Date(now().getTime() + CHALLENGE_MS).toISOString();

  async function storeBindChallenge(req: PayloadRequest, principal: MemberPrincipal & { sessionId: string }, candidate: BindCandidate) {
    const options = await walletBindOptions({ rp: deps.rp, credential: candidate.credential });
    await create(req, "member-wallet-challenges", { member: principal.userId, sessionID: principal.sessionId, purpose: "wallet-bind", challenge: options.challenge,
      credentialID: candidate.credential.credentialID, candidate, candidateDigest: candidate.safe.configHash, expiresAt: expiry() });
    return options;
  }

  return {
    async registerOptions(input: MemberPrincipal | null) {
      const principal = principalOf(input);
      const age = now().getTime() - principal.sessionCreatedAt.getTime();
      if (!Number.isFinite(age) || age < 0 || age > FRESH_SESSION_MS) throw new WalletError("FRESH_AUTH_REQUIRED");
      return deps.transact(async (req) => {
        await assertEligible(req, principal);
        if (await findActiveWallet(req, principal.userId, deps.config.chainID)) throw new WalletError("WALLET_ACTIVE");
        const known = [...await find(req, "passkeys", { user: { equals: principal.userId } }, 50), ...await find(req, "member-wallets", { member: { equals: principal.userId } }, 50)];
        const options = await walletRegistrationOptions({ rp: deps.rp, userID: principal.userId, userName: principal.email ?? "Sophomores member",
          excludeCredentialIDs: known.map((row) => String(row.credentialId ?? row.credentialID)) });
        await create(req, "member-wallet-challenges", { member: principal.userId, sessionID: principal.sessionId, purpose: "wallet-register",
          challenge: options.challenge, expiresAt: expiry() });
        return options;
      });
    },

    async registerVerify(input: MemberPrincipal | null, response: RegistrationResponseJSON) {
      const principal = principalOf(input);
      const value = challengeOf(response);
      const row = await deps.transact((req) => openChallenge(req, principal, value, "wallet-register"));
      let credential: WalletCredential;
      try { credential = await verifyWalletRegistration({ rp: deps.rp, challenge: value, response }); }
      catch (error) { throw new WalletError(error instanceof WalletCredentialError ? error.code : "INVALID_REGISTRATION"); }
      const safe = await predict(credential); // read-only RPC, before any transaction
      return deps.transact(async (req) => {
        await lockCommerce(req, [lockKey(principal.userId)]);
        await consume(req, row);
        await assertEligible(req, principal);
        if (await findActiveWallet(req, principal.userId, deps.config.chainID)) throw new WalletError("WALLET_ACTIVE");
        const candidate: BindCandidate = { source: "wallet_passkey", signInPasskey: null, credential, safe };
        await create(req, "member-wallets", { ...walletRow(principal, deps.rp, candidate), status: "pending" });
        return storeBindChallenge(req, principal, candidate);
      });
    },

    async bindOptions(input: MemberPrincipal | null, credentialID: string) {
      const principal = principalOf(input);
      // Resolve the candidate without holding a transaction across the RPC read.
      const known = await deps.transact(async (req) => {
        await assertEligible(req, principal);
        const active = await findActiveWallet(req, principal.userId, deps.config.chainID);
        const [wallet] = await find(req, "member-wallets", { and: [{ member: { equals: principal.userId } }, { credentialID: { equals: credentialID } }] }, 1);
        if (active && wallet?.status !== "active") throw new WalletError("WALLET_CONFLICT");
        if (wallet) return { wallet };
        const [passkey] = await find(req, "passkeys", { and: [{ user: { equals: principal.userId } }, { credentialId: { equals: credentialID } }] }, 1);
        return { passkey };
      });
      let candidate: BindCandidate;
      if (known.wallet) {
        candidate = { source: known.wallet.credentialSource as BindCandidate["source"], signInPasskey: (known.wallet.signInPasskey as string | null) ?? null,
          credential: credentialOf(known.wallet), safe: safeOf(known.wallet) };
      } else if (known.passkey) {
        const coordinates = storedPasskeyCoordinates(String(known.passkey.publicKey));
        if (!coordinates) throw new WalletError("INCOMPATIBLE_CREDENTIAL");
        const credential: WalletCredential = { credentialID, publicKey: Buffer.from(String(known.passkey.publicKey), "base64").toString("base64url"),
          counter: Number(known.passkey.counter) || 0, coordinates,
          transports: String(known.passkey.transports ?? "").split(",").filter(Boolean) as AuthenticatorTransportFuture[] };
        candidate = { source: "sign_in_passkey", signInPasskey: known.passkey.id, credential, safe: await predict(credential) };
      } else throw new WalletError("UNKNOWN_CREDENTIAL");
      return deps.transact((req) => storeBindChallenge(req, principal, candidate));
    },

    async bindVerify(input: MemberPrincipal | null, response: AuthenticationResponseJSON) {
      const principal = principalOf(input);
      const value = challengeOf(response);
      return deps.transact(async (req) => {
        await lockCommerce(req, [lockKey(principal.userId)]);
        const row = await openChallenge(req, principal, value, "wallet-bind");
        const candidate = row.candidate as BindCandidate;
        if (response.id !== row.credentialID || candidate?.credential?.credentialID !== row.credentialID || candidate.safe.chainID !== deps.config.chainID
          || row.candidateDigest !== candidate.safe.configHash
          || candidate.safe.configHash !== safeConfigHash({ ...candidate.safe, coordinates: candidate.credential.coordinates })) throw new WalletError("INVALID_CHALLENGE");
        await consume(req, row);
        await assertEligible(req, principal);
        const [active] = await find(req, "member-wallets", { activeSlot: { equals: `${principal.userId}:${deps.config.chainID}` } }, 1);
        if (active && active.walletKey !== walletKey(candidate.safe)) throw new WalletError("WALLET_CONFLICT");
        const [pending] = active ? [] : await find(req, "member-wallets", { and: [{ member: { equals: principal.userId } }, { walletKey: { equals: walletKey(candidate.safe) } }] }, 1);
        const stored = active ?? pending;
        const credential = stored ? credentialOf(stored) : candidate.credential;
        let counter: number;
        try { counter = await verifyWalletBind({ rp: deps.rp, challenge: value, credential, response }); }
        catch { throw new WalletError("INVALID_ASSERTION"); }
        const boundAt = now().toISOString();
        if (active) {
          if (counter > credential.counter) await update(req, "member-wallets", active.id, { counter });
        } else if (pending) {
          await update(req, "member-wallets", pending.id, { status: "active", activeSlot: `${principal.userId}:${deps.config.chainID}`, boundAt,
            counter: Math.max(counter, credential.counter), bindChallenge: row.id });
        } else {
          await create(req, "member-wallets", { ...walletRow(principal, deps.rp, candidate), counter: Math.max(counter, credential.counter), status: "active",
            activeSlot: `${principal.userId}:${deps.config.chainID}`, boundAt, bindChallenge: row.id });
        }
        const attached = await attachMemberKeyGrants(req, { memberID: principal.userId, chainID: deps.config.chainID, safeAddress: candidate.safe.safeAddress }, deps.config);
        return { status: "active" as const, replay: Boolean(active), attached: attached.length };
      });
    },
  };
}

export type WalletActivation = ReturnType<typeof createWalletActivation>;
