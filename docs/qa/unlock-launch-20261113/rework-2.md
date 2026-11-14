# SPH-T002-UNLOCK-LAUNCH-20261113-01: rework cycle 2 of 3

Resume in the existing worktree from candidate `fe7bb93`. The spec, the owner decisions and rework 1 all still apply.

## Reviews

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (1 MEDIUM, 4 LOW) |
| Santa A | FAIL (1 MEDIUM, 3 LOW) |
| Santa B | FAIL (2 MEDIUM, 2 LOW) |

The two Santa reviews were independent. All three confirm the following against pinned v14:
- the cap hook;
- the zero-value refund;
- your finding that expire-then-burn reverts, which also means a burn would reuse a token ID;
- the retirement batch;
- independent move checks.

Everything else passes.

## Required

1. **The hook gets real build, audit and deploy slots.** All three reviewers flagged this.
   - Add dated rows for writing the minimal capped-hook contract, testing it, independent audit, bytecode verification, deployment and attachment.
   - Tests must cover: the wrong caller, reentrancy, batch grants, the over-cap revert, extension rejection, and an unprivileged `extend`.
   - Name the role of the author, auditor and deployer, and the deployer wallet and gas.
   - Put the auditor and the cost in an owner decision, with a recommended default.
   - Keep the hook a hard stop, and make the calendar honest about what it takes. Move the ten collections and migrations off a single day, add a review slot, and show the critical path to Nov 26.
2. **Revoke-first.** Santa B M2, Santa A L and specialist L3 all raised it. With the extension-rejecting hook attached, `_extendKey` reverts (v14 L3584), so revoking KeyGranter on every routine cancellation adds nothing. It also halts all issuance with no resume path.
   - **Default:** routine cancellations do not revoke. Revoke only on a suspected granter compromise.
   - Specify the re-grant gate after a revocation: granter nonces finalized, Proof A repeated, multisig approval.
   - Make "a replacement hook must keep extension rejection" a Proof A check.

## LOW (apply)

- **Proof D.** Add a negative test: public `extend` called from an unprivileged EOA must revert (L4583).
- **`maxNumberOfKeys` must always equal `totalSupply`** after every config change. Otherwise, at `keyPrice` 0, free public purchases bypass the grant-hook cap (L3928, L4497). Make this a Proof A check and an operations rule.
- **Lock balance.** Anyone can send 1 wei, so a nonzero balance means "withdraw and recheck". It does not mean stop.
- **Out-of-band record for multisig moves.** Signers recompute the from-address from the member's email using the public derivation, read ownership from an explorer, and decode the whole batch: targets, selectors and operation type. The server's case record is never the source.
- **Retired-email reuse.** Name the actual check that blocks a retired email at sign-up and at email change. Better Auth frees the old email immediately.
- **Immutable config versions.** These are stored on the mutable `commerce-publication` global. State how immutability is enforced: an append-only collection with update and delete access denied, or similar.
- **Owner-facing jargon.** Remove "same-nonce fee bumps" and "finalized-head lag" from owner-facing text (`:38`). Shorten the paragraph-length table cells (`:47-62`).

## Gates

- The standard-library link and anchor check passes, with its output recorded.
- `git diff --check` is clean.
- Keep it short.

Commit new commits, with no amend. Add a "Rework cycle 2" handback section and send one `worker_done`.
