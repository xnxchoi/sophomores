# SPH-T004-I2-20261114-01 — rework 1 (cycle-1 reviews: 4 × FAIL)

Reviews against [review-rubric-c1.md](review-rubric-c1.md) of candidate `8dd7703`:

| Reviewer | Verdict |
| --- | --- |
| Security | FAIL |
| Database | FAIL |
| Santa A | FAIL |
| Santa B | FAIL |

The custodian checked the HIGH items against the source. The design holds: advisory-lock serialization, debit before dispatch, the token/generation fence, expiry→unknown, and server-owned policy.

Fix the items below in new commits on your branch, in the same worktree. Every fix needs a test that fails without it. Stay within the spec and amendment-1 scope.

## HIGH (blocking)

1. **Connection-pool self-starvation.**
   - **Problem:** `atomic()` (`accounting.ts:56`) opens a second pooled connection while the settlement transaction holds one. `payload.config.ts` uses the pg defaults (max 10, no acquire timeout). At ≥ pool-size concurrent confirms, every request deadlocks.
   - **Fix:** no reconciliation ledger work may need a second pooled connection while a settlement transaction is open. Either:
     - commit the debit and reservation before opening the settlement transaction; or
     - use a small dedicated ledger pool with a bounded `connectionTimeoutMillis`.
     State which one you chose.
   - **Test:** add a DB saturation test whose concurrency exceeds the settlement pool size, and prove no request hangs.
2. **A proven rejection is not "unknown".**
   - **Problem:** `admission.ts:48,52` turns every 5xx and every thrown error into permanent `ownership-unknown`. That includes plugin 500s returned after a confirmed native rollback, `failedEvidence.parse` failures, and deterministic pre-dispatch errors (owner mismatch, unresolved risk).
   - **Fix:** classify the outcome. **Unknown** is only genuinely uncertain ownership: transport timeout or uncertainty, lost commit acknowledgement, lease expiry, or a crash. A proven, rolled-back or deterministic failure ends the operation as known (completed-with-rejection or review) and does not fence the attempt forever.
   - **Tests:**
     - a rejected confirm;
     - Retire pressed while the provider says PAID, followed by a Paid webhook that still settles.
3. **Signed webhooks must not be acknowledged and then dropped.**
   - **Problem:** `admission.ts:44` → `endpoints.ts:141` returns 202 for join, cooldown, budget, lifetime, review and unknown, so PortOne stops redelivering.
   - **Fix:** per design §C3, webhook ingress is separate from the reconciliation allowance. For an authenticated event that this request did not process to a durable outcome, return a retryable non-2xx (409 or 503, matching the base behaviour). Also durably record the event id and type, for Paid as well as risk events, so that I6 catch-up can find it.
   - **Tests:**
     - a join during an active `/resume` ends with a retryable non-2xx and a recorded event;
     - a cooldown stop does the same.

## MEDIUM (blocking)

4. **The risk reserve is spent once per distinct event.**
   - **Problem:** a replayed signed event re-spends the reserve and skips gates (`accounting.ts:90-106`).
   - **Fix:** only the first occurrence of a new risk event id gets the risk bucket. A repeat is treated as ordinary. Cap `riskEvents` (16, like `riskProofs`).
5. **The risk reserve funds risk evidence only.**
   - **Problem:** a risk-funded operation can complete an ordinary settlement and bypass the unresolved/budget escalation.
   - **Fix:** reserve GETs may read cancellation or dispute evidence only. They may not fund confirm-order settlement, and they do not exempt non-risk outcomes from escalation.
6. **Custodian ruling on explicit operations (design §P).**
   - **Problem:** the owner-approved schedule and the 30-minute escalation are the *automatic re-check* policy.
   - **Fix:** cooldown and 30-min escalation gate automatic checks only. Explicit confirm, resume and retire are still bounded by the per-attempt budget, the risk-reserve rules, the global ceiling and the 24 h lifetime, but not by the cooldown or the 30-min escalation.
   - **Test:** a FAILED payment can still be retired 31 minutes after start.
7. **Tests that prove the claims.**
   - Replace the vacuous fence assertion (`reconciliation.db.test.ts:134`). Admit a real holder, let its lease expire, then show that its real token cannot `endReconciliation`, pass the fence, publish a result or clear a hold.
   - Add:
     - a SIGKILL while the transaction or advisory lock is held;
     - a budget-stop case (needed 2 with 11 used), reached through real accounted GETs;
     - reserve refused without signed evidence, and the 4-GET reserve cap;
     - a start barrier in the multi-process contention test.
   - Replace the source-regex "unchanged" checks with behavioural tests: endpoint list, merge filter, and the `/pending`, `/payments/portone/result` and `/webhooks` bypasses.
8. **Consistent lock order.**
   - **Problem:** `retireFailedPayment` takes the reservation locks before the attempt lock, while the other paths go attempt then reservation.
   - **Fix:** make the order the same everywhere, or document and test why it can't cycle.
9. **Fair use of the global ceiling.**
   - **Problem:** one customer can hold the whole 5/s budget.
   - **Fix:** a customer may hold at most one global reservation at a time.

## LOW (fix)

10. Use the DB clock for `startedAt` comparisons (`accounting.ts:86`), so app-clock skew can't reject valid attempts.
11. After admission, re-check that the attempt is not already settled before the first GET (`admission.ts:22-39`).
12. If the financial effect committed and only `endReconciliation` then fails, return the committed response and record the escalation, rather than a 503 after a successful settlement.
13. Add a defensive generation check on the reconciliation row UPDATE. Validate the global-gate shape on write in the collection hook.
14. Make the lease cover worst-case DB work, not just the transport deadlines.

## Hygiene (blocking)

- **No home paths in any committed file.** Do not commit raw `.log` evidence. Keep `.metrics.json` receipts and summarize results in the handback. Replace paths with `<home>`.
- Drop `process-audit.json` from the commit, or redact host PIDs and process names.
- **No branch rewrite needed:** the custodian will squash-merge so removed evidence never reaches main.

## Budget

The Codex weekly limit is about 15%. Keep the change minimal. Run one final typecheck, one default suite, and the DB proof once on the final revision. Then send one `worker_done`.
