# T004-I0 rework cycle 1 of 3 — custodian corrections, 2026-11-12

Candidate `78de6a1237e6b90148bf30666a933a5e9f61a56d`. Custodian checks: full typecheck exit
0 at 3.5 GiB, and scope is clean. Reviews:

- Silent-failure/security specialist: PASS with notes, all LOW.
- Santa A: **FAIL**, 1 MEDIUM.
- Santa B: PASS, LOW only.

Santa A and Santa B did not see each other's work. All three reviewers independently
raised the status-collapse defect below. Shared rules and the I0 spec are unchanged
unless this file says otherwise.

## Required

1. **Preserve official rejections (MEDIUM).** `inPaymentEndpoint` (`transaction.ts`
   about :137-149) turns any non-ok official `/initiate` or `/confirm-order`
   `Response` into a plain `Error`. The catch in `ecommerce.ts` (about :213-217) then
   maps it to 503 `COMMERCE_REJECTED`, so a deterministic 400/401/403/404/409 looks
   retryable, and the cause is never logged.
   - Once the settlement's native **rollback is acknowledged**, return the official
     response's original status and body to the client, as the base code did. You may
     use a private carrier or an `APIError` that keeps the status. Do not expose new
     internals.
   - If rollback is not acknowledged, the result stays outcome-unknown (503).
   - Log the rejection cause without printing secrets or whole objects.
   - Write the test first: (a) an official 4xx keeps its status and body after an
     acknowledged rollback; (b) a 4xx with a rejected or absent rollback stays
     unknown/503; (c) official 5xx behaviour is stated and asserted.
2. **Defense in depth (LOW, cheap).** Call `requirePaymentTransaction(req)` first in the
   adapter's `confirmOrder` (`adapter.ts` about :144), matching `initiate`. Add a test
   that an unwrapped `confirmOrder` is refused without performing any write.
3. **Evidence custody (LOW).** You may add small, committed evidence under
   `docs/qa/batch-20261112/t004-i0-20261112-evidence/`. Include the RED, GREEN, typecheck
   and default receipts (`*.metrics.json`), plus a short summary excerpt of each log
   with no full logs. Before adding them, redact process command lines and any absolute
   home paths beyond the worktree. The earlier RED run targeted the legacy helper, so
   state plainly that the final `inPaymentTransaction`-seam tests fail on base only
   because the symbols are absent. Do not manufacture a RED result.
4. **Handback honesty (LOW).** Update the headline status, which still says "typecheck
   unverified". State these limits:
   - The facade guards function calls only. Non-function properties such as
     `db.drizzle`, `sessions` and `payload` are reachable raw.
   - Every facade function becomes async and requires `{req}`. That fails closed, but
     real settlement hooks are unproven until the database proof runs.
   - Note the renamed "Unexpected native transaction settlement" message, and confirm
     that no test or caller matches the old wording.
   - A rejected settlement rollback leaves the observed risk only in request memory.
   - Optional: add a one-line comment on the token-less `deferredRisk` in `review.ts`.

## Checks, serialized

- One full typecheck at
  `--max-gib 3 --node-old-space-mib 2048 --min-headroom-gib 10 --timeout 600`, using the
  same command as the pre-review fix.
- The affected commerce tests under the shared limits.
- One **default** discovery (`node tests/run-unit.mjs`) under the shared limits. The
  expected result is the 2 known deferred-styling failures only.

Before each workload, check headroom. Another Markdown-only Codex worker is running.

## Handback

Commit as new commits, with no amend or rebase. Append a "Rework cycle 1" section that
maps each item to its change and receipts, then send one `worker_done`.
