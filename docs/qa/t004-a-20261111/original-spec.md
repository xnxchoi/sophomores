# Original review specification — frozen inputs

Read with the bounded assignment and rubric in review-input.md. No replacement spec.
Relative links inside verbatim excerpts resolve from their original source: the
assignment/financial capture from `docs/To-Do List.md`, the T004-A specification
from `docs/reference/backlog-execution-plan.md`, and the governing excerpt from
`docs/reference/commerce-launch-plan.md`. Original reference-style footnotes retain
their original-document definitions; consult that frozen source when needed.

## T004-A bounded reconciliation design specification — planning only

**Current slice:** source-backed provider-free design, following step 5 below.
T005-A and T009-A outcome conventions are available; neither proves payment
transaction durability or fresh full account readiness. Do not edit the preserved
financial brief. The existing commerce launch plan remains governing.

**Ownership:** custodian owns plan/registry and assignment acceptance. Assignment
`SPH-T004-A-20261111-01` transfers the interrupted, undelivered design to a fresh
local execution chat, limited to its recorded `docs/qa/t004-a-20261111/` outputs.
The original temporary-file baseline/spec is retained; no former agent is active.
Project/source is read-only outside that evidence scope. No production/test/catalogue,
dependency/configuration/archive writes, app workloads, provider/DB calls, service/
browser or environment/credential access. Registry contract governs dispatch/closure.

**Three acceptance criteria:**
1. Trace current pending discovery, browser confirmation, resume/retire, signed
   webhook dispatch, official finalizer and transaction-end paths with precise
   source anchors. Distinguish source facts, proposals and unproved DB/provider
   durability; no duplicate settlement authority or source-only exactly-once claim.
2. Specify local result reads separately from bounded server reconciliation and
   explicit initiation/resumption. Preserve exact attempt/account/snapshot identity,
   no-GET mutation, privacy and holds. Enumerate confirmed, unknown, failure,
   review/conflict, authentication and integrity/rate/budget stops without choosing
   timing/budgets, treating not-found as no charge or inferring safe retries.
3. Decompose implementation into dependency-aware test-first local slices with
   1–3 verifiable criteria each and explicit affected callers, RED/GREEN cases,
   durable/real-provider/device acceptance and remaining owner gates. No invented
   operational authority, queue service, retention default or current-API claim.

**Route:** plan-orchestrate step 5 `/plan` is a scoped generative route only;
native source inspection and drafting execute this design. Deterministic gates
are source-hash/anchor/scope checks, not fabricated RED/GREEN for documentation.
Two fresh independent Santa design reviewers receive identical original spec,
frozen proposal and rubric after those gates. Maximum three fix/re-review cycles.
Planning acceptance never changes T004 implementation `( )` or proves live payment.


## Current assignment contract — SPH-T004-A-20261111-01

- **State:** running; dispatch intent preceded confirmed chat creation. Execution
  chat: `01a1c9f4-209c-7273-9b6c-18b35fe19a78`, host `local`. Custodian: `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1` on host `local`.
- **Parent/outcome:** T004-A, source-backed provider-free same-attempt payment
  reconciliation design. Resume the interrupted design; no production implementation.
- **Checkout:** `/Users/seanschoi/Projects/sphmrs`, commit
  `be96a3b8228a1edf166f6f307af2402c3a1f3c22`. Exact dirty/protected-file baseline:
  [assignment-baseline.json](qa/t004-a-20261111/assignment-baseline.json).
- **Ownership:** executor may write only `docs/qa/t004-a-20261111/` candidate design,
  source map, deterministic/review evidence and handback, excluding the custodian's
  `assignment-baseline.json`. No registry/plan/source/test/catalogue/archive writes.
  Executor is not alone: last-read checks and preservation of other edits are required.
- **Dependencies/guidance:** [T004-A original three-criterion spec][1] under its
  named heading, registry financial brief, [commerce launch plan][17], applicable
  AGENTS.md, installed plan-orchestrate and Santa skills. T005-A/T009-A are conventions,
  not payment durability proof. Original financial brief stays byte-identical.
- **Criteria (design only):** (1) precise source map of discovery, confirmation,
  resume/retire, signed webhooks, official finalizer and transaction-end authority;
  (2) separate local reads/bounded reconciliation/explicit payment operations,
  exact identities/holds/privacy and honest outcome/stop matrix; (3) dependency-aware
  test-first implementation slices, 1–3 criteria each, callers/fault cases and explicit
  owner/runtime/provider/device/durability gates. Full original spec remains binding.
- **Settled safeguards/non-goals:** no automatic charge/SDK launch/retirement/release,
  no not-found=no-charge inference, no new settlement authority. No timing/budget,
  retention, operational authority or other unresolved policy selection. No providers,
  DB, credentials/env inspection, network transport, app workloads, browser/services,
  installs, commits or deployment. Source inspection/drafting/review only.
- **Checks:** candidate/source hashes, anchors and scope first; two fresh independent
  Santa design reviewers receive identical original spec, frozen output and rubric,
  neither sees the other. Both PASS; at most three fix/review cycles. Relevant
  security/architecture review is included explicitly; source checks are not live proof.
- **Reporting:** persist `handback.md` here with assignment/candidate identity, status
  candidate/blocked/interrupted, changes/evidence, actual checks/failures/corrections,
  pending gates/decisions and remaining owned resources. Finish the execution turn
  with that concise report. Custodian reads it using supported read/wait chat tools;
  no callback/wake guarantee or unapproved message-back is assumed. Rework returns
  to the recorded execution chat. Only custodian changes acceptance/status.


## Preserved original financial capture (verbatim)

#### Payment confirmation and recovery — system-managed, same-attempt reconciliation

	- **Status / scope:** Research and source inspection completed 2026-11-11; implementation has **not started**. The owner requested recording this cross-cutting task, not isolated button/copy work. Public documentation and source/tests were inspected; no runtime/provider acceptance is established. S5 payment-recovery copy remains deferred, and exact Korean wording is unapproved. Do not change catalogues, the calibration document, voice guide or About drafts as part of recording this task.
	- **Owner direction:** When no new information, decision or authorization is needed, the system should perform the appropriate check instead of asking the customer to press a button. An immediate manual retry is no more useful than an identical automatic retry when nothing can have changed. The system owns payment uncertainty; the customer owns genuine intervention. This is not blanket retry or permission to initiate another payment.
	- **Coordinate within the existing plan:** The [commerce launch plan](reference/commerce-launch-plan.md) remains governing. Coordinate adapter/transaction work (step 2), checkout/account/result surfaces (step 4), regression and visual review (step 5), authoritative membership/session/verification dependencies (step 6), and separately approved provider/device/PG acceptance (step 8). Include reservations, stock/account allowance, order finalization, admissions/benefits and physical fulfillment effects. Deployment remains the final milestone; this item neither replaces the plan nor starts readiness, dependency or deployment phases.
	- **Documented patterns to apply, not screens to copy:**
		- Toss directly discusses payment results lost through network errors/timeouts and idempotent recovery, avoiding manual investigation or duplicate operations. Stripe combines webhook completion with automatic completion on the return page, through one exactly-once operation. Apple demonstrates verified transaction updates automatically changing a pending-purchase UI; this is a StoreKit analogy, not a live Apple web-store audit.
		- PortOne explicitly recommends webhooks for lost browser responses, requires server verification, and permits multiple attempts under one `paymentId` with only one successful payment. Redirect and webhook completion are not ordered by default. Provider webhook retransmission is not a browser polling schedule or a payment-finality deadline. KPN documentation does not establish a safe “not charged after X seconds” rule.
	- **Implementation work — proposed interaction and engineering contract:**
		- Automatically reconcile the exact retained attempt after payment return; design same-account restoration/redirect recovery too. Preserve account, cart, quantity, address and attempt context. If several unresolved attempts exist, require an unambiguous selection rather than silently choosing. Reopening payment always remains explicit. Deliberately revise the existing test prohibiting automatic restored-attempt confirmation; do not weaken its separate no-auto-launch guarantee.
		- Separate **local status reads**, **bounded server-controlled PortOne reconciliation**, and **explicit payment initiation/resumption**. Refreshing the local ledger cannot repair a missed webhook; repeatedly invoking confirmation from a browser timer can multiply provider calls. Preserve the existing official Payload finalizer as the sole settlement authority, shared with verified webhook processing, with exactly-once order/inventory/admission/fulfillment effects.
		- Introduce authoritative outcomes: confirmed; retryable unknown with eligibility; verified failure; review/late-payment conflict; authentication required; nonretryable rejection. Broad HTTP errors and generic catches are insufficient. Unknown is neither failed nor provider-confirmed processing; do not transplant PayPal `PAY_PENDING` semantics onto a CARD timeout or assume `PENDING` is an interchangeable wire alias.
		- While checking, show stable inline busy feedback and serialize operations. Once confirmed, show the canonical existing order automatically. Bound foreground waiting, then preserve an honest unresolved state and discoverable recovery/result surface instead of an endless spinner. A secondary refresh is optional, not required to finish a paid order. Do not promise notifications or background progress that has not been implemented.
		- Complete verified payments even if the browser closes. Design durable catch-up and operational escalation for missed/exhausted webhook delivery, rather than claiming webhooks guarantee eventual receipt. Define who owns unresolved attempts and how staff resolves them without new access grants. Reuse existing infrastructure where suitable; this task does not authorize a new queue dependency or service.
		- Choose explicit request deadlines, delay/backoff, total provider-call budget, cooldown and escalation rules. A logical confirmation currently may perform two provider reads; account for both. No overlapping checks, budget resets on rerenders/focus, or unbounded polling. A client timeout does not cancel a server transaction. The earlier suggestion of “one extra check” was withdrawn as unvalidated, not approved. KPN-specific timing remains an empirical acceptance question, not an invented guarantee.
	- **Non-negotiable safety / stop conditions:** Preserve all identifiers, immutable snapshots, owner/member checks, cross-tab browser locks, server locks and idempotency. Our Payload `transactionID` is not PortOne's per-request SDK `txId` or webhook `transactionId`. Never automatically initiate a charge, reopen the SDK, retire an attempt, rotate identity, release a reservation due to age, or clear review holds. Paid resolves the same order; verified failure permits only the existing explicit safe-resolution path. Review/conflict, late PAID after retirement/release, reversals/disputes, authentication or identity changes, integrity/configuration rejection, rate limiting and exhausted budgets stop automatic work. Old READY or typed not-found is not proof of permanent absence; retain financial evidence and uncertainty.
	- **Current source and test anchors — verify again before implementation:**
		- Active owners: [checkout](../src/components/commerce/checkout.tsx) (101–148), [payment](../src/components/commerce/payment.tsx) (96–137, 169–209); not merely retained ticket components.
		- [Endpoint security/classification](../src/lib/commerce/ecommerce.ts) (195–222), [pending discovery](../src/lib/commerce/portone/pending.ts) (31–50; ordinary completed transactions are excluded, so this alone is not a result reader), [adapter finalization](../src/lib/commerce/portone/adapter.ts) (148–186), [resume](../src/lib/commerce/portone/endpoints.ts) (59–88), [retirement/risk handling](../src/lib/commerce/portone/review.ts) (30–86).
		- Existing tests inspected, not run in this decision pass: [payment DOM](../tests/commerce/ui/payment-dom.test.tsx) (136–143, 145–243), [adapter](../tests/commerce/portone/adapter.test.ts), [review](../tests/commerce/portone/review.test.ts), [webhook](../tests/commerce/portone/webhook.test.ts), [real Payload acceptance](../tests/commerce/domain/real-payload-acceptance.test.ts). The [older uncharged-recovery assessment](reference/portone-uncharged-recovery.md) retains useful provenance; superseded ticket-era details are not current commerce authority.
	- **Acceptance before marking complete:** Use test-first RED/GREEN coverage for lost success responses; delayed/duplicate/out-of-order webhooks; browser closure, reload and mobile redirect; multiple-attempt selection; session expiry/account switching/fresh membership; concurrent tabs/clicks and webhook settlement; stale responses/newer retained storage; unmount and server-still-in-flight deadlines; typed not-found versus generic 404; held/terminal states and 429; exact retry/provider-call budgets. Assert one canonical order and once-only effects, preserved context, and zero automatic initiation/reopening/retirement. Run affected guarded regressions/typechecks, inspect the real desktop/mobile render, and pass a concise harsh Santa review. Synthetic proof is not KPN/device/live acceptance. Confirm local implementation scope first; provider calls/payments, dependency/readiness phases and deployment each retain their separate approvals.
	- **Research references — decision brief recorded 2026-11-11:**
		- Toss: [Idempotency — exact lost-payment-result scenario](https://docs.tosspayments.com/blog/what-is-idempotency); [timeouts and safe repeated requests](https://docs.tosspayments.com/resources/glossary/timeout).
		- Stripe: [idempotency engineering article](https://stripe.com/blog/idempotency); [current advanced error handling](https://docs.stripe.com/error-low-level); [payment-status/webhook guidance](https://docs.stripe.com/payments/payment-intents/verifying-status); [automatic return-page status example](https://docs.stripe.com/payments/accept-a-payment-intent-first); [webhook + return-page exactly-once fulfillment](https://docs.stripe.com/checkout/fulfillment?ui=full-page). Provider-specific retry numbers are not PortOne/KPN policy.
		- Apple: [WWDC21 StoreKit 2 demonstration](https://developer.apple.com/videos/play/wwdc2021/10114/); [pending purchase results](https://developer.apple.com/documentation/storekit/product/purchaseresult/pending); [unfinished transactions](https://developer.apple.com/documentation/storekit/transaction/unfinished). These demonstrate asynchronous recovery, not an audited Sophomores-equivalent checkout.
		- PortOne: [V2 checkout/server verification](https://developers.portone.io/opi/ko/integration/start/v2/checkout?v=v2); [V2 webhooks, ordering and delivery retries](https://developers.portone.io/opi/ko/integration/webhook/readme-v2?v=v2); [selected KPN integration guide](https://developers.portone.io/opi/ko/integration/pg/v2/kpn?v=v2); [SDK response/attempt identifiers](https://developers.portone.io/sdk/ko/v2-sdk/payment-response?v=v2); [payment retrieval/resend APIs](https://developers.portone.io/api/rest-v2/payment?v=v2); [official OpenAPI schema](https://developers.portone.io/schema/v2.openapi.yml).
		- PortOne supporting delivery-recovery references: [failed webhook bulk resend release note](https://developers.portone.io/release-notes/api-sdk/2024-12-19); [provider webhook retry architecture](https://developers.portone.io/blog/posts/2024-02/v2-webhook). Provider retry infrastructure does not establish that our merchant catch-up/escalation path exists.
		- PortOne status-model evidence: [generated payment response](https://raw.githubusercontent.com/portone-io/server-sdk/main/javascript/src/generated/payment/PayPendingPayment.ts); [generated status/filter type](https://raw.githubusercontent.com/portone-io/server-sdk/main/javascript/src/generated/payment/PaymentStatus.ts). These differing naming surfaces do not establish interchangeable runtime aliases; recheck against the pinned installed version before implementation.


## Governing commerce plan (authority, acceptance and worklist excerpt)

# Commerce launch plan

**Updated:** 2026-11-10. **Phase: Batch 7b local checkpoint commit approved; source-ownership check still blocks release.**
This is the owner-approved implementation contract, not approved public sales copy
or a claim that the implementation, PG review or launch is complete. The execution
worklist below is the current progress panel. Earlier local commerce receipts are
in [the commerce QA archive](../qa/src-stabilization-20261109.md#payload-commerce-implementation--current-progress);
the latest repository-wide baseline is in
[the i18n checkpoint](../qa/i18n-consolidation-20261110.md).

**Delivery direction confirmed 2026-11-10:** this remains the governing site and
commerce scope; deployment is the final milestone, not a substitute for the
remaining registration, verification, purchasing, fulfillment, guest/perk and
acceptance work. Target the existing VPS, retiring Hideaway only at a validated
Sophomores cutover while preserving its exact running installation and recovery
data. The approved read-only host inventory is recorded in
[the current preflight observations](../../deployment/VPS-PREFLIGHT.md#2026-11-10-read-only-inventory--existing-plan-retained).
It is not permission to bypass public-auth, payment/provider, product/policy or
backup/recovery gates to publish a reduced site.

## Approved authority and compatibility boundaries

- Use only the official **`@payloadcms/plugin-ecommerce@3.92.1`**, pinned exactly.
  The owner explicitly approved this dependency; the plugin is beta. Installation
  does not establish integration, migration or production readiness.
- Payload and its official ecommerce plugin are the sole authority for products,
  prices, inventory, carts, orders, transactions and their admin management.
  Payload also owns catalogue content, seller disclosures and policy publication
  gates. Retire environment/static catalogue and parallel quote authorities only
  after the replacement passes compatibility and acceptance checks. The current
  local pass now routes purchasing through Payload; superseded legacy HTTP ingress
  is retired rather than available as another catalogue/payment authority.
- Preserve canonical Better Auth sessions and existing `users`, staff/admin roles
  and account ownership. No anonymous checkout and no second customer identity
  system. Initial sensitive commerce operations are **superadmin-only**; do not
  grant new staff privileges as part of integration.
- Integrate PortOne through a custom payment adapter using the plugin's documented
  `finalizeOrder` contract. New pending payment attempts belong in plugin
  transactions; create/finalize orders only after authentic, authoritative `PAID`
  verification. Callback/browser assertions alone are not proof of payment.
- Preserve legacy order UUIDs/references and financial evidence. Keep legacy orders
  read-only and explicitly discriminated from plugin-owned orders; do not reset,
  silently rewrite or automatically grant new entitlements to old TEST orders.

## Physical offer and launch facts

The offer is a **shipped physical collectible coin**, not a renamed ticket or a
preorder. Show the actual product with representative imagery and disclose its
admission benefit truthfully to customers and the PG. Stock-ready/non-preorder
claims require actual product, inventory and fulfillment-readiness evidence.
Physical fulfillment and event admission remain separate records/lifecycles.

Do not invent or inherit old ticket prices, shipping fees, stock, dispatch dates,
event dates, refund cutoffs or legal terms. Public purchasing/publication stays
blocked until the owner approves the actual specification/photos, price, stock,
shipping regions/fees and schedule, seller/contact details, policies and event
conditions. Earlier ticket-offer documents are historical context, not authority
for physical-goods returns or the revised offer.

## Account allowance and inventory

Enforce a net maximum of **three coins per account per release across orders**.
Paid quantities plus active reservations consume the allowance. Confirmed
cancellations and accepted returns restore it. This is not a phone-number,
person, household or shipping-address cap; do not introduce cross-account identity
rules. Enforce stock and account allowance atomically under concurrent attempts.

Do not release a reservation or allow another charge merely because a request
or browser timed out. Resolve an uncertain provider state first. Cancellation,
partial/full refund, return, exchange and fulfillment transitions must preserve
financial history and account for stock, allowance, admission and consumed
benefits; staff review is required where benefits were consumed.

## Admission, guest assignment and optional registration

- **One coin guarantees one admission.** The buyer can assign a guest name for
  each admission; that guest does not need an account to attend.
- Each guest may optionally complete their own full verified registration and
  secure claim. That individual claim grants **four Part I drinks** and shared
  **Part I → Part II transport**. Registration by the buyer does not unlock
  packages for other guests.
- One account may claim only one guest package per event. Claims and redemption
  must prevent duplicate grants/use, concurrent claims and unauthorized transfers.
- Buyer editing stops once an admission is claimed or checked in. Later corrections
  are staff operations, initially superadmin-only. Returns involving checked-in
  admission or consumed benefits require review, not automatic entitlement rollback.

## Shipping address

Use the official [Kakao/Daum Postcode Service](https://postcode.map.kakao.com/guide)
for Korean address search, with manual entry when search cannot load. Use the
existing installed-library/internal-helper gate before creating integration
helpers; no additional package or provider-account setup is implied.

Collect recipient name, delivery phone, postcode, base address and optional detailed
address, with optional delivery instructions. Shipping is South Korea only,
one recipient/address per order; actual fees still need owner approval. Buyer identity,
recipient contact and admission guest are separate concepts.

Validate server-side and snapshot the address on the order. Restrict access to
the owner and explicitly authorized fulfillment operators; keep addresses out of
telemetry. Retention and courier disclosure must be settled before collection.
An address book is a separate opt-in feature. Check actual mobile/in-app browser
search behavior and the manual fallback, not only desktop rendering.

## Payment and recovery acceptance

| Scenario | Required behavior |
| --- | --- |
| Close, Back, explicit gateway cancellation or method change | Preserve account, cart, quantity and address. Dismissing payment UI is not signing out or cancelling an order. Reconcile the exact attempt before safely retiring/replacing it; never launch another payment automatically. |
| Timeout, connection loss or delayed approval | Treat unknown as unknown; reconcile the existing reference before retry. Recover authentic paid results exactly once, without another charge or duplicate fulfillment. |
| Decline or authoritative failure | Offer actionable inline retry/method change only after safe attempt resolution. Preserve inputs. |
| Refresh, tab reopen, mobile redirect or blocked popup | Restore identity and attempt context without automatically opening payment. Physical-device acceptance remains separate. |
| Session expiry or account switch | Reauthenticate without losing context; never attach the attempt to a different account or expose its address. |
| Double click, concurrent tabs/orders | Idempotent transaction preparation/finalization; atomic stock and per-account/release allowance; one order, admission and fulfillment effect. |
| Duplicate, delayed or out-of-order callbacks | Verify authenticity and authoritative provider state; never regress paid/refunded/held state from stale events. Webhook delivery requires separate acceptance. |
| Cancel, refund, return or exchange | Apply approved physical-goods policies and mandatory rights, with correct stock/allowance restoration and consumed-benefit review. Do not reuse ticket event-date cutoffs. |

Existing [uncharged recovery guidance](portone-uncharged-recovery.md) is a starting
point, not evidence of plugin adapter or new physical-commerce acceptance. Short
status changes use compact stable slots; longer errors may reflow coherently.
Purchase registration remains inline, restrained and monochrome.

## Implementation and validation gates

1. Inspect plugin contracts and preserve compatibility before replacing authorities.
   Integrate canonical users/roles and explicitly discriminated legacy history.
2. Implement plugin-owned catalogue, inventory, carts and transactions plus PortOne
   adapter, paid-only order finalization and guarded migrations.
3. Implement atomic account/release allowance, shipping snapshots, admission,
   individual guest claims, benefits and authorized operational corrections.
4. Replace checkout/admin/publication surfaces only as their replacements pass.
   Keep unavailable owner facts and public purchasing fail-closed.
5. Use test-first RED/GREEN coverage for concurrent inventory/account/admission
   limits, duplicate finalization, perk claims/redemption and adverse payments.
   Run affected regression/type checks; inspect the actual live UI and perform a
   harsh concise Santa Method review. Source/tests alone are not visual acceptance.

## Execution worklist — preserve completed work

The owner asked this session to handle execution, not make them paste routing
commands. The `plan-orchestrate` command output was routing only; it neither ran
the commands nor approved every command's internal actions. Use this worklist to
continue the same plan and close actual gaps, not rebuild locally accepted work.

| ID | Scope | Current checkpoint / next acceptance | Dependencies and approval boundary |
|---|---|---|---|
| <a id="step-1"></a>1 | Plugin/identity/legacy compatibility | Local compatibility and preserved historical records accepted; retain existing authority. Public configuration and target data acceptance remain. | No second identity store, new staff grants or history rewrite. |
| <a id="step-2"></a>2 | Plugin commerce and PortOne adapter | Local catalogue/cart/transaction/finalization and replay coverage exists. Current-plugin real provider acceptance remains in step 8. | Do not recreate the engine or infer payment activation from synthetic PAID tests. |
| <a id="step-3"></a>3 | Allowance, shipping, admission and perks | Local safeguards/operational code accepted. Authenticated operator/device acceptance and approved physical-product facts remain. | Preserve net-three, name-only admission and one package per registered account/event. |
| <a id="step-4"></a>4 | Checkout/admin/publication surfaces | Local and synthetic UI checkpoints exist. Real account/CMS/address journeys and publication approval remain in step 8. | Missing owner facts stay fail-closed. Copy research stays in its separate read-only chat. |
| <a id="step-5"></a>5 | Regression and review | **Batch 7c:** 2,110 pass, 0 fail, 39 existing opt-in skips; compiler and bounded desktop/mobile review pass. Source ownership repaired. Two deferred CSS failures remain visible; baseline lint/dependency debt is not waived. | See step 7c receipts and boundaries; these are local checks, not image/provider/production acceptance. |
| <a id="step-6"></a>6 | Public membership and phone-verification readiness | **Design/owner policy needed.** Local mode, HTTP authority, receiver/runtime and carrier trust are separate controls; public trust currently denies all grants. | Confirm production origins, ingress/sender-number assurance, carrier coverage and key-rotation policy before public enablement. The local pinned 1024-bit exception is not production approval. No new fence based merely on `NODE_ENV=production`: a production-built local TEST server is still a valid local use case. |
| <a id="step-7"></a>7 | Release configuration, persistence and gate contract | 7a/7b contracts retained; **7c local ownership acceptance complete, local commit approved**. Actual image/storage/runtime acceptance remains separately approved execution. | No production secrets in build, implicit migrations, provider activation or server work. Public functionality in step 6 remains mandatory. |
| <a id="step-8"></a>8 | Full functional and PG acceptance | Finish approved product/policy facts, real authenticated CMS/customer/operator journeys, address/device checks and the adverse-payment matrix above. | Steps 2–7 plus owner facts; real provider calls, bounded sandbox payments, webhook registration and any live-mode work require their specific approvals. No invented offer/policy values. |
| <a id="step-9"></a>9 | Recoverable old installation and exact candidate | Read-only live inventory is complete; fresh Hideaway recovery capsule, independent key custody, consistent DB/media recovery point and isolated recovery rehearsal remain. Freeze reviewed Sophomores source and produce/check its exact Linux image. | Separate backup/restore, image-build and target-data approvals. Keep Hideaway data untouched. Resolve shared LOSTINSEOUL ownership and any old-preview retirement before service stops. |
| <a id="step-10"></a>10 | Same-host cutover and retained rollback | Final milestone only: rehearse the scoped remote adapter, verify capacity and route ownership, switch approved routes and selectively retire Hideaway. | Steps 1–9 accepted and exact cutover approved. Preserve old image/data/config; no blanket Compose shutdown, volume deletion or unapproved cleanup. |

