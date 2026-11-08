# Retained PortOne checkout: explicit same-ID resume assessment

2026-11-06 · **Historical assessment retained; local implementation and dual Astra review passed. Provider acceptance remains incomplete.**

## Current implementation receipt — 2026-11-06

The user subsequently approved a local-only, provider-free same-ID resume batch.
The read-only resume route now checks the exact retained owner/attempt/current
catalogue and open-sale/publication/reviewed-TEST gates, rechecks the row and sale
time after I/O, and returns server-owned request fields without creating or
updating an order or clearing/rotating UUIDs. Exact typed HTTP 404 not-found is
distinct from generic 404 and a 200 sentinel. Verified FAILED requires matching
payment/store/channel/customer/amount/currency and zero paid/cancelled amounts.

**Schema provenance correction:** the official OpenAPI `FailedPayment` schema
does not define `disputes` (unlike `PaidPayment`). Requiring that field on FAILED
would be an unsupported application assumption, not an official requirement.
The implemented FAILED classifier allows absence and requires an empty array
when supplied; reconciliation of paid/reversal states retains its own strict
evidence requirements. Neither outcome proves no late charge or provider flow.

Fresh and explicit resume SDK launches share a native Web Locks payment-ID key.
Unsupported locking fails closed; `ifAvailable` never queues a later launch.
This is not a cross-device/server mutex or a durable external-window ledger.
READY/PENDING/paid/reversal observations remain status-only.

Final provider-free regression: **142/142**
(`/tmp/sphmrs-resume-anchor-regression.log`, 509.6 MiB / 11.6 s).
Coverage remains 92.53% lines / 89.67% branches / 89.17% functions aggregate;
runtime line coverage is 48.84% (same final regression receipt). Scope lint is
clean (`/tmp/sphmrs-resume-final-lint.log`). Final actual-source typecheck has
419 unrelated diagnostics and zero in scope, not global success
(`/tmp/sphmrs-resume-anchor-typecheck.log`). Corrected desktop/mobile live refresh
retains the same disabled Resume node, stable card heights and no horizontal
overflow (`/tmp/sphmrs-resume-anchor-{desktop,mobile}.png`); 39/39 deferred UI
tests pass. Both round-1 reviewers identified only that now-fixed layout shift;
fresh independent round-2 Astra reviewers both passed all six bounded criteria
with no blockers. This does not certify the globally failing TypeScript baseline
or provider/full-site/physical-device acceptance. The synthetic preview and
isolated page are closed with no agent-owned test/preview processes remaining.
See the [canonical handoff](../deployment/member-auth.local.md#portone-next-steps--short-execution-plan)
for the current bounded receipt and remaining gates. No policy publication,
manual schedule/date approval, selected-PG acceptance or provider operation is
authorized by this local implementation approval.

## Historical assessment — before implementation approval

## Finding

**PortOne V2 explicitly supports multiple attempts under one `paymentId`, with
only one successful payment.** This is evidence for proposing an explicit
**same-ID resume**, not generating a replacement payment ID. It is not necessary
to prove that no SDK call ever occurred in order to preserve that identity.
It does not establish the selected PG's usability, timing or error behavior.

At assessment time, the implementation deliberately did not reopen a recovered SDK flow.
Nothing in this assessment authorizes changing that behavior, clearing an intent,
rotating its UUID, calling a provider or activating payments. Club approval is
separate from a verified account's purchase; payment verification is not admission.

## Official evidence checked

Context7 resolve selected `/portone-io/developers.portone.io`; its query result was
cross-checked against current official documentation on 2026-11-06. Public document
fetches only; no payment API, credentials, database or console access.

1. [V2 checkout](https://developers.portone.io/opi/ko/integration/start/v2/checkout?v=v2):
   multiple attempts may share `paymentId`, but only one may succeed. Browser
   responses/redirects must be followed by server-side payment retrieval and
   verification. This supports preserving identity across explicit retries;
   it does not support a second ID for an unresolved order.
2. [V2 payment API](https://developers.portone.io/api/rest-v2/payment?v=v2#get%20%2Fpayments%2F%7BpaymentId%7D)
   and [official OpenAPI schema](https://developers.portone.io/schema/v2.openapi.yml):
   `PAYMENT_NOT_FOUND` is a typed 404 meaning the payment was not found. The schema
   does **not** promise that it proves no in-flight request, no delayed observation
   or no future callback. A generic HTTP 404, timeout, malformed body or wrong
   store is not interchangeable with this typed result.
3. [V2 webhooks](https://developers.portone.io/opi/ko/integration/webhook/readme-v2?v=v2):
   `transactionId` identifies an attempt and can differ across attempts sharing
   a payment ID. Browser completion and webhook arrival order is not guaranteed
   by default; failed deliveries are retried (up to five times). Treat events as
   triggers for authoritative retrieval, not instructions to rewind local state.
4. [Browser request](https://developers.portone.io/sdk/ko/v2-sdk/payment-request?v=v2)
   and [response](https://developers.portone.io/sdk/ko/v2-sdk/payment-response?v=v2):
   SDK completion/error is client feedback, not the server's payment authority.

## Historical installed source and boundaries

Pinned packages are browser **0.1.13**, server **0.19.0** (`package.json:46-47`).
Installed browser `node_modules/@portone/browser-sdk/dist/v2/requestPayment.d.ts:1-3`
returns `Promise<PaymentResponse | undefined>`; it provides no durable local
cross-tab launch ledger. Server `node_modules/@portone/server-sdk/dist/generated/payment/client.mjs:549-570`
performs GET with optional store scope and throws a typed error on non-2xx.
`.../PaymentNotFoundError.d.ts:1-5` confirms the error discriminator;
`.../PaymentStatus.d.ts:1-2` includes READY, PENDING, FAILED and paid/reversal states,
and intentionally permits unknown future status strings. These types are not
a retry-safety policy or a selected-PG guarantee.

| Current source | Consequence for a proposal |
| --- | --- |
| `../../src/components` | Known reference navigates to status; intent/reference are persisted before launch; recovery returns before SDK. Keep this default; add a distinct explicit action rather than deleting the guard. |
| `../../src/lib` | Durable attempt hash/fingerprint and order ID preserve owner, quote and payment identity. Recover the existing row; never rerun a fresh purchase with a new UUID. Current prepare also requires matching current catalogue, so it is not a general immutable-order resume endpoint. |
| `../../src/lib` | Bounded native GET currently collapses **every** non-2xx into unavailable. No current UI outcome proves typed provider-not-found. Preserve the deadline while adding any future typed classification. |
| `../../src/lib` | Existing reconcile accepts verified paid/reversal snapshots, rejects other statuses and preserves sticky holds via atomic transitions. A resume classifier must not weaken those checks or release holds. |
| `../../src/lib` | Purchase gates and owner checks differ from webhook verification; keep both. Do not turn status recovery into a publication/channel bypass. |
| `../../src/lib` | Reviewed TEST channel is absent; disabled is the default and only sandbox is accepted. No selected-PG readiness is established. |

## Historical proposed decision table (superseded by receipt above)

All resume candidates require explicit user action, the same authenticated owner,
the exact existing order/payment/store/channel/quote, local pending with no hold,
and applicable purchase/channel/publication gates. No automatic SDK reopening.

| Authoritative observation | Proposed action |
| --- | --- |
| Exact scoped `PAYMENT_NOT_FOUND`, no conflicting local state | Candidate for explicit **same-ID resume** under PortOne's documented one-success rule. Do not label it “definitely uncharged.” Re-fetch immediately before allowing launch; selected-channel acceptance remains pending. |
| Identity/quote-verified `FAILED` | Candidate for explicit same-ID retry, not a new order. Failure describes the observed attempt; retain late-result handling and re-check. |
| `READY` | Not payment completion; may represent an opened checkout. Keep status-only until the selected-PG/in-flight-window contract is established; do not infer abandonment from age. |
| `PENDING`, virtual account issued, active browser flow, unknown status | Status-only. Do not launch another flow or infer terminal failure. Current product requests CARD; do not broaden methods as part of recovery. |
| Verified `PAID` | Reconcile through existing checks; no resume. A late callback must converge on this same order. |
| Cancelled/partial cancellation, refund, dispute or local held | No resume; retain reversal/hold rules. A terminal attempt/payment state is not permission to erase financial history or create a fresh payment identity. |
| Timeout, generic error/404, scope/owner/amount mismatch, unavailable auth/gates | Remain blocked/status-only with context retained; do not reclassify as not-found. |

The table is conservative application policy, not a claim that PortOne forbids
all READY retries. Same-ID duplicate-payment protection does not itself serialize
our browser launches or prove the SDK gives useful concurrent-tab feedback.
Session storage and the component's `pending` ref do not provide cross-tab/server
mutual exclusion. A stale status check can race a webhook or another tab: retain
the same ID, reject paid/held state at the server boundary and make callbacks
idempotently reconcile authoritative current state. No finite “wait N seconds”
rule establishing permanent absence was found in the reviewed sources.

## Historical proposed next implementation — subsequently approved locally

1. Add a narrow server-owned recovery outcome for this existing order, separating
   typed scoped not-found and verified FAILED from unavailable/unknown/in-flight.
   Reuse current transport deadline, ownership, quote validation and sticky holds.
2. Add one explicit same-ID resume action for allowed outcomes; obtain request
   fields from the immutable order/server authority, retain the attempt and
   payment reference throughout, and prevent concurrent local launches. Define
   durable launch arbitration before claiming concurrent-tab safety; do not treat
   a crash-expiring lease as proof that a provider flow ended.
3. Provider-free tests first: typed versus generic 404, timeout, late PAID/hold,
   duplicate click/tabs, lost response, auth interruption, changed catalogue and
   same-ID SDK request/callback convergence. Live UI review follows implementation.

**Still unresolved:** actual approved TEST store/channel and PG; its supported
same-ID retry/error behavior in the selected CARD flow; handling of simultaneously
open windows and late provider outcomes; owner policy for a retained order after
sale/offer changes. Generic docs support the proposal, not activation. Selected-PG
documentation review and any bounded sandbox/device/provider calls need their own
approved scope. No fresh-ID restart is proposed; no migration, installation,
runtime, tests, services, publishing or deployment was performed in this assessment.
