# Resume: SPH-T002-UNLOCK-SHAPE-20261113-01 rework cycle 2 of 3

You are working in the existing worktree, at cycle-1 candidate `b192c0b`. Apply the rework below in full. Keep the shared calendar and the boundary. Commit new commits only.


Candidate `b192c0b` (diff `7bca7e9f…ec68c`). Reviews:

- Specialist: **FAIL**, 4 MEDIUM.
- Santa A: **FAIL**, 5 MEDIUM.
- Santa B: **FAIL**, 3 MEDIUM.

The two Santa reviews were independent. All cycle-1 items are verified as resolved,
and the facts were re-verified.

**P2a is now integrated at main `13a29ee`.** Read `src/lib/commerce/token-entitlements.ts` on main. You may `git show 13a29ee:<path>` without merging.

## Required

1. **Restate P2a amendments against the integrated kernel (all three reviewers).**
   - Replace "P2a not integrated" (`:7,212,218`).
   - For each amendment, cite the exact kernel line it changes:
     - `ALREADY_HOLDS_TOKEN` at `:149`. It refuses any membership row, so a slot
       reserved at settlement could never be promoted.
     - the `buyerHoldsToken` / pending-policy settlement at `:98-109`. Name it as the
       mechanism being replaced.
     - the kernel's `Membership.status: 'reserved'` at `:177`, which means "activated,
       awaiting chain". Rename your pre-activation slot state so it does not collide.
     - holder admission requiring a `confirmed` membership (`:265,:273`), against
       your rule at `:29` that holding does not depend on the mint.
   - Make these one dated follow-up slice ("P2a-T": type dimension plus these
     amendments) on the calendar, not part of "the final review".
2. **Reserved slot lockout (all three reviewers).** A slot reserved at settlement
   survives cancellation (`:166`). Every later unit becomes a gift (`:184`), and gift
   activations are refused (`:186`). So a cancelled first order permanently locks the
   buyer out of that type, which contradicts the owner's rule that a cancelled payment
   releases its units.
   - Add a reserved→released transition when payment is cancelled, or the unit is
     returned, **before activation**.
   - Specify replay and race behaviour for that transition.
   - Add tests for it.
3. **Signing-policy enforcement and lock roles (specialist, Santa B; Santa A LOW).**
   - KMS `Sign` cannot inspect calldata. Say where the chain/lock/calldata policy, the
     rate cap and nonce-anomaly detection are enforced: a validating signer or monitor
     **outside the app server's trust boundary**, with separate credentials. If none
     exists at launch, state the exposure honestly: a compromised app server holds
     full KeyGranter power until revocation, bounded by the balance cap.
   - Make disabling signer access the first response, and revocation through the
     multisig the follow-up.
   - Proof A must list every role holder, using the deployment logs and role events,
     and require the lock creator's default LockManager and KeyGranter roles to be
     removed (`MixinRoles:34-37`).
4. **Key-manager powers and recovery (Santa A, specialist).**
   - At 10,000 bps only LockManager can transfer (`MixinTransfer:44-49`), so the
     "recovery multisig" at `:88` cannot recover unless it is LockManager. Fix the role.
   - The key manager can `cancelAndRefund` (`MixinRefunds:57-63`). List its full
     powers.
   - A LockManager `transferFrom` resets `keyManagerOf` (`MixinTransfer:127`).
     Require `setKeyManagerOf` immediately after any recovery, and add that as a
     negative test.
5. **Launch-minimum cut and dated provisioning (all three).**
   - Use your own `:141`: every launch holder has a sold unit. On that basis, mark
     holder-origin access, holder benefit tables and holder counters as
     **post-Dec-4**.
   - Give latest dates on the shared calendar for signer-service selection, signer
     creation, the KeyGranter grant and funding.
   - Give a build order inside Nov 20–25 that includes P2a-T.
6. **Decision scope (Santa A M5, specialist L1).** Remove T007 scope and
   staff-assisted proof from decision 4; those belong to auth. Split decision 1 if
   it bundles network, issuer and addresses.

## LOW, apply

- Give the cancel path an owner-recorded way to raise the fee ceiling, so a fee
  spike cannot halt the stream.
- Add an immutable `bindingVersion` that auth's table lacks, or reference auth's
  field.
- Add deletion and retention references for your own operation and credential rows.
- Align proof naming with auth: map shape's A–E to auth's 1–6.

Commit new commits with no amend. Append a "Rework cycle 2" section to the handback, and send one `worker_done`.
