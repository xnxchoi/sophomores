# SPH-T002-UNLOCK-AUTH-20261113-01 — Unlock authentication and walletless accounts (investigation)

Slug `unlock-auth-20261113`, branch `codex/unlock-auth-20261113`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md), with these exceptions:

- Your identity base is **the main commit that adds this file**.
- This is a Markdown-only investigation. Run no Node workload.
- Persist the handback as `docs/qa/unlock-auth-20261113/handback.md`.

**Why now:** the owner wants Unlock live and reliable within three weeks, by about
2026-12-04 (registry T002, "Owner launch directives"). The owner handles the token
(lock) itself. **Your question is the most important one:** how Sophomores accounts
connect to Unlock, and how walletless accounts are created and handled. The owner's
model is that "Unlock creates a wallet for them and binds their email."

**Read first:**
- [blueprint](../../reference/unlock-integration-blueprint.md) §§2–3, especially the
  finding that native email-recipient addresses are derived **per email and lock
  address**. The blueprint's conclusion is that this "is not one shared, signable
  customer wallet".
- the accepted [T002-A model](../t002-a-20261113/model.md);
- registry T002;
- the current auth stack: Better Auth, Payload `users`, `src/lib/member-auth/`.

**Research (public, read-only):** use current Unlock docs, Context7 if it is
available, and pinned public source. Re-verify everything against current sources,
because the P1 pin is dated 2026-11-01. No hosted API calls, credentials, accounts,
wallets, signatures, installs or paid services.

## Deliverable: `docs/qa/unlock-auth-20261113/decision.md`

1. **What Unlock actually offers today for walletless users.** Cover each of these:
   - native email-recipient issuance, with its per-lock address derivation and its
     KeyManager;
   - Unlock's own account or login system, and any embedded-wallet provider it
     currently uses (name it only if the sources show it);
   - a connected external wallet;
   - a third-party embedded wallet that we integrate ourselves.

   For each, state: who holds the keys; whether it is one address per user across all
   locks; whether it can sign; recovery; email change; export to the user's own wallet
   later; whether the user needs a separate Unlock login or OTP; privacy (whether the
   address can be guessed from an email); cost; vendor dependency.

   Label every claim D (documented), S (source-inspected) or U (unproven).
2. **The auth bridge.** Sophomores' Better Auth/Payload account stays canonical. Show
   how each option binds to `users.id`, with no second login if possible. Cover:
   - when the wallet is created (at sign-up, at activation, or lazily);
   - how activation in the P2a ledger triggers the grant;
   - what happens on account recovery (T007), email change and account deletion.
3. **Recommendation.** One option for launch in three weeks, plus a fallback. Give
   the exact architecture and data fields to add, and an incremental path that keeps
   the launch ledger, so on-chain issuance can lag without a re-purchase.
4. **Owner decisions.** No more than five, in plain language, each with options and a
   default, ranked by what blocks the three-week path.
5. **Smallest live proofs.** For each, give the exact approvals needed (network,
   fixture lock, operator, cost ceiling, credentials) and a stop rule. Order them for
   a three-week schedule.

## Acceptance

1. Every option has the full attribute set with D/S/U labels and source links. No
   claim is presented as fact without a source. The blueprint's per-lock-derivation
   finding is confirmed or refuted against current sources.
2. The recommendation is specific enough to dispatch an implementation spec, and the
   owner decisions are plain-language and limited to blockers.
3. The handback lists sources consulted, with any fetch failures, and the results of
   a standard-library link check.
