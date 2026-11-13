# SPH-PAYLOAD-RELOCATION-20261114-01 — dispatch custody

- Owner directive 2026-11-14: Payload code moves out of `src/lib` into `src/payload` (AGENTS.md "Payload code placement", `76ce943`).
- Spec frozen at main `d5a32e7`. Run `run_8a16b71cf6a4`, Task `task_eb4bd1c51a6f`, Dispatch `ctx_c168068dfe11`, terminal `term_0e6020bb-13d1-4139-b430-450721a182e5`.
- Worktree `orca/workspaces/sphmrs/payload-relocation-20261114`; Claude worker, model `claude-sonnet-5-5` (lightweight, mechanical move; Codex weekly budget about 15%).
- Admission: 10.66 GiB tool-accounted, 13.04 GiB available before launch.
- Effect on I2: SPH-T004-I2-20261114-01 holds at a clean pre-implementation point (handback notes only, no source changes) until this relocation is integrated. Its earlier placement approvals (`src/lib/migrations`, `domain.ts`, `payload.config.ts`) are superseded.

## Reviews and integration, 2026-11-14

| Review (rubric c1, candidate `90c5cf6`) | Verdict |
|---|---|
| Specialist (code-reviewer) | PASS (1 MEDIUM: importMap identifiers kept old-path md5; 2 LOW) |
| Santa A | PASS (LOW only) |
| Santa B | PASS (LOW only) |

Rework 1 (`5b61861`, code `caa5f8b`) fixed the MEDIUM: identifiers now use md5 of the new component paths, and a new test (`tests/payload/import-map-identifiers.test.ts`) recomputes them. Living CODEMAPS/port-status/member-auth docs were updated. The custodian re-verified every importMap key against Payload's `exportName_md5(path)` rule (0 mismatches) and ran diff-check.

Integrated at main `00d8e5a`. On the merged tree: guarded full typecheck exit 0 (peak 2.39 GB), and the default suite has 2,888 tests, 2,846 passing, and only the 2 known deferred-styling failures.

Not run (provider-free scope): `next build`, Payload CLI generation, DB-backed tests. Open LOW items: the motion-policy scan list doesn't include `src/payload`, and some historical docs keep old paths.
