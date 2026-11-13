# Resume: SPH-T002-UNLOCK-AUTH-20261113-01 rework cycle 1 of 3 (retry after a lost terminal)

A previous session on this assignment lost its terminal before it started the rework. Your worktree is clean at the cycle-0 candidate. Apply the rework below in full.

The custodian has already answered the earlier questions:
- The shared calendar is canonical (see below).
- You may copy the exact bytes of `boundary.md` from main `0d4fa7e` into your owned directory and cite that commit. Do not merge.
- If T007 stays deferred, block public recovery claims and the affected custody path at Nov 26. Do not treat intake as restoration.

## Shared calendar (custodian-approved, with amendments)

- Nov 16: shape publishes the canonical target/schema contract and the issuer, key-manager and security contracts.
- Nov 17: requested from the owner (not committed): lock, address and settings, plus the owner decisions. Also due: the custodian P2a acceptance/integration decision and the auth AUTH-1/4 account-binding and customer-wallet contract.
- Nov 18: AUTH-2/3/5 lifecycle, privacy and activation-consent contracts.
- Nov 19: Proof A, the read-only lock audit.
- Nov 20–25: approved DB, issuer/nonce and auth proofs. Each needs its own approval.
- Nov 26: go/no-go.
- Nov 27–30: integrated rehearsal.
- Dec 1–2: frozen-schema and release review.
- Dec 3: contingency.
- Dec 4: target for live and reliable. Cutover and deployment keep their separate approval.
Amendments to the shared calendar (custodian, 2026-11-13). These apply to both investigations. The calendar already sent stays canonical, with these additions:
- Nov 18 (requested from the owner): Privy Scale-plan decision and access, only if the custom-JWT path is recommended.
- Nov 20–25: proof window. Inside it: minimal T007 access-restoration slice due Nov 23, only if the owner keeps T007 in launch scope; AUTH-5 signing/JWT/revocation implementation proofs due Nov 25; joint fixture proofs due Nov 25.
- Design contracts keep their earlier dates: AUTH-1/4 on Nov 17, AUTH-2/3/5 on Nov 18, and shape target/issuer/schema on Nov 16.
- P2a acceptance is the custodian's, on Nov 17.

## Ownership boundary


Both cycle-1 reviews found that the two investigations overlap or leave gaps. From now on:

| Area | Owner |
|---|---|
| Lock per type, network, lock settings (expiry, transfer, max keys, purchase disabled), key manager value | **unlock-shape** |
| Issuer choice (hosted or direct KeyGranter), **issuer signer key custody and security**, nonce and fee policy | **unlock-shape** |
| Canonical schema: `token_type_targets`, issuance operation, attempt and evidence tables, holder access, holder benefits and capacity | **unlock-shape** |
| Customer wallet custody options, the auth bridge (Better Auth → wallet), the JWT/OIDC controls, wallet creation timing, recovery, email change, deletion and export | **unlock-auth** |
| Customer-wallet binding table (`users.id` → wallet/address, per scope) | **unlock-auth**, which references unlock-shape's tables and does not redefine them |

Each document names the other as a dependency, with the exact input it needs and a
latest acceptable date. Both build orders share one dated calendar to **2026-12-04**,
with a **go/no-go checkpoint on 2026-11-26**.

## Rework


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
