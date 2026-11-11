# Frozen current source map — T004-A

Source facts only unless explicitly described as an unproved gate. No modules were
imported/executed and no DB/provider was contacted. All source anchors below are
relative to `/Users/seanschoi/Projects/sphmrs`; hashes/ranges are machine-checked in
[source-anchors.json](source-anchors.json) and frozen in the candidate manifest.
S01 and S24 are groups: S01a–c and S24a–d respectively.

## Call graph and authority

Shop or payment route → account/member + identity gate → CommercePayment → own
pending discovery / manual check / explicit prepare-resume-retire. A check chooses
installed hook when cart exists or direct **same** official confirm endpoint when
no cart exists. Wrapper risk preflight → generated official handler initializes
transaction → adapter fetch/verify/lock → official finalizeOrder → atomic transaction
claim/order/cart/inventory/transaction writes → project reservation/admission hooks
→ generated commit/rollback → wrapper deferred-risk flush.

Signed webhook → authority/raw-byte signature/store validation → server-selected
transaction tuple/customer → private verified request capability + risk preflight
→ same configured confirm handler. Capability and temporary request fields are
restored even on failure. Resume and retire are distinct explicit endpoints.

## Frozen anchors

| ID | Path and lines | Source-backed finding / limitation |
|---|---|---|
| S01a | `src/app/(site)/shop/page.tsx:1–20` | Shop mounts the inline account gate and current CommerceCheckout. |
| S01b | `src/app/(site)/shop/payment/page.tsx:1–21` | Redirect/result route mounts recovery CommercePayment, no query-result proof or automatic restoration confirmation. |
| S01c | `src/app/(site)/shop/orders/[id]/page.tsx:1–22` | Canonical order route hosts owner-gated admissions; it is not a new settlement writer. |
| S02 | `src/components/commerce/checkout.tsx:18–246` | Fresh member gate plus identity state/generation isolates changed accounts. Hidden children remain mounted; own-ID classification is not the entire readiness contract. Checkout keeps shipping draft in React state. |
| S03 | `src/components/commerce/payment.tsx:13–234` | SessionStorage contains identifiers only; discovery is abortable. Restored checks are manual, SDK return confirms once. Hook/direct official branches, browser lock, active-only completion guards and exact matching-pointer cleanup are current behavior. |
| S04 | `src/lib/commerce/portone/pending.ts:1–58` | Read-only own-account GET returns bounded non-PII unresolved metadata; ordinary succeeded history is excluded, conflicts remain discoverable; >100 stops rather than truncating. |
| S05 | `node_modules/@payloadcms/plugin-ecommerce/dist/react/provider/index.js:574–617` | Installed confirm hook requires its current cartID, spreads additionalData after defaults, consumes error text or response JSON; it does not expose typed native header/body classification. |
| S06 | `src/lib/commerce/ecommerce.ts:190–227` | Wrapper validates browser mutation/body and runs risk preflight before generated confirm. Signed webhook capability skips browser policy; deferred risk flush follows handler return/rejection. Current errors are broad. |
| S07 | `src/lib/commerce/portone/adapter.ts:148–192` | Confirmation requires active PostgreSQL session, exact snapshot/account/store/channel, clear PAID evidence and locked reservation reread; official finalizeOrder is the sole settlement call. |
| S08 | `src/lib/commerce/portone/endpoints.ts:1–140` | Bounded signed raw-body verification, store/origin and process-local abuse checks precede same-native-request official handler dispatch. WeakSet capability/data/user/text restored in finally; event body is not paid proof. |
| S09 | `src/lib/commerce/portone/endpoints.ts:59–89` | Explicit resume verifies row/account/config, fetches once and rereads snapshot/status. Exact FAILED suggests retirement; typed missing can return same-ID SDK request; other states status-only. |
| S10 | `src/lib/commerce/portone/review.ts:65–140` | Preflight and deferred second-read evidence use independent review transaction; exact risk holds/late-payment conflicts cannot be cleared. Clear preflight validates PAID; unsupported/FAILED is not a typed automatic failure path today. Durability is qualified by installed transaction layer. |
| S11 | `src/lib/commerce/portone/proof.ts:1–43` | Only exact identity/total and TEST-channel provider evidence can settle or quarantine. Minimal projection strips unrelated payload; full-cancel/hold/clear differ. |
| S12 | `src/lib/commerce/portone/review.ts:31–58` | Retirement is explicit: own independent transaction, locked current no-order/no-hold/no-conflict and exact FAILED/zero-paid proof before release; already-terminal no-op is not new evidence of nonpayment. |
| S13 | `src/lib/commerce/ecommerce.ts:112–137` | Transaction terminal and hold guards; on first succeeded transition, active same-request settlement settles reservation and grants admissions. Official cart/order hooks preserve snapshot/history. |
| S14 | `node_modules/@payloadcms/plugin-ecommerce/dist/endpoints/confirmOrder.js:1–405` | Official handler owns transaction init/commit/kill and one finalize call. Atomic pending claim, canonical replay lookup, order/cart/inventory/succeeded writes. Local 25/500 ms settlement polling is NOT a provider finality/reconciliation timing policy. |
| S15 | `src/lib/commerce/access.ts:1–87` | Request-private write scopes; canonical verified email/active membership, same-origin read/mutation controls and bounded process-local rate guard; not distributed/public-ingress acceptance. |
| S16 | `src/lib/commerce/reservations.ts:1–126` | Attempt/resource locks bind snapshots and net-three/capacity counters. Settle moves reservations to paid/committed; verified release reasons preserve used-benefit history and never automatically restock physical goods. |
| S17 | `src/lib/commerce/guests.ts:34–80` | Paid grant checks settled reservation/snapshot and transaction identity, validates complete replay and buyer-self occupancy. Partial/corrupt grants stop; no result reader should recreate them. |
| S18 | `node_modules/@payloadcms/drizzle/dist/transactions/beginTransaction.js:1–59` | Lifted native done promise catches native rejection by calling transactionFailed; after ready has settled this can fulfill the done returned by session.resolve/reject, absorbing transaction-end failure. |
| S19 | `node_modules/@payloadcms/drizzle/dist/transactions/commitTransaction.js:1–18` | Missing session silently returns; deletes session before resolve, and catches resolve rejection to invoke reject. |
| S20 | `node_modules/@payloadcms/drizzle/dist/transactions/rollbackTransaction.js:1–16` | Missing session silently returns; deletes session then awaits lifted reject, not a separate guaranteed rollback acknowledgement. |
| S21 | `node_modules/payload/dist/utilities/commitTransaction.js:1–9` | Awaits adapter commit then deletes req.transactionID; deletion is not proof native COMMIT succeeded. |
| S22 | `node_modules/payload/dist/utilities/killTransaction.js:1–15` | Ignores promise-valued transactionID, swallows rollback errors and deletes concrete request transactionID. |
| S23 | `src/lib/tickets/portone/runtime.ts:1–23` | Reused native GET transport has an existing 5-second timeout and recognizes typed 404 only after JSON consumption. Generic 404, transport/body failure or invalid provider body throws. Legacy ingress is 410, not another payment authority. |
| S24a | `node_modules/@portone/server-sdk/dist/generated/payment/PaymentStatus.d.ts:1–2` | Installed filter/status type lists PENDING; not evidence of wire-alias equivalence. |
| S24b | `node_modules/@portone/server-sdk/dist/generated/payment/PayPendingPayment.d.ts:12–27` | Installed response variant uses PAY_PENDING and has provider transactionId; this is not evidence selected CARD can safely retry. |
| S24c | `node_modules/@portone/browser-sdk/dist/v2/response/PaymentResponse.d.ts:1–24` | Browser SDK txId is a per-request attempt identifier, distinct from paymentId and Payload transaction UUID. |
| S24d | `node_modules/@portone/server-sdk/dist/generated/webhook/WebhookTransactionDataPaid.d.ts:1–9` | Webhook transactionId may differ across attempts under one payment; current project webhook dispatch chooses its own plugin tuple from paymentId. |
| S25 | `src/lib/commerce/_shared/transaction.ts:7–166` | Real session/advisory locks and unchanged non-claim API completion path. Claim-only opt-in native callback/sentinel ownership is not used by payments; do not infer its tests repair financial callers. |
| S26 | `src/lib/commerce/portone/adapter.ts:20–147` | Transaction reader verifies exact UUID/hex32 payment mapping and immutable snapshot. Initiation uses attemptID hash idempotency and reservation creation, not automatic charge authority. |
| S27a | `src/lib/commerce/contracts.ts:17–40` | Strict shipping/commerce snapshot includes owner, cart, product/release/event, quantity/currency/arithmetic, price/event versions and address. |
| S27b | `src/lib/commerce/snapshot-hash.ts:1–7` | Parsed ordered snapshot hash binds immutable charge identity. |
| S28 | `src/lib/commerce/_shared/request-body.ts:1–26` | Bounded native JSON reader stabilizes validated text for official handler; preserve body-size/deadline/type boundaries. |
| S29 | `node_modules/.pnpm/drizzle-orm@0.45.2_@types+pg@8.23.1_kysely@0.28.18_pg@8.23.1/node_modules/drizzle-orm/node-postgres/session.js:180–197` | Installed Drizzle native transaction awaits callback then COMMIT, attempts ROLLBACK on exception and rethrows; native SQL completion differs from the lifted API promise. |
| S30 | `src/lib/commerce/benefit-review.ts:1–38` | Risk projection holds/revokes unused benefits while retaining consumed attendance/redemption audit. |
| S31 | `src/lib/commerce/domain.ts:42–148` | Guest operations choose native claim-only helper versus ordinary commerce transaction for non-claim operations; buyer admissions GET reads own order, not settlement. |
| T01 | `tests/commerce/ui/payment-dom.test.tsx:144–251` | Existing tests explicitly prohibit restored confirmation/SDK auto-launch; proposed automatic status reconciliation revises only confirmation part and retains no-launch invariant. Other tests cover stale identity and browser faults; not run in this design. |
| T02 | `tests/commerce/portone/adapter.test.ts:1–81` | Adapter tests mock finalizer/transaction storage and count one adapter provider read; not full endpoint two-read or native durability proof. |
| T03 | `tests/commerce/portone/pending.test.ts:1–76` | Own unresolved projection/privacy/terminal conflict source tests; inspected, not executed. |
| T04 | `tests/commerce/portone/review.test.ts:1–126` | Risk and second-GET/late-PAID mocked transaction tests; inspected, not executed. |
| T05 | `tests/commerce/portone/webhook.test.ts:1–67` | Same native request and signature capability source tests; inspected, not executed. |
| T06 | `tests/commerce/portone/retirement.test.ts:1–74` | Explicit failed-only retirement tests; inspected, not executed. |
| T07 | `tests/commerce/domain/real-payload-acceptance.test.ts:1–417` | Existing opt-in local PostgreSQL acceptance file loads environment and uses DB when enabled; not invoked. Separate approval still required, and existing scenarios are not exhaustive transaction-end fault proof. |

## Known transaction-end gaps and affected callers

- Native SQL completion (S29) → lifted `done` (S18) → session resolve/reject
  (S19/S20) → Payload helpers (S21/S22) → generated financial response (S14).
  The catch attached to `done` can absorb a native commit/rollback failure after
  startup; missing-session APIs can also resolve without doing anything. Do not
  treat deleting a session/request ID as rollback acknowledgement.
- Financial callers: prepare/replay preparation S26; clear/risk/late-PAID quarantine
  S10; retirement S12; browser and signed-event generated settlement S06/S08/S14.
  Non-claim fulfillment/returns/check-in/redemption/name/claim-issuance operations
  use S31→S25 ordinary helper and are affected regressions, not in this assignment's
  implementation scope. Claim-only S25 is an opt-in separate completion path.
- Current pending/processing local status is not provider processing proof. Current
  broad 409/500/503 paths lose distinctions needed for the proposed outcome model.
  No local result reader, durable reconciliation admission/call budget, catch-up
  execution identity or missed-webhook escalation is demonstrated by these paths.
- Package source establishes intended control flow only. Real SQL fault/crash and
  concurrency acceptance, current provider behavior, deployed delivery and devices
  remain separate gates. Upstream local settlement polling and existing transport
  deadlines do not authorize a new financial finality, wait or retry policy.

## Installed package identity and version caveat

See candidate manifest for resolved package JSON/source hashes: Payload, ecommerce,
Postgres and Payload Drizzle are 3.92.1; actual resolved Drizzle ORM is 0.45.2; server
SDK 0.19.0, browser SDK 0.1.13, Next 16.5.0-canary.27. These are local installed
identities, including the patched Payload package resolution, not a current-provider
API audit. No remote documentation was fetched and no environment or credential
values were inspected. No new helper, library wrapper or dependency is proposed
as implemented; any future helper must pass the installed-library/internal-owner
gate. Preserve official finalizer and current internal modules rather than duplicate
the engine.
