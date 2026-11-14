# SPH-T004-I1-20261113-01: rework cycle 1 of 3

This is a resumed assignment in the existing worktree
`orca/workspaces/sphmrs/t004-i1-20261113`, branch `codex/t004-i1-20261113`. The prior
candidate is `c5cb02f`. Its runtime was released after `worker_done`. The original
spec, shared rules, owned paths and coordinator scope extension (`msg_d60ed9ddf3ca`)
all still apply. Keep every prior receipt and failure.

## Review result, cycle 1

| Review | Verdict |
|---|---|
| Security | PASS (LOW only) |
| Santa A | PASS (LOW only) |
| Santa B | FAIL (2 MEDIUM) |

The custodian checked both MEDIUM findings against the source and confirmed them.

## Required corrections

1. **MEDIUM: a terminal row with contradictory local evidence** (`result.ts:89`).
   - Today a `failed`, `cancelled` or `refunded` transaction returns `local-terminal`
     immediately after `validateOrder`, even when an order is linked or the
     reservation is settled, ordered or holds admissions. Design §4 and row B16 say
     failure requires that no contradictory local evidence exist.
   - **Fix:** a terminal row returns `local-terminal` only when there is no linked or
     matching order, and the reservation is validated and in a non-settled,
     non-ordered state with no order reference.
   - Any contradiction returns `review-required` (with `orderID` only after the order
     validates). Corrupt shapes stay `integrity-stop`.
   - **Tests:** RED first.
     - A failed row with a valid linked order and a settled reservation gives
       `review-required`.
     - A failed row with a clean released reservation gives `local-terminal`.
     - Correct the existing "terminal statuses" fixture, which currently asserts the
       contradictory case.
2. **MEDIUM: generic provider 404** (`proof.ts`, `outcome.ts`). Rows B07 and B13 and
   rubric item 4 require a generic 404 to be its own observation, distinct from typed
   `PAYMENT_NOT_FOUND` and from integrity corruption.
   - **Fix:** add an explicit classifier input and observation kind for a generic
     provider 404, for example `provider-not-found-generic`.
   - It never aliases to typed not-found. It does not prove the customer was never
     charged. It triggers no retirement and no retry, and `automatic` stays
     `stopped`.
   - Do not change `src/lib/tickets/portone/runtime.ts`. Feeding it into the runtime
     belongs to I3. Record that in the handback as a remaining gate.
   - Also give the currently producer-less `unavailable` kind a test or remove it,
     and add an explicit return type to `projectPaymentObservation`.
   - **Tests:** RED first.
3. **LOW, required because it closes the bypass:** `ecommerce.ts:196`.
   - Replace the `endsWith("/result")` clause with an exact match: the endpoint's
     own path equals the adapter's result path, and its method is `get`. Leave the
     existing `/pending` and `/webhooks` clauses byte-identical; they are out of
     scope.
   - Replace the source-regex test with a behavioural test showing two things:
     - a non-GET endpoint whose path ends in `/result` still goes through the
       mutation guard;
     - the real `/result` GET reaches its own authority.
4. **LOW, small cleanups.**
   - **5xx without the exact rejection envelope** (`confirm-transport.ts:41-47`).
     A 5xx response whose body lacks the exact `COMMERCE_REJECTED` envelope (an HTML
     or JSON gateway page) is classified as **completion-unknown**, not
     receipt-integrity. A 2xx body with invalid JSON or schema stays
     receipt-integrity.
   - **Missing `req.url`** (`result.ts:116`). An absent or empty `req.url` returns
     400 `invalid-request`, not 503.
   - **Handback paths.** Use worktree-relative paths in the handback; there is no
     absolute home path at line 9.

Do not change anything else. Do not touch the rate limiter, the snapshot disclosure
or the capacity coupling. Record them as known LOW findings.

## Gates

- Focused tests plus the existing proof regressions.
- Native coverage of the changed lines of at least 80%.
- One full typecheck of the exact final source, run with `--max-gib 3.5
  --node-old-space-mib 2048 --min-headroom-gib 10 --timeout 600`. Keep its log so it
  can be checked. If the log is empty, record why.
- The default suite: only the 2 known styling failures. Record any recurrence of the
  intermittent `member-auth-ui-dom.test.tsx:575` failure.
- `git diff --check` clean.

Commit new commits, with no amend. Append a "Rework cycle 1" section to the handback
that gives the new source/test diff hash, then send one `worker_done`. Make no
durability claim.
