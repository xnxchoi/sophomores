# SPH-T004-I3-20261114-01 — dispatch custody

- Owner go given 2026-11-14 ("start now; a reset is banked").
- Spec frozen at main `7fa978d`.
- Run `run_8a16b71cf6a4`, Task `task_0fced47e6f1b`, Dispatch `ctx_98c110b8736b`, terminal `term_59a27403-e73d-4c3a-a6ee-dc5901f46cdc`.
- Worktree `orca/workspaces/sphmrs/t004-i3-20261114`. Codex default model.
- Admission: 10.25 GiB accounted and 15.57 GiB available.
- Prompt submitted with Cmd+Enter; "Working" confirmed.

**Scope.** I3 is provider-free: a real disposable PostgreSQL, synthetic signed webhooks, and synthetic provider GETs. The TEST-key sandbox matrix (up to 30 payments plus webhook registration) is the next separate assignment. Real webhook delivery to a local server would need a public tunnel, which needs its own owner approval.

## Hold and handback, 2026-11-14

The custodian sent a HOLD for the owner-ordered scope review. The worker was mid-turn and did not process it before finishing.

It committed candidate `fe1fcd0` (source `a4aa3e7`: 3 src files, +25/-3, retained-risk settlement stops). The worker reports DB matrix 18/18, typecheck pass, and default suite 2,900 passing with the 2 known failures.

**Not reviewed or integrated.** It is held as evidence pending the scope-review decision. The runtime was released.

Orca auto-created a delivery dispatch for the queued HOLD (`ctx_cd6c89cbd132`). It was lost because the terminal was being released. It was deliberately not retried; the hold is moot.
