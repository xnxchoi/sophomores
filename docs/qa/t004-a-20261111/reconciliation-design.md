# T004-A — Same-attempt reconciliation design

Assignment: **SPH-T004-A-20261111-01**. Design candidate only; no implementation,
runtime acceptance, owner acceptance or new execution authority. Current source is
mapped in [source-map.md](source-map.md); Sxx references identify frozen source
anchors in [source-anchors.json](source-anchors.json). The original financial brief
and governing commerce plan remain unchanged. Proposed names below are semantic
contracts, **not existing endpoints or approved wire codes**.

## 1. Adversarial boundary matrix — read before the happy path

| ID | Boundary / attack or fault | Required classification and invariant | Proof / slice |
|---|---|---|---|
| B01 | HTTP headers arrive; response body stalls, disconnects or aborts | A 2xx header is not a receipt. Body transport failure is unknown; it is not malformed JSON and cannot prove rollback, failure or nonpayment. | S03/S05; I1, I5 |
| B02 | Complete body is invalid JSON, schema-invalid or has a foreign transaction/order | Receipt integrity rejection; stop automatic provider work, retain exact attempt, no SDK or release. Unknown financial result remains separate from this known receipt defect. | S03; I1, I5 |
| B03 | Payload commit API fulfills after native COMMIT rejects; rollback fulfills for missing session | Neither API fulfillment, deleted session nor absent request transactionID proves durable commit/rollback. Never disclose confirmed/verified failure from these acknowledgements alone. | S18–S22; I0 |
| B04 | Account changes while discovery, body consumption, provider synchronization, confirmation or SDK return is pending | Invalidate the old generation at every await and before UI, storage or dispatch effects; suppress old private results. A mounted component's active flag alone is insufficient. | S02/S03; I4, I5 |
| B05 | Client deadline/unmount fires while server still settles | Stop foreground waiting, not the server transaction. No overlapping request, budget reset, replacement charge or release. Recover by local result read; unresolved server ownership needs server recovery proof. | S07/S18; I2, I5, I6 |
| B06 | Two tabs, two devices, focus/rerender or webhook race | Browser locks are only a local convenience. Server exact-attempt coordination and shared accounting serialize reconciliation; official finalizer alone settles; no double inventory, allowance, admission or fulfillment effect. | S03/S07/S08/S14–S17; I2, I3 |
| B07 | Typed PAYMENT_NOT_FOUND, generic 404, READY, PENDING or PAY_PENDING | Distinct observations, none proves permanently uncharged. No alias normalization, retirement, reservation release or new identity. Existing explicit same-payment resume is not automatic reconciliation. | S09/S11/S23/S24; I1, I3 |
| B08 | Discovery returns zero, overflow, several attempts, or omits a succeeded attempt | Zero unresolved results is not a no-charge certificate. Exact result reader covers completed attempts; overflow stops; several candidates require explicit unambiguous selection. | S04; I1, I4 |
| B09 | Paid response lost; webhook closes browser-independent path first | Local read finds exactly the existing linked order without another provider GET or finalizer. No automatic initiation/resume. | S07/S14; I1, I5 |
| B10 | PAID arrives after retirement/released reservation; stale FAILED read waited on lock | Conflict/hold, no settlement or reopening; locked reread preserves observed risk independently of settlement rollback. A later clear read cannot clear a hold. | S10/S12; I0, I3 |
| B11 | Signed event is duplicate, delayed, out of order, wrong-store or forged; provider GET disagrees | Event authenticates dispatch only; exact authoritative provider evidence governs. Reject forged/mismatched input without financial writes. Do not regress terminal/held state. | S08/S10/S11/S13; I3 |
| B12 | First provider GET is clear, second sees cancellation/dispute | Count both reads; persist validated risk after actual settlement rollback through existing review owner. Never mask it with a third GET. If rollback/quarantine durability is unknown, stop with review persistence unconfirmed. | S06/S10/S18–S22; I0, I2, I3 |
| B13 | 401, 403, missing membership/runtime, configuration mismatch, rate/budget exhaustion | Separate known stops; no generic retry loop. Reauthentication cannot rebind the attempt. Rate eligibility is server-owned; no selected cooldown in this design. | S02/S06/S15; I1, I2, I4 |
| B14 | Newer attempt saved while older result finishes; storage disabled/corrupt | Compare exact saved tuple and generation before clearing; preserve newer state. Do not claim context was retained when storage failed; server discovery remains separate. | S03; I4, I5 |
| B15 | Browser closed and webhook exhausted/missed; process crashes before/after work admission | In-memory flags/maps and signed retries are not durable catch-up. Proposed durable discovery/accounting must survive restart; no background-progress or notification promise before execution identity, mechanism and recovery proof are approved. | S08/S18; I2, I6 |
| B16 | Order exists but linkage, snapshot, reservation, counters or grants are partial/corrupt; later cancellation/refund | Integrity/review stop; never create a second order or repair grants in GET. Preserve financial history, consumed-benefit audit and separate physical stock disposition. | S07/S13/S14/S16/S17; I0, I1, I3 |

## 2. What source establishes, and what it does not

Current checkout and `/shop/payment` mount the same CommercePayment under the
canonical account/identity boundary (S01/S02). Discovery reads own plugin pending,
processing, held or conflict metadata (S04). It does not return ordinary succeeded
history or shipping snapshots. A restored attempt currently waits for a customer
check; SDK return invokes confirmation once (S03). The existing no-auto-confirm
restoration test must be deliberately revised, while its no-auto-SDK guarantee stays.

Browser check uses the installed hook if a current cart exists and a direct POST to
the **same official endpoint** otherwise (S03/S05). The wrapper performs risk
preflight before generated settlement. The adapter performs a second provider read,
validates exact PAID, locks/rereads the reservation/transaction and invokes the
official plugin finalizer (S06/S07/S10). Webhooks verify bounded signed bytes and
store identity, then dispatch that same configured handler using a request-private
capability (S08). They do not create another settlement authority.

The official finalizer claims pending→processing, creates/links the canonical order,
marks the cart purchased, decrements inventory and marks the transaction succeeded
(S14). Project transaction hooks settle allowance/reservations and grant admissions
in the same request transaction (S13/S16/S17). Fulfillment is a distinct lifecycle;
settlement must not initiate shipping or duplicate later operations. Existing
reservations, grant identities, terminal guards and locks are valuable source
safeguards, **not source-only exactly-once or crash-durability proof**.

The installed transaction lift catches the native transaction rejection, and its
completion API can therefore fulfill despite native failure. Commit/rollback also
ignore a missing session; Payload kill suppresses rollback errors (S18–S22).
Initiation, risk quarantine, retirement, generated settlement and non-claim commerce
operations all reach these paths. T005's claim-only native acknowledgement is a
precedent to examine, not a payment repair or permission to transplant its wrapper.
Do not call review.ts's comments or mocked commit counts durable acceptance.

### Mandatory authority ordering

1. Fresh canonical account and authoritative membership for customer operations;
   verified signed-event capability only for the existing webhook dispatch.
2. Exact server ledger identity and immutable snapshot, then current holds/conflicts
   and reservation consistency. Failure here does not authorize provider work.
3. Local canonical result if sufficient; otherwise approved server reconciliation
   admission with serialized provider-call accounting.
4. Exact provider evidence through the current adapter/review owners; official
   finalizer remains sole settlement writer. Risk never disappears on rollback.
5. Native transaction-end acknowledgement plus independently observed persisted
   state under the eventual DB acceptance contract. A response object or browser
   receipt alone cannot upgrade financial certainty.

Physical crash durability and once-only effects remain unproved until I0 and the
separate DB/runtime proof. A post-transaction read establishes committed visibility
under the tested boundary, not a universal guarantee about storage or power loss.

## 3. Proposed three-operation contract

### R — Local result read, never reconciliation

Propose a strictly validated, authenticated, same-origin read of **one exact plugin
transaction/payment pair** with retained cart binding. Use the owning account and
server snapshot; no arbitrary lookup by provider txId, email, last digits or current
cart. Read current transaction and exactly linked commerce-v1 order, reservation
state and consistency evidence needed for the projection. GET performs no provider
I/O, settlement, hold change, release, grant repair or budget consumption for provider
work. Abuse-rate accounting is not a financial mutation.

For a succeeded attempt, verify owner, transaction↔order backlink cardinality,
commerceAttemptID, snapshot/hash/amount/currency/item identity and applicable
reservation/settlement consistency. Return confirmed only after the implemented
transaction-completion contract supports it and absent review/conflict. Report an
existing held order as review-required with an authorized canonical order reference
where safe, never as ordinary confirmed. Partial/corrupt state is integrity/review,
not permission for a replacement order or GET-time repair.

Pending/processing/no order means local unresolved, not proof of provider processing.
A missing row, access-denied row or generic 404 cannot prove no charge or invite
another payment. Public absence/foreign-record projection must not disclose whether
another account owns it. Keep pending discovery distinct: same non-PII listing,
bounded overflow behavior and explicit selection; completed results are recovered
through exact R and an owner-scoped completed-order recovery surface, not an
arbitrary first pending row. If browser context is lost, own server history may
present multiple identifiable own candidates; do not silently pick one, and do not
set a retention or history-window default here.

### C — Bounded server-controlled same-attempt reconciliation

C is a state-changing authenticated POST proposal, not a GET, a renamed `/resume`,
or a browser timer repeatedly calling `/confirm-order`. Preserve the current
bounded-body, same-origin, canonical membership, no-RSC, no-store and private-write
capability boundaries. No arbitrary browser `retryable`/budget/authority flags.
Untrusted inputs name only the existing tuple; server binds snapshot, store/channel,
account, cart, product/release/event, quantities, price/version/address snapshots.

Proposed flow, conditional on owner-approved limits and transaction remedy:

1. Authenticate; validate tuple and ledger consistency; inspect current holds and
   terminal outcomes through R semantics. Confirmed needs no provider call. Stops
   do not enter provider transport.
2. Atomically admit or join **one same-attempt operation**, with persistent attempt
   identity, generation/fencing, in-flight/outcome marker, provider-call debit and
   eligibility state. The existing plugin transaction is the financial owner;
   narrowly scoped reconciliation metadata may extend it subject to schema review.
   This is a requirement, not a selected new collection/queue/retention mechanism.
3. Shared accounting covers browser C, explicit checks, webhook-triggered work,
   catch-up and resume/retire provider reads. Distinguish reconciliation allowance
   from authenticated event-ingress limits. Owner must approve how critical signed
   risk events remain processable when foreground allowance is exhausted; until
   then no public automatic-check activation. Do not silently discard reversals or
   add an unlimited webhook exemption. Reserve/debit before outbound dispatch and
   retain debits for timed-out/unknown dispatched reads. Restart/focus cannot reset
   them. The existing logical confirmation can consume two provider GETs. If a
   full admitted operation cannot fit, stop before it starts; if the second read
   becomes impossible, no assumed PAID settlement or cleared hold.
4. Route clear PAID through the current risk preflight → official generated
   confirm-order → adapter → finalizer path. Avoid looping that path for already
   confirmed local results. Provider read classification must be made available at
   the owning transport/proof boundary without weakening validation or creating
   a second settlement engine. READY, typed absence and unsupported status do not
   reach finalization. Verified FAILED is reported only with exact provider identity
   and absence of conflicting local evidence; it does not auto-retire. New failure
   classification must not pretend the current PAID-only preflight handles FAILED.
5. Joiners read the same operation/result; they do not start parallel provider
   calls. Business settlement locks remain in the existing consistent resource
   order. Do not hold a new coordination SQL lock across a nested official transaction
   in a way that deadlocks it. Transaction lifetime/lock ownership is an I0/I2
   architecture proof, not solved by a request flag or session promise.
6. Record result only after the relevant native completion acknowledgement. Stale
   generations may not authorize new writes, clear holds, overwrite a later result
   or refund debits. A transport timeout or expired lease alone cannot demonstrate
   the old provider/server operation stopped. Crash recovery must reconcile durable
   local state and fence/join or stop unknown ownership before another operation;
   do not use elapsed age as proof of safe concurrent execution.
7. Return a narrow outcome projection plus server eligibility/stop information.
   Request deadline, foreground wait bound, delay/backoff, total calls, cooldown,
   eligibility lifetime, abandoned-operation handling and escalation trigger are
   **unset owner/provider/runtime gates**. No numbers selected here. With no
   approved policy, automatic scheduling remains inactive, not infinite or default.

Automatic return/restoration may perform R, then request C only for an exact
unambiguous same-account attempt that passes fresh readiness and server admission.
That implements the owner's system-owned checking direction without new payment
authorization. Hidden/unmounted/identity-invalid UI stops initiating foreground
work. Server in-flight completion remains legitimate but its stale UI receipt is
suppressed; remount performs R/join, not a reset. Manual refresh, if present, uses
the same admission and cannot bypass rate/cooldown/budget stops.

### P — Explicit payment operations remain separate

Initiation, resume/SDK launch, method change and retirement each require their
existing explicit customer action and fresh server validation; no C/R outcome
automatically invokes them. Same-account restoration never calls initiate, resume,
retire or the SDK. Selection of an unresolved attempt grants status-check scope,
not payment authorization. Never rotate attemptID/paymentID due to uncertainty.

Current `/resume` uses one provider read and returns status-only except exact
FAILED→retirable or typed absence→same-payment resumable (S09). Typed absence is
not proof of permanent absence. Preserve explicit same-ID reopening only within
the current owner-approved TEST contract and its separately unproved provider/device
acceptance; do not broaden eligibility to READY/PENDING/PAY_PENDING or use it as
automatic retry permission. Retirement independently fetches FAILED after locks
and requires no order/hold/conflict (S12); a UI hint is not authority. Cancellation/
dispute handling remains the existing verified review path, including its
evidence-backed release behavior; this design adds **no automatic release rule**.

## 4. Outcome, actor, disclosure and stop matrix

These are domain distinctions for later typed contracts, not approved UI wording
or a claim that current HTTP handlers distinguish them. Use status **and** consumed
body/schema/identity evidence; HTTP 409/500/503 alone is not financial classification.

| Outcome / observation | Server/system action | Customer action / disclosure | Automatic continuation |
|---|---|---|---|
| Confirmed canonical own order | R returns existing order; retire only matching browser recovery pointer, not financial attempt | Display canonical result/manage-order navigation automatically; no required refresh | Stop provider checks; never new charge |
| Local unresolved, no provider evidence yet | R exposes uncertainty; C only after admission | No decision needed just to check; stable inline busy slot during bounded wait | Eligible C only; no not-paid or processing claim |
| Retryable unknown with affirmative server eligibility | Preserve attempt/debits and bounded next-check eligibility | Honest unresolved result/recovery surface after wait bound; no customer retry obligation | At most policy-admitted serialized work; unset policy means stopped |
| Fetch/header/body transport loss or deadline | Record dispatched/in-flight uncertainty, then R/join | State that result is not known, not that charge failed; do not promise storage if it failed | No immediate identical retry; server eligibility required |
| Complete malformed/mismatched receipt | Known receipt integrity stop, financial result separately unknown | No new-payment invitation or raw diagnostics | Stop C until trusted reread/integrity resolution |
| Exact verified FAILED with no contradictory local evidence | Preserve evidence; existing explicit safe retirement path must independently reverify | Explain failure and supported explicit resolution, not generic uncertainty; never auto-retire | Stop automatic checks; explicit P only |
| READY / typed not-found / unsupported PENDING or PAY_PENDING | Preserve distinct provider observation and local reservation; no finality inference | Result unresolved; no claim that pending status aliases CARD processing | Only policy-eligible C; no SDK/retirement |
| Review, reversal/dispute, partial/full cancellation, late PAID conflict or preexisting hold | Existing review owner persists validated evidence/holds with proven completion; retain used-benefit audit | Explain known review condition without exposing evidence/other identities. Only approved support path, no invented staff resolution | Stop ordinary C/P; no hold clearing, refund, access grant or speculative release |
| Quarantine/settlement/retirement commit or rollback unknown | Preserve financial uncertainty and recorded observed risk; do not assert hold persisted or operation failed safely | No success/failure guarantee, no second charge; operational attention remains unassigned until owner gate | Stop new work; local read/recovery proof needed |
| Authentication required/session expiry | Stop new foreground calls; reauthenticate same account; keep private state hidden | Supported login action; no claim that new account can inherit attempt | Resume only after fresh same-owner membership and R |
| Changed account/fresh membership denied/provider sync unconfirmed | Invalidate generation; isolate private DOM and pointers, no rebinding | Do not reveal former account's address/order/payment details | Stop; identity revalidation alone is not payment authorization |
| Integrity/configuration/authority rejection; corrupt reservation/order/grant | Fail closed without provider work or financial repair | Safe non-PII stop; no menu of speculative causes or forced retry | Stop automatic work |
| 429 / local limiter saturation / provider limit | Respect server stop eligibility; distinguish rate stop from payment failure | Inline wait/availability condition only if supported; no invented cooldown | No repeat until approved server eligibility |
| Total call budget or foreground wait exhausted | Persistent budget stop; foreground exit does not cancel server settlement | Discoverable exact-result surface; no endless spinner, notification or background-progress promise | No budget reset; catch-up requires separate admitted policy |
| Several candidates / discovery overflow | Bound listing; preserve records; request explicit own-attempt selection or review for overflow | Selection is actual new information the customer owns | No guessed first candidate or automatic P |
| No owned attempt found / generic 404 | Safe private absence projection; preserve retained evidence | No unresolved listing is not proof of no charge | No automatic new payment or release |

### Privacy and stale-completion contract

Keep browser persistence limited to the current versioned attempt/cart/payment
identifiers, partitioned by canonical account. No shipping, names, email, provider
payload, SDK request, bearer or secrets in storage/URLs/telemetry. Server snapshot
continues to own address/charge identity; retention and courier disclosure remain
owner gates, not a new persistence promise. SessionStorage does not provide a
cross-device or browser-close guarantee. Server recovery is separately designed.

Capture account identity generation, selected tuple, request generation and matching
storage value before dispatch. Recheck them after headers, body, schema validation,
account synchronization, C completion, refreshCart and SDK return, and before
display/navigation/storage clearing. Do not let an old success clear newer storage,
show a foreign order, or unblock a different cart. Abort is cleanup, not proof the
server rolled back. The current identity boundary keeps hidden children mounted;
therefore payment effects must also observe blocked readiness/invalidation rather
than assume unmount. I4 must carry a fresh full readiness contract; T009-A own-ID
receipt is not proof of that full contract. Unknown identity does not erase same-
owner data, but it must not expose or act on it.

## 5. Browser-independent catch-up — required, not implemented

Existing signed webhook handling is browser-independent. Its WeakSet, deferred
WeakMap and local rates are request/process memory, not a durable delivery inbox,
restart scheduler, notification service or escalation workflow. The inspected
payment path has no demonstrated durable missed-webhook catch-up owner. Retries
outside the merchant are not an eventual-delivery guarantee.

Propose restart-discoverable unresolved plugin attempts and durable reconciliation
admission/outcome/evidence references, using existing Payload ownership. Recovery
must cover: prepared but SDK never opened; provider request dispatched but receipt
lost; provider PAID before webhook; local settlement committed but HTTP lost;
quarantine pending after settlement rollback; crashed/stuck coordination ownership;
signed risk event while ordinary call budget is exhausted. No record is retired or
capacity released merely because it is old. Minimal evidence is retained under the
existing financial evidence policy; this design chooses no retention window.

The **owner must designate** the operational actor and authorized invocation,
policy budgets/deadlines, restart/catch-up mechanism, unresolved-review surface and
escalation path. Initially sensitive commerce authority stays superadmin-only;
that does not mean today's admin UI already offers resolution or a scheduler can
impersonate a customer. Reuse an existing infrastructure facility only after its
capabilities and execution identity are verified; no new queue/service selected.
Background work cannot forge the webhook capability or reuse browser CSRF/session
authority as a service grant. Any new trusted entry needs explicit scope review,
not another finalizer. Until these gates and I6 pass, delivery is incomplete and UI
must not say the system will keep checking or notify the buyer after closure.

## 6. Dependency-aware, test-first implementation slices — not authorized now

All proposed tests belong under repo-root `tests/commerce/`. Each slice requires
separate bounded local implementation approval, RED observed before GREEN, exact
candidate identity and retained failures; no test/build/DB/provider run occurred
for this design. Use installed library APIs and nearest-owner modules, not a new
generalized payment engine. Future Node/test/dev work must use resource-guard, one
workload per checkout, physical headroom and 15 GiB aggregate ceiling.

| Slice | Dependencies / affected callers | 1–3 verifiable acceptance criteria (RED → GREEN) | Acceptance beyond offline tests |
|---|---|---|---|
| **I0 — Transaction-end and ownership proof/remedy** | First. Generated confirm handler, adapter initiation, review/quarantine, retire; non-claim domain callers of inCommerceTransaction remain explicit regressions, not silently repaired. Read S18–S22 and claim precedent S25. | (1) Native harness reproduces swallowed COMMIT rejection, rollback rejection/absent session and ownership loss; no known financial receipt from an unproved completion. (2) Approved remedy keeps same-request official finalizer/hooks, locks and independent quarantine after **actual** rollback; fails closed for nested/stolen/disabled/bundled sessions and commit acknowledgement loss. (3) Faults between each settlement effect cannot leave a reported successful partial result or erase already observed risk; unknown remains recoverable. | Owner approves remedy/schema or dependency scope, if needed. Separately authorized isolated local PostgreSQL fault/concurrency/restart proof is mandatory before financial durability claims. No upstream install/edit now. |
| **I1 — Typed local result/outcome projection** | I0 for confirmed durability claims. access, contracts, pending, proposed exact result reader, current confirm transport/proof classification; shop/payment/order callers. | (1) GET has zero provider/finalizer/domain mutations; own succeeded order recovered with exact linkage/snapshot; foreign/missing/partial/held/terminal outcomes private and distinct. (2) Native response tests separate headers from body transport loss and consumed invalid JSON/schema; HTTP alone cannot assert paid/failed. (3) Exact PAID/FAILED/not-found/READY/unsupported statuses and integrity/auth/rate stops map without alias/retry inference. | Schema/API owner review, real authorization/data-link proof; no current provider API claim. |
| **I2 — Persistent bounded admission and accounting** | I0/I1 plus owner-approved numeric limits and signed-risk budget policy. C, both provider reads, webhook/resume/retire accounting, existing locks. | (1) Concurrent requests/tabs/processes join or stop one exact operation; native completion and fencing prevent stale publish/hold clearing. (2) Count every dispatched provider GET, including the two-read confirmation and uncertain transport; limits survive rerender, restart and joiners; stop before partial-budget execution. (3) Client timeout/expired ownership never starts overlapping work; crash recovery either proves/join-finishes ownership or stops unknown. | Shared/distributed admission and real DB contention/restart/lock-order proof; owner chooses policy, not test fixture timings. |
| **I3 — Official settlement/review integration** | I0–I2. Existing secureEndpoint, signed webhook, adapter, review, retire, reservations, admissions/benefit review; physical fulfillment and return callers as regressions. | (1) Browser+C+duplicate/delayed/out-of-order signed events recover exactly one canonical order through finalizer; assert inventory, net-three allowance, event capacity, buyer-self allocation, admission and fulfillment identities once. (2) Second-read risk, late PAID/released reservation, cancellation/refund/dispute/hold survive confirmed rollback/quarantine and never regress/auto-release/reopen. (3) Exact verified failure permits only existing explicit reverified retirement; typed/generic absence, READY, rate/integrity stops never release or launch. | Real DB effect counts and fault injection; separately approved provider/webhook authenticity/delivery/reversal tests. No source/mock-only exactly-once claim. |
| **I4 — Full identity/readiness and recovery selection** | I1, current T009-A conventions; full fresh account/member contract coordinated with governing step 6. checkout boundary, payment, account/session and own history/result surfaces. | (1) Authentication, account switch and unconfirmed sync block dispatch/DOM at every await; old completions cannot show/clear another account/attempt, including hidden-mounted children. (2) Same-account refresh preserves actual mounted draft where supported, no false durable-address promise; newer retained pointer survives old success and storage errors are explicit. (3) Multiple own attempts require selection; zero/overflow/foreign/missing records never imply safe new charge. | Real canonical account/membership/session journey, privacy and retention owner gates; T009-A tests alone insufficient. |
| **I5 — Automatic return/restoration UI** | I1–I4 and approved bounded waiting policy. CommercePayment both callers, plugin-hook/current-cart and direct-official/no-cart branches, redirect route and canonical order page. | (1) Replace restored-attempt no-auto-confirm expectation with R→eligible C; SDK return, reload, focus and mobile redirect never auto initiate/resume/SDK/retire; no repeated unbudgeted check. (2) Stable inline busy state ends at approved bound; confirmed navigates/displays existing order without mandatory click; unknown/stops remain discoverable and case-specific. (3) Body read faults, stale generation, unmount/server-still-in-flight, locks unavailable, cart refresh/storage failure preserve known paid result without mutating newer caller state. | Actual guarded desktop/phone-width live render plus harsh Santa; physical mobile/in-app redirect/popup, Web Locks and real-device acceptance separately approved. No catalogues edited now; later first-party copy uses en.json, ko.json unchanged absent translation request. |
| **I6 — Durable catch-up and operational handoff** | I0–I3 plus approved operational actor, invocation, policy, infrastructure and retention decisions. unresolved ledger, signed webhook recovery, existing authorized operator surfaces. | (1) Browser closure/process restart/exhausted webhook delivery discover the exact unresolved attempt and reenter the same admission/finalizer, no new charge/authority/queue by default. (2) Restart/fault windows around debit, dispatch, quarantine, settlement and result publication neither lose evidence nor duplicate effects; unresolved ownership stops. (3) Approved escalation is actionable by the actually authorized actor, with verified minimal disclosure and no promised nonexistent background notification. | Owner operational/security approval; separately scoped DB/runtime recovery and provider delivery proof. Not a waiver for I4/I5 or public auth gates. |

Parallelizable planning is not permission to start these slices. I0 blocks financial
guarantees; I1 can be designed/characterized offline but cannot claim repaired
durability. I4 readiness contracts can be designed alongside I2; activation of I5
waits for both. I6 can be specified alongside UI but must be accepted before the
full payment-recovery task is complete. Existing governing steps 2, 4, 5, 6 and 8
own these integrations; deployment remains the final milestone after all commerce,
registration, verification, fulfillment, product/policy and recovery gates.

## 7. Fault coverage crosswalk and release of this design only

| Required scenario group | Matrix / slices | Affected branches to test |
|---|---|---|
| Lost success, browser closed/reloaded, redirect | B01/B05/B09/B15; I0/I1/I5/I6 | hook/current cart, direct official/no cart, server history without sessionStorage, canonical result and admissions page |
| Duplicate/delayed/out-of-order webhook and concurrent tabs | B06/B10/B11/B12; I0/I2/I3 | preflight, second read, deferred risk flush, same native signed request, official finalizer CAS/replay and all hooks |
| Session expiry/account switch/fresh membership | B04/B13/B14; I1/I4/I5 | own-ID header/body/sync boundaries, hidden child, storage/newer intent, SDK return and refreshCart |
| Exact attempt selection and private absence | B07/B08/B16; I1/I4 | pending product filter/no filter/overflow, completed/held history, generic404 vs typed provider absence |
| Deadline, rate, budgets, lock/DB/native failures | B01/B03/B05/B06/B12/B13/B15; I0/I2/I3/I5/I6 | no-Web-Locks, same-tab ref, multi-process fencing, native/bundled module graph, commit/rollback/connection loss, restart |
| Terminal/held effects, stock/allowance/admission/fulfillment | B10/B11/B16; I0/I1/I3 | failure retirement, full/partial reversal, dispute, consumed benefits, physical returns/restock separated; no read-time repair |

Remaining owner decisions: numeric scheduling/budget/deadline policy and critical
risk-event handling; transaction remedy ownership; durable catch-up mechanism and
authorized actor/escalation; retained history/draft/address policy; actual provider/
KPN status and device proof. These are held, not silently chosen. This document
does not approve UI wording, a retry button, a new support power or production.

Design handoff gate: frozen hashes/anchors/scope checks, then two fresh independent
Santa design reviewers on the identical original spec/output/rubric; both PASS,
maximum three correction/review cycles. Their agreement is design-quality evidence,
not owner acceptance. Custodian alone updates the registry/plan and decides closure.
