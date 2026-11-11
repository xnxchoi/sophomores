# To-Do List

Last Modified: 
<!-- The date above is manually maintained. Record the agent and modification date(yyyy-mm-dd hh:mm:ss) below. -->
<!-- Last modified: Codex (custodian routing and T004-A assignment dispatch) 2026-11-11 18:33:25 KST -->
<!-- Contribution: Codex (owner item 1; identity-recovery investigation and custodian handoff) 2026-11-11 -->
<!-- Contribution: Codex (purchase/claim overlap investigation additions) 2026-11-11 -->
<!-- Contribution: Codex (owner-authorized Unlock/NFC P1 consolidation and handoff) 2026-11-11 -->
<!-- Contribution: Codex (owner-authorized error-classification/review investigation item T005) 2026-11-11 -->
<!-- Contribution: Codex (owner-authorized guest-name correction investigation item T006) 2026-11-11 -->
<!-- Contribution: Codex (owner-authorized account-recovery decisions and proposed system scope, T007) 2026-11-11 -->

<!-- Contribution: Codex (owner-authorized gift registration/claim task T010 and custodian handoff) 2026-11-11 -->
## Purpose and maintenance mandate

This is the owner's working list for sophomores.co. Notes may be incomplete or
lack code locations. Clarify material ambiguity before implementation. Refine
and organize non-destructively; never delete an unfinished task without explicit
owner authorization. Preserve original captures when later decisions supersede them.

The owner assigns gpt-6.1-sol a dedicated document-maintenance role. This chat
(`01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`) owns registry maintenance and now coordinates
bounded local execution under the active execution policy below.
Its responsibilities are:

- Design, apply and maintain one consistent format throughout this document.
- Structure and organize all to-dos for both human review and LLM execution.
- Assess, devise and apply transparent prioritization logic.
- Review unstarted work for sensible splits/merges, propose them to the owner,
  record agreed architectural decisions through the ADR workflow where appropriate,
  and use plan-orchestrate to prepare scoped execution routing when requested.
- Propose orchestration among Codex, Antigravity/Gemini (owner-requested label:
  Gemini 3.8 Flash, high effort), and Grok (owner-requested labels: Grok 4.6/4.7,
  high effort). These labels are retained requests, not verified availability or
  authorization to dispatch external agents, spend money or override host models.
  Record decisions and execute only authorized delegations; plan-orchestrate is
  generative, not an executor. No multi-execute capability is assumed installed.
- Raise undelegated in-progress work, keep active/delegated work visible, order
  by the attention rules below and move completed tasks to the completed section.

### Status, ownership and evidence

| Marker | Meaning                                                                             |
| ------ | ----------------------------------------------------------------------------------- |
| ( )    | Implementation not started, including an item that has only research/planning.      |
| (△) | Implementation started but incomplete; not evidence of a currently running session. |
| (✓)    | Implementation complete with linked evidence and remaining acceptance gates stated. |

Track **planning phase separately** so delegation or a finished document never
turns an unimplemented feature green. Each item records owner/delegation, current
phase, dependencies, next action and the smallest useful acceptance evidence.
Do not infer runtime/provider/production acceptance from source inspection.

### Attention order and priority logic

1. Surface undelegated in-progress work first, then delegated in-progress work.
   Show active planning explicitly, without changing implementation status.
2. Among unstarted work, honor owner-stated priority and upstream dependencies.
   Propose higher attention for money/identity/irreversibility risks before cosmetic
   changes; label agent-proposed rankings rather than implying owner approval.
3. Preserve stable task IDs when reordering. Completed work moves to the end;
   never delete it or silently merge distinct scopes. Ties retain their prior order.
4. Reassess at meaningful custody checkpoints and actual owner, scheduler or
   supported coordination invocations. Cadence and enabled/paused state belong
   exclusively to automation configuration; no continuous monitoring is promised.

**Priority labels:** P1 = foundational/high attention; P2 = downstream work.
Agent-proposed labels are recommendations, not owner approval of competing priorities.

### Scheduled custody

Automation identity: `sophomores-to-do-maintenance`. This registry does not set
its cadence or enabled state. On invocation, reconcile ownership and evidence,
then resume one assignment or dispatch one dependency-ready bounded local execution
chat. An observed registry with more than two implementation-unstarted tasks also
triggers this routing; it is not a continuous watcher. Preserve separate approvals.

### Concurrent intake and task IDs

The custodian validates new IDs against the latest registry before accepting them.
IDs submitted concurrently are provisional until uniqueness is checked; preserve
all task content and source provenance when repairing a collision. Do not delete
or merge distinct tasks merely because contributors used the same number.

Concurrent intake on 2026-11-11 independently reused T006. Final registry mapping:

| Submitted ID                      | Final ID | Work item                                                                                       |
| --------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| T006                              | T006     | Guest-name corrections versus admission reassignment; earliest observed T006 retained.          |
| T006                              | T007     | Account recovery: bound-phone proof and concierge follow-up.                                    |
| T006, then T010                   | T010     | Required gift registration and resumable claim completion; contributor’s corrected ID retained. |
| T009, initially submitted as T006 | T009     | Checkout identity and system-managed recovery; contributor's corrected ID retained.             |

A transient custodian assignment of T008 to the gift task was corrected to the
contributor’s confirmed T010 during this same intake review. T008 is retired, not
available for a new task. No substantive findings were removed.

Scoped links and index/section ordering are repaired below. Earlier external chat
references to T006 must be interpreted by their task title/provenance, not assumed
to mean the surviving guest-name task. No semantic task merge or execution approval
is implied. T002 remains the owner-authorized focus; new P1 labels are proposals.

### Active execution policy — owner instruction 2026-11-11

The current replacement instruction assigns this chat custody, bounded local-chat
dispatch, candidate review and administrative closure, **not assigned production
implementation**. It supersedes the earlier native-subagent-only execution routing
for new assignments. Fresh local execution chats are authorized only for recorded
bounded assignments; no external agents or new blanket permissions are implied.

Use the [bounded backlog execution plan][1]. Reconcile before dispatch; the owner
has replaced the single-flight cap with resource-admitted concurrent assignments
in isolated managed worktrees. Each assignment still has exactly one execution owner. Executors preserve concurrent work and never edit
registry status, complete parent tasks, archive themselves or expand scope.
Planning, implementation, bounded local acceptance and provider/production acceptance
remain distinct. Deterministic checks precede required specialist and dual fresh
independent Santa reviews; retain the three fix/review-cycle limit. UI also requires
an actual live local render. Consume adequate existing reviews, not redundant gates.

Lifecycle: ready → dispatching → running → candidate → review → accepted →
integration_pending → integrated → learning_pending → archive_pending → closed, with explicit rework/blocked/interrupted
branches. Record intent before creation and reconcile ambiguous results before retry.
After acceptance apply project continuous-learning-v2 to actual durable execution
and review evidence, deduplicate project learning, and persist its outcome before
archiving only the resolved execution chat. No hook/observer/global-memory changes.
Learning/archive failure leaves acceptance intact and closure pending.

Assignment-scoped local commits and local merges into `main` are now authorized
only through the integration gates below; accepted-run pushes now additionally follow the separate delivery gate below. This does not authorize committing
unrelated WIP. Provider/chain/RPC/email, credentials/permissions, dependencies,
hardware, destructive operations, unapproved publication and readiness/deployment remain
separately gated.
One guarded app workload per checkout, physical-memory limits and stopped plan-canvas
remain binding. No expensive unchanged checks or restarts of unchanged blocked work.

### Isolated execution, integration and retirement — owner update 2026-11-11

- **New execution:** one fresh local chat and one managed isolated worktree per
  bounded assignment; use supported chat/worktree tools and a unique `codex/…`
  branch. Custodian alone writes this canonical registry. Worktrees do not grant
  provider/data/service permissions or resolve product-policy dependencies.
- **Source identity before dispatch:** record assignment/chat/worktree identity,
  exact base commit, dependency commits, owned paths and dirty-file baseline. A new
  worktree does not include uncommitted accepted changes. If needed, transfer only
  explicitly identified dependency edits/new files into the isolated baseline,
  with per-path/hunk provenance, hashes and current-content checks; never whole-tree
  copy, broad-stage, stash/reset or silently clean the source. If dependency/WIP
  ownership cannot be separated, block that assignment's preparation, not all work.
- **Resource admission, not a fixed session count:** verify actual physical RAM,
  current usage and aggregate executor/reviewer/tool/browser workloads before
  dispatch and before heavy work. Retain ≥10 GiB system headroom and the existing
  ≤15 GiB aggregate agent ceiling. One guarded app workload per checkout still
  applies; every workload uses `scripts/resource-guard.py`. Distinct checkouts may
  work concurrently only within aggregate limits. Record process ownership and
  admission evidence; recheck during work, stop owned redundant/heavy workloads
  when needed, and never bypass a resource stop or kill unrelated processes.
- **Isolation includes mutable state:** unique build/test outputs, caches, ports
  and approved fixtures. No shared writable `.next`, compiler/test state or test
  databases. Existing-dependency reuse must be verified safe and available; no
  implicit install or credential/environment copying. Coordinate shared contracts
  and dependency order even across worktrees: isolation does not prevent semantic
  conflicts. No two writers in the same checkout; overlapping feature changes
  need explicit ownership and an integration order, not a blanket concurrency ban.
- **Review then serialized integration:** an executor hands back a frozen candidate
  with existing deterministic/specialist/dual-Santa/live gates satisfied. Record
  candidate acceptance separately from integration. Custodian serializes local
  integrations, verifies current `main`, dependency/source drift and exact diff,
  and records scoped candidate/integration commits and resulting `main` identity.
  Prepare/test the combined result in a clean integration worktree. Rerun affected
  deterministic checks and fresh required reviews after conflicts or substantive
  changes; preserve the existing three-cycle limit. Never claim old review covers
  changed code. Do not merge while the integrated result is unverified.
- **Dirty main is protected:** do not force integration, move the branch behind its
  checked-out worktree, or overwrite/commit owner changes. Recheck actual main HEAD
  and tracked/untracked contents immediately before advancing it. If preserving
  dirty main cannot be demonstrated, leave `integration_pending` with the exact
  blocker. No reset/stash/clean/broad staging, unrelated history rewrite, push or
  deployment. Local merge authority applies only to the accepted assignment.
- **Learning then safe retirement:** persist actual evidence and deduplicated
  project-learning outcome before archive. Verify accepted changes are reachable
  from `main`, integration checks passed, no unresolved work or owned workloads
  remain, and needed ignored/local-only files and evidence are safely preserved
  outside the worktree without exposing secrets. Use supported recoverable managed
  worktree archival; confirm success, then archive the execution chat. Never raw
  delete a checkout or treat an idle chat as proof of safety. A failure leaves
  acceptance intact with `integration_pending`, `learning_pending` or
  `archive_pending` as appropriate; parent completion is still a separate gate.
- **Transition:** T004-A's already frozen documentation-only review stays in its
  current checkout until handback; no mid-review relocation/rebase or widening of
  its no-commit contract. Its delivery is durably retained and can remain
  `integration_pending` until safely isolated/integrated. All subsequent execution
  assignments use the new worktree contract. Existing dirty main/accepted slices
  are not automatically committed, migrated or declared integrated by this update.

### Event-first terminal reporting — owner authorization 2026-11-11

The owner explicitly approved direct report-backs from assigned execution chats to
this custodian chat. For this purpose only, executors may use supported
`send_message_to_thread` to `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`, host `local`,
after persisting an assignment-scoped candidate/blocked/interrupted/failure handback.
No other destination, external messaging/provider or authority is implied.

- While runnable assignments exist and this custodian turn is active, prefer
  supported cursor-based `wait_threads` completion/attention waits, not just zero-
  timeout snapshots followed by ending the turn. Process terminal events promptly:
  read actual handback/source/evidence, reconcile ownership, then accept/rework/hold
  under existing gates. Completion or a message alone never means acceptance.
- Before ending its assignment turn, executor sends a concise report with stable
  event key (assignment + handback hash + status), worktree/chat identity, status,
  durable handback/candidate identity, blocker/next actor and owned resources. A
  sender's successful call proves accepted submission, not custodian processing.
- Receiver records the event key/handled disposition before side effects and
  deduplicates repeated messages, waits and heartbeat discoveries. Acknowledge in
  persistent registry/evidence, not an automatic reply loop that restarts executors.
- Report failure stays recorded locally for recovery; no endless resend/wait or
  restarting unchanged blocked work. Interrupted executors report if still able.
  Fatal crashes/forced termination may prevent reports; native active waits and
  the existing heartbeat reconcile those or missing handbacks. No persistent
  between-turn subscription or guaranteed immediate hard-crash wake is available
  from the exposed tools. Do not install watchers/hooks/observers or change cadence.

Live routing verification: G1 reporting-only probe `SPH-T005-G1-20261111-01:report-route-probe-1` was submitted via the supported send tool, received here as an actual coordination event, and [handled once](qa/t005-g1-20261111/report-route-probe-1.json). No code was resumed and no acknowledgement loop was started. Automation instructions updated; cadence/enabled state unchanged.

The heartbeat is the recovery sweep, not the normal completion-handback channel.
When all work is genuinely blocked, persist next actor/action and stop active waits
rather than manufacture activity. Direct reports do not authorize code resumption.

### Separate maintenance commits and gated delivery — owner update 2026-11-11

- Commit material to-do/registry updates promptly in a separate documentation-only
  maintenance commit, independent of implementation acceptance. Include only the
  explicitly owned registry/companion planning changes; no candidate production
  code, broad staging, unrelated WIP or implied feature completion. Check the index,
  last-read contents, financial capture and diff before committing; keep hooks active.
- At the end of each accepted orchestrated run, make a scoped implementation
  commit and push through the custodian delivery gate when there is no significant
  unresolved risk. Record exact candidate/integration/maintenance commit identities
  and push outcome separately. This is explicit bounded push authority, not
  permission to publish unaccepted work, unrelated outgoing history or production.
- Before push: all required checks/reviews and current-source integration gates
  pass; verify remote/repository/branch, current remote tip and ancestry, complete
  outgoing history, secrets/privacy, branch rules and CI/deployment/cost effects.
  Do not infer push safety from tests alone or disable hooks/resource safeguards.
  Any implicit deployment, paid job, unresolved conflict/divergence, unknown
  publication side effect or unrelated outgoing commit is a specific push hold.
- Never force-push, rewrite history, silently merge/rebase remote changes, change
  credentials/protection or select an alternate publication target to bypass a hold.
  Keep `push_pending` with exact blocker/next actor; accepted implementation and
  maintenance commits remain valid. No unchanged repeat push attempts.

Current delivery observation: `main` is 14 ahead / 8 behind `origin/main` before
this maintenance commit. Live `git ls-remote` confirms the tracked remote tip
`4abf58e61ac33ade53b7d4d03f18d68c03beb7f4` at `origin`
(`github.com/xnxchoi/sophomores`). The owner has now explicitly authorized reconciliation and ordinary push; a clean merge candidate has zero textual conflicts. Combined validation and G1 type repair precede main advancement; no force-push/history rewrite or deployment.

## Current maintenance checkpoint

### Restart recovery — 2026-11-12

- Owner resumed. Existing S1 and T005-B chats resumed in their original worktrees after source-hash reconciliation. Supported waits confirmed both active/inProgress; no duplicate executor or acceptance inferred.
- Fresh admission: 48 GiB physical RAM, 22.137 GiB available, 1.773 GiB accounted Codex descendants; sampling-child exit recorded. Both executors must recheck admission and aggregate tool overhead before checks/review. No processes terminated.
- **S1 accepted — bounded local credential remediation:** exact nine-file freeze verified, actual projection/direct/populated-slot RED→GREEN, final95/95 plus scoped lint/type and selected coverage gates, security/React PASS and fresh code/TS Santa PASS/PASS cycle1. Actual desktop/phone provider-free production SSR initial-state render passed; not hydration/provider or clean-build acceptance. [Custodian evidence](qa/delivery-s1-20261111/custodian-acceptance-20261112.json). No actual credential/DB/provider access. `integration_pending`; exact combined checks and both fresh delivery reviews precede main/push; owned browser/server closed.
- Delivery: integration branch `df32b88` includes accepted G1; canonical main remains `af2ed77`. No push yet; S1 fix plus exact combined candidate checks and fresh delivery reviews remain. No unaccepted B source in delivery.
- Automation reactivation pending: no supported automation-update tool exposed in this turn; configuration/cadence untouched. Active native execution waits and direct terminal report-backs remain available.
- Owner requested `$orchestration`: installed Orca guide loaded; own terminal verified from current prompt/pane, explicit `--from` used without global configuration changes. Run `run_52905bcc2252` tracks existing native-owner handback gates (no duplicate worker) and dependency-gated parallel fresh delivery reviewers A/B. Reviews start only after accepted S1 and combined candidate freeze.
- **T005-B accepted — bounded local slice:** actual candidate handback handled on arrival; exact five-file freeze `8d133552…` verified against accepted G1 base, 173/173 affected regressions plus scoped type/lint, specialist APPROVE and fresh independent dual Santa PASS/PASS. [Custodian evidence](qa/t005-b-20261111/custodian-acceptance-20261112.json). Same-claimant still-valid bearer recovers original receipt without mutation; foreign/expiry/hold/native completion gates retained. Accepted code commit `a0519d7` in private worktree; `integration_pending`; T005 parent remains incomplete and real DB/provider/runtime/UI acceptance unclaimed. No assignment-owned workloads; do not restart finished execution or archive before integration/learning gates. Quarantined integration commit `6732a17` preserves accepted hashes; combined173/173 and strict scoped typecheck PASS with no owned PIDs. [Combined evidence](qa/resume-20261112/b-integration/b-integration-20261112.json). Canonical main/remote not advanced; final combined delivery gates remain.
- **SPH-DELIVERY-PREFLIGHT-20261112-01 — dispatched, start unverified:** local Orca read-only reviewer, shared integration checkout at frozen HEAD `3cfab5e`; source/index/registry read-only, owns only `docs/qa/history-reconciliation-20261111/orca-preflight-20261112.json`. [Frozen contract](qa/resume-20261112/delivery-preflight-spec.md) defines exact base/history, three factual criteria, resources and reporting. Independently audits outgoing-history/publication safety while S1/B remain their existing owners. Not final Santa or feature acceptance; no app/provider/DB workload. Actual Task `task_a1f159c92572`, Dispatch `ctx_88c31e3644eb`, worker `term_b687c276-18b9-4265-bd6d-1c72407332e8`; retained/live but `start_unknown`, prompt buffered. Same-Dispatch guidance sent; no duplicate/retry or success claim. [Receipt/recovery state](qa/resume-20261112/orca-preflight-dispatch.json). Keep open for custody.
- Durable [restart evidence](qa/resume-20261112/checkpoint.json). Fragile checks: aggregate client growth; exact candidate/review hashes; preserve financial capture/owner WIP; fresh remote ancestry before ordinary push; acceptance is not provider/deployment acceptance.

### Execution status clarification — 2026-11-11

Parent implementation state is not executor liveness. Current assignment status:

| Parent | Implementation progress | Execution now / next dependency |
| --- | --- | --- |
| T005 | A and B slices locally accepted; parent incomplete | B exact candidate accepted 2026-11-12, integration pending; no active B implementation. UI/hold breadth and real DB/provider/runtime acceptance remain. |
| T001 | A allocation slice locally accepted; parent incomplete | No active executor. Same-unit activation/display remains; timing is undecided and must stay swappable, coordinated with T010/T003. |
| T009 | A identity slice locally accepted; parent incomplete | No active executor. Full readiness/caller integration, feedback and retention decisions remain. |
| T004 | Implementation unstarted; A design accepted | SPH-T004-A-20261111-01 closed after exact-source acceptance, existing main reachability, project learning and confirmed chat archive. I0–I6 implementation/owner/runtime gates remain. |

The three partial parents are queued/dependency-held, not three live jobs. The
former single-flight cap is superseded: dependency-ready work may run concurrently
in isolated worktrees after resource admission. T004-A is closed; T005-B bounded candidate is accepted and committed, integration pending; do not restart its finished execution.
Accepted A slices retain evidence; no whole-task completion or blanket blocker is inferred.

- Complete: registered KOCOPY-20261111 as T011, preserving its full F01–F59 capture, pending acceptance and copy-chat ownership. System-fix overlap routing is proposed, not a semantic merge or new execution approval.
- Complete: owner requested consolidating the gift registration/confirmation investigation into T010; findings, intended continuation, invitation recovery and acceptance gates are recorded. Implementation remains unstarted; this is not runtime acceptance.

- Complete: initial format, stable IDs, separate implementation/planning states,
  preserved source notes and payment-recovery brief, and the approved new-chat handoff.
- Complete: consistency/placement review of the purchase/claim investigation; its
  11 scenarios are linked into T001/T003 and the delegated blueprint’s review inputs.
  The externally authored payment-recovery brief remains byte-preserved.
- Complete: the delegated Unlock/NFC P1 blueprint is consolidated under T002 with
  its source/security qualifications, decision gates and smallest external proofs.
  Planning delivery is not owner acceptance or implemented integration.
- Complete: T005/item 12A intake and placement review. Its case/action/disclosure
  checkpoint is linked to T001/T003; financial implementation remains in T004.
  Investigation delivery does not authorize source/copy changes.
- Complete: concurrent intake registered T006, T007, T009 and T010 as four distinct investigations;
  duplicate IDs, scoped links and index/detail order are reconciled non-destructively.
  At that intake, implementation was unstarted; copy approval is not system approval.
- Complete — local slice only: T005-A candidate 3 passed both fresh independent
  Santa reviewers and TypeScript review after two retained rejected candidates.
  Guarded endpoint/native/bundled-module RED/GREEN, three 84/84 focused trials,
  scoped lint and full typecheck are recorded in [T005 evidence][2].
  Focused aggregate coverage is 88.95% lines / 83.27% branches / 88.31% functions;
  full domain.ts individually remains below 80% lines/functions. No whole task is complete.
- Complete — local slice only: T001-A reserves buyer/event self occupancy on the
  first paid grant, leaves extra/subsequent units as gifts, protects stable replay
  and blocks reserved-self gifting/overwrite. Both fresh independent reviewers and
  TypeScript review passed; [allocation evidence][3]
  retains measured RED/GREEN, three 141/141 provider-free trials, scoped lint/full
  typecheck and guests.ts coverage (91.24% lines / 90.21% branches / 86.21% functions).
- Complete — design only: T010-A server-owned intent proposal passed both fresh
  independent design reviewers; [design evidence][4]
  preserves the exact proposal hash, owner scope and unapproved lifecycle/transport
  gates. Implementation remains unstarted; this is not working resumability.
- Complete — local slice only: T009-A candidate 2 separates native body-read
  transport/abort failures from successfully consumed invalid JSON/schema. Measured
  RED 55/57 became three 57/57 trials; full typecheck/scoped lint and required
  code/TypeScript reviews passed. Both fresh independent round-2 Santa reviewers
  passed after the preserved first-candidate FAIL/PASS.
- Evidence: [T009 candidate history][5] retains both candidates, failed/near-failed
  checkpoints and current desktop/phone-width synthetic actual-boundary/provider
  render. Chromium delivered TypeError for an injected body AbortError; generic
  transport classification follows actual native evidence, not the fixture label.
  Owned mapped executable lines/functions are 100%; V8 ranges 96.63% are not
  semantic branch coverage. Whole checkout lines remain 63.41%, not 80%.
- Complete — design only: [T004-A custodian acceptance](qa/t004-a-20261111/custodian-acceptance.json) verifies six candidate files, 44 anchors, technical source identity and PASS/PASS. Candidate files are already byte-identical in observed main commit `3c853b0`; no custodian merge was performed. Workflow-only registry/plan drift is reconciled, not concealed.
- Closed: T004-A [project learning](qa/t004-a-20261111/learning.md) persisted before confirmed archive of execution chat `01a1c9f4-209c-7273-9b6c-18b35fe19a78`. No managed worktree existed for this transition exception; primary checkout preserved. T004 implementation stays `( )`.
- G1 — **accepted standalone, committed, integration pending**: five-file declaration-boundary candidate passed security and fresh independent code/TypeScript Santa PASS/PASS, 85/85 trials and scoped compiler, with byte-identical runtime output. Commit `92cfe64` is isolated, not pushed/main-integrated; [acceptance](qa/t005-g1-20261111/custodian-acceptance-1.json). Narrow-graph diagnostics were not proven whole-main failures: the merged generated-Payload-augmentation graph passes without G1/B.
- B — **resuming same chat** `01a1ca3b-c6b6-7890-9c58-94885f1c1631`: accepted G1 `92cfe64` fast-forwarded into its private 3041 worktree; all unaccepted B production/test hashes preserved. Update only authorized stale guest regression, rerun actual affected gates and fresh dual Santa. No wait for unrelated main-push/security work; no feature acceptance yet.
- Delivery — **security rework**: history merge is textually clean, source unions/financial capture preserved, combined claim/server/music typecheck 0 and reading/music 25/25. Fresh reviewer A rejected candidate 1: public Setlists exposes stored MusicKit owner credential through unrestricted field read. This is source risk already in upstream, not a demonstrated live leak. No actual credential/provider accessed; no rotation authorized.
- Current — **running SPH-DELIVERY-S1-20261111-01**, chat `01a1ca95-c12b-7fe1-b162-3f4ae3ad7db7`, worktree `/Users/seanschoi/.codex/worktrees/31d7/sphmrs`:  narrow private-field read protection and real field-pipeline regression in its own worktree from exact upstream `4abf58e`; no collection-wide public-read ban, new privileges or unrelated music redesign. After deterministic/fix checks rerun both fresh delivery reviews; cap remains three cycles. No push until critical defect is fixed.
- Resource recovery: completed reviewer/assignment clients accumulated above the 15 GiB aggregate ceiling (15.966 observed); new admission stopped, exact-provenance idle UI and unused MCP clients were retired, preserving root/reporting connections and user apps/data. Receipts retained in integration QA. Fresh qualified sample: ~7.818 GiB accounted, ~19.591 GiB available on 48 GiB, no unreadable PIDs. Limits unchanged; resource-admit B and S1 independently, no app/tool quota bypass.

- Remaining gates: T004 transaction remedy/DB proof, numeric budgets, risk-event policy, readiness, catch-up actor/mechanism, retention/provider/device; T001 activation selection and T010 continuation lifecycle. No unchanged blocked slice restarted.
- Pending closure: no accepted execution chat left awaiting archive. T005-B must pass exact candidate/review/integration/learning/retirement gates; owner-authorized direct terminal report-backs are now the normal route, with native active waits and heartbeat recovery; no guaranteed hard-crash wake is claimed.
- Review next: the proposed priority/split structure below, then incorporate
  submitted decisions and actual phase evidence without broadening execution.
- Fragile final pass: preserve payment safety/approval boundaries and all original
  task captures; do not confuse pending-entitlement policy with fake accounts;
  do not mark delegated planning as implemented; preserve unrelated checkout edits.

## Current assignment contract — SPH-DELIVERY-S1-20261111-01

- State **running**, setup reconciled without retry. Chat `01a1ca95-c12b-7fe1-b162-3f4ae3ad7db7`, managed worktree `/Users/seanschoi/.codex/worktrees/31d7/sphmrs`; exact base confirmed, executor must verify branch. Parent SPH-DELIVERY-20261111-01,
  security rework cycle 1 of at most 3. Exact base/ref `origin/main`
  `4abf58e61ac33ade53b7d4d03f18d68c03beb7f4`, not dirty working tree. Unique
  `codex/delivery-s1-private-token-20261111` planned branch. Client creation token `client-new-thread:ac012042-e2eb-43e5-9240-e28e40467d6f` resolved to the above chat/path.
  Custodian `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`, host local.
- Ownership SOURCE ONLY `src/lib/payload/collections/setlists/index.ts`; TEST ONLY
  new `tests/music/setlist-token-access.test.ts`; own `docs/qa/delivery-s1-20261111/`
  evidence excluding baseline/dispatch. All other source/registry/plan/callers/
  catalogues/archives read-only. No new helper if existing server-owned field
  access helper applies. [Baseline/critical source finding/resources](qa/delivery-s1-20261111/assignment-baseline.json).
- **Scope amendment 2026-11-12:** additionally own `src/app/api/setlists/[slug]/route.ts` and `src/app/(site)/setlists/[slug]/page.tsx` only to prevent browser serialization of owner credential. If necessary, `src/lib/music/types.ts` and `src/components/music/SetlistView.tsx` only to replace secret-derived initial status with nonsecret boolean for already-authorized curator, preserving existing status authority. New `tests/music/setlist-token-boundaries.test.ts` allowed; all tests under root. Installed field-pipeline proof still required. Same three criteria include both browser boundaries, actor-correct status, internal override/writes and failure/unknown paths. Required React review/live local render if component/UI touched; no provider/DB service. Exact baselines/event disposition in amendment evidence.
- **Scope amendment2 2026-11-12:** additionally own `src/lib/music/eligibility.ts` solely to add `depth:0` to the track query inside `getUserSetlistSlots`; no other eligibility changes. Preserve relationship regression RED and demonstrate no nested loader plus preserved scalar fields/relationship IDs across all affected callers. Original three criteria/review/resource/safety limits remain; current partial cycle1, no completed Santa pair. Exact event/hash/baseline in amendment2 evidence.
- Criteria: (1) actual RED on current field pipeline/schema proves synthetic owner
  credential is visible to ordinary API reads; GREEN prevents anonymous/customer/
  staff/curator REST/GraphQL projection of that credential, including nested fields.
  (2) Trusted server override/internal sync and authorized token-write flow remain
  intact; no collection-wide public read ban, new role/access grant, token fetch/
  rotation or plaintext logging. (3) affected scoped tests/type/lint pass, source
  and installed-Payload field pipeline/callers reviewed by security specialist and
  fresh independent dual Santa on same frozen spec/output/rubric; both PASS.
  No DB/provider/live leak or full-site acceptance claimed.
- Before code use native security-reviewer for critical triage, then native
  TDD/minimal implementation. Read installed docs/source; existing dependencies
  read-only, no install/env/credential/network/provider/DB/service/hardware access.
  Fresh prework aggregate ≤13.5 GiB, guarded job ≤1 GiB/heap ≤640 MiB, total ≤15
  and system headroom ≥10. Budget tool/reviewer clients, retire own verified idle
  unused clients only; one app workload per checkout, local cache/output.
- Handback: exact candidate/base/hash/branch/path; actual RED/GREEN, failures and
  review cycles, caller/serialization proof limitations and owned PIDs. Persist then
  direct report stable assignment+handback-hash+status event to custodian using
  supported send_message_to_thread (explicit owner authorization). No ack loop.
- Scoped validated local commit allowed; no main merge/push/parent completion or
  archive by executor. Custodian integrates only accepted patch into clean delivery
  worktree, reruns affected deterministic checks and both fresh delivery reviewers
  after the source change, then ordinary push only after gates. No deployment,
  actual token handling, credential changes or publication before security pass.

## Current delivery contract — SPH-DELIVERY-20261111-01

- Owner explicitly instructed “Resolve and push” after the divergence report.
  Custodian owns mechanical history reconciliation/integration/delivery, not new
  product implementation. Preserve main/local and origin histories; no force push.
- Verified local base `3a84773f054b304198d75eb5bcba7691ac8e8088`, remote main
  `4abf58e61ac33ade53b7d4d03f18d68c03beb7f4`, common base
  `cb824922332606cd63f3f3b04b8a7c883f44d444`. Live remote tip matches tracking.
  Non-working-tree `git merge-tree` found zero textual conflicts; exact proposed
  tree and output in `docs/qa/history-reconciliation-20261111/merge-tree.txt`.
- Prepare a clean managed integration worktree; retain both histories/source sets.
  No unaccepted B source. G1 may join only after its candidate gates pass; the
  four known base type diagnostics must be resolved before declaring combined
  typecheck green. No new dependency/provider/DB/service/migration execution.
- Criteria: (1) both verified histories are ancestors of delivery and local/remote
  owner changes retained without blanket ours/theirs; (2) affected deterministic
  source/type/regression/security and required independent integration reviews pass
  on the frozen combined candidate, remaining live/provider gates honest; (3) safe
  fast-forward main advancement and ordinary push to existing origin/main succeed,
  then remote SHA independently verified. Record failures, no policy guessed.
- Wait for G1's actual handback while preparing non-app integration. Run no
  competing compiler/test/bundler if aggregate resources are insufficient. Review
  actual remote-derived affected callers, CI/permission/deployment effects,
  outgoing history and secrets. No new product scope, force-push or deployment.
- Maintenance documentation commits remain separate from implementation/integration
  commits. Retire only the managed integration worktree after durable evidence,
  verified main/remote reachability and no owned workloads; preserve this custodian.

## Current assignment contract — SPH-T005-G1-20261111-01

- **State:** accepted standalone candidate, isolated code commit 92cfe64; integration/learning/archive pending. Original resource stop and scoped graph exclusions retained. Chat `01a1ca5d-6a18-7370-a76b-d8c22cb9e98a`, managed worktree `/Users/seanschoi/.codex/worktrees/b56f/sphmrs`; HEAD verified at base; executor verified branch `codex/t005-g1-type-boundaries-20261111`. Intent preceded setup. Parent: T005 validation
  prerequisite. Custodian `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`, host local.
- **Outcome/base:** four exact-base type diagnostics removed via minimal type
  boundaries, no intended runtime change. Managed worktree from committed main
  `3c853b0e670abde45f591f2f86d09dbbf4472983`, no dirty-source copying. Unique
  `codex/t005-g1-type-boundaries-20261111` verified branch. Pending creation token `client-new-thread:7a702e5b-5117-4adc-8d2b-76775a659b8e` reconciled to the above chat/path without retry.
  [Exact baseline/diagnostics/resources](qa/t005-g1-20261111/assignment-baseline.json).
- **Owned paths:** source ONLY `src/lib/commerce/portone/adapter.ts` customer
  parameter type and `src/lib/payload/collections/access.ts` MemberPrincipal type.
  Tests ONLY `tests/commerce/portone/adapter.test.ts`, new
  `tests/commerce/portone/request-types.test.ts`, existing
  `tests/reading/content-collections.test.ts`; own `docs/qa/t005-g1-20261111/`
  evidence excluding custodian baseline/dispatch. All other source (including B),
  catalogues, canonical registry/plan/archives read-only. If another path or runtime
  behavior must change, report precise blocker instead of broadening.
- **Three criteria:**
1. Reproduce all four exact-base TypeScript diagnostics with a bounded scoped
   compiler check before editing, then eliminate them without casts/assertions,
   suppression, weaker compiler settings or new runtime/authorization behavior.
2. Characterize and preserve runtime email validation/SDK request shape and
   bookmark/notification ownership for existing string/numeric/absent/member/staff
   principals; no new privilege, account coercion, payment path or provider calls.
3. Affected scoped tests/lint/typecheck pass, frozen minimal diff receives required
   code/TypeScript/security and dual independent Santa PASS; full-project resource
   failures remain disclosed, no false global coverage/runtime acceptance.
- **Guidance/permissions:** applicable AGENTS.md, installed Next/library docs and
  library-first rules, root tests, resource guard, governing commerce plan and
  scoped step-11 route. Native build-error-resolver/TDD/specialist reviewers may
  work within ownership/resources. Local validated scoped commits allowed; no
  providers/DB/transports, services/env/credentials, installs, new grants, WIP
  staging, push/publication/readiness/deployment or destructive actions.
- **Resources:** provisional ~12.645 GiB accounted/~18.976 GiB available of 48;
  recount tools/reviewers before app work. Require existing ≤13.5 GiB plus guarded
  ≤1 GiB focused workload, total ≤15 GiB and ≥10 GiB system headroom. One workload
  per checkout, isolated writable outputs/cache; no preview/build or unchanged
  full-project OOM retry. Existing dependencies read-only; no installation.
- **Review/reporting:** deterministic RED/GREEN and affected callers first; required
  specialist/code/type/security and identical-spec/output/rubric fresh dual Santa
  with no mutual visibility, both PASS, at most three fix/review cycles. Durable
  exact-identity handback and final turn, actual failures/limitations/remaining PIDs.
  Custodian reads/waits; no callback/wake promise. Do not archive/complete parents.
- **Integration/closure:** custodian alone checks current main/combined result,
  serializes integration, revalidates changed code, then learning/reachability/no
  workloads/ignored-file preservation before recoverable worktree and chat archive.
  B may consume only the accepted integrated G1, not unreviewed edits.

## Current assignment contract — SPH-T005-B-20261111-01

- **State:** resuming; accepted dependency 92cfe64 integrated privately with existing B hashes preserved. Stale guest-regression ownership amendment is authorized; no wait for unrelated delivery. Parent T005-B. Chat `01a1ca3b-c6b6-7890-9c58-94885f1c1631`, host local, managed worktree `/Users/seanschoi/.codex/worktrees/3041/sphmrs`, verified branch `codex/t005-b-claim-result-20261111`.
  Custodian `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`, host local.
- **Outcome, ownership and three criteria:** T005-B scope/criteria under the named
  section and step-10 in [bounded execution plan][1]; same-account valid-bearer
  already-successful result only, no new entitlement. No UI/copy or payment changes.
- **Base/dependencies:** `/Users/seanschoi/Projects/sphmrs` main
  `3c853b0e670abde45f591f2f86d09dbbf4472983`; exact source/dirty/resource baseline
  [here](qa/t005-b-20261111/assignment-baseline.json). New managed worktree from
  committed main, NOT working-tree/all-WIP copy. Unique branch
  `codex/t005-b-claim-result-20261111`; confirmed managed worktree `/Users/seanschoi/.codex/worktrees/3041/sphmrs` at exact base. Creation token `client-new-thread:2f7869e3-4003-4e07-a5b2-8183a0218a16` resolved to chat `01a1ca3b-c6b6-7890-9c58-94885f1c1631`; no duplicate created.
- **Owned paths:** `src/lib/commerce/guests.ts`; root `tests/commerce/domain/`
  claim-outcomes.test.ts, claim-http.test.ts, new claim-recovery.test.ts, and (custodian amendment) guests.test.ts solely for the stale replay expectation/retained invariants; own QA
  evidence directory excluding custodian baseline/dispatch. Everything else is
  read-only, including canonical registry/plan/catalogues/native transaction helper.
- **Resources:** admission sample ~12.677 GiB accounted, ~21.085 GiB available of
  48 GiB. Recount before tools/review/workloads; no workload while existing total
  >13.5 GiB or system headroom <10 GiB. Focused app checks ≤1 GiB guarded, one per
  worktree, aggregate ≤15 GiB. No preview/build/parallel tests. If unable, stop and
  report resource blocker; no bypass or limit increase. Keep caches/outputs local.
- **Permissions/holds:** settled local source/test work and reviewed scoped local
  commits; no providers/DB/transport/services, env/credentials, installs, policy
  selection, new permissions, pushes/readiness/deployment or destructive cleanup.
  Inspect installed Next/library docs before code. Tests first, preserve actor/
  outcome/native completion/privacy/expiry/hold boundaries. Do not manufacture
  an expiry override or choose unresolved recovery/reissue policy.
- **Review/handback:** deterministic checks first, required code/type/security
  reviews plus two fresh independent Santa reviewers with identical original spec/
  candidate/rubric and no mutual assessment visibility. Both PASS; at most three
  fix/review cycles. Report exact branch/base/candidate/source hashes, RED/GREEN/
  actual failures/checks/limitations, decisions and remaining owned PIDs in durable
  worktree handback and final turn. Custodian reads/waits; no wake guarantee.
- **Integration/retirement:** candidate is not merged or complete. Custodian
  serializes integration, checks current main and combined result, reruns affected
  gates after changes, preserves concurrent WIP; then learning/evidence and verified
  main reachability/no workloads before recoverable managed worktree and chat archive.
  Executor cannot update registry, archive itself or broaden scope.

## Closed assignment contract — SPH-T004-A-20261111-01

- **State:** closed; design accepted, existing main reachability verified, project learning persisted and execution chat archive confirmed. Original dispatch contract follows; no parent implementation completion. Execution
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

## Task index — attention order, not execution authorization

| ID   | Task                                                              | Implementation | Planning / delegation                                                                                                                          | Priority basis                                                                                                   | Next checkpoint                                                                                                                 |
| ---- | ----------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| T005 | [Known outcomes, error clarity and review correction][6]          | (△)            | T005-A accepted; T005-B blocked on scoped G1 type repair and guest regression; UI/real acceptance pending                                                                         | P1 proposed: obscured claim/commerce outcomes and unsafe recovery guidance                                       | Retain local evidence; own-success recovery, UI/holds and separately scoped runtime/DB acceptance remain.                       |
| T001 | [Tickets and accounts][7]                                         | (△)            | T001-A locally accepted; remaining activation/display/real acceptance pending under this chat                                                  | P1, owner explicitly called this high priority                                                                   | Plan same-entitlement activation/display with T010/T003; retain local evidence and separately scoped real acceptance.           |
| T009 | [Checkout identity and system-managed recovery][8]                | (△)            | T009-A locally accepted; full caller/readiness, feedback and retention work pending                                        | P1 proposed: account isolation, retained checkout context and recovery dependency; wording alone is P2           | Scope full caller/readiness and case-specific recovery; retain owner policy and real-acceptance gates.                      |
| T002 | [Unlock Protocol, tokens, wallet/NFC integration][9]              | ( )            | P1 blueprint delivered; owner review pending; delegated chat retained                                                                          | Current owner-authorized focus; integration precedes dependent design                                            | Review consolidated blueprint/G1–G5 and choose a separately scoped next batch; no provider action.                              |
| T004 | [Payment confirmation and recovery][10]                           | ( )            | T004-A design accepted/session closed; I0–I6 implementation unstarted                                                                                       | P1 proposed: financial safety and cross-cutting dependency                                                       | Review bounded design handback; financial policy/provider/DB proofs remain gated.                                                                      |
| T006 | [Guest-name corrections versus admission reassignment][11]        | ( )            | Item 8 investigation complete; owner authorized recording; policy and implementation unassigned                                                | P1 proposed: identity/attendance integrity and missing supported correction path                                 | Decide correction authority separately from transfers; close the staff-operation gap within the existing commerce plan.         |
| T007 | [Account recovery: bound-phone proof and concierge follow-up][12] | ( )            | Read-only investigation complete; owner decisions recorded; engineering proposals require scoped approval                                      | P1 proposed: account-access and identity-change risk                                                             | Review recovery/email/grant design, then authorize a bounded implementation batch. Copy belongs to the Korean calibration chat. |
| T010 | [Required gift registration and resumable claim completion][13]   | ( )            | T010-A design reviewed; lifecycle/transport gates unresolved; implementation unstarted                                                | P1 proposed: verified identity, account binding and lost invitation/result recovery; dependent on T001 authority | Bound one intentional register/sign-in-and-claim journey, without redundant confirmation; coordinate T001/T003/T005.            |
| T003 | [Purchase UI][14]                                                 | ( )            | Interaction and typed claim/result direction recorded; implementation unassigned                                                               | P2 proposed: depends on settled allocation/recovery contracts                                                    | Define truthful self/gift rows, safe claim-result recovery and system-owned payment recovery; no isolated copy patch.           |
| T011 | [Korean UX copy finalization][15]                                 | ( )            | KOCOPY-20261111 final editorial checks reported complete; copy calibration chat retains ownership; Korean owner/source/live acceptance pending | P1 risk triage proposed; final wording depends on system contracts                                               | Review overlap routing and final-copy scope; no catalogue or policy changes from intake.                                        |
| T012 | [English interface copy: deferred states and acceptance gaps][16] | ( )            | ENCOPY-20261111 source audit complete; implementation unassigned; safe copy-only passes delivered separately                                   | P1 risk triage proposed for identity/money; not new implementation authority                                     | Route system findings to existing owners, settle remaining state contracts, then rerun case-specific copy and live acceptance.  |

## Active and unstarted tasks

### T005 — Known outcomes, error clarity and review correction

**Implementation:** (△). **Phase:** T005-A backend contract locally accepted with linked deterministic and fresh dual-review evidence; remaining recovery/UI/hold and real-acceptance work pending.
Prior bounded read-only investigation complete;
owner authorized adding this item and notifying the document custodian on
2026-11-11. Recording is not approval to implement or publish copy.
**Owner:** this chat coordinates execution; local source agent `claim_contract_tdd` handed back the accepted A slice. Remaining T005 slices are not yet delegated; ongoing registry custody remains with
`01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`.
**Priority:** P1 proposed for consequential claim/account/commerce classification;
individual explanatory/action-copy findings below are P2 where noted.
**Investigation:** Codex chat `01a1c66b-3f55-7402-975c-6efe759c8ba3`, owner item 12A
from parent `01a1c404-f38f-7d43-8d24-bdcc1f87ef7e`.

**Governing scope and dependencies:** implement within the existing
[commerce launch plan][17], principally steps 3–5
with authoritative account dependencies in step 6 and separately approved external
acceptance in step 8. T001 and the item 12B purchase/claim overlap investigation own
allocation, binding and product-resolution policy; T003 owns the resulting usable
surfaces. T004 remains the financial reconciliation task: link payment findings
there, do not create a competing finalizer or duplicate recovery implementation.
Deployment remains the final milestone. Registration, confirmation and guest-name
restrictions have separate owner investigations; this item does not decide them.

**Evidenced failure and decision process:** backend-known facts were discarded and
the frontend's resulting ignorance was treated as system-wide uncertainty. The
copy-only proposal optimized one shared error slot for lost-response safety instead
of holding it for classified outcomes. Its next step did not distinguish customer,
buyer and system responsibilities. Both independent reviews accepted the qualified
uncertainty and existence of retry controls without establishing reader comprehension
or whether the customer should act. Matching an abstract instruction to a button
does not pass that test. The rubric required supported actions but omitted an
explicit backend-outcome/information-loss inventory; shared rubric agreement was
not usability or owner acceptance. Preserving current behavior also failed to
establish current product intent. These are observable artifact/review failures,
not claims about motives or hidden reasoning. No specific privacy/security reason
for obscuring these claim conditions was established.

**Contract and case distinctions required:**
- Domain claim checks currently combine consumed, revoked, expired and unavailable
  states; the endpoint collapses caught business, validation and infrastructure
  failures into generic HTTP 400; the UI also combines those responses with network
  failures and malformed success receipts. Carry typed authoritative outcomes from
  domain/transaction boundaries through HTTP to next-intl UI. Do not infer a known
  rollback from generic 400/409/5xx, parse exception wording as a protocol, or relabel
  unknown commit/receipt as failed. Choose explicit HTTP/code semantics and precedence.
- **Expired/cutoff:** explain verified expiry directly. Current issued-link expiry
  is the event claim cutoff and issuance is blocked after that cutoff, so asking
  the buyer for a replacement is not a universal remedy. Define an actual approved
  resolution/escalation destination; do not invent cutoff exceptions or extensions.
- **Consumed/already claimed:** distinguish this authenticated account's completed
  claim from consumption elsewhere. Reconcile a lost success response against the
  existing binding without another grant; do not expose another claimant's identity.
- **Existing event/account binding:** explain a verified conflict and expose the
  existing entitlement when a real authorized destination is available. Today's
  event-account admission-key check is not proof that every independently bought
  membership/ticket scenario is covered; use T001/item 12B's overlap matrix.
- **Eligibility/authentication/rate limiting:** separate authoritative missing setup,
  authentication, authorization/security rejection and cooldown. The combined
  verification/banned/active-member check cannot always diagnose missing phone proof;
  403 alone cannot establish session expiry. Preserve existing explicit-action gates.
- **Unknown receipt:** retain uncertainty and design safe same-claim/account
  reconciliation. The claim button currently re-enables after the catch; merely
  omitting retry language does not prevent repeated mutations. Do not automatically
  reissue/rotate links, grant benefits, initiate payment or invent refund/transfer
  or alternative-account workarounds.

**Bounded same-logic sibling findings — not a rewrite of the 1,197-key catalogue:**
- **P1 — admission updates:** `Customer.components_commerce_order_admissions.thisAdmissionCouldNotBeUpdatedItMayHave` combines name saving and private-link issuance, known rejection and lost success. Refresh cannot reconstruct a newly issued bearer and can discard mounted edits/links. Already held in the copy proposal.
- **P1 — payment:** `Customer.components_commerce_payment.paymentCouldNotBeConfirmedYourAttemptIsRetained` also covers known account mismatch and failure before intent storage, so retention is not unconditional. The payment wrapper and resume/retire catches obscure known review/authentication states. Incorporate classification/retention fixes into T004 while preserving genuinely unknown financial outcomes.
- **P2 — checkout identity:** `Customer.components_commerce_checkout.yourSessionCouldNotBeVerifiedYourInputsAre` combines account reads, parsing and identity synchronization; retention differs across identity changes. Coordinate with owner investigation #1 rather than assuming a manual retry belongs to the customer.
- **P2 — locked guest names:** `Customer.components_commerce_order_admissions.guestNamesCannotBeChangedHereAfterClaimOr` has several known rendering states; the generalized proposal erased the explanation. [T006 / investigation #8][18] must settle restrictions before wording changes.
- **P2 — cart quantity:** `Customer.components_commerce_checkout.theQuantityCouldNotBeUpdatedTryAgain` treats an unknown mutation as failed and invites repetition. Already held; require reconciliation rather than a wording-only fix.
- **P2 — recovery intake:** `MemberAuth.weCouldntConfirmReceiptPleaseCheckYourConnectionAndTryAgain` routes known non-202 responses other than 429 through transport/receipt guidance. Received validation/origin rejection is not a connection problem; a 503 may still leave receipt unknown. The canonical namespace was verified while recording this item.
- **Preserve the counterexample:** member-auth already carries typed invalid/expired-code, rate-limit and phone-conflict conditions into native next-intl rendering. Do not flatten these distinctions or remove honest timeout uncertainty.
- **Shared endpoint compatibility:** staff operation-panel code matches the current generic error body literally for return correction. Contract changes must update this consumer and affected staff/i18n tests without weakening exact-operation replay or acknowledged-versus-unknown protections.

**Disclosure boundary:** retain bearer secrecy, authorization, rate limits, private
identity/order/benefit data and safe diagnostic handling. For a verified bearer and
authenticated account, do not default to concealing expiry or that account's own
entitlement conflict. Record the specific protected fact and threat for any withheld
detail; do not expose raw exceptions or identify another claimant. Missing/rotated
tokens may lack authoritative historical association, so do not invent a cause.

**Next checkpoint / acceptance:** first produce a per-case matrix showing (1)
authoritative evidence and transaction outcome, (2) customer explanation, (3) actor
and why intervention is needed, (4) actual control/destination and preserved context,
(5) specific disclosure boundary and (6) tests. Hold copy where the action or policy
is missing. Reviewers must trace every relevant caller/branch and fail unsupported
guidance, not pass because a similarly named button exists. Add test-first domain,
endpoint and UI cases for expiry, consumption, same-account completion, binding
conflict, authentication/security rejection, cooldown, malformed/lost receipts,
concurrent claims and safe reconciliation; include action-specific admission/link
recovery. Coordinate financial cases with T004. Guarded checks, actual desktop/mobile
render inspection and a harsh concise Santa review are required for implemented UI;
provider/device/PG acceptance remains separate. No runtime/tests/provider acceptance
was performed in this investigation. No source, catalogue, Korean, global guidance,
skill or memory changes are authorized by this recording request.

**Evidence — recheck current ownership/lines before implementation:**
- [Claim domain][19] (64–101), [HTTP collapse][20] (37–69), [transaction boundary][21] (50–64), [claim UI][22] (41–54).
- [Admission updates][23] (51–84), [identity/cart][24] (72–97, 126–145), [payment UI][25] (169–209), [payment wrapper][26] (195–222), [resume/retire][27] (44–89), [committed review condition][28] (25–27).
- [Recovery UI][29] (113–130), [recovery HTTP][30] (24–44, 125–139), [typed auth classification][31] (188–208), [auth rendering][32] (84–87), [staff consumer][33] (78–83).
- Inspected, not run: [guest domain tests][34] (34–56), [guest DOM tests][35] (68–78); these inspected tests do not establish differentiated failure explanations or lost-success reconciliation.
- Original rejected/superseded artifacts: `/tmp/sphmrs-commerce-copy-review.md`, `/tmp/sphmrs-commerce-copy-candidates.json`, `/tmp/sphmrs-commerce-copy-review-rubric.md`, `/tmp/sphmrs-commerce-owner-feedback-20261111.md`. Temporary paths are provenance, not durable implementation requirements; substantive findings are captured here.
- Original independent review chats: `01a1c626-08e2-7091-91d1-04929d6b16d5` and `01a1c626-1f7d-70a1-82d6-4b0f05a1816e`; both passed the original candidates and cautioned about shared admission-update refresh guidance, which was held. Their agreement is not acceptance of the rejected content.

### T001 — Tickets and accounts

**Related execution task:** [T010][36] records required gift registration, automatic continuation after proof, existing-account handling and invitation/result recovery. T001 retains allocation, pending-entitlement and event/account policy authority; do not implement a second claim engine.

**Implementation:** (△). **Phase:** T001-A locally accepted with provider-free evidence and fresh dual review; actual self activation, usable display and real acceptance remain pending.
**Owner:** this chat coordinates execution; `claim_contract_tdd` handed back A. Remaining T001 slices are not yet delegated; T002 retains only its separate P1 scope.
**Current slice:** reserve one immutable buyer/event occupancy at settlement using the existing key, without activating it or fabricating a name/account. T010/T003 self-activation/display and real acceptance remain required downstream gates; this is not a finished purchase/admission journey.
**Later owner design direction:** self activation timing must be server-owned and easily swappable between after-purchase and delivery-gated methods; neither is selected. Both must promote this same reserved unit, not allocate again. See T010 for the reviewed design proposal; storage and live activation remain unapproved.
**Dependencies:** local settlement occupancy has no token/NFC prerequisite. T002 identity/token decisions apply to later activation; financial/verification and real acceptance gates in the governing commerce plan remain separately scoped.

**Owner clarifications from this chat, 2026-11-11:**
- Launch has no minted memberships. Accounts and membership tokens are distinct;
  do not require an existing token for the first purchase or create separate
  member/nonmember customer journeys.
- Scope is this event. At confirmed payment, bind the first self entitlement if
  the buyer has none; extra units and subsequent eligible purchases are gifts.
  One account holds one ticket/package for the event. Self plus gifts can be bought
  together; delayed token minting must not defer that allocation decision.
- Gifts are pending entitlements, not invented login accounts. The bearer enters
  login/register and verification, then claims if eligible. The claim secret is not
  a door pass, and membership issuance must not create an extra event allocation.
- Physical NFC can carry one private per-unit activation link. Real activation
  with deferred minting is the primary proposed experience; earlier minting plus
  welcome/reveal remains an alternative. Buyer, delivery recipient and attendee
  must not be confused during personalization.
- Membership is purchase eligibility, not an automatic free/reserved seat. Unlock
  is preferred for serious exploration; wallet/physical NFT goals are explicit but
  not launch dependencies. Finite giveaways remain separately configured scope.

**Next action:** bound T010/T003 continuation and activation of the same reserved unit, without an additional allocation or a false available-gift presentation. Retain [local T001-A evidence][37]; the delivered T002 blueprint still requires owner review before gated activation/provider choices. Replacement of incompatible code is allowed in principle,
not a blanket reset/destructive-operation authorization. Wallet custody, unclaimed
code replacement, token transfer/refund effects and hardware/delivery recovery
remain decisions/proofs—not reasons to reopen the settled rules above.

**Completion evidence:** exact-once paid allocation; one self binding across orders
and concurrent tabs; existing/new recipient claims; physical activation and token
recovery without duplicate grants; guarded regression/coverage, actual device/UI
and provider acceptance as separately approved. Nothing is marked complete here.

#### Purchase/claim overlap — owner item 12B, investigation recorded 2026-11-11

**Historical investigation evidence (before the current T001-A batch):** source and existing tests were inspected, not executed; implementation had not started. Source-predicted outcomes below are not runtime,
PostgreSQL concurrency, provider or production acceptance. The owner clarifications
above govern the intended behavior; the older optional/name-only policy still in
this checkout's commerce plan must be reconciled with the linked worktree amendment.
Do not transplant that worktree's source or create a competing delivery plan.

| Scenario                                                                       | Current source-predicted outcome                                                                                                                 | Required rule / targeted gap                                                                                                                                                                                 |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A buys for B; B buys independently before claiming A's gift                    | Purchase alone does not bind B; the gift claim can succeed if B has no previous same-event claim. Both orders remain paid.                       | B's settled self purchase must occupy the event binding even before activation/minting; reject the additional gift without consuming it. Duplicate paid-unit resolution is not an automatic refund/transfer. |
| B only registers or obtains membership, without an event entitlement           | Verified account can claim. Current purchase eligibility uses canonical email/phone readiness, not an Unlock credential.                         | Keep account, membership and event allocation distinct; membership alone supplies no seat. An otherwise eligible account without a same-event binding can claim.                                             |
| B already claimed their own or another gift admission for the same event       | Another claim is rejected even without check-in or benefit use; the rejected invitation is not consumed.                                         | Preserve one ticket/package per account/event regardless of purchase/gift provenance.                                                                                                                        |
| B claims first, then purchases; or settlement races with claim                 | Purchase does not consult the claim binding; additional available admissions can be created within stock/capacity/allowance.                     | Serialize self allocation and claim against one event/account authority; a bound buyer's purchased units are gifts, never another self unit.                                                                 |
| Multiple gifts for B; two accounts concurrently claim one gift                 | Admission locks and unique event/account key are intended to permit one winner. Dedicated inspected coverage of these races is missing.          | Test both races and concurrent self settlement; losing claims must not consume invitations or partially bind accounts.                                                                                       |
| Different events; distinct purchases versus one replayed attempt               | Claim uniqueness is event-specific; purchase allowance is net three per account/release. Distinct purchases are not deduplicated into one order. | Preserve cross-event isolation and legitimate separate orders; replay one attempt and its allocation exactly once.                                                                                           |
| A has no personally bound admission and buys for others                        | No automatic self allocation or unactivated gift accounts are created; all granted admissions start available.                                   | Bind one self unit for this event at settlement, then pending gifts; never invent contact identities.                                                                                                        |
| Successful claim response is lost; same B retries                              | Consumed token is rejected even for the successful claimant; no same-claimant success recovery exists.                                           | Define safe result recovery without duplicate grants or disclosure to another account.                                                                                                                       |
| Another eligible account holds the named invitation; buyer renames/reissues it | Name is not identity proof. Renaming alone leaves the previous link valid; reissue rotates the single-use token and invalidates the old link.    | Bearer possession is the settled claim rule, not recipient preselection/buyer approval. Replacement/revocation remains an owner policy; rotation does not establish transfer authority.                      |
| Guest checks in before registration; link expires or rotates                   | Name-only check-in and later claim before cutoff are supported; expired/rotated links fail.                                                      | Replace the superseded no-account admission path; keep activation secrets separate from eventual door credentials.                                                                                           |
| Payment/admission held, cancelled or physical unit returned                    | Holds block claims/redemption. Accepted unused returns may clear the event/account key; used attendance retains history and requires review.     | Reconcile selected post-activation return/transfer rules; never silently reset benefits or infer refund authority from overlap.                                                                              |

**Ownership and financial invariants:** gift claim changes the admission's claimed
account, not the order buyer, immutable shipping recipient, payment or fulfillment.
A's purchased gift consumes A's purchase allowance, not B's; B occupies an event
claim slot. Admission, guest package, physical ownership/delivery and canonical
identity must not be treated as interchangeable. Existing physical-return and
payment-review operations are not a duplicate-gift resolution workflow. No account
merging, automatic refunds, transfers or benefit forfeiture is approved by this entry.

**Existing-plan coordination:** use [commerce plan][38]
steps 1–3 for canonical identity, paid allocation, admission/benefit constraints and
authorized corrections; step 4 for purchase/claim/results; step 5 for regressions
and live visual review; step 6 for authoritative registration/verification; step 8
for separately approved authenticated/device/provider acceptance. Deployment stays
the final milestone. Code replacement/revocation, token transfers, post-activation
returns and delivery-delay handling remain policy/proof questions; do not reopen
the already-settled buyer-first, pending-gift or one-binding-per-event rules.

**Source/test anchors — recheck before implementation:**
- [Admission grants, names, invitation rotation, claim and redemption][39] (24–132); [unique event/account binding][40] (6–12).
- [Canonical readiness][41] (115–119); [transaction locks/rollback][42] (6–19, 50–64); [allowance/settlement][43] (42–89); [returns][44] (11–53).
- [Claim UI][45] (10–54). Existing [guest tests][46] cover exact-once grants, token rotation/single use, verification and redemption. The [opt-in Payload journey][47] (351–385) is sequential, not the full overlap/race matrix. Serialized fakes are not PostgreSQL concurrency proof.

**Acceptance addition:** test-first coverage of the matrix, settlement/claim races
and rollback, activation/mint delays, lost success responses, and separate
admission/benefit/payment/fulfillment ownership. Deliberately revise tests that
encode superseded optional/name-only admission rather than weakening unrelated
safeguards. Local implementation, guarded checks, real UI/Santa review and external
acceptance retain their bounded approvals; this documentation establishes no passes.

#### Original capture — retained as provenance, not current policy

The placeholder-account proposal below was superseded by the explicit pending-
entitlement decision. Other tentative wording is not automatically approved copy.

	-  On first-ever purchase, the purchasing account will be bound first - only accounts with a ticket can purchase on behalf of others; it's done automatically for convenience. Tickets purchased as gifts will each have an account generated and bound to it on purchase; these accounts will be in "unactivated" mode, a special state where the email and phone fields are populated with invalid values. Each unactivated, ticket-bound account will have a dedicated qr code (or something similar) generated to make it easy to send in messages.
	- On the matter: Wallet passes will be made. I am considering the feasibility of using Unlock Protocol
		- Unlock Protocol may be able to tie everything together - event passes, Apple/Google Wallet Pass + nfc card/coin

### T009 — Checkout identity and system-managed recovery

**Implementation:** (△). **Phase:** T009-A bounded own-ID read/synchronization locally accepted after candidate-2 deterministic gates, current synthetic desktop/phone-width render, required reviews and fresh dual Santa PASS. Whole T009 is not complete; full account-gate/member/readiness and real auth/provider/device acceptance remain pending. Historical owner item 1 source investigation and recording authorization dated 2026-11-11 are retained below. Broader retention/deadline/retry/persistence decisions remain held.
**Current execution owner:** this chat coordinates the accepted source handback from `claim_contract_tdd`; no writer remains active. Only CommerceIdentityBoundary and focused root tests/preview were changed, per the [reviewed bounded specification][48]. See [candidate history and limitations][5].
**Owner:** ongoing registry custody remains with
`01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`; this investigation chat is
`01a1c66a-c312-79e1-a727-b3b271db7084`.
**Priority:** P1 proposed for account isolation/context recovery; the vague-copy
symptom alone is P2. This is not an owner-approved reprioritization of T002.
**Scope/dependencies:** retain the existing [commerce launch plan][49],
principally checkout/account surfaces (step 4), regression/review (step 5), and
authoritative account/verification dependencies (step 6); external acceptance in
step 8 remains separately approved. T005 owns the shared outcome/action/disclosure
and review-quality contract; T009 owns its checkout identity/auth synchronization
application. T004 owns financial reconciliation/finalization. T003 consumes the
resulting interaction contract. Do not implement competing recovery engines or
treat payment-task approval as identity implementation approval.

**Historical source findings before T009-A — not runtime acceptance:**
- Member auth checks fresh authenticated membership through `/api/member/status`;
  `CommerceIdentityBoundary` separately checks `/api/users/me` and synchronizes
  the ecommerce customer/cart. This is signed-in account checking, not another
  phone/person verification. Both owners refresh on focus/visibility changes.
- The boundary combines transport failure, non-401/403 HTTP rejection, malformed
  responses and thrown identity-synchronization failures into one boolean error.
  A 401/403 or explicit null user instead returns to inline auth; 403 alone does
  not prove expiry. There is no explicit deadline or status-specific 429 handling
  on this account-ID read. Preserve known causes without inventing an offline or
  expired-session diagnosis from genuinely insufficient evidence.
- The retry control only repeats the same read/synchronization. Its existence
  does not establish a customer responsibility or a repair action. Provider startup
  failures do not necessarily enter this error state: the initial boundary check
  depends on an available customer ID, and provider login synchronization can
  return without a user instead of throwing. Investigate these stalls explicitly.
- Same-account checks/reauthentication can preserve mounted checkout inputs.
  An observed account switch remounts private children; provider synchronization
  clears in-memory customer/cart/address state. Reload/remount loses the React
  address draft; switching back has no per-account unsaved-draft restoration.
  Account-keyed payment identifiers in same-tab session storage are distinct
  from the address draft and server financial evidence. Do not promise universal
  input retention or transfer an old account's address/attempt to a new account.

**Task / proposed engineering contract:**
1. Define typed outcomes across membership, current-account reads and provider
   synchronization: confirmed same account; authentication required; changed
   account; retryable transport/server uncertainty; cooldown; nonretryable
   rejection/contract failure. Specify evidence and precedence with T005; no raw
   exception parsing, sensitive disclosure or blanket interpretation of 403.
2. Coordinate automatic checking and same-account restoration across both owners,
   including provider startup/no-user and partial synchronization failures. Use
   explicit deadlines, serialization, stale-response protection, bounded eligible
   retries/backoff and cooldown; focus/rerenders must not reset budgets or multiply
   requests. Bound foreground waiting and expose an honest unresolved state.
3. When no new information, decision or authorization is needed, let the system
   perform the appropriate safe check. Reserve customer action for actual sign-in,
   missing registration/proof or a genuine account decision; a manual status retry
   may be secondary, not a required completion step. No automatic code sending,
   credential action, payment initiation/reopening or account/attempt reassignment.
4. Resolve retention before implementation: preserve same-account mounted context;
   decide whether an original account's draft should be recoverable after switching
   back and what reload/new-tab recovery is required. Choose any persistence only
   after its privacy/lifetime boundary is approved. Never expose one account's
   draft to another, delete financial evidence, or silently resume its payment.
5. After the flow and real actions are settled, adapt canonical English next-intl
   feedback to the typed cases. Copy remains deferred; Korean stays unchanged.

**Remaining whole-task checkpoint beyond bounded A:** review the per-case outcome/actor/action/retention
matrix, decide draft persistence, then approve a local test-first implementation
batch. Cover the complete `CommerceAccountGate` reauthentication journey, same/new
account transitions and return to the original account, focus/visibility races,
stale responses, startup/no-user/partial-sync failures, malformed/null receipts,
401 versus 403, 429, transient outage, hanging requests, budgets and exhaustion.
Assert preserved permitted context, private-state isolation, no automatic codes or
payment launch, and no loss/reassignment of retained financial evidence. Existing
identity tests inspect only mounted-input retention after 401/403 and remount on
account switch; they do not prove full-gate recovery. Run guarded affected tests
and typechecks, then actual desktop/mobile render and a harsh concise Santa review
for implemented UI. Source inspection is not runtime/provider/production acceptance.

**Evidence — inspected, not run; recheck current lines before implementation:**
- [Checkout gate/boundary and draft][50] (18–118);
  [auth focus/status ownership][51]
  (277–307, 529–535); [typed auth client/deadlines][52]
  (269–349); [auth status feedback][53]
  (89–156); [authoritative commerce eligibility][54] (28–37).
- [Account-keyed payment retention][55] (30–56);
  [identity DOM tests][56] (246–267).
  Installed provider implementation inspected at
  `node_modules/@payloadcms/plugin-ecommerce/dist/react/provider/index.js`
  (618–655, 790–800, 867–938, 978–998); dependency source is not a patch target.
- Owner item 1 provenance: `/tmp/sphmrs-commerce-owner-feedback-20261111.md`;
  rejected copy proposal: `/tmp/sphmrs-commerce-copy-review.md` (item 1). Temporary
  artifacts are provenance, not durable implementation requirements. No tests,
  builds, browser/provider calls, account changes or implementation were performed
  in this investigation. Recording this task authorizes none of those follow-ups.

### T002 — Unlock Protocol

**Implementation:** ( ). **Phase:** P1 offline integration blueprint delivered;
owner review and integration/proof choices pending. P2–P7 are not started here.
**Owner:** delegated Codex chat `01a1c66f-b9c6-7cc3-9ab8-5559d6c3eed0`.
The P1 research/design output was delivered on 2026-11-11. This completes the
bounded blueprint scope, not owner approval, SDK integration, minting, pass/device
acceptance or feature implementation. The owner authorized this integration chat
to record this one-time consolidation and notify the maintenance chat; ongoing
To-Do ownership remains with `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`.

- **Approved delegation:** read current source and public documentation; select
  the smallest viable wallet/issuer/event/check-in arrangement and request the
  exact external proof needed. Stop at the P1 review checkpoint.
- **Requirements:** the [consolidated account/token/NFC plan][57]
  and its worktree policy amendment are uncommitted planning artifacts. The saved
  project's current source is newer; do not transplant source or overwrite it.
- **Consolidated review input:** the blueprint now incorporates T001’s eleven-case
  purchase/claim matrix and T003’s typed claim/result and safe same-claimant
  recovery contract. T004 remains the separate financial-recovery authority;
  none of these documentation findings establishes runtime/concurrency acceptance.
- **Delivered output:** [Unlock / identity / NFC integration blueprint][58].
  It contains the single progress/review panel, current-source seams, native-first
  capability comparison, custody/issuer mapping, physical activation versus the
  earlier-mint alternative, G1–G5 decisions and bounded proof requests.
- **Recommendations for review, not settled policy:** test native walletless
  email/pass-first custody before selecting a new wallet provider, subject to its
  lock-scoped addresses, recovery/transfer and privacy limits; use separate membership
  and event credential mappings; keep the commerce ledger as the sole operational
  check-in authority. A general-purpose signable embedded wallet remains a distinct
  choice, not something native email custody already provides.
- **Material qualifications:** current `isActiveMember` means verified account/phone
  readiness, not an NFT gate. Inspected native check-in appends history rather than
  proving atomic single-use rejection. Native pass routes/handlers lack recipient
  proof at the inspected source boundary, so a signed pass is not rightful-holder
  proof. These are source-level integration risks, not demonstrated vulnerabilities
  in today's hosted service. Door identity, payment/return holds and one package
  must remain independently enforced.
- **Next review item:** decide G1 custody, G2 replacement/expiry, G3 transfer/returns,
  G4 single check-in authority/service availability and G5 actual device/delivery
  policy using the blueprint's batched review table. The smallest native feasibility
  probe uses one approved disposable fixture; dual-credential proof is a later,
  separately approved scope. P2 is the provider-free implementation option only
  after its own explicit approval. No silent fallback or automatic phase advance.
- **Boundary:** no dependency installation, credentials, wallets/signing, hosted
  provider/chain/RPC calls, hardware provisioning, runtime, implementation, commit,
  push or deployment approval follows from this handoff. Keep canvas stopped.
- **Acceptance for this phase:** native capabilities versus unproved assumptions,
  custody/account association, duplicate/uncertain issuance and one check-in
  authority are made explicit, with remaining decisions and a bounded proof request.
  Blueprint/source/link review and a tool-free security challenge are recorded;
  no runtime, provider, wallet installation or physical-device result is claimed.
- **Original capture retained:** “Unlock Protocol ()”. Related owner notes about
  wallet passes, event passes and physical NFC remain verbatim under T001.

### T004 — Payment confirmation and recovery

**Implementation:** ( ). **Phase:** T004-A source-backed design locally accepted and session closed; implementation unassigned. **Planning owner:** bounded execution assignment `SPH-T004-A-20261111-01`; this chat retains custody, per the [bounded execution plan][1]. **Priority:** P1 proposed for financial safety. This section retains the
entire recorded engineering brief without rewriting its policies, evidence or copy gates.

**New source-level coordination finding from T005-A review:** the installed
Payload/Drizzle transaction promise can absorb transaction-end errors, and its
rollback API can resolve for an absent session. T005 is testing a claim-only native
boundary; it does not repair financial callers. Before accepting T004 durability/
exact-once guarantees, trace the actual installed commit/rollback completion path
and perform the separately scoped local-DB fault proof. This is an integration
risk discovered in source, not a demonstrated payment incident, live vulnerability
or permission to change dependencies, financial policy or provider configuration.

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

### T006 — Guest-name corrections versus admission reassignment

**Implementation:** ( ). **Phase:** bounded read-only investigation complete;
owner authorized composing the findings into this task and notifying the registry
custodian on 2026-11-11. Recording does not authorize implementation or settle the
remaining correction/transfer policy. **Owner:** implementation unassigned;
registry custody remains with `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`.
**Priority:** P1 proposed for identity/attendance integrity and the missing supported
correction path; custodian/owner review may adjust attention order.
**Investigation:** chat `01a1c66b-355b-75b3-9221-65360860a150`, owner item 8 from
parent `01a1c404-f38f-7d43-8d24-bdcc1f87ef7e`. Source/history and existing tests
were inspected, not executed; no runtime/provider/production acceptance is claimed.

**Objective:** establish why each restriction exists, decide who can correct a
guest's name and under what conditions, then provide the authorized operation.
Do not merely reword the current locks or equate a spelling/name correction with
changing the person entitled to attend.

**Governing scope:** retain the [commerce launch plan][59],
principally step 3 (admission/benefit invariants and authorized corrections), step 4
(customer/operator surfaces), step 5 (regression and visual acceptance), step 6
(authoritative account/verification dependencies) and separately approved step 8
acceptance. T001 owns settled self/gift allocation, bearer-based pending claims and
one binding per account/event; T002 owns token/wallet integration choices; T003 owns
the resulting usable surfaces; T005 owns shared typed outcome/action contracts.
Do not duplicate their implementations or reopen settled rules. The plan's older
optional/name-only admission path is superseded by the owner direction recorded in
T001; the current-source descriptions below are not a proposal to retain that path.
Deployment remains the final milestone, not an automatic next phase.

**Decision provenance — fact versus uncertainty:** the current plan records buyer
editing ending at claim/check-in and assigns later corrections to superadmins.
Git history traces this rule, its implementation and its lock tests to the same
commit, `b7f42d9`; the preceding plan at `18b54f1` left invitation/transfer conditions
unresolved. The QA checklist repeats the rule but supplies no separate rationale.
This establishes a recorded implementation contract, not primary owner wording
requiring a blanket ban on ordinary corrections. No independent original rationale
was established in this investigation. Item 8 explicitly reopens the restriction;
passing tests or previous review agreement does not settle product policy.

**Current behavior and distinctions to resolve:**

| Case                                        | Source-predicted behavior                                                       | Required distinction                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Available, unclaimed, unheld admission      | Buyer can repeatedly save a valid name.                                         | Distinguish initial assignment/correction from replacing the intended attendee.                                              |
| Claimed                                     | UI locks editing; domain rejects the normal claimed status.                     | Protect the claimant from unilateral buyer changes without assuming every correction is forbidden.                           |
| Checked-in                                  | Name editing is blocked, including today's unregistered path.                   | Preserve who attended and consumed benefits; an audited correction must not erase that history.                              |
| Revoked                                     | Name editing is blocked.                                                        | Historical correction is separate from reinstating admission or benefits; no automatic reactivation.                         |
| Review hold or accepted return              | Shared guards block names as well as entitlement operations.                    | Preserve payment/review evidence; decide whether narrowly authorized metadata correction can occur without releasing a hold. |
| Claim cutoff passed                         | Cutoff blocks invitation issuance/claim, not an otherwise eligible name update. | Do not invent or describe a name-correction deadline; decide any transfer deadline separately.                               |
| Buyer, claimant, staff or unrelated account | Naming operation is buyer-only; no claimant/staff correction operation exists.  | Retain authentication/ownership boundaries; explicitly decide additional correction authority.                               |

The domain also requires a valid succeeded, unheld order payment. The buyer UI
additionally checks the claimed-account flag; the name domain guard relies on
status for the normal claimed state. Keep actor/state authorization authoritative
on the server rather than relying on disabled controls or assumed state consistency.

**Correction is not transfer:** a correction should preserve admission ID, buyer,
claimed account, event/account uniqueness, payment, fulfillment, check-in and
redemption history. Changing the attendee/account entitlement is a distinct
operation requiring its own policy for consent, deadlines, duplicate allocations
and consumed benefits. A label-only database write can nevertheless act as a door
transfer if staff accept the new name as authority to admit a different person.
The current check-in operation does not itself compare identity documents or match
the label against the claimed account; no legal-name/ID-check policy is established
by that code. Do not infer same-person identity from spelling similarity.

Renaming an available admission leaves its previously issued invitation valid;
explicit reissue rotates that bearer. Claiming binds the authenticated account
without matching the account name to the entered guest name. These are facts of
the current bearer/account model, not authorization to replace a claimant or to
add recipient preselection/buyer approval to T001's settled bearer-based claim.
Coordinate outstanding-link treatment with T001's replacement/revocation decision.

**Confirmed functional gap:** the plan promises later superadmin corrections, but
the inspected operation schema has no staff name-correction action, admission
operator controls expose only check-in/redemption, and ordinary ledger updates
are denied even to superadmins. The buyer-only naming function is not a staff
fallback. A support instruction therefore lacks a supported application correction
path; better wording alone cannot close this gap.

**Owner decisions required before implementation:**
1. Define the admission name's purpose and what actually proves identity at entry.
2. Decide correction authority after claim/check-in: buyer, claimant and/or audited
   superadmin. Recommended starting point, not approved policy: protect the
   claimant from unilateral buyer changes and supply a supported audited correction.
3. Decide attendee replacement separately: permitted states, consent, deadlines,
   outstanding invitations and treatment after attendance/perk use. Do not invent
   refund, transfer, hold-release or benefit-reset policy.
4. Reconcile the separate registration/confirmation investigation with these states;
   do not preserve optional-registration behavior merely because tests encode it.

**Next bounded batch / acceptance:** produce the actor-by-state correction versus
reassignment matrix for owner review, then scope the authorized domain, endpoint
and customer/operator changes. Preserve transaction/admission locking; separate
the lock mechanism from eligibility rules rather than removing protection broadly.
Provide appropriate correction audit evidence without clearing payment/return
holds or resetting attendance/redemptions. Coordinate typed allowed/blocked reasons
and lost-success handling with T005; publish only explanations and actions actually
supported by the settled contract.

Test-first coverage must include available/claimed/checked-in/revoked/review/return
states; buyer/claimant/superadmin/foreign actors; cutoff boundaries; issued/rotated
invitations; inconsistent claimed flag/status; concurrent correction versus claim,
check-in and payment hold; rollback and lost responses. Assert unchanged account
binding, financial/fulfillment ownership, event uniqueness and consumed-benefit
history for corrections. Existing inspected tests enforce the claimed lock but do
not establish this matrix or a supported correction workflow. Implemented UI needs
guarded regressions/typechecks, actual desktop/mobile browser inspection and a
concise harsh Santa review. No new dependency, access grant, provider action,
readiness/deployment phase or live account mutation is approved by this task entry.

**Evidence — verify current ownership/lines before implementation:**
- [Buyer locks/actions][60] (51–79);
  [assignment, claims and check-in][61] (14–21, 46–109).
- [Shared settlement/review guards][62] (4–20);
  [transaction locks][63] (6–19, 50–64);
  [returns][64] (23–39) and
  [benefit review][65] (8–26).
- [Operation schema][66] (23–31, 53–69);
  [operator controls][67] (8–22);
  [ledger access][68] (8–14).
- [Plan policy][69] (74–86, 129–137);
  [historical QA checklist][70] (295–303).
- Inspected, not run: [domain lock test][71] (34–46),
  [UI lock test][72] (59–65), and
  [real-Payload sequential journey][73]
  (351–385). These are not proof of correction/transfer policy or current runtime acceptance.

### T007 — Account recovery: bound-phone proof and concierge follow-up

**Implementation:** ( ). **Phase:** bounded source investigation and owner policy
clarification complete; proposed engineering/operational work is not implemented
or separately approved. Recording this task and the two chat handoffs is approved.
**Owner:** implementation unassigned. Investigation/provenance:
[account-recovery chat][74].
[To-Do maintenance][75]
retains registry ownership. [Korean copy calibration — content first][76]
owns wording; the owner-approved receipt was handed there verbatim on 2026-11-11.
**Priority:** P1 proposed for identity/account-access risk, not an owner-approved
reordering of the current Unlock/integration work.
**Governing scope/dependencies:** preserve the existing
[commerce launch plan][77], canonical Better Auth
identity, account history and current authorization. Coordinate identity policy
with step 6 and real customer/operator acceptance with step 8; deployment remains
the final milestone. T001/T002 depend on preserved account identity; recovery is
not permission to transfer wallets, tokens, admissions or benefits. T005 owns
recovery-intake error classification; coordinate rather than duplicate that fix.

**Current behavior — verified from source, not live operation:** local durable
intake stores unverified phone/contact-email claims and returns a generic receipt.
Only trusted CMS superadmins can read/review; ordinary staff and generic CRUD do
not gain authority. Review changes metadata with a revision/audit trail only.
There is no recovery correspondence, ownership-proof decision or account-access
grant in this flow. The existing sign-in mailer handles OTP/magic-link messages,
not a recovery case service. Phone identification is an account-selection
constraint, not authentication; enrollment requires an already authenticated,
email-verified principal. Do not substitute either for recovery authorization.

**Owner decisions — preserve, do not reopen as defaults:**
- `concierge@sophomores.co` is the correspondence account; any staff member with
  access can handle the case. This operational choice does not automatically
  grant CMS superadmin or identity-changing permissions.
- Fresh proof of control of the phone number already bound to the account is
  the recovery proof. Do not impose an additional identity-document/manual
  evidence process by default. A typed number, a match or contact-inbox possession
  alone is not phone proof.
- Restore access to the SAME existing account. Do not create a replacement account,
  merge identities or change its email as an implied part of recovery. An email
  change requires a separate explicit request and its own verification.
- Email follow-up is the intended path, not evidence of an implemented service.
  The contact address is initially correspondence only, not a replacement login.
- The accepted receipt explains that we will review and follow up by email.
  Verification instructions belong in that email, not redundantly in the receipt.
  Preserve the exact accepted Korean sentence under the calibration chat's
  ownership; do not polish it here or add an ornamental heading. No runtime
  catalogue/publication approval follows from accepting the wording.

**Proposed implementation flow — for scoped engineering review, not completed work:**
1. Durable intake enters an operator-visible queue. A staff member picks up the
   case and coordinates from concierge; retain clear case ownership/audit and
   address concurrent staff handling without silently broadening access roles.
2. Send a neutral, case-scoped secure continuation link to the supplied contact
   address. It authorizes continuation of that case only, not account access or
   disclosure. Keep registered email, profile, purchases and membership private
   before sufficient proof; never request passwords or sign-in codes by email.
3. Verify the phone already bound to the canonical account using a fresh,
   recovery-specific, session/case-bound challenge and trusted verification
   evidence. Do not reuse anonymous enrollment as an account recovery grant or
   rebind a newly submitted phone. Verify against authoritative binding at grant.
4. Consume a single-use, expiring recovery authorization and establish access to
   that same account with audited, atomic/idempotent effects. Once valid phone
   proof succeeds, a second discretionary staff approval is not proposed. Define
   recovery/session scope, invalidation and handling of conflicting or stale
   bindings before implementation; never make a metadata status grant access.
5. Failed/expired proof, expired case, absent/changed binding or conflicting
   identity leaves account/email unchanged. Reconcile lost success responses
   safely rather than replaying grants blindly. A customer who also lost control
   of the bound phone has no defined exception recovery policy yet; do not invent
   an alternative-account workaround, extra proof route or recovery guarantee.

**Email, queue and privacy work required:** persist case-linked send intent and
attempt/result records, deduplicate concurrent/retried sends, and distinguish
queued, provider-accepted, uncertain, bounced/failed and customer-response states.
Provider acceptance is not inbox delivery. Use bounded retry/backoff and visible
operator escalation; a send timeout is not proof of no send. No account change
follows from a bounce, unanswered email or exhausted retry budget. Define queue
responsibility, response/no-response/escalation commitments and safe continuation
expiry without inventing an SLA. Current intake retention is fixed at 30 days;
its cleanup is bounded/on-intake or explicit local operation, not a scheduler.
Approve compatible correspondence/evidence retention, redaction and cleanup
rather than silently retaining material elsewhere. Reuse installed mail/database
infrastructure where suitable; no new dependency, provider or service is assumed.

**Smallest useful acceptance before implementation completion:** test-first
contract/domain/endpoint/UI coverage for proof bound to the correct existing
account; wrong phone/account, forged/expired/replayed proof, changed binding,
concurrent case/grant attempts and lost success responses; once-only access grant
with unchanged email/account ID/purchases/membership; staff/CMS privilege separation;
link expiry and sensitive-data non-disclosure; send deduplication, ambiguous
provider acceptance, bounce, bounded retries and operator escalation; unanswered
case expiry/retention; and received rejection versus unknown intake outcome in
coordination with T005. Inspect real desktop/mobile renders and pass a concise
harsh Santa review for implemented UI. Synthetic checks are not real staff-session,
carrier, mailbox/provider or production acceptance; those retain separate approval.

**Next checkpoint / boundaries:** review a bounded design/implementation batch for
case correspondence, recovery-specific bound-phone verification and a one-time
same-account grant. Keep the receipt wording with its copy owner. No implementation,
email/provider/database operation, migration, credentials/access grant, dependency,
build/server, commit/push, publication, readiness or deployment phase is authorized
by this recording task. Earlier extra-evidence and automatic email-replacement
alternatives are superseded by the owner's decisions above.

**Evidence — recheck current sources before implementation; inspected, not run:**
- [Recovery view][78]
  (77–138, 141–183); [contracts][79]
  (3–32); [service][80] (19–78);
  [HTTP][81] (99–160).
- [Repository][82] (32–113),
  [local runtime][83] (6–38),
  [CMS review][84] (19–76),
  [collection ACL][85]
  (5–23), [immutable intake migration][86]
  (10–52). Its unverified immutable claims must not be casually repurposed as proof.
- [Phone identifier][87] (42–43, 140–155),
  [enrollment service][88] (35–56),
  [phone verifier][89] (63–118, 174–192),
  [canonical bindings][90] (108–124),
  [mail boundary][91] (9–12, 148–184).
- [Owning local runbook][92]
  (840–903); existing test owners are `tests/member-auth/recovery/` and
  `tests/member-auth/account-recovery-ui-dom.test.tsx` (no tests run in this investigation).

### T010 — Required gift registration and resumable claim completion

**Implementation:** ( ). **Phase:** bounded server-owned continuation proposal independently reviewed; detailed owner/lifecycle/transport review remains pending, not implementation or storage approval. Owner requested recording the full task on 2026-11-11. **Owner:** implementation unassigned;
ongoing registry custody remains with the dedicated maintenance chat.
**Priority:** P1 proposed for identity/binding and recoverable invitation completion,
not permission to start implementation or displace the owner's T002 focus.

**Owner direction and outcome:** registration is required to claim a gift. Keep
the instruction plain: “To claim your gift, register.” Do not present registration
as optional or require an opaque extra “confirm below” step. Existing registered
people sign in or continue; they must not register again. Record the following as
the intended coordinated flow to scope, not an approved storage architecture or
new provider authorization. T001's later owner clarifications already supersede
fake/unactivated login accounts and no-account admission; do not reopen those
settled rules because the older commerce-plan wording/source still differs.

**Owner design direction, 2026-11-11:** develop server-owned intent state with a protected opaque browser handle; lifetime, retention, transport/cookie rules, tab/device/multiple-invitation behavior and implementation remain review gates. Self activation must be easily swappable between after-purchase and physical-delivery-gated policies; neither timing is selected. Both promote the same T001 reserved unit. See the [bounded continuation proposal][93].

**Current local allocation note:** T001-A now reserves buyer/event self occupancy before activation; it does not set claimedAccount or implement activation/display. The baseline mechanism notes below predate that local slice and are retained as investigation provenance, not its current allocation status.

**Historical mechanism and why each boundary exists — source-inspected at investigation, not live acceptance:**
- Verified settlement automatically grants buyer-associated admissions per paid
  unit; it does not create guest accounts, bind the first self admission or claim
  gifts. T001 owns correction of paid allocation; gift claims do not change the
  order buyer, shipping recipient, payment or physical fulfillment ownership.
- Buyer naming, invitation issuance and sharing are currently separate actions.
  Issuance stores a token digest; reissuance rotates the link. These controls exist,
  but their current click sequence is not independently established as necessary.
- Opening the invitation extracts and strips its fragment bearer. The raw token
  and successful-claim flag survive only in mounted component memory. Refresh or
  remount loses unfinished invitation context and the local success state.
- Account entry classifies a submitted email before an explicit code request.
  Sending code requires a separate button press; neither typing nor lookup may
  send it. Code completion triggers verification; verified OTP creates the
  canonical account if new or signs into the existing account. Email proof is
  required, but lookup alone is neither registration nor authentication.
- Phone challenge status is monitored automatically while active. A verified
  challenge does not currently bind the account: “Finish registration” invokes
  the server proof-consumption/binding operation, then fresh member status is
  fetched automatically. Binding is necessary; its separate click is current UI
  behavior, not a technical necessity demonstrated by the governing plan.
- The gate skips setup for an already signed-in fully verified account and asks
  incomplete accounts only for remaining setup. Invitation introductory wording
  is nevertheless unconditional and can misleadingly ask existing members to
  register. Here `member` currently means canonical email/phone readiness, not
  proof of an NFT or an event allocation; preserve T001/T002's distinctions.
- A second claim click currently invokes a separate commerce transaction. It
  checks paid/held admission, bearer validity/expiry, canonical verified account
  and the one-account/event constraint, then binds the admission and consumes
  the token atomically. That operation is essential; an additional confirmation
  click does not follow from the need for a transaction. Current tests encode
  explicit claiming, so revise them deliberately rather than silently bypassing
  their other safeguards.
- Gift bearer possession, not a buyer-entered name match, is the current and
  T001-recorded claim rule. Never imply email/phone proof identifies the named
  recipient. Preserve intended account selection through continuation.
- Google/magic-link choices are disabled on this page to keep auth inline. The
  existing callback policy returns to account continuation or ticket checkout,
  not this invitation. Re-enabling redirects alone cannot restore its context;
  email-code-only auth and instructions to avoid refresh are implementation
  workarounds, not a settled gift UX requirement.
- A lost success response leaves a consumed token with no same-claimant success
  recovery in this UI/API. Retrying is not currently an idempotent success read.
  Use T001's overlap matrix and T005's typed-outcome contract, not another grant
  or a generic “already claimed” explanation for the successful claimant.

**Implementation work to scope — one intentional journey:**
1. Validate and retain private invitation context without consuming a gift on
   open/GET, link preview, scan or refresh. Design a reviewed resumable mechanism
   across auth redirects, reload/remount and session expiry. No particular cookie,
   server-intent or browser-storage design is approved by this task; protect raw
   bearers from logs, analytics, redirect URLs and inappropriate persistence.
2. Capture clear claim intent before consequential completion. New users register;
   existing signed-out users sign in; signed-in verified users can claim directly
   with the intended account apparent. Request only missing proof/setup. Never
   create a duplicate account, require registration again or claim merely because
   a link was visited. Account changes require renewed account selection/intent.
3. After the requested registration proof succeeds, automatically perform account
   binding, confirm authoritative status and execute the same intended claim.
   Remove redundant post-registration confirmation; do not presume either the
   current registration-finish click or the later claim click must remain.
   Automatic proof monitoring is not evidence that these writes already happen:
   preserve their independent server checks, transaction boundaries and failures.
   Existing-account direct claiming still needs clear intent, not another signup.
4. Recover the exact invitation/claim/result after interruption or lost responses.
   Reconcile a successful same-account claim without consuming another gift or
   leaking another claimant's identity. Serialize concurrent attempts and use the
   shared T001 event/account allocation authority, including self-purchase races.
   Preserve holds, cutoff, authorization, rate limits and token single-use rules.
5. Render truthful progress and differentiated outcomes via T005. Show gift success
   only after authoritative claim completion, not email proof, phone proof or
   registration alone. Restore confirmed success after reload and provide the
   meaningful next step tracked by T003; no isolated copy patch conceals missing
   behavior. Keep approved first-party English copy in next-intl and Korean intact.

**Dependencies / existing-plan placement:** T001 owns allocation/overlap policy;
T002 owns selected Unlock/physical activation/credential boundaries; T003 owns
usable purchase/activation/result surfaces; T005 owns known-versus-unknown outcome
classification and safe actions. Reuse their authorities and evidence rather than
duplicate recovery implementations. Coordinate the governing [commerce launch
plan](reference/commerce-launch-plan.md) steps 1–3 (identity/allocation/claims),
4 (surfaces), 5 (regressions/live review), 6 (authoritative verification/public
policy) and separately approved step 8 acceptance. Coordinate its older optional
admission wording with the T001-linked policy amendment; deployment stays final.

**Acceptance / fragile final pass:** test-first cases for new, existing signed-out,
incomplete and already verified accounts; no automatic code sending; automatic
proof recognition and once-only binding/claim continuation; no claim on GET or
without intent; account switching/session expiry; refresh/remount, callback success
and cancellation; expired/rotated/consumed/held invitations; same-account lost
success recovery versus another claimant; concurrent claims/self settlement and
rollback; and zero bearer/private-data leakage. Prove no false gift success from
registration alone, no duplicate event binding, no repeated registration and no
navigation instructions compensating for broken retention. Run affected guarded
checks; inspect actual desktop/mobile render and pass a harsh concise Santa review
before UI completion. Provider, device, PostgreSQL concurrency and public-service
acceptance must be identified separately, not inferred from source or fakes.

**Evidence — recheck source/lines before implementation:**
- [Settlement hook][94] (125–133); [admission/claim domain][95] (24–101); [transaction boundary][96] (50–64); [paid/benefit holds][97] (4–20).
- [Invitation and claim UI][98] (10–54); [buyer invitation issuance][99] (51–68); [account gate][100] (18–39).
- [Email classification/request][101] (329–360, 521–526); [account status lifecycle][102] (277–307); [manual phone bind][103] (119–130); [post-bind status][104] (280–289).
- [Phone status monitoring][105] (102–170); [canonical member definition][106] (58–66); [auth options][107] (76–91, 224–235); [client redirects][108] (411–433); [callback policy][109] (28–41, 75–80). Installed Better Auth 1.7.12 OTP account creation was inspected in `node_modules/better-auth/dist/plugins/email-otp/routes.mjs` (407–446); recheck installed source rather than treating that path as stable API.
- Inspected, not run: [guest DOM tests][110] (68–78), [fragment-only source tests][111] (18–28), [guest domain tests][112] (34–56, 75–86). These establish retained test expectations, not fresh acceptance.
- Investigation chat: `01a1c66b-3a38-7572-b75e-fdb29a8f537a`; owner items 10/11 in `/tmp/sphmrs-commerce-owner-feedback-20261111.md`. Superseded copy proposals are provenance only; substantive findings are retained above.

**Execution boundary:** recording this task and notifying its custodian are
authorized; implementation remains unstarted. No source/catalogue/Korean edits,
dependencies, credentials, provider calls, new storage/service, wallet/minting,
refund/transfer/account-merge policy, deployment/readiness work, commit or push is
authorized. Public verification policy remains a separate gate. Keep this task
within the existing plan; do not rebuild locally accepted unrelated work.

### T003 — UI for purchase

**Registration/continuation dependency:** [T010][113] owns the required-register/existing-sign-in journey, elimination of redundant confirmation and resumable private invitation/result handling. In the existing “explicit-claim” direction below, explicit means informed claim intent, not a mandatory additional post-registration click. T001/T005 retain shared binding/outcome authorities.

**Implementation:** ( ). **Phase:** interaction direction recorded; implementation
unassigned. **Priority:** P2 proposed, downstream of T001 allocation/claim and T004
recovery contracts. Its proposed cinematic activation experience also depends on
T002's selected token flow; this does not authorize styling/copy/provider work.

**Current interpretation:** show the enforced self/gift outcome clearly, not a
choice that contradicts one ticket per account. Keep account entry inline, physical
product/totals truthful and payment uncertainty system-managed. New English UI
copy remains next-intl-owned; Korean is untouched. Real browser and harsh Santa
review are required before UI completion, not satisfied by these planning notes.

**Purchase/claim investigation additions, 2026-11-11:** derive self/others rows
from fresh event-specific entitlement ownership, not registration, phone readiness
or token-mint status. Existing/new recipient activation stays one coordinated
login/register/verify/explicit-claim flow. Apply T001's overlap matrix rather than
assuming today's current purchase code already binds the buyer.

**Claim/result contract to design:** expose typed known outcomes (already bound
for this event, consumed/rotated/expired invitation, held entitlement) separately
from genuinely unknown network outcomes; support safe same-claimant recovery and a
meaningful success next step. Do not promise refunds/transfers or hide unresolved
activation/replacement policy behind copy. Coordinate registration, confirmation
and invitation-retention changes with their separate owner investigations; this
entry does not approve an isolated copy or runtime patch.

#### Original capture — retained

	- The purchase screen - if the account purchasing does not have a ticket bound, then maybe we could show two lines of purchase items - e.g., For this account —1, and For others — 1  - along with a popover or small line of info on “You must have a ticket to purchase for others” or something like that.

### T011 — Korean UX copy finalization

**Registry intake:** KOCOPY-20261111 → T011; original intake title: “Incoming task — Korean UX copy finalization (KOCOPY-20261111)”. Stable ID assigned by the custodian; no new delegation or implementation approval.
**Custodian assessment:** the six linked editorial artifacts exist. The run checkpoint and final coverage report now record the final editorial dual PASS, scoped security PASS and deterministic document checks. These are source-reported draft/editorial results, not final Korean owner approval, implemented source fixes or live acceptance.
**Coordination proposal — owner review:** retain one cross-journey copy task. Route overlapping system fixes to their existing T001/T003/T004/T005/T006/T007/T009/T010 owners rather than create parallel implementations or merge their scopes. Preserve all F01–F59 captures and acceptance gates below; catalogue changes and unresolved policy remain held.

<!-- Contribution: Codex (KOCOPY-20261111; bounded Korean editorial loop) 2026-11-11 04:55:00 KST -->
#### Original incoming capture — KOCOPY-20261111

**Implementation:** ( ). **Phase:** end-to-end editorial/state review complete;
final Korean copy, source fixes and live acceptance remain pending.
**Owner/delegation:** copy calibration chat; registry ID/priority assignment is
for the To-Do custodian. **Priority:** P1 risk triage proposed for money/identity/
false-action items; final wording is downstream. This is ONE intake task, not
duplicate implementations of T001/T004/T005/T006/T007/T010.

**Evidence:** [run/checkpoint][114],
[account/proof][115],
[settings/navigation][116],
[offer/delivery][117],
[payment/orders/claim][118],
[coverage and complete findings index][119].

**Work to resolve, including failures/borderline items retained after repair:**
- [ ] F01–F12: confirm provisional-account semantics, phone/helper visibility,
  active locale propagation, receiver recovery and bound-phone conflict path;
  preserve repaired shared-state/event, task-control and refresh/help distinctions.
- [ ] F13–F20: distinguish locale persistence from selection; resolve handle/
  email-change recourse, authoritative phone proof, passkey lookup/result/safety
  states and other-session revocation before successful/empty-state claims.
- [ ] F21–F26: repair real navigation/sign-out actions and notification destination;
  verify reading persistence, unknown-only branches and empty/WebGL referents.
- [ ] F27–F33: align purchase/entitlement policy; expose safe fresh cart state and
  incompatible-cart resolution; clarify manual postcode/structured field errors;
  defer guest-registration/perk and seller/legal claims to their actual owners.
- [ ] F34–F48: coordinate same-attempt payment recovery, retirement terminology,
  operator/fulfillment routes, entitlement/claim eligibility, typed known-vs-
  unknown results, private-token retention and the reachable legacy callback.
- [ ] F49–F52: retain the repaired refresh-versus-leave case, generic-read retry,
  bearer-risk precision and original-link-first recovery; recheck T010/T005 drift.
- [ ] F53–F56: resolve publicly mounted unwired AuthCards, local-only saves,
  metadata/media-error timing and generic-copy consumers without selectable text.
- [ ] F57–F59: revalidate final source/English drift; obtain owner Korean review,
  explicit runtime scope and real browser/device/provider acceptance where needed;
  preserve repaired artifact/read-evidence checks rather than hiding their failures.

**Acceptance:** preserve exact owner-approved references; complete necessary
content and real next actions before tone/economy; use task-critical Korean
controls without bulk translating names/content. Two independent semantic
reviews are not owner/live acceptance. Keep confirmed/unknown/failed and proof/
membership/admission/fulfillment distinct. Do not implement held policies through
copy, promise contact/delivery/refunds or overwrite owner English/Korean work.

**Next action:** custodian triages this linked finding set against existing
owners, then routes bounded source/interaction and final-copy acceptance slices.
No provider, dependency, credential, deployment or publication permission is
created by this record. Runtime catalogues and UI were not edited by this loop.


### T012 — English interface copy: deferred states and acceptance gaps

<!-- Contribution: Codex (ENCOPY-20261111; owner-authorized bounded English copy loop) 2026-11-11 05:12:49 KST -->
**Registry intake:** ENCOPY-20261111. One consolidated follow-through item from the
owner-requested English copy loops; preserve the existing implementation owners
below rather than create parallel system fixes or merge their task scopes.

**Implementation:** ( ). **Phase:** source audit complete; unresolved contracts,
case-specific final copy and full functional/live acceptance remain pending.
**Owner/delegation:** unassigned; To-Do custodian validates routing/priority.
**Priority:** P1 risk triage proposed for money, identity and misleading authority;
not owner approval of every ranking or permission for a new execution phase.
**Evidence:** [coverage, pass commits and complete findings][120]
and [per-key ledger, source evidence, reviews and receipts][121].

#### Scope and evidence boundary

All 1,198 starting English keys were read/classified against source owners; four
new staff-reason keys were reviewed separately. The loop retained 86 keys with
state/content/acceptance gaps and three safe candidates for concurrent-owner
coordination. It also records corrected and almost-failed cases rather than
silently dropping them. Safe copy-only changes are committed separately; this
item does not reopen those word choices or mark the affected whole screens done.
Source review and synthetic desktop/mobile component renders are not real
sign-in, phone proof, payment/provider, physical-device or production acceptance.
Korean and its owner-activated fallback boundary remain unchanged.

#### Consolidated routing — one item, existing system owners retained

| Scope / ledger IDs                                                    | Finding and required next evidence                                                                                                                                                                                                                                                                                                            | Existing owner / dependency                                                        |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Account entry and verification: AUTH-01/02/05, FRONT-01               | Separate known rejection, genuinely unknown receipt/result and unavailable service. Establish retained same-account context and whether the next recovery step belongs to the system or reader before writing an instruction. Do not make users “check” an account without a supported action.                                                | T005, T009; coordinate T007 where access recovery overlaps.                        |
| Gifts, invitations and guest changes: AUTH-07, FRONT-02/03/04         | Implement the owner-required registration/claim progression and purchase/claim overlap rules; remove redundant confirmation only under that contract. Render authorized expired/already-claimed/account-bound cases distinctly, recover same-account success after receipt loss, and separate name correction from admission transfer.        | T001, T003, T005, T006, T010; do not duplicate their implementations.              |
| Payment and operator outcomes: FRONT-05/06, SD-F03, SD-A03            | Keep current and reachable legacy result routes under the same financial authority. Known auth/origin/rate-limit rejection is not unknown receipt. Preserve the same attempt/exact operation replay; do not auto-launch or duplicate a payment. Historical schema/provider labels are not current checkout approval.                          | T004, T005, T009 and the existing commerce launch plan.                            |
| Recovery intake and review save: AUTH-03, SD-F02                      | Intake is not restored access. Complete the intended correspondence/bound-phone/account-grant contract. A metadata review may commit before its receipt is lost: characterize persisted revision/audit reload versus known rejection, without granting access or sending correspondence from copy work.                                       | T007, T005; existing recovery authority retained.                                  |
| Registration disclosures and account claims: AUTH-04, FRONT-07        | Connect actual consent/disclosures and verify their real purposes. A stored phone or a populated field is not MMS verification, identity or age proof. Do not infer event communication permission from a label.                                                                                                                              | T001, T005, T010; privacy/communication policy remains owner-controlled.           |
| Settings truthfulness: FRONT-08/09                                    | Separate passkey loading/error/empty states; inspect delete/revoke response envelopes before success. Verify capability/method availability. Define actual language/theme persistence and scope. Existing fixed-theme, biometric/one-tap, magic-link and communication claims remain held; changing a static description did not accept them. | T005 classification principle; separately bound the settings behavior/policy work. |
| Staff sign-in and disabled delivery: SD-F01/05                        | Split known send/verify rejection from lost transport/session receipt. A missing configured mailer is not evidence of a brief outage or a promised repair time; establish a real next event/action.                                                                                                                                           | T005; coordinate T007/T009 for identity continuity.                                |
| Mounted tour and reading-state durability: FRONT-13/14                | The tour is mounted but its current targets are missing. Essay bookmark/highlight writes are local React state despite loaded server data. Bind actual targets or retire the tour; define persistence or an explicit temporary-state contract without pretending the local controls are inert.                                                | No existing implementation task identified; new bounded scope needed after triage. |
| Studies, dormant shell and entry naming: AUTH-06, FRONT-10/11         | Do not treat simulated/no-callback auth cards, unused AccountPanel destinations/sign-out or unimported ticket selection as working journeys. Resolve the active Check In/account-entry destination and terminology without confusing event admission with sign-in. Do not reactivate dormant code to make its copy seem valid.                | T001/T003 where active entry overlaps; retain study/dormant ownership boundaries.  |
| Concurrent authoring and touch explanation: AUTH-08; loop near misses | Coordinate AuthPhase.emailHelp/resendIn/failures.network with their current copy owner rather than overwrite accepted work. The improved locked-handle reason remains native title/screen-reader text; touch discoverability is not resolved by that wording.                                                                                 | Existing copy owner; independently scope any interaction change.                   |

#### Smallest useful acceptance and fragile final pass

1. For every affected state, specify the reader’s objective, confirmed/unknown
   result, next actor and concrete supported action before tone or brevity.
   Preserve known authorized causes and privacy boundaries; do not hide absent
   classification behind generic uncertainty or a list of guesses.
2. Route system fixes through the existing tasks above. Characterize normal,
   waiting, empty, failure, completion and lost-receipt recovery states; retain
   same-account/same-attempt context and the full purchase/claim overlap matrix.
   A visible button alone does not prove the user should trigger a system step.
3. After mechanisms/policy are settled, update only the canonical English values,
   preserve owner-accepted wording and Korean bytes, then run focused regression
   checks and two fresh independent Santa reviewers. Inspect the actual render;
   independently verify the intended viewport and state immediately before each
   capture. Synthetic/provider/source evidence must remain explicitly distinct.
4. Full-project typechecking is still blocked by eight diagnostics in the two
   concurrently owned claim-native test files. The copy candidate’s scoped check
   excludes only those files and passes; do not report the full project green.
   Six existing dependency advisories (four high) remain separate, not permission
   for dependency changes or release/readiness/deployment work.
5. Keep all 30 source issue groups, corrected cases and tooling/near-failure
   evidence in the linked ledger. Close this item only when its held states have
   real contracts, appropriate tests and scoped live acceptance, not because the
   source audit or copy-only commits are complete.


## Split/merge and orchestration proposals — owner review

- Keep T001/T002/T003 linked as one delivery workstream, not duplicate implementations.
  The existing plan already separates allocation, pending claims, Unlock proof,
  NFC provisioning and UI slices; keep parent task identities intact.
- If finer task tracking is useful, split T001 into allocation/binding and gift
  activation/claim, and split T003 into checkout clarity and the physical welcome.
  These are registry proposals, not new independent execution approvals.
- Keep T004 cross-cutting and distinct. It affects settlement, inventory, fulfillment,
  account/session and UI behavior; do not absorb it into a button/copy subtask.
- Keep T005 as the cross-cutting known-outcome/action/disclosure and review-quality
  task. T001 owns allocation/claim policy, T003 the usable surfaces, and T004 all
  financial classification/reconciliation implementation. Share the case matrix
  and acceptance evidence rather than implement the same recovery logic twice.
  A later split of T005 into contract/classification and case/UI/review slices is
  a proposal only; preserve its review-failure provenance and parent ID.
- Propose additional provider/model delegation only after checking availability,
  cost/safety boundaries and owner approval. Only the named new Codex chat above
  is currently delegated by this maintenance pass.
- No ADR directory or ADR file is initialized here. Use the ADR skill's explicit
  initialization/write approval gates for significant agreed architecture decisions;
  ordinary formatting and this delegation registry do not justify a new ADR system.

## Completed tasks

None recorded as implementation-complete in this list. Preserve evidence and
remaining acceptance gates when moving a future task here.

[1]:	reference/backlog-execution-plan.md
[2]:	qa/t005-claim-contract-20261111.receipts.json
[3]:	qa/t001-allocation-20261111.receipts.json
[4]:	qa/t010-continuation-design-20261111.receipts.json
[5]:	qa/t009-identity-20261111.receipts.json
[6]:	#t005--known-outcomes-error-clarity-and-review-correction
[7]:	#t001--tickets-and-accounts
[8]:	#t009--checkout-identity-and-system-managed-recovery
[9]:	#t002--unlock-protocol
[10]:	#t004--payment-confirmation-and-recovery
[11]:	#t006--guest-name-corrections-versus-admission-reassignment
[12]:	#t007--account-recovery-bound-phone-proof-and-concierge-follow-up
[13]:	#t010--required-gift-registration-and-resumable-claim-completion
[14]:	#t003--ui-for-purchase
[15]:	#t011--korean-ux-copy-finalization
[16]:	#t012--english-interface-copy-deferred-states-and-acceptance-gaps
[17]:	reference/commerce-launch-plan.md
[18]:	#t006--guest-name-corrections-versus-admission-reassignment
[19]:	../src/lib/commerce/guests.ts
[20]:	../src/lib/commerce/domain.ts
[21]:	../src/lib/commerce/_shared/transaction.ts
[22]:	../src/components/commerce/invitation-claim.tsx
[23]:	../src/components/commerce/order-admissions.tsx
[24]:	../src/components/commerce/checkout.tsx
[25]:	../src/components/commerce/payment.tsx
[26]:	../src/lib/commerce/ecommerce.ts
[27]:	../src/lib/commerce/portone/endpoints.ts
[28]:	../src/lib/commerce/portone/review.ts
[29]:	../src/components/Authentication/member-auth/account-recovery-view.tsx
[30]:	../src/lib/member-auth/recovery/http.ts
[31]:	../src/lib/member-auth/client.ts
[32]:	../src/components/Authentication/member-auth/account-view.tsx
[33]:	../src/lib/payload/admin/commerce/operation-panel.tsx
[34]:	../tests/commerce/domain/guests.test.ts
[35]:	../tests/commerce/ui/guests-dom.test.tsx
[36]:	#t010--required-gift-registration-and-resumable-claim-completion
[37]:	qa/t001-allocation-20261111.receipts.json
[38]:	reference/commerce-launch-plan.md
[39]:	../src/lib/commerce/guests.ts
[40]:	../src/lib/payload/collections/commerce-admissions/index.ts
[41]:	../src/lib/member-auth/payload-repository.ts
[42]:	../src/lib/commerce/_shared/transaction.ts
[43]:	../src/lib/commerce/reservations.ts
[44]:	../src/lib/commerce/returns.ts
[45]:	../src/components/commerce/invitation-claim.tsx
[46]:	../tests/commerce/domain/guests.test.ts
[47]:	../tests/commerce/domain/real-payload-acceptance.test.ts
[48]:	reference/backlog-execution-plan.md#t009-a-bounded-own-account-read-contract--next-safe-implementation
[49]:	reference/commerce-launch-plan.md
[50]:	../src/components/commerce/checkout.tsx
[51]:	../src/components/Authentication/member-auth/account-study.tsx
[52]:	../src/lib/member-auth/client.ts
[53]:	../src/components/Authentication/member-auth/account-view.tsx
[54]:	../src/lib/commerce/access.ts
[55]:	../src/components/commerce/payment.tsx
[56]:	../tests/commerce/ui/payment-dom.test.tsx
[57]:	/Users/seanschoi/.codex/worktrees/944f/sphmrs/docs/reference/ticket-account-planning-20261110.md
[58]:	/Users/seanschoi/Projects/sphmrs/docs/reference/unlock-integration-blueprint.md
[59]:	reference/commerce-launch-plan.md
[60]:	../src/components/commerce/order-admissions.tsx
[61]:	../src/lib/commerce/guests.ts
[62]:	../src/lib/commerce/_shared/benefits.ts
[63]:	../src/lib/commerce/_shared/transaction.ts
[64]:	../src/lib/commerce/returns.ts
[65]:	../src/lib/commerce/benefit-review.ts
[66]:	../src/lib/commerce/domain.ts
[67]:	../src/lib/payload/admin/commerce/admission-controls.tsx
[68]:	../src/lib/commerce/_shared/collection.ts
[69]:	reference/commerce-launch-plan.md
[70]:	qa/src-stabilization-20261109.md
[71]:	../tests/commerce/domain/guests.test.ts
[72]:	../tests/commerce/ui/guests-dom.test.tsx
[73]:	../tests/commerce/domain/real-payload-acceptance.test.ts
[74]:	codex://threads/01a1c64a-3c5e-7d93-8749-27a5202060e6
[75]:	codex://threads/01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1
[76]:	codex://threads/01a1c5e3-c446-7503-80b6-b6429bb9f342
[77]:	reference/commerce-launch-plan.md
[78]:	../src/components/Authentication/member-auth/account-recovery-view.tsx
[79]:	../src/lib/member-auth/recovery/contracts.ts
[80]:	../src/lib/member-auth/recovery/service.ts
[81]:	../src/lib/member-auth/recovery/http.ts
[82]:	../src/lib/member-auth/recovery/repository.ts
[83]:	../src/lib/member-auth/recovery/runtime.ts
[84]:	../src/lib/payload/admin/recovery-review.tsx
[85]:	../src/lib/payload/collections/account-recovery-requests/index.ts
[86]:	../src/lib/migrations/20261102_000000_recovery_intake.ts
[87]:	../src/lib/member-auth/identifier.ts
[88]:	../src/lib/member-auth/service.ts
[89]:	../src/lib/phone-verification/server/service.ts
[90]:	../src/lib/member-auth/payload-repository.ts
[91]:	../src/lib/member-auth/mail.ts
[92]:	deployment/member-auth.local.md#lost-email-recovery-local-intake-and-restricted-staff-review-only
[93]:	reference/backlog-execution-plan.md#t010-a-server-owned-continuation-proposal--design-only
[94]:	../src/lib/commerce/ecommerce.ts
[95]:	../src/lib/commerce/guests.ts
[96]:	../src/lib/commerce/_shared/transaction.ts
[97]:	../src/lib/commerce/_shared/benefits.ts
[98]:	../src/components/commerce/invitation-claim.tsx
[99]:	../src/components/commerce/order-admissions.tsx
[100]:	../src/components/commerce/checkout.tsx
[101]:	../src/components/Authentication/member-auth/account-view.tsx
[102]:	../src/components/Authentication/member-auth/account-study.tsx
[103]:	../src/components/Authentication/member-auth/phone-step.tsx
[104]:	../src/components/Authentication/member-auth/_shared/session.ts
[105]:	../src/lib/phone-verification/client.ts
[106]:	../src/lib/member-auth/service.ts
[107]:	../src/lib/auth/options.ts
[108]:	../src/lib/member-auth/client.ts
[109]:	../src/lib/member-auth/payload-policy.ts
[110]:	../tests/commerce/ui/guests-dom.test.tsx
[111]:	../tests/commerce/ui/guests.test.tsx
[112]:	../tests/commerce/domain/guests.test.ts
[113]:	#t010--required-gift-registration-and-resumable-claim-completion
[114]:	reference/korean-copy-passes/00-run.md
[115]:	reference/korean-copy-passes/01-account-and-verification.md
[116]:	reference/korean-copy-passes/02-settings-navigation-reading.md
[117]:	reference/korean-copy-passes/03-offer-delivery-checkout.md
[118]:	reference/korean-copy-passes/04-payment-orders-invitations.md
[119]:	reference/korean-copy-passes/05-coverage-findings-and-task.md
[120]:	qa/en-copy-refinement-20261111.md
[121]:	qa/en-copy-refinement-20261111.json