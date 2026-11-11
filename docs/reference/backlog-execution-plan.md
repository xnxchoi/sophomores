# Backlog execution plan — isolated, resource-admitted local slices

**Updated:** 2026-11-11. **Scope:** custodian dispatches bounded local execution chats;
separate policy, provider, dependency and delivery gates remain.

Current owner replacement: this chat maintains custody and dispatches bounded
local execution chats in isolated managed worktrees; it does not implement assigned production changes. Actual
invocations or the observed >2 implementation-unstarted trigger route work. Scheduling
is exclusively automation configuration; no interval or continuous watcher lives here.
The registry assignment contracts control current ownership and administrative
closure. Its “Isolated execution, integration and retirement” section is the current
worktree/resource/integration policy; it supersedes former single-flight routing.

The [To-Do List](../To-Do%20List.md) owns the single live progress/ownership panel.
The [commerce launch plan](commerce-launch-plan.md) remains governing; deployment
is its final milestone. This file owns execution scope, routes and acceptance,
not a competing project tracker. Historical recording-only restrictions in task
captures do not revoke the new local-execution instruction; unresolved product
choices and specifically gated external actions are not silently approved.

## Loop contract

1. Reread current instructions, registry and owning source. Compare current
   dirtiness and live ownership before writing; preserve concurrent edits and
   stable task IDs. Reconcile/resume existing assignments before filling additional
   dependency-ready, resource-admitted worktree slots; never duplicate an owner.
2. Decompose broad tasks into bounded slices with 1–3 acceptance criteria. Route
   with plan-orchestrate's documented task-description forms; the router is
   generative only. Each new assignment gets a fresh local execution chat, managed
   isolated worktree and unique codex/ branch; native subagents may review within
   its scope. Record exact base/dependency commits and selected dirty-source
   provenance, owned files, resources, checks and reporting route before dispatch.
3. Write failing tests, record RED, implement minimally and record GREEN. One
   guarded app workload per checkout. Concurrent isolated checkouts require verified
   ≥10 GiB actual system headroom and ≤15 GiB aggregate agent usage, including
   reviewers/tools/browsers; no duplicate or orphan workloads. Separate mutable
   outputs/ports/fixtures; existing dependencies only, no implicit install.
   Existing dependencies only; no env/credential/provider/DB transport opt-in here.
4. Run deterministic checks and required language/code/security review, then two
   fresh independent Santa reviewers with identical original spec/output/rubric.
   Both must pass; fix only flagged defects and rerun both fresh. Cap at three
   fix/re-review cycles for a slice, then checkpoint the specific unresolved issue.
5. UI changes additionally require the real local render and harsh Santa review;
   source assertions are not visual acceptance. Provider/device/PG acceptance is
   distinct. Partial slices do not complete whole tasks.
6. After frozen-candidate acceptance, serialize local integration into main.
   Assignment-scoped local commits/merges are owner-authorized; unrelated WIP is
   not. Test combined results in a clean integration worktree; recheck main drift
   and conflicts, rerun affected checks/reviews after changes. Never force dirty
   main or move its checked-out branch behind the working tree; record a specific
   integration blocker if safe advancement is unavailable.
7. Persist evidence-based project learning (or exact pending blocker); verify
   main reachability, combined checks, no unresolved work/owned workloads and
   preservation of needed ignored files/evidence. Then recoverably archive the
   managed execution worktree with supported tools and finally archive its chat.
   Keep acceptance, integration, learning, retirement and parent completion distinct.
8. Advance safe independent work while policy choices are pending. Do not repeat
   broad research, expensive unchanged checks or busywork. No remote push, external
   agents, readiness or deployment is implied. Keep plan-canvas stopped.

**Global scope guard, inherited verbatim by every route:**
Out of scope: unresolved policy and separately gated external actions.

This includes custody/recovery/transfer/retention choices not yet selected,
provider/chain/RPC or email transport, credentials/permissions, dependency phases,
hardware procurement/programming, destructive DB actions, readiness/image/backup,
push/publication and deployment; local commits/merges are limited to the new
accepted-assignment integration policy. Necessary guarded, provider-free local
checks are within execution scope; a synthetic test is not an actual provider proof.

## Dependency and readiness map

| Task | First/next slice | Dependency or gate |
| --- | --- | --- |
| T005 | A locally accepted; own-result recovery remains | UI/copy, holds and real runtime/DB acceptance remain later gates. |
| T001 | A locally accepted: settlement occupancy; activation/display next | Coordinate same-entitlement continuation with T010/T003; real DB/runtime acceptance remains separate. No token prerequisite. |
| T010 | A: resumable verified claim intent | T001/T005 authority plus safe continuation/account-switch design. No redundant confirmation, no second claim engine. |
| T009 | A: account-read outcome contract | Reuse outcome conventions; durable draft retention remains an owner decision. |
| T004 | A: payment contract and provider-free reconciliation design/tests | T005/T009 conventions; provider timings/calls, catch-up infrastructure and real payment acceptance remain gated. |
| T006 | A: name-correction actor/state decision matrix | Correction versus reassignment/transfer policy must be selected before implementing the operation. |
| T007 | A: case/proof/correspondence/access-grant design | Same account and bound-phone proof settled; app authority, case security and actual mail transport need bounded decisions/approval. |
| T002 | Review delivered blueprint; next minimal proof request | Custody/issuer/check-in recommendations are not owner acceptance. No repeated broad P1 research or live minting. |
| T003 | A: surfaces from ready backend contracts | T001/T005/T010/T009; T004 owns payment recovery. Copy/visual acceptance and owner's Korean work remain protected. |

Within a checkout, no two writers own the same paths. Across isolated worktrees,
coordinate shared commerce/account contracts and record dependency/integration order;
shared logical ownership is not solved by Git isolation. Read-only reviewers count
toward aggregate resources. One guarded workload per checkout is not a global quota
bypass. When a policy or source-baseline gap blocks one assignment, record its
next actor/action and continue safe independent work elsewhere.

T004-A is an explicit transition exception: finish its frozen documentation-only
review in place without relocating/rebasing or expanding its no-commit scope. Future
assignments use isolated worktrees. Existing dirty main is preserved, not implicitly
committed or copied wholesale. Baseline preparation may be separately blocked.

## First implementation slice — T005-A

**Owned source:** `src/lib/commerce/guests.ts`, `domain.ts`, shared schema
in `contracts.ts`, and a claim-only owned native Drizzle boundary/opt-in session
guards in `src/lib/commerce/_shared/transaction.ts`. Tests/fixtures stay under
`tests/commerce/domain/`. No UI/TSX, English/Korean copy, migrations or dependencies.

**Library/ownership gate:** Payload 3.92.1's installed APIError directly carries
status/data/isPublic; do not build a parallel error class or a renaming wrapper.
Existing project contracts and endpoint-factory patterns take precedence over new
transport abstractions. APIError expresses domain intent, not a persistence outcome.
**Fix cycle 1:** both independent reviewers rejected the first candidate: installed
Payload/Drizzle can resolve rollbackTransaction for a missing session or absorb the
native transaction error. Awaiting that adapter API is not positive rollback proof.
The failed candidate and its deterministic receipts are retained, not called accepted.

Use the installed native Drizzle transaction promise for claims only. Its installed
node-postgres implementation awaits rollback before rethrowing the callback error.
Throw a private per-attempt sentinel distinct from the original claim APIError;
only native rejection with that exact sentinel permits restoring the original
known rejection. A rollback failure, including one throwing the original APIError,
must not impersonate that private acknowledgement. Preserve the existing generic
financial transaction wrapper rather than rewriting payment callers.

Payload session reject/resolve must be nonblocking contamination signals, not a
wait on native completion inside its callback. Internal abort/commit, missing or
replaced session, request-ID loss and inherited ownership are unknown/fail-closed.
Opt-in request/session guards before and after claim Local API helper calls prevent
Payload's missing-session fallback from silently continuing on the pool. These
checks are no-ops for legacy non-claim callers. Clean up only invocation-owned
state; no retries or duplicate work after contamination. Native-control tests use
the actual installed library with a fake client, not a real PostgreSQL connection;
physical DB/session coordination and fault acceptance remain separately unproved.

| Authoritative condition | Machine outcome | HTTP / boundary |
| --- | --- | --- |
| Malformed/nonexistent bearer or mismatched digest | CLAIM_INVALID | 400; never invent historical rotation/recipient details. |
| Matched token/event with a finite cutoff proven elapsed | CLAIM_EXPIRED | 410; malformed stored dates are integrity/unknown, not expiry. |
| Matched consumed bearer | CLAIM_CONSUMED | 409; bearer state only, not proof that this account's earlier mutation failed. Own-success recovery is a later slice. |
| Matched revoked/nonclaimable record | CLAIM_UNAVAILABLE | 409; no other claimant identity. Existing generic holds not yet explicitly classified remain conservative unknown. |
| Combined own-account readiness rejection | ACCOUNT_NOT_ELIGIBLE | 403; do not misdiagnose banned/email/active readiness as specifically missing phone proof. |
| Existing binding for this authenticated account/event | EVENT_ALREADY_BOUND | 409; no new gift consumption. |
| Infrastructure, commit, rollback, integrity or unproved outcome | CLAIM_RESULT_UNKNOWN | 503 for the parsed claim action; no raw exception and no implied safe retry. |

**Acceptance:**
1. Domain and endpoint tests distinguish finite expiry, invalid stored dates,
   invalid/rotated/unavailable/consumed bearer, account eligibility and own-event
   conflicts without leaking raw errors, bearer secrets or other identities.
2. A known HTTP rejection requires original callback-error identity plus the native
   owned transaction's private rollback sentinel acknowledgement. Typed-looking
   commit/rollback errors, missing/contaminated sessions and inherited ownership
   stay unknown; no Local API work continues after ownership loss. Tests exercise
   actual installed native control flow without claiming real DB acceptance.
3. Existing success shape, hashing/rotation/single-use guards and all non-claim
   endpoint status/body contracts remain compatible, especially the staff return
   consumer's literal generic error. No ownership, financial or UI policy changes.

**Not in A:** same-claimant success reconciliation, UI messages, automatic claims,
physical/NFC activation, settled self allocation, provider/DB acceptance or complete
T005 completion. The existing optional/name-only admission behavior is not approved
by retaining its untouched tests during this narrow contract slice.

**Evidence requirements:** focused guard receipts for RED/GREEN; scoped regression,
type/lint results and changed-line coverage where feasible; deterministic versus
runtime/real-DB limitations explicit. Test fixtures cannot silently opt into actual
credentials, env loading, providers or live data. Before a heavy workload, audit
current physical headroom and agent-owned descendants; stop only verified owned
idle workloads, never user/other-session processes.

**Local acceptance checkpoint (2026-11-11):** candidate 3 passed fresh dual Santa
review and TypeScript review after the two rejected candidates retained in
[the evidence ledger](../qa/t005-claim-contract-20261111.receipts.json). The accepted
seam uses same-static-graph public adapter factory construction, not native-vs-
bundled method identity. Malformed bearer validation remains inside owned rollback.
The installed-Next-webpack module-graph probe is not full configured Next/SWC/
runtime acceptance, and native fake-client rollback is not physical PostgreSQL
fault/concurrency acceptance. Whole T005 and its UI/recovery/hold work remain open.
The next dependency-ready bounded batch is T001 allocation (step 2); this does not
broaden policy, external-action or deployment approvals.

## T001-A bounded implementation specification

**Technical representation:** settlement reserves the buyer's one event/account
slot using the existing unique `eventAccountKey`. Keep `claimedAccount` unset and
status available until a separately implemented activation promotes that same unit.
This is immutable-buyer/event occupancy, not membership minting, admission proof,
perk activation, a fabricated name/account or a completed customer journey.

**Ownership:** `src/lib/commerce/guests.ts` grant and claim/issuance guards;
focused tests under `tests/commerce/domain/`. Reuse existing collections/indexes,
Payload helpers and native crypto. No schema, migration, financial finalizer,
accepted transaction seam, UI/catalogue, dependency or configuration change.
The existing commerce plan remains governing; its earlier optional/name-only
baseline is historical where superseded by the registry's settled T001/T010 rules,
not approval of those legacy paths or permission to silently change them here.

**Sequence:** preserve immutable paid reservation/order/transaction checks; lock
order-admissions and pre-read all expected units. Complete existing grants validate
and return unchanged, including cleared/revoked historical allocations. Partial or
mismatched existing grants fail closed before writes. For a wholly fresh grant,
derive the key from snapshot buyer/event and lock the same event-account key as
claims, then reread occupancy. Unit 1 gets self occupancy only when absent; all
remaining/subsequent units are gifts. Add the account lock late; never acquire
order-benefits/existing-admission locks after it or reverse the inspected lock graph.
Validate any discovered occupancy against its actual claimed account or reserved
buyer/event. Block issuing a reserved-self unit as a gift or overwriting its key
through gift claim; corrupt state remains unknown, not an invented business result.

**Acceptance (all three):**
1. One reserved self per account/event before activation; other events remain
   independent, existing gifted ownership blocks another self, and logical
   settlement-first/claim-first interleavings leave losing invitations unconsumed.
2. Stable complete replay; no resurrection or replacement self after key clearing/
   revocation; partial/mismatched grants and corrupt discovered occupancy fail
   closed before new allocation. Unchanged allowance/payment/order/delivery ownership.
3. Reserved self is not giftable, overwritable, activated or perk-eligible; preserve
   accepted T005 typed/unknown and non-claim HTTP contracts. Record measured RED/GREEN,
   guarded regressions/coverage, lint/full typecheck and fresh independent dual review.

**Required downstream gates:** T010/T003 must expose self-bound/activation-pending,
not an available gift, and provide authorized activation of this same entitlement.
No self-activation route, name source, NFC issuance, or T006 correction/transfer policy
is invented here. Existing name-only check-in is not newly accepted. Real database
indexes, rollback/competing SQL transactions, full runtime/UI and provider/device
acceptance remain separately unproved; serialized fake interleavings are not those
proofs. The fake does not implement rollback: test pre-write guards explicitly.
Whole T001 remains in progress after any local allocation-slice acceptance.

**T001-A local acceptance (2026-11-11):** frozen candidate passed fresh independent
dual review, TypeScript review and guarded deterministic gates; see
[allocation evidence](../qa/t001-allocation-20261111.receipts.json). Complete grants
remain unchanged; released reservations still reject. The real-Payload gift fixture
was adapted source-only and never run. Self activation/display, real SQL/runtime
and whole-T001 acceptance remain pending. Advance the T010 planning route next;
policy-gated choices must remain proposals, with T009 safe contract work available
rather than treating the entire backlog as blocked.

## T010-A server-owned continuation proposal — design only

**Owner direction, 2026-11-11:** develop a server-owned intent design with a
protected opaque browser handle. This approves design, not storage implementation,
retention/expiry values, transport/cookie attributes, migrations or public activation.
The owner deliberately leaves self-activation timing unselected and requires easy
switching between after-purchase and delivery-gated methods. Do not ask them to
choose one prematurely or silently implement either as the permanent policy.

**Four separate authorities:** retained context → explicit intent → account
proof/readiness → the existing claim transaction and authoritative result. Context
capture, GET, preview, refresh, status reads and callback arrival never authorize or
consume a gift. Existing people sign in/continue; only new people register. Code
sending remains a separate explicit action, never a lookup/typing side effect.

### Proposed logical state and boundaries

| Logical field | Source of authority / constraint |
| --- | --- |
| Record locator and unique opaque-handle hash | Random secret handle through a reviewed protected channel; locator alone confers no authority. Raw handle is a credential, never a URL/query parameter. |
| Claim/admission locator and expected token digest | Derived only by the server from the transient original bearer; never trust a client-supplied digest, claim/admission ID or readiness flag as capability. Current digest identifies issuance generation. |
| Context state versus explicit intent revision | Passive retention is not consent. Explicit register/sign-in-and-claim action authorizes one selected intent; stale callbacks/selections cannot advance it. |
| Canonical selected account and correlated auth attempt | Pin from authoritative authentication. Anonymous/new flows need a reviewed server-correlated selected-identity design; no placeholder account, client-authoritative account ID or silent repinning. |
| Created/expired/cancelled lifecycle | Required bounds; retention, expiry, tab/device scope, multiple invitations and cancellation remain review gates, not hidden defaults. |
| Committed result reference | Tie the exact account/admission/claim generation to authoritative completion. First evaluate the existing atomically written claim/admission fields as evidence; do not invent a duplicate receipt ledger or schema without demonstrating need. |

This is a logical proposal inside existing commerce ownership, not an approved
collection, migration, global framework, service or privilege grant. A protected
same-origin HttpOnly cookie is a transport candidate, not a settled attribute/path/
SameSite policy. Do not repurpose ticket navigation localStorage, payment-attempt
sessionStorage or the phone-identifier cookie as gift authority.

**Proposed commands (not existing endpoints):**
- Capture POST: transient original code → server-validated locator/current digest →
  protected-handle acknowledgment. No admission change, consumption or claim intent.
  Passive context capture and anonymous intake/disclosure/rate limits require review.
- Authorize POST: record explicit intent and selected account/auth attempt. Email
  lookup alone neither authenticates nor sends a code. Account changes invalidate
  prior authorization; an unexpected callback account stops for real selection.
- Advance POST: compare current canonical principal with authorized selection,
  independently refresh own identity and current readiness, then execute the one
  claim engine. Client readiness/identity reads are not an atomic proof; the server
  mutation must recheck its actual principal, proof and eligibility. Complete only
  missing proof/binding; preserve standalone account registration contracts.
- Read result/status: authorized context or same-account committed outcome only;
  no grant, automatic mutation retry, other-claimant disclosure or account switch.

### Shared core and callback constraints

Keep one private claim validation/mutation core in
`src/lib/commerce/guests.ts`. The original bearer entry and a future server-intent
entry resolve their capabilities separately, then use that same core under the
accepted `inClaimTransaction`. A stored digest cannot reconstruct the raw code;
do not pass it as if it were the bearer or expose a public digest-authorized API.
Reread admission/claim and retained generation under existing lock order; recheck
rotation, revocation, finite cutoffs, consumption, paid/return/review holds, current
account readiness and event/account occupancy. Reuse T005's typed/unknown boundary.

T005 still needs a same-account authoritative result-read contract. `consumedAt`
alone proves neither this caller's success nor current admission readiness. Inspect
its combination with claim generation, bound account and admission history before
proposing additional receipt storage. Any completion reference actually needed
must share the claim transaction, never depend on a later successful HTTP response.
Uncertain phone-binding receipts require authoritative status before another write;
uncertain claim receipts require result reconciliation, not another grant.

Current member status exposes readiness rather than selected account identity;
`/api/users/me` is an existing own-ID read, not a recipient-name/age/government-ID
proof. Fresh readiness reflects canonical email and server phone binding/current
policy. Gift bearer possession remains separate from buyer/shipping/attendee names.
Current auth client, callback policy and mail continuation target account/ticket
routes, not restored invitations. Extend only a fixed reviewed continuation route
under auth ownership, never arbitrary callback URLs or raw bearer/handle forwarding.
Enabling Google/magic links alone does not restore the invitation.

**Initial-ingress limitation:** the current original link already carries `#token`,
which the UI strips before account interaction. Server intent removes onward raw
bearer forwarding/persistence, not the original transient fragment ingress. Without
raw client persistence, a reload before protected-handle acknowledgment can still
lose context. Do not promise seamless pre-ack recovery; original-link recovery may
be needed. Do not invent reissue or tell users to avoid refresh as a substitute for
resumability. Zero bearer in any initial URL would require a separate delivery design.

### Swappable self-activation policy — required, neither mode selected

T001-A already reserves one exact buyer/event unit. A future explicit self-activation
command promotes that same row, preserving buyer, unit and eventAccountKey; it
allocates nothing and is not a gift claim. Require the authoritative account to be
that reserved buyer plus common current proof, paid-state and hold checks.

Use a small feature-local **server-owned** eligibility policy around this promotion:
- After-purchase mode: the common checks and confirmed settlement.
- Delivery-gated mode: those same checks plus explicitly approved authoritative
  per-unit delivery/activation evidence. Existing order-level delivered status is
  not automatically proof of per-unit possession/NFC activation.

The client cannot select/override policy. Switching server policy is not activation;
GET/reads/config changes never activate a unit or retroactively revoke/deactivate a
completed unit. Both methods use the same idempotent promotion/result contract.
No NFC issuance, custody, attendee-name source, transfer/refund rule, mint/signing
operation or live operational mode is approved by this design direction.

### Small next slices and acceptance

1. **T009 own-ID read classification:** safe now; distinguish authentication absence,
   forbidden/rate/malformed/transport failures and failed synchronization without
   new storage or claiming. Exact bounded specification below.
2. **T005 same-account result read:** characterize existing ledger evidence and
   current held/changed-state consequences; no second grant or other-claimant leak.
3. **T010 mounted continuation:** after prerequisites and reviewed caller/account-
   selection contract, remove redundant post-proof confirmation only for unchanged
   authorized identity. Mounted-only work is not full resumability.
4. **T010 resumable intent:** only after persistence/transport/lifetime/tab/device/
   cancellation and auth-correlation review. Actual UI/runtime/PG/provider proof stays
   separate. The two self-policy branches may be designed without selecting live mode.

**Design acceptance (not implementation):** (1) context, consent, identity/readiness,
mutation and result authorities remain separate with no GET consumption or raw-secret
forwarding; (2) account/callback/receipt-loss and pre-ack interruption cases are explicit
rather than promised away; (3) both server-owned self policies promote the same unit,
with all unselected storage, delivery-proof and real-acceptance gates visible.

**Source anchors, rechecked 2026-11-11:** invitation-claim.tsx fragment/state/claim
handler; checkout.tsx CommerceAccountGate/CommerceIdentityBoundary; member-auth
phone-step.tsx and _shared/session.ts binding; lib/member-auth/client.ts status shape;
payload-policy.ts callback allowlist and mail.ts continuation; commerce/guests.ts
grant/claim guards; commerce/_shared/benefits.ts paid holds; fulfillment.ts order-level
shipping state. These are source/design facts, not a live journey or provider proof.

## T009-A bounded own-account read contract — next safe implementation

**Ownership:** `src/components/commerce/checkout.tsx` CommerceIdentityBoundary and
focused `tests/commerce/ui/payment-dom.test.tsx` regressions; feature-local logic,
not a new global auth/storage abstraction. Recheck installed ecommerce clearSession/
onLogin contracts before changing synchronization. Preserve other callers, account
entry/standalone registration, accepted copy, canonical catalogues and Korean bytes.

**Three acceptance criteria:**
1. Received 401 or a valid anonymous receipt is distinguishable from 403, 429,
   other HTTP failure, malformed receipt and transport/abort failure. 403 alone
   never forces reauthentication. Do not invent a timeout duration or retry budget.
2. Same-account confirmation preserves mounted input; confirmed account change
   isolates/remounts private context. Failed clearSession/onLogin synchronization
   cannot resume commerce under falsely confirmed identity; separate read failures
   from synchronization failures. No false retained-input promise is introduced.
3. No storage/TTL, automatic code send, account/claim/binding/payment mutation,
   provider call or policy choice. Test-first guarded focused regressions, lint/full
   typecheck and required code/TypeScript/React/security plus fresh dual review;
   inspect an actual live provider-free local render before UI completion. Use a
   verified existing fixture without Docker/services/env; synthetic rendering is
   not full customer/runtime/provider acceptance. Stop only at genuine owner/safety gates.

**T010-A design review checkpoint (2026-11-11):** both fresh independent reviewers
passed the frozen proposal above; [design evidence](../qa/t010-continuation-design-20261111.receipts.json)
records its exact hash and boundaries. This qualifies source/design consistency,
not detailed owner approval, implemented storage/resumability or activation.
Before T009 code, characterize synchronous void `clearSession` separately from
`onLogin(): Promise<void>`, including fulfilled-without-user behavior; successful
Promise resolution is not provider identity synchronization. Before any intent
implementation, add explicit credential redaction/no-telemetry acceptance cases.
These are implementation requirements, not permission to start held storage.

**T009-A review refinement (2026-11-11):** transport/abort classification includes
response-body consumption after successful headers, not only initial fetch. Keep
body-read failure separate from successfully read but invalid JSON/schema. The
first live-reviewed candidate remained unaccepted on this exact contract gap;
[its evidence](../qa/t009-identity-20261111.receipts.json) retains the failed checkpoint.
This adds no timeout, retry, storage or authentication policy.

**T009-A local acceptance checkpoint (2026-11-11):** candidate 2 passed measured
body-stream RED/GREEN, three 57/57 trials, full typecheck/scoped lint, required
code/TypeScript review and both fresh round-2 Santa reviewers after current actual
boundary/provider desktop and phone-width synthetic rendering. Candidate 1's
FAIL/PASS and all near-failures remain in [the candidate ledger](../qa/t009-identity-20261111.receipts.json).
Chromium native text() delivered TypeError for both synthetic stream reasons,
including injected AbortError; transport-error follows the received native value,
not the diagnostic label. Node stream tests and direct fetch AbortError exercise
abort classification; none establishes real TCP/provider faults. Owned mapped
executable lines/functions 100% and V8 block ranges 96.63% are not independent
statement/semantic branch coverage; whole checkout lines remain 63.41%. The
unchanged sibling hook warning is not suppressed. Whole T009, full account-gate/
member readiness, case-specific feedback, retention/deadline budgets and real
runtime/provider/device acceptance remain open. Preview/tab were cleaned up.
**Next bounded route:** step 5 T004-A, provider-free same-attempt reconciliation
contract/design only; unresolved timing/budgets, external actions and financial
policy remain gated. Do not restart unchanged blocked storage or provider slices.

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

## Plan-Orchestrate result

**Plan:** this file. **Scope:** all nine bounded next entries. **Emitted:** 9.
**Blocked by command form:** 0. Several entries remain execution-gated as shown
above; emitting a scoped planning command does not approve its resulting choices.
The commands below are routing artifacts, not shell invocations executed by the
router, and are not a request for the owner to paste them.

<a id="step-1"></a>
### Step 1 — T005-A

**Intent:** Fix guest-claim domain-to-HTTP loss of known outcomes; keep UI and non-claim contracts unchanged.

**Tags:** fix. **Route:** `/orch-fix-defect`. The bounded behavior change carries its safety and regression criteria into execution.

<a id="step-2"></a>
### Step 2 — T001-A

**Intent:** Change paid event allocation so the first unit binds to the buyer and extra/subsequent units are pending gifts, even before minting.

**Tags:** change, db. **Route:** `/orch-change-feature`. The bounded behavior change carries its safety and regression criteria into execution.

<a id="step-3"></a>
### Step 3 — T010-A

**Intent:** Plan one intentional existing/new-account gift claim with verification and resumable invitation context, without redundant confirmation.

**Tags:** plan, security. **Route:** `/plan`. Design/owner/proof work precedes dependent implementation; this is not blanket provider execution.

<a id="step-4"></a>
### Step 4 — T009-A

**Intent:** Fix checkout identity-read classification before changing draft-retention policy.

**Tags:** fix, security. **Route:** `/orch-fix-defect`. The bounded behavior change carries its safety and regression criteria into execution.

<a id="step-5"></a>
### Step 5 — T004-A

**Intent:** Plan provider-free same-attempt payment outcome and reconciliation contracts within Payload and PortOne ownership.

**Tags:** plan, security. **Route:** `/plan`. Design/owner/proof work precedes dependent implementation; this is not blanket provider execution.

<a id="step-6"></a>
### Step 6 — T006-A

**Intent:** Plan guest-name correction separately from admission reassignment using an actor-by-state matrix.

**Tags:** plan, security. **Route:** `/plan`. Design/owner/proof work precedes dependent implementation; this is not blanket provider execution.

<a id="step-7"></a>
### Step 7 — T007-A

**Intent:** Plan same-account recovery using fresh proof of the already-bound phone and concierge follow-up.

**Tags:** plan, security. **Route:** `/plan`. Design/owner/proof work precedes dependent implementation; this is not blanket provider execution.

<a id="step-8"></a>
### Step 8 — T002-next

**Intent:** Use the delivered Unlock identity/NFC blueprint to resolve the next custody, issuer and check-in choices without repeating broad research.

**Tags:** plan, lookup. **Route:** `/plan`. Design/owner/proof work precedes dependent implementation; this is not blanket provider execution.

<a id="step-9"></a>
### Step 9 — T003-A

**Intent:** Change purchase and claim surfaces only after allocation, identity and outcome contracts are ready.

**Tags:** change. **Route:** `/orch-change-feature`. The bounded behavior change carries its safety and regression criteria into execution.

## Batch routing — generative only

```text
/orch-fix-defect "[Plan: /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md#step-1] Fix guest-claim domain-to-HTTP loss of known outcomes; keep UI and non-claim contracts unchanged. Acceptance: finite expiry and integrity/unknown cases differ; known responses require the original claim error and confirmed owned rollback; no raw errors or private identities escape. Out of scope: unresolved policy and separately gated external actions."
/orch-change-feature "[Plan: /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md#step-2] Change paid event allocation so the first unit binds to the buyer and extra/subsequent units are pending gifts, even before minting. Acceptance: one account/event binding across settlement and claims; callback replay preserves the original allocation; stock, net-three allowance and financial history remain intact. Out of scope: unresolved policy and separately gated external actions."
/plan "[Plan: /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md#step-3] Plan one intentional existing/new-account gift claim with verification and resumable invitation context, without redundant confirmation. Acceptance: registration is required but existing users do not register again; refresh/redirect/account switches cannot leak a bearer; same-claimant lost-success recovery cannot grant twice. Out of scope: unresolved policy and separately gated external actions."
/orch-fix-defect "[Plan: /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md#step-4] Fix checkout identity-read classification before changing draft-retention policy. Acceptance: authentication, malformed receipt and uncertain reads remain distinct; same-account context and cross-account isolation are tested; no false retained-input promise, automatic charge or forced customer retry is introduced. Out of scope: unresolved policy and separately gated external actions."
/plan "[Plan: /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md#step-5] Plan provider-free same-attempt payment outcome and reconciliation contracts within Payload and PortOne ownership. Acceptance: classify known versus unknown financial outcomes; specify serialized bounded checks and durable catch-up without invented provider timing; preserve zero automatic charge, SDK launch, retirement or reservation release. Out of scope: unresolved policy and separately gated external actions."
/plan "[Plan: /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md#step-6] Plan guest-name correction separately from admission reassignment using an actor-by-state matrix. Acceptance: identify owner decisions and a real authorized correction path; account, payment, attendance and bearer history remain protected; no transfer, refund, staff grant or cutoff exception is inferred. Out of scope: unresolved policy and separately gated external actions."
/plan "[Plan: /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md#step-7] Plan same-account recovery using fresh proof of the already-bound phone and concierge follow-up. Acceptance: restore the same account without unsolicited email replacement; separate mailbox coordination from app recovery authority; specify replay-safe case, correspondence and access-grant tests before implementation. Out of scope: unresolved policy and separately gated external actions."
/plan "[Plan: /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md#step-8] Use the delivered Unlock identity/NFC blueprint to resolve the next custody, issuer and check-in choices without repeating broad research. Acceptance: distinguish native capabilities from unproved deployed behavior; define one account/wallet/token mapping and admission authority; request only the smallest precisely scoped external proof. Out of scope: unresolved policy and separately gated external actions."
/orch-change-feature "[Plan: /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md#step-9] Change purchase and claim surfaces only after allocation, identity and outcome contracts are ready. Acceptance: show enforced self/gift quantities and truthful totals; expose supported actor-specific recovery without inventing policy; pass guarded regressions, live local touch/desktop inspection and dual independent Santa review. Out of scope: unresolved policy and separately gated external actions."
```

## Historical baseline and handoff — preserved capture

The following describes the earlier batch, not current HEAD or permission. The
new isolated-worktree policy supersedes its local-merge prohibition only for
accepted assignment-scoped integration; no pull/rebase/push is newly authorized.

This execution batch targets `/Users/seanschoi/Projects/sphmrs`, HEAD
`8efbb0a03baf3b82316c773f6849a6bee2aa0bf9`. Main is locally ahead two/behind seven
relative to its local remote-tracking ref; no pull, rebase or merge is authorized.
Preserve owner English-catalogue WIP, documentation deletions/moves, Ulysses files,
copy calibration, delivered Unlock blueprint and other-session work. Do not copy
the older 944f worktree's source onto this checkout.

The memory-cleanup restart recheck found 48 GiB physical RAM and 91% free at the
initial sample; that is a point-in-time observation, not future workload approval.
The automation resumed at its prior three-minute cadence. No code, test result,
provider acceptance or completed feature is implied by this plan's creation.

## T005-B — same-claimant valid-bearer result recovery

Assignment `SPH-T005-B-20261111-01` implements only recovery of an already
completed claim by its same canonical account while the original bearer and
existing expiry/cutoff/eligibility/hold gates are still valid. Existing same-event
occupancy and immutable admission identity are authoritative; no second grant,
transfer, reissue, expiry override or new retention policy. T001/T005 source
dependencies are in main `3c853b0e670abde45f591f2f86d09dbbf4472983`.

**Criteria:** (1) RED then GREEN: lost-success replay by the same eligible claimant
returns the original admission with zero writes/new grants/counters/benefits; exact
claimed account, event/account key and admission linkage must agree under existing
locks. (2) Foreign claimants and invalid/revoked/expired/cutoff/held/ineligible or
inconsistent states keep private typed/fail-closed outcomes; no bypass of existing
gates or native transaction proof, no non-claim behavior change. (3) domain + HTTP
replay/race/fault regressions, guarded scoped checks/typecheck and required code,
TypeScript/security and fresh dual Santa reviews pass against exact candidate; no
UI/provider/DB/live acceptance claimed. Genuine unresolved precedence/policy stops
that branch rather than guessing; broadened recovery after expiry is out of scope.

**Ownership:** isolated executor owns `src/lib/commerce/guests.ts`, existing
`tests/commerce/domain/claim-outcomes.test.ts`, `claim-http.test.ts`, new
`claim-recovery.test.ts`, and its own `docs/qa/t005-b-20261111/` evidence (not
custodian baseline/dispatch). Other source/catalogues/transaction wrapper and
canonical registry/plan are read-only. Runtime dependency reuse may reference
existing installed packages read-only only after verifying isolated writable
outputs/caches; no installation. New helper/package/endpoint not presumed needed.

<a id="step-10"></a>
**Generative route:** /orch-fix-defect (not executed by the router).

```text
/orch-fix-defect "[Plan: docs/reference/backlog-execution-plan.md#step-10] Recover a lost successful claim receipt only for its same eligible account and still-valid original bearer. Acceptance: RED/GREEN proves original admission returned with zero grant writes; foreign, expired, revoked, held and inconsistent states remain private/fail-closed; scoped regressions and independent reviews pass. Out of scope: unresolved policy and separately gated external actions."
```

## T005-G1 — exact-base type-boundary prerequisite

Four exact-base errors block T005-B's scoped transitive typecheck: two optional
Payload email arguments into paymentRequest, and two Payload string|number IDs
into MemberPrincipal. Current paymentRequest already validates email with Zod;
ownership functions already process Payload IDs at runtime. Prefer accurate
minimal declaration boundaries with unchanged runtime guards, not casts, defaults,
identity conversion, weaker checks or endpoint redesign. Disjoint from B source.

**Three criteria:**
1. Reproduce all four exact-base TypeScript diagnostics with a bounded scoped
   compiler check before editing, then eliminate them without casts/assertions,
   suppression, weaker compiler settings or new runtime/authorization behavior.
2. Characterize and preserve runtime email validation/SDK request shape and
   bookmark/notification ownership for existing string/numeric/absent/member/staff
   principals; no new privilege, account coercion, payment path or provider calls.
3. Affected scoped tests/lint/typecheck pass, frozen minimal diff receives required
   code/TypeScript/security and dual independent Santa PASS; full-project resource
   failures remain disclosed, no false global coverage/runtime acceptance.

B scope amendment: `tests/commerce/domain/guests.test.ts` may update the single
stale same-claimant replay assertion to original-receipt recovery, retaining
rotation/foreign consumed/no-grant assertions. Resume B in its same chat only after
accepted integrated G1 is available; no unchanged blocked typecheck reruns.

<a id="step-11"></a>
**Generative router:** fix → /orch-fix-defect, never executed by the skill.

```text
/orch-fix-defect "[Plan: docs/reference/backlog-execution-plan.md#step-11] Fix four exact-base Payload email/ID declaration mismatches that block claim validation. Acceptance: reproduce diagnostics before minimal type-only repair; runtime email and ownership behavior unchanged; scoped checks and independent reviews pass. Out of scope: unresolved policy and separately gated external actions."
```

## Event-first handback routing — owner update 2026-11-11

Direct assignment-scoped executor reports to custodian chat
`01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1` (host local) are explicitly owner-authorized.
Persist durable handback, then send its stable event key, identity/status/evidence/
next actor/resources through supported send_message_to_thread before ending.
Custodian uses supported completion/attention waits while active and processes
actual reports immediately, deduplicating persistent event keys before actions.
No automatic acknowledgement loop; a submitted message is not acceptance or proof
of handling. Native waits/heartbeat recover missing reports or crashed executors;
no exposed persistent hard-crash subscription, hooks/watchers or scheduling change.
Historical frozen specs saying no report-back authorization are superseded only
for this explicit routing permission; production/resource/review gates unchanged.

## Delivery and maintenance commit separation — owner update 2026-11-11

Material registry/to-do updates receive their own scoped documentation maintenance
commit, independent of the feature acceptance gate; companion planning changes may
join that docs-only commit, never unaccepted production code or unrelated WIP.
Accepted runs also end with scoped implementation commit and gated push: verify
checks/reviews, integration identity, complete outgoing history/current remote
ancestry, privacy/secrets, branch rules and CI/deployment/cost effects. The registry
“Separate maintenance commits and gated delivery” section owns the live rule.
Previous blanket push prohibitions are superseded only for this bounded accepted-
run delivery; executor no-main-merge/no-push scopes remain until custodian approval.
No force-push, unreviewed remote merge/rebase, implicit deployment/paid job or
unrelated publication. Record `push_pending` precisely; do not stall local safe work.
