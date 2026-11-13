# SPH-T004-I0DB-20261113-01 — I0 payment completion: real PostgreSQL fault, concurrency and restart proof

Slug `t004-i0db-20261113`, branch `codex/t004-i0db-20261113`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with these exceptions:

- Your identity base is **the main commit that adds this file**.
- Persist your handback as `docs/qa/t004-i0db-20261113/handback.md`.
- **DB exception:** the owner approved this on 2026-11-13 (registry T004). You may run
  one **new, disposable, loopback-only PostgreSQL instance** for this proof and then
  wipe it.
  - Use a new container name and a non-default port, bound to `127.0.0.1`. The
    existing `postgres` dev container and its data are off-limits: do not start,
    stop, connect to or modify it.
  - No provider, PortOne or network calls beyond loopback.
  - Record the container's lifecycle, and remove the container and its volume at the
    end.
  - Count its memory against the shared headroom limits.

**Contract:** the I0 row of the [T004-A design](../t004-a-20261111/reconciliation-design.md)
§6 ("Separately authorized isolated local PostgreSQL fault/concurrency/restart proof is
mandatory before financial durability claims"), together with the integrated I0 code
(`src/lib/commerce/_shared/transaction.ts`, `ecommerce.ts`, `portone/adapter.ts`,
`portone/review.ts`).

**Owned paths:** new tests under `tests/commerce/core/` with the `*.db.test.ts` naming
(or the existing opt-in DB-test convention, with `COMMERCE_PAYLOAD_DATABASE_TESTS` set
only for these runs), test fixtures under `tests/`, and `docs/qa/t004-i0db-20261113/`.
**Source changes are not owned.** If the proof finds a defect, record it as a RED
result with its exact reproduction and stop. Do not fix `src/`; the custodian scopes
the fix.

## Acceptance

1. Against a real PostgreSQL instance, the suite shows the following, using the
   installed Payload/drizzle native transaction API:
   - A commit acknowledgement produces exactly one settlement effect.
   - Injected faults (connection kill mid-transaction, COMMIT rejection, rollback
     rejection, and a process kill between settlement effects) never leave a
     reported success with partial effects. The observed risk persists or stays
     unknown and recoverable.
   - Concurrent confirmations of the same attempt across separate connections settle
     it once.
   - A restart after a crash recovers without duplicating effects.

   Count effects in the database: orders, stock, allowance, admissions and
   fulfillment.
2. The evidence states exactly what was and was not proven: local single host, the
   PostgreSQL version, no provider, and no multi-node deployment. It keeps any RED
   results as findings. Receipts plus bounded excerpts only, with no raw logs and no
   home paths.
3. The default suite, run without the DB environment variable, still shows only the 2
   known failures. The DB tests are skipped by default. The disposable instance is
   removed, with the removal confirmed by `docker ps -a` and a volume check recorded
   in the handback. `git diff --check` is clean.

Commit only new commits, and send one `worker_done`.
