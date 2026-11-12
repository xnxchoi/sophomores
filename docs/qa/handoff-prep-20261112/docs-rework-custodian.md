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
   is updated to the current Orca terminal bound to `run_ac424ae06af8`. The owner's
   resumption of feature dispatch replaces every "feature dispatch held" statement
   in all four active files.
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
| Byte gates | To-Do 30,608 / 162,396 = 18.848%; plan 20,255 / 50,638 = 40.000% (≤ 40%) |
| T001–T007, T009–T012 live headings and in capture; T008 not live | PASS |
| Financial capture: 11,129 bytes, SHA256 `a25d435f…a88b7`; hash cited in active registry | PASS |
| Deployment AUTO-GENERATED block byte-equal to main | PASS |
| Local links/anchors in four active files, archive index, supplement and Unlock blueprint | 0 failures |
| Inbound anchors from tracked docs | 2 hits, both checker artifacts: plain-text citations with a trailing `]`; `step-5`/`step-10` exist |
| Scope versus main: four active files, five archive files, two handback/rework reports | PASS |
| `git diff --check` on active edits | clean |

Active SHA256: To-Do `fb01a752…e8cb`, plan `a164bccf…171f`, commerce plan
`a05118c9…29a3`, deployment README `808215b1…e681` (full values in the commit).

## Not claimed

No review PASS, acceptance, integration or parent completion. No app, test, build,
provider, DB or deployment check. Absolute links into `/Users/seanschoi/Projects/sphmrs`
in the Unlock blueprint and supplement are pre-existing debt, not in this scope.
Commit `6dc19d1`'s message cites a placeholder "9c93..." hash for the 944f plan.
The actual 944f working-file SHA256 is
`5744a58e26cae05cd63808bcfc68dcd5a564fa418ada6e76d75b81812a8f85bf`, and the merged
result on main is `47c5eac5a7252cdf7095d7bb9d23633460c472ac5a4cf072805201bde05673f5`.
