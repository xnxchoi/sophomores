# Owner plan reconciliation — Unlock × PortOne × NFC (2026-11-14)

**Status: Ideation checkpoint. Nothing implemented; no installs, chain/RPC, provider, credential or purchase actions.**

- Owner plan, verbatim: [owner-plan.original.md](owner-plan.original.md) (sha256 `0ae42c6b…5e39`, matches the owner's download).
- Live reconciled plan for owner review and annotation: https://claude.ai/artifact/QG4FPjgGQRCynNcoh9o4zq
- Read-only analyses: [Codex technical](analysis-codex.md), [Antigravity UX](analysis-antigravity.md). The Antigravity copy strings are drafts only; final copy goes through `/ux-writing` and en.json.

## Source-verified corrections (PublicLock v14 `fd86ed9`)
1. `expireAndRefundFor` is lock-manager only; key managers revoke with `cancelAndRefund`.
2. Online minter needs only KEY_GRANTER_ROLE (`grantKeys`, `grantKeyExtension`); keep lock manager offline.
3. Public `purchase` on a free lock lets anyone mint; set `maxNumberOfKeys` to the current supply (0 only if nothing is minted: `updateLockConfig` reverts `CANT_BE_SMALLER_THAN_SUPPLY` below supply). Grants ignore it. Or use a separate lock for crypto sales.
4. Webhooks are lossy hints (report §2.9); confirm on-chain.
5. Grants enforce `maxKeysPerAddress` (default 1); multi-unit buyers cannot hold all keys.
6. The owner's lock already exists; read its state before reuse/redeploy.
7. `cancelAndRefund` pays crypto from the lock balance, never KRW; KRW refunds stay with PortOne.
8. `grantKeys` takes explicit expirations; an indefinite token needs `type(uint).max`.

## External fact-check (official sources, 2026-11-14)
Confirmed: Stripe lacks Korea as an account country; Circle USDC on Polygon is `0x3c49…3359` (Unlock config's `0x2791…4174` is bridged).
Corrected: `@unlock-protocol/networks` field is `unlockAddress`; viem/ox WebAuthn defaults are `residentKey: preferred`, `userVerification: required`, and overrides replace the whole object; Safe passkeys need helper contracts on the target chain (unchecked on 137); NTAG 424 SUN encryption is optional, SDMMetaReadKey is not UID-diversified, replay rejection is ours; Apple uses an "NFC certificate" plus VAS terminals; Openfort paid tiers $99–$599; Unlock-generated passes are QR, not NFC.
Unchecked: Bithumb fees/holds, token prices, hardware vendors, engraving costs.

## Conflicts with adopted owner decisions (owner to decide)
NFC role (activation vs check-in), gift minting timing, refund→revocation, member address (email-derived vs passkey), login method, door authority (ledger vs live chain read), cards/passes as launch blockers. The plan also lifts the 2026-11-13 Unlock pause once the owner confirms direction.

## Recommendation
Option B: existing login; Unlock email-derived recipient frozen at activation; KeyGranter-only online minter after verified PortOne payment and activation; key manager a separate offline address (otherwise a leaked granter key could also cancel every key); public purchase closed. PortOne T004 I2–I6 remains first. Passkeys, NFC cards, custom passes and hardware are separately approved later slices.

## Workflow sessions (for Phase 3 resume)
- Codex analyzer session: `01a1d5ce-d6fc-7502-ba6b-324b96199e3a`
- Antigravity analyzer session: `470d0d12-523e-4e8a-b378-5d962a833ab6`

## Owner decisions from the live-doc thread (owner comments 2026-11-13 16:59Z – 18:14Z)
Recorded from the owner's own comments in the live doc; the in-doc assistant's replies were re-checked by the custodian.
- **Option:** B's server issuance with **Safe** smart accounts per member (not mixed); Antigravity's optional passkey added later as a second owner. Unlock's own login and checkout stay unused; public purchase closed.
- **NFC card:** activation on first tap, then check-in credential.
- **Product:** no unit selection; one unit per buyer. The main product is a shipped magazine issue; the membership token is part of the bundle. Magazine returns accepted only while the key is unactivated (legal/PG review confirms).
- **Guest invites (new lane):** each buyer may send one invite (configurable; may become 2) as a separate airdrop; payer selectable (buyer pays, or guest pays) at a discounted invite price; unused invites auto-refund after the event to whoever paid.
- **Refunds on keys:** leaning none; legal/PG review sets the boundary.
- **Cards and passes:** follow-ons started right after launch.
- **Lock:** set up fresh after Bithumb funding; not blocking slices 2–3.
- **Caps:** per-member 1; guest-invite 1 (maybe 2).
- **Key custody:** platform stays key manager and moves keys on request.
- **PortOne:** owner placed TEST credentials in `.env.local` (store ID, channel key, API secret, webhook secret present; mode unverified until first sandbox call within the approved 30-payment cap).

## Custodian corrections to the thread (source-verified, PublicLock v14 `fd86ed9`)
1. T004 I2 "numeric limits" are reconciliation budgets (provider reads per attempt, rate budget, deadlines, critical-risk handling on exhaustion; reconciliation-design.md "Remaining owner decisions"), not per-member caps or the 30-payment sandbox cap. Still open; custodian to propose defaults.
2. `transferFrom` resets `keyManagerOf` to zero; `lendKey` moves a key and keeps `msg.sender` as key manager. `_transferNotDisabled` lets only a lock manager transfer when the fee is ≥100%. Move with `lendKey`, fee <100%; members cannot self-transfer while we are key manager.
3. `grantKeys` calls `onKeyGrantHook(tokenId, granter, recipient, keyManager, expiry)`; Unlock's stock token-gate is a purchase hook. Server check covers the guest lane.
4. A login is not a Safe signer and the Safe address derives from its initial owners: an owner key must be chosen before activation (embedded-wallet provider recommended; passkey-at-activation; or custodial).
5. No paymaster at launch: grants go to undeployed Safes and moves use `lendKey`.

## New owner decisions opened
Safe owner at activation; whether "moves only through us" replaces T002-A R14 (activated token non-transferable); invite auto-refund feasibility after the event (PG cancellation windows).

## Owner decisions, second round (live doc, 2026-11-13 18:53Z – 19:13Z)
- **Safe owner:** a passkey created at activation (option b). Detect and escape in-app browsers (KakaoTalk, Naver) before the prompt.
- **Recovery:** synced passkey; optional member-added backup wallet as a second owner (we sponsor that transaction). If both are lost, the platform (key manager) moves the membership key to a new Safe with `lendKey` after identity verification. No embedded-wallet vendor.
- **Transfers:** R14 stays for transfers between people. A member changes wallets by Safe owner swap (key and address unchanged), sponsored by us on request.
- **Invite refunds:** disclose at purchase; card refund by default (PortOne: card cancellation usually possible up to about 1 year, varying by issuer); store credit only by the buyer's explicit choice with posted terms and expiry (credit-only refunds risk KFTC action). Legal review signs off.

## Custodian correction (second round)
WebAuthn credentials are scoped to the relying-party ID, so a member's passkey signs only on our domain; Safe{Wallet} and other apps cannot use it. Self-managed exit requires the optional backup wallet; until then owner swaps run through our site. A sponsored owner swap also deploys the Safe on first use, so it needs a bundler/paymaster only at that moment.

## T004 I2 proposed defaults (pending owner approval in the live doc)
Provider GET deadline 10 s; customer wait bound 30 s; re-check schedule 2 s/5 s/15 s/1 min/5 min then hourly; 12 GETs per attempt; 4-GET reserve for signed risk events; 24 h automatic lifetime; global ceiling 5 GET/s (PortOne limit unconfirmed); escalate to superadmin review when budget spent or unresolved after 30 min; operator superadmin only.
