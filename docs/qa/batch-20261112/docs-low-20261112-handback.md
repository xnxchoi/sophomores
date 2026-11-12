# SPH-DOCS-LOW-20261112-01 — candidate handback

## Progress and review boundary

- Completed: seven LOW wording items; Markdown-only candidate, not accepted.
- Current: rework cycle 1 candidate ready for custodian re-review; deterministic checks passed (receipt appended below).
- Remaining: custodian specialist review and two independent Santa reviews, then acceptance/integration decision; no merge or push authorized to this worker.
- Fragile final pass: after rework cycle 1 the execution plan has no whole bytes of remaining room below its 40% cap; preserve financial/binding capture and task IDs/headings; enforce both 40% byte gates; resolve every owned-file local link/anchor; do not inherit the old PASS/PASS or infer runtime/provider/deployment acceptance.

## Identity and scope

- Task `task_73f9eb8ec0a6`; Dispatch `ctx_bf17157d2f5c`.
- Branch `codex/docs-low-20261112`.
- Worktree `/Users/seanschoi/orca/workspaces/sphmrs/docs-low-20261112`.
- Source HEAD/main at intake `ed9932a6446173634e40bca4147abbf6d81c90a8`, the commit adding this assignment spec.
- Intake tracked status: clean; all four edited existing Markdown paths tracked.
- Identity action: branch renamed first; initial sandbox rename was denied because shared Git metadata is outside this writable root, then scoped escalation succeeded before editing.
- No Node workloads, node_modules symlink, installs, app checks, services, providers, DB/env access, nested workers, merge or push.

## Item map

| Item | Exact changed surface / disposition |
|---|---|
| 1 | [Commerce header](../../reference/commerce-launch-plan.md): clean-checkout stylesheet gate explicitly resolved at `e7e8fdd`; remaining functional/provider/release gates retained. Verified tracked stylesheet and integration commit locally. |
| 2 | [Batch 7c table](../../reference/commerce-launch-plan.md#step-7c): both validation/preservation and local-gate row labels are historical 2026-11-11 observations, with later shipment in pushed `fb4ca49`; original dated no-push/local-origin observations retained, not turned into current remote claims. The custodian verified that Batch 7c commit `8efbb0a` is an ancestor of the pushed `fb4ca49`; that supplied ancestry check grounds the 7c shipment claim, not this worker checker's source-HEAD ancestry output. No remote query was run by this worker. |
| 3 | [Loop contract](../../reference/backlog-execution-plan.md#loop-contract): standard-library/link/git checks replace app checks only, not required reviews; unchanged preceding paragraph still requires specialist review and two independent Santa PASS results. |
| 4 | [T001 Settled](../../To-Do%20List.md#t001--tickets-and-accounts): restores no separate member/nonmember customer journeys and wallet/physical NFT goals not being launch dependencies, linking to the archived T001 section containing those owner clarifications, not to a dedicated owner-clarification anchor, without adding policy. |
| 5 | [Concurrent intake](../../To-Do%20List.md#concurrent-intake-and-task-ids): restores the four-line concurrent-ID validation rule verbatim and links split/merge/orchestration proposals to their archived section. |
| 6 | [Registry delivery limitations](../../To-Do%20List.md#current-maintenance-checkpoint): labels the old handback historical and explicitly makes its two-entry list defer to the registry six-entry list; original handback remains unchanged. |
| 7 | [Correction 3 and cycle-3 ledger](../handoff-prep-20261112/docs-rework-custodian.md): existing symlink to the original install, with nothing installed or copied; all seven items marked applied in the new candidate, not accepted by the old review. Registry panel's stale unapplied label updated consistently. |

No item left unapplied. Financial/binding text and archived captures are unchanged.

## Deterministic receipt

Content candidate HEAD: `173d92eb82323dbe0dbe1f9d4d73fe00fd8cb266` (four Markdown content files). A subsequent handback-only commit freezes this receipt; final branch HEAD is supplied in the single Orca completion event, avoiding a self-referential hash.

Content diff SHA256: `acff0d5d23c3987c6b6a279609f7c5ea89533d571d35335872bb2125fe79d153`, over raw `git diff --binary SOURCE_HEAD CONTENT_HEAD --` bytes; excludes this handback. No app source or binding/financial text was changed.

| Changed content file | Bytes | SHA256 |
|---|---:|---|
| `docs/To-Do List.md` | 34543 | `82eba0036a888193fdcdda65173526b5a7c03a5d4b25bb8677031c5b924e6def` |
| `docs/reference/backlog-execution-plan.md` | 20253 | `0e5fb7642a3c51f79a08ec1153a28c4fda0746b80db85fee38da143d0a2e5991` |
| `docs/reference/commerce-launch-plan.md` | 39263 | `e21566a2d1e6c4ce54457ef5ce6ff5313c34dc289b467a09e25f908803c85c88` |
| `docs/qa/handoff-prep-20261112/docs-rework-custodian.md` | 11262 | `c574f04ed6a16c612f7f3d541420fcf5cbe123cb453b8b11c393cf1350c09c21` |

Fifth changed file: this handback. Checker: temporary standard-library Python `/tmp/sph-docs-low-check.py`, SHA256 `d082f2050fcf896dbdd96e9f06265c9ac2546bca103ce8809bf5c11eb23d7f3a`; source identity/heading snapshot `/tmp/sph-docs-low-baseline.json`. Neither temporary checker file is a repository change. The checker parses inline/reference Markdown destinations, resolves percent-encoded local paths and heading/explicit-ID fragments, compares original-byte sizes, task IDs/headings, exact archived financial range, archive/Korean bytes, local commit ancestry and Git whitespace/scope. Owned files contain no HTML href links or reference-style uses outside the parsed destinations. No external links or remote state were queried.

Actual final checker output (`python3 /tmp/sph-docs-low-check.py`, exit 0):

```text
Owned Markdown link checks: 89 local links, 31 fragments, 0 failures
PASS byte gate: docs/To-Do List.md 34543 / 162396 = 21.270844% <= 40%
PASS byte gate: docs/reference/backlog-execution-plan.md 20253 / 50638 = 39.995655% <= 40%
PASS registry task IDs and 11 T-headings unchanged
PASS financial capture: 11129 bytes, SHA256 a25d435fb48c655d478b634be9d126db76cf75a3d873f76f4d5925a1142a88b7; full hash retained in registry
PASS all four archives and messages/ko.json byte-identical to source HEAD
PASS node_modules absent (no symlink)
PASS e7e8fdd and fb4ca49 are source-HEAD ancestors (local Git only)
PASS git diff --check (no output, exit 0)
PASS changed tracked paths within Markdown allowlist
```

Failures/limits: initial branch rename and initial sysctl were sandbox-denied; scoped escalations succeeded. Hook inspection found the optional commit-msg file absent (cat exit 1); the configured Bash/ripgrep pre-commit secret scanner ran normally on the content commit, with no bypass. No checker failures occurred. Node/app/dependency checks were intentionally not run under the Markdown-only contract. Specialist and two independent Santa reviews remain unmet acceptance gates assigned to the custodian, not worker failures or review PASS claims.


## Resource and remaining-process boundary

Read-only process census: physical RAM 51,539,607,552 bytes (48 GiB); worker root PID 3681, 20 observed descendants including transient audit CLI/Python/ps, aggregate RSS 1.452 GiB (not a physical-footprint/whole-chat certification). Census found active host-managed clients at PIDs 4040, 4042, 4043, 4048, 4049, 4055, 4070, 4071, 4072, 4074, 4075, 4076, 4420, 4440, 4479 and 6971; none was newly launched as an app workload or stopped. No persistent task-owned workload or port was started; only short-lived CLI/Git/Python checks ran. Host-managed active tool connections were preserved. No whole-chat resource compliance or runtime/visual/provider acceptance is claimed.


## Rework cycle 1

Assignment SPH-DOCS-LOW-20261112-01; Task `task_0151a9f6189d`; Dispatch `ctx_6e492c7748b1`.
Intake HEAD `c85cc3735581604f5689be2b399ef6c386eda639`, clean tracked status, unchanged branch and worktree above.
The custodian reported deterministic PASS, fact-accuracy specialist PASS (LOW only), Santa A FAIL (one MEDIUM), and Santa B PASS (LOW only); the independent reviewers did not see each other's work. The initial failed candidate and its receipt above are retained, not recast as accepted.

| Review item | Applied correction |
|---|---|
| 1 — MEDIUM A F1 / B F5 | Ledger correction 3 states the owner's actual approval through resource admission, then reports the existing dependency symlink as a separate run-fact sentence; no implied owner approval of a dependency arrangement. |
| 2 — LOW | T001 restores the archive's wording “are explicit but not launch dependencies”; its link label explicitly identifies the archived T001 section. |
| 3 — LOW | Plan preserves “candidates” and says stdlib/link/git checks replace app checks, not required reviews; 20,255 / 50,638 bytes = 39.999605%, with zero whole bytes of spare cap room. |
| 4 — LOW | Ledger follow-up bullets now have a recorded-findings label dated to candidate `914ce48`; findings remain historical rather than unresolved current claims. |
| 5 — LOW | Initial item-map descriptions now identify the T001 section link accurately and base the Batch 7c shipment claim on the custodian-supplied `8efbb0a` → pushed `fb4ca49` ancestry verification, not this worker checker's different source-HEAD ancestry check. |
| 6 — optional LOW | Proposal label now explicitly includes external-model proposals; archive destination unchanged. |

The registry panel row and ledger sentence requiring new specialist/two-Santa reviews are byte-identical to the initial candidate, as requested; the custodian owns their integration-time refresh. The commerce plan was unchanged during this rework. No item is left unapplied; no new review acceptance is claimed.

Rework content commit HEAD: `67bbb86db1464fe42e7846e4a59897c29e772846`. Rework diff SHA256 `a014ff7abf0f76656a29de915d86082cbcc397b0294a81039432a7b079409bd5` over raw `git diff --binary c85cc3735581604f5689be2b399ef6c386eda639 REWORK_CONTENT_HEAD --` bytes (includes the two initial handback item-map corrections, excludes this subsequent receipt append). A handback-only follow-up commit freezes this section; final HEAD is reported once via Orca.

Actual rerun of the same standard-library checker (`python3 /tmp/sph-docs-low-check.py`, exit 0):

```text
Owned Markdown link checks: 89 local links, 31 fragments, 0 failures
PASS byte gate: docs/To-Do List.md 34573 / 162396 = 21.289317% <= 40%
PASS byte gate: docs/reference/backlog-execution-plan.md 20255 / 50638 = 39.999605% <= 40%
PASS registry task IDs and 11 T-headings unchanged
PASS financial capture: 11129 bytes, SHA256 a25d435fb48c655d478b634be9d126db76cf75a3d873f76f4d5925a1142a88b7; full hash retained in registry
PASS all four archives and messages/ko.json byte-identical to source HEAD
PASS node_modules absent (no symlink)
PASS e7e8fdd and fb4ca49 are source-HEAD ancestors (local Git only)
PASS git diff --check (no output, exit 0)
PASS changed tracked paths within Markdown allowlist
```

Additional read-only assertions: PASS — registry panel row and ledger review-state sentence unchanged from `c85cc37`; PASS — commerce plan unchanged during rework cycle 1. `git diff --check` also returned exit 0 with no output. No failed checks, Node/app workloads, dependency symlink, services, nested workers, merge or push; no persistent task-owned process or port remains. The earlier resource census is a dated initial-candidate observation, not a new whole-chat compliance assertion. Remaining actor/action: custodian re-review and acceptance/integration decision, with the plan's zero-whole-byte margin preserved.
