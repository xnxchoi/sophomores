# DOCS rework — custodian-applied corrections, 2026-11-12

Assignment SPH-HANDOFF-DOCS-20261112-01. Spec unchanged: [plan](plan.md),
[docs-spec](docs-spec.md), [rework corrections](docs-rework-spec.md). The executor's
[handback](docs-handback.md) is kept verbatim as the original candidate record.

## Why the custodian applied the rework

Follow-up Task `task_54c299b1add3` / Dispatch `ctx_153f28be1f47` exited during the
owner's pause ("Terminal closed by operator request") with **no file changes**: all
candidate bytes matched the original handback manifest when rehashed. The owner
resumed on 2026-11-12 and directed "apply + review". Orca `worker-release` returned
`release_unknown` twice (terminal no longer resolves); a process census found no live
process for that terminal or worktree. No further retry.

## Identities

- Original candidate frozen as `19a49516c822e1b3d417b8edd468a1c98fd74ef4` (parent
  `1c77931`), byte-identical to the handback manifest.
- Main merged in at `6dc19d18317a3f9d0223c8a57bfbf13694629d55`, which adopts the owner's
  2026-11-11 admission/account amendment and supplement from worktree `944f`.
- Conflicts: commerce plan admission section and step-3 row took main's owner
  amendment, so the candidate's "historical policy" note is gone. The registry kept
  the candidate's compact delivery paragraph and inline links. Main's interim
  assignment table and unused reference definitions were dropped; the state they
  held now lives in the panel rows.

## Corrections applied

1. **Current status:** the panel rows for DOCS and TESTS now give actual outcomes:
   DOCS follow-up exited with no changes, then custodian rework; TESTS audit-only
   failed/blocked, baseline NOT RUN, no test/source change. The custodian identity
   is updated to the current Orca terminal bound to `run_ac424ae06af8`. In the
   first pass the owner's resumption replaced the explicit "feature dispatch held"
   lines, but two held-era phrases survived in the plan (lines 75 and 243). Both
   reviewers caught them, and cycle 1 below fixes them.
2. **Actor scope:** executor-only restrictions (no nested reviewers, app checks,
   commits or pushes) are labelled as binding those executors only. They are not
   standing prohibitions on custodian review, scoped commits, acceptance,
   integration or gated delivery. Provider and deployment approvals remain separate.
3. **TESTS limitation:** recorded as a contract-specific ban on two synthetic loopback
   fixtures, not a test failure or provider access. The owner approved re-scoping it
   under local-check authority on 2026-11-12, subject to resource admission and
   isolated read-only dependencies.

## Deterministic checks — PASS

Standard-library Python plus read-only git; no app or Node workload.

| Check | Result |
|---|---|
| Four archives byte-equal to `git show 1c77931:<path>` | PASS |
| Byte gates (first pass, `9e50fc4`) | To-Do 30,608 / 162,396 = 18.848%; plan 20,255 / 50,638 = 39.9996% (≤ 40%) |
| T001–T007, T009–T012 live headings and in capture; T008 not live | PASS |
| Financial capture: 11,129 bytes, SHA256 `a25d435f…a88b7`; hash cited in active registry | PASS |
| Deployment AUTO-GENERATED block byte-equal to main | PASS |
| Local links/anchors in four active files, archive index, supplement and Unlock blueprint | 0 failures |
| Inbound anchors from tracked docs | 2 hits, both checker artifacts: plain-text citations with a trailing `]`; `step-5`/`step-10` exist |
| Scope versus main: four active files, five archive files, two handback/rework reports | PASS |
| `git diff --check` on active edits | clean |

First-pass active SHA256 at `9e50fc4` (superseded by cycle 1):
`fb01a752893a23f2084b2ea78c383f53210f50e470fb69bce2ad6b683b91e8cb` To-Do,
`a164bccfbaedbfbc1830a96b354ff7235b2219d97ece02053b9f742adbd2171f` plan,
`a05118c99f8f8ecc4d0c46f7a1d64c5f454440e4da7cfeee9825ce4e5fb229a3` commerce plan,
`808215b1a3356d437ae4b1ddad3d53f24079346c87cc8d327993342b7915e681` deployment README.

## Review cycle 1 — both FAIL, no CRITICAL/HIGH

Two fresh independent native Santa reviewers (A and B) received the identical spec,
candidate `9e50fc4` and rubric R1–R8, and neither saw the other. Both failed R5/R8
on the same MEDIUM defects. Their reports are preserved in the custodian session
and summarised here, with no finding omitted.

| Finding (reviewer) | Fix |
|---|---|
| Plan :75 and :243 still required "dispatch resumption" / "owner resumption" (A, B; MEDIUM) | Both now require only a recorded bounded assignment |
| This record falsely claimed every hold statement was replaced (A MEDIUM, B LOW) | Corrected above; a semantic sweep added below |
| To-Do final-delivery QA location ambiguous; some receipts exist only in the original checkout (A, B; MEDIUM) | Exact paths named; original checkout must not be retired before consolidation |
| TESTS row omitted the 15.153 GiB census denial and env/no-DB isolation (A MEDIUM, B LOW) | Both causes stated; re-scoped baseline result recorded |
| Full final hashes falsely said to be "in the commit" (A, B; LOW) | Full SHA256 and byte counts listed here |
| Commerce plan "(candidate)" label (A, B; LOW) | Removed |
| Deployment "separately approved … gates" ambiguous; lost "functional/production-readiness" (A, B; LOW) | Reworded: each still requires separate approval |
| Supplement "adopted" lacked the not-whole-implementation qualifier (A; LOW) | Qualifier added |
| Panel lacked Task IDs and release status (A, B; LOW) | Task IDs, "released" and custody link added |
| Scheduled-custody reduced to a bare anchor (B; LOW) | One-line pointer with automation identity and archive link |
| Linked `dispatch.md` stale at candidate (A; LOW) | Main `6a72a7a` merged in (`82464c1`), carrying the current `dispatch.md` and TESTS baseline record |

Cycle-1 deterministic rerun: all gates above PASS; financial 11,129 B /
`a25d435f…a88b7`; 0 local link failures; the same two inbound checker artifacts.
**Semantic sweep** (`resum|held|hold|pause|this pass|this worker|no-commit|candidate)`
across the four active files): every remaining match is a domain use ("hold a
ticket", "resumable claim") or a dated historical receipt. No dispatch-hold claim
remains.

| Active file after cycle 1 | Bytes | SHA256 |
|---|---|---|
| `docs/To-Do List.md` | 31,914 (19.652%) | `735944e1c8e146c3fbfe863caf664ca4ea6500167b955bfc31870dd1c84301a2` |
| `docs/reference/backlog-execution-plan.md` | 20,233 (39.956%) | `4c6b7efb86bf0a1a0aa959e838ab8f94307bdae39acd264675169418fa829688` |
| `docs/reference/commerce-launch-plan.md` | 38,997 | `839f2afac637e6633d5a2d88c846a71a922cf8eabf3aa5235fee16bc2f4e4c64` |
| `deployment/README.md` | 29,169 | `728c25ddf26be19e3d48368741fa12c368770165bc54461fab066c638416c043` |

## Not claimed

No review PASS, acceptance, integration or parent completion. No app, test, build,
provider, DB or deployment check. Absolute links into `/Users/seanschoi/Projects/sphmrs`
in the Unlock blueprint and supplement are pre-existing debt, not in this scope.
Commit `6dc19d1`'s message cites a placeholder "9c93..." hash for the 944f plan.
The actual 944f working-file SHA256 is
`5744a58e26cae05cd63808bcfc68dcd5a564fa418ada6e76d75b81812a8f85bf`, and the merged
result on main is `47c5eac5a7252cdf7095d7bb9d23633460c472ac5a4cf072805201bde05673f5`.

## Review cycle 2 — both FAIL; cycle 3 is the last allowed

Fresh reviewers C and D received the identical spec, candidate `790fafc` and rubric.

| Finding (reviewer) | Fix |
|---|---|
| **HIGH (C):** the owner-stated T001 high priority was lost and recast as a proposal | Restored: T001 owner-explicit P1 and T002 owner focus; other labels are agent proposals, with a link to the original index; T001 panel row marked owner-stated P1 |
| Custody statement wrong: most final-delivery files are tracked; list missed `privacy-validation-stage.json`, whose main-checkout namesake differs (D; MEDIUM) | Corrected: 24 tracked, 6 untracked entries listed exactly; only round3 Santa reports duplicated |
| Archive README called every capture non-binding while active docs cite the financial brief as binding (C; MEDIUM) | README carve-out for sections an active document names as binding; scheduled-custody rule restated inline |
| "Keep plan-canvas stopped" dropped (C; MEDIUM) | Restored in the active execution policy |
| T001 lacked its archive pointer, completion evidence and two owner clarifications (C; MEDIUM) | Added |
| Commerce header omitted the clean-checkout stylesheet gate (C; LOW) | Qualifier with registry link |
| TESTS row said stylesheet tracking awaited approval, which went stale after the freeze (C, D; LOW) | Owner approval and separate assignment SPH-BRANDTOKENS-20261112-01 recorded |

Cycle-2 rerun: all deterministic gates PASS; To-Do 33,318 B (20.517%), plan unchanged
at 20,233 B (39.956%); financial 11,129 B / `a25d435f…a88b7`; 0 local link failures.
Final SHA256 after cycle 2: To-Do `c268fbbadfee376056625185e8d4c098da3207eccd3636be5d299d9ea393429f`,
plan `4c6b7efb86bf0a1a0aa959e838ab8f94307bdae39acd264675169418fa829688`, commerce plan
`4b2160a31b0950414ee5bb293166bb384985aac3b6019d52154b7fea6bbb7699` (39,132 B), deployment
README `728c25ddf26be19e3d48368741fa12c368770165bc54461fab066c638416c043` (29,169 B), archive
README `08adad2b24358fa5e3292d6d51552bc6dece7c803c0fc7cf8f29c1e34445916c` (2,901 B).

## Review cycle 3 — PASS/PASS; accepted and integrated at main `ad1db35`

Fresh reviewers G and H passed candidate `914ce48` on every rubric item, raising LOW findings only. The LOW wording follow-ups below are recorded but **not applied**: editing accepted text would invalidate the passing review.

- Commerce plan 7c rows (:339–340, "no push is authorized", "origin/main remains cb82492") need a historical qualifier; 7c shipped in pushed `fb4ca49`.
- Plan :38 "Markdown-only candidates need only standard-library/link/git checks" should say those checks replace app checks, not the required reviews.
- T001 "Settled" could restate two owner clarifications: no separate member/nonmember journeys, and wallet/physical NFT goals are not launch dependencies. Both are reachable through its full-capture link.
- Link the split/merge proposals to their archived section. Restore the concurrent-ID validation rule (original :80–82).
- The To-Do handback-limitations pointer lists only two untracked receipts; the registry's list of six supersedes it.
- Correction-3 wording above said "isolated read-only dependencies". The runs actually used the existing `node_modules` symlink to the original install; nothing was installed or copied.

State refreshes for the stylesheet now being tracked were applied to the registry row at integration (custodian state, not candidate content).
