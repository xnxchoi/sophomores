# Custodian take-in: NFC SUN tap session (Gemini, 2026-11-15)

**Verdict:** take in as the plan for step 9 (NFC), with the six corrections below. Nothing is built yet, and nothing enters the decision ledger until the owner confirms.

## Checked against the code
All six references match the code:
- `pg_advisory_xact_lock` in `src/lib/commerce/_shared/transaction.ts`;
- `privateResponse` in `src/proxy.ts`;
- `phone_login_intents` in `src/lib/member-auth/identifier.ts`;
- `inapp-spy` in `src/stores/Device/detectDevice.ts`;
- `toMemberPrincipal` in `src/lib/member-auth/payload-runtime.ts`;
- `MemberBadge` in `src/components/membership/member-badge.tsx`.

## Agrees with the ledger and the plan
- NFC is post-launch, with a simulated tap until then.
- The door checks our database first; the chain stays the ownership record.
- Collections go in `src/payload/`.
- The page-facing Key track is unchanged.
- A `GET` never changes state; linking and check-in are `POST`s that need the session.

## Corrections
1. **Staff identity.** The proposal identifies door staff by `users.membershipStatus === "staff"`. The verified staff identity is the `admins` collection with the `staff-better-auth` strategy (`isCmsStaff` in `src/lib/auth/access.ts`). Door check-in must use `isCmsStaff`, not a customer field.
2. **Tap intents storage.** The proposal models these as a runtime `CREATE TABLE IF NOT EXISTS`, like `phone_login_intents`. New tables should instead be a Payload collection under `src/payload/` with a migration (AGENTS.md: Payload placement and Payload-native first). The pilot pattern is legacy, not precedent.
3. **CMAC.** Node has AES but no CMAC. AGENTS.md's library-first gate applies:
    - either install a small, well-known CMAC package (needs the owner's approval);
    - or write RFC 4493 on `node:crypto`, test it against the RFC test vectors, and record why no library was used.
4. **Chip keys.** The proposal says the keys stay in server secrets, but doesn't say how. Each chip's keys should be derived from one master key per AN10922 key diversification, so the server holds one secret. Missing: who programs the chips, and the tool that does it. That is post-launch hardware work.
5. **Lost or replaced card.** No flow is described. `status: retired` exists, so a replacement retires the old chip and links a new one to the same key. This needs a staff action and an audit row.
6. **Unconfirmed foundation.** The proposal treats "the first tap links the card to a key granted earlier on the website" as settled. That is the custodian's proposed default (decision 1 in the 15 Nov gap list), not yet an owner decision. If the owner decides otherwise, sections 1 and 4 change.

## Still depends on owner decisions
- Activation timing (decision 1).
- Guest check-in method (decision 3). Guests have no card, so the door path for guests is not in this proposal.
- The network. The proposal still says Polygon or Base; the plan now recommends Base.

## Impact
- Touches only post-launch step 9 paths: `src/payload/` (an `nfc-chips` collection and a tap-intents collection), `src/app/api/nfc/*`, a `/welcome` handler, and the NFC UI.
- Nothing that works today changes. The Sunday scope is untouched.
