# T004-I0 pre-review fix — custodian deterministic check failed, 2026-11-12

Candidate `b1b4985d74c317f6447f04a9c942486545494fcf` (implementation `450e996`, diff
SHA256 `ce25ba5c…8777`, matched). Scope is clean: no schema, migration, dependency or
`messages/` change. The custodian ran the full typecheck in this worktree under its own
budget:

`resource-guard.py --max-gib 3.5 --node-old-space-mib 2048 --min-headroom-gib 10 -- tsc --noEmit --incremental false`

It completed with **exit 2, 7 errors** (peak 2.32 GB, remaining PIDs `[]`). The heap was
not exhausted. Every error sits on a line this candidate added; `src/` compiles cleanly.

| File:line | Error |
|---|---|
| `tests/commerce/core/official-transaction-end.test.ts:53:66`, `:57:60` | TS2352 `Drizzle & PostgresDB` → `(PostgresDB \| TransactionPg) & DrizzleTransaction` |
| `tests/commerce/core/official-transaction-end.test.ts:56:31` | TS2739 fake missing `BasePayload` members `_initializeCrons, bin, delete, init, update` |
| `tests/commerce/core/transaction-end.test.ts:69:26` | TS2352 `() => Promise<{id}>` → overloaded Local API signature |
| `tests/commerce/portone/retirement.test.ts:63:5`, `review.test.ts:48:3`, `webhook.test.ts:49:3` | TS2322 `PostgresAdapter` → `DatabaseAdapter` (`beginTransaction` options) |

## Required

1. Make the full typecheck exit 0 by changing only test and fixture files under
   `tests/`. Do not change `src/`. Do not weaken any assertion, and do not use
   `@ts-ignore`/`@ts-expect-error` or an `any` cast as a blanket suppression. A narrow
   `as unknown as <InstalledType>` at a fake's boundary is acceptable where the fake
   intentionally implements only part of an installed type. Say which installed type
   each fake now satisfies.
2. **Budget override for this fix only:** you may run the full typecheck at most twice,
   serially, as
   `python3 scripts/resource-guard.py --max-gib 3 --node-old-space-mib 2048 --min-headroom-gib 10 --timeout 600 --log <checkout-local path> -- node_modules/.bin/tsc --noEmit --incremental false`.
   All other workloads stay at the shared-rules limits. Then rerun the affected commerce
   tests under the shared limits.
3. Commit the fix as a new commit (no amend or rebase). Append a "Pre-review fix"
   section to the handback with the typecheck and commerce results and their receipts,
   then send one `worker_done`.

Reviews start only after the custodian re-verifies typecheck and scope.
