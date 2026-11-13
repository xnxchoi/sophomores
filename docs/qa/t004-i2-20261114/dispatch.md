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

## Handback and cycle-1 reviews, 2026-11-14

The candidate is `8dd7703` (code `4f18e34`). The worker reports: final typecheck passed; disposable PostgreSQL proof 7/7, with the container and volume removed; default suite 2,859 passing with only the 2 known failures.

The custodian verified scope and placement: the new collection `src/payload/collections/commerce-reconciliations`, registered in `domain.ts`, with one additive migration under `src/payload/migrations/`. diff-check is clean.

Known finding: the raw evidence logs contain about 85 home-path lines. They must not be committed before merge.

Cycle-1 reviews are running against [review-rubric-c1.md](review-rubric-c1.md): security, database, Santa A and Santa B.

## Cycle-1 reviews, 2026-11-14

All four reviews failed: security, database, Santa A and Santa B. The custodian confirmed three HIGH findings against the source: pool starvation, a proven rejection recorded as unknown, and webhooks acknowledged then dropped. The custodian also ruled that automatic-check gating applies to automatic checks only.

Corrections: [rework-1.md](rework-1.md). Cycle 1 of 3.

## Rework 1 progress, 2026-11-14

Rework 1 is running under a new Orca task id (Task `task_54fe3e2750ef`, Dispatch `ctx_d697fdd4b408`) on the same terminal. The worker reports: focused tests 41/41 and a typecheck pass.

The expanded DB run hit test-isolation contamination: one contender exited while still holding a global reservation. The custodian approved a fixture-only shutdown-handshake fix, plus one rerun of the DB proof, the typecheck and the suite. Production keeps a crashed holder's reservation until expiry, and a test must prove that.

## Rework 1 handback, 2026-11-14

Candidate `61f5ceb` (code `7ecc6c7`), with the approved `paymentTransactionOutcome` read-only export.

The worker reports: DB proof 10/10, including retention of a crashed holder's global reservation; exact-final typecheck passes; default suite 2,873 passing with only the 2 known failures.

The custodian verified hygiene (no home paths or raw logs in I2 files) and diff-check. Cycle-2 reviews are running: [review-rubric-c2.md](review-rubric-c2.md).

## Cycle-2 reviews, 2026-11-14

All four reviews FAILED again: security, database, Santa A and Santa B. The new defects are:
- a settled attempt's Paid webhook gets a 409 retry loop (all four reviewers);
- a ledger-pool acquire failure fences the attempt permanently;
- a refused first delivery spends the risk reserve.

The custodian ruled that Paid webhooks are not gated by the automatic cooldown or the 30-minute escalation. Corrections: [rework-2.md](rework-2.md). This is cycle 3 of 3, the last.

## Rework 2 progress, 2026-11-14

The rework runs as Task `task_e32fbde7fa4f` (Dispatch `ctx_4c71c4ee138b`). Approved scope extensions:
- export `projectLocalResult` unchanged;
- in `tickets/portone/runtime.ts`, a typed completed-response error with text-then-JSON body classification; request, deadline and headers unchanged.

**I1 defect found.** The DB proof found that the integrated I1 result decoder (`result.ts`) rejects real plugin-persisted order shipping addresses: `recipientName` missing, nullable `addressLine2`, extra plugin fields. As a result, a settled attempt's Paid webhook stays 409, and the buyer result GET would fail on real orders.

The custodian approved a bounded fix in `result.ts` only: shape derived from the plugin config and the snapshot writer; unknown fields stripped; field-by-field strict comparison; regression test from a real row.
