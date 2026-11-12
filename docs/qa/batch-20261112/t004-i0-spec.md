# SPH-T004-I0-20261112-01 — transaction-end and ownership proof/remedy (provider-free)

Slug `t004-i0-20261112`. Follow [shared rules](shared-rules.md). Governing design:
`docs/qa/t004-a-20261111/reconciliation-design.md`, row **I0**, and its source reads
S18–S22 plus the claim precedent S25. The T004 brief in the registry, including its
financial safeguards, is binding.

**Owned paths:** `src/lib/commerce/**` (only the transaction-end/ownership seam and
its direct callers named in I0), `tests/commerce/**`, and your handback file.

**Acceptance (1–3):**
1. Test-first: a native harness (provider-free, no real DB) reproduces each of
   these, with RED evidence recorded before any fix: swallowed COMMIT rejection,
   rollback rejection or absent session, and ownership loss. None may yield a known
   financial receipt from an unproved completion.
2. Remedy: apply it only if it needs **no schema, migration or dependency change**.
   It must keep the same-request official finalizer and hooks, existing locks and
   independent quarantine after an **actual** rollback. It must fail closed for
   nested, stolen, disabled or bundled sessions and for loss of commit
   acknowledgement. If the remedy needs schema or dependency scope, stop after
   criterion 1 and hand back the design for owner approval.
3. Faults injected between settlement effects cannot leave a reported successful
   partial result or erase already-observed risk; unknown stays recoverable. The
   affected commerce regressions and default discovery still pass; record the exact
   counts. The default suite on main is 2,590 pass / 2 deferred-styling fail / 39 skipped.

**Not claimed:** real PostgreSQL fault, concurrency or restart durability. That
proof requires separate owner authorization. Make no exactly-once or durability
claims, and no UI change.
