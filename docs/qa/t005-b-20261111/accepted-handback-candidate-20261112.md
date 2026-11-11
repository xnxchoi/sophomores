# SPH-T005-B-20261111-01 — CANDIDATE handback after restart

## Exact identity / disposition
- Execution chat: `01a1ca3b-c6b6-7890-9c58-94885f1c1631`, local host.
- Worktree: `/Users/seanschoi/.codex/worktrees/3041/sphmrs`; managed Git identity `/Users/seanschoi/Projects/sphmrs/.git/worktrees/sphmrs2`.
- Branch: `codex/t005-b-claim-result-20261111`.
- Original base: `3c853b0e670abde45f591f2f86d09dbbf4472983`. Current accepted G1 dependency base / HEAD: `92cfe64cb2798791254c2dccfcad9c798680b2e4`, explicitly authorized and integrated privately by custodian, not by this execution. `accepted-g1-dependency-integration.json` and source hashes verified before resuming.
- **Uncommitted frozen candidate**: `8d133552ce90f7b8747e5836824666378680065fedda400451e0ce4e3d93b351`; source/input identity reverified after both reviews and cleanup. No new local commit, staging, main merge, remote push, parent completion, learning or archive.
- Status: **CANDIDATE, custodian acceptance/integration pending**. This supersedes the earlier local blockers but preserves both old blocked handbacks and all failures as history. It does not mark parent T005 complete.

Candidate identity derivation is SHA256 of UTF-8 Python `json.dumps({"base": frozen["accepted_dependency_base"], "source_hashes": frozen["source_hashes"]}, sort_keys=True)` with default comma-space/colon-space separators and no trailing newline. Machine-readable values: `restart-frozen-source.json`.

| Frozen path, relative to worktree | SHA256 |
|---|---|
| `src/lib/commerce/guests.ts` | `2d512c7d3c3e50769297b6529452ada716d934d7f69683eacba83c183b907bcc` |
| `tests/commerce/domain/claim-http.test.ts` | `6459c61f83d77e3dc8a4da0588c2a98542ffbabb6b352fd76972cb12bc5f72ce` |
| `tests/commerce/domain/claim-recovery.test.ts` | `6595e6684d793795c545035c0b71ca898cb39d7045c20c20255332517070c7e5` |
| `tests/commerce/domain/guests.test.ts` | `e3816c3f60a5f3aaee3e33b5a1e416ef5219859e884dc5e4f8fd615937da4a8a` |
| `tests/commerce/domain/claim-outcomes.test.ts` (unchanged) | `71ad32fece0cd513b09a09c3f2be6c8cf394d9a7dc777bb70e1f1bdba8900a1e` |

## Bounded changes / outcome
The original lost-success recovery change remains only in `guests.ts`: a consumed, still-valid original bearer may return its original admission to its same eligible canonical claimant after exact claim/admission/account/event occupancy validation under existing locks. No second grant/transfer/reissue, write/counter/status/timestamp/benefit reset. Foreign consumed rejection, bearer digest/revocation, expiry/cutoff, readiness, holds, integrity failures, native completion and non-claim contracts remain authoritative.

Owned tests cover domain original-receipt replay, zero attempted writes and unchanged benefits/state; serialized-model first-claim/replay races and under-lock integrity/storage faults; actual-domain/native-transaction HTTP acknowledgement and delayed commit/fault/privacy boundaries. `guests.test.ts` was modified only inside the authorized stale test: original receipt + independent create/update/raw-counter call counts + unchanged state, foreign consumed rejection, with rotation, individual verification and locked-name invariants retained. No new production helper, package, endpoint or unrelated source change.

This restart's sole new production/test edit is that authorized guest-test amendment. Earlier B source is byte-identical to the preserved candidate. Owned QA additions include actual postrestart resource/check/review/source-freeze evidence and this handback. All eight protected source/catalogue/instruction/transaction files match accepted dependency base (`restart-scope-check.json`); no canonical source, registry, plan, custodian baseline/dispatch or S1/delivery surface edited.

## Actual RED → GREEN / deterministic checks
| Check | Actual result and evidence |
|---|---|
| Original behavior RED | `red.log.m6laetei.log`: both new receipt tests rejected with `CLAIM_CONSUMED` before implementation. The original guests.ts SHA256 equals guests.ts at accepted G1 base: `523ba30d65d0cfbb90185dc80370d7523431d60861d2e9666e16596825de55f5`. No reset or WIP transfer was used. |
| Postrestart obsolete guest assertion RED | `restart-red.log.wg8ar7h3.log`: 6/7, old same-claimant consumed-rejection assertion fails as expected. This is a test-contract RED, not falsely presented as a second behavior RED. |
| Affected guest/claim/native HTTP + adjacent regression GREEN | **173/173 PASS**, `restart-green.log.h7yls3t7.log`, exit0. Eight serial suites: guests, claim-recovery, claim-outcomes, claim-http, claim-native-transaction, allocation, returns, lifecycle. No DB/provider or bundled build suite. |
| Scoped real TypeScript program | **PASS**, exit0, empty diagnostic log `restart-typecheck.log.x03hlhoi.log`. `restart-scoped-tsconfig.json` includes changed source and eight affected suites with ordinary transitive imports; no stubs, diagnostic suppression, noCheck or source swap. Accepted G1 resolves the previous exact-base diagnostics. Not a full-project typecheck claim. |
| Scoped ESLint | **PASS**, exit0, `restart-lint.log.4ry71bz6.log`, all four modified TS files. |
| Whitespace / ownership / frozen inputs | `git diff --check` PASS; tracked modified source paths only guests.ts, claim-http.test.ts and guests.test.ts, plus new owned claim-recovery.test.ts and QA. All frozen source and common review-input hashes reverified unchanged after verdicts. |

`restart-check-receipts.json` indexes exact guard logs/receipts. Each Node workload used `scripts/resource-guard.py --max-gib 1`, heap ≤640 MiB, timeout ≤180s, one job per checkout; native tests used test-concurrency=1. Sandbox denied network and all writes outside this checkout except `/dev/null`; clean environment and checkout-local temp/HOME, TSX cache disabled, canonical dependencies read-only. No install/fetch/env/credentials/provider/DB/services/build/preview/browser. No 80% whole-module, full-project build/typecheck, production, real database isolation/durability or provider/runtime/customer UI acceptance claim.

## Required review gates — exact same frozen output
- **Combined code specialist:** `/root/specialist_review` (code-reviewer) reviewed correctness, TypeScript, security/privacy, test invariants and current QA census. All five source hashes and accepted dependency HEAD matched; **APPROVE, no reportable findings**. `restart-specialist-review.md`. Earlier one MEDIUM write-spy false-positive finding and fix retained; no new specialist fix on this resumption.
- **Fresh independent Santa A:** `/root/santa_round1_a`, role typescript-reviewer, fork_turns=none. **PASS all six criteria**, no critical issues; `restart-santa-a.json`.
- **Fresh independent Santa B:** `/root/santa_round1_b`, role security-reviewer, fork_turns=none. **PASS all six criteria**, no critical issues; `restart-santa-b.json`.
- Both received identical original spec/output/rubric prompt and common packet (`restart-santa-packet.md`, inputs in `restart-review-input-hashes.json`); neither read another assessment or communicated with its peer. Results were persisted only after both verdicts returned. Both independently verified actual source and recorded evidence, no workloads or external actions.
- **Santa round 1/3 passed; 0 Santa source-fix cycles.** Nonblocking suggestions retained, not opportunistically implemented on a frozen candidate: put identity serialization directly into future packets; optional explicit currentClaim.id/occupied.eventAccountKey corruption test cases. `restart-review-ledger.json`.

## Retained failed / almost-failed approaches
- Original behavior RED, initial consumed-but-unactivated handling regression, exhausted synthetic HTTP body, own typing/lint errors, original full-project heap OOM, four previous baseline type errors, write-spy false-positive review correction, and two prior blocked handbacks remain preserved. They are not relabeled PASS or erased.
- Previous resumed workload admission stopped safely above aggregate memory limits and retired only exact-own unused clients; that failure remains historical. Current restart establishes a genuinely new lower resource state; no threshold was raised or stop bypassed.
- Restart changed CLI PID from historical 1038 to verified ancestor 46087. New `resource-census-current.py` dynamically resolves actual ancestry; old samples/script remain historical rather than falsely accounting a stale PID.
- Both fresh reviewers initially encountered compressed tool-output markers. Each independently emitted exec_command.output directly and read actual contents before verdict; no fabricated inspection.
- Packet prose omitted identity serialization details. Both received identical no-assessment clarification; no frozen packet/input/source was rewritten mid-review. Common clarification is retained in the ledger and formula above.
- One list_agents and one wait_agent call aborted before dispatch; no action or verdict inferred from either.

## Pending gates / next actor
**Custodian** `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1` must inspect this exact candidate/evidence, accept or return concrete defects, serialize integration with current main/concurrent work, and rerun affected combined gates if source/dependencies change. No B blocker remains in the assigned provider-free local slice; no product-policy choice was needed. G1 publication, S1 and unrelated delivery are not B dependencies.

Real database/native-driver transport/durability/concurrency, deployed runtime/customer UI and provider acceptance remain separately scoped. Expired-bearer recovery, retention/reissue and other broader recovery policy remain unresolved owner decisions outside this implementation. Parent-task completion, learning, integration/commit/push, deployment and archive are custodian-owned, not authorized by these reviews.

## Resource / cleanup handback
- Physical RAM verified **48 GiB**. Current postrestart CLI root verified **46087**, not old 1038. Final full descendant census after delegation: **~3.655 GiB** accounted, **~22.604 GiB** guard-estimated available, no unreadable live PIDs (`restart-census-final.json`). Precheck samples stayed below 13.5 GiB; no concurrent B app workload; aggregate ≤15 GiB and ≥10 GiB headroom constraints retained. Samples are not a kernel quota.
- Largest sampled current job footprint: **702,387,728 bytes (~0.654 GiB)**, scoped tsc; all current guard receipts report no remaining PIDs and no cleanup uncertainty. No cap increase or unguarded retry.
- **Remaining assignment-owned app/workload PIDs: []**. No browser/server/container/build started. Full shared CLI tree audited after specialist/Santa delegation; current usage admitted, no redundant-client termination needed this restart. Active/generic/reporting/user processes preserved.
- Ignored local node_modules link removed after checks; canonical dependency files unchanged. `restart-cleanup-final.json` verifies hashes, verdicts, absence of owned workloads and link cleanup. No persistent listener/background continuation promised.

## Stable direct report
Actual human authorization for assignment-scoped direct reports is retained in `resume-report-authorization.json` (custodian user item `01a1ca6c-39b4-7442-a83a-3b9be043e2cf`). A new stable assignment + this handback hash + candidate status event is persisted in `candidate-report-event.json` before one supported direct report to that custodian. Submission result is recorded there and is not acceptance or handling confirmation. No reply/ack loop or new destination.

Bounded executor stops after this candidate handback and report. No main/remote or parent-status action.
