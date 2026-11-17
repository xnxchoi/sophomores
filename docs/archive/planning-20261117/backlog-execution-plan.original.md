# Backlog execution plan — isolated, resource-admitted local slices

**2026-11-12 handoff compaction.** The [To-Do registry](../To-Do%20List.md)
is the sole active progress/ownership panel, including exact delivered identities.
This file owns bounded scope/dependencies/acceptance and stable routes, not a second
tracker. [Original plan](../archive/handoff-20261112/backlog-execution-plan.original.md)
retains complete historical specifications, routing output and failed approaches.
The [commerce launch plan](commerce-launch-plan.md) governs; deployment stays final.

## Loop contract

**Now:** the owner resumed feature dispatch on 2026-11-12. Current handoff
assignment states live in the [registry](../To-Do%20List.md#current-maintenance-checkpoint);
the [preparation plan](../qa/handoff-prep-20261112/plan.md) and its executor contracts
restricted those executors only (no nested reviewers, app workloads, commits or
pushes). They do not restrict custodian review, scoped administrative commits,
acceptance, integration or gated delivery. Reconcile exact current main before
integration, never by overwriting it.

**Before each dispatch:** reconcile existing owners/handbacks first. Custodian records exact base/dependencies, owned paths, dirty-source
provenance, reporting and resource admission; one fresh managed local worktree and
unique `codex/…` branch per assignment. Preserve other WIP; coordinate cross-worktree
contracts. No blanket copy/reset/stash/clean or two writers on the same paths.
Plan-orchestrate emits scoped task descriptions only; it never executes a route or
approves policy/provider actions. Do not ask the owner to paste generated commands.

Use 1–3 measurable criteria per slice; tests first for implementation, not fabricated
RED/GREEN for docs. Deterministic checks, required language/code/security review,
then two fresh independent Santa reviews of identical frozen spec/output/rubric,
both PASS, maximum three fix/re-review cycles. Retain rejected/near-failed candidates.
UI needs actual local render/harsh review. Existing adequate evidence is not replaced
by redundant expensive unchanged checks. Local/synthetic ≠ real DB/provider/PG proof.

One resource-guarded app workload per checkout, ≥10 GiB actual physical headroom,
≤15 GiB aggregate agents/tools/reviewers/browsers; inspect full descendant overhead,
isolate writable caches/ports/fixtures. Existing dependencies only; no env/credential
copy. A resource stop is not permission to raise limits or retry unguarded.
Markdown-only candidates: stdlib/link/git checks replace app checks, not required reviews.

Custodian accepts frozen candidates separately from serialized main integration and
combined checks. Drift/conflicts/substantive changes require affected revalidation;
never advance dirty main behind its tree. Implementation and registry-maintenance
commits stay separate; custodian holds scoped commit/merge authority. Any ordinary
push must pass current remote/ancestry/outgoing-history/privacy/rules/CI/cost gates;
no force-push, silent remote rewrite or implicit production activation.

Persist evidence/learning, verify reachability/checks/no unresolved work or owned
workloads and preserve ignored QA before supported recoverable worktree/chat archive.
Executor never closes a parent or archives itself. Reporting is the supplied Orca
Task/Dispatch `worker_done`/`ask` route, not historical thread IDs. No polling, ack loops, watchers or scheduling changes.

**Global scope guard:** unresolved custody/recovery/transfer/retention decisions,
provider/chain/RPC/email, credentials/new grants, dependency phases, hardware,
destructive DB actions, readiness/image/backup and deployment require their own
explicit approval. Routes below dispatch only via a recorded assignment (exact base,
owned paths, criteria, resource admission).

## Dependency and readiness map

- T005 outcome/rollback contract and T001 event/account occupancy are shared
  authorities; B adds valid-bearer same-account result recovery, not a new grant.
- T009 owns account-read/provider synchronization and future retention choices.
  Its A does not prove full member-readiness or the complete reauthentication gate.
- T010 consumes T001/T005/T009 for deliberate registration/sign-in/proof/claim
  continuation; persistence/callback/lifecycle is separately reviewed. T003 consumes
  those contracts and T004's money recovery for usable surfaces.
- T004 owns all financial reconciliation/finalization, installed transaction-end
  durability and eventual separately approved DB/provider/device proof. Claim-native
  rollback cannot stand in for financial durability.
- T006 correction authority/reassignment and T007 case/proof/correspondence/grant
  require bounded owner/engineering decisions. T002 next work consumes its delivered
  blueprint; no repeated broad P1 research. T011/T012 route findings through existing
  owners; undefined tour/reading/settings scope needs custodian triage first.
- Policy-blocked branches do not justify invented defaults or repeated unchanged
  blocked work. Future independent work requires a recorded bounded assignment.

## First implementation slice — T005-A

**Accepted contract to preserve:** `guests.ts`, `domain.ts`, `contracts.ts` and
claim-only `commerce/_shared/transaction.ts`; root claim tests. Installed Payload
`APIError` carries status/data/isPublic directly; no parallel error wrapper. It
expresses domain intent, not persistence outcome. Known rejection requires the
original callback error plus the owned native transaction's private per-attempt
rollback sentinel, not an adapter rollback API merely resolving. Missing/replaced/
contaminated sessions, inherited ownership, commit/rollback failures or request-ID
loss stay unknown and cannot continue pool work. Never await native completion
inside its callback. Keep financial/non-claim contracts and staff generic-error
consumer compatible. Same-static-graph adapter factory, not bundled/native method
identity, establishes the accepted seam.

| Condition | Outcome / HTTP |
|---|---|
| Malformed/nonexistent/mismatched bearer | CLAIM_INVALID / 400; no invented rotation history |
| Matched finite cutoff elapsed | CLAIM_EXPIRED / 410; invalid stored date is integrity/unknown |
| Foreign consumed bearer | CLAIM_CONSUMED / 409; own valid recovery follows B below |
| Revoked/nonclaimable | CLAIM_UNAVAILABLE / 409; unclassified generic holds stay conservative |
| Combined account-readiness rejection | ACCOUNT_NOT_ELIGIBLE / 403; not specifically missing phone |
| Authenticated event binding conflict | EVENT_ALREADY_BOUND / 409; no consumption |
| Infrastructure/integrity/unproved transaction | CLAIM_RESULT_UNKNOWN / 503; no implied safe retry |

Native-library fake-client rollback and webpack graph probes are not real PostgreSQL
fault/concurrency or full Next runtime proof. A's two rejected candidates and partial
coverage remain in [evidence](../qa/t005-claim-contract-20261111.receipts.json).
No UI/automatic-claim/provider acceptance follows. Full original criteria remain
[archived](../archive/handoff-20261112/backlog-execution-plan.original.md#first-implementation-slice--t005-a).

## T001-A bounded implementation specification

Reserve one immutable buyer/event self unit at paid settlement under existing
`eventAccountKey`; leave claimedAccount unset, not activated/named/perk-eligible.
Complete replay preserves even cleared/revoked history; partial/mismatched grants
fail before writes. Fresh grants serialize against the same claim event/account
lock, reread occupancy and allocate remaining/subsequent units as gifts. Preserve
inspected lock order; never overwrite/gift a reserved-self key. Corrupt discovered
occupancy is unknown. No financial/schema/migration/UI/config change was approved.

Acceptance retains independent events, self/claim logical interleavings, losing
invitation non-consumption, stable replay, no replacement after clearing, immutable
stock/allowance/payment/delivery ownership and accepted T005 boundaries. Test fakes
do not rollback or prove competing SQL. T010/T003 must present pending self truthfully
and promote this same unit; no second allocation, name source or policy invented.
[A evidence](../qa/t001-allocation-20261111.receipts.json) and
[full specification](../archive/handoff-20261112/backlog-execution-plan.original.md#t001-a-bounded-implementation-specification).

## T010-A server-owned continuation proposal — design only

**Owner direction:** required gift registration; existing people sign in/continue.
Develop protected opaque-handle server intent; storage/retention/expiry/cookie/tab/
device/multiple-invitation/cancellation and auth correlation remain review gates.
No duplicate receipt ledger unless existing atomically written claim evidence is
insufficient. No repurposed ticket localStorage, payment sessionStorage or phone
cookie as gift authority. Locator alone is no capability; original bearer ingress
is transient and protected-handle acknowledgement can still be lost before refresh.
Original-link recovery may be needed; no invented reissue or “never refresh” remedy.

Separate passive context → explicit revisioned intent → selected authoritative
account/auth attempt → current proof/readiness → one claim mutation → committed
result. GET/link preview/status/callback/config change never grants or consumes.
Account change invalidates old intent, not silently repins it. Proposed capture/
authorize/advance/status commands are not existing endpoints or implementation
approval. Raw handle/bearer/digest never travels onward in URL/log/analytics; digest
is not a substitute raw bearer/public capability.

Reuse one guests.ts claim core with separately resolved original-bearer versus
future intent capability; recheck generation/cutoff/revocation/consumption/paid holds,
canonical principal/readiness and event occupancy under accepted locks/transaction.
B's same-account valid original-bearer result does not implement protected-handle
resumption. A phone-binding timeout needs authoritative status before another write.
Auth callback extension must be fixed/allowlisted and owned by auth, never arbitrary
redirect/raw-secret forwarding; Google/magic-link enablement alone is insufficient.

Self activation uses server-only swappable after-purchase versus delivery-gated
eligibility; neither mode selected. Both promote T001's exact unit, allocate nothing
and preserve buyer/unit/key; reads/config switches do not activate/deactivate. Order-
level delivered is not per-unit possession evidence. NFC/mint/custody/name/refund/
transfer/real operational mode remain gated. Mounted-only continuation is not full
resumability. [Reviewed design](../qa/t010-continuation-design-20261111.receipts.json)
and [complete proposal](../archive/handoff-20261112/backlog-execution-plan.original.md#t010-a-server-owned-continuation-proposal--design-only).

## T009-A bounded own-account read contract — next safe implementation

Heading retained for inbound compatibility; **A is already locally accepted**, not
a new dispatch route. `CommerceIdentityBoundary` distinguishes 401/valid anonymous,
403, 429, HTTP/malformed, body-consumption transport/abort and synchronization failure.
Same-account preserves mounted input; confirmed identity change isolates/remounts.
No TTL/storage/deadline/budget, code/binding/claim/payment mutation or auth policy
was selected. `clearSession` is synchronous void; fulfilled `onLogin` without user
is not proved sync. Preserve other callers, catalogues/Korean and standalone auth.

Candidate1's body-stream gap and FAIL/PASS, candidate2 measured RED/GREEN, three
57/57 trials, scoped lint/full-type checkpoint and required reviews/synthetic render
are [retained](../qa/t009-identity-20261111.receipts.json). Chromium returned TypeError
for injected AbortError stream reasons; classify actual native evidence, not fixture
labels. Owned mapped 100% lines/functions and 96.63% V8 ranges are not semantic branch
coverage; whole checkout recorded 63.41%. No real TCP/provider/full-gate acceptance.
Remaining full gate/readiness, startup/partial sync, retention and actor/action
feedback require new scope, not a rerun of unchanged accepted A.

## T004-A bounded reconciliation design specification — planning only

Accepted design/session closure is not implementation. [Design](../qa/t004-a-20261111/reconciliation-design.md),
[source map](../qa/t004-a-20261111/source-map.md) and
[custodian acceptance](../qa/t004-a-20261111/custodian-acceptance.json) own I0–I6,
B01–B16 and exact candidate/source identities. Full original
[financial brief](../archive/handoff-20261112/to-do-list.original.md#payment-confirmation-and-recovery--system-managed-same-attempt-reconciliation)
SHA256 `a25d435fb48c655d478b634be9d126db76cf75a3d873f76f4d5925a1142a88b7`
is byte-preserved, not superseded by this summary.

Preserve three criteria for any follow-up: (1) source/installed-completion map for
pending discovery, confirmation, resume/retire, signed webhooks and sole official
finalizer; no source-only durability claim; (2) local reads versus bounded exact-
attempt server reconciliation versus explicit payment operations, privacy/identity/
holds, no GET mutation and honest outcome/stop matrix; (3) dependency-aware test-first
slices with real DB/provider/device gates, no invented timings/budgets/retention/queue/
operational authority. Native claim transaction proof does not cover financial callers.
No automatic charge/SDK reopening/retirement/age-based release; not-found is not
no-charge proof. A closed design is no permission to start I0–I6 or provider checks.

## T005-B — same-claimant valid-bearer result recovery

**Delivered contract, not an open blocker:** same canonical eligible claimant with
still-valid original bearer receives original admission and zero writes/grants/
counters/benefits. Account, admission, generation and event key must agree under
existing locks; finite cutoff, foreign claimant, revocation, paid/review/return
holds, readiness/integrity and native transaction-end proof remain enforced. No
new entitlement, expiry override, transfer/reissue/storage policy or UI promise.

Owned change was guests.ts plus claim-outcomes/claim-http/claim-recovery and the
single authorized stale replay assertion in guests.test.ts; preserve independent
rotation/foreign-consumed/no-grant assertions. Accepted G1 dependency precedes B;
that dependency is now delivered. [B acceptance](../qa/t005-b-20261111/custodian-acceptance-20261112.json)
is scoped local evidence, not DB/provider/runtime/UI completion. Exact candidate/
integration IDs live only in the registry's delivery checkpoint.

## T005-G1 — exact-base type-boundary prerequisite

**Delivered declaration-only repair:** optional Payload email input remains validated
by existing Zod at paymentRequest; MemberPrincipal accepts existing string/numeric
Payload IDs without new coercion/privilege behavior. Preserve characterized
string/numeric/absent/member/staff ownership and SDK request guards. No casts,
suppression/weaker compiler, defaults, new runtime transport or endpoint redesign.
Four narrow exact-base diagnostics were not proved whole-main failures; generated
Payload augmentation changes the graph. Original resource stop/excluded graph is
retained in [acceptance](../qa/t005-g1-20261111/custodian-acceptance-1.json), not a
current prerequisite waiting for implementation.

## SPH-DELIVERY-S1 — protect stored MusicKit owner credential

**Delivered narrow security work:** credential field stays server-owned; actual
Payload projection/direct/populated-slot paths hide it from ordinary actors while
trusted internal sync/authorized writes survive without new grants. Follow-up
private collection/page visibility respects existing verified-staff policy before
reads/rendering. Initial source-level exposure was not proof of a live leak; no
actual credential/DB/provider access or rotation performed. Round2 PASS/FAIL remains
historical evidence, corrected at delivered `fb4ca49`; do not revive its old push
hold or flatten the failed review. [S1 acceptance](../qa/delivery-s1-20261111/custodian-acceptance-20261112.json)
and registry record limitations, including initial-state SSR versus hydration.

## Plan-Orchestrate result

Stable anchors below retain earlier incoming routes. Routes are **generative reference
only**, never execution/approval. Completed slices must not be dispatched again;
future work requires a fresh bounded assignment/identity.

<a id="step-1"></a>
### Step 1 — T005-A

`/orch-fix-defect`: preserve accepted known outcome/native rollback contract.
Remaining UI/holds/real acceptance are not repeat A.

<a id="step-2"></a>
### Step 2 — T001-A

`/orch-change-feature`: preserve paid self occupancy and replay. Next is same-unit
activation/display with T010/T003 after scope/policy review, not another grant engine.

<a id="step-3"></a>
### Step 3 — T010-A

`/plan`: review required-register/existing-sign-in continuation, context/intent/
identity/result and swappable self policy. No implicit storage/provider activation.

<a id="step-4"></a>
### Step 4 — T009-A

`/orch-fix-defect`: A read classification is locally accepted. Scope full-gate/
readiness and actor-specific recovery separately; owner chooses draft retention.

<a id="step-5"></a>
### Step 5 — T004-A

`/plan`: accepted provider-free design decomposes I0–I6; implementation/durability/
provider proof remains gated. Never copy claim rollback proof into financial claims.

<a id="step-6"></a>
### Step 6 — T006-A

`/plan`: owner reviews actor/state correction versus reassignment and supported
staff operation; protect identity, attendance, finances, bearer and benefit history.

<a id="step-7"></a>
### Step 7 — T007-A

`/plan`: same-account fresh bound-phone recovery, case correspondence/access grant,
mail uncertainty/retention and app-versus-mailbox authority; no email replacement.

<a id="step-8"></a>
### Step 8 — T002-next

`/plan`: review delivered blueprint G1–G5 and select the smallest precise proof.
Native capability is not deployed/device acceptance; no automatic P2–P7 advance.

<a id="step-9"></a>
### Step 9 — T003-A

`/orch-change-feature`: surfaces consume ready allocation/identity/outcome/payment
contracts. Truthful self/gift/totals and supported recovery need real touch/desktop
render plus harsh review; no unsupported refunds/transfers/copy-only workaround.

<a id="step-10"></a>
### Step 10 — T005-B

`/orch-fix-defect`: delivered same-account valid-bearer receipt recovery. Expired
recovery or new UI/retention is not this scope. No unchanged replay reimplementation.

<a id="step-11"></a>
### Step 11 — T005-G1

`/orch-fix-defect`: delivered minimal type boundary. No outstanding G1 dependency
or blanket global-typecheck claim; preserve graph/resource qualifications.

<a id="step-12"></a>
### Step 12 — SPH-DELIVERY-S1

`/orch-fix-defect`: delivered credential and private-visibility correction. Old
security/divergence/push holds are resolved, not a reason to restart or rotate tokens.

## Historical baseline and handoff — preserved capture

[Verbatim plan](../archive/handoff-20261112/backlog-execution-plan.original.md)
retains original commands and scopes, no-merge/push-era restrictions, old ahead/
behind observations, source baselines, transition-only T004 assignment, direct
native reporting and failed approaches. Treat them as dated provenance, never
current routing or permission. The registry is the single active state owner;
this compaction changes no scheduling or acceptance state.

<!-- Historical inbound-anchor compatibility; content preserved in the linked verbatim capture. -->
<a id="batch-routing--generative-only"></a>
<a id="delivery-and-maintenance-commit-separation--owner-update-2026-11-11"></a>
<a id="event-first-handback-routing--owner-update-2026-11-11"></a>
<a id="proposed-logical-state-and-boundaries"></a>
<a id="shared-core-and-callback-constraints"></a>
<a id="small-next-slices-and-acceptance"></a>
<a id="sph-delivery-20261111-01--reconcile-existing-histories-and-push"></a>
<a id="swappable-self-activation-policy--required-neither-mode-selected"></a>
