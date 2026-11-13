# Unlock shape review rubric — cycle 2

This review is read-only. Edit nothing. You may use web fetch or search to spot-check sources.

## What to review

The candidate is in worktree `/Users/seanschoi/orca/workspaces/sphmrs/unlock-shape-20261113`, at commit `b192c0bfd948b90810595c1ffcf0716f89db381c`, on base `52f4675`. The full diff has SHA-256 `7bca7e9f…ec68c`. Read these files:

- `docs/qa/unlock-shape-20261113/spec.md`
- `docs/qa/unlock-shape-20261113/decision.md`
- `docs/qa/unlock-shape-20261113/handback.md`
- `docs/qa/unlock-shape-20261113/boundary.md`

Read the cycle-1 corrections in the main checkout (`/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`):

- `docs/qa/unlock-shape-20261113/rework-1.md`
- the shared calendar and its amendments at the end of `docs/qa/unlock-shape-20261113/dispatch.md`

Owner policy is the `### T002` section of the main checkout's `docs/To-Do List.md`. It says:

- tokens are typed;
- each account holds one token per type;
- Unlock must be live by about Dec 4;
- the owner handles the lock;
- the priority is the auth connection and walletless accounts;
- the owner's model is "Unlock creates a wallet for them and binds their email".

This investigation (`unlock-shape`) owns locks, network, issuance, the issuer key and the canonical schema. `unlock-auth` owns customer custody and the auth bridge. P2a is now integrated at main `13a29ee` (`src/lib/commerce/token-entitlements.ts`).

## Rubric

Give PASS or FAIL for each item, citing `file:line`.

1. **Cycle-1 items resolved.**
   - Issuer key security:
     - one named owner;
     - compromise impact;
     - LockManager revocation and who holds it;
     - a balance cap as the loss limit;
     - the storage class;
     - rotation with nonce order;
     - no key in images, logs or the build.
   - Stuck-nonce path: a pre-approved fee bump with a ceiling, a same-nonce cancel, and inclusion versus finality with stated throughput.
   - Schema fit:
     - holder benefits despite `commerce-redemptions` requiring an admission;
     - holder capacity counting;
     - canonical `token_type_targets` and attempt tables;
     - the auth fields it consumes.
   - Slot reservation:
     - when a slot is reserved;
     - whether settlement reads or writes it, labelled as a P2a amendment;
     - the race between a self-unit settlement and the same buyer's same-type gift activation, settled or named as a policy input.
   - Owner decision 2 is narrowed using the "zero minted memberships" record.
   - Dated plan:
     - it follows the shared calendar;
     - Proof A falls in week 1;
     - there is slack before the deadline;
     - there are Nov 26 go/no-go criteria;
     - P2a status is accounted for.
2. **Factual accuracy.** Re-spot-check at least 4 claims against current sources, including any new claims: fees, finality, KMS or signer facts, and Unlock roles.
3. **Soundness.**
   - Is the issuer design safe if the server is compromised?
   - Does the nonce policy avoid both a blind regrant and an indefinite halt?
   - Do the tables fit `src/lib/payload/collections/commerce-*` and the integrated P2a kernel without hidden policy?
   - Is any new hole introduced?
4. **Shippability and owner usability.**
   - Is the 3-week calendar realistic?
   - Are there at most 5 owner decisions, all within shape's scope, in plain language and ranked?
   - Do the proofs list approvals and stop rules?
   - Is the plan consistent with `unlock-auth`'s plan?
5. **Scope.** Only owned paths changed, and `boundary.md` is a byte copy.

Severity: HIGH blocks acceptance, MEDIUM must be fixed, LOW is optional. The verdict is PASS only if there is no HIGH or MEDIUM finding. Keep the report under 450 words, with the verdict first.
