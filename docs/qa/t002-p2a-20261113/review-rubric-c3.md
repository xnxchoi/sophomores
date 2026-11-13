# P2a review rubric — cycle 3 (final allowed)

This review is read-only: edit nothing. You may read files and run `git`, `grep` and `python3`. Do not run Node workloads, because the custodian runs those.

**Candidate.** Worktree `/Users/seanschoi/orca/workspaces/sphmrs/t002-p2a-20261113`, commit `dbaf88e2f5d3393b3fd6e43d653f959fd2aa9996`, base `42c4c48`. The full diff from the base has SHA-256 `5235b799…30a2`.

**Read:**
- Assignment: `docs/qa/t002-p2a-20261113/spec.md`, including its four owner answers.
- Contract: the P2a section of `docs/qa/t002-a-20261113/model.md`.
- Corrections to verify, in the main checkout `/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`:
  - `docs/qa/t002-p2a-20261113/rework-1.md`
  - `docs/qa/t002-p2a-20261113/rework-2.md`
- Candidate files:
  - `src/lib/commerce/token-entitlements.ts`
  - `tests/commerce/domain/token-entitlements.test.ts`
  - `tests/commerce/domain/token-entitlements-fixtures.ts`
  - `docs/qa/t002-p2a-20261113/{handback.md,contract.md,validation-receipts.json}`
- Owner policy: the `### T002` section of the main checkout's `docs/To-Do List.md`. Tokens are typed. This build is single-type (launch token only), and adding types is a recorded follow-up.

**Custodian facts.** A full typecheck of the exact revision `dbaf88e` exits 0, with a 2.40 GB peak and no remaining PIDs. The kernel has no imports.

**Rubric.** Give PASS or FAIL for each item, citing `file:line`.

1. **Cycle-2 fixes.**
   - `activateUnit` refuses an entitlement with an unresolved `policyHold` (`POLICY_REQUIRED`). The check comes after the bearer check, consumes nothing, and is tested without a seeded holder slot.
   - The bearer-privacy `activated` probe uses a distinct `commandID` and genuinely exercises the bearer-first order.
   - Held and activated states are covered for regeneration and gift-link privacy.
   - The LOW items are applied or explained: `timingApproved` is out of replay identity; regeneration replay is re-validated; `recordAttendance` foreign-account codes are consistent; `attendHolder` replay works; there is a b-wins race ordering; test 12 asserts intent and slot; staff-guided is tested; handback labels are correct.
2. **No regression of cycle-1 fixes.** Bearer-first ordering in all three commands. Settlement replay ignores mutable flags. Replays re-validate state. Overwrite of an occupied unit is refused.
3. **Correctness.** Look for any new logic bug, missing guard or silent fallback the changes introduced. Check whether any decision can return success while leaving state inconsistent.
4. **Tests.** Not vacuous. New behaviour was RED first, or is honestly labelled as characterisation. Coverage of 100% lines and 96.38% branches is supported by the single named final run in the receipts.
5. **Scope and evidence.** Only owned paths change. No raw logs or home paths. No PostgreSQL or production claim.

**Severity.** HIGH blocks acceptance, MEDIUM must be fixed, LOW is optional. The verdict is PASS only with no HIGH or MEDIUM. Keep the report under 450 words, verdict first.
