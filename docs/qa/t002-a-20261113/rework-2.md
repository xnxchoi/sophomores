# SPH-T002-A-20261113-01 rework cycle 2 of 3, 2026-11-13

Candidate `ba398cf76384fbe30899e38efcd49f850d22d651`. The custodian's checks pass:
only the two owned files changed, and the full diff from `38f9dfe` has SHA-256
`76ad08ab…741e`. Reviews:

- Specialist: **FAIL**, 2 MEDIUM and 3 LOW.
- Santa A: **FAIL**, 1 MEDIUM.
- Santa B: **FAIL**, 1 MEDIUM.

Santa A and Santa B worked independently. All three confirmed that settlement always
allocates, that the lock order is deadlock-free, that the cited source is accurate, and
that every cycle-1 item is resolved or superseded.

## Required

1. **Used-unit cancellation (MEDIUM; all three).** `model.md:56,188` and the P2b test
   at `:202` release event capacity for a cancelled unit that was already used. That
   goes beyond the owner's decision, which "keeps the current release in
   `reservations.ts:101-104,117,122`". It would also let a seat that is physically
   occupied mid-event be sold again.
   - **Custodian ruling, from the cited lines:** keep the current behaviour exactly.
     - A verified cancellation always releases the buyer's **allowance** for every
       unit, used or not (`:101-104`).
     - It releases **event capacity** only for unused, unreturned units (`:117`).
     - A used unit keeps its seat, because someone occupied it.
   - Record this as R19 policy and fix the `:202` test to match. Add one plain-language
     line to the owner list: "A cancelled ticket that was already used at the door
     keeps its seat; the buyer's limit is still freed." Default: as stated.
   - Name the return-then-cancel path for a used unit (`returns.ts:44`,
     `reservations.ts:117`) and assert its counters.
2. **Attendance ownership (MEDIUM, specialist).** No kernel command owns the
   attendance transition that `checkInGuest` performs today (`guests.ts:165-170`), and
   `redeemGuestBenefit` depends on it (`:177`).
   - Add the attendance step, either inside `activateUnit` (on-the-spot activation,
     per R18) or as its own command.
   - Give its lock set (order-benefits → admission → event-account) and its row in the
     lock table.
   - State how `checkInGuest` is amended or retired, so that the attendance decision
     does not stay in `guests.ts` alongside the kernel.
   - Add the matching P2a test.

## LOW, apply

- `model.md:150`: `confirmOrder` holds neither payment-preparation nor cart locks; only
  `initiatePayment` does (`adapter.ts:104` against `:145-166`). Correct the statement.
- Drop the settlement-time `account-membership:buyer` read lock (`:150`). `activateUnit`
  decides the disposition under its own lock, and the extra lock only adds a new way
  for the money path to fail.
- `:146`: state that "restart from the owner boundary" never applies to settlement,
  whose keys are fixed by the snapshot.
- R18 (`:55`) and the P2a test (`:128`): mark removal of the `guestName` link
  prerequisite as a proposal, not settled. The owner removed check-in by name only.
- `handback.md:116`: mark the original "no-effects policy holds" line as superseded.
- Owner question table (`:224-231`): replace internal terms such as R17,
  preactivation, token-right disposition and PG with plain words, and keep each cell
  to one or two sentences.

Rerun your standard-library checker. Commit new commits with no amend. Append a
"Rework cycle 2" section to the handback that maps each item to its change, and send
one `worker_done`.
