# T004 I0 PostgreSQL proof — RED handback

**Assignment:** SPH-T004-I0DB-20261113-01
**State:** review checkpoint; failed acceptance, stopped at the first production compatibility defect. No source fix made.

## Identity and candidate

- Initial HEAD: `f787a43cf520379b6c55839856dc166473cdd593`; initial tracked tree clean.
- Spec identity base: `a440c9942aed88a6583ca04d921f9c784d5cd267`, verified ancestor of initial HEAD.
- Branch: `codex/t004-i0db-20261113` (renamed from Orca-created `xnxchoi/t004-i0db-20261113`).
- Checkout: `sphmrs/t004-i0db-20261113`; home prefix intentionally omitted.
- Candidate HEAD: the new commit containing this handback, reported separately in worker_done; no amend, merge or push.
- Diff SHA-256: `66fe89fec40a512901a9214a73539d66d0382f60f0457b85c92da353b7415c9d` (staged candidate patch excluding this self-referential handback).
- Changed paths: this handback, `evidence.json` beside it, `tests/commerce/core/payment-durability.db.test.ts`, and `tests/commerce/core/payment-postgres-fixture.ts`.

## RED-01 — native Payload findByID is rejected by payment ownership guard

**Observed:** both real-database baseline runs failed during reservation preparation, before any payment confirmation or injected fault. The first run reported `Payment transaction outcome unknown`, caused by `Payment transaction ownership lost`. A diagnostic rerun preserved the first inner error: `Payment operation requires its owned request`.

**Exact path:** `seedAttempt` opens the production `inPaymentTransaction`, then calls production `reservePurchase`. Its event read at `src/lib/commerce/reservations.ts:56` goes through `readCommerce` and the real Payload Local API. Installed Payload 3.92.1 constructs `findOneArgs.req` as a fresh transaction-only object in `node_modules/payload/dist/collections/operations/findByID.js:101-110`, then sends it to `req.payload.db.findOne` at lines 148/152. The production proxy at `src/lib/commerce/_shared/transaction.ts:193-196` requires the exact original request object, marks this legitimate internal adapter call contaminated and rejects it. The transaction boundary subsequently returns unknown rather than a known financial success.

This is a real installed Local API compatibility failure, not an injected COMMIT failure or evidence of successful partial settlement. The earlier synthetic fixture did not execute this internal Local API projection. The initial fixture rows deliberately use raw adapter preparation; the failing reservation uses unchanged production domain code, actual Local API reads and native transactions.

**Read-only database observation after both failed runs:** zero orders, allowances, reservations and admissions; two fixture transactions remained pending; both products retained inventory 10 and reserved quantity 0. Because there were no orders, there were no order-embedded fulfillment groups. No successful settlement effect, fulfillment transition, quarantine durability or retry recovery was proven.

**Custodian action:** scope a source remedy for native internal request projection without weakening transaction/session ownership. Do not simply remove identity checks or accept arbitrary caller-supplied transaction IDs. Obtain specialist review, then reauthorize the disposable database proof and run its full remaining matrix. This worker neither changes source nor claims that remedy is designed or accepted.

## Acceptance matrix and progress panel

| Required proof | Result |
| --- | --- |
| Real PostgreSQL/native Payload and Drizzle connection | Exercised on PostgreSQL 16.15, single local host |
| Commit acknowledgement, one complete settlement, retry once | **RED precondition**; preparation failed before confirmation |
| Connection kill mid-transaction | Not run: stop-on-defect |
| COMMIT rejection | Not run: stop-on-defect |
| Rollback rejection and observed risk persistence/unknown recovery | Not run: stop-on-defect |
| Process kill between settlement effects | Not run: stop-on-defect |
| Separate-connection concurrent confirmations | Not run: stop-on-defect |
| Restart after crash without duplication | Not run: stop-on-defect |
| Database effect counts | Read-only post-failure counts only; no complete settlement count accepted |
| Default discovery without DB opt-in | 2,752 pass, **2 known failures**, 40 skipped; new DB test skipped |
| Scoped lint | Pass |
| Container and volume removal | Confirmed |
| Source unchanged / diff whitespace | Confirmed; `git diff --check` clean |

**Prioritized final-pass risks:** (1) fix the demonstrated native projection incompatibility; (2) prove every settlement effect and real SQL fault boundary; (3) prove independent quarantine and crash/restart recovery; (4) prove separate-connection concurrency; (5) preserve provider, schema/migration and multi-node gates. No background work or listener remains active.

## Checks and bounded receipts

See [evidence.json](evidence.json) for original guard receipt fields, bounded excerpts, database observations and lifecycle results. Raw logs are not delivered.

| Run | Exit | Result | Guard peak bytes | Remaining job PIDs |
| --- | ---: | --- | ---: | --- |
| DB baseline | 1 | One failed test, before confirmation | 396197888 | none |
| DB first-error diagnostic | 1 | Same failure; inner ownership error retained | 350208000 | none |
| Default `node tests/run-unit.mjs` | 1 | 2,794 tests: 2,752 pass, 2 fail, 40 skipped | 986351576 | none |
| ESLint on the two new test files | 0 | No diagnostics | 199311360 | none |

The only default failures are the existing deferred article-grid and verification/account/toast CSS-clock checks, in `tests/styling/deferred-article-grid.test.tsx` and `tests/styling/deferred-clock-delegation.test.ts`. They remain failures, not waived passes. `DATABASE_URI`, `MEMBER_AUTH_TEST_DATABASE_URL` and `COMMERCE_PAYLOAD_DATABASE_TESTS` were explicitly unset for default discovery and lint.

After cleanup, test-only safety refinements added a Docker identity preflight before schema push and explicit UUID/text casts in the not-yet-reached effect query. They passed scoped lint but were **not rerun against PostgreSQL**, honoring the stop-on-defect instruction. The baseline remains an intentionally RED gate, not a finished fault/concurrency/restart suite. No full typecheck, build, UI, provider, deployment or dependency audit was performed. Nested agents were forbidden; independent specialist/Santa review remains with the custodian.

## Disposable instance lifecycle and limits

- Created at `2026-11-13T09:28:09Z`: container `sphmrs-i0db-20261113-81f79e8f`, ID `a9e1358bc72a440dedb6c0f5c87906975e4af5acd1c2f52aba01192b45c7edf7`.
- Used the already-local `postgres:16` image ID `a902560563d3`, with pull disabled. PostgreSQL identified itself as **16.15 (Debian 16.15-1.pgdg13+2), aarch64**. Installed Payload/Postgres/Drizzle packages: 3.92.1; Drizzle ORM: 0.45.2.
- Dedicated volume `sphmrs-i0db-20261113-81f79e8f-data`; database `i0db_proof`; only published binding `127.0.0.1:55473` to container 5432. No application `.env`, credentials or existing database were opened.
- Fixture-created schema only, from the installed production commerce plugins plus minimal supporting user/admin/media collections. No repository schema/migration edits; this is not a production migration/configuration acceptance test.
- Container limited to 384 MiB including swap limit, one CPU, 128 PIDs. Observed container memory: 105.4–110 MiB. Physical RAM verified as 48 GiB; preflight free+inactive+speculative headroom approximately 21–22.5 GiB. No swapping observed at preflights; no resource stop.
- Each Node run used the prescribed 1.5 GiB guard, 1024 MiB heap, 10 GiB minimum headroom, 1200-second timeout and checkout-local temporary directory. Only one guarded workload at a time.
- Full worker descendant snapshot during default tests: 2,166,882,304 aggregate RSS bytes including MCP clients; final snapshot: 1,573,257,216 bytes. Finite job receipts all show no remaining PIDs; tool connections retained. No unrelated applications/processes terminated.
- Removed at `2026-11-13T09:33:24Z`: `docker rm -f` and `docker volume rm` both exited 0. `docker ps -a --filter name=sphmrs-i0db-20261113-81f79e8f --format '{{.Names}}'` returned no rows. Matching `docker volume ls` returned no rows. Existing dev `postgres` and all its data remained untouched.
- No provider, PortOne, email or non-loopback application transport. Runtime network guard rejects HTTP and any socket destination except the selected database. Context7/fast-context remote lookups were deliberately not invoked under this assignment's network restriction; installed package sources/docs were inspected instead.

## Exact reproduction, only after custodian reauthorization

The one approved disposable instance has been removed. These instructions describe the reproducer; they do not authorize another instance or further proof work.

```sh
rtk docker volume create sphmrs-i0db-20261113-81f79e8f-data
rtk docker run --pull=never -d --name sphmrs-i0db-20261113-81f79e8f --memory=384m --memory-swap=384m --cpus=1 --pids-limit=128 -p 127.0.0.1:55473:5432 -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=i0db_proof -v sphmrs-i0db-20261113-81f79e8f-data:/var/lib/postgresql/data postgres:16
rtk docker exec sphmrs-i0db-20261113-81f79e8f pg_isready -U postgres -d i0db_proof
rtk proxy mkdir -p docs/qa/t004-i0db-20261113/.runtime/tmp
rtk proxy sysctl hw.memsize
rtk proxy vm_stat
rtk proxy env COMMERCE_PAYLOAD_DATABASE_TESTS=1 DISABLE_PAYLOAD_HMR=true TMPDIR="$PWD/docs/qa/t004-i0db-20261113/.runtime/tmp" python3 scripts/resource-guard.py --max-gib 1.5 --node-old-space-mib 1024 --min-headroom-gib 10 --timeout 1200 --log "$PWD/docs/qa/t004-i0db-20261113/.runtime/reproduce.log" -- node --import tsx --test --test-concurrency=1 tests/commerce/core/payment-durability.db.test.ts
# Always clean up, even after the expected RED:
rtk docker rm -f sphmrs-i0db-20261113-81f79e8f
rtk docker volume rm sphmrs-i0db-20261113-81f79e8f-data
rtk docker ps -a --filter name=sphmrs-i0db-20261113-81f79e8f --format '{{.Names}}'
rtk docker volume ls --filter name=sphmrs-i0db-20261113-81f79e8f-data --format '{{.Name}}'
```

Expected failure on the recorded source HEAD: reservation preparation raises the ownership error, then the native boundary reports outcome unknown; the test exits 1. Default discovery requires no database and skips this file unless its explicit opt-in is set.

## Remediation 1 — final RED-02 handback (2026-11-13)

**Current state:** review checkpoint; narrow RED-01 remedy implemented and validated,
full I0DB acceptance **not achieved**. The matrix stopped at RED-02 without another
source fix. This section supersedes the initial execution status above while
preserving that historical evidence.

### Identity, source boundary and review

- Base HEAD: `61edde818e425ca74e151c0a40407088cb23981f`; same branch and checkout.
- Candidate: the new commit containing this section, exact hash supplied in
  `worker_done`; no amend, merge or push.
- Remediation diff SHA-256: `9cf7462adb2b063b3c72a5b043f9a3981d0a2afb7dd4e1037235cab1b230075c`, excluding this hash-bearing handback.
- Changed paths: this handback, `projection-inventory.md`,
  `remediation-1-evidence.json`, the transaction source below, and the four
  `tests/commerce/core/payment-{durability.db.test,postgres-fixture,process-fixture,projection.test}.ts` files.
- Source scope: only the request check inside `protectPaymentRequest`, at
  `src/lib/commerce/_shared/transaction.ts:193-203`. Original request identity is
  still accepted; only adapter calls gain the single-own-key `transactionID`
  projection with a strictly equal, non-empty current owned ID. Reflective key
  counting rejects symbol and non-enumerable extra keys. Local API guards,
  transaction begin/commit/rollback, private ownership/session checks and all
  other production code remain unchanged.
- Before the source edit, installed-call enumeration was completed and recorded
  in [projection-inventory.md](projection-inventory.md), including CRUD, versions,
  globals, requestless paths and full proxies that remain rejected.
- New projection tests reproduce the installed findByID shape with a native fake,
  and reject mismatched/absent/undefined/empty IDs, ordinary/symbol/hidden extra
  keys, inherited IDs, Local API projections, and lost request/session ownership.
- No helper agents were used. Independent specialist and Santa review belongs to
  the custodian, per the shared no-nested-agent instruction.

### Evidence and gates

[remediation-1-evidence.json](remediation-1-evidence.json) retains all guard receipts,
bounded excerpts, failed attempts and SHA-256 hashes of every final executable
file. No raw logs or home paths are delivered.

| Run | Exit | Actual result | Peak guarded bytes |
| --- | ---: | --- | ---: |
| Installed operation inventory | 0 | 832 runtime files; AST call scan plus alias/projection source inspection | 146653184 |
| New projection tests before fix | 1 | 11 pass, 1 expected RED | 316882944 |
| All I0/core tests after fix | 0 | 76 pass, 1 DB skip | 316112896 |
| First real DB rerun | 1 | Test-fixture SQL naming error; no new production defect | 369377280 |
| Corrected real DB baseline | 0 | Settlement and repeated confirmation once | 381861888 |
| Expanded DB matrix | 1 | 2 subtests pass, connection-kill and outer test fail; stopped | 418643968 |
| First full typecheck | 2 | One new test-only generated-type error | 2411429152 |
| Approved last full typecheck | 0 | No errors | 2335186504 |
| Final default discovery | 1 | 2,806 tests: 2,764 pass, **2 known failures**, 40 skipped | 998852136 |

The default failures remain exactly the deferred article-grid and
verification/account/toast CSS-clock suites; the I0 DB test was skipped. All DB
opt-ins were unset for typechecking/default discovery. `git diff --check` is clean.

Retained fixture correction: the first DB rerun failed because the unexecuted SQL
count used `commerce_attempt_id` rather than the installed generated column
`commerce_attempt_i_d`; the actual schema also uses `release_i_d` and numeric
counter types. Only owned test queries were corrected to those columns and
explicit integer casts, then baseline passed.

Retained typecheck correction: the first full check reported
`payment-projection.test.ts(25,23): TS2339 Property 'id' does not exist on type 'never'`.
The generated collection typing made the fake findByID return `never`; the test
now asserts equality of the entire returned object rather than accessing its id.
This strengthens the assertion and changes no source behavior. Custodian message
`msg_c70572dbbdc1` explicitly approved one last full check after that test-only
change at **3.5 GiB / 2048 MiB heap / 600 seconds / minimum headroom 10 GiB**.
That final run passed; there was no further typecheck or executable edit afterward.
The later transient upstream/API interruption was not a failed typecheck: the
status-1 command was default discovery with its two known failures.

**Owner clarification:** Amendment A and its must-convert instruction were withdrawn
by `msg_fc9c50fefbe7`; deliberate disposable DB fixtures, raw reads and connection
fault injection remain permitted, with no native-exhaustion/conversion gate.

### What the real DB run proved, and where it stopped

| Acceptance item | Result |
| --- | --- |
| Native acknowledged COMMIT and repeated confirmation | **PASS locally**: one order, stock 9 from 10, reserved 0, allowance 1, admission 1, pending fulfillment 1, succeeded transaction; replay leaves every count unchanged |
| Actual PostgreSQL COMMIT rejection | **PASS locally**: a test-only deferred FK violation is staged inside the real native transaction, actual COMMIT is attempted and rejected, native rollback is attempted, all settlement effects remain pending/zero, clean retry settles once |
| Connection termination between settlement effects | **RED-02**, below; no reported success, but effect-count/recovery proof could not finish |
| Separate rollback-rejection scenario | Not run after RED-02 (rollback was attempted during the connection-kill case, but the dedicated scenario is not credited) |
| Observed risk persistence/recovery | Written, not run after RED-02 |
| Concurrent separate-connection confirmations | Written, not run after RED-02 |
| SIGKILL and application restart without duplication | Written, not run after RED-02; no child worker was started |

The successful COMMIT-fault fixture used two disposable raw side tables, a deferred
foreign key and one in-transaction insert; its cleanup dropped both tables. The
schema for Payload collections was created through Payload push; seedAttempt
continues using Payload's adapter API followed by real reservation/Local API work.
No production migration, application configuration or operational data was touched.

### RED-02 — connection-kill escapes the expected error boundary

**Exact observed sequence:** `payment-durability.db.test.ts:75-98` seeds an attempt,
then appends a test-only order afterChange hook through the fixture. Before killing
anything, `nativeProgress` observes one uncommitted order and stock still 10, proving
that injection occurs after order creation and before stock deduction. The separate
control connection executes `pg_terminate_backend` for that native session and
receives true. The official request rejects as outcome unknown, and the native SQL
trace includes a rollback attempt. The subsequent committed-effect read at line 93
fails with **Cannot use a pool after calling end on the pool**; the outer test also
fails with **Connection terminated unexpectedly**, with the stack at native
Drizzle rollback/transaction completion. The fail-fast matrix does not start later
steps.

Installed Drizzle releases the borrowed client in the transaction `finally` block;
installed pg-pool emits idle-client errors on the pool. The fixture does not install
an error-swallowing pool listener or patch transaction/driver behavior. The observed
escaped-error/pool-lifecycle failure is retained as RED-02; the exact causal split
between production error propagation and the test runner's automatic teardown
requires custodian review. **Do not claim a proven production crash or atomic
post-kill recovery from this result.** No RED-02 source remedy was attempted.

A final independent read-only count query also failed on an enum/text comparison
before container removal. That diagnostic mistake is retained, not hidden: there
is **no completed post-connection-kill database count**, and the disposable instance
was not recreated to repair the missing evidence. Successful baseline and
COMMIT-rejection database assertions above are separate, completed checks.

**Reproducer:** after separate authorization, create the fixture's exact disposable
container/volume and loopback binding listed below, wait for pg_isready, then run
`payment-durability.db.test.ts` with `COMMERCE_PAYLOAD_DATABASE_TESTS=1`,
`DISABLE_PAYLOAD_HMR=true` and the original guarded command parameters
(1.5 GiB / 1024 MiB heap / 10 GiB minimum headroom / 1200 seconds, checkout-local
TMPDIR and log). Test ordering first runs baseline and deferred-FK COMMIT failure,
then the connection-kill case above. Use the candidate executable hashes in the
receipt bundle. Expected retained RED: request outcome unknown plus escaped driver
error/pool shutdown, before post-fault counts or retry. This is a reproduction
recipe, **not permission to start another instance or resume the matrix**.

### Lifecycle, safety and remaining work

- Exactly one newly authorized instance: `sphmrs-i0db-r1-20261113-81f79e8f`, ID
  `0d8aa8e90a5ca10efa9c50239b3e60cb12da88bf95097fa5dacd44e7153fbd01`, volume
  `sphmrs-i0db-r1-20261113-81f79e8f-data`; `127.0.0.1:55474` → 5432;
  `POSTGRES_DB=i0db_proof_r1`, disposable trust authentication, local `postgres:16`
  image with `--pull=never`. Memory/swap cap 384 MiB, one CPU, 128 PIDs.
- Created `2026-11-13T09:48:35Z`, removed `2026-11-13T09:57:33Z`.
  `docker rm -f` and `docker volume rm` succeeded; filtered `docker ps -a` and
  volume-list checks returned no rows. Existing dev containers/volumes untouched.
- PostgreSQL **16.15 (Debian 16.15-1.pgdg13+2), aarch64**. Local single host only;
  synthetic provider evidence, no provider/PortOne/email traffic, multi-node,
  server power-loss/WAL recovery, production schema or deployment acceptance.
- Physical RAM verified at 48 GiB. Preflight headroom remained above 10 GiB;
  container memory last observed 111.7 MiB. One guarded Node workload at a time,
  no resource stop. Every guard receipt has empty remaining PIDs.
- Final full worker descendant audit: 20 processes, 1,505,640,448 aggregate RSS
  bytes, including retained tool connections; no DB/test/application-child workload
  remains, and no unrelated process was terminated.
- Completed: enumeration, RED/GREEN narrow remedy, local baseline, actual COMMIT
  rejection, final full typecheck/default gate, sanitized receipts and cleanup.
- Remaining, in priority order: independently review the guard change; diagnose
  RED-02 and scope any remedy; reauthorize a new disposable run; finish connection
  kill counts/recovery, dedicated rollback fault, risk, concurrency and process
  restart proofs. Financial durability remains unapproved. No listener or
  background executor is waiting to resume DB work.
