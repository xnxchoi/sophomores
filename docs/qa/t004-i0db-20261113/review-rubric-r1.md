# I0DB remediation 1 review rubric (RED-01 source fix)

**Candidate.** Worktree `orca/workspaces/sphmrs/t004-i0db-20261113`, HEAD `2d017d2`, with prior RED candidate `61edde8` and base `f787a43`. The only source change is `src/lib/commerce/_shared/transaction.ts:193-203`, in `protectPaymentRequest`. The cumulative source diff from the base hashes to `fff0d377…da21`.

**Inputs.**
- [spec.md](spec.md), [remediation-1.md](remediation-1.md), and the withdrawn [remediation-1-amendment.md](remediation-1-amendment.md), which is not required.
- In the worktree: the handback "Remediation 1" section, `projection-inventory.md` and `remediation-1-evidence.json`.
- The installed Payload source: `node_modules/payload/dist/**` and `node_modules/@payloadcms/db-postgres` / `drizzle`.

The review is read-only: run no Node workloads, use no database and call no provider. Cite `file:line`. PASS means no HIGH and no MEDIUM finding.

1. **The fix is exactly as authorized.**
   - Only adapter calls (`adapter === true`) accept a projection.
   - The projection has a single own key, `transactionID`, which must strictly equal the owned request's non-empty string `transactionID`.
   - Every other shape stays contaminated.
   - The Local API guard and the begin/commit/rollback handling are unchanged.
   - Check the edge cases: a symbol key, a non-enumerable key, an inherited key, a getter-valued `transactionID`, a Proxy-valued `req`, a `transactionID` that is a Promise or a number, and a projection after ownership loss. Can any accepted projection come from a caller that does not own the transaction?
2. **The inventory is complete and correct.** Independently enumerate the installed Payload 3.92.1 operations that pass an adapter `req` other than the caller's own request. Compare with `projection-inventory.md`. Is there any projection shape the fix rejects but that a real payment path uses? That would cause a future RED. Is there any shape it accepts that should be rejected?
3. **The tests are real.**
   - A RED test reproduces the installed `findByID` shape.
   - The rejection cases listed in remediation-1 exist.
   - The existing I0 tests are unchanged and still meaningful.
   - The DB test changes do not weaken earlier assertions.
4. **The handling of the RED-02 evidence is honest.** The proofs that passed (commit plus replay, real COMMIT rejection) are claimed only as far as the evidence supports. RED-02 is not described as a production crash or as proven recovery. Nothing in the source or fixtures suppresses errors. For example, check that no pool error listener or patched driver was added.
5. **Scope.**
   - The diff is limited to the authorized paths.
   - The disposable container and volume are gone.
   - Committed evidence contains no secrets and no home paths.
