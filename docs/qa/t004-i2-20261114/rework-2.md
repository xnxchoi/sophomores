# SPH-T004-I2-20261114-01 — rework 2 (cycle-2 reviews: 4 × FAIL; final cycle)

Reviews against [review-rubric-c2.md](review-rubric-c2.md) of candidate `61f5ceb`:

| Review | Verdict |
| --- | --- |
| Security | FAIL |
| Database | FAIL |
| Santa A | FAIL |
| Santa B | FAIL |

The reviewers agree that rework items 1, 3, 6, 8, 9, 13 and 14 hold, as do the crashed-holder retention and the hygiene fixes.

**This is cycle 3 of 3.** If it fails, the work stops and goes to the owner. Fix the items below in new commits. Every fix needs a test that fails without it.

## HIGH (blocking)

1. **A settled attempt must acknowledge its Paid webhook (all four reviewers).**
   - **Bug:** `admission.ts:53-55` returns `409 local-read-required` for a signed event whose row is already `succeeded`. The normal flow (browser confirm first, then webhook) therefore loops redeliveries forever. Past 30 min it also writes `escalation: 'unresolved'` onto a settled order.
   - **Fix:** once the event is durably recorded and the attempt's local outcome is terminal and consistent with the event, return 2xx. Write no admission, generation bump or escalation.
   - **Scope of non-2xx:** keep retryable non-2xx only for events not yet processed to a durable outcome.
   - **Test:** confirm via the browser, then send the Paid webhook. Expect 2xx, no new generation, and no escalation, including when the attempt is more than 30 min old.
2. **Ledger connection failures and lock waits are not "unknown".**
   - **Bug:** a pool acquire timeout or connect failure before `BEGIN` currently poisons the holder and fences the attempt permanently. Nothing was debited or dispatched.
   - **The ledger pool can also starve.** Ledger transactions wait on an attempt advisory lock held by an open settlement, and each wait holds one of only 2 ledger connections for up to 5 s. Two same-attempt waiters then exhaust the pool for everyone.
   - **Fix:**
     - (a) Classify pre-`BEGIN` connect and acquire failures as a known, effect-free rejection: never poison, never mark unknown, release nothing that was never reserved.
     - (b) Ledger lock acquisition must not hold a ledger connection while waiting behind a settlement. Use `pg_try_advisory_xact_lock` or a short `lock_timeout`, and return a known `join`/busy outcome.
     - (c) Size the pool for that. State the per-process connection total (main plus ledger).
   - **Test:** a DB test that exhausts the ledger pool and holds a same-attempt settlement lock. Show that other attempts get a known busy/retryable outcome, that no attempt is fenced, and that nothing hangs.

## MEDIUM (blocking)

3. **Spend the risk reserve only when it is used.** Record a risk event id in `riskEvents` only when the decision is `started` with `bucket === 'risk'`. A first delivery that gets join, rate-stop or budget-stop keeps its reserve for the redelivery. Test it.
4. **Only real uncertainty poisons a holder.** In `debitProviderGet`, set `poisoned` only for the provider deadline or transport-level uncertainty. Treat a completed provider HTTP error or a schema or parse failure after a complete body as known (rework-1 item 2). Test both.
5. **Ledger pool error listeners.** Attach pool and client `'error'` handlers the same way `payload.config.ts` does for the main pool, so an idle-client error cannot crash the process. Test it.
6. **Paid webhooks: custodian ruling (design §C3, ingress separate from allowance).**
   - Signed Paid webhooks are provider-pushed authoritative events. They are not gated by the automatic cooldown or the 30-min escalation.
   - They remain bounded by the per-attempt budget, the global ceiling, the per-customer slot and the 24 h lifetime.
   - A genuine late Paid event should settle. Test it more than 30 min after start.
7. **Tests that prove the claims.**
   - Do the expired-holder fence and hold-clear check before `endReconciliation` (`reconciliation.db.test.ts:200-202`), or use a second request carrying the same token.
   - Make the item-5 test reach `assertOrdinaryReconciliation` with a Paid or confirm path funded only by the risk bucket, and fail without the guard.
   - Prove the 4-GET reserve cap and the refusal without signed evidence against Postgres.

## LOW (fix)

8. **Item 12, return path.** When `endReconciliation` returns `'unknown'` after a committed settlement, return the committed response and record the escalation. Do not return 503.
9. **Clock.** Compare `startedAt` using DB time on both sides, for example by reading `createdAt` against `clock_timestamp()` in SQL. No app-clock value should be compared with DB time.
10. **Rate limiter order.** Move the in-memory webhook rate limiter back before any ledger write.
11. **Event journal at cap.** At the 64-event cap, prune or roll the journal deterministically, keeping all risk events. Do not throw on every later event.
12. **Retirement FAILED read before the lock (`review.ts:41`).** Custodian ruling: acceptable only because the FAILED evidence is revalidated inside the lock against the current row and attempt. Assert that revalidation in a test, and document the deviation from §P in the handback.

## Budget

The Codex weekly limit is about 14%. Keep the change minimal. Run one final typecheck, one default suite and the DB proof once, all on the final revision. Then send one `worker_done`.
