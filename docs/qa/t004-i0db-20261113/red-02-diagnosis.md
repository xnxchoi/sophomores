# RED-02 — driver error propagation followed by test teardown

## Decision: not confined to the fixture; do not rerun PostgreSQL

Both layers are implicated. The ended-pool message comes from test-owned cleanup,
not from a PostgreSQL transaction automatically ending its pool. However, the
installed production driver/adapter path can emit an unhandled connection error
outside the awaited transaction promise. Rearranging teardown alone does not
establish safe production propagation. The remediation-2 condition for creating a
new database instance is therefore **not met**. No instance was created, no fixture
or driver was patched, and no RED-02 production remedy was implemented.

This is installed-source diagnosis of the retained remediation-1 failure, not a
new instrumented database reproduction. The historical evidence does not identify
the listener or exact socket-event timing; in particular, it does not prove the
escaped error was a pool idle-client event rather than a checked-out client event.
Neither ambiguity permits a fixture-only classification or a production-crash claim.

## Installed identities and source locations

All package paths below are relative to `node_modules/`. Source resolution from
`@payloadcms/db-postgres` selects **pg 8.20.0**, **pg-pool 3.14.0**, and Drizzle ORM
**0.45.2** with its pg-8.20.0 peer context. The root application's declared pg
8.23.1 is not the driver's runtime identity. Payload/Postgres/Drizzle adapter
packages are **3.92.1**. Node is **v26.13.0**; its built-in sources below were read
from the running binary's native-source registry, not fetched from the network.

| Source | Exact relevant behavior |
| --- | --- |
| `.pnpm/pg@8.20.0/node_modules/pg/lib/client.js:179-199` | Unexpected socket end creates the connection-terminated error, errors pending queries, and also invokes client error-event handling. |
| Same file `:387-409` | Error handling marks the client non-queryable, errors queries and emits `error`; backend error messages without an active query take this event path instead of only rejecting a query. |
| Same file `:625-633` | Query-promise rejection recaptures the stack at the application query. A rollback/query stack alone does not establish the original socket event's listener or exclude an out-of-band event. |
| `.pnpm/pg-pool@3.14.0_pg@8.20.0/node_modules/pg-pool/index.js:335-344` | Checkout removes the idle error listener from the borrowed client. An idle-pool listener alone would not handle a borrowed-client error. |
| Same file `:51-62,384-397` | Release reattaches the idle listener; broken clients are removed; idle errors remove the client and emit `error` on the pool. Without a pool listener that is another uncaught-error route. None of these paths calls `pool.end`. |
| Same file `:488-498,190-193` | Only explicit end sets the `ending` flag here; subsequent connect/query acquisition rejects with the ended-pool message. |
| `.pnpm/drizzle-orm@0.45.2_@types+pg@8.20.0_kysely@0.28.18_pg@8.20.0/node_modules/drizzle-orm/node-postgres/session.js:100-125,180-194` | Native transaction borrows a pool client, awaits callback/COMMIT, attempts ROLLBACK on error and releases in `finally`; query execution calls the client directly. This path installs no client error-event handler and never ends the pool. |
| `@payloadcms/db-postgres/dist/connect.js:4-38,44-56` | Reconnect error listener is attached to the retained startup client only. Pool construction and Drizzle binding add no pool-wide or per-transaction borrowed-client error handler. |
| `@payloadcms/drizzle/dist/transactions/beginTransaction.js:20-47` | Separate native begin lifts completion methods into its registry; its catch rejects the initialization waiter. This does not install a driver error listener. The payment owner uses native Drizzle directly instead. |
| `@payloadcms/drizzle/dist/transactions/commitTransaction.js:1-15` and `rollbackTransaction.js:1-13` | Registry methods remove/end sessions; neither closes the pool. Commit's catch invokes session rejection; this is not handling an EventEmitter error. |
| `payload/dist/index.js:113-121`; `@payloadcms/drizzle/dist/destroy.js:2-14` | Payload destroy stops crons and invokes adapter destroy; this installed adapter destroy clears schema/Drizzle state but does not end the pool. |
| `node:internal/test_runner/harness:118-165,254-257,326-327` | Runner catches process uncaught errors, attributes them to the originating async resource's test, fails it and aborts that test. A socket created in the outer fixture can therefore fail the outer test, not merely reject the current subtest's promise. |
| `node:internal/test_runner/test:1340-1343,1381-1409,1429-1450` | Test body races its abort/stop promise; on failure, after hooks run even if the body promise has not finished. Aborting the test is not cancellation of all application promise continuations. |

## Fixture lifecycle and causal chain

1. `tests/commerce/core/payment-postgres-fixture.ts:90-97` captures the lifecycle
   cleanup after Payload initialization and exposes the same driver pool for
   independent control/count queries. The outer test registers that cleanup at
   `tests/commerce/core/payment-durability.db.test.ts:35-36`.
2. The connection-kill hook at that test's `:80-88` first completes a native
   progress query and then waits on a different connection to terminate the native
   backend. The transaction client can receive the backend/socket failure with
   no active query, or as connection-end processing alongside a failed query.
   The two out-of-band driver error routes above are production behavior, not
   fault-listener logic invented by this fixture.
3. The payment promise reports unknown through
   `src/lib/commerce/_shared/transaction.ts:291-315` and the endpoint boundary at
   `:152-170`; this catches promise rejection, not an uncaught driver error event.
   An unknown response therefore does not prove the absence of a separate escaped
   event. The earlier run retained both the unknown outcome/rollback attempt and
   the outer connection-terminated failure.
4. An uncaught event attributed to the outer test aborts its body race, causing its
   after hook to begin while the connection-kill subtest's continuation can still
   run. `tests/support/payload-lifecycle.ts:18-25` rolls back registered sessions,
   calls Payload destroy, releases the retained startup client and explicitly
   awaits `pool.end()` in `finally`. **This fixture call is the pool-ending cause**;
   Payload destroy by itself is not.
5. The subtest already awaits `assert.rejects(attempt.run())` at `:90`, before its
   effect read at `:93`. It is not simply missing an await of the request outcome.
   That awaited outcome does not join an outer test's separately triggered cleanup.
   Once cleanup marks the pool ending, the still-running effect query reaches
   pg-pool `:190-193` and fails. This explains the ended-pool symptom plus the
   separate escaped connection error without treating their printed report order
   as the order in which the underlying events occurred.

The source establishes why this failure is possible and why the ended-pool
message is teardown-related. Without the removed instance/raw event telemetry,
it cannot establish the precise first emitter or timing in the historical run.
Production error propagation remains implicated either way, so the safe required
decision is to stop the matrix, not to label it fixture-only and retry.

## Proposed remedy — approval required, not implemented

1. Scope production ownership of pool **and checked-out transaction-client** error
   events at the adapter lifecycle boundary. Handling must record a bounded cause,
   terminate/invalidate the affected native operation, propagate unknown rather
   than financial success, and dispose of failed clients. An empty pool listener,
   swallowed exception, or driver patch is not a remedy; a pool listener alone
   misses checkout-time errors.
2. Review settlement/rejection and listener cleanup together so the native
   completion promise is authoritative and no background error is hidden. Prove
   checked-out and idle client failures separately before reauthorizing the full
   PostgreSQL matrix. No specific implementation is accepted by this diagnosis.
3. Then scope fixture cleanup to join all in-flight application operations before
   ending the pool, including abnormal runner abort paths, and obtain independent
   post-kill counts only after the operation has settled. That test-only ordering
   hardening can remove the secondary ended-pool symptom, not the production
   propagation defect. Keep uncaught errors visible; do not add a swallowing
   listener or patch the driver to force the matrix green.

Still unproved: completed post-kill counts/retry, dedicated rollback rejection,
risk persistence, separate-connection concurrency and SIGKILL/restart. Prior
baseline and COMMIT-rejection evidence remains historical, not a rerun of the
remediation-2 candidate. No financial durability, provider or deployment acceptance.
