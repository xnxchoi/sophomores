# Owner plan reconciliation — Unlock × PortOne × NFC (2026-11-14)

**Status: Ideation checkpoint. Nothing implemented; no installs, chain/RPC, provider, credential or purchase actions.**

- Owner plan, verbatim: [owner-plan.original.md](owner-plan.original.md) (sha256 `0ae42c6b…5e39`, matches the owner's download).
- Live reconciled plan for owner review and annotation: https://claude.ai/artifact/QG4FPjgGQRCynNcoh9o4zq
- Read-only analyses: [Codex technical](analysis-codex.md), [Antigravity UX](analysis-antigravity.md). The Antigravity copy strings are drafts only; final copy goes through `/ux-writing` and en.json.

## Source-verified corrections (PublicLock v14 `fd86ed9`)
1. `expireAndRefundFor` is lock-manager only; key managers revoke with `cancelAndRefund`.
2. Online minter needs only KEY_GRANTER_ROLE (`grantKeys`, `grantKeyExtension`); keep lock manager offline.
3. Public `purchase` on a free lock lets anyone mint; set `maxNumberOfKeys = 0` (grants ignore it) or separate lock for crypto sales.
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
Option B: existing login; Unlock email-derived recipient frozen at activation; KeyGranter-only online minter after verified PortOne payment and activation; public purchase closed. PortOne T004 I2–I6 remains first. Passkeys, NFC cards, custom passes and hardware are separately approved later slices.
