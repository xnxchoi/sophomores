# SPH-T004-I2-20261114-01 — persistent bounded reconciliation admission and accounting

Slug `t004-i2-20261114`, branch `codex/t004-i2-20261114`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with these exceptions:

- Your identity base is **the main commit that adds this file**.
- Persist your handback as `docs/qa/t004-i2-20261114/handback.md`.
- **Schema exception (owner-approved additive local migrations).** You may add Payload
  collection(s) and/or narrowly scoped reconciliation fields, register them, regenerate
  `src/payload-types.ts`, and add one additive migration under `src/migrations/`. No
  destructive change to existing tables. Record the schema rationale (why a new
  collection versus extending the plugin transaction) in your first commit message and
  the handback.
- **DB exception (owner-approved, as for I0DB).** For the restart/concurrency proof you
  may run one **new, disposable, loopback-only PostgreSQL** container (new name,
  non-default port bound to `127.0.0.1`), then remove it and its volume. The existing
  `postgres` dev container is off-limits. Count its memory against the headroom limits.
- **Provider-free.** No PortOne calls and no `.env` reads. Provider GETs are synthetic
  transport doubles. Sandbox calls belong to I3.

**Contract:** the I2 row of the [T004-A design](../t004-a-20261111/reconciliation-design.md)
§6, with §C steps 1–7 and §P. Read §§1–4 first. Integrated I0/I0DB/I1 code is the
base: `src/lib/commerce/_shared/transaction.ts`, `ecommerce.ts`, `portone/{adapter,review,
endpoints,result,outcome,confirm-transport,proof}.ts`. Follow the binding financial
brief in registry T004 (hash `a25d435f…a88b7`).

**Owner-approved numeric policy (2026-11-14, live plan doc).** Every value is a typed,
server-owned setting with these defaults, never a browser input:

| Setting | Default |
| --- | --- |
| Provider GET deadline | 10 s |
| Customer foreground wait bound | 30 s (consumed by I5; expose it, don't build UI) |
| Automatic re-check schedule | 2 s, 5 s, 15 s, 1 min, 5 min, 30 min, then stop and escalate |
| Ordinary GET budget per attempt | 12 (a logical confirmation uses 2) |
| Signed risk-event reserve | 4 GETs per attempt, usable only for authenticated cancellation/dispute evidence |
| Automatic lifetime | 24 h after the attempt starts |
| Global ceiling | 5 provider GETs per second across processes |
| Escalation | budget spent, or unresolved after 30 min → superadmin review state |
| Operator | superadmin only |

I2 implements admission, accounting, fencing and these stops. It does not schedule
background work (I6), mount new UI (I4/I5) or call PortOne (I3).

**Owned paths:**
- new modules under `src/lib/commerce/portone/` (for example `admission.ts`,
  `accounting.ts`, `policy.ts`); minimal integration edits to `adapter.ts`, `review.ts`,
  `endpoints.ts`, `confirm-transport.ts`;
- the new collection(s) under `src/lib/payload/collections/`, their registration,
  `src/payload-types.ts`, one migration under `src/migrations/`;
- tests under `tests/commerce/` (DB proofs use the `*.db.test.ts` opt-in convention);
- `docs/qa/t004-i2-20261114/`.

## Acceptance

All behaviour must be RED before it is GREEN.

1. **One operation per exact attempt.** Concurrent requests, tabs and processes join or
   stop one exact same-attempt operation. Native completion and fencing tokens prevent
   a stale holder from publishing results or clearing holds. Expired leases are never
   treated as proof that earlier work stopped.
2. **Durable, pre-dispatch accounting.** Every dispatched provider GET, including both
   reads of a confirmation and uncertain/timed-out transport, is debited durably before
   dispatch. The whole operation's capacity is reserved up front; one that cannot fit
   stops before starting. Budgets, the risk reserve, the global ceiling and the 24 h
   lifetime survive rerender, restart and joiners, proven against the disposable
   PostgreSQL.
3. **Safe stops and crash recovery.** A client timeout or expired ownership never starts
   overlapping work. After a crash, recovery either proves and join-finishes ownership
   or stops as unknown. Budget/lifetime exhaustion produces the escalation state without
   losing risk evidence or retiring the attempt.

**Gates:**
- one full typecheck on the exact final revision (`--max-gib 3.5 --node-old-space-mib
  2048 --timeout 600`);
- the default suite, showing only the 2 known failures;
- the DB proof run, with the container's create/remove lifecycle recorded;
- `git diff --check` clean.

Commit as new commits, then send one `worker_done`.
