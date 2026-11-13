# SPH-T002-P2A-20261113-01 — dispatch custody

The spec is frozen at main `42c4c48`. Run `run_8a16b71cf6a4`, Task `task_f4e2543c8b9c`, Dispatch `ctx_241a03b0ec5d`. The worktree is `/Users/seanschoi/orca/workspaces/sphmrs/t002-p2a-20261113`. Agent: Codex with the default model, setup skipped. Before launch there was 16.13 GiB available and 10.04 GiB accounted. The custodian submitted the task with Cmd+Enter.

## Review cycle 1, 2026-11-13

Candidate `ab9cd2e`, diff `82a8c619…003e`. The custodian typecheck of the final
revision exits 0. Reviews:

- Specialist: FAIL (4 MEDIUM).
- Santa A: FAIL (1 MEDIUM).
- Santa B: FAIL (1 MEDIUM).

The two Santa reviews were independent. The shared findings were the refusal ordering
before the bearer is checked, and settlement replay using mutable evidence. Corrections
are in [rework-1.md](rework-1.md).

## Review cycle 2, 2026-11-13

Candidate `1f8d31c`, diff `5a79995b…36b3`. The custodian typecheck exits 0.

| Reviewer | Verdict |
|---|---|
| Santa A | PASS |
| Santa B | PASS |
| Specialist | FAIL: 2 MEDIUM (activation ignores `policyHold`; a vacuous privacy case) |

The two Santa reviews were independent of each other. Corrections are in [rework-2.md](rework-2.md).

**Process note:** Orca created the worker branch as `xnxchoi/t002-p2a-20261113`, not the required `codex/` slug. The custodian left it unchanged and will merge by exact commit.

## Worker lost, 2026-11-13 16:58

All three in-flight workers' terminals closed at the same moment (16:58:37) without
`worker_done`: P2a (`ctx_231d38a4891b`), unlock-shape (`ctx_85e0fc1fc46a`) and
unlock-auth (`ctx_9ad497ee6798`). Orca marked each dispatch failed/lost.

**Root cause of the stall before the close:** each worker had asked a question and
was waiting. The custodian's replies were delivered, but Orca's wake notice ("You
have 1 orchestration message. Run `orca orchestration check`") sat **unsubmitted** in
each Codex composer. This is the same Enter-vs-Cmd+Enter draft issue as at dispatch,
so none of the workers ever read its answer.

**Preserved state:**
- P2a: HEAD `1f8d31c`, with uncommitted cycle-2 work left in its worktree. It was not
  touched.
- unlock-shape: at `7567e05`, clean.
- unlock-auth: at `65841ea`, clean.

No retry was made, because the owner pause is in effect.

## Resumed, 2026-11-13

The owner lifted the pause. `--retry-of` cannot carry the answered questions, so the custodian started a fresh worker in the same worktree from a resume brief (`docs/qa/resume-20261113/p2a-rework2.md`): Task `task_120eb4772980`, Dispatch `ctx_2034201d9241`. The resume brief tells the worker to keep its uncommitted cycle-2 work. The custodian submitted it with Cmd+Enter.

## Review cycle 3 started, 2026-11-13

Candidate `dbaf88e`, full diff `5235b799…30a2`. The custodian typecheck on the exact revision exits 0, and the whitespace check is clean. Rubric: [review-rubric-c3.md](review-rubric-c3.md). The worker runtime was released.

## Acceptance and integration, 2026-11-13

**Review cycle 3 on `dbaf88e`:**

| Reviewer | Verdict |
|---|---|
| Specialist | PASS |
| Santa A | PASS |
| Santa B | PASS |

All three were LOW-only; the two Santa reviews were independent.

**Merge:** main `13a29ee`.

**Integration gate on `13a29ee`:**
- Full typecheck: exit 0, peak 2.38 GB, no remaining PIDs.
- Default suite: 2,793 tests, 2,752 pass, 2 fail (the known deferred-styling tests), 39 skipped, no remaining PIDs.

**Scope:** single token type (launch) only. The type dimension is a recorded follow-up. Production wiring, schema and real PostgreSQL proof are not part of this acceptance.
