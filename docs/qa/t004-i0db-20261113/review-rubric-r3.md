# I0DB remediation 3 review rubric

**Candidate.** Worktree `orca/workspaces/sphmrs/t004-i0db-20261113`, HEAD `89e4957`, prior `097d883`. The fix is `git diff 097d883 89e4957 -- src tests`.

**Inputs.**
- [remediation-3.md](remediation-3.md).
- The custodian approval of the structural `client.on` type: remove the root pg type import and use a minimal contract inside the same hook.
- The worktree handback section "Remediation 3 - RED-03 review checkpoint".
- Installed `node_modules`: payload, `@payloadcms/db-postgres`, pg 8.20.0 and pg-pool 3.14.0.

The review is read-only: run no Node workloads, use no database and call no providers. Cite `file:line`. PASS means no HIGH and no MEDIUM findings.

1. **Identity-path snapshot.**
   - Immediately before `Reflect.apply`, with no `await` in between, `req.transactionID` must be an own data property equal to `owner.transactionID`.
   - Any getter flip must be rejected with zero adapter calls.
   - Nothing else in the guard may change.
2. **Pool-error hook in `src/payload.config.ts`.**
   - It is one stable `onInit` hook.
   - The bounded fixed message is logged without any error or request object.
   - It swallows no query rejections.
   - It covers both pool `error` and borrowed-client `error`.
   - Enumerating `pool._clients` touches a private field. Is that acceptable for pg-pool 3.14.0, and does it fail safely if the field is absent or changes? Is a client checked out before `onInit` covered?
   - Is `onInit` actually run in every runtime that uses this pool: Next server, Payload CLI, migrations and scripts? Does another `onInit`, for example from a plugin such as payload-auth, preserve or override it?
3. **Fixture teardown join.** The pool must not end while subtest bodies are still running. The join must hide no errors.
4. **RED-03 classification.**
   - Using the cited installed source, decide whether the post-kill `effects(db.pool, …)` rejection is expected pg-pool behaviour (a stale idle client handed out after its backend was terminated) or a production defect in Sophomores code.
   - What does production see on the first query after a backend is terminated? Is that safe for the payment path, given that it stays unknown and has no financial inference?
   - Should independent counts use a separate control pool, which would make RED-03 a fixture-design issue?
   - Recommend the narrowest next step.
5. **Scope and honesty.**
   - The diff stays within the owned paths.
   - The container and volume are removed.
   - Nothing unproven is credited.
   - There are no secrets or home paths.
