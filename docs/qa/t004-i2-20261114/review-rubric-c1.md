# T004 I2 — cycle-1 review rubric

**Candidate:** branch `codex/t004-i2-20261114`, HEAD `8dd7703` (code `4f18e34`), base `3863105`, worktree `orca/workspaces/sphmrs/t004-i2-20261114`.
**Contract:** `docs/qa/t004-i2-20261114/spec.md`, `amendment-1.md`, and the I2 row plus §C/§P of `docs/qa/t004-a-20261111/reconciliation-design.md`.
**Handback:** `docs/qa/t004-i2-20261114/handback.md`.

This is a read-only review: use git and file reads only. Do not run Node, Docker or a database, and make no edits.

PASS only if all of the following hold. Otherwise FAIL, citing file:line evidence.

1. **One operation per exact attempt.** Concurrent requests, tabs and processes join or stop a single same-attempt operation.
   - Fencing must stop a stale holder from publishing a result or clearing a hold.
   - Lease expiry is never treated as proof that earlier work stopped.
   - Look for TOCTOU windows between admission, dispatch and completion, including races under PostgreSQL READ COMMITTED.
2. **Durable accounting before dispatch.** Every provider GET is debited durably before it is sent.
   - This includes both reads of a confirmation, and timed-out or uncertain transport.
   - The whole operation reserves capacity up front, and stops before starting if it can't fit.
   - The 4-GET risk reserve can be spent only on authenticated cancellation or dispute evidence.
   - The 5 GET/s global ceiling and the 24 h lifetime hold across processes and restarts.
   - The policy values match the spec table exactly, and they are server-owned rather than taken from browser input.
3. **Safe stops.** A client timeout or expired ownership never starts overlapping work.
   - A crash ends in either a proven join or finish, or an unknown stop.
   - Exhausting the budget or lifetime produces the escalation state without losing risk evidence or retiring the attempt.
4. **Scope and placement.**
   - The new collection is under `src/payload/collections/`, is registered only in `src/lib/commerce/domain.ts`, and has one additive migration under `src/payload/migrations/`. The migration has no destructive SQL.
   - `ecommerce.ts` changes stay inside the payment `secureEndpoint` path. The endpoint list, the merge filter, the `/pending` and `/payments/portone/result` bypasses, and non-payment behaviour are unchanged.
   - `src/payload-types.ts` changes only for the new collection.
   - There are no provider calls, no reads of `.env` and no pnpm usage.
5. **Tests prove the claims.** RED-before-GREEN is evidenced. The DB proof really exercises multiple processes, SIGKILL, expiry and lifetime, rather than mocks posing as such.
6. **Hygiene.** The committed evidence contains no secrets and no home-folder paths. The raw logs under `docs/qa/t004-i2-20261114/evidence/` currently contain about 85 home-path lines; this is a known finding, so confirm it and look for others.

**Report:** a verdict and findings by severity (CRITICAL, HIGH, MEDIUM, LOW), each with evidence. Keep it under 700 words.
