# SPH-T004-I1-20261113-01 — typed local payment result/outcome projection

Slug `t004-i1-20261113`, branch `codex/t004-i1-20261113`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with these exceptions:
- Your identity base is **the main commit that adds this file**.
- Persist your handback as `docs/qa/t004-i1-20261113/handback.md`.
- Provider-free. No database, no PortOne calls.

**Contract:** implement the I1 row of the [T004-A design](../t004-a-20261111/reconciliation-design.md)
§6 exactly. Read §§1–4 first: the outcome, actor and disclosure matrix, and the
privacy and stale-completion contract. Follow the binding financial brief in registry
T004 (hash `a25d435f…a88b7`).

**Owned paths:**
- the exact result reader and the outcome projection, at their nearest owner under
  `src/lib/commerce/` (state the exact files in your first commit);
- the confirm transport/proof classification it consumes;
- tests under `tests/commerce/`;
- `docs/qa/t004-i1-20261113/`.

No UI, catalogue or schema changes. If the projection needs a schema field, stop and
report it.

## Acceptance

All behaviour must be RED before it is GREEN.

1. **GET has no side effects.** A GET makes zero provider, finalizer or domain
   mutations. The buyer's own succeeded order is recovered with its exact linkage and
   snapshot. Foreign, missing, partial, held and terminal outcomes stay private and
   distinct from each other.
2. **Transport faults are classified.** Native `Response` tests separate a loss of
   headers from a loss of body transport. A body that was consumed but is invalid
   JSON or fails the schema is classified separately. HTTP status alone never
   asserts paid or failed.
3. **Status mapping is exact.** PAID, FAILED, not-found, READY and unsupported, plus
   integrity, auth and rate stops, each map exactly, with no alias and no inferred
   retry. Coverage is at least 80% of changed lines.

**Gates:**
- one full typecheck on the exact final revision, using `--max-gib 3.5
  --node-old-space-mib 2048 --timeout 600`;
- the default suite, showing only the 2 known failures;
- `git diff --check` clean.

Make no durability claim; that belongs to I0DB. Commit as new commits, then send one
`worker_done`.
