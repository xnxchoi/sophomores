# SPH-T002-P2A-20261113-01 — candidate handback

## Review panel

**Review checkpoint; provider-free candidate, not production acceptance.**

| Completed / evidence | Current work | Remaining / fragile final pass |
| --- | --- | --- |
| Immutable kernel; original 44 RED tests; final 54 focused tests GREEN; deterministic scheduler; line/branch coverage above 80%; exact results in `validation-receipts.json` | Final default suite and whitespace gates complete; preparing local commit | Custodian specialist/independent Santa reviews; separate approval for schemas and production wiring |
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
