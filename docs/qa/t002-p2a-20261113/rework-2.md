# SPH-T002-P2A-20261113-01 rework cycle 2 of 3, 2026-11-13

Candidate `1f8d31c6f6cceb2a9755c08adf128be4dbd367da`, full diff `5a79995b…36b3`. Custodian
checks: the full typecheck of the exact revision exits 0, and only owned paths change.
Reviews:

- Santa A: **PASS**, LOW only.
- Santa B: **PASS**, LOW only.
- Specialist: **FAIL**, 2 MEDIUM.

The two Santa reviews were independent. Every cycle-1 item is verified as resolved.
Because this cycle changes code, all three reviewers will review the next candidate again.

## Required

1. **Activation ignores `policyHold` (MEDIUM, specialist; Santa A rated it LOW).**
   `activateUnit` never reads `entitlement.policyHold` or `disposition`. It sets
   `policyHold: undefined` and `disposition: 'acquisition'` (`token-entitlements.ts:172`).
   As a result, a forced-self unit held under `TOKEN_DISPOSITION_UNSELECTED` can be
   activated, and its hold disappears without a trace. This happens when settlement ran
   with `buyerHoldsToken: true` but `state.memberships` has no slot for the buyer. Test
   `:196` hides the problem by seeding `holder('buyer')`.
   - Activation of an entitlement that still carries an unresolved `policyHold` must
     return a typed `POLICY_REQUIRED` refusal. Bearer-first ordering is preserved, and
     the refusal consumes nothing and changes no state.
   - Add a test **without** a seeded holder slot. Write it RED first.
2. **Vacuous privacy case (MEDIUM, specialist).** The `activated` case of the
   rework-1 bearer-privacy test (`test.ts:266`) reuses the default `commandID`
   `'activate-1'`. It therefore reaches the foreign-command branch (`:150`), which
   returns `UNAVAILABLE` before any bearer check, so the case would pass even if the
   bearer check were moved last.
   - Give the probe a distinct `commandID`, so it really exercises bearer-first
     ordering.
   - Add held and activated unit states to the non-buyer privacy test for
     regeneration and gift-link eligibility (`:274`).

## LOW, apply

- Remove `timingApproved` from activation replay identity (`:145`). A retry after the
  timing window has closed must return the original result.
- `regenerateActivationCode` replay (`:187-190`): re-validate the stored state before
  returning the prior result, as the other commands do.
- In `recordAttendance`, return the same code whether a foreign-account unit is checked
  in or not (`:223-229`). Add a test where `account` equals `proofAccount` but not the
  unit's account.
- `attendHolder` replay (`:245`): return the original recorded result without
  requiring `holdersAdmitted` again.
- Add one race-test ordering in which activation `b` wins first.
- Test `12`: assert one intent and one slot after a late activation.
- Add a `staff-guided` mode test.
- Handback:
  - Label the cycle-0 "Validated result summary" figures as superseded.
  - List honestly which new tests were characterisation tests and so could not be RED
    first.
  - Reconcile or label the packet SHA `82c41d1d…`.

## Checks

- Focused tests, plus coverage: at least 80% of lines and branches in one named final
  run.
- One full typecheck on the **exact final revision**, with no edit after it.
- One default suite.
- `git diff --check` clean.

Commit new commits with no amend. Append a "Rework cycle 2" section to the handback, and
send one `worker_done`.
