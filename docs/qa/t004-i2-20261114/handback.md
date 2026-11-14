# SPH-T004-I2-20261114-01 - Fourth-Cycle Handback

## Fix 4 Progress Panel

Review checkpoint for the owner's narrow fourth cycle; source/test revision frozen at
`b591c0bf35553994a81afcaf063c93fd7623e98f` after merging `origin/main`.

- Complete: production-only bounded lock-busy retry, independent immutable
  completion/risk catch-up rows, and admission recovery before expiry fencing.
- Complete: separate oldest-first 16-id seen-risk set; reserve-spend ids remain
  separate; deterministic integrity rejection now means review, never busy.
- Evidence: initial focused RED 25 passed / 7 failed; expanded focused GREEN
  47 passed / 0 failed before the final unknown-marker classification refinement.
- Complete: once-only final DB proof, 12 passed / 0 failed; peak 1,238,762,096
  bytes, no remaining child PIDs; owned disposable container and volume removed.
- Complete: once-only exact-final full typecheck, exit 0; peak 2,478,460,056 bytes,
  incremental disabled, no remaining child PIDs.
- Complete: once-only standard default suite without a custom preload, 2,900
  passed / exactly 2 known styling failures / 41 skipped; no extra failures.
- Complete: sanitized receipts, owned container/volume cleanup and clean
  whitespace/hygiene checks; no guarded workload remains.
- Remaining: independent coordinator review and its acceptance decision;
  no provider/production acceptance is implied.
- Fragile final pass: expiry catch-up must retain proof and release only its own
  reservation; genuine uncertainty must remain fenced; replay must not spend a
  second ordinary GET; default tolerance is exactly the two known styling failures.

## Fix 4 Implementation And Boundaries

Merged `origin/main` in `8c6ae86` before editing; source/test candidate:
`b591c0bf35553994a81afcaf063c93fd7623e98f`.
Source/test delta against `origin/main`, SHA256:
`41756c49d08c2bef478d64169f963497269746f680d0b5d0dac93819af97aa1b`.

1. Completion and risk retention retry only an acknowledged failed try-lock,
   using native promise timers: eight bounded waits totaling 1,475 ms, with a
   2-second monotonic retry deadline. Connection/acquire failures do not retry;
   uncertain native acknowledgements keep the existing unknown path. If known
   busy persists, independent immutable JSON ledger rows record the completion
   outcome or normalized risk proof, with exact attempt identity, token,
   generation and PostgreSQL timestamp. These writes take neither the global
   advisory lock nor the attempt advisory lock. Admission recovers matching
   known completion markers before checking expiry, merges retained risk, and
   removes only that token's reservation. Genuine unknown markers remain fenced.
   Risk retention already used only the attempt lock; this round does not add
   a global lock to that path.
2. `seenRiskEvents` records every signed risk id that starts an operation,
   including ordinary-funded starts. It rolls oldest-first at 16. `riskEvents`
   remains reserve-spend-only; refused/joined events consume neither set.
   Older rows without the new optional set conservatively use their existing
   reserve-spend ids as the initial seen set. No stored translations change.
3. Only explicit lock-busy and pre-BEGIN pool connection/acquisition failures
   produce admission `busy`. Confirmed rollback of identity mismatch,
   ambiguous ledger selection, malformed stored state, and deterministic BEGIN
   failure produces a known review/integrity stop, not retryable busy. Corrupt
   rows are not silently repaired.

The existing server-owned collection now validates create-only completion/risk
scope rows. No new collection, column, migration, dependency, UI, provider call,
scheduler, credential or external configuration is added. The existing separate
ledger pool remains 2 connections; production main plus ledger remains 12 per
process. Native timers and the existing transaction utility are reused directly;
the retry and catch-up logic stays local to reconciliation accounting, not shared
utilities or a parallel transaction implementation.

The process fixture no longer retries either end or debit. The existing
cross-process global-capacity proof races admissions behind a common start
barrier, then coordinates each worker's dispatch once; it does not retry a GET.
A separate real-PostgreSQL test holds the global lock, then both global and
attempt locks, forcing production backoff and durable fallback. It verifies the
proof survives and a matching known completion recovers after simulated lease
expiry without ownership fencing. The pre-existing crashed/expired-holder fence
proof still passes. Unit tests separately cover all three integrity classes,
ordinary-funded replay, deterministic seen-id pruning, transient busy, and real
unknown completion markers.

## Fix 4 Validation And Cleanup

Initial focused RED: 32 tests, 25 passed / 7 failed, demonstrating the missing
busy fallback/retry, three integrity classifications and ordinary-risk replay.
Focused GREEN: 34/34; expanded GREEN: 45/45; final focused run: 47/47 before the
last unknown-marker classification refinement. The final default suite contains
that refinement and its regression. The first RED command was rejected before
execution because the guard requires an absolute log path; it was corrected
without changing resource limits or running an unguarded workload.

| Once-Only Final Gate | Result |
| --- | --- |
| Disposable PostgreSQL proof | 12 passed / 0 failed; 126.0 seconds; peak 1,238,762,096 bytes; remaining PIDs empty |
| Exact-source full typecheck | exit 0; 3.5 GiB / 2048 MiB / 600 s; incremental disabled; peak 2,478,460,056 bytes; remaining PIDs empty |
| Standard default suite | 2,943 tests: 2,900 passed / exactly 2 known failures / 41 skipped; exit 1; 213.1 seconds; peak 1,039,063,176 bytes; remaining PIDs empty |
| Whitespace and hygiene | Clean against origin/main; no raw logs, host paths or process dumps retained |

The two default failures are exactly
`tests/styling/deferred-article-grid.test.tsx` and
`tests/styling/deferred-clock-delegation.test.ts`; no additional failure or
post-test asynchronous-activity warning occurred. They remain deferred, not
fixed or hidden. There is no rerun of any final gate. The DB proof used
`node --import tsx --test tests/commerce/portone/reconciliation.db.test.ts`, the
typecheck used `node node_modules/typescript/bin/tsc --noEmit --incremental false`,
and the standard default suite used `node tests/run-unit.mjs`, all under the
resource guard with checkout-local temporary/log paths. Database opt-in was set
only for the isolated proof; application database variables were unset for all
three gates. No custom preload or package-manager script was used.

All final receipts are under `evidence/c4-*.metrics.json`, with
`remaining_pids: []` and `cleanup_uncertain: false`. The immutable source/test
delta is unchanged after the gates; only handback/evidence changes follow the
source commit. Guarded test/typecheck processes have exited; active Codex/MCP
clients and unrelated applications are preserved. No test, dev or database
service remains from this cycle.
The final Codex-descendant census was 1,560,870,912 bytes aggregate RSS across
the executor and its tool clients; no redundant agent-owned workload needed
termination. This census is not a physical-footprint quota or a whole-chat
memory guarantee; the resource guard's system-headroom checks remain distinct.

Proof container `sphmrs-i2-c4-20261114-86c655af`, volume
`sphmrs-i2-c4-20261114-86c655af-data`, loopback `127.0.0.1:55491`, cached immutable
image `sha256:a902560563d3a5661228585f53474c5065e7f273b21ffd77e555a8b5682c5690`.
Memory and swap ceilings were both 384 MiB; last observed container use 110.8 MiB.
Only that container and volume were removed; exact-name post-removal inventories
are empty. Host RAM is verified as 48 GiB; every workload used the resource guard,
one at a time, with at least 10 GiB headroom. No nested agents were used.

No coverage percentage, provider functionality, production acceptance or owner
approval is inferred from these local gates. Independent coordinator reviews and
any later provider/activation gates remain separate. If this fourth cycle fails,
I2 remains with the owner; no fifth cycle is authorized here.

## Historical Cycle-3 Handback

Status: rework candidate ready for independent cycle-3 review; local gates complete.
Branch: `codex/t004-i2-20261114`; checkout: `<home>/orca/workspaces/sphmrs/t004-i2-20261114`.
Original assignment identity base: `13d5b98782151f54e0b4c1eb7d401d6ebe64b571`.
Merged review base: `cef23b652a7b242cde0926ff438004e2000b8ede` (merge `0ee0866`).
Source/test commit: `dc83d75f320ab4c0fdaabcbea338ed435b143f07`.
Source/test delta against origin/main SHA256:
`85a065b7f6308a6044b80976d0d81b325ffacc567d3a817de4990a922d40b5c6`.
Final branch HEAD is supplied in worker_done; later changes are evidence only.

## Scope And Schema Rationale

The Payload-owned reconciliation collection keeps durable pre-dispatch accounting
and evidence independent of the official plugin financial transaction's rollback.
Extending only that plugin transaction would lose the debit/evidence on financial
rollback, so the separate additive collection remains the appropriate owner.
This cycle adds no migration, table, dependency, UI, scheduler or provider integration.
Existing JSON storage accepts immutable overflow ingress rows: inline Paid entries
roll oldest-first at 64, while risk events are never pruned. All-risk overflow uses
exact attempt identity plus SHA256(event id), is create-only, and remains subject
to authenticated ingress validation and the early abuse limiter.

Approved scope extensions (`msg_ec216e4fd7aa`): export the existing local-result
projection and type completed-body failures in the existing tickets transport.
Request URL, authorization, redirect/cache and stricter 5-second inner timeout
are unchanged; I2's outer deadline stays 10 seconds. The earlier read-only native
transaction-outcome accessor approval still applies. No raw body, credentials,
environment file or provider network was accessed.

## Rework-2 Findings

| Item | Remedy and regression |
| --- | --- |
| H1 | Durably record signed Paid ingress, then acknowledge an unchanged canonically consistent succeeded result without admission, GET, generation bump or escalation; unit result regression and browser-confirm then late-Paid DB proof |
| H2 | Explicit bounded acquisition before BEGIN; effect-free failures are known; nonblocking advisory try-locks return busy; real saturated ledger pool and open same-attempt financial-lock proof |
| M3 | Consume a risk id only for a started operation funded by risk capacity; join/rate/budget redelivery regressions |
| M4 | Complete HTTP/JSON/basic-schema failures keep their debit but complete as known; transport/deadline uncertainty still poisons ownership |
| M5 | Sanitized pool/client error handlers, deduplicated per client; idle-error regression |
| M6 | Paid ingress bypasses only automatic cooldown/30-minute gates, never budget, global, customer or lifetime bounds; genuine late Paid settlement without cooldown workaround |
| M7 | Expired native holder fence/hold-clear check precedes end; risk-only clear-Paid guard is mutation-tested; real PG unsigned refusal and four distinct risk GET cap |
| L8 | Returned unknown completion after acknowledged financial success preserves the committed response and records escalation |
| L9 | Attempt-start epoch comes from PostgreSQL created_at, against PostgreSQL admission time; corrupted application timestamp regression |
| L10 | Authenticated in-memory limiter precedes all ledger writes; 21st joined ingress regression |
| L11 | Deterministic Paid pruning plus immutable overflow for an all-risk journal; no cap deadlock or risk deletion |
| L12 | FAILED evidence fetched before financial locks is revalidated inside them against current snapshot/status/hold before release; test requires the exact revalidation error and fails without the checks |

The pre-lock FAILED fetch is a deliberate deviation from design section P,
allowed by the custodian only because the current row and attempt are revalidated
inside the financial lock. A changed, succeeded or held attempt cannot release
reservation/counters or be retired merely because an earlier GET said FAILED.

The dedicated ledger pool remains max 2, with 2-second acquisition and 5-second
statement/idle-transaction bounds. Production main pool uses pg's default max 10:
**12 connections per process**, including ledger. The proof uses main 5 + ledger 2
= **7 per process**. Ledger try-lock contention never waits behind settlement
while holding a ledger connection. Proof workers retry only acknowledged,
effect-free contention, never unknown transport/native completion or expired holders.

## I1 Defect Found By I2

The first real DB proof showed that browser confirmation succeeded, but the next
Paid webhook still returned 409: the old I1 decoder required the strict snapshot
address shape from the plugin-owned order shippingAddress. Actual plugin storage
omits recipientName/deliveryInstructions, emits nullable optional fields and adds
plugin fields. Custodian approval `msg_f73a992f456e` authorized only the result.ts
order decoder/comparison fix and one DB rerun; contracts.ts stays unchanged.

Authoritative sources inspected:
- `node_modules/@payloadcms/plugin-ecommerce/dist/collections/addresses/defaultAddressFields.js`: optional text fields, no recipientName or deliveryInstructions.
- `node_modules/@payloadcms/plugin-ecommerce/dist/collections/orders/createOrdersCollection.js`: shippingAddress group uses those address fields.
- `src/lib/commerce/portone/adapter.ts`: official finalizer receives both the immutable commerceSnapshot and snapshot shippingAddress; Payload retains only configured address fields.
- `src/lib/commerce/ecommerce.ts`: uses default address fields; disables address-book operations, without replacing the order-address shape.

The decoder strips unknown plugin fields and accepts null for optional addressLine2.
It compares country/phone/postcode/address lines field-by-field after schema
normalization, never JSON property order. Recipient name and delivery instructions
are verified via the immutable order snapshot against the transaction snapshot;
the full order snapshot hash is also checked. Every entered field stays protected,
including nonempty second address lines. Only the validated transaction snapshot
is projected to the buyer; plugin-only fields never pass through. Real persisted
shape, nullable values, reordered properties, altered fields and snapshot-only
field corruption have RED/GREEN regressions. This is not a fulfillment-schema fix.

## Validation Ledger

Initial RED: 21 tests, 13 passed / 8 failed. Targeted mutation RED: five failures
prove settled-Paid acknowledgement, effect-free connection rejection, idle handlers,
try-lock busy admission and the ordinary-reserve guard. An initial retirement
mutation exposed a weak generic-rejection assertion; it was tightened to require
the inside-lock revalidation error, then failed when the checks were removed.
Focused provider-free GREEN: 151/151; expanded regression GREEN: 67/67.
I1 address RED: 0/2; post-fix expanded GREEN: 69/69.

The first DB gate failed: 9 passed / 2 failed (one substantive failure plus parent).
It exposed the I1 defect described above, not a provider failure. All other DB
proofs passed, including ledger saturation/lock contention, risk cap, crash fencing,
late pending Paid settlement and cross-process global accounting. A read-only
Payload diagnosis confirmed the order-address rejection; an initial diagnostic
script needed an .mts extension for top-level await and was corrected without
changing production code. The approved DB rerun and single final typecheck/default
suite are recorded below. No further source/test edits follow dc83d75.

| Final Gate | Result |
| --- | --- |
| Approved PostgreSQL rerun | 11 passed / 0 failed; 118.8 seconds; peak 1,172,209,664 bytes; no remaining PIDs |
| Exact-source full typecheck | exit 0 with incremental disabled; 3.5 GiB / 2048 MiB / 600 s; peak 2,372,841,016 bytes; no remaining PIDs |
| First default invocation | 2,934 tests: 2,883 passed / 10 failed / 41 skipped; custom preload blocked synthetic HTTP fixtures; operator-ui-dom and warp/dev-controls reported post-test window-is-undefined activity; invalid gate, not hidden |
| Approved standard default rerun | 2,932 tests: 2,889 passed / exactly 2 known failures / 41 skipped; exit 1; 191.0 seconds; peak 979,323,464 bytes; no remaining PIDs |
| Whitespace / hygiene | clean final diff; no raw logs, home paths or process dumps retained |
No coverage percentage, provider or production acceptance is asserted. Default
suite tolerance is exactly the two existing deferred styling failures, not a
blanket waiver. Metrics and concise lifecycle summaries are retained; raw logs,
process dumps and home paths are not committed.

The first default invocation error is the executor's: the provider-free preload
was retained but its synthetic-loopback allowance was omitted. Coordinator
`msg_c521fa9c68df` approved one standard rerun without the custom preload, unsetting
DATABASE_URI, MEMBER_AUTH_TEST_DATABASE_URL and COMMERCE_PAYLOAD_DATABASE_TESTS.
It also identifies operator-ui-dom's post-test window-is-undefined as the known
RED-04 teardown flake, nonblocking only when every test assertion passes. Any
other extra failure remains a final blocker; no unrelated source/test is changed.
The approved rerun has no extra failures or post-test asynchronous warnings.
Its only failures are `tests/styling/deferred-article-grid.test.tsx` and
`tests/styling/deferred-clock-delegation.test.ts`. No failure waiver was needed.

The exact full typecheck used `node node_modules/typescript/bin/tsc --noEmit
--incremental false` under the required resource guard; the default suite used
the approved standard `node tests/run-unit.mjs` without a custom preload.
Completed guard metrics are retained as `evidence/c3-*.metrics.json`; changed
source/test paths are listed in `evidence/c3-changed-paths.txt`, and the actual
container create/remove lifecycle is in `evidence/c3-container-lifecycle.txt`.
Every completed receipt reports no remaining PIDs or uncertain cleanup. The
checkout-local raw-log/cache directory was removed after the final suite.

## Disposable Database And Cleanup

Only new `sphmrs-i2-c3-20261114-5326e229`, volume
`sphmrs-i2-c3-20261114-5326e229-data`, loopback `127.0.0.1:55491 -> 5432`;
image `sha256:a902560563d3a5661228585f53474c5065e7f273b21ffd77e555a8b5682c5690`;
384 MiB memory/swap ceiling, no pull, synthetic loopback trust.
Existing dev postgres is untouched. The owned container and its volume were
removed after the successful proof; filtered container/volume inventories are empty.
Host RAM verified as 51,539,607,552 bytes (48 GiB); guards require 10 GiB
headroom. Container memory is counted separately from guarded test RSS.

Independent custodian/security/database/Santa acceptance, I3/provider, I4/I5 UI,
I6 scheduling/catch-up and owner activation remain separate. No push, deployment,
package-manager script or environment-file read occurred.
No agent-owned test/dev/database service remains; active Codex/MCP clients and
unrelated user processes are preserved. Only evidence/documentation follows the
validated source/test commit; the final source hash is unchanged.
