# Member wallet activation: proposed plan (Codex, 2026-11-15; built once 5a and 5b are approved)

## FLOW
- Read-only planning at `b6d5a3e`; no writes, installs, tests, RPC or provider calls. Assume the proposed dependencies are approved only for this design. Tarball citations below are relative to the supplied protocol-kit package.
- Authenticate, confirm a paid member_safe entitlement, select a compatible credential or register a wallet-only ES256 credential, derive the candidate Safe, obtain a fresh binding assertion, then atomically save the wallet and enqueue keys. Sign-in algorithms remain unchanged (`docs/adr/0005-activate-on-website-after-payment.md:23`).
- Registration's native Credential can use `extractPasskeyData(credential)`; this returns rawId/coordinates, not ownership proof. It expects an attestation response with getPublicKey(), so cannot extract an existing credential's key from an assertion (`dist/src/utils/passkeys/extractPasskeyData.d.ts:44`, `dist/esm/src/index.mjs:6173`). Reuse decodes server-stored COSE instead.
- Server-derived call sequence, with RPC URL/config trusted and coordinates verified; rawId is credential bytes encoded as hex, not the stored base64url ID:
```ts
const safeVersion = "1.4.1" as const; // proposed pinned configuration
const passkey = { rawId, coordinates: { x, y },
  verifierAddress: getP256VerifierAddress("84532") };
const sp = await SafeProvider.init({ provider: rpc, signer: passkey, safeVersion });
const owner = await sp.getSignerAddress();
if (!owner) throw new Error("Missing passkey owner");
const safeAccountConfig = { owners: [owner], threshold: 1 };
const safeDeploymentConfig = { safeVersion, saltNonce: "0" };
const predicted = await predictSafeAddress({ safeProvider: sp, chainId: 84532n,
  safeAccountConfig, safeDeploymentConfig });
const safe = await Safe.init({ provider: rpc, signer: passkey,
  predictedSafe: { safeAccountConfig, safeDeploymentConfig } });
const address = await safe.getAddress(); // must equal predicted
```
- Import Safe as default and SafeProvider/getP256VerifierAddress/predictSafeAddress as named exports. APIs: `dist/src/contracts/utils.d.ts:44`, `dist/src/types/safeConfig.d.ts:20`. Bootstrap uses factory getSigner(x,y,verifier), not an unconfigured shared signer. `getPasskeyOwnerAddress(safe, passkey)` requires an initialized Safe; it is not the bootstrap function (`dist/esm/src/index.mjs:6287`, `dist/src/utils/passkeys/getPasskeyOwnerAddress.d.ts:10`).
- **No deployment, but RPC reads are required by this SDK path**: chain ID, contract bytecode, factory getSigner and proxyCreationCode (`dist/esm/src/index.mjs:6483`, `dist/esm/src/index.mjs:6817`). CREATE2 arithmetic is deterministic, not evidence that these APIs run offline. Perform reads before opening DB transactions; never call deployment/send methods.

## SERVER VERIFICATION
- Create `src/lib/member-auth/wallet/{credentials,activation,http,read}.ts`. Resolve fresh canonical identity through toMemberPrincipal, not request userId or cached page identity (`src/lib/member-auth/payload-runtime.ts:32`). Recheck verified email, suspension and paid entitlement at completion; phone-binding eligibility alone is not paid membership.
- Existing public.passkeys stores publicKey, credentialId, user and counter, but no RP ID (`src/payload-generated-schema.ts:457`). Decode its base64 COSE with SimpleWebAuthn helpers; require kty=2, alg=-7, crv=1, valid 32-byte x/y and an on-curve key. Query credentials by authenticated user; assertion verification against the configured RP proves compatibility.
- Pin direct `@simplewebauthn/server@13.3.3` dependency: it is currently transitive only (`pnpm-lock.yaml:8864`). Approval must include this addition. Use its exported helpers, not custom CBOR/signature code. Add browser dependency directly only if imported.
- Separate wallet registration uses generateRegistrationOptions and verifyRegistrationResponse with supportedAlgorithmIDs:[-7], expectedOrigin/RPID and required user verification. Require recent account authentication; persist verified COSE without altering better-auth registration. Existing keys use verifyAuthenticationResponse with credential:{id,publicKey,counter,transports}, expectedChallenge/Origin/RPID and requireUserVerification:true.
- Both paths then require a **new assertion** over a short-lived challenge bound server-side to purpose=wallet-bind, member/session, credential fingerprint, RP, chain and complete candidate configuration/address. Registration or sign-in success is insufficient. Atomically consume once, verify credential ownership/userHandle and persist counter updates without regression; handle synchronized zero counters.

## SCHEMA
- Create `src/payload/collections/member-wallets/index.ts`: member relationship; chainID; pending/active/retired status; source credential reference/type; credentialID, COSE, x/y, RP/origin, counter/device metadata; verifier, owner address, Safe address, version, factory/singleton configuration, salt, configuration hash and binding timestamps/evidence.
- Unique nullable server-computed activeSlot=memberID:chainID enforces one active wallet per member/chain; unique chain+Safe address prevents cross-member reuse. Identity/configuration are immutable after activation; client writes/deletes denied. Dedicated wallet credentials need not become sign-in credentials.
- Create `src/payload/collections/member-wallet-challenges/index.ts`: member/session, purpose, challenge, candidate digest, expiry, consumedAt; private server-only access. Registration candidates are not active wallets.
- Register both in `src/payload.config.ts`; add a generated migration under `src/payload/migrations/`, update its index and `src/payload-types.ts` (`src/payload.config.ts:75`). No runtime DDL; retain historical schema-copy compatibility.

## INTENT HANDOFF
- Create `src/lib/commerce/keys/activation.ts`; modify `src/lib/commerce/keys/intents.ts`. Activation transaction locks member+chain then intent operation keys, rereads each intent, verifies beneficiary/mode/payment/holds, and sets target={chainID:84532,lock:configuredLock,recipient:verifiedSafe}, state=pending, nextAttemptAt=null.
- Use owning req and withCommerceWrite: the hook rejects unscoped updates, requires parseKeyGrantTarget and forbids target replacement (`src/payload/collections/commerce-key-grant-intents/index.ts:34`, `src/payload/collections/commerce-key-grant-intents/index.ts:47`). Skip cancelled/held intents; never reset submitted/granted/ambiguous.
- Avoid lost wakeups: settlement takes the same member+chain lock before recording intents, then attaches an existing active wallet immediately. Otherwise a payment settling just after activation's scan stays awaiting_wallet forever. Add bounded cursor-based catch-up for later eligible rows; preserve lock ordering without acquiring reservation/admission locks after the wallet lock.

## ENDPOINTS & STATES
- Create POST routes under `src/app/api/member/wallet/`: register/options, register/verify, bind/options, bind/verify; GET status. bind/options offers owned compatible credentials. Reuse canonical runtime, origin/CSRF policy, bounded WebAuthn-sized JSON, rate limits and private/no-store responses (`src/lib/member-auth/http.ts:18`).
- Page projections distinguish no entitlement; activation required; incompatible credential; approval pending; wallet bound/key pending; key issued; review/refund hold. GET never activates. Same-wallet replay returns existing state; different-wallet replacement is rejected.
- Add `src/components/commerce/wallet-activation.tsx`; expose through existing account/order surfaces using read helpers, not SDK/provider calls. next-intl copy goes in paired English/Korean catalogues; Tailwind styling only. Confirm the canonical member-page mount before UI implementation.

## TESTS
- Add `tests/member-auth/wallet/{credentials,activation,http}.test.ts` and `tests/commerce/keys/activation.test.ts`: ES256 reuse/new registration, RS256 sign-in preserved, wrong RP/origin/member/session, replay/expiry/UV failures, untrusted coordinates/address, unique-active concurrency and rollback.
- Cover concurrent settle/activate, later settlement, held/cancelled intents, immutable targets and idempotent reactivation. Mock RPC reads and assert no transaction send; pin SDK address/configuration vectors. Functional runner discovers nested tests (`tests/run-unit.mjs:54`); later DB proof and guarded UI/provider acceptance remain separate gates.

## RISKS
- Email login does not recover a lost passkey/Safe. No silent replacement or retargeting issued keys. Deleting a reused sign-in credential must not silently destroy wallet records.
- localhost and sophomores.co are distinct RPs; keys cannot migrate. Bare/www hosting must match the configured RP (`src/lib/auth/options.ts:95`). RS256-only Windows Hello users need an ES256-capable phone/security key; no compatible authenticator means activation remains pending.
- Undeployed Safes can receive keys, but later control requires Safe/signer deployment and gas. Prediction does not establish deployed ownership or recovery. RPC outage must leave payment settled and activation resumable.

## OPEN QUESTIONS FOR OWNER
- Approve direct SimpleWebAuthn dependency and pin Safe version/salt/deployment configuration; authorize a separately scoped RPC/testnet proof.
- Confirm member-page placement, lost-key recovery policy, and who funds/deploys the Safe plus factory signer. These are not permission for deployment or automatic key migration.
