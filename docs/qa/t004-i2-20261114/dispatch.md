# SPH-T004-I2-20261114-01 — dispatch custody

- Spec frozen at main `13d5b98`. Owner approved the I2 numeric policy in the live plan doc (schedule corrected and reconfirmed 2026-11-14).
- Run `run_8a16b71cf6a4`, Task `task_a7c2bbd23d97`, Dispatch `ctx_f01456881195`, terminal `term_5326e229-2901-4ed4-8fcd-f9dfb941de3f`.
- Worktree `orca/workspaces/sphmrs/t004-i2-20261114`, Codex default model (Auto, high).
- Admission: 8.95 GiB tool-accounted, 13.4 GiB available before launch. Docker VM memory is outside the census; the DB proof's container counts against headroom.
- Prompt submitted with Cmd+Enter; "Working" confirmed on screen.
- Note: the Codex client reported about 15% of its weekly limit left at launch.

## Resume, 2026-11-14

Held for the Payload relocation, which was integrated and pushed at `0376179`. Amendment 1 (`f8ff6ea`) supersedes the placement lines. Resumed on the same dispatch and terminal; prompt submitted with Cmd+Enter and "Working" confirmed.

## Incident, 2026-11-14: pnpm touched the shared node_modules

The approved `pnpm generate:types` (synthetic env) exited 0 and added 31 expected type lines. pnpm 12 also ran its install verification first, and pending postinstall hooks (`@parcel/watcher`, `@swc/core`, `unrs-resolver`), against the shared `node_modules` symlink.

The custodian checked the result. Package directories are unchanged (newest Nov 10). `.modules.yaml` and `.pnpm/lock.yaml` metadata were rewritten at 05:03; the only difference from the repo lockfile is the packageManager stanza. No tracked package or lockfile changed.

The worker stopped on its own. It now uses direct guarded `node` commands. Shared rules now forbid pnpm/npm/yarn scripts in worker checkouts.
