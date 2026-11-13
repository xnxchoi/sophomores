# SPH-T002-P2A-20261113-01 — candidate handback

## Original candidate review panel (historical)

**Review checkpoint; provider-free candidate, not production acceptance.**

| Completed / evidence | Current work | Remaining / fragile final pass |
| --- | --- | --- |
| Immutable kernel; original 44 RED tests; final 54 focused tests GREEN; deterministic scheduler; line/branch coverage above 80%; exact results in `validation-receipts.json` | Local candidate committed; ready for custodian review | Custodian specialist/independent Santa reviews; separate approval for schemas and production wiring |
| Full typecheck run twice only; run 1 exposed TS2339 in a test assertion, fixed; run 2 exits 0 | No additional typecheck allowed under this dispatch | Final runtime-only privacy guard reordering occurred after run 2; focused/default suites revalidated afterward; exact-final-revision typecheck remains a custodian review consideration |

## Identity / scope

- Identity base and pre-edit HEAD: `42c4c4849c5ef951aa4557219d88f5978321c649` (main commit adding assignment), initially clean.
- Initial Orca branch `xnxchoi/t002-p2a-20261113` renamed before editing to `codex/t002-p2a-20261113`.
- Worktree: `$HOME/orca/workspaces/sphmrs/t002-p2a-20261113`.
- Only production path: `src/lib/commerce/token-entitlements.ts`; only test paths: `tests/commerce/domain/token-entitlements.test.ts` and `tests/commerce/domain/token-entitlements-fixtures.ts`; remaining changes confined to this QA directory.
- `node_modules` is the batch-authorized ignored symlink to `$HOME/Projects/sphmrs/node_modules`; no dependency/environment installation or configuration change.
- Commit/packet identity is recorded below after validation. No merge, push, provider, DB, credential, UI, catalogue, schema or production-wiring changes.

See `contract.md` for records, selected/held policies, command ownership, rank-ordered lock map and test-list mapping. All-unselected settlement allocates every unit; selected per-event holder admission changes only the explicitly authorized branch. Existing-holder gift refusal is independent of gift existence/activation/financial state and returns no gift result. Holder attendance adds occupancy without consuming a sold unit.

## Commands and validation

Every Node workload was serialized through `scripts/resource-guard.py`, with checkout-local `TMPDIR=$PWD/docs/qa/t002-p2a-20261113/.work`, unset `DATABASE_URI`, `MEMBER_AUTH_TEST_DATABASE_URL`, `COMMERCE_PAYLOAD_DATABASE_TESTS`, and a checkout-local `--log "$TMPDIR/<phase>"` prefix.

Guard prefix for focused/default runs:

`python3 scripts/resource-guard.py --max-gib 1.5 --node-old-space-mib 1024 --min-headroom-gib 10 --timeout 1200 --log "$TMPDIR/<phase>" --`

- Initial RED: `node --import tsx --test tests/commerce/domain/token-entitlements.test.ts`, before the module existed. Every initial test failed for module absence, not a skipped suite.
- Final focused GREEN / changed-source coverage: `node --import tsx --test --experimental-test-coverage --test-coverage-include="src/lib/commerce/token-entitlements.ts" tests/commerce/domain/token-entitlements.test.ts`. The module is entirely new, so whole-module line/branch percentages are changed-source coverage. See accepted-coverage receipt and summary.
- Default discovery: `node tests/run-unit.mjs`; accepted-default receipt is authoritative. Only the two predeclared deferred styling failures are allowed; skipped tests are disclosed, not counted as executed passes.
- Full typecheck (exactly two attempts): `python3 scripts/resource-guard.py --max-gib 3.5 --node-old-space-mib 2048 --min-headroom-gib 10 --timeout 600 --log "$TMPDIR/typecheck-<n>" -- node_modules/.bin/tsc --noEmit --incremental false`.
- Whitespace and scope: `git diff --check` plus staged `git diff --cached --check`; explicit path allowlist and secret/home-path scan before commit.

`validation-receipts.json` preserves small sanitized supervisor receipts, summaries, failed-test titles and final source hashes, not raw logs. Raw logs remain ignored under `.work/`. Historical failures are intentionally retained: missing module RED; legacy-usage/provenance corruption; logical replay/holder hold; payment alias; gift-state privacy; cross-account command-identity privacy; first typecheck assertion defect. Final privacy fixes moved existing checks without changing exported type contracts; no third full typecheck was run.

## Resource / process boundaries

Actual physical RAM is 48 GiB (queried with `sysctl -n hw.memsize`, corroborated by `os.sysconf`); `vm_stat` checked before every Node workload. The guard enforced the existing 10 GiB headroom floor and serialized workloads; observed receipts report no remaining child PIDs. Resource receipts are sampled lower-bound observations, not a kernel quota or whole-host allocation guarantee. No dev server/browser/container was started.

The initial sandbox denied `ps`/`sysctl` before a workload could start; guarded runs then used approved process-stat access. This was not a memory-stop bypass. No unrelated process was terminated. No nested agents were used, as required by the batch rule; specialist review stays with the custodian.

## Acceptance boundary / risky final pass

- Synthetic revision scheduling proves stale decisions are discarded and reevaluated, not real PostgreSQL locking or production transactions.
- Confirm real integration uses authoritative holder evidence, capacity/eligibility inputs and the full upfront lock set; the kernel cannot establish that externally.
- Reserved-self production command has no assigned owner; retire/delegate old named entry in both guests.ts and domain.ts only under a separate integration allowlist.
- Proof/consent, no-name link policy, forced-self holder commercial disposition, issuance, benefit timing, token reversal and cancellation remain with their stated owners/fixtures. Cancellation must preserve used capacity and free allowance exactly once; no P2b implementation is imported.
- No real provider, database, payment, door, physical-device, live UI or deployment behavior was tested or accepted. Independent review is pending, not owner preference or provider acceptance.

## Validated result summary

- Focused final: 54 passed, no failures; new-module line coverage 99.14%, branch coverage 96.59%.
- Final default: 2,741 tests; 2,700 passed, 39 skipped, exactly 2 known deferred styling failures. No additional failures or cancellations.
- Full typecheck: second attempt exit 0, prescribed limits; two attempts total. See temporal qualification above.
- All recorded guards ended with no remaining PIDs and no uncertain cleanup. No resource stop occurred.
- `git diff --check` is clean; staged check and scoped commit packet recorded below.

## Candidate packet identity

- SHA256 of staged binary diff against identity base, excluding this self-referential handback: `0afdccac7e676a2e6798bd7794b293b36d0d457756e399320dac27d14c39a91c`.
- Owned-path audit and staged `git diff --cached --check`: clean.
- Review: local source/guard review completed; independent specialist/Santa review remains with the custodian.

- Implementation/evidence commit HEAD: `68650a33cf04739673de0021ea9add935281c753` on `codex/t002-p2a-20261113`; worktree clean immediately after that commit. This final handback annotation is a separate documentation-only commit; its HEAD is supplied in worker_done.
- Owned workload cleanup: every completed guard receipt has `remaining_pids: []`; no preview, browser or container remains from this task.

## Rework cycle 1

**Review checkpoint: all rework cycle 1 local gates complete.** Base candidate: `ab9cd2e49631d9c6dc10e3d27284a2a14f3d474a`. Custodian independently typechecked that exact original candidate successfully; the new revision receives its own final check after all source/test edits. This section supersedes the historical original-candidate checkpoint above.

| Review item | Change and regression evidence |
| --- | --- |
| Required 1 — bearer/unit-state privacy | Activation validates digest and generation immediately after lookup, before inspecting unit state; missing/bad bearer both return `UNAVAILABLE`. Account-only holder refusal stays independent of unit state. Missing/non-owned buyer-link units also share `UNAVAILABLE`. Wrong-digest and wrong-generation matrix covers available/self/held/review/bound/activated/missing states with unchanged input references; buyer-link matrix covers missing and non-owned self/gift units. |
| Required 2 — mutable settlement evidence | First-settlement holder flags are excluded from immutable replay comparison. Regression settles a self allocation, binds the buyer to a different event's gift, then changes both flags on retry; original paid allocation and state identity are retained. |
| Required 3 — corrupt replays | Domain-local activation graph validation checks activated account/time, immutable entitlement/admission/capability identities, consumed capability, one intent and matching membership operation/target/status. Paid attendance uses that same check and requires recorded arrival; holder replay validates a single canonical recorded attendance and confirmed slot. Parameterized corrupt activation, paid-attendance and holder-attendance tests all require `INTEGRITY`, including absent slot, missing activation/intent/timestamp, wrong operation/admission ID and duplicate holder records. |
| Required 4 — account occupancy overwrite | A valid-bearer activation cannot overwrite a different admission account/claimed account; regression requires `INTEGRITY` and the identical input state. |
| LOW — activation timestamp | Replay identity excludes client `at`; retry with a fresh timestamp returns original result and committed activation time. |
| LOW — runtime actor mode | Unknown modes return `INVALID_INPUT` before binding; staff consent fixture remains explicit. |
| LOW — race losers / private results | Tests 03/05 assert exact refusal codes through the shared refusal assertion, which also checks unchanged state and absence of any claimant/result value. |
| LOW — vacuous assertions | Replaced duplicate/literal benefit/perk/fixture assertions with actual unit identity, recorded timestamp, occupancy count, late-activation non-attendance, unchanged membership/intent state and real intact capability/hold checks. No fake `newMembershipOperations: 0` comparison remains. |
| LOW — settlement fixtures | Already-holder and past-event fixtures explicitly allocate every paid unit as a gift under the selected event rule, without issuer/slot effects or token-policy holds; replay remains stable. |
| LOW — holder occupancy | Tests cover holder arrival refused by existing sold occupancy, recorded holder occupancy blocking a later gift, and intact gifts with/without available slot history. |
| LOW — policy holds | Gift and holder-admitted buyer rights are acquisition rights without a fictitious unselected-policy hold. Only a verified already-holder's forced self right under the non-holder-admitting branch retains the genuinely unresolved commercial hold. |
| LOW — known gap | `contract.md` and an executable confirmation fixture preserve the tokenless-self-buyer → holder-elsewhere gap: self activation refuses `ALREADY_HOLDS_TOKEN`, confirmed-holder arrival refuses `EVENT_ALREADY_BOUND`, and the original self reservation stays intact. No resolution policy was selected. |
| LOW — receipt consistency | The final current coverage run is exclusively `rework1-final-coverage`; cycle-zero runs remain explicitly historical. Current acceptance receipt references and frozen source hashes are recorded in `validation-receipts.json`. |
| Optional record variants | Not applied: record/API expansion was unnecessary for these bounded fixes. |

### RED / GREEN ledger and final gates

- Initial rework RED: 84 tests, 32 failed. A fixture initially attempted buyer gift activation in the buyer's already-reserved event; it was corrected to acquire the token through another event, then rerun against unchanged production code with the intended replay assertion still RED. Both receipts are retained.
- Additional corruption RED: 86 tests, 2 failed, before admission-identity and confirmed-slot-reference checks.
- Single final coverage run: 87 tests passed, 100% changed-module line coverage and 96.05% branch coverage; no failures/skips/cancellations.
- Final default discovery: 2,774 tests; 2,733 passed, 39 skipped, exactly the 2 known deferred styling failures; exit 1 is the documented expected failure set, not a green default-suite exit.
- One full rework typecheck: exit 0 on the final frozen source/test hashes, using the prescribed 3.5 GiB / 2048 MiB / 10 GiB headroom / 600-second limits. No source/test edit followed it; only check receipts and this handback were updated.
- All source/test files were frozen immediately after the named final coverage run; final guard receipts and hashes establish the same revision for later checks. Only review/evidence documentation may be updated to record check results.

Fragile final pass: verify stable private refusals, cross-record consistency on authorized replay, no unit reassignment in the documented known gap, exact frozen source hashes across final gates, and no new non-styling default failure. Independent specialist and Santa review remain with the custodian; synthetic checks establish no database/provider/production acceptance. No worker delegation, server, browser or container was started.

### Rework cycle 1 closing evidence

- Final coverage/default/typecheck receipt names, exact commands and matching source hashes are selected explicitly under `finalAcceptance` in `validation-receipts.json`; every prior cycle or intermediate run is labelled historical.
- `git diff --check` is clean; final staging is restricted to the owned source/test and QA paths. Full-module coverage is changed-module coverage for this new isolated kernel.
- No guarded workload remains: every cycle receipt has an empty remaining-PID list and no uncertain cleanup; no resource stop occurred. Raw logs remain ignored and uncommitted.
- All required and LOW review items are addressed above; the documented self-reservation/holder gap is intentionally unresolved policy, not a hidden success or a production choice. Custodian specialist/Santa re-review and separately approved integration remain pending.

- Rework staged-packet SHA256 against the base candidate, excluding this self-referential handback: `82c41d1d7ab19119aff5a8261dd4fad28b613f32973e843496dc358de5d0f98a`; final commit HEAD is supplied in worker_done.
