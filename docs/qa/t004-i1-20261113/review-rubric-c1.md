# T004-I1 review rubric, cycle 1

**Inputs.**
- Spec: [spec.md](spec.md).
- Design: [reconciliation-design.md](../t004-a-20261111/reconciliation-design.md), §§1–4 and the §6 I1 row (rows B01, B02, B07–B09, B13 and B16).
- Candidate: worktree `orca/workspaces/sphmrs/t004-i1-20261113`, HEAD `c5cb02f`, base `1e3c78b`. The source and test diff SHA-256 is `ef58dfe2…5fd61`.
- Scope extension: `/result` is mounted in `endpoints.ts`, and `ecommerce.ts` `secureEndpoint` gets an exact `/result` bypass that mirrors `/pending`. The endpoint must enforce GET, `assertCommerceBrowserRead` and the own-account check itself.

The review is read-only. Do not run Node workloads, a database or providers. Cite every finding as `file:line`. Severity is HIGH, MEDIUM or LOW. PASS means no HIGH and no MEDIUM.

1. **No side effects on GET (acceptance 1).**
   - The result path makes no provider call, finalizer call, write or counter change. Trace every call.
   - Own-order recovery checks exact linkage, snapshot hash, items, amount, currency and cardinality.
   - Foreign and missing results are indistinguishable to a non-owner.
   - Partial, held and terminal results are distinct for the owner and leak nothing more.
   - The read is bound to the retained tuple only.
2. **Authority and bypass.**
   - Find every endpoint path that `endsWith("/result")` could match, now and plausibly later.
   - The handler enforces GET, same-origin read, membership and ownership before shaping any private response.
   - Responses are `no-store`.
   - Rate and abuse handling stays the same as `/pending` or is stricter.
3. **Transport classification (acceptance 2).**
   - Native `Response` tests actually separate a header-phase failure from a body-stream failure, and those from consumed-but-invalid JSON and schema failures.
   - HTTP status alone never yields paid or failed.
   - A stale generation suppresses the receipt.
   - Tests exercise real stream errors, not only mocked flags.
4. **Status mapping (acceptance 3).**
   - PAID, FAILED, typed not-found, generic 404, READY, PENDING/PAY_PENDING, unsupported, integrity, auth and rate each map exactly, with no alias, retirement or retry inference.
   - The existing PAID-only finalizer gate is unchanged.
   - Changed-line coverage is at least 80%, and the evidence supports this.
5. **Honesty and scope.**
   - The diff is limited to the stated owned paths.
   - There is no durability claim. `local-consistency` is described as no more than it is.
   - RED came before GREEN, with evidence.
   - The intermittent `member-auth-ui-dom.test.tsx:575` failure is reported, not hidden.
   - Committed evidence has no secrets or raw logs. Flag any absolute home path as LOW.
