# SPH-T002-UNLOCK-AUTH-20261113-01 rework cycle 2 of 3, 2026-11-13

Candidate `1f238be` (diff `6c63d234…4563`). Reviews:

- Security: **FAIL**, 2 MEDIUM.
- Santa A: **FAIL**, 2 MEDIUM.
- Santa B: **PASS**, LOW only.

The Santa reviews were independent of each other. All cycle-1 HIGHs are resolved,
and the facts were re-verified.

## Required

1. **Step-up factor source (MEDIUM, security).** `:122` requires a "previously bound
   passkey or independently verified second factor" but never says where a new
   walletless user gets one. Passkeys are optional today and can be enrolled from any
   email session (`src/lib/auth/options.ts:92-99`), so a mailbox attacker could
   pre-enrol a passkey on a dormant account. Phone is "proof, never authentication"
   (`options.ts:54`). Define:
   - the first factor;
   - its bootstrap path for a new user;
   - an enrolment cooling-off period with notification before a newly enrolled
     factor counts.

   Exclude magic-link and other email-only routes, and account for the 7-day session
   (`options.ts:63,104,182`). Decision 2's default depends on this.
2. **Privy wallet-owner configuration for D (MEDIUM, security).** By default, a holder
   of a valid user access token can sign or export directly. AUTH-5 must require:
   - a key quorum (for example 2-of-2: the user plus an app authorization key);
   - a deny-export policy;
   - a chain and contract allowlist bounding what an impersonating issuer can sign.

   Add Nov 25 proofs for each.
3. **Honest custody for A (MEDIUM, Santa A).** An email-derived address has no key,
   and with transfers disabled only the LockManager (plus Unlock signers, if enabled)
   can move the token. A is therefore operator custody too. State this in the
   recommendation (`:14`) and decision 1 (`:184`) as prominently as D's "effective
   Sophomores custody". Also mention Unlock Accounts in decision 1, since it is the
   literal match to the owner's model, and say why it is not recommended.
4. **Calendar alignment (MEDIUM, Santa A).** Owner decisions are requested on
   **Nov 17**. The only owner item on Nov 18 is the Scale-plan decision. Move
   decision 4 and the lifecycle/privacy owner asks to Nov 17, and keep AUTH-3's own
   due date consistent with them.

## LOW, apply

- The JWKS endpoint must be served outside the web app, or the signing key must be
  pinned. Otherwise a compromised app can add its own key.
- `:40`: note that the LockManager can re-enable transfers, which would activate the
  KeyManager route.
- `:218`: the D sandbox needs Scale. State that the Nov 18 approval funds that
  upgrade.
- Reconcile D's key export with the server-only mode, or drop export as an exit path.
- Move optional proof 5 before the Nov 26 go/no-go, or mark it post-launch.
- Fee and transaction ceilings belong to unlock-shape's fee policy. Reference them
  instead of setting them.
- Rewrite decisions 4 and 5 in plain language. Do not use "If we need D".

Commit new commits with no amend. Append a "Rework cycle 2" section to the handback, and send one `worker_done`.
