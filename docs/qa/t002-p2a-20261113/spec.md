# SPH-T002-P2A-20261113-01 — token allocation, activation and attendance kernel (provider-free)

Slug `t002-p2a-20261113`, branch `codex/t002-p2a-20261113`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with these exceptions:

- Your identity base is **the main commit that adds this file**.
- Persist the handback as `docs/qa/t002-p2a-20261113/handback.md`.
- Commit only small evidence: receipts plus bounded excerpts, with no raw logs and no
  absolute home paths.

**Contract:** implement the **P2a** section of the accepted
[T002-A model](../t002-a-20261113/model.md) ("P2a — paid allocation, uniqueness and
activation races") exactly, together with its records, decisions, lock map and test
list. Where the model leaves a policy held, use the owner answers below. Where it is
still held, keep it as a test fixture, not a production selection.

**Owner answers that are now selected policy** (registry T002, "Owner answers to the
T002-A owner questions", main `34ee4ab`):

1. **Repeat purchases by a holder.** A member can buy several units, but only one
   token is ever bound to an account. Every other purchased unit's token stays
   unactivated and can be activated through its own link, with no expiry.
2. **The launch event admits token holders without a purchase.** Model this as an
   explicit per-event rule input, `holdersAdmitted: true`, not as a global constant.
   With that rule:
   - A buyer who already holds a token receives **no** forced self unit. Every
     purchased unit becomes a gift carrying both a token and event access.
   - A tokenless buyer gets unit 1 as their reserved self unit, as T001 requires. The
     remaining units are gifts.
   - The event's capacity count covers sold units plus attending holders. Add a test
     showing that a holder's attendance is recorded without consuming a sold unit.
   - When `holdersAdmitted` is false or unspecified, keep the model's existing
     forced-self behaviour. Both branches must be tested.
3. **A gift opened by a holder is left intact.** `activateUnit` for an account that
   already holds a bound token returns a typed `ALREADY_HOLDS_TOKEN` refusal. It
   consumes nothing, grants no event access and discloses nothing about the gift.
   Remove the model's pending-policy hold for this case.
4. **Cancellation keeps current behaviour.** It always frees allowance, and frees
   capacity only for units that are unused and not yet returned. Cancellation is
   P2b's scope, so P2a only must not contradict it.

**Owned paths:**
- `src/lib/commerce/token-entitlements.ts`
- `tests/commerce/domain/token-entitlements.test.ts`
- `tests/commerce/domain/token-entitlements-fixtures.ts`
- `docs/qa/t002-p2a-20261113/`

Do not touch production wiring (`guests.ts`, `domain.ts`, `ecommerce.ts`), schemas,
dependencies, configuration, UI or catalogues. The kernel must not import Payload, a
database, HTTP or P2b.

## Acceptance

1. **RED then GREEN.** Every row of the model's P2a test list, plus the owner-answer
   tests above, first fails (RED, before the module exists or behaves) and then passes
   (GREEN).
   - Changed-line and branch coverage is at least 80%. Measure it with the
     installed tooling (for example `node --test --experimental-test-coverage`), and
     record the command you used.
   - With every optional policy unselected, settlement still allocates every paid unit
     exactly once.
2. **Determinism.** Stale-read and interleaving tests use the fixture scheduler. They
   must prove account-wide token uniqueness, event/account uniqueness, stable replay,
   a losing gift left intact, and the `holdersAdmitted` branches.
3. **Gates.**
   - The diff is limited to the owned paths.
   - A full typecheck exits 0. Run it at most twice, with
     `--max-gib 3.5 --node-old-space-mib 2048 --min-headroom-gib 10 --timeout 600`
     and `node_modules/.bin/tsc --noEmit --incremental false`.
   - The default suite (`node tests/run-unit.mjs`, under the shared limits) shows only
     the 2 known deferred-styling failures.
   - `git diff --check` is clean.

Make no claim about real PostgreSQL behaviour or production behaviour. Commit as new
commits only, and send one `worker_done`.
