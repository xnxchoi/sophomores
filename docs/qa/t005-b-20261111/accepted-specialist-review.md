# Combined specialist review — 1 fix/review cycle

Reviewer: native `/root/specialist_review`, role code-reviewer, read-only isolated context. Explicit combined review dimensions: code correctness/maintainability, TypeScript type safety, security/privacy, locks/native completion. No workloads or external services used by reviewer.

Final reviewed source identity: `6ea3ca1fff0436334daf3314500e4a045cbef6bdeceb0c2be548fb375ddaa898` (all four hashes verified by reviewer against frozen-source.json).

## Finding and fix
- MEDIUM: negative unclassified rejection tests could accept the AssertionError thrown by write spies, masking an attempted write. Fixed only test evidence: independent mock call-count assertions after rejection predicates, plus independent attempted-write count checked after HTTP endpoint completion. Reviewer reread the fix and found no remaining reportable defect.

## Final dimensions
- Correctness: recovery restricted to original claimant/admission with validated linkage and occupancy, returning before writes.
- TypeScript: no new unsafe narrowing/callback issue found; source review is NOT typecheck PASS.
- Security/privacy: bearer, eligibility, expiry/cutoff and hold gates retained; foreign consumed state remains private.
- Locks/native completion: existing order/admission/event-account lock ordering and endpoint completion boundary retained.
- Remaining reportable source findings: CRITICAL 0, HIGH 0, MEDIUM 0, LOW 0.

Verdict: no remaining combined specialist findings; candidate acceptance remains **BLOCKED** by deterministic gates. This is not either Santa review, owner acceptance, DB/provider acceptance or a gate waiver.

## Unwaived blockers
1. Read-only guests.test.ts:45 expects the superseded same-account consumed rejection.
2. Four exact-base TS errors at portone/adapter.ts:142, portone/endpoints.ts:88, bookmarks/index.ts:20, notifications/index.ts:38.

Dual fresh independent Santa reviews: **NOT RUN**; deterministic gate did not pass. Santa cycles: 0/3. No fabricated PASS.
