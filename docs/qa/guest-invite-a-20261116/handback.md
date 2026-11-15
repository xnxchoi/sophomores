# SPH-GUEST-INVITE-A-20261116-01 — handback

**State: candidate.** All four acceptance criteria and all four gates pass. Nothing is merged, pushed or deleted. The branch merges into `codex/auth-payment-nfc`, never into `main`.

- Branch: `codex/guest-invite-a-20261116`, renamed from Orca's `xnxchoi/…` as the coordinator instructed.
- Base: `f6c402f` on `codex/auth-payment-nfc`. The spec's own commit is `4657dbb`; later base commits are docs only.
- Worktree: `~/orca/workspaces/sphmrs/guest-invite-a-20261116`.
- Commit, and the hash of `git diff f6c402f..HEAD`: see the `worker_done` message (written after this file is committed).

## What was built

### 1. Product
- Products gain `productKind` (`membership` | `guest_invite`, default `membership`).
- `loadCommerceOffer` without a product ID now selects only `productKind = membership`. The shop's unselected offer is therefore unchanged when a guest-invite product is also published.
- Two published membership releases still return `null`, as before.
- A guest-invite product is only ever addressed by its ID.
- Offers carry `kind`.
- A guest offer's quote counts stock only. The invite already holds the event place, so counting event capacity would block its own checkout.
- A product's kind is immutable after reservation or sale, alongside the existing event rule.

### 2. Invite record
The collection is `src/payload/collections/commerce-guest-invites`.
- Fields: `inviter`, `event`, `product`, `payer`, `guestName`, `guestEmail` (trimmed and lowercased), and `state`: `pending_payment` → `paid` | `lapsed`, then `paid` → `used` | `refunded`.
- Also: `activeKey`, `holdExpiresAt`, `holdReleasedAt`, `order`, `transaction`, `admission`, the `paidAt`/`lapsedAt`/`usedAt`/`refundedAt` timestamps, `memberNotice`, and `memberNotifiedAt`.
- It is server owned. Identity and the deadline are immutable, and states only move forward.
- `payer` already includes `guest`, so the invitee-pays slice needs no row migration. Creation rejects `guest` for now.
- `activeKey` is unique and is set while an invite is pending, paid or used. It allows one open invite per member per guest product, which bounds how much capacity one account can hold. A lapse or a refund clears it.

### 3. Checkout and settlement
- **Creating an invite.** `createGuestInvite` (`src/lib/commerce/guest-invites.ts`) requires a `users` account and an active member (injectable check), a guest name and email, and a published guest offer.
  - Under the event lock it checks capacity and adds 1 to `event.reservedQuantity`. That is the hold.
  - The hold expires 48 hours after the invite is sent.
- **Paying.** The member pays through today's account checkout.
  - `buildCommerceSnapshot` finds the member's open invite and refuses a shipping address. It freezes `guestInviteID` into the snapshot, with `shippingAmount` 0 and one unit.
  - The `initiate` input accepts no address only for this product.
  - `reservePurchase` binds the reservation to the invite (`commerce-reservations.guestInvite`) and does **not** reserve event capacity a second time.
  - A new attempt must start before `holdExpiresAt`. The confirm path's replay is exempt, so a card charged at 47:59 still settles at 48:01.
- **Settling** (in the transaction-success hook, same transaction):
  - `settleReservation` turns the held place into a commitment (reserved −1, committed +1).
  - `grantOrderAdmissions` creates one admission named after the guest and linked to the invite, with **no** event-account occupancy for the buyer.
  - `markGuestInvitePaid` marks the invite paid.
  - The membership grant and member key intents are **skipped** for this product.
  - Replay is a no-op, and a mismatched binding rolls the settlement back.
- **After settlement.**
  - The result reader (`portone/result.ts`) accepts an address-less guest order and still enforces addresses for membership orders.
  - A verified failed attempt releases its stock and allowance but leaves the invite's place held.
  - A verified cancellation of a paid, unused invite revokes the admission, returns the place, marks the invite `refunded` and frees the member's slot.

### 4. The 48-hour hold
`lapseDueGuestInvites({ req, now })` is explicitly invoked and runs in the caller's transaction. There is no scheduler.
- It lapses due `pending_payment` invites, releases each place once, and sets `memberNotice = "lapsed"` as the "member to notify" marker.
- No email is sent.
- An invite with a live (`reserved`) card attempt is reported as `deferred`, not lapsed, so nobody is charged for a released place.
- Paid invites are never touched.

### 5. Today's account-bound guest claim
It works unchanged; the existing guest and claim suites pass. `issueGuestClaim` and `assignGuestName` refuse an invite's admission. Door `checkInGuest` marks the invite `used`.

### 6. Guest key
Not built. Nothing under `src/lib/commerce/keys/*` or the key-grant collection was edited. See "What the guest key needs" below.

## Acceptance

| # | Criterion | Evidence |
|---|---|---|
| 1 | Paid; guest admitted against capacity; no membership change; replay is a no-op | DB proof, case 1. The inviter is deliberately `applicant`, a grantable status, so an accidental grant would show. After settle: the invite is paid and linked; event reserved 0 and committed 1; one guest admission with no occupancy key; 0 key intents; membership still `applicant`; 0 accounts for the guest email; the local result reads `confirmed`. A replayed confirm changes nothing. Unit tests in `tests/commerce/domain/guest-invites.test.ts` cover the same. |
| 2 | Hold; one lapse after 48 hours; second run no-op; paid never lapses | Unit tests: nothing lapses at 48h − 1 ms; at 48h it lapses and releases the place; a second run changes nothing; a paid invite at +96h is unchanged; a live attempt is deferred; after a lapse the member can invite again. DB proof, cases 1 and 3. |
| 3 | Shop offer unchanged; today's claim works | `tests/commerce/core/guest-invite-catalogue.test.ts`: `loadCommerceOffer()` deep-equals the membership-only result. The existing catalogue, contracts, guests, claim and quantity suites all pass. The historical snapshot hash is pinned to the value computed on the base commit. |
| 4 | Settlement and lapse on PostgreSQL, with rollbacks | `tests/commerce/core/guest-invite.db.test.ts`, run by `tests/support/database-proof.mjs`. A deferred-constraint COMMIT failure on settle rolls back everything; the invite stays pending with its place held. A forced rollback of a lapse keeps the invite and its place. |

**Tests that failed first.** The new test files ran before any implementation. They failed (`Cannot find module …guest-invites`, `…commerce-guest-invites`): `evidence/01-red-before-implementation.txt`.

That RED is at module level, not per behaviour. Each behaviour was then implemented against those tests. One fixture gap was found and fixed in the test: the catalogue test's invite lacked `payer`.

## Gates (final code)

- **Typecheck:** `tsc --noEmit`, guarded at 4 GiB with `--node-old-space-mib 2048`. 0 errors, exit 0 (`evidence/05-typecheck.metrics.json`).
- **Default suite:** `node tests/run-unit.mjs`, guarded at 4 GiB with 2048 MiB. 2,909 tests: 2,864 pass, **2 fail**, 43 skipped, 0 cancelled. The 2 failures are the known owner-deferred styling suites, `tests/styling/deferred-article-grid.test.tsx` and `tests/styling/deferred-clock-delegation.test.ts` (`evidence/03-*`).
- **DB proof:** `node tests/support/database-proof.mjs`, guarded at 3 GiB. Sunday membership 5/5 and guest invite 4/4, exit 0 (`evidence/04-*`).
- **`git diff --check`:** clean.
- **ESLint** on the changed files: 0 errors and 0 warnings, after a test-only fix to an unused variable. I re-ran that test file and the typecheck afterwards.

**Resource events, reported plainly.**
- The first default-suite launch was stopped by the guard, "system headroom exhausted" (exit 137), after 2.7 s while Docker Desktop was running.
- The first DB-proof retries were refused three times for insufficient headroom.
- Nothing was relaunched unguarded or with higher limits. I waited for headroom, ran the DB proof, quit Docker, then ran the suite.
- Every receipt lists no remaining PIDs.

## Schema

- **Migration:** `src/payload/migrations/20261115_183810_guest_invites.ts` plus its `.json` snapshot, registered in `migrations/index.ts`. The timestamp is UTC.
  - Generated by Payload's `migrate:create`, run under `env -i` with a synthetic secret and an unreachable `DATABASE_URI`; no `.env` was read.
  - Additive: the new table and 3 enums; `product_kind` on `products` and `version_product_kind` on `_products_v`, both defaulting to `'membership'`; `guest_invite_id` on `commerce_admissions` and on `commerce_reservations`; and the `payload_locked_documents_rels` column, foreign key and index.
- **Hand fix.** The generated `down` dropped the table with CASCADE before dropping the foreign keys that pointed at it, so `down` failed. I reordered it to drop the constraints, indexes and columns first, with `IF EXISTS`, as the key-grant migration does. I also normalized the generated SQL whitespace for `diff --check`.
- **Migration proof**, on a disposable `postgres:16` container on loopback port 55494, removed afterwards:
  - The full chain applied cleanly, including this migration.
  - `migrate:down` reverted this migration and left no table, column or type behind.
  - A `products` row inserted while the column was absent reads `membership` after re-applying.
  - Note: on a fresh database, `migrate:down` reverts the whole first batch. It continued past this migration and stopped, by design, at `20261114_000000_commerce_reconciliation`, which refuses rollback. That is pre-existing behaviour.
- **Types.** `src/payload-types.ts` was regenerated with `generate:types` under the same synthetic environment. The diff is additive.
- `src/payload-generated-schema.ts` was **not** regenerated.

**Deviation from the shared rules.** `DATABASE_URI` and `PAYLOAD_SECRET` were set inline, with synthetic values, only for type generation, migration generation and the disposable migration proof. This follows the procedure of the 2026-11-15 Sunday-launch slice.

## What the guest key needs (for the key slice)

Live keys run on Polygon and testing on Base Sepolia (ADR-0010).

1. **Settlement intent.** In the guest branch of the transaction-success hook (`src/lib/commerce/ecommerce.ts`, after `markGuestInvitePaid`, same transaction), record one `guest_email` key-grant intent for the invite's admission:
   - `entitlement` = the admission;
   - `operationKey` = `keyGrantOperationKey(orderID, 1)`;
   - `beneficiaryUser` empty: the guest has no account, and `admission.buyer` is the member, not the beneficiary.
2. **What blocks that today.**
   - The collection rejects `guest_email` on create (`commerce-key-grant-intents/index.ts`, "Guest key grants are not enabled yet").
   - `recordKeyGrantIntents` asserts `member_safe` and beneficiary = buyer (`keys/intents.ts`).
   - Both need a guest variant. The guest variant's create state cannot be `awaiting_wallet`; it needs a complete target.
3. **Recipient.** Read `guestEmail` and `guestName` from the invite row, which is immutable and normalized at creation, not from a browser parameter or the snapshot. Derive the email-airdrop recipient address from email plus lock, per Unlock's email-airdrop pattern. Avoid copying the email onto intents, admissions, logs or URLs beyond what the dispatch target needs.
4. **Event lock.** `commerce-events` needs guest-lock configuration:
   - chain (137 live, 84532 test);
   - lock address, KeyManager address, and the key expiration;
   - Unlock **event** metadata registered before sales, because Unlock attaches the QR `ticket.pdf` only for event locks (ADR-0007).
   Today's allowed chains in `keys/contracts.ts` are 8453 and 84532; Polygon needs adding there.
5. **Delivery state.** Track Unlock's email acceptance separately from the grant. A delivery failure must never regrant.
6. **Refund.** When `releaseReservation` marks an invite `refunded`, call the guest equivalent of `cancelOrderKeyGrants` so that an undispatched intent is cancelled and a granted key is flagged for cancellation (ADR-0009).
7. **Door.** QR verification resolves chain, lock and token to the admission, whose `guestInvite` is set. Then `checkInGuest` consumes it and marks the invite `used`. That is already wired for the name fallback.

## Not done, and left for later

- **HTTP entry for creating an invite.** It is not exposed. Options: a `guest-operations` action or an endpoint on this branch, which pages would then call.
- **Checkout UI for the address-less purchase.** `src/components/commerce/payment.tsx` always sends a shipping address. Both are page/mechanism follow-ups.
- **Scheduler and email.** No scheduler invokes the lapse, and the member's lapse email is not sent. Rows carry `memberNotice = "lapsed"` with `memberNotifiedAt` null.
- **Stuck pending attempt.** An invite whose card attempt never resolves stays deferred until the existing pending/retirement path releases that reservation. After that, the next lapse run releases it.
- **Order handling for digital products.** Guest orders still get the default fulfillment status `pending`, so they would appear in a shipping queue. `acceptUnitReturns` (physical returns) is not adapted for a digital invite.
- **Guest benefits.** `redeemGuestBenefit` requires a claimed account, so an invite's guest gets no drinks or transfer perk. This needs an owner decision.
- **Duplicate guests.** The same guest email invited by two members to one event is not prevented.
- **Invitee pays.** Only `payer = member` can be created in this slice.

## Files

**Source:**
- `src/lib/commerce/{guest-invites.ts (new), catalogue.ts, contracts.ts, domain.ts, ecommerce.ts, guests.ts, reservations.ts}`
- `src/lib/commerce/portone/{adapter.ts, result.ts}`
- `src/payload/collections/{commerce-guest-invites/index.ts (new), commerce-admissions/index.ts, commerce-reservations/index.ts}`
- `src/payload/migrations/{20261115_183810_guest_invites.ts, .json, index.ts}`
- `src/payload-types.ts`
- `messages/{en,ko}.json`: 7 new `Staff.schema` admin labels; Korean is a structural mirror with `""`, and no existing Korean was touched.

**Tests:**
- `tests/commerce/domain/{guest-invites.test.ts, guest-invite-collection.test.ts}` (new) and `storage-fake.ts` (date filter)
- `tests/commerce/core/{guest-invite-catalogue.test.ts, guest-invite.db.test.ts}` (new) and `payment-postgres-fixture.ts` (provider amount taken from the snapshot)
- `tests/support/database-proof.mjs`: new proof entry
- `tests/fixtures/copy-loop-preview.tsx`: offer `kind`

**Docs:** this handback and `evidence/`.

## Remaining processes and cleanup

- Docker Desktop was started for the proofs and quit afterwards.
- No proof containers or volumes remain.
- No dev server or other guarded job is running.
- Local scratch (`.tmp/`: logs and the install receipt) is untracked and not committed.
