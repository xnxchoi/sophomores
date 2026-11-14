# SPH-T002-UNLOCK-AUTH-20261113-01: fix 4, owner-authorized, 2026-11-13

This resumes the work in the existing worktree `orca/workspaces/sphmrs/unlock-auth-20261113`, branch as recorded. The prior candidate is `eb20002` (diff `82c38170…898c`). Its runtime was released. The original spec, boundary and shared rules still apply, together with the owner's Payload-native DB rule (AGENTS.md "Database: Payload-native first"). This assignment is Markdown-only: no Node workloads.

Cycle 3 failed. Security, Santa A and Santa B all failed, with no HIGH findings. **The owner authorized exactly one narrow fourth fix**, limited to the following. Change nothing else.

## Required (both MEDIUM, raised by both Santa reviews)

1. **Door activation under D** (`decision.md:116,128,153,198`).
   - Separate wallet creation and receiving the grant from signing step-up. Create a receive-only wallet, plus its binding, at account creation or at activation, so that a guest who registers at the door can activate on the spot.
   - Keep every signing action gated by the matured step-up and the quorum.
   - State which actions, if any, a customer wallet signs at launch. If there are none, say so, and correct "one real wallet that can sign" (`:197`).
   - Restate decision 2 in plain language so the owner can see the door-activation consequence.
2. **Independence of the quorum's inputs** (`:130,154,156`).
   - The authorization service issues and verifies the WebAuthn challenge itself.
   - It owns the factor and eligibility registry (`eligibleAfter`) under credentials the web app does not hold. The web app relays the ceremony but cannot write those records.
   - Address the security LOW in the same move: synced passkeys and an action-bound challenge, so the challenge commits to the exact action digest.
   - Add proof (f): a forged passkey or a back-dated eligibility record written through the web app's DB authority is rejected. Give its approvals and stop rule.
   - Data shape: records that the authorization service owns live in that service's own store, under its own credentials.

## LOW (apply)

- Record AUTH-3 on Nov 17 as a calendar amendment against `dispatch.md:28`. The shape candidate agrees with it.
- Rename "our issuer" in decision 1 to "our login token signer" (the JWT signer), so it is not confused with shape's NFT issuer.
- Name public phone verification (step 6, which currently denies every grant) as a dependency of the bootstrap.
- Add `bindingVersion`, which shape requires (`shape decision.md:223,228`), to the binding record.

## Gates

- `boundary.md` stays byte-identical.
- The standard-library link and anchor check passes, with its actual output recorded.
- `git diff --check` is clean.
- Commit new commits, with no amend.
- Append a "Fix 4" section to the handback, giving the new diff hash.
- Send one `worker_done`.
