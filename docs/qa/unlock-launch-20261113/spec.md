# SPH-T002-UNLOCK-LAUNCH-20261113-01: consolidated Unlock launch design (Unlock's own pattern)

Slug `unlock-launch-20261113`, branch `codex/unlock-launch-20261113`. Follow the [batch shared rules](../batch-20261112/shared-rules.md), with these changes:
- Your identity base is **the main commit that adds this file**.
- The work is Markdown only. Run no Node workload.
- Write your handback to `docs/qa/unlock-launch-20261113/handback.md`.

**Owned paths:** `docs/qa/unlock-launch-20261113/` only.

## Why

The owner has replaced both earlier designs:
- auth: `orca/workspaces/sphmrs/unlock-auth-20261113` at `113bd30`;
- shape: `orca/workspaces/sphmrs/unlock-shape-20261113` at `ae483f9`.

Both assumed per-user custodial wallets (Privy, key quorum, attestation service), and every remaining MEDIUM finding came from that assumption. Read these first:
- [unlock-recommended-pattern.md](../unlock-auth-20261113/unlock-recommended-pattern.md), including the owner decisions at its end;
- registry `### T002`, in particular "Owner Unlock basis";
- the fix-4 review tails in [auth dispatch](../unlock-auth-20261113/dispatch.md) and [shape dispatch](../unlock-shape-20261113/dispatch.md).

## Settled by the owner. Do not reopen these.

1. **Issuance.** After a paid unit is activated, the server calls `grantKeys` from a **dedicated wallet that holds only the KeyGranter role**. No per-user wallet, Privy, quorum, attestation service, Scale plan or validating-signer service.
2. **Walletless recipients.** The recipient is the **Unlock email-derived keyless address**: the first 20 bytes of `keccak256(JSON{email, lock})`, as in `unlock-js` `KeyManager.createTransferAddress`. Public on-chain membership is intended.
3. **Soulbound.** The transfer fee is 10,000 bps. Only Sophomores, as **lock manager**, moves a key to a real wallet, which is recovery or upgrade through Sophomores.
4. **Blast radius.** A compromised server can only grant keys. Those keys are bounded by a low owner-set cap, a rate limit, a monitor and a kill switch (revoke the KeyGranter role), and the lock manager can cancel them. State this once, in plain language.
5. The owner handles the lock itself. Products are managed in Payload. The ledger stays the admission authority.

## Deliverable: `decision.md`. Keep it short, ideally under 250 lines.

1. **Architecture**, in 6–10 bullets.
   - Roles: lock manager (multisig), KeyGranter hot wallet, key manager, creator default roles removed.
   - Network: Base, as previously recommended.
   - How issuance attaches to the existing ledger: P2a kernel and activation, operation identity, unknown outcome, no blind regrant.
   - Nonce and stuck-transaction policy.
   - Refund or cancellation: the key manager cancels.
2. **Carry forward from the prior candidates only what still applies.** Cite each by file and line in its worktree:
   - lock role facts (v14 cites);
   - the nonce and fee policy;
   - P2a-T, including `activationRecordConsistent`;
   - the reserved→released transition;
   - the launch cut, in which existing paid commands stay authoritative;
   - schema rows, with their storage mechanism.

   Drop everything that depends on custodial wallets.
3. **Account binding.** Record which email and derived address each account was granted to, along with `bindingVersion`. Use a Payload collection.
   - What happens when a member changes their email after issuance? The key stays at the original address. Propose the minimal rule.
   - Is the derivation's exact JSON and lock-address casing pinned to the installed or pinned `unlock-js` source?
4. **Claim and upgrade path.**
   - Under 10,000 bps, Unlock's own email-claim page cannot complete (`KeyManager.transfer` → `lendKey` reverts unless the caller is a lock manager).
   - Propose the simplest Sophomores-run "move my key to my wallet" flow: lock-manager transfer after proof of account ownership, then `setKeyManagerOf`.
   - Say whether it is needed by Dec 4 or can follow.
   - Do **not** propose making Unlock's shared KeyManager contract a lock manager unless you state its full blast radius.
5. **Owner decisions.** At most 4, ranked, in plain language: for example, the numeric cap, the multisig signers, and the claim-flow timing.
6. **Dated plan.** Fit the shared calendar to Dec 4, with Nov 26 as go/no-go. Give the proofs (each with its approvals and a stop rule) and the build order, including P2a-T.

## Acceptance

1. Every settled owner decision is reflected, nothing settled is reopened, and nothing custodial survives. Each item carried forward cites its source line.
2. Factual claims about Unlock cite current official docs or the pinned source. These include `grantKeys` roles, KeyGranter, the email derivation, the soulbound transfer and lock-manager bypass, `cancelAndRefund`, and Base.
3. The handback lists the changed files, the diff hash, the output of a standard-library link and anchor check, and the open owner decisions.

Commit new commits only and send one `worker_done`.
