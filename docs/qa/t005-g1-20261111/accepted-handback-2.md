# SPH-T005-G1-20261111-01 — candidate 1 handback

## Status / custody

**Candidate locally validated, awaiting custodian acceptance and integration.** This supersedes the execution status, not the preserved history, in `handback.md`. No parent completion, B restart, main integration, commit, archive, external action or production acceptance performed here.

## Exact identity

- Executor chat: `01a1ca5d-6a18-7370-a76b-d8c22cb9e98a`; custodian: `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`; host local.
- Managed checkout: `/Users/seanschoi/.codex/worktrees/b56f/sphmrs`; branch: `codex/t005-g1-type-boundaries-20261111`.
- Base and current HEAD: `3c853b0e670abde45f591f2f86d09dbbf4472983`; **candidate is uncommitted**. Candidate identity is `g1-candidate-1`, five exact SHA256 values in `frozen-candidate-1.json`; final diff/packet/review hashes and source recheck in `final-identity.json`. Patch: `candidate-1.diff`.
- No dirty WIP copied. Canonical registry/plan/baseline/dispatch and B checkout stayed read-only. All non-owned baseline source/catalogue hashes remain exact; all tracked source/test edits are confined to the authorized five-file candidate. No broad staging.

## Owned changes

- Production: only the customer-parameter declaration in `src/lib/commerce/portone/adapter.ts` and `MemberPrincipal` declaration in `src/lib/payload/collections/access.ts`. Runtime code, callers, validation, access policy and native IDs are unchanged.
- Tests: existing `tests/commerce/portone/adapter.test.ts`, new `tests/commerce/portone/request-types.test.ts`, existing `tests/reading/content-collections.test.ts`. Characterize email rejection/validated output/request shape and immutable native ownership, existing absent/falsy-ID no-ops, verified staff preservation, and separate collection privileges. Existing tests retained; new fixture is under root test discovery and explicitly compiler-checked.
- QA only: this directory's execution/check/resource/review evidence. Custodian-owned baseline/dispatch were not created or overwritten here. Local ignored dependency symlink points read-only at canonical installed dependencies; cache/temp remains under this directory's `tmp/`. Preserve these until custodian retirement.

## Actual checks and first review cycle

| Gate | Actual result / evidence |
| --- | --- |
| Exact-base reproduction, before production edits | Four diagnostics match canonical file/line/column/code/message exactly; four roots / 4,171 transitive files. `typecheck-baseline.json` and guard receipt (exit 2). |
| Compiler fixture RED | Same four errors plus eight boundary/omitted-email errors, six roots / 4,173 files. `typecheck-boundary-red.json` (exit 2). |
| Baseline runtime characterization | 17/17 passed before declaration edits. Deliberately no invented runtime RED; tsx execution is not assignability checking. |
| Boundary GREEN, final and post-review revalidation | Zero unfiltered diagnostics on six roots / 4,173 files. `typecheck-boundary-green.json`, `typecheck-final.json`, `typecheck-revalidation.json`. Strict project options retained; only incremental:false overridden. |
| Affected tests and claim regressions | Three sequential **85/85**, zero failures/skips, all three owned tests and three existing claim suites. Guarded, provider/DB-free mocked/in-process checks. |
| Scoped lint | All five candidate files pass after retained fixture-only lint correction. `lint-fixed.log.*.log`. |
| Runtime parity | Both owned production modules emit **non-empty, byte-identical JavaScript** to exact base using actual project compiler options. `runtime-parity.json`. |
| Read-only dependency isolation | Canonical source and dependency write-open denied without writing any contents; local evidence write allowed. Network denied by sandbox profile, no probe performed. `dependency-isolation.json`. |
| Security specialist | PASS, zero blocking issues; `security-review-candidate-1.json`. |
| Fresh Santa / code reviewer | PASS all five common criteria, zero issues; `santa-review-1.json`. |
| Fresh Santa / TypeScript reviewer | PASS all five common criteria, zero issues; `santa-review-2.json`. |

**Review cycle: 1; review-triggered source fixes: 0.** Both Santa agents were fresh, context-isolated and received the same frozen packet/spec/output/rubric; neither was given the other's assessment. They ran sequentially for memory safety. Candidate hashes stayed unchanged through all three reviews and final revalidation. Native TDD and build-error-resolver advisories preceded production edits. Installed Next/Payload/Zod/PortOne docs and versions are recorded; no library helper/dependency added.

## Failures/corrections and validation exclusions

- Original admission stop retained in `handback.md`: 13.833 GiB exceeded the 13.5 GiB prework threshold; no app work or source edit then. Custodian explicitly resumed after exact-identity idle-client cleanup and qualifying admission. Our subsequent specialist startups also recreated unused clients; census/cleanup receipts preserve measured overhead and safe retirement rather than treating it as a permanent product blocker.
- The seven-root `affected-tsconfig.json` attempt, including the reading test's broad React/WebGL/site-layout graph, exhausted the **unchanged 640 MiB heap** (exit 134; peak 887,016,776 bytes; no remaining PIDs). This is retained, **not PASS**. Diagnosed broad UI root was removed in `boundary-tsconfig.json`; all four original roots, both owned production boundaries/callers and the adapter/type fixtures remain checked. No compiler weakening, limit increase or unchanged OOM retry.
- Therefore the reading file is fully runtime-tested and linted, but its entire UI transitive type graph is **not** accepted. The existing full-project B heap failure also remains an explicit prior limitation; no full-project rerun, full-app typecheck or readiness gate claimed.
- Late custodian integration context: custodian reports a separate clean mechanical main/origin history merge at `/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`, with a strict claim/server/music-root graph passing **without G1/B patches** when generated Payload User/module augmentation is included. That result was not independently rerun here. Our four reproduced errors are facts about the recorded exact-base **4,171-file bounded graph**, not proof of whole-main type failure; graph reachability/augmentation materially affects the result. This standalone accurate-declaration candidate is **not an established publication prerequisite**. Parent-approved history/push work is separate; no such action or authority is exercised in this checkout. Candidate source and completed review scope remain frozen.
- Initial lint rejected the empty-object conditional fixture type; corrected with a precise empty-record type, no suppression. Initial guard rejected a relative log path before Node launch; corrected to absolute path. An initial patch failed context verification atomically. Strict initial cleanup stopped when a planned process exited between samples; retained identities/outcomes, then retired the remaining two exact-matching idle clients. All are recorded in the common review packet and receipts.
- No new executable production lines; no global ≥80% coverage claim or new feature E2E/DB/provider proof. No UI/styling changes, browser/preview or live visual acceptance. Independent review is a bounded quality gate, not owner preference or production/provider acceptance.

## Resources and remaining PIDs

- Actual physical RAM: **48 GiB**. Limits unchanged: prework ≤13.5 GiB, total ≤15 GiB, headroom ≥10 GiB, one guarded workload ≤1 GiB, Node heap ≤640 MiB. Every local Node/compiler/test/lint/parity job used the project supervisor, checkout-local writable outputs and read-only shared dependencies. No preview/build/service started.
- Final post-review revalidation: guard peak **718,395,712 bytes**, exit 0, remaining PIDs empty. Whole shared CLI census taken **during that compiler job**: **12.274 GiB accounted**, **17.064 GiB available headroom**; final idle census: **11.929 GiB accounted**, **17.346 GiB headroom**, no unreadable live PIDs. Full shared tree includes tool/browser/executor descendants, not only the check process. These are sampled observations, not a kernel-enforced quota or future reservation.
- **Owned app workload PIDs remaining: none.** `resources-final.json` contains exact remaining shared identities. The generic RPC/reporting process at PID `41265` was deliberately retained (not proven disposable); active/shared/user processes were not terminated. Cleanup only targeted this assignment's exact-provenance completed-specialist/reviewer idle clients, using TERM and identity checks. No blanket claim that every shared tool belongs to this executor or is gone.

## Next actor / smallest acceptance checks

Custodian: verify base/current main and the five frozen source hashes/diff, read the three review verdicts and retained graph/coverage exclusions, then decide bounded acceptance and serialize integration under existing authority. The candidate has no commit to cherry-pick; use the exact five-file patch/source identity rather than copying this checkout's dependency/cache/evidence WIP into main. Integration must preserve unrelated dirty governance work and receive its own combined validation. **Only after accepted integrated G1 may B resume in its existing chat.** Custodian owns learning/retirement/archive; no callback or continuous executor is promised.
