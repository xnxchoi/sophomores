# SPH-T004-I2-20261114-01 — fix 4 (owner-authorized, narrow)

The owner authorized one narrow fourth cycle on 2026-11-14, after cycle 3 failed. This round is limited to the three items below. Make no other changes. If this cycle fails, I2 waits for the owner.

Base: candidate `e8983be`. Merge `origin/main` first.

## 1. Busy at completion must never fence (HIGH, all four reviewers)

**Problem.** `endReconciliation` and `retainReconciliationRisk` try-lock the attempt key and the shared global key. On `KnownLedgerRejection` (busy) they keep the owner, write no marker and never retry. The row stays `active: running`, which becomes permanent `ownership-unknown` once the lease expires. The DB proof passes only because `reconciliation-process-fixture.ts` retries up to 100 times.

**Fix.**
- **Bounded retry, production only.** In production code, retry these two effect-free operations only on lock-busy, using a short bounded backoff whose total stays well inside the lease (for example, up to about 2 s of jittered retries).
- **If still busy after the retry budget,** durably record a known `completion-pending` / catch-up marker. Use a path that cannot be blocked by contention on the global key, such as a separate per-attempt write that needs only the attempt lock, or an immutable event row. When that marker exists, a later admission must recover the attempt and must not turn it into `ownership-unknown` for an effect-free busy.
- **Remove the test-fixture retry** (`retryLedger`) around `end` and `debit`, so the proof exercises production behaviour.

**Tests that would fail today:**
- hold the global lock (a concurrent ledger operation on another attempt) while `endReconciliation` runs; expect it to complete, or to record the marker and later recover, never `ownership-unknown`;
- the same case for `retainReconciliationRisk`.

## 2. Seen risk ids are tracked separately from reserve spend (MEDIUM, Santa A)

**Problem.** Rework-2 item 3 now records an id in `riskEvents` only when the reserve is spent. So a signed risk event funded from the ordinary bucket is never marked seen, and its replays bypass the automatic gates and spend ordinary GETs.

**Fix.**
- Keep a bounded `seenRiskEvents` set, capped at 16 like `riskProofs` and pruned deterministically. It records every risk event id that started an operation from any bucket.
- `riskEvents` stays reserve-spend-only.
- A replay whose id is already in `seenRiskEvents` is treated as non-risk for gating.

**Test:** an ordinary-funded risk event, then a replay. Expect no gate bypass and no extra ordinary GET beyond policy.

## 3. Integrity failures are not "busy" (LOW, three reviewers)

**Fix.** Map only lock-busy and pre-`BEGIN` connect or acquire failures to `busy`. Deterministic integrity failures are a known `review-required`/integrity stop:
- identity mismatch from `exact()`;
- "Ambiguous reconciliation ledger";
- state-parse failure on a stored row.

They are not retryable `busy`.

**Test:** one per class.

## Gates

Run each of these once, on the final revision:
- the DB proof;
- the exact-final typecheck;
- the default suite with the repo's standard invocation and no custom preload.

Commit no raw logs, home paths or pnpm usage. Send one `worker_done`. The Codex weekly limit is about 14%, so stay minimal.
