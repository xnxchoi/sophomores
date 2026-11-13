# SPH-T004-I1-20261113-01 — dispatch custody

- Spec frozen at main `a440c99`.
- Run `run_8a16b71cf6a4`, Task `task_8dc0a87f80f4`, Dispatch `ctx_c56cbc6d69e8`.
- Codex, default model.
- Admission: 12.27 GiB accounted and 21.7 GiB available before launch.
- The custodian submitted the task with Cmd+Enter.
- I0DB is held until memory frees, because the Docker VM memory is outside the census.

## Scope extension, 2026-11-13

The worker asked to mount the result GET. The custodian approved two registration edits: the mount in `endpoints.ts`, and an exact-path read-only bypass in `secureEndpoint`, mirroring `/pending`. The endpoint must enforce its own GET and read authority (`assertCommerceBrowserRead` plus an own-account check), with RED tests for non-GET, foreign-account refusal, zero mutations and the unchanged existing bypasses. The wake-up was submitted with Cmd+Enter.

## Handback, 2026-11-13

The candidate is `c5cb02f` (source and test diff `ef58dfe2…5fd61`). The custodian verified its scope, diff-check, endpoint mount and bypass, and released the runtime (output archive kept). Cycle-1 reviews are running: security, Santa A and Santa B, against [review-rubric-c1.md](review-rubric-c1.md).
