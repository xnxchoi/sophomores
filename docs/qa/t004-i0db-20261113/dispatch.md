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

## Remediation 2 handback and fix review 2, 2026-11-13

Candidate `097d883`. The snapshot fix is GREEN: 88 tests pass and 1 DB test is skipped, typecheck exits 0, and the default suite fails only the 2 known tests. RED-02 diagnosis ([red-02-diagnosis.md] in the worktree): the out-of-band driver `error` events in production have no listener. The ended-pool message is the fixture teardown (`payload-lifecycle.ts` `pool.end`) racing the abort. No DB instance was created.

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (MEDIUM) |
| Santa A | PASS (3 LOW) |
| Santa B | PASS (3 LOW) |

The Santa reviews were independent. Specialist findings:
- MEDIUM: the identity path still re-reads `req.transactionID`, so a getter can flip between the check and the adapter call.
- MEDIUM (pre-existing): the Payload pg pool has no listener for `error` on the pool or on borrowed clients. `next start` logs uncaught exceptions without exiting; a CLI or script process crashes.

All three reviewers confirm the listener gap. Next: [remediation-3.md](remediation-3.md).

Remediation 3: dispatched as Task `task_28be5bb4ba32`, Dispatch `ctx_d84adb5ddb7e`, in the existing worktree. Submitted with Cmd+Enter.

## Remediation 3 handback, 2026-11-13

The candidate is `89e4957`, outcome failed (RED-03).

In real PostgreSQL, these passed:
- baseline;
- COMMIT rejection;
- connection kill, including counts and retry.

RED-03: the dedicated rollback-rejection test's post-kill `effects(db.pool)` read was rejected with "Connection terminated unexpectedly". It ran on the same Payload pool as the killed session.

The container and volume were removed, and the runtime was released. Review rubric: [review-rubric-r3.md](review-rubric-r3.md).

## Fix review 3, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (1 MEDIUM) |
| Santa A | PASS (3 LOW) |
| Santa B | PASS (4 LOW) |

The two Santa reviews were independent. The identity snapshot passes in all three reviews.

**MEDIUM finding (specialist; the Santa reviews rate it LOW).** The `pool._clients` sweep in `onInit` has no guard. If pg-pool changes, `onInit` throws and the site cannot boot.

**RED-03.** All three reviewers classify it as expected pg/pg-pool behaviour, not a production defect. The rollback is rejected by FATAL while `_queryable` is still true. Drizzle then releases the client without an error, LIFO checkout reuses the dead client, and the first query fails once. The payment path fails closed with an unknown result.

The underlying problem is fixture design: the kill and the counts use the pool under test. Next step: [remediation-4.md](remediation-4.md).

Remediation 4: Task `task_21f8d14ff472`, Dispatch `ctx_034f0d396e8a`. Submitted with Cmd+Enter.
