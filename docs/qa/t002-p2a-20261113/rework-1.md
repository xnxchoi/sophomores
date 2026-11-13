# SPH-T002-P2A-20261113-01 rework cycle 1 of 3, 2026-11-13

Candidate `ab9cd2e49631d9c6dc10e3d27284a2a14f3d474a`, full diff `82a8c619…003e`.
Custodian checks: full typecheck of the exact final revision exits 0, the kernel has no
imports, and only owned paths change. Reviews:

- TypeScript and commerce specialist: **FAIL**, 4 MEDIUM.
- Santa A: **FAIL**, 1 MEDIUM.
- Santa B: **FAIL**, 1 MEDIUM.

Santa A and Santa B worked independently.

## Required

Write each test first and keep the RED result.

1. **Refusals reveal unit state before the bearer is checked.** All three reviewers
   raised this; the specialist rated it MEDIUM. `token-entitlements.ts:134-143` checks
   the digest last. An account without the bearer can therefore learn that a unit
   exists, whether it is the buyer's own unit, and whether it has a hold, a review or a
   binding. Unit IDs are predictable (`order:N`).
   - Validate digest and generation immediately after the unit lookup.
   - Return one uniform refusal for a missing unit and for a bad bearer.
   - Apply the same fix to `regenerateActivationCode` and
     `assessGiftLinkEligibility` (`:160-161`, `:181-182`). There, a missing unit
     (`UNAVAILABLE`) and a non-buyer (`BUYER_REQUIRED`) must also be
     indistinguishable to a non-buyer.
   - Test: with a wrong digest, every unit state returns the same code, and the state
     reference is unchanged.
2. **Settlement replay depends on mutable evidence.** The specialist and Santa B both
   rated this MEDIUM. `:80-82` puts `holdersAdmitted` and `buyerHoldsToken` into the
   replay identity, so a payment retry made after the buyer activates a token returns
   `INTEGRITY`. Those flags are inputs to the first settlement only. Replay returns the
   stored allocation for the same immutable order and transaction snapshot. Test: settle,
   activate a gift so the buyer now holds a token, then replay with
   `buyerHoldsToken: true`. The result must be the original allocation, with no new
   effects.
3. **Replays succeed on corrupt state.** The specialist rated this MEDIUM. Activation
   (`:127-131`), `recordAttendance` (`:207-211`) and `attendHolder` (`:221-222`)
   return the prior result without re-validating it. Before returning a replay, check
   that the stored result is still consistent: the unit is activated for that account,
   the membership slot exists, and attendance is recorded. Otherwise return
   `INTEGRITY`. Add one corrupt-state replay test for each command.
4. **Activation can overwrite another account's occupancy.** The specialist rated this
   MEDIUM. `:147-149` overwrites `admission.account` without checking for a different
   existing account. Refuse with an integrity error instead, and add a test.

## LOW, apply

- Do not include the client-supplied `at` in activation replay identity (`:123-126`).
  A same-command retry with a fresh timestamp returns the original result. Add a test.
- Validate `actorMode` at runtime (`:122`). An unknown mode is refused, not treated as
  guest.
- Race losers (test `05` at `:65`, and test `03`): assert the exact refusal code, and
  assert that it reveals nothing about the claimant.
- Remove the vacuous literal assertions at T:94, T:134 and T:196-198. Replace them with
  real ones.
- Test `01`: add the model's already-holder and past-event settlement fixtures. Assert
  that a holder buyer is allocated all units.
- Add tests for the holder-attendance `EVENT_ALREADY_BOUND` branch (`:223`), and for the
  effect of holder occupancy on later activation.
- `policyHold` `TOKEN_DISPOSITION_UNSELECTED` (`:106-108`): owner answers 1–3 settle
  the gift and holder-buyer cases. Keep the hold only where a disposition genuinely
  remains unselected, or record why it stays.
- Record as a known gap in `contract.md`: a tokenless buyer reserves a self unit and
  becomes a holder before activating it. The self unit then refuses with
  `ALREADY_HOLDS_TOKEN`, and holder attendance is refused because of the buyer's own
  reservation. State the behaviour, and do not choose a policy.
- Optional: narrow the record types with discriminated variants for the activated and
  checked-in states. Do this only if it stays within the owned files and does not grow
  the change much.
- Name the single final coverage run in the receipts, and make the receipts
  self-consistent.

## Checks

- Focused tests, with a coverage run that still shows at least 80% lines and branches.
- One full typecheck on the **exact final revision**, with no edit after it.
- One default suite under the shared limits.
- `git diff --check` clean.

Commit new commits with no amend. Append a "Rework cycle 1" section to the handback
that maps each item to its change, then send one `worker_done`.
