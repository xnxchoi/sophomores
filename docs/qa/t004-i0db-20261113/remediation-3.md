# SPH-T004-I0DB-20261113-01: remediation 3, 2026-11-13

**Starting point.** Resume in the existing worktree `orca/workspaces/sphmrs/t004-i0db-20261113` from candidate `097d883`. The original spec and remediations 1–2 still apply.

## Required

1. **Identity-path snapshot** (specialist MEDIUM, `transaction.ts:119,189,209`).
   - Immediately before `Reflect.apply`, with no `await` in between, require `Object.getOwnPropertyDescriptor(req, "transactionID")` to be an own data property whose value is `owner.transactionID`. Otherwise set `owner.contaminated` and throw.
   - Write a RED test first: a `req.transactionID` getter that returns the owner ID on reads 1 and 3 and a foreign or undefined value on read 2. The test must be rejected with zero adapter calls.
   - Leave everything else in the guard unchanged. The `db`/`drizzle` field gap and the raw `get` trap stay as recorded LOW findings out of scope; record them in the handback.
2. **Pool error listeners** (RED-02 production gap). Add **one stable Payload-native hook**, `onInit` in `src/payload.config.ts` or the adapter's own init option if one exists. Check the installed `@payloadcms/db-postgres` 3.92.1 options first and record what you checked. The hook attaches:
   - `payload.db.pool.on('error', …)`;
   - `payload.db.pool.on('connect', (client) => client.on('error', …))`, which covers borrowed transaction clients.

   Both handlers log a **bounded, fixed** message in the style of the existing `src/lib/member-auth/runtime.ts:15`. They must not swallow query rejections. pg already rejects in-flight queries, so `inPaymentTransaction` still reports unknown. If clients already connected before the hook runs, cover them too or state why they are covered.
   - **Tests:** a provider-free test with a native EventEmitter fake proves that an emitted client or pool `error` is handled once and that an in-flight rejection still propagates.
   - Make no other config change.
3. **Fixture teardown race** (`tests/support/payload-lifecycle.ts`, test fixture only). The outer cleanup must not end the pool while a subtest continuation is still running. For example, await the subtests or register cleanup per subtest. Do not add an error-swallowing listener in the fixture; the production listener from item 2 is the handler.
4. **Real PostgreSQL rerun.** This runs under the owner's standing approval for local disposable databases, and only after items 1–3 are GREEN.
   - Use one **new** disposable loopback instance under the original spec's rules. Do not touch the existing `postgres`, `postgres-before-loopback-*`, `sophomores-otp-local-*`, `litellm-*` or `sophomores-tailwind-*` containers or volumes. Remove the new instance and its volume at the end.
   - Run the full matrix: baseline, COMMIT rejection, connection kill with a completed post-kill count, dedicated rollback rejection, risk persistence, separate-connection concurrency, and SIGKILL restart.
   - If any new defect appears, record it as RED-03 and stop.

## Gates

- One full typecheck of the exact final source: `--max-gib 3.5 --node-old-space-mib 2048 --min-headroom-gib 10 --timeout 600`.
- The default suite shows only the 2 known failures.
- `git diff --check` is clean.

**Owned paths:** `src/lib/commerce/_shared/transaction.ts` (the guard only), `src/payload.config.ts` (the one hook only), `tests/support/payload-lifecycle.ts`, `tests/commerce/core/*`, and `docs/qa/t004-i0db-20261113/`.

Commit new commits, with no amend. Append a "Remediation 3" section to the handback, then send one `worker_done`.
