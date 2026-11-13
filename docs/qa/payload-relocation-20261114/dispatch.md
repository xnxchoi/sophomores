# SPH-PAYLOAD-RELOCATION-20261114-01 — dispatch custody

- Owner directive 2026-11-14: Payload code moves out of `src/lib` into `src/payload` (AGENTS.md "Payload code placement", `76ce943`).
- Spec frozen at main `d5a32e7`. Run `run_8a16b71cf6a4`, Task `task_eb4bd1c51a6f`, Dispatch `ctx_c168068dfe11`, terminal `term_0e6020bb-13d1-4139-b430-450721a182e5`.
- Worktree `orca/workspaces/sphmrs/payload-relocation-20261114`; Claude worker, model `claude-sonnet-5-5` (lightweight, mechanical move; Codex weekly budget about 15%).
- Admission: 10.66 GiB tool-accounted, 13.04 GiB available before launch.
- Effect on I2: SPH-T004-I2-20261114-01 holds at a clean pre-implementation point (handback notes only, no source changes) until this relocation is integrated. Its earlier placement approvals (`src/lib/migrations`, `domain.ts`, `payload.config.ts`) are superseded.
