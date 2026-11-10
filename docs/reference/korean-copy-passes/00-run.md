# Korean copy — bounded autonomous editorial passes

Started: 2026-11-11 04:18:57 KST (2026-11-10 19:18:57 UTC).
Hard stop: 2026-11-11 06:18:57 KST, or earlier after scoped end-to-end coverage.
Owner plans shutdown about 07:48 KST; finish persistence before the hard stop.

## Scope and acceptance

Continue first-party Korean UX copy calibration across the active customer
journey: entry/navigation, account creation/login/verification, account settings,
offer/delivery/checkout, same-attempt payment/result, orders/guest admissions and
invitation claim. Cover route-level states and task-critical controls, not every
catalogue string. Keep stable simple labels English where Korean does not aid
the task. Staff/admin, developer tools, archived/retained studies, legal/CMS
editorial prose and About are excluded and explicitly mapped, not silently counted.

The work is documentation/sample-only. `messages/en.json` is owner WIP;
`messages/ko.json` remains byte-identical. No runtime/source, service, provider,
dependency, deployment or publication actions. Newly generated copy is a draft
even after semantic checks; only explicit owner-accepted references carry that
status. Source inspection and reviewer agreement are not live acceptance.

## Sequential pass plan

0. Commit the existing calibration artifact only after precommit security review.
1. Entry, email/phone authentication and recovery boundaries.
2. Account/settings, navigation and reading interaction.
3. Offer, delivery and checkout before payment.
4. Payment/result and orders/admissions/claim.
5. Cross-journey consistency, exclusion/coverage check and one consolidated
   To-Do intake item containing failures, borderline checks and remaining gates.

Each pass: source/context inventory → necessary content → draft → deterministic
document checks → two fresh, isolated Santa reviews with identical rubric →
fix only findings → re-review (maximum three rounds) → commit only owned files.
Keep failed/borderline findings even when repaired. Unknown product decisions
are council/defer items, not prompts to invent policy. Complete independent
surfaces rather than churn on one unresolved issue. Stop new work at the deadline
and persist truthful partial coverage, findings and next steps.

## Progress panel

| Pass | Status | Evidence / remaining work |
| --- | --- | --- |
| 0 | Committed | `ae237a3`; precommit doc-only security PASS; only calibration document staged. |
| 1 | Reviewed | A01–A46; dual FAIL then fresh dual PASS; F01–F12 retained. |
| 2 | Reviewed | B01–B38; fresh dual PASS; F13–F26 include borderline suggestions and source gates. |
| 3 | Reviewed | C01–C30; fresh dual PASS; F27–F33 retain policy, validation and recovery gaps. |
| 4 | Reviewed | D01–D43; FAIL/PASS then fresh dual PASS; F34–F52 retained. |
| 5 | Complete — editorial | 19 route entries, 168 state/context rows; F01–F59; fresh final dual PASS and scoped security PASS; single task registered T011; owned final snapshot committed with this pass. |

## Fragile final-pass checklist

1. Preserve owner-accepted wording; do not promote other drafts to approval.
2. Complete necessary state + real next action before tone or compression.
3. Unknown ≠ failed; no charge/access/delivery/review-timing promises.
4. Task-critical Korean controls; active, natural progression; no negative stacks.
5. Every shared slot fits its actual branches; disabled controls/cooldowns differ.
6. No runtime/catalogue changes or new operational policy/automatic retry.
7. Commit path isolation, source drift and shared To-Do ownership.
8. No orphaned agent-owned heavy workload; deadline-safe durable state.

## Council question — final To-Do commit isolation

Architect initial position: append the requested single task to the latest shared
To-Do file, but do not stage the entire previously untracked owner board merely
to commit our addition. Persist an exact owned task snapshot in this run's final
report and disclose the board's untracked status.

Reasons: the current branch contains extensive unrelated owner work; the board
is maintained concurrently; a newly tracked file cannot stage only our appended
section without also introducing the owner's entire existing document. Main risk:
the owner may expect the final task's board placement itself to be committed.
Council verdict: all three independent voices agree with the initial position.
Skeptic: introducing unrelated board contents changes repository governance.
Pragmatist: preserve a committed exact task snapshot and disclose local board
placement. Critic: partial staging against a nonexistent baseline would create
a truncated tracked board, not an append-only commit. Strongest practical dissent:
local board placement is not Git durability, so the owned snapshot is mandatory.
No external view changed the recommendation. The owner explicitly requested the
board addition, so append without truncation against the latest contents; no
cross-chat message is sent without direct authorization. No ADR is
initialized: no approved architectural decision is needed for ordinary copy;
any genuine system decision remains a proposed/deferred item under existing
ADR approval gates. No hook/configuration or global learning promotion changes.

## Restart / compaction handoff

Read this panel first, then the relevant pass and its review receipt. The
historical correction/acceptance record is `../korean-copy-calibration.md`.
Read current source before using old anchors. Stage paths explicitly; never
`git add .`. Inspect the latest board before appending the final single task.
This file is the durable state; no unverified background persistence is assumed.

Checkpoint before final coverage/compilation: pass commits are `ae237a3`
(historical calibration), `bae9421` (account/verification), `fa4ca41`
(settings/navigation), and `d93aa5a` (offer/delivery/checkout). Pass 4 committed
as `afefe7c`. All current activity is doc-only and at most two reviewers
active; no builds/dev servers/browsers were started. Latest broad resource audit
showed about 19.7 GiB summed RSS across the **whole Codex descendant tree,
including other chats**, not a this-chat workload total or physical footprint.
System headroom was not under pressure; do not treat summed RSS as a quota proof.
No verified ownership tag was exposed for generic tool-client duplicates, so no
unrelated/uncertain process was terminated. Keep concurrency low and recheck
before final work. No host compaction API was available/invoked: preserve this
disk handoff at the logical milestone instead of claiming formal compaction.

Finalization checkpoint: scoped route/state coverage and final semantic/security
checks complete; no new generation needed before the deadline. Single intake
`KOCOPY-20261111` appended once to the latest board, existing bytes preserved.
The custodian subsequently assigned **T011**, retained the full task capture and
placed it in the active registry; preserve that normal maintenance, not the
obsolete incoming-heading assertion.
The whole board stays untracked and unstaged because unrelated owner content
has no approved Git baseline; the exact owned task snapshot is in pass 5 and
is committed with this panel and the learning source. Two project-only
instincts were imported after a clean dry run; no hook/observer/config migration.
Remaining work consists of explicitly recorded source/interaction/policy,
owner-review and live-acceptance gates, not an assertion that Korean runtime
translation is done. Final deterministic checks passed on tables, links, 168
unique state rows, retained T011 body, exact accepted references and unchanged
Korean catalogue. Final broad memory check: 22.9 GiB free/inactive/speculative
estimate and about 19.4 GiB summed RSS for the entire Codex tree including other
chats, not this chat's physical footprint. No agent-started heavy workload,
server/browser or container needs shutdown cleanup; no unrelated process killed.

End condition reached by route/state coverage at approximately 04:59 KST,
about 40 minutes into the two-hour envelope. No need to fill the remaining time
with speculative variants or repeat unchanged checks. Final-copy approval,
source fixes, implementation and live acceptance remain in T011/existing owners.
