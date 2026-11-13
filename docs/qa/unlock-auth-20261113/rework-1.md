# SPH-T002-UNLOCK-AUTH-20261113-01 rework cycle 1 of 3, 2026-11-13

Candidate `65841ea78121c8a82b03c67fbf326902e3651770` (diff `892026ea…df95`). Reviews:

- Security specialist: **FAIL**, 2 HIGH and 3 MEDIUM.
- Santa A: **FAIL**, 3 MEDIUM.
- Santa B: **FAIL**, 1 HIGH and 2 MEDIUM.

The two Santa reviews were independent of each other. All three confirmed the facts:
per-lock derivation, Privy-backed Unlock Accounts, and the Scale plan for custom JWT.
Apply [boundary.md](boundary.md) first.

## Required

1. **Hand shape decisions to unlock-shape (HIGH, Santa B; MEDIUM, others).**
   - Remove or convert to named dependencies:
     - issuer choice (`:133`);
     - lock policy and expiry (`:130,133-134`);
     - `token_type_targets` and the P2b attempt table (`:141,145`).
   - Owner decisions 2–3 (chain, lock, issuer) move to unlock-shape. Replace them
     with auth/custody decisions only.
   - Name unlock-shape throughout, with the exact inputs you need.
2. **Custody honesty for the custom-JWT fallback (HIGH, security).** Describe D
   accurately. Sophomores holds the key that mints wallet-provider JWTs for any
   `users.id`, so a compromised server or insider can authenticate as any user and
   sign. That is **effective Sophomores custody**, not "user-owned". Restate it in the
   matrix, the recommendation and the owner decision.
3. **Email takeover equals wallet takeover (HIGH, security).** Login is email OTP, so a
   compromised mailbox yields wallet authority. For every option that grants signing,
   define:
   - step-up (for example passkey or a second factor) before wallet authority or
     export;
   - session and JWT revocation;
   - the email-change and T007-recovery takeover paths.
4. **JWT controls (MEDIUM; all three).** Add:
   - key rotation (`kid`, JWKS overlap, revocation);
   - `jti` replay protection;
   - short expiry;
   - a signing key dedicated to the provider, because Privy's setup checks only
     signature and expiry, so issuer and audience must be enforced by key separation;
   - no JWTs in logs or telemetry;
   - the server-only versus client authentication choice.
5. **Per-lock addresses in the recommendation (MEDIUM, Santa A).** Under typed tokens,
   native email custody gives an account holding A and B **two unrelated addresses**,
   not one wallet. State this in the recommendation and in owner decision 1, against
   the owner's "Unlock creates a wallet and binds their email" model.
6. **Who can move a native-held token (MEDIUM, security).** Name every privileged
   party: Unlock's locksmith signers, the owner's LockManager, and our issuer.
7. **Dated plan (MEDIUM).**
   - Add a build order on the shared calendar to 2026-12-04, with the go/no-go on
     2026-11-26 (boundary.md).
   - Include the T007 prerequisite: proof 4 needs real access restoration, which is
     still intake-only and is on the proposed deferral list. Either scope a minimal
     T007 slice into the plan, or state what is blocked without it.
   - The Scale-plan purchase sits on the custom-JWT path. Give its latest decision
     date.

## LOW, apply

- Make decision 3 plain language. It now moves to unlock-shape regardless.
- Note that the Privy docs are rendered with JavaScript.
- Justify or drop KeyManager as the key manager.

Commit new commits with no amend. Append a "Rework cycle 1" section and send one `worker_done`.
