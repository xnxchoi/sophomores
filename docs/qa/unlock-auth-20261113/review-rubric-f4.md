# Unlock auth review rubric: fix 4 (owner-authorized final review)

This review is read-only. Edit nothing. You may web-fetch or search to spot-check sources.

**Candidate.** The candidate is in worktree `/Users/seanschoi/orca/workspaces/sphmrs/unlock-auth-20261113` at commit `113bd30`. Its base is `52f4675` and the prior candidate is `eb20002`. Diff SHA-256 values: `bc696aff…863e` for the full diff, `ecc20464…eb9a` for the fix-4 diff. Use `git diff eb20002 113bd30` to see the fix itself.

**Inputs**
- In the worktree: `docs/qa/unlock-auth-20261113/{spec,decision,handback,boundary}.md`.
- In the main checkout (`/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs`), under `docs/qa/unlock-auth-20261113/`:
  - `fix-4-owner-authorized.md` is the authorized scope.
  - `review-rubric-c3.md` holds the cycle-3 criteria. They all still apply.
  - `dispatch.md` ends with the cycle-3 findings.
- The custodian addendum on the binding attestation. It requires the authorization service to issue a signed attestation with these fields: account, bindingID/bindingVersion, recipient, operation/activation anchor, target, intent digest, expiry and revocation. The credential must be held outside the web app. It must give per-activation evidence so that shape's signer can count activations. Joint acceptance is Nov 18 and the build is Nov 20.
- Owner policy: the `### T002` section of the main checkout's `docs/To-Do List.md`, in particular "activate on the spot".

## Rubric (PASS or FAIL for each item, citing `file:line`)

1. **Both cycle-3 MEDIUM findings are resolved.**
   - Door activation works under option D:
     - a receive-only wallet and binding exist before step-up;
     - every signing action stays gated by the matured step-up and the quorum;
     - the launch actions the customer wallet signs are named, or the document says there are none;
     - decision 2 is in plain language.
   - The quorum's inputs are independent:
     - the service issues and verifies the WebAuthn challenge;
     - the challenge is bound to the action digest;
     - synced passkeys are addressed;
     - the factor and eligibility registry is service-owned under credentials the web app lacks;
     - proof (f) exists, with its approvals and a stop rule.
2. **The LOW items and the addendum are applied.**
   - AUTH-3 has a calendar amendment.
   - The rename from "issuer" to "login token signer" is done.
   - The phone-verification dependency is named.
   - `bindingVersion` is present.
   - The attestation contract matches the addendum and states issuance preconditions, key custody, rotation and revocation. It does not design shape's signer.
3. **No regression and no new hole.**
   - Every cycle-1, cycle-2 and cycle-3 PASS item still holds.
   - Check whether the receive-only wallet opens a new path. For example: can a grant reach a wallet that has no matured factor? Is that acceptable given that transfers are disabled? Can anyone sign through it?
   - Check whether the attestation service becomes a single point of compromise, and whether that is stated.
4. **Factual accuracy.** Spot-check at least 3 claims that are new or changed, against current sources.
5. **Scope.** Only `decision.md` and `handback.md` changed in fix 4, and `boundary.md` is byte-identical to `0d4fa7e`.

**Severity.** HIGH blocks acceptance. MEDIUM must be fixed. LOW is optional. The verdict is PASS only if there is no HIGH and no MEDIUM finding. Keep the report under 450 words, with the verdict first.
