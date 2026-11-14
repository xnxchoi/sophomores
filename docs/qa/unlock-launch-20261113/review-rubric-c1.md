# Unlock launch design review rubric, cycle 1

This review is read-only: edit nothing. You may web-fetch or search public sources to spot-check claims, for example Unlock docs, Unlock GitHub and Base docs.

**Candidate.** Worktree `/Users/seanschoi/orca/workspaces/sphmrs/unlock-launch-20261113`, commit `62b104f`, base `9be1483`. The full diff hashes to SHA-256 `ec061128…b8cd`. Read `docs/qa/unlock-launch-20261113/{spec,decision,handback}.md` there.

Also read these in the main checkout (`/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`):
- `docs/qa/unlock-auth-20261113/unlock-recommended-pattern.md`, including the owner decisions at its end;
- the `### T002` section of `docs/To-Do List.md`, including "Owner Unlock basis";
- the dispatch tails of the prior candidates: `docs/qa/unlock-auth-20261113/dispatch.md` and `docs/qa/unlock-shape-20261113/dispatch.md`.

The integrated P2a kernel is `src/lib/commerce/token-entitlements.ts` on main.

## Rubric

Give PASS or FAIL for each item, citing `file:line`.

1. **Owner decisions are reflected and not reopened.** Check that the design keeps every one of these:
   - KeyGranter-only server grant;
   - Unlock's email-derived keyless address;
   - public membership accepted;
   - soulbound at 10,000 bps, with moves made only by the lock manager;
   - a cap, rate limit, monitor and kill switch;
   - Privy, quorum and attestation dropped.

   Also check that no custodial dependency survives anywhere: in the text, the schema, the calendar or the proofs.
2. **Factual accuracy.** Spot-check at least 4 claims against current sources:
   - `grantKeys` role access;
   - KeyGranter role administration;
   - the email derivation (exact JSON and casing, from `unlock-js` `KeyManager.createTransferAddress`);
   - the soulbound transfer and the lock-manager bypass (`MixinTransfer`);
   - `cancelAndRefund` and key-manager powers;
   - Base fees and finality.
3. **Soundness.**
   - **Compromise.** If the server is compromised, is the blast radius really limited to granting keys up to the cap, and stoppable by revoking the role? Is the lock-manager multisig kept off the server?
   - **Issuance.** Does issuance tie to the ledger without a blind regrant? That means operation identity, unknown outcome and the nonce policy.
   - **Refunds.** Do refunds and cancellations remove the key, and is the key manager correct?
   - **Email change.** Does the email-change rule stay coherent?
   - **Claim path.** Is the claim and upgrade path safe, including `setKeyManagerOf` after a lock-manager transfer?
   - **Carried-forward items.** Do P2a-T, the release transition, the launch cut and the schema still fit main's kernel and the `commerce-*` collections?
   - **New holes.** Does the design introduce any new hole?
4. **Simplicity and usability for the owner.**
   - Is the decision short and plain-language?
   - Are there no more than 4 owner decisions, ranked?
   - Is the calendar to Dec 4 realistic, with Nov 26 go/no-go criteria?
   - Do the proofs list approvals and stop rules?
5. **Scope.** Only `docs/qa/unlock-launch-20261113/` changed.

Severity: HIGH blocks acceptance, MEDIUM must be fixed, LOW is optional. The verdict is PASS only if there is no HIGH or MEDIUM finding. Keep the report under 450 words, verdict first.
