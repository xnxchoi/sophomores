# SPH-T002-A-20261113-01 — owner-authorized narrow fourth fix, 2026-11-13

Cycle 3 candidate `6c8b1aefdf2ad820052c3b0f663636f11a98abb9` (full diff `58e516d1…dd3a`).
Reviews:

- Santa A: **PASS**, LOW only.
- Santa B: **PASS**, LOW only.
- Specialist: **FAIL**, 1 MEDIUM.

The three-cycle maximum was reached. The owner authorized one narrow fourth fix. The
specialist alone re-checks that gap, and acceptance follows if it passes. Make no other
change.

## Required (MEDIUM)

**Self activation has no current owner.** `model.md:158` describes an "existing claim
or self-activation transaction", but none exists:

- `guests.ts:76` sets the buyer unit's `eventAccountKey` but never `claimedAccount`.
- `guests.ts:102,140` reject occupied units, so neither gift command can activate a
  self unit.
- `guests.ts:177,204` require `claimedAccount`.

Today a self unit can be checked in only through the name branch (`guests.ts:169`),
which `model.md:118` retires. It can never redeem its benefits. T001 records self
promotion as unselected, and blueprint `:192-193` requires this step.

1. In the `:158` row and wherever self activation is described, state that it is a
   **new production command with no current owner**. Its lock order is order-benefits →
   admission → event-account (buyer) → membership → operation. It validates the
   already-bound buyer and changes neither the allocation nor the `eventAccountKey`.
   Note that wiring must also cover the second call site at `domain.ts:85`.
2. Add one P2a test. The buyer activates their own reserved unit, then attendance is
   recorded, then benefits are allowed, and the event-account key is unchanged. A
   non-buyer who presents the self code is refused, with no state change.

## LOW, apply

- Add the arrival action identity (`model.md:114`) to the schema-needs list (`:225`).
- `model.md:118`: cite `checkedInAt` at `reservations.ts:116` and `returns.ts:31`, not
  `guests.ts:177`.
- Relabel the used-seat row (`:243`) "Custodian ruling (owner may override)" instead of
  "Settled", as both Santa reviewers asked.

Rerun your standard-library checker. Commit new commits with no amend, append a "Fix 4"
section to the handback, and send one `worker_done`.
