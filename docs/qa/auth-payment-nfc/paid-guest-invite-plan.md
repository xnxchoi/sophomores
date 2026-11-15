# Paid guest invite: proposed plan (Codex, 2026-11-15)

> **Owner answer, 2026-11-15:** both. A member sends the invite and chooses who pays: the member (interpretation A below) or the invited guest (interpretation B, paying from the invite link without an account). So the B work below is in scope, but only for a guest arriving through a member's invite, never as open accountless checkout. Open follow-up 8b in the live plan: whether an unpaid invite holds a place (proposed: 48 hours, then it lapses). This plan is re-cut into slices after 8b: A first, then invitee-pays.

## CURRENT STATE
- Planning checkpoint: static inspection of `codex/auth-payment-nfc` at `adc1f4f`; no modifications, installs, tests, database or network calls.
- Today's guest is an account-bound admission: buyer assigns a name, issues a hashed claim, and the recipient claims using a verified account (`src/lib/commerce/guests.ts:99`, `src/lib/commerce/guests.ts:142`). This contradicts accountless email guests.
- Reuse admission/order linkage, transactional locks, holds, check-in and manifest projections. Bypass claims/claimedAccount for email guests; preserve historical records/routes. Benefits currently require claimedAccount, so their accountless eligibility needs explicit treatment (`src/lib/commerce/guests.ts:177`).
- Authenticated account-ready buyers can purchase today; anonymous buyers cannot (`src/lib/commerce/ecommerce.ts:33`, `src/lib/commerce/ecommerce.ts:263`). Despite its name, eligibility checks verified email and canonical phone binding, not approved paid membership (`src/lib/commerce/access.ts:36`, `src/lib/member-auth/payload-repository.ts:115`).
- No separate guest SKU/recipient exists. Settlement always grants membership and member_safe intents (`src/lib/commerce/ecommerce.ts:137`, `src/lib/commerce/keys/intents.ts:30`). Creating guest_email is explicitly rejected (`src/payload/collections/commerce-key-grant-intents/index.ts:38`).
- Two SKUs would make today's unselected shop offer disappear; catalogue loading requires exactly one match (`src/lib/commerce/catalogue.ts:78`). Physical shipping is mandatory in every snapshot (`src/lib/commerce/contracts.ts:34`).

## INTERPRETATION A vs B
- **A: member purchases for named guest email.** Retain buyer account, cart ownership, allowance, payment recovery and receipts. Apply an explicit approved-membership buyer check if member-only purchasing is intended; recipients require neither membership nor accounts. Current guards otherwise admit account-ready nonmembers.
- **B: anonymous guest purchases for themselves.** Add verified purchaser identity, anonymous cart/order ownership, receipt/recovery capabilities, scoped read/mutation authorization, abuse controls and anonymous webhook finalization. Required customer relationships and provider customer matching must change across reservations, admissions, payment preparation/confirmation/review/discovery. Merely enabling guest carts is unsafe (`src/lib/commerce/portone/adapter.ts:97`, `src/lib/commerce/portone/endpoints.ts:122`). No placeholder users.
- Recommend **A**: smallest change and consistent with ADR-0002's “A member can buy” context (`docs/adr/0002-guest-keys-by-email.md:9`). Treat this as a recommendation, not resolution of the ledger ambiguity.
- **Owner question (answered 2026-11-15):** both; the inviting member chooses who pays.

## PLAN
### Schema and files
- Modify `src/lib/commerce/ecommerce.ts`, `src/lib/commerce/catalogue.ts`, `src/lib/commerce/contracts.ts`, `src/lib/commerce/snapshot-hash.ts`: server-owned product kind member_card/guest_invite; digital publication requirements without weakening physical requirements; explicit SKU selection.
- Introduce snapshot v2: product kind, quantity=1, guest name/email and frozen Unlock configuration/address. Digital shippingAmount=0, no address. Preserve v1 parsing and byte-equivalent hashing; never inject defaults into historical snapshots.
- Modify `src/payload/collections/commerce-events/index.ts`: validated guest lock chain/address/configuration version and readiness configuration. Event metadata must be configured in Unlock before sales.
- Modify `src/payload/collections/commerce-admissions/index.ts`: recipient mode, check-in actor/method/evidence. Retain buyer relationship for A, guestName, existing holds/statuses; no guest user or claimedAccount.
- Modify `src/payload/collections/commerce-key-grant-intents/index.ts`: enable validated guest creation as pending with a complete target; member creation remains awaiting_wallet. Freeze recipient identity through immutable snapshot linkage. Add unique normalized chain/lock/token binding and separate delivery state, attempt/evidence/timestamps.
- Create proposed migration `src/payload/migrations/20261115_220000_paid_guest_invites.ts` and its `.json`; modify `src/payload/migrations/index.ts` and generated `src/payload-types.ts`. Actual migration directory: `src/payload.config.ts:75`. No runtime DDL or unrelated legacy schema-copy regeneration.

### Preparation and settlement
- Modify `src/lib/commerce/access.ts`, `src/lib/commerce/portone/adapter.ts`, `src/lib/commerce/portone/result.ts`: product-aware buyer policy, recipient preparation/replay comparison, digital finalization/result validation. Result currently requires shippingAddress (`src/lib/commerce/portone/result.ts:22`).
- Modify `src/lib/commerce/guests.ts`, `src/lib/commerce/keys/intents.ts`, `src/lib/commerce/keys/read.ts`, `src/lib/commerce/reservations.ts`, `src/lib/commerce/domain.ts`.
- Collect bounded validated guest name/email before payment; normalize email consistently with Unlock. Freeze them in the private transaction snapshot, copied to immutable order history. Avoid another plaintext email on intents/admissions, public metadata, URLs, logs or unrestricted projections.
- Settle using the existing owning req/transaction: validate frozen kind; settle reservation; create one guest admission; record guest_email intent; **never grant membership**. Retain order-unit locks, unique intent operationKey/entitlement and replay identity validation (`src/lib/commerce/keys/intents.ts:20`).
- Guest admission must not reserve the buyer's self-admission eventAccountKey (`src/lib/commerce/guests.ts:65`). Reject legacy claim/name-retarget operations for this recipient mode.
- Keep cumulative account+release allowance=1 (`src/lib/commerce/reservations.ts:69`). Guest SKU has its own release; both products share event capacity. Correct advertised maximumQuantity=3 without invalidating historical orders (`src/lib/commerce/catalogue.ts:87`).

### Worker and Unlock contract
- Modify `src/lib/commerce/keys/contracts.ts`, `src/lib/commerce/keys/worker.ts`; create `src/lib/commerce/keys/guest-email.ts` for orchestration/adapter contracts.
- Guest submission needs operation/attempt IDs, chain, lock, normalized email/name, canonical email+lock-derived recipient, KeyManager address and expiration. Obtain PII from the frozen snapshot, not browser parameters. Use approved libraries; Unlock/viem are absent from `package.json:1`.
- Preserve write-ahead submission, fencing and ambiguous-no-resubmit (`src/lib/commerce/keys/worker.ts:11`). Confirm token binding before marking issued. Track Unlock email acceptance separately; delivery failures must never regrant. Unknown delivery outcomes require reconciliation or provider-supported idempotency.
- Research gate: raw Locksmith grant takes recipient/expiration/manager and returns hash, not proof of email delivery (`docs/qa/unlock-integrator-20261114/report.md:472`). Validate protected email-metadata registration, email trigger/resend authorization and native KeyManager cancellation compatibility before implementation claims.

### UI, door and refunds
- Modify `src/app/(site)/shop/page.tsx`, `src/components/commerce/offer.tsx`, `src/components/commerce/checkout.tsx`, `src/components/commerce/payment.tsx`, `src/components/commerce/order-admissions.tsx`: explicit product choice, recipient form instead of shipping, order-scoped key/delivery states instead of claim links. Pages consume helpers.
- Modify `src/payload/admin/commerce/fields.tsx`, `src/payload/admin/commerce/event-manifest.tsx`; create `src/payload/admin/commerce/guest-check-in.tsx` and `src/lib/commerce/keys/guest-check-in.ts`.
- Authorize only door operations through isCmsStaff; preserve superadmin refund/fulfillment privileges. Today's endpoint also rejects ordinary staff (`src/lib/commerce/domain.ts:60`).
- Verify the exact signed QR data against pinned Locksmith signers, resolve chain+lock+token to our admission, then atomically check holds/consume and audit actor/method; audited name fallback uses the same lock (`docs/qa/auth-payment-nfc/unlock-qr-verification.md:28`).
- Create `src/lib/commerce/guest-refunds.ts`: audited unused-invite refund eligibility, immediate hold and verified-refund projection. Reuse `src/lib/commerce/benefit-review.ts:25`; do not impersonate a physical return (`src/lib/commerce/returns.ts:38`). Separate cancellation worker remains a launch dependency.
- Modify `messages/en.json` and structurally mirror `messages/ko.json`; preserve existing Korean values. Tailwind-only styling. B additionally changes account-gated payment/order pages plus `portone/endpoints.ts`, `portone/pending.ts`, `portone/review.ts` and purchaser-related Payload collections.

## TESTS
- Create `tests/commerce/domain/paid-guest.test.ts` and `tests/commerce/keys/guest-email.test.ts`: SKU pricing/eligibility, frozen recipient replay, no membership/account/self-occupancy, duplicate settle, rollback, cap/capacity, delivery-vs-grant failures and ambiguous fencing.
- Create `tests/commerce/keys/guest-check-in.test.ts`: staff boundary, malformed/untrusted QR, duplicate scans, name audit, refund race/late grant.
- Extend existing catalogue/contracts/result and checkout/guest UI tests; functional discovery is recursive (`tests/run-unit.mjs:54`). Later extend `tests/commerce/core/membership-grant.db.test.ts` for real transaction replay/rollback via the opt-in proof launcher. Synthetic tests do not establish DB concurrency or provider delivery.
- Future authorized runs use resource guards; live UI review and controlled Base Sepolia email/refund proof are separate gates. Nothing runs during this research.

## RISKS
- A/B unresolved; B's one-per-buyer rule cannot rely on cookies or unverified email. Snapshot/hash compatibility, anonymous recovery and accidental membership grants are primary regression risks.
- Unlock event metadata is necessary for the QR PDF, not sufficient proof of delivery; email-derived addresses are guessable, forwarded QRs are bearer credentials, DB access is still required at the door, and guest cancellation authority remains unverified (`docs/adr/0009-refund-cancels-key.md:40`).
