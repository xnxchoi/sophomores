# SPH-T004-I0DB-20261113-01: remediation 4, 2026-11-13

Resume in the existing worktree from candidate `89e4957`. The original spec and remediations 1–3 still apply.

## Required

1. **`onInit` fails safely** (`src/payload.config.ts:41-43`, specialist MEDIUM).
   - Read `_clients` with `Reflect.get`.
   - Enumerate it only when `Array.isArray`, and attach a listener only to entries with `typeof c.on === "function"`. Otherwise skip enumeration. The `connect` listener still covers new clients.
   - Write the RED tests first:
     - `_clients` absent or not an array: init succeeds, and new clients are still covered;
     - a client both enumerated and later emitted by `connect`: it gets one listener (WeakSet dedupe).
   - No other config change.
2. **Independent control connection** (RED-03, fixture only).
   - In `tests/commerce/core/payment-postgres-fixture.ts`, add a dedicated `max: 1` control `Pool` outside Payload. Point it at the same allowlisted loopback port and give it its own error listener.
   - Use it only for the kill (`pg_terminate_backend`) and the independent effect counts (`payment-durability.db.test.ts:91,99` and peers).
   - End it in `close`.
   - Do not change the production pool. Add no retry.
3. **Teardown reporting** (`tests/support/payload-lifecycle.ts`).
   - Keep the join, and surface rejected continuations: report them after cleanup and do not discard them.
   - Add a bounded join timeout that fails loudly.
4. **Handback documentation.**
   - Under `payload migrate` and `generate:*` (`disableOnInit`) the hook does not run. Record this as accepted fail-fast behaviour for those runs.
   - Record the RED-03 mechanism with the reviewers' source citations, as an inference only. No PID was captured.
5. **Real PostgreSQL rerun.** This is covered by the owner's standing approval for local disposable databases, and runs only after items 1–3 are GREEN.
   - Use one **new** disposable loopback instance under the original spec's rules. Do not touch any existing container or volume. Remove the new instance and its volume at the end.
   - Run the **full matrix**: baseline, COMMIT rejection, connection kill, dedicated rollback rejection (each with completed counts from the control connection, plus retry), risk persistence, separate-connection concurrency, and SIGKILL restart.
   - If a new defect appears, record it as RED-04 and stop.

## Gates

- One full typecheck of the exact final source, with `--max-gib 3.5 --node-old-space-mib 2048 --min-headroom-gib 10 --timeout 600`.
- The default suite shows only the 2 known failures.
- `git diff --check` is clean.

**Owned paths:**
- `src/payload.config.ts` (the hook only)
- `tests/support/payload-lifecycle.ts`
- `tests/commerce/core/*`
- `docs/qa/t004-i0db-20261113/`

Commit as new commits, with no amend. Add a "Remediation 4" handback section, then send one `worker_done`.
