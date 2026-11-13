# SPH-T004-I0DB-20261113-01 — dispatch custody

The spec is frozen at main `a440c99`. Run `run_8a16b71cf6a4`, Task `task_ad03b8726b76`, Dispatch `ctx_3413c7008a44`, Codex. Before launch, 8.99 GiB was accounted and 22.7 GiB was available. The Docker daemon was running with no containers. The owner approved the disposable loopback PostgreSQL on 2026-11-13. The task was submitted with Cmd+Enter.

## RED-01 and remediation, 2026-11-13

Candidate `61edde8` failed on real PostgreSQL 16.15. The `findByID` transaction-only request projection is rejected by the I0 ownership proxy (RED-01). The disposable container and volume are confirmed removed, and the pre-existing containers are untouched. The custodian accepted the defect and authorized a narrow fix plus the full matrix: see [remediation-1.md](remediation-1.md). It was sent as a follow-up to the same worker.
