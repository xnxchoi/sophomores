# I0DB remediation 2 review rubric (snapshot fix)

**Candidate.** The worktree is `orca/workspaces/sphmrs/t004-i0db-20261113`, at HEAD `097d883`. The prior candidate is `2d017d2` and the base is `f787a43`. To see the fix, run `git diff 2d017d2 097d883 -- src tests`.

**Inputs.**
- [remediation-2.md](remediation-2.md).
- The custodian reply on destructuring: destructure `{ req: scopedRequest, ...adapterInput }` exactly once, forward `{ ...adapterInput, req }` on the identity path, forward `{ ...adapterInput, req: { transactionID: owner.transactionID } }` for projections, and add a test for a flipping `input.req` getter.
- In the worktree, `red-02-diagnosis.md` and the "Remediation 2" section of the handback.
- The cycle-1 review findings in [dispatch.md](dispatch.md).

The review is read-only. Run no Node, use no database and call no providers. Cite `file:line`. PASS means no HIGH or MEDIUM finding.

1. **Check-then-use is closed.**
   - `input.req` is read exactly once.
   - On the identity path and the projection path, the adapter receives only values the guard checked. The comparison uses `owner.transactionID`.
   - The guard accepts only plain data properties: no getter or setter, enumerable, prototype `Object.prototype` or `null`, and not a Proxy. Everything else is contaminated.
   - Spreading `...adapterInput` cannot itself re-trigger an attacker-controlled getter for a property the adapter relies on. Check whether any other `input` field, such as `where` or `data`, matters to transaction choice. If one does, the same issue applies to it.
   - Begin, commit, rollback and the Local API guard are unchanged.
2. **No regression.**
   - Legitimate Payload calls still pass. Check the full-request identity path, the `findByID` projection, and every shape in `projection-inventory.md`.
   - Copying `input` does not break adapter calls that depend on object identity or on non-enumerable fields of `input`. Check the installed `@payloadcms/drizzle` callers.
3. **The tests are real.**
   - RED tests cover a getter, a flipping getter, a Proxy, a Promise or number, a sole non-enumerable property, `Object.create`, and a flipping `input.req` getter.
   - Positive cases cover a `null` prototype and the fresh snapshot.
   - All existing tests are still meaningful.
4. **The RED-02 diagnosis is sound and honest.**
   - Its causal chain holds against the installed `pg`, `pg-pool`, `drizzle` and Payload sources it cites.
   - Answer specifically: can a dropped database connection in production emit an `error` with no listener, and so crash the Node process? Name the listener gap exactly.
   - The diagnosis makes no unsupported claim.
5. **Scope.** The source change is confined to `protectPaymentRequest`. No database instance was created. There are no secrets or home paths.
