# T004 I2 — fix-4 review rubric (owner-authorized final round)

**Candidate:** branch `codex/t004-i2-20261114`, HEAD `2fd7d96`, source commit `b591c0b`, built on cycle-3 candidate `e8983be`. Worktree: `orca/workspaces/sphmrs/t004-i2-20261114`.

**Contract:** [fix-4-owner-authorized.md](fix-4-owner-authorized.md), items 1–3. The previously reviewed guarantees are in [review-rubric-c3.md](review-rubric-c3.md). Cycle 3 confirmed every rework-2 item except the defects that fix 4 targets.

**Ground rules:** read-only. Use git and file reads only; no Node, Docker, database or edits. If this round fails, I2 goes to the owner, so report only real, evidenced defects.

PASS only if all four hold. Otherwise FAIL, with file:line evidence.

1. **Fix-4 item 1: busy never fences.**
   - Production retries `endReconciliation` and `retainReconciliationRisk` only on lock-busy, with a bounded budget inside the lease.
   - If still busy after that, a completion-pending marker is written on a path that global-key contention cannot block.
   - A later admission recovers from that marker and never produces `ownership-unknown`.
   - The fixture's `retryLedger` is removed.
   - The tests hold a real contending lock during end and retain, and would fail on `e8983be`.
2. **Fix-4 item 2: seen risk events.** `seenRiskEvents` is separate from `riskEvents`, bounded and pruned deterministically. A replayed risk event funded from the ordinary bucket neither bypasses the automatic gates nor spends extra ordinary GETs. The test proves this.
3. **Fix-4 item 3: integrity failures are not "busy".** Each of these is a known integrity stop, not a retryable `busy`, and each has a test:
   - identity mismatch;
   - an ambiguous ledger;
   - a stored-state parse failure.
4. **No regression, scope and hygiene.**
   - Every review-rubric-c3 guarantee still holds:
     - one operation per attempt;
     - debit recorded before dispatch;
     - server-owned policy;
     - Paid acknowledgement and the risk reserve;
     - proven rejections are never recorded as unknown;
     - a crashed holder keeps its slot until expiry;
     - the I1 decoder stays strict;
     - `runtime.ts` stays sanitized.
   - Nothing outside fix-4 scope changed.
   - No home paths, secrets, raw logs or process audit appear in committed files.

**Report:** a verdict, then findings by severity (CRITICAL/HIGH/MEDIUM/LOW) with evidence. Under 600 words.
