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
