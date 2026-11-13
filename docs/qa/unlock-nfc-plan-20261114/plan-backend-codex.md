# Backend Implementation Plan

**Planning checkpoint only:** no modifications or external calls performed. The reconciliation’s two owner-decision rounds supersede its earlier recommendation and incompatible historical designs. References: `docs/qa/unlock-nfc-plan-20261114/reconciliation.md:34`, `docs/qa/unlock-nfc-plan-20261114/reconciliation.md:57`, and T004’s slice contracts at `docs/qa/t004-a-20261111/reconciliation-design.md:274`.

Each numbered slice is **one isolated worktree assignment**, based on accepted integration commits—not another worker’s unmerged branch. Shared files transfer ownership sequentially.

Path prefixes below: **C** = `src/lib/commerce/`; **P** = `src/lib/payload/collections/`; **T** = `tests/commerce/`. New names are proposed.

## Numbered Assignments

### 1. T004 I2 — Durable Reconciliation Admission

**Base:** integrated I0/I0DB/I1; owner-approved numeric policy.

**Owns:** `C/portone/{admission,accounting}.ts` (new), `adapter.ts`, `review.ts`, `endpoints.ts`; new Payload collections `commerce-payment-work` and `commerce-provider-budgets`; registration and corresponding migration.

**Acceptance:**
1. Concurrent processes join one exact attempt; fencing survives restart without assuming lease expiry stopped earlier work.
2. Every dispatched provider GET—including confirmation’s two reads—consumes durable allowance before dispatch; whole-operation capacity is reserved.
3. Signed-risk reserve/global limits survive restart; exhaustion stops safely without losing risk evidence.

**Tests:** `T/portone/admission.test.ts`, `accounting.db.test.ts`.

**Approvals:** I2 defaults, migration/disposable-DB scope; no provider credentials required for synthetic tests.

### 2. T004 I3 — Official Settlement And Webhook Integration

**Base:** 1.

**Owns:** `C/portone/{endpoints,adapter,review,proof}.ts`, `C/ecommerce.ts`; durable `commerce-payment-events` collection with unique authenticated event identity; migration/registration.

**Acceptance:**
1. Browser, reconciliation and signed-event races reach the same official finalizer, producing one order/allocation.
2. Second-read reversals survive rollback/quarantine; late PAID never reopens released reservations.
3. Forged, duplicate and out-of-order events cannot regress holds or trigger replacement payments.

**Tests:** extend `T/portone/{webhook,adapter,review}.test.ts`; add `settlement-races.db.test.ts`.

**Approvals:** migration/DB proof; sandbox invocation and webhook registration under the existing 30-payment ceiling. Verify TEST mode without exposing credentials.

### 3. T004 I4 — Identity And Exact-Attempt Recovery

**Base:** 2.

**Owns:** `C/portone/{pending,result}.ts`, `src/components/commerce/{checkout,payment}.tsx`, existing `src/components/tickets/{portone-checkout,portone-payment-result}.tsx`; only their member-readiness integration.

**Acceptance:**
1. Account changes invalidate private results and dispatch at every asynchronous boundary.
2. Multiple attempts require explicit selection; absence/overflow never authorizes another charge.
3. Older completions cannot erase newer pointers; actual draft/storage limitations remain explicit.

**Tests:** `T/portone/identity-recovery.test.ts`, `T/ui/payment-identity-dom.test.tsx`.

**Approvals:** readiness/history-retention contract; public verification enablement remains separate. No wallet authentication replacement.

### 4. T004 I5 — Bounded Automatic Restoration

**Base:** 3 and approved waiting policy.

**Owns:** slice 3’s payment components; `src/app/(site)/{shop,tickets}/payment/page.tsx`; `C/portone/confirm-transport.ts`; affected `messages/en.json` keys and matching empty Korean additions.

**Acceptance:**
1. Restore performs local result read → eligible reconciliation; never automatically opens SDK, resumes, retires or creates payment.
2. Waiting ends within the approved bound without cancelling legitimate server work.
3. Lost bodies, stale identity and cart-refresh failures preserve known financial results.

**Tests:** extend `T/ui/payment-dom.test.tsx`; browser restoration/redirect coverage under `tests/browser/`.

**Approvals:** bounded UI execution/copy scope and device/provider checks. Completion requires live render plus harsh Santa review.

### 5. T004 I6 — Browser-Independent Catch-Up

**Base:** 2–4.

**Owns:** new `C/portone/catch-up.ts`; slice-1 work discovery and slice-2 inbox integration; approved runtime invocation entrypoint and existing superadmin review integration.

**Acceptance:**
1. Browser closure, webhook loss and process restart recover the original attempt without another charge.
2. Crash windows preserve debits, risk and settlement evidence.
3. Exhaustion reaches an actionable superadmin queue; no invented notification promise.

**Tests:** `T/portone/catch-up.test.ts`, `catch-up.db.test.ts`, restart fixtures.

**Approvals:** service identity, invocation/scheduler, retention/escalation policy and runtime/provider proof; no new queue dependency by default.

### 6. Payload Membership And Invite Persistence

**Base:** accepted 1–5.

**Owns:** new P collections below; `P/commerce-claims/index.ts`, collection registration in `C/domain.ts`, generated types, additive migrations under `src/lib/migrations/`.

| Collection | Fields / Constraints / States |
|---|---|
| `membership-entitlements` | Order/unit, buyer, issue, paid evidence, policy version, activation timestamps; unique order-unit and approved buyer/issue acquisition key. `unactivated → activation-committed`; financial/return holds separate. |
| `account-memberships` | Unique canonical account; entitlement, frozen Safe configuration/address, chain/lock/token, manager, evidence. Unique chain/address binding and chain/lock/token identity. `reserved → issuing → confirmed`; recovery/hold dimensions separate. |
| `membership-issuance-operations` | Unique operation identity; immutable entitlement/account/target/configuration, nonce, signed transaction reference/hash, attempts, receipts/block evidence. `ready → submitting → submitted/unknown → confirmed`; retry only after demonstrated nonexecution. |
| `guest-invites` | Buyer/event/slot, capability digest, recipient, actual payer/payment, price/quota versions, separate lock/token, admission, usage and refund references. Unique buyer/event/slot, digest and bound event/account. Offer/payment, claim, attendance and refund states remain separate. |

Claims gain capability generation and nonexpiring membership activation support; preserve historical expiry evidence.

**Acceptance:** uniqueness/privacy enforced in PostgreSQL; migration/backfill reconciles legacy rows without fabricating activation or issuance.

**Tests:** `T/membership/{collections,migration}.test.ts`, `constraints.db.test.ts`.

**Approvals:** schema, access, migration/backfill/rollback and isolated-DB scope.

### 7. Main Product And Return Policy Wiring

**Base:** 6.

**Owns:** `C/{contracts,reservations,ecommerce,token-entitlements,returns}.ts`; affected product configuration and active tests.

**Acceptance:**
1. Main purchase quantity is one; concurrent attempts enforce the approved buyer-scope cap.
2. Settlement records one paid bundle, with no automatic extra-unit gift creation.
3. Return acceptance serializes against activation; physical receipt, KRW cancellation and stock disposition remain distinct.

**Tests:** extend `T/domain/{allocation,reservations,returns,token-entitlements}.test.ts`.

**Approvals:** buyer-cap scope, activation/return cutoff and legal/PG boundary; no automatic membership revocation.

### 8. Passkey-Owned Counterfactual Safe And Activation

**Base:** 7.

**Owns:** new `C/membership/{safe,activation,endpoints}.ts`; `C/domain.ts`; narrowly scoped existing member-auth challenge integration.

**Acceptance:**
1. Domain-bound, one-use WebAuthn challenges verify origin/RP-ID, UV, account and explicit intent; in-app handoff precedes prompting.
2. Server derivation freezes initial owners, threshold, salt, Safe/factory/module/verifier versions and addresses, chain and resulting address. Client-supplied targets cannot override it.
3. One commit consumes activation capability, reserves membership and records issuance intent; GET/cancel never activates.

**Tests:** `T/membership/{safe,activation}.test.ts`, `activation.db.test.ts`; browser/device handoff tests.

**Approvals:** named/pinned SDK installs after documentation review; production RP-ID, helper-contract/RPC inspection, device scope. Email/Google sessions remain canonical.

### 9. Issuance Worker And Amoy Proof

**Base:** 8.

**Owns:** new `C/membership/{issuance,reconciliation,runtime}.ts`; issuance-operation persistence; bounded worker entrypoint.

**Acceptance:**
1. Durable intent and transaction identity precede broadcast; chain I/O occurs outside DB transactions.
2. Restart/timeout reconciles receipt, nonce and exact grant evidence; missing index data never permits blind regrant.
3. Amoy proof verifies recipient, offline key manager, perpetual expiry, one-key/address and closed public purchase.

**Tests:** `T/membership/{issuance,reconciliation}.test.ts`, restart/DB tests and separately gated testnet integration.

**Approvals:** RPC/testnet writes, fresh lock/configuration, gas funding, online KeyGranter and separate offline custody. Granter compromise still permits arbitrary grants/extensions despite supply closure.

### 10. Audited Recovery And Sponsored Owner Changes

**Base:** 9.

**Owns:** `C/membership/{recovery,safe-owners}.ts`; new `P/membership-recoveries/index.ts`, migration and recovery endpoints.

**Acceptance:** owner swap preserves Safe address/token; verified total-loss recovery uses offline-manager `lendKey` to a newly frozen Safe; replay/unknown outcomes never cause duplicate moves or cross-person transfers.

**Tests:** `T/membership/{recovery,safe-owners}.test.ts`, gated Amoy cases.

**Approvals:** identity/consent standard, sponsorship transport/budget, backup-owner threshold, offline signing and chain writes.

### 11. Discounted Guest-Invite Lane

**Base:** 9–10.

**Owns:** `C/guest-invites/{eligibility,payment,claim}.ts`; invite collection; narrowly scoped existing payment/snapshot hooks.

**Acceptance:** configured quota is concurrency-safe; actual payer and discount are frozen through existing PortOne settlement; separate-lock issuance cannot create a main membership or second event seat.

**Tests:** `T/guest-invites/{eligibility,payment,claim}.test.ts`, quota races.

**Approvals:** eligibility/price/capacity and issuance timing; separate lock/RPC writes; sandbox budget allocation.

### 12. Door Authority

**Base:** 10–11.

**Owns:** `C/guests.ts`, membership/invite eligibility integration and admission action contracts.

**Acceptance:** one paid eligible admission is consumed atomically; activation and attendance remain distinct; legacy name-only bypass is retired without deleting historical usage.

**Tests:** `T/domain/door.db.test.ts`, authenticated operator/browser tests.

**Approvals:** door authority, chain-outage policy and operator/device proof.

### 13. Unused-Invite Refunds

**Base:** 11–12 and accepted I6 runtime.

**Owns:** `C/guest-invites/refunds.ts`, new Payload refund-operation collection/migration; PortOne cancellation integration.

**Acceptance:** event-finalized unused invites refund the actual payer once; timeout reconciles before retry; credit requires authorized explicit choice and approved terms, never silent substitution.

**Tests:** `T/guest-invites/refunds.test.ts`, refund/check-in races and sandbox cancellations.

**Approvals:** legal/PG cancellation windows, event-finality rule, payer-versus-buyer credit consent and refund credentials.

## Remaining Gates / Not Yet Built

- Clarify buyer-cap scope, activated-existing-member purchases, guest token lifetime/activation timing and return cutoff.
- Resolve I2’s proposed schedule versus GET budget/reserve and 30-minute escalation; defaults remain unapproved.
- Verify Safe helpers on Amoy and Polygon. Sponsorship transport is unproven; grants need no Safe deployment/paymaster.
- **Do not build yet:** NTAG/SUN provisioning, cards, passes, Apple/Google credentials, hardware purchasing, embedded wallets, Unlock login/checkout, public crypto purchase or deployment. These require separate follow-on assignments.



---
