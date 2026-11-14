# I0DB remediation 4 review rubric

**Candidate.** The worktree is `orca/workspaces/sphmrs/t004-i0db-20261113`, at HEAD `c921104` with prior `89e4957`. Review the fix as `git diff 89e4957 c921104 -- src tests`.

**Inputs.**
- [remediation-4.md](remediation-4.md).
- The worktree handback (Remediation 4 section), `red-04-diagnosis.md` and the evidence JSON.
- The installed `node_modules`.

Review read-only: run no Node workloads, use no DB and call no providers. Cite `file:line`. PASS means no HIGH and no MEDIUM.

1. **`onInit` fails safely** (`src/payload.config.ts`).
   - The hook reads `_clients` through `Reflect.get`, enumerates it only if `Array.isArray`, and checks that each entry's `on` is a function.
   - Absent or changed internals cannot fail init.
   - WeakSet dedupe is tested.
   - Everything else in the hook is unchanged, and it still does not swallow errors.
2. **The independent control pool is test-only.**
   - The kill and the effect counts use a dedicated `max:1` pool with its own error listener.
   - The port allowlist is unchanged.
   - The pool is ended in `close`.
   - The production pool is unchanged and no retry was added.
3. **Teardown reporting** (`tests/support/payload-lifecycle.ts`).
   - The join reports rejected continuations and does not hide them.
   - A bounded timeout fails loudly.
   - Cleanup order is correct.
4. **The matrix evidence is credible.**
   - Each of the seven scenarios asserts completed counts from the control connection, plus retry where required.
   - The concurrency test really uses separate connections.
   - SIGKILL and restart really kill a process and prove there is no duplication.
   - Nothing is credited that was not asserted.
5. **Scope and honesty.**
   - The diff stays within the owned paths.
   - RED-04 is truthfully described.
   - There are no secrets or home paths.
