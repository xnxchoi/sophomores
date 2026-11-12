# SPH-I18N-KOMIRROR-20261113-01 — dispatch custody

Dispatched by the custodian under the owner's Korean mirror decision and fallback activation of 2026-11-13.
The spec is frozen at main `32a3045`.

- Run `run_8a16b71cf6a4`, Task `task_ed3d62494337`, Dispatch `ctx_f1ef0d693f3e`.
- Worktree `/Users/seanschoi/orca/workspaces/sphmrs/ko-mirror-20261113`.
- Agent: Codex, default model, setup skipped.
- Prelaunch admission: 14.00 GiB available, 11.19 GiB accounted, with the T002-A
  worker live.
- The task arrived as an unsent draft. The custodian submitted it with Cmd+Enter, and
  the worker's screen then showed "Working".

## Acceptance and integration, 2026-11-13

Reviews:

| Cycle | Specialist | Santa A | Santa B |
|---|---|---|---|
| 1 | PASS | FAIL | FAIL |
| 2 | PASS | PASS | FAIL |
| 3 | not re-run (docs-only delta) | PASS | PASS |

Each failure was stale rule wording in a live document. The two Santa reviews were independent in every cycle.

- Candidate `15710d4` was merged at main `48a256d`.
- Integration gate on main `16a07eb`, after the T002-A merge:
  - full typecheck: exit 0, peak 2.40 GB, no remaining PIDs;
  - default suite (`node tests/run-unit.mjs`): 2,687 tests, 2,646 pass, 2 fail (the known deferred-styling tests), 39 skipped, no remaining PIDs.
- Both runs used `resource-guard.py`, with DB/provider environment variables unset.
- The worker runtime was released. Its transcript was captured and the worktree is retained.
