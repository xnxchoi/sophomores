# SPH-T004-I0DB-20261113-01 — custodian remediation authorization 1, 2026-11-13

RED-01 is accepted as a real defect. It was found on a real PostgreSQL 16.15 instance at
candidate `61edde8`.

**The defect.** Installed Payload 3.92.1 `findByID`
(`node_modules/payload/dist/collections/operations/findByID.js:101-110`) passes the
adapter a projected request, `req: { transactionID }`, not the original `req`. The
I0 ownership proxy at `src/lib/commerce/_shared/transaction.ts:193-196` requires
`input.req === req`. It therefore flags this legitimate internal adapter call as
contaminated, and payment-transaction work that reads through the Local API
(`reservePurchase` → `readCommerce`) ends as unknown. The synthetic I0 tests missed
this because they never exercised the installed Local API against a real adapter.

## Authorized, in this same worktree and assignment

1. **Enumerate before changing.** List every installed Payload 3.92.1 operation, in
   `node_modules/payload/dist/**` and `@payloadcms/db-postgres` or `drizzle`, that
   calls an adapter method with a `req` other than the caller's original. Include
   find, findOne, count, create, update, delete, versions and globals. Record each
   one with the exact shape it passes, as `file:line`. Do not guess from memory.
2. **Narrow source fix.** Your owned paths now include
   `src/lib/commerce/_shared/transaction.ts`, limited to the `protectPaymentRequest`
   request check. Accept an **adapter** call (`adapter === true` only, never the
   Payload Local API surface) when one of these holds:
   - `input.req === req`, as now;
   - `input.req` is one of the enumerated projection shapes, its keys are exactly that
     shape (for example only `transactionID`), and its `transactionID` strictly equals
     the owned request's current `transactionID`, which must be set and non-empty.

   Any other shape stays contaminated. Do not widen anything else. Do not touch begin,
   commit or rollback handling, or the Local API guard.
3. **Tests.** Write them RED first.
   - A provider-free unit test with a native fake that reproduces the exact `findByID`
     projection. It is accepted with a matching `transactionID`.
   - Rejection cases: mismatched or absent `transactionID`, extra keys, a projection
     on the Local API surface, and a projection after ownership loss.
   - All existing I0 tests stay green.
4. **Real PostgreSQL proof.** Authorized again: one **new** disposable loopback
   instance under the original spec's rules. Do not touch the existing `postgres`,
   `postgres-before-loopback-*` or `sophomores-otp-local-*` containers or volumes.
   Remove the instance and its volume at the end. Rerun the baseline, then complete
   the **full original I0DB acceptance matrix**:
   - commit, then one settlement;
   - injected faults;
   - cross-connection concurrency;
   - restart recovery;
   - database effect counts.

   If another defect appears, record it as RED-02 with its reproduction and stop. Do
   not fix it.
5. **Gates.**
   - One full typecheck of the exact final revision: `--max-gib 3.5
     --node-old-space-mib 2048 --timeout 600`.
   - The default suite: only the 2 known failures, with DB tests skipped.
   - `git diff --check` clean.
   - Receipts and bounded excerpts only.

Commit new commits with no amend. Append a "Remediation 1" section to the handback and send one `worker_done`.
