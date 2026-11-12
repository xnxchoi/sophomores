# SPH-T002-A-20261113-01 rework cycle 1 of 3, 2026-11-13

Candidate `581c2ab849e75526ce1eb246a4713ae2d0858da5`. The custodian's checks pass: scope
is limited to the two owned files, and the diff SHA-256 `4b7ee5e9…5309` matches. The local
links resolve; the three `%20`-encoded To-Do links are valid.

Reviews:

- Specialist (architecture): **FAIL**, 1 HIGH and 3 MEDIUM.
- Santa A: **FAIL**, 2 MEDIUM.
- Santa B: **FAIL**, 3 MEDIUM.

Santa A and Santa B did not see each other's review. All three independently confirmed
fidelity and the §4 issuance design. The spec and owned paths are unchanged.

## Required

1. **Settlement must never be a no-op (HIGH).** `model.md:69,107,141,165` let an
   unselected policy return "policy-required, no changes" during paid settlement.
   - Settlement runs in the payment transaction (`ecommerce.ts:125-133`). Rejecting there
     rolls back money that was already captured, or produces a 503 with an unknown
     outcome. That breaks blueprint:188-189 and T001's exactly-once allocation.
   - **Fix:** `settlePaidUnits` always completes for a verified paid snapshot (units,
     event access and buyer occupancy). Only the token-right disposition may be held,
     as a recorded pending state.
   - Add a test proving that settlement with every policy unselected still allocates.
2. **Check-in before activation and the guest-name prerequisite (MEDIUM; all three
   reviewers).** Currently:
   - `guests.ts:165-170` checks in an unclaimed admission that has only a `guestName`;
   - `guests.ts:103` requires `guestName` to issue a link;
   - `guests.ts:140,160` accept `checked-in` at claim.

   The registry already flags these (T001 :262 and T013). Add a reconciliation row that
   amends them against R03, R12 and R13. Add a test case, and a hold if an owner choice
   is needed. Also note how `returns.ts:31` treats an activated unit that is not checked
   in, and how that interacts with U3.
3. **Lock order and ownership (MEDIUM, specialist).** For each command, declare its
   lock-key set and its position in the existing order: order-benefits → admission →
   event-account (`benefits.ts:14-17`, `guests.ts:66-68`), alongside
   `adapter.ts:163-166`. That covers where the new account-membership key sits inside
   the payment transaction. State that the kernel is a pure decision function called
   under the existing locks, and that it replaces the decisions in `guests.ts` rather
   than running beside them (T001: "no second claim engine").
4. **Cancellation capacity is not settled (MEDIUM, specialist).** `model.md:128,146`
   keep capacity and allocation after a verified payment cancellation. That reverses
   `reservations.ts:101-104,117,122`, decides G3, and keeps the cancelled units counted
   against the three-unit allowance. Make it an explicit unselected policy input.
   Make the pre-activation refund refusal (`model.md:109,126`) a policy input too, until
   the legal/PG check is done.
5. **Split P2 (MEDIUM, Santa B; LOW, Santa A).** Define **P2a**: allocation,
   uniqueness, replay, and activation and gift races. Define **P2b**: the fake issuer,
   unknown outcome, recovery and returns. Each gets at most three simple, separately
   checkable acceptance criteria, its own owned files and its own test list. P2a must
   not depend on P2b.
6. **Plain-language owner decisions (MEDIUM, both Santas).** Add a short section
   written for a non-engineer. Give each decision as a question with two or three
   options and a stated default, and mark whether it blocks P2a, P2b or only production.
   Cover at least:
   - what a unit gives a buyer who already holds a token;
   - what happens when the gift recipient already holds a token;
   - activation after the event (U3);
   - a return after activation;
   - a separate event credential (R17);
   - U1 and U2.

   Avoid internal terms such as "bundle collision".

## LOW, apply

- Record that `tests/commerce/domain/storage-fake.ts` and `allocation.test.ts` were
  checked as reuse candidates, and why they fit or don't (AGENTS.md library-first gate).
- R12: state directly that `guests.ts:142` calls `activeMember`, which is account
  readiness, not token membership.

Rerun your standard-library checker. Commit new commits with no amend, append a
"Rework cycle 1" section to the handback that maps each item to its change, and send
one `worker_done`.
