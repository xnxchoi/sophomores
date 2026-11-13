# SPH-T004-I0DB-20261113-01 — dispatch custody

The spec is frozen at main `a440c99`. Run `run_8a16b71cf6a4`, Task `task_ad03b8726b76`, Dispatch `ctx_3413c7008a44`, Codex. Before launch, 8.99 GiB was accounted and 22.7 GiB was available. The Docker daemon was running with no containers. The owner approved the disposable loopback PostgreSQL on 2026-11-13. The task was submitted with Cmd+Enter.

## RED-01 and remediation, 2026-11-13

Candidate `61edde8` failed on real PostgreSQL 16.15. The `findByID` transaction-only request projection is rejected by the I0 ownership proxy (RED-01). The disposable container and volume are confirmed removed, and the pre-existing containers are untouched. The custodian accepted the defect and authorized a narrow fix plus the full matrix: see [remediation-1.md](remediation-1.md). It was sent as a follow-up to the same worker.

## Remediation 1 handback, 2026-11-13

Candidate `2d017d2` (outcome failed: the matrix stopped at RED-02). The RED-01 fix is limited to `transaction.ts:193-203`. Verified in real PostgreSQL:
- commit plus replay;
- actual COMMIT rejection.

**RED-02:** after `pg_terminate_backend` during settlement, the error escapes as "Cannot use a pool after calling end on the pool" and "Connection terminated unexpectedly". Not yet determined: whether this is production propagation or test-runner teardown.

Not run after RED-02:
- the dedicated rollback-rejection proof;
- risk persistence;
- concurrency;
- restart.

The disposable container and volume are confirmed removed. Runtime released. Review rubric for the source fix: [review-rubric-r1.md](review-rubric-r1.md).

## Fix review cycle 1, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (1 MEDIUM) |
| Santa A | PASS |
| Santa B | FAIL (1 MEDIUM) |

Both MEDIUM findings are the same check-then-use defect: the projection is validated and then the caller's object is forwarded. Next: [remediation-2.md](remediation-2.md), covering the fix, the RED-02 diagnosis and the full-matrix rerun.

Remediation 2: dispatched as Task `task_8d21fe8d69c8`, Dispatch `ctx_ab95fcd99b3a`, using the existing worktree. Submitted with Cmd+Enter.
