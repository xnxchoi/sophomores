# SPH-T004-I3-20261114-01 — official settlement and review integration

Slug `t004-i3-20261114`, branch `codex/t004-i3-20261114`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), including the rule that forbids pnpm, npm and yarn scripts. These exceptions apply:

- **Identity base:** the main commit that adds this file.
- **Handback:** persist it as `docs/qa/t004-i3-20261114/handback.md`. Commit only sanitized evidence: `.metrics.json` receipts and summaries. Commit no raw `.log` files, home paths or host process audits.
- **DB exception (owner-approved):** you may run one **new, disposable, loopback-only PostgreSQL** container for the proofs.
  - Give it a new name and a non-default port bound to `127.0.0.1`.
  - Cap its memory, then remove it and its volume at the end.
  - The existing `postgres` dev container is off-limits.
- **Provider-free:** no PortOne calls, no `.env` reads, no tunnel.
  - Use synthetic signed webhooks made with a synthetic test secret generated in the test.
  - Provider GETs are synthetic transport doubles.
  - The real TEST-key sandbox matrix is a separate later assignment.
- **Placement:** Payload code goes under `src/payload/` (AGENTS.md). Domain logic stays in `src/lib/commerce/`.

## Contract

The **I3 row** of the [T004-A design](../t004-a-20261111/reconciliation-design.md) §6, together with §§1–4, B06/B10/B11/B12/B16, and the integrated I0, I1 and I2 code on main, in particular:

- `_shared/transaction.ts`, `ecommerce.ts`;
- `portone/{adapter,review,endpoints,admission,accounting,result,ledger-transaction}.ts`;
- `reservations.ts`, `guests.ts`, the admissions/claims collections and fulfilment.

Follow the binding financial brief in registry T004 (hash `a25d435f…a88b7`). The owner-approved I2 policy is unchanged.

**Owned paths.** Minimal integration edits only, inside the modules named above. Plus:

- tests under `tests/commerce/` (real-DB proofs use the `*.db.test.ts` opt-in convention);
- `docs/qa/t004-i3-20261114/`.

A schema change needs an additive migration under `src/payload/migrations/`. Stop and ask before adding one.

## Acceptance

All behaviour must be RED before it is GREEN, against real PostgreSQL with effect counts.

1. **Exactly one canonical order.** Browser confirm, I2 reconciliation, and duplicate, delayed and out-of-order signed events all race to the official finalizer. The race recovers exactly one canonical order. Assert each of these once:
   - inventory;
   - the net-three allowance;
   - event capacity;
   - buyer-self allocation;
   - admission;
   - fulfilment identities.
2. **Risk never regresses.** None of the following may regress, auto-release or reopen anything, including after a confirmed rollback or quarantine:
   - second-read risk;
   - a late PAID on a released reservation;
   - cancellation, refund or dispute;
   - a review hold.
3. **Failure handling is strict.** Only an exact verified FAILED status permits the existing explicit, reverified retirement. None of these may release capacity or launch a payment:
   - typed or generic absence;
   - READY;
   - rate stops;
   - integrity stops.

Physical fulfilment and return callers run as regressions.

## Gates

Run each once on the exact final revision:

- the DB proof, with the container lifecycle recorded;
- a full typecheck (`--max-gib 3.5 --node-old-space-mib 2048 --timeout 600`);
- the default suite, using the repo's standard invocation with no custom preload. It must show only the 2 known failures.

`git diff --check` must be clean. Make no mock-only exactly-once claim. Commit as new commits, then send one `worker_done`.

**Budget:** the Codex weekly limit is low, though the owner has a reset banked. Keep the change minimal.
