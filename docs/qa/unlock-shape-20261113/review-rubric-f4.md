# Unlock shape review rubric: fix 4 (final review, authorized by the owner)

This review is read-only. Edit nothing. You may use web fetch or search to spot-check sources.

**Candidate.** The candidate is in worktree `/Users/seanschoi/orca/workspaces/sphmrs/unlock-shape-20261113` at commit `ae483f9`. The base is `52f4675` and the prior candidate is `222d85a`. The full diff hashes to SHA-256 `0379c7ca…8742`. Use `git diff 222d85a ae483f9` to see the fix.

**Inputs.**
- In the worktree: `docs/qa/unlock-shape-20261113/{spec,decision,handback,boundary}.md`.
- In the main checkout `/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`:
  - `docs/qa/unlock-shape-20261113/fix-4-owner-authorized.md`, which sets the authorized scope;
  - `review-rubric-c3.md`, whose items all still apply;
  - `dispatch.md`, whose tail holds the cycle-3 findings;
  - the `### T002` policy section of `docs/To-Do List.md`.
- The owner's DB rule (AGENTS.md, "Database: Payload-native first for operations"). It covers operational quick fixes only. Schema design is out of its scope.
- The counterpart candidate from unlock-auth: worktree `orca/workspaces/sphmrs/unlock-auth-20261113` at `113bd30`, file `docs/qa/unlock-auth-20261113/decision.md`. It owns the signed binding attestation and the activation evidence.

## Rubric

Mark each item PASS or FAIL, citing `file:line`.

1. **Cycle-3 MEDIUM findings resolved.**
   - Trust root: the approving authority, its credential and where the signer reads it are all named.
   - A cumulative cap is tied to independently counted activations.
   - The residual exposure, both under isolation and with a compromised attestation key, is stated in plain language in decision 2.
   - The signer policy and monitor build has an owner, a date and a fallback.
   - Exactly one side holds nonce authority.
   - Launch cut: there is one owner for attendance and capacity, and the table list, build order and Proof D all agree with it.
   - Schema mechanism: every launch table states where it lives and who owns access to it.
2. **LOW items applied:** `activationRecordConsistent` in P2a-T; the corrected cite; the multisig's `grantKeys` power and how it is constrained; return versus non-refundable; v14 pins or labelled differences; plain-language decisions.
3. **No regression and no new hole.** Every PASS item from cycles 1–3 still holds. Check two cross-boundary questions:
   - Is shape's view of the attestation consistent with what `113bd30` actually specifies? Compare fields, credential, per-activation evidence and dates.
   - What can a compromise of the attestation service alone do, and is that stated?
4. **Factual accuracy.** Spot-check at least 3 new or changed claims.
5. **Scope.** Only `decision.md` and `handback.md` change in fix 4, and `boundary.md` is byte-identical to `0d4fa7e`.

**Severity.** HIGH blocks acceptance, MEDIUM must be fixed, LOW is optional. The verdict is PASS only if there is no HIGH and no MEDIUM finding.

Keep the report under 450 words, with the verdict first.
