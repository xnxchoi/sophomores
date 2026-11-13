# RED-03 - rollback-rejection post-kill count rejects on the control pool

## Observed failure and stop boundary

The remediation-3 matrix on PostgreSQL 16.15 passed baseline settlement/replay,
actual COMMIT rejection/retry, and connection-kill with a **completed** post-kill
effect count plus successful retry. It then stopped at the dedicated
`rollback-rejection` subtest. The payment operation rejected with outcome unknown,
the backend-termination assertion passed, and the trace contained a native
ROLLBACK attempt. The following effect-count query rejected with
`Connection terminated unexpectedly`; it did not return effect counts.

The failure is at `payment-durability.db.test.ts:99`, calling `effects(db.pool, f)`,
and at `payment-postgres-fixture.ts:188`, awaiting `pool.query`. The report contains
an ordinary awaited query rejection, not the previous `Cannot use a pool after
calling end on the pool` error. No unhandled-event test failure is reported in
this run. This does **not** establish that every possible driver-event timing is
safe, nor classify the new failure as exclusively production or fixture behavior.

No retry, extra database probe, fixture correction, driver patch, or production
remedy followed this failure. The instance and its dedicated volume were removed.
Risk persistence, separate-connection concurrency, and SIGKILL/restart were not
reached. Full I0DB acceptance remains failed.

## Exact failed query

This is the complete query in `effects`; values are the failing fixture's
transaction ID, product ID and customer ID, passed as parameters, not literals.

```sql
SELECT
  (SELECT count(*)::int FROM orders WHERE commerce_attempt_i_d=$1::text) AS orders,
  (SELECT inventory::int FROM products WHERE id=$2::uuid) AS stock,
  (SELECT reserved_quantity::int FROM products WHERE id=$2::uuid) AS reserved,
  (SELECT paid_quantity::int FROM commerce_allowances WHERE customer_id=$3::uuid AND release_i_d=$2::text) AS allowance,
  (SELECT count(*)::int FROM commerce_admissions WHERE transaction_id=$1::uuid) AS admissions,
  (SELECT count(*)::int FROM orders WHERE commerce_attempt_i_d=$1::text AND fulfillment_status='pending') AS fulfillment,
  (SELECT status FROM transactions WHERE id=$1::uuid) AS status
```

## Connection identity: established facts versus missing telemetry

| Operation | Actual connection API and ownership |
| --- | --- |
| Observe uncommitted order / obtain kill target | `nativeProgress(req, f)` obtains the owned session through `adapter.sessions[transactionID].db` and executes `SELECT pg_backend_pid(), ...` on that native transaction client. It observed one order and stock 10 before the kill. |
| Terminate target | `db.pool.query("SELECT pg_terminate_backend($1) AS killed", [progress.pid])`, at test line 91, uses an automatic control acquisition from the Payload adapter's **same pool** and targets the native session's PID, not the control query's own PID. It returned `killed=true`. |
| Inject callback failure | The order after-change hook throws the fixed fixture error immediately after the termination query returns, at test line 94. |
| Count after unknown outcome | `effects(db.pool, f)` uses `pool.query` on the **control pool**, not `nativeSession(req).execute` or a retained direct reference to the killed transaction client. The pool is the very same `payload.db.pool` used by the transaction adapter and by the kill query. It is not a separate Pool instance or a guaranteed fresh backend. |

Thus, **yes, the post-kill effects read used the pool whose borrowed native
transaction client was killed**. The count's concrete checked-out client/backend
PID was not captured. The retained output cannot establish whether this automatic
acquisition reused the killed transaction client, reused the previous control
client, or used another client; no such identity is claimed. Pool-level API
separation is not evidence of physical-backend separation.

## Bounded receipt and remaining decision

- Matrix exit 1: 5 tests reported, 3 passed, 2 failed (dedicated subtest and outer
  test), 0 cancelled, 0 skipped.
- Guard peak 467,664,896 bytes; no remaining workload PIDs; no resource stop.
- The new hook emitted only its fixed `Payload storage is unavailable.` message
  on its listener paths; query rejections still reached the awaited operations.
  Existing installed plugin diagnostics are not rewritten by this assignment.
- No success was reported for the failed dedicated scenario. Because its count
  rejected, no post-kill settlement/partial-effect conclusion or retry proof is
  credited to that scenario.
- Custodian must classify and scope any subsequent connection/pool or fixture
  remediation and authorize further real-database work. The coordinator expressly
  prohibited another DB run or RED-03 fix in reply `msg_d59800c207b3`.

## Remediation 4 - source-based mechanism, inference only

The later remediation-4 dispatch authorized a fixture-only independent control
Pool and one new disposable-database matrix. It supersedes the earlier no-rerun
boundary only for that bounded work; it does not alter the RED-03 observations.

The reviewers' stale-client timing mechanism is plausible from the installed
sources, rechecked locally (package-relative citations):

- `drizzle-orm/node-postgres/session.js:180-194` (0.45.2) borrows a Pool client,
  attempts ROLLBACK in `catch`, and unconditionally calls `release()` without an
  error argument in `finally`, even when ROLLBACK rejects.
- `pg-pool/index.js:384-398` (3.14.0, resolved by adapter pg 8.20.0) removes a
  released client when an error is supplied or `_queryable` / `_ending` flags
  already indicate failure. Otherwise it can return to the idle list
  (`index.js:427-428`); the next acquisition can pop that client
  (`index.js:156-164`).
- `pg/lib/client.js:397-409` (adapter-resolved 8.20.0) delivers a backend error
  to an active query without itself marking the client unqueryable there.
  `_handleErrorEvent` sets `_queryable=false` (`client.js:387-393`), while the
  socket `end` handler reports `Connection terminated unexpectedly` and errors
  outstanding queries (`client.js:179-199`).

**Inference, not a captured execution trace:** a transaction's failure/release
could precede the driver's disconnect bookkeeping, leaving a short interval in
which a same-pool observation can acquire a dying client and reject when the
disconnect arrives. No control-read PID was captured for RED-03, so neither reuse
of that client nor this exact event ordering is established. Passing remediation
4 with an independent Pool removes the fixture's shared-pool coupling; it does
not retroactively prove the RED-03 PID or classify every production timing.
