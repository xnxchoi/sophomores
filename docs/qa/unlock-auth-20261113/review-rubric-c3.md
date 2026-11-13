# Unlock auth review rubric — cycle 3 (final allowed)

This review is read-only. Edit nothing. You may use web fetch or search to spot-check sources.

## What to review

The candidate is in worktree `/Users/seanschoi/orca/workspaces/sphmrs/unlock-auth-20261113`, at commit `eb2000265e05dac67aedd4bf46d0d42a0a9d6fe7`, on base `52f4675`. The full diff has SHA-256 `82c38170…898c`. Read these files:

- `docs/qa/unlock-auth-20261113/spec.md`
- `docs/qa/unlock-auth-20261113/decision.md`
- `docs/qa/unlock-auth-20261113/handback.md`
- `docs/qa/unlock-auth-20261113/boundary.md`

Read the cycle-1 corrections in the main checkout (`/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`):

- `docs/qa/unlock-auth-20261113/rework-1.md`
- `docs/qa/unlock-auth-20261113/rework-2.md` (each cycle-2 item must be resolved)
- the shared calendar and its amendments at the end of `docs/qa/unlock-auth-20261113/dispatch.md`

Owner policy is the `### T002` section of the main checkout's `docs/To-Do List.md`. It says:

- tokens are typed;
- each account holds one token per type;
- Unlock must be live by about Dec 4;
- the owner handles the lock;
- the priority is the auth connection and walletless accounts;
- the owner's model is "Unlock creates a wallet for them and binds their email".

The parallel `unlock-shape` investigation owns locks, network, issuance, the issuer key and the canonical schema.

## Rubric

Give PASS or FAIL for each item, citing `file:line`.

1. **Cycle-1 and cycle-2 items resolved.** Cycle-2 items: step-up factor source and bootstrap, with cooling-off and the magic-link and 7-day-session exclusions; Privy quorum, deny-export and allowlist with Nov 25 proofs; honest custody for A, with Unlock Accounts mentioned in decision 1; owner asks moved to Nov 17. Cycle-1 items:
   - Shape decisions are removed or turned into named dependencies, and `unlock-shape` is named.
   - The custom-JWT fallback is described honestly as effective Sophomores custody.
   - Email-takeover protection is in place: step-up before wallet authority or export, revocation, and the email-change and T007 takeover paths.
   - JWT controls are complete: key rotation with `kid` and JWKS overlap, `jti` replay protection, short expiry, a dedicated signing key, no tokens in logs, and a server-only versus client choice.
   - Per-lock addresses are stated in the recommendation and in owner decision 1.
   - All privileged movers are named.
   - The dated plan follows the shared calendar and covers the T007 prerequisite and the Scale-plan decision date.
2. **Factual accuracy.** Re-spot-check at least 4 claims, including any new ones, against current sources.
3. **Soundness.** Is the recommendation now honest about which option actually gives one signable wallet per user, and at what cost and custody? Is any new security hole introduced?
4. **Shippability and owner usability.**
   - No more than 5 owner decisions, all about auth or custody, in plain language and ranked.
   - Proofs list their approvals and stop rules.
   - The calendar is consistent with the shared one.
5. **Scope.** Only the owned paths changed, and `boundary.md` is a byte copy of the original.

Severity: HIGH blocks acceptance; MEDIUM must be fixed; LOW is optional. The verdict is PASS only if there is no HIGH or MEDIUM finding. Keep the report under 450 words, with the verdict first.
