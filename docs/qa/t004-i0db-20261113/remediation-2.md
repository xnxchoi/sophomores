# SPH-T004-I0DB-20261113-01: remediation 2, 2026-11-13

**Context.** Resume in the existing worktree `orca/workspaces/sphmrs/t004-i0db-20261113`. The prior candidate is `2d017d2`, and its runtime was released. The original spec, [remediation-1.md](remediation-1.md) and the shared rules still apply. Amendment A was withdrawn.

## Fix review, cycle 1

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (1 MEDIUM) |
| Santa A | PASS (2 LOW) |
| Santa B | FAIL (1 MEDIUM) |

The two Santa reviews were independent. Both MEDIUM findings describe the same defect: **the check reads the value at one time and the adapter uses it at another.**

`transaction.ts:194-206` validates the caller's `req` projection with separate live reads, then forwards the caller's own object to the adapter. Drizzle `getTransaction` (`@payloadcms/drizzle/dist/utilities/getTransaction.js:11,17`) reads `req.transactionID` again, and falls back to the pool when that value is missing or unknown. A getter-valued `transactionID`, or a Proxy `req` with `ownKeys`/`get` traps, can pass the check with the owned ID and then hand the adapter `undefined` or a foreign session. The write then commits outside the payment transaction, and no contamination is recorded.

## Required: one narrow source change in `protectPaymentRequest`

1. **Never forward the caller's projection object.** When the projection is accepted, call the adapter with a fresh `{ ...input, req: { transactionID: owner.transactionID } }`. The guard has already verified that value, so it is the value the adapter uses. Read `input.req` exactly once, into a local.
2. **Compare against `owner.transactionID`,** which is immutable owned state, not the mutable `req.transactionID`. This closes specialist finding LOW-2.
3. **Accept only a plain data property.**
   - The property descriptor has a `value` and no `get` or `set`.
   - It is enumerable.
   - The prototype is `Object.prototype` or `null`.
   - The object is not a Proxy. Use `node:util/types` `isProxy`, the installed Node built-in, so no new dependency is needed.
   - Everything else stays contaminated.
4. **Leave the `scopedRequest === req` identity path as it is.** It must still forward `req` itself. Do not change begin/commit/rollback or the Local API guard.
5. **Tests, RED first.** Add rejection cases for:
   - a getter-valued `transactionID`, including one that flips value between reads;
   - a Proxy `req` with `ownKeys`, descriptor and `get` traps;
   - a Promise or number `transactionID`;
   - a sole non-enumerable `transactionID`;
   - an `Object.create(other)` prototype;
   - a `null`-prototype object holding the correct ID, which is accepted.

   Also add one positive test proving the adapter receives a fresh object whose `transactionID` equals the owned ID, even when the caller mutates its own object after the call starts. All existing I0 and projection tests must stay green.
6. **Inventory.** Add `uploads/getFileFromClientUpload.js:129` and the dataloader cache-key uses to `projection-inventory.md` as non-adapter entries.

## RED-02 diagnosis

This is a diagnosis only. **No production source change for RED-02.**

**Explain the post-kill failure.** After `pg_terminate_backend`, the run reports `Cannot use a pool after calling end on the pool`, then `Connection terminated unexpectedly`. Determine whether this comes from:
- the fixture or test-runner teardown, for example `payload.destroy` or `pool.end` racing the failing test, or `st.after` ordering;
- production error propagation, an unhandled pg-pool `error` on the idle client;
- or both.

**Method.** Read the installed `pg-pool`, `pg`, `@payloadcms/drizzle` transaction and `payload` destroy source, and the fixture lifecycle. Cite exact lines and give a causal chain.

**Fixture only.** If the cause is in the fixture or harness, you may correct the **test fixture only**: teardown ordering, and awaiting the outcome before reading counts. Do not add an error-swallowing listener and do not patch the driver.

**Production.** If production propagation is implicated, stop and record it as RED-02 with a proposed remedy. Do not implement it.

## Real PostgreSQL rerun (under the owner's standing local-disposable-DB approval)

Run the rerun **only after steps 1–5 are GREEN and only if the RED-02 cause is confined to the fixture.**

**Instance.** Use one **new** disposable loopback instance under the original spec's rules. Do not touch the existing `postgres`, `postgres-before-loopback-*`, `sophomores-otp-local-*`, `litellm-*` or `sophomores-tailwind-*` containers or volumes. Remove the instance and its volume at the end.

**Matrix.** Rerun the full I0DB matrix:
- baseline;
- COMMIT rejection;
- connection kill, with a completed post-kill count;
- a dedicated rollback-rejection test;
- risk persistence;
- separate-connection concurrency;
- SIGKILL restart.

If a new defect appears, record it as RED-03 and stop.

## Gates

- **Typecheck.** One full typecheck of the exact final source, with `--max-gib 3.5 --node-old-space-mib 2048 --min-headroom-gib 10 --timeout 600`.
- **Default suite.** Only the 2 known failures.
- **Whitespace.** `git diff --check` clean.

Commit new commits, with no amend. Append a "Remediation 2" handback section, then send one `worker_done`.
