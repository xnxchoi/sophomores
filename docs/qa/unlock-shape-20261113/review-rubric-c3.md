# Unlock shape review rubric, cycle 3 (final)

This review is read-only. Edit nothing. You may use web fetch or search to spot-check sources.

## What to review

The candidate is in worktree `/Users/seanschoi/orca/workspaces/sphmrs/unlock-shape-20261113`, at commit `222d85a9a7c550103a4c2261d45e2afb8a11a184`, on base `52f4675`. The full diff has SHA-256 `bf66335e…a486`.

In the worktree, read `docs/qa/unlock-shape-20261113/{spec,decision,handback,boundary}.md`.

In the main checkout (`/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`), read:
- `docs/qa/unlock-shape-20261113/rework-1.md` and `rework-2.md`. These hold the cycle-1 and cycle-2 corrections.
- The shared calendar and amendments at the end of `docs/qa/unlock-shape-20261113/dispatch.md`.
- The `### T002` owner policy in `docs/To-Do List.md`.

The integrated P2a kernel is main `src/lib/commerce/token-entitlements.ts`, from commit `13a29ee`.

Ownership is split:
- `unlock-shape` owns locks, network, issuance, the issuer key and the canonical schema.
- `unlock-auth` owns customer custody and the auth bridge. Its candidate is `docs/qa/unlock-auth-20261113/decision.md` in worktree `orca/workspaces/sphmrs/unlock-auth-20261113`, which is held for owner decisions.

## Rubric

Give PASS or FAIL for each item, citing `file:line`.

1. **Cycle-2 items resolved.** Check each item in rework-2.md:
   - P2a amendments are restated against the integrated kernel's exact lines. The pre-activation slot state is renamed so it does not collide with the kernel's `reserved`. A dated P2a-T slice exists.
   - There is a reserved→released transition on cancellation or return before activation, with replay, race and tests.
   - Signer policy is enforced outside the app server's trust boundary, or the exposure is stated honestly. Disabling access comes first, then revocation through the multisig. Proof A lists every role holder and removes the creator's default roles.
   - The recovery role is LockManager. The key manager's full powers, including `cancelAndRefund`, are listed. `setKeyManagerOf` runs after recovery, with a negative test.
   - The launch-minimum cut is made, with holder features moved to post-Dec-4. Signer and KeyGranter provisioning have latest dates. There is a Nov 20–25 build order that includes P2a-T.
   - Decision scope is clean: no T007 or staff-assisted proof items, and decision 1 is split if needed.
   - The LOW items in rework-2 were applied or explicitly declined.

   Also check that no cycle-1 item regressed.
2. **Factual accuracy.** Spot-check at least 4 claims against current sources, including the newly added claims (`MixinRoles`, `MixinTransfer`, `MixinRefunds`, `MixinKeys`, KMS `Sign` behaviour, Base fees and finality).
3. **Soundness.**
   - Is the issuer design safe if the server is compromised?
   - Does the nonce policy avoid both a blind regrant and an indefinite halt?
   - Does the release transition honour "a cancelled payment releases its units" with no lockout?
   - Do the tables fit `src/lib/payload/collections/commerce-*` and the integrated kernel without hidden policy?
   - Does the rework introduce any new hole?
4. **Shippability and owner usability.**
   - Is the 3-week calendar realistic?
   - Are there at most 5 owner decisions, all within shape's scope, in plain language and ranked?
   - Do the proofs list approvals and stop rules?
   - Is the candidate consistent with `unlock-auth`'s candidate, both on the boundary and on the calendar?
5. **Scope.** Only owned paths changed, and `boundary.md` is a byte copy of `0d4fa7e`.

**Severity.** HIGH blocks acceptance, MEDIUM must be fixed, and LOW is optional. The verdict is PASS only if there is no HIGH or MEDIUM finding.

Keep the report under 450 words, with the verdict first.
