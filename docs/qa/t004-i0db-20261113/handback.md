# T004 I0 PostgreSQL proof — handback

## Remediation 4 - progress panel (2026-11-13)

- Base: `89e4957`; tracked tree clean at dispatch. Only dispatched owned paths may change.
- Completed: RED reproduced (6 failures, 1 timeout); scoped GREEN (102 pass, 1 DB skip); all 7 real-DB scenarios passed; new container/volume removed; exact-final-source typecheck and scoped lint passed.
- Current: **RED-04 review checkpoint; failed overall acceptance**. Default discovery reports **3 failures**, not the required 2.
- Remaining: custodian classification and separately scoped remediation of the unexpected operator-UI asynchronous teardown failure; no repeat run or out-of-scope fix performed.
- Blocker: `tests/commerce/admin/operator-ui-dom.test.tsx` emits `ReferenceError: window is not defined` after its final test ends. See [red-04-diagnosis.md](red-04-diagnosis.md).
- Final-pass priorities: preserve completed independent counts, teardown failure evidence and original RED history; do not equate local proof with provider, multi-node or production acceptance.

**Assignment:** SPH-T004-I0DB-20261113-01
**Initial run state (historical):** failed acceptance, stopped at the first production compatibility defect. No source fix made in that initial run. The remediation-4 section records the current result.

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

## Remediation 2 — projection snapshot fixed; RED-02 diagnosis stops DB rerun

**State: review checkpoint.** The requested projection remedy and non-DB gates
are complete. Overall I0DB acceptance remains **failed / blocked at RED-02**:
production error propagation is implicated, so the fixture-only prerequisite for
a new disposable instance is not satisfied. No new PostgreSQL instance or volume
was created, no existing container was accessed, and no RED-02 source/fixture
remedy was implemented.

### Identity, exact scope and approvals

- Base HEAD: `2d017d29dbbce10ebad207c4b04dcd6b2cfa1d47`; initial tree clean.
- Branch: `codex/t004-i0db-20261113`; checkout: `sphmrs/t004-i0db-20261113`.
- Candidate: the new commit containing this section, reported by exact hash in
  `worker_done`; no amend, merge or push.
- Diff SHA-256, excluding this handback and the evidence JSON:
  `b9fedcfae72ef700fddcc82df7e5c6185cdec8c1776cd77be4d17bd5d39c5494`.
- Six changed paths: this handback, `remediation-2-evidence.json`,
  `projection-inventory.md`, `red-02-diagnosis.md`,
  `src/lib/commerce/_shared/transaction.ts`, and
  `tests/commerce/core/payment-projection.test.ts`.
- Only production edit: the check/forwarding inside `protectPaymentRequest`,
  plus the required built-in `node:util/types` import. No new helper, dependency,
  configuration, migration, transaction begin/commit/rollback or Local API
  acceptance exception. Installed package/source inspection used; no install.
- Accepted projections must be non-Proxy plain/null-prototype objects with one
  enumerable data property equal to the private owned ID. The caller's projection
  is never sent to the adapter; a fresh owned-ID snapshot is sent instead.
- Coordinator approval `msg_6f98c3e35d1d` explicitly resolves the outer-getter
  ambiguity: destructure the outer `req` exactly once and create a fresh outer
  argument on **both** branches. The identity branch still forwards the original
  request **itself**, never a request clone. A RED-first flipping outer-getter
  regression proves that branch cannot swap requests after validation.
- Inventory now includes upload-header isolation and dataloader cache-key uses as
  non-adapter entries. Amendment A remains withdrawn.

### Progress panel and validation evidence

[remediation-2-evidence.json](remediation-2-evidence.json) contains sanitized guard
receipts, bounded summaries and final executable/source-document hashes. Raw logs,
temporary compiler caches and home-prefixed paths are not part of the delivery.

| Completed step / gate | Actual result | Guard peak bytes / remaining job PIDs |
| --- | --- | --- |
| Projection RED before source change | 24 tests: 14 pass, **10 expected failures** | 323272704 / none |
| All I0/core tests after source change | 89 tests: **88 pass, 1 DB skip**, no failures | 310886400 / none |
| One full final-source typecheck | **PASS**, exit 0, incremental reuse disabled | 2409643512 / none |
| Default suite, DB opt-ins unset | 2,818 tests: **2,776 pass, 2 known failures, 40 skipped** | 988186176 / none |
| Whitespace / source scope | `git diff --check` clean; only allowed source area changed | No Node workload |
| RED-02 installed-source diagnosis | Complete; **not fixture-only**, database rerun withheld | All bounded inspection jobs exited; none remaining |

The full typecheck used exactly **3.5 GiB / 2048 MiB heap / minimum 10 GiB
headroom / timeout 600 seconds**, with checkout-local log and `TMPDIR`. No
executable source/test edits followed that check. Other Node workloads used the
shared 1.5 GiB / 1024 MiB / minimum 10 GiB / 1200-second guard, serialized.

New coverage includes stable/flipping transaction-ID getters, Proxy ownKeys /
descriptor / get traps, Promise and numeric IDs, a sole non-enumerable ID,
custom prototypes, accepted null prototypes, fresh adapter snapshot despite
caller mutation after entry, and single-read identity-path getter neutralization.
Existing mismatch/extra-key/symbol/hidden/inherited/Local-API/lost-owner tests stay
green. This is behavioral test evidence, **not a measured coverage percentage**.

The two default failures remain exactly
`tests/styling/deferred-article-grid.test.tsx` and
`tests/styling/deferred-clock-delegation.test.ts`; neither was rewritten or waived.
No build, UI/visual acceptance, provider, production, multi-node, deployment or
dependency audit was performed. Nested/helper agents were prohibited; independent
specialist and two-Santa review remain with the custodian, not self-certified here.
The semantic-search tool rejected remote repository export as unapproved; local
installed-source search completed the work without retrying that export.

### RED-02 conclusion and conditional matrix

See [red-02-diagnosis.md](red-02-diagnosis.md) for exact installed-package, fixture
and Node-builtin line citations and the causal chain. Important runtime identity
correction: the adapter resolves **pg 8.20.0**, not the root declaration 8.23.1;
pg-pool is 3.14.0 and native Drizzle ORM is 0.45.2.

The pool-ending operation is fixture lifecycle cleanup, not native COMMIT,
ROLLBACK, or Payload destroy alone. But an out-of-band driver connection error
can escape the awaited native transaction path; the runner then aborts the outer
test and invokes cleanup while a subtest continuation can still attempt its count.
The test already awaits the request rejection before counting. Moving teardown
cannot establish production error handling, and the removed historical instance
does not provide telemetry to distinguish the first checked-out-client error from
the idle-pool route. This is a source-supported diagnosis, not a new DB/crash proof.

| Full I0DB matrix requirement | Remediation-2 status |
| --- | --- |
| Baseline / actual COMMIT rejection | Historical remediation-1 passes retained; **not rerun** on this candidate |
| Connection kill and completed post-kill counts/retry | **RED-02 remains**; no completed count accepted |
| Dedicated rollback rejection | Not run: production propagation gate |
| Risk persistence | Not run: production propagation gate |
| Separate-connection concurrency | Not run: production propagation gate |
| SIGKILL / application restart | Not run: production propagation gate |

No RED-03 was observed because no conditional database rerun was permitted.
Escalation `msg_323415e8e92c` reported this gate to the coordinator before handback.
The proposed remedy is recorded only: scope non-swallowing lifecycle ownership of
both pool and borrowed-client errors, propagate unknown through native completion,
dispose failed clients, then separately join fixture operations before pool end
and reauthorize the matrix. No listener, driver patch or remedy was added.

### Resources, cleanup and prioritized final pass

Physical RAM was verified as **48 GiB**. Final free+inactive+speculative headroom
was **21,992,243,200 bytes** (over 10 GiB). During default discovery, the full
worker descendant tree used 1,793,523,712 aggregate RSS bytes; the final audit
found **20 processes / 1,648,148,480 RSS bytes**, including retained active tool
connections, and **no remaining guarded workload PIDs**. No resource stop,
duplicate bundler, dev server, browser instance, DB instance, unrelated-process
termination or background listener was introduced. Temporary run artifacts are
removed after receipt extraction; there is no new container/volume to remove.

1. Independently review this narrow guard candidate, especially the approved
   identity-path outer snapshot and unchanged Local API/request identity boundary.
2. Scope/approve RED-02 production propagation work; do not silently treat it as
   a fixture-only missing await or add a swallowing listener.
3. After that gate, separately reauthorize one fresh disposable loopback instance
   and finish every pending matrix row with completed independent SQL counts.
4. Preserve historical RED cases and provider/production/migration/deployment
   gates. Synthetic/core/typecheck passes do not establish financial durability.


## Remediation 3 - RED-03 review checkpoint (2026-11-13)

**Current state:** scoped identity/listener/teardown fixes implemented; I0DB
acceptance **failed**, stopped at new RED-03. This section supersedes the earlier
execution status while preserving all prior RED evidence. No RED-03 fix or
additional database run is authorized.

### Progress panel

| Step | State / evidence |
| --- | --- |
| RED before implementation | Complete: 24 pass, 5 expected fail; alternating identity accessors, absent production hook, teardown race |
| Three owned remedies | Complete; provider-free core 93 pass / 1 default DB skip |
| Fresh disposable DB matrix | Stopped at RED-03; baseline, COMMIT rejection, connection-kill count/retry pass; rollback-rejection count rejects |
| Container / volume removal | Complete, both absent |
| Type-boundary correction | Approved by `msg_d59800c207b3`; root pg type removed, minimal structural event contract retained inside the same hook |
| Final core rerun | Complete: 93 pass / 1 skip, 0 fail |
| Default / final exact-source typecheck | Complete: exactly 2 known failures / full check passes, serialized under guard |
| Evidence / review / commit | Receipts extracted and self-review complete; new commit reported separately; independent review remains with custodian |

Prioritized fragile final pass: (1) retain RED-03 and exact pool/backend uncertainty;
(2) do not credit unreached rollback recovery/risk/concurrency/restart proofs;
(3) verify no new default failure and exact-source typecheck;
(4) preserve out-of-scope LOW db/drizzle exposure and raw get-trap findings;
(5) remove only owned temporary files and commit only the path allowlist.


### Candidate identity and bounded source changes

- Starting HEAD `097d883`; tracked tree initially clean; branch remains
  `codex/t004-i0db-20261113`, checkout `sphmrs/t004-i0db-20261113`.
- Candidate diff SHA-256 (native staged patch excluding this handback and its evidence JSON): `9d57ac441c924f6197e03c047c7d86dcec2fcb2bf0db458a13c9cdf2effbb9fa`.
- New candidate commit is reported separately in `worker_done`; no amend, merge,
  push or deployment. Only the current assignment's owned paths are changed.
- The production guard gains only the synchronous own-data descriptor/value check
  immediately before `Reflect.apply`, without an intervening await. A failed
  descriptor check contaminates the owner and throws. No other guard path changed.
  Both RED alternating accessors previously committed after one adapter call;
  the fixed tests reject with **zero adapter calls** and native rollback.
- `src/payload.config.ts` gains exactly one `onInit` hook and no other config
  change. The same fixed, bounded `Payload storage is unavailable.` message is
  used by the pool and client handlers; no error/request/query/provider object is
  passed to that log call. Handlers do not catch or replace query promises.
- Existing clients are attached through the installed pool's `_clients`, including
  its retained startup client; future clients are attached on `connect`. The
  hook registers the event listener and enumerates without an await. A WeakSet
  avoids duplicate attachment through event/enumeration paths within this hook.
- The fixture close function first joins a caller-supplied set of subtest body
  continuations, then rolls back sessions/destroys/releases/ends the pool. The
  matrix registers each actual body promise, not just the runner's cancelable
  `t.test` wrapper. No fixture error listener or driver patch was added.
- The DB fixture now targets only the new r3 instance and executes the exact
  production hook extracted from the config AST, as does the provider-free
  EventEmitter test. This avoids importing application credentials/plugins or
  booting the full site config, and is not full-site initialization acceptance.

### Installed lifecycle option checks and library-first boundary

Installed `@payloadcms/db-postgres` **3.92.1** `dist/types.d.ts` Args and
`dist/index.js` were checked before choosing a hook. Args exposes `pool`, optional
`pg`, and schema hooks (`beforeSchemaInit` / `afterSchemaInit`), but **no user
adapter-init or post-connect lifecycle callback**. Its `.init({ payload })` is the
factory's adapter construction entry, not such a callback. `dist/connect.js`
creates the pool and retains an initial client; it does not supply the requested
pool/borrowed-client logging coverage. No adapter option, driver, dependency,
pool setting, migration, schema or other config was changed.

Payload's installed `dist/config/types.d.ts` declares the native `onInit` hook;
`dist/index.js:446` invokes it after initialization. Installed
`payload-auth/dist/better-auth/plugin/index.js:65` preserves and invokes incoming
onInit before its own initialization. The project's other configured plugins do
not override onInit. Installed pg-pool **3.14.0** source stores current clients in
`_clients`, emits `connect` for future clients, and has no public borrowed-client
enumeration. The narrow structural client contract avoids conflating adapter pg
**8.20.0** types with root pg **8.23.1** types; it only requires the native error
subscription API actually used. No new reusable production helper was introduced.
Installed sources/docs were used locally; no remote code export, documentation,
provider or non-loopback application transport was invoked.

### Retained RED and almost-GREEN evidence

- RED before source changes: **29 tests, 24 pass / 5 fail**. Both identity accessors
  (foreign and undefined second read) unexpectedly succeeded on the starting
  candidate; both hook tests reported missing production onInit; teardown ended
  the fake pool before the continuation finished.
- First core GREEN attempt: **94 tests, 92 pass / 1 fail / 1 skip**. The in-flight
  rejection test initially expected the raw pg error directly under the outer
  unknown error. Installed Drizzle actually preserves it under its query-error
  wrapper. Only the test's exact cause-chain assertion was corrected; the query
  rejection was never swallowed or reclassified as success.
- Corrected pre-DB core: **93 pass / 1 skip**, establishing all three fixes GREEN
  before the new DB instance was created.
- First full typecheck: exit **2**, one TS2345 error in onInit because root pg's
  `PoolClient` includes fields absent from the adapter's older pg type. Guard peak
  **2,318,786,192 bytes**, no resource stop or remaining PIDs. Coordinator reply
  `msg_d59800c207b3` explicitly approved removing that import, using the minimal
  structural event contract inside the same hook, core/default reruns and one last
  exact-source full typecheck at the same limits. It expressly prohibited a
  further DB run or RED-03 fix.
- The DB run preceded that **type-only** correction. It was not rerun afterward;
  no claim of a second/final-source DB run is made.

### Real PostgreSQL matrix: current acceptance limits

See [red-03-diagnosis.md](red-03-diagnosis.md) for the exact failed SQL, call site,
control-pool identity and missing backend telemetry.

| Required proof | Remediation-3 observation |
| --- | --- |
| Native COMMIT / repeat confirmation | PASS locally: order 1, stock 9, reserved 0, allowance 1, admission 1, pending fulfillment 1, transaction succeeded; replay leaves counts unchanged |
| Actual COMMIT rejection | PASS locally: deferred FK rejects actual COMMIT, rollback attempted, pending effects remain orders/allowance/admission/fulfillment 0, stock 10, reserved 1, pending transaction; clean retry settles once |
| Connection kill with completed post-kill count | PASS locally: terminate owned backend after uncommitted order and before stock deduction; outcome unknown; rollback attempted; completed control-pool count equals pending; clean retry settles once |
| Dedicated rollback rejection | **RED-03**: unknown outcome and rollback attempt observed, but awaited post-kill `effects(db.pool, f)` rejects `Connection terminated unexpectedly`; no completed count or retry credited |
| Risk persistence | Not reached: stop-on-RED-03 |
| Separate-connection concurrency | Not reached: stop-on-RED-03 |
| SIGKILL / restart | Not reached: stop-on-RED-03 |

The failed query is an automatic **control-pool** acquisition, not an explicit
query on the killed session. **It uses the same Payload pool that owns the killed
transaction client and that executes the kill query.** Its physical client/PID
was not captured; it is not proven to be a fresh backend, the killed session, or
the previous control connection. The new error must not be silently labeled a
fixture-only failure or a proven production stale-client reuse bug. The error is
an awaited query rejection, not the previous ended-pool symptom. No financial
success was returned for the failed scenario, but its committed effects remain
unobserved. No additional DB probe or remediation followed RED-03.

### Disposable instance lifecycle

- One newly created container: `sphmrs-i0db-r3-20261113-a2d91bce`, ID
  `e24db248bdba38c0d48c64aa5dc76f4037e8a92b368b985d7bdab27bdfaa758e`.
- Created **2026-11-13 13:57:39 UTC**; removed **13:58:34 UTC**. Initial
  `pg_isready` returned no response while starting; subsequent readiness passed
  before the sole matrix run. No second instance or database rerun was created.
- Existing local image `postgres:16`, immutable ID
  `sha256:a902560563d3a5661228585f53474c5065e7f273b21ffd77e555a8b5682c5690`;
  pull disabled. Server **16.15 (Debian 16.15-1.pgdg13+2)**, single local host.
- New dedicated volume `sphmrs-i0db-r3-20261113-a2d91bce-data`, database
  `i0db_proof_r3`; binding only **127.0.0.1:55475 -> 5432**. Docker identity
  checks precede test schema push. No application env/credentials were opened.
- Cap 384 MiB including swap, 1 CPU, 128 PIDs; observed **108.9 MiB**. Fixture
  schema only; no migration/schema-source changes. No provider/PortOne/email
  delivery; synthetic provider evidence and transport isolation only.
- `docker rm -f` and `docker volume rm` succeeded. Filtered `docker ps -a` and
  `docker volume ls` both returned no rows afterward. Existing `postgres`,
  `postgres-before-loopback-*`, `sophomores-otp-local-*`, `litellm-*`, and
  `sophomores-tailwind-*` containers/volumes remained untouched.

### Review boundaries and remaining findings

Self-review checked the synchronous guard position, fixed log arguments, existing
and future client attachment, query rejection propagation, cleanup joining,
path allowlist and secret/provider boundaries. Per the assignment, no nested or
helper agents were used. Independent specialist and two-Santa review remain the
custodian's quality gate, not claimed as completed here. No UI/styling changed;
no visual or browser acceptance is claimed.

The **LOW db/drizzle field gap** and **LOW raw get-trap behavior** in the payment
facade remain recorded and **out of scope**, unchanged. This patch does not make
the facade a complete capability/security sandbox. Startup errors before onInit,
full-site initialization, provider acceptance, multi-node behavior, production
migration, deployment and general financial durability are not accepted by these
bounded tests. No dependency audit was run under the non-loopback restriction.


### Final gates, resource receipts and remaining work

See [remediation-3-evidence.json](remediation-3-evidence.json) for all eight bounded
receipts, installed identities, lifecycle, failed attempts and final executable
SHA-256 hashes. Raw logs and checkout-local temporary files are removed after
extraction; no home paths are delivered.

| Run | Exit | Result | Peak guarded bytes |
| --- | ---: | --- | ---: |
| Pre-fix scoped RED | 1 | 24 pass, 5 expected fail | 318226432 |
| First core GREEN attempt | 1 | 92 pass, 1 test-only cause-chain failure, 1 skip | 318488576 |
| Corrected pre-DB core | 0 | 93 pass, 1 skip | 352665600 |
| Sole new PostgreSQL matrix | 1 | 3 pass, 2 fail (RED-03 subtest plus outer) | 467664896 |
| First full typecheck | 2 | One TS2345 installed-pg type-boundary error | 2318786192 |
| Approved final core rerun | 0 | 93 pass, 1 skip | 322584576 |
| Final default discovery | 1 | 2823 tests: 2781 pass, **2 known failures**, 40 skip | 988284720 |
| Approved last full typecheck | 0 | No diagnostics; exact final executable source | 1938698008 |

The default failures are exactly `tests/styling/deferred-article-grid.test.tsx` and
`tests/styling/deferred-clock-delegation.test.ts`. Database opt-ins and DATABASE_URI
were unset. They remain actual failures, not waived passes. No measured coverage
percentage is claimed. The final typecheck used **3.5 GiB / 2048 MiB old-space /
10 GiB minimum headroom / 600 seconds**. All other Node runs used **1.5 GiB /
1024 MiB / 10 GiB / 1200 seconds**, with checkout-local TMPDIR. No executable
source/test edit followed the last full check. `git diff --check` is clean.

Physical RAM was verified as **48 GiB**. All eight finite guard receipts report
no remaining workload PIDs, no uncertain cleanup, and no resource stop. The
verified Codex-descendant audit during default discovery counted **27 processes /
1,487,323,136 aggregate RSS bytes**; the final audit counted **20 processes /
1,246,199,808 bytes**, including retained active tool clients. Final
free+inactive+speculative headroom was **18,744,426,496 bytes** (>10 GiB). No swap-in
or swap-out was observed in the workload preflights. An initial DB-stage process
audit mistakenly selected its own tool subprocess and is explicitly excluded from
whole-worker compliance evidence; later audits verified the checkout-owning
Codex PID. No unrelated application/process/container was terminated, no duplicate
bundler/browser/dev server was started, and no agent-owned service remains.

**Remaining decision:** independently review the scoped fixes, then classify and
scope RED-03 from the exact control-pool failure before authorizing another DB
run. Dedicated rollback post-kill counts/retry, risk persistence, physically
separate-connection concurrency and SIGKILL/restart are still unproved. There is
no financial durability, provider or deployment acceptance and no background
continuation. Overall assignment outcome is **failed acceptance**, not completed
I0DB proof.

## Remediation 4 - local full-matrix handback (2026-11-13)

This section supersedes remediation 3's current execution status, not its
historical failures. Base `89e4957` was clean on branch
`codex/t004-i0db-20261113`, checkout `sphmrs/t004-i0db-20261113`.
Candidate is the new commit containing this section (hash sent separately);
no amend, merge, push, deployment or dependency change.

### Bounded changes and test-first evidence

- The **only production change** is inside `payload.config.ts`'s onInit hook:
  `Reflect.get(pool, "_clients")`, array-only enumeration and function-only
  listener attachment. Existing WeakSet deduplication and `connect` coverage are
  retained. No pool options or other configuration changed.
- RED was written and run first: missing/null/object/string `_clients` and
  malformed entries failed, rejected continuation reporting failed, and the
  never-settling join hit its 500 ms test deadline (3 pass, 6 fail, 1 cancelled).
  The GREEN suite also proves one listener when an enumerated client is later
  emitted by `connect`, fixed redacted diagnostics, and native query rejection
  propagation. Final scoped core: **102 pass, 0 fail, 1 DB skip**.
- The fixture creates a **dedicated pg Pool, max 1**, outside Payload, on the
  same allowlisted loopback endpoint with a fixed error listener. Only backend
  termination and independent effect/state counts use it. All settlement work
  still uses the unmodified native adapter pool. No query retry was added.
  The pool is ended after the Payload continuation join and cleanup, including
  error paths; failed cleanup is reported, not discarded.
- Test lifecycle joins are bounded at **10 seconds** (20 ms in timeout tests).
  Observed continuation rejections and a join timeout are retained and thrown
  in an AggregateError **after** session rollback, destroy, retained-client
  release and pool end have been attempted. Tests cover rejection after
  cleanup, timeout cleanup, combined continuation/cleanup failures, and a
  rejected continuation alongside a timed-out continuation. Timeout is a loud
  failure, not a claim that unsettled code was cancelled safely.
- After the successful DB run, only the fixture close wrapper's error
  aggregation was hardened and two synthetic lifecycle tests were added.
  No settlement, control-query, hook or lifecycle implementation changed after
  the DB run. Final core/default tests and the exact-final-source typecheck
  cover that final test-only revision; the removed database was not recreated.

### Real PostgreSQL matrix - complete independent observations

All seven scenarios passed in the sole remediation-4 DB run: **8 tests including
the outer test, 8 pass, 0 fail/cancel/skip**. No database defect was encountered;
RED-04 arose later in the full default-suite gate, not in this matrix.
Effect vectors below are completed assertions from the independent control
connection, not observations inside the transaction being faulted.

`pending = {orders:0, stock:10, reserved:1, allowance:0, admissions:0,
fulfillment:0, status:"pending"}`.
`settled = {orders:1, stock:9, reserved:0, allowance:1, admissions:1,
fulfillment:1, status:"succeeded"}`.

| Scenario | Completed result |
| --- | --- |
| Baseline COMMIT and replay | pending -> settled; replay 200, same settled vector |
| Actual deferred-constraint COMMIT rejection | rejected unknown; native begin/commit/rollback trace; pending, 0 fault-table rows; explicit clean retry 200 -> settled |
| Connection kill after order, before stock | killed target confirmed; unknown rejection, ROLLBACK attempted; pending; explicit retry 200 -> settled |
| Dedicated callback/ROLLBACK rejection after kill | callback threw after confirmed termination; unknown rejection, ROLLBACK attempted; **completed pending counts**; explicit retry 200 -> settled |
| Risk persistence/recovery | killed transaction remains unknown, same request blocked; independent pending counts; fresh synthetic evidence commits review hold=true, still pending/no settlement effects |
| Separate-connection concurrency | two distinct native backend PIDs; both 200 with identical canonical order ID; one settled effect vector |
| SIGKILL and restart | child parked after uncommitted order, independent pending counts; SIGKILL confirmed, backend disappearance counted; fresh process confirms and replays once; settled counts from restarted and parent control connections |

This resolves the bounded fixture/control-observation gap. The prior RED-03
mechanism remains **inference only**, with the reviewers' installed-source
citations and missing PID explicitly preserved in
[red-03-diagnosis.md](red-03-diagnosis.md). A passing independent-control run
does not prove the concrete client/PID or event ordering in the earlier failure.

### Accepted onInit boundary for CLI and startup failures

The hook does **not** run for `payload migrate`: installed
`payload/dist/bin/migrate.js:38-43` passes `disableOnInit:true`.
`generate:db-schema` also passes `disableOnInit:true` and `disableDBConnect:true`
(`payload/dist/bin/index.js:180-186`). `generate:types` and
`generate:importmap` return through generation paths without initializing a
Payload instance (`index.js:133-139`); they do not install this hook either.
`payload/dist/index.js:447-453` explicitly gates config onInit on that option.

**Accepted fail-fast behavior for those runs:** there is no claim of recoverable
driver-event handling by this hook in migration/generation commands, before
onInit, or when initialization fails. Those commands may fail directly; this
patch does not add CLI listeners, reconnection or retry behavior. CLI/source
paths were inspected, not executed against any existing database.

### Sole new instance and cleanup

- Created **2026-11-13T14:20:29Z**, cleanup started **14:20:36Z**:
  `sphmrs-i0db-r4-20261113-eda62f07`, container ID
  `93970bde68bcf669c01626da5f8580c5d081fecc2f7a63d9b11c6b2a7d4fabf4`.
- New volume `sphmrs-i0db-r4-20261113-eda62f07-data`, DB `i0db_proof_r4`,
  only binding **127.0.0.1:55476 -> 5432**. Identity checks run before schema
  push. No existing container/volume or application .env was opened/changed.
- Existing local `postgres:16` image, pull disabled, immutable image ID
  `sha256:a902560563d3a5661228585f53474c5065e7f273b21ffd77e555a8b5682c5690`;
  PostgreSQL **16.15 (Debian 16.15-1.pgdg13+2)** on one local host.
  Cap **384 MiB including swap, 1 CPU, 128 PIDs**; observed **109.1 MiB**.
- Container removal and dedicated volume removal both succeeded. Subsequent
  name-filtered `docker ps -a` and `docker volume ls` returned **no rows**.
  All pre-existing containers/volumes remained untouched. No second instance
  or extra fault/count retry was created.
- Runtime transport isolation allowed only that loopback DB; provider evidence
  was synthetic. Installed identities: Payload/db-postgres/drizzle adapter
  3.92.1, Drizzle ORM 0.45.2, adapter-resolved pg 8.20.0 / pg-pool 3.14.0;
  the new independently imported control pg is root-installed **8.23.1**.

### Final validation and boundaries

Final receipts, executable patch SHA-256 and exact executable file SHA-256 values
are in [remediation-4-evidence.json](remediation-4-evidence.json).

| Gate | Result | Guard peak bytes |
| --- | --- | ---: |
| Pre-fix scoped RED | exit 1; 3 pass, 6 fail, 1 cancelled join timeout | 398770176 |
| Pre-DB core GREEN | exit 0; 100 pass, 1 DB skip | 341016576 |
| Sole full PostgreSQL matrix | exit 0; 8 pass | 801243136 |
| Final core after test-only close hardening | exit 0; 102 pass, 1 DB skip | 311207016 |
| One exact-final-source full typecheck | exit 0; no diagnostics | 1416431984 |
| Full default discovery | exit 1; 2833 tests, 2790 pass, **3 fail**, 40 skip | 992102072 |
| Scoped lint, six executable files | exit 0; no diagnostics | 205881344 |

Default discovery failed the explicit two-known-failures gate. The existing
article-grid and clock-delegation failures remain, plus an unexpected
operator-UI file-level asynchronous-activity failure. Its final named assertion
passed, then a late `window is not defined` error failed the file. The exact
bounded observation and source ownership boundary are retained as
[RED-04](red-04-diagnosis.md); no fix, repeat discovery or further DB run followed.
Lint had already been launched before the default summary was inspected and
finished without diagnostics. Overall assignment outcome is **failed**, despite
the now-complete local DB matrix.

The typecheck used exactly **3.5 GiB / 2048 MiB old-space / 10 GiB minimum
headroom / 600 seconds**. All other Node workloads used **1.5 GiB / 1024 MiB /
10 GiB / 1200 seconds**, serialized with checkout-local TMPDIR. No executable
edit followed the one full typecheck. All seven finite receipts have empty
remaining-PID lists, no uncertain cleanup and no resource stop. `git diff --check`
is clean. Default database opt-ins and DATABASE_URI were explicitly unset.

Physical RAM was verified as **48 GiB**. The verified Codex root (PID 67246)
descendant audit before DB work counted **20 processes / 1616150528 RSS bytes**;
during default discovery **26 processes / 1464254464 RSS bytes**, with
**17114562560 bytes** available headroom. The container's separately observed
109.1 MiB is included in the safety assessment, not in the process-tree receipt.
No browser, preview, bundler or helper was started, no unrelated process was
terminated, and no resource limit was raised or bypassed.

Final descendant audit: **20 processes / 1008599040 RSS bytes**, including
active tool connections; **17027268608 bytes** headroom and zero swap-in/out
counters. No finite test/typecheck/lint workload or disposable service remains.
Executable patch SHA-256 (six changed source/test files, excluding docs):
`cdf07dbb23dc2a2a25e9b1c18d6d1f159e8ff3b498839b1a3b7809d15a4cbd46`.
Raw checkout-local runtime logs/caches are removed after bounded receipt
extraction; they are not part of the handback or commit.

Self-review checks the hook-only source scope, independent control consumers,
cleanup ordering/error preservation, no-retry boundary and exact installed
driver sources. No helper agents were dispatched: independent specialist and
Santa reviews remain the custodian's gate. No UI changed; no live-browser
acceptance is claimed. No dependency audit/install, provider call, production
migration, deployment or multi-node proof is included. No measured coverage
percentage is claimed. The previously recorded LOW db/drizzle field gap and LOW
raw get-trap behavior remain unchanged/out of scope.

The initially requested fast-context lookup was rejected by tool policy before
providing any repository result; local text/source inspection was used instead.
The first sandboxed physical-memory read was denied; the approved elevated
read verified 48 GiB RAM, and guarded workloads used the required headroom
checks. Neither failed attempt was bypassed through an indirect external call.
