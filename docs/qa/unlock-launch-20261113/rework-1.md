# SPH-T002-UNLOCK-LAUNCH-20261113-01 — rework cycle 1 of 3

Resume in the existing worktree `orca/workspaces/sphmrs/unlock-launch-20261113` from candidate `62b104f` (diff `ec061128…b8cd`). The spec and the owner decisions still apply. Do not reopen them.

Reviews:
- Specialist: **FAIL**, 4 MEDIUM.
- Santa A: **FAIL**, 3 MEDIUM.
- Santa B: **FAIL**, 1 MEDIUM.

The two Santa reviews were independent. All three confirm that the basis is sound: a server compromise can only grant keys, the multisig stays off the server, the facts match pinned v14, and nothing custodial survives.

## Required

1. **Make the cap real on-chain.** The cap in `:18,48` is only a server counter, and a stolen granter key bypasses it. (Santa A M1, specialist L5.)
   - Evaluate an `onKeyGrantHook` cap. In v14 `grantKeys` calls it inline, and only the LockManager can set it through `setEventHooks`.
   - Either recommend that hook (a minimal capped hook contract, with its audit and deploy approval stated), or state plainly in the owner decision that the cap does not limit a stolen key and give the resulting worst case.
   - Recommended default: the hook.
2. **Refund drain.** (Specialist M1, Santa A/B L1.)
   - Pin `keyPrice = 0`, a zero refund penalty basis, and an empty lock balance.
   - Make all three Proof A checks.
   - Use `expireAndRefundFor(id, 0)` or an equivalent zero-value cancellation, so that a legitimate cancellation cannot revert and cannot pay a keyless address.
3. **Make cancellation terminal and allow reissue.** (Specialist M2.)
   - The runbook order is: revoke the KeyGranter role first, then cancel. Otherwise `grantKeyExtension` revives the cancelled key.
   - Cancelled keys still count against `maxKeysPerAddress`. Specify the multisig `burn` step, or an equivalent, so that a chargeback followed by a repurchase to the same email-derived address works.
4. **Independent "move to my wallet" flow.** (Specialist M3.)
   - Multisig signers verify the decoded from, to and token values against an out-of-band record. The server holds no Safe proposer or signer credentials.
   - Correct `:18`: it should say "cannot move keys without signers independently verifying".
5. **Plain language and real decisions.** (Specialist M4, Santa A M2, Santa B L.)
   - Rewrite the owner decisions as at most 4 single questions. Each question gets a recommended default in plain words.
   - Stagger the due dates.
   - Remove jargon from the main text, including "fenced lease", "lock rank", "alias" and "first-self reservation rule". Move the technical detail into an appendix.
   - Where a recommended default exists for something the owner need not answer, take it and record it.
6. **Realistic calendar.** (Santa A M3, Santa B M.)
   - Split Build 1 across several days, Nov 20–24, and include a review slot.
   - Give firm dates, all before Nov 23, for creating the KeyGranter wallet, its custody location (KMS/HSM or equivalent, never an environment file), the role grant, funding, and the repeated Proof A.
   - Reduce scope where possible. Do all 16 collections need to exist by Dec 4? Apply the launch cut.

## LOW (apply)

- **Recycled email.** Pick one resolution: for example, the lock manager moves the old key to the original account's current derived address before the email can be reused.
- **New-nonce retry.** Reconcile "no new-nonce rescue" (`:15`) with a retry after proven non-execution (`:60`).
- **Schema naming.** Collection names follow main's hyphenated `commerce-*` slug convention. Merge the two overlapping review-case collections. Map the kernel's `operationID` (`'membership:'+entitlementID`, `token-entitlements.ts:124`) to the design's operation key.
- **Citations.** Fix the `[SROLE]` cite (`:12,27`). State "as lock manager", not "as key manager", for cancellation (`:17`).

## Gates

- The standard-library link and anchor check passes, with its output recorded.
- `git diff --check` is clean.
- Keep the document short.

Commit new commits, with no amend. Append a "Rework cycle 1" handback section, then send one `worker_done`.
