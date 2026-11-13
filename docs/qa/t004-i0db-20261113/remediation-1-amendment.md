> **Withdrawn, 2026-11-13.** The owner clarified that the rule covers operational "tweak this quickly" changes to Payload data only. Deliberate, consistent test fixtures on a disposable instance, raw reads and connection-fault injection are not in scope. Nothing below is required.

# I0DB remediation 1: amendment A (owner rule), 2026-11-13

Owner rule, now in AGENTS.md under "Database: Payload-native first": "if it's used by PayloadCMS, don't directly touch- changing database tables, adding/deleting entries, adding new tables- the db without trying every single workaround or temp fix to get it working via payload native methods."

This applies to your current uncommitted work in `payment-durability.db.test.ts` and its fixtures:

1. **Commit-failure injection.** Today it creates raw tables (`CREATE TABLE i0_commit_parent/child ... DEFERRABLE`, then `INSERT` through the native session, then `DROP`) inside the Payload database.
   - Try Payload-native injection first, and record each attempt with its outcome. Candidates to try:
     - a test-only collection declared in the fixture's own `buildConfig` and created by Payload's push;
     - the adapter's `transactionOptions`, for example `isolationLevel: 'serializable'`, with two Local API transactions that conflict so that COMMIT raises a serialization failure;
     - any other COMMIT-time failure Payload can produce natively.
   - Keep the raw side tables only if no native route fails specifically at COMMIT. In that case, record why each attempt failed and keep it confined to the disposable instance.
2. **Assertions.** Read Payload-owned data through the Local API (`findByID` / `find` with `overrideAccess` and no `req` transaction), not raw `SELECT`. One example is the `commerce_review_hold` read at line 117. These are allowed as raw reads:
   - `pg_stat_activity` and `pg_backend_pid` diagnostics;
   - `pg_terminate_backend` connection-fault injection;
   - read-only effect counts, where no Payload read can express the count.
   Label each one in the handback.
3. **Seeding.** Seeding stays through Payload (`seedAttempt`), and schema stays through Payload push. Keep both.

Every other part of remediation 1 is unchanged. List the native attempts in the "Remediation 1" handback section.
