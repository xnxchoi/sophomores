# Resume: SPH-T002-UNLOCK-SHAPE-20261113-01 rework cycle 1 of 3 (retry after a lost terminal)

A previous session on this assignment lost its terminal before it started the rework. Your worktree is clean at the cycle-0 candidate. Apply the rework below in full.

The custodian has already answered the earlier questions:
- The shared calendar is canonical (see below).
- You may copy the exact bytes of `boundary.md` from main `0d4fa7e` into your owned directory and cite that commit. Do not merge.
- You own issuer key custody and the key-manager value.

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


Candidate `7567e05f2e561d59bbe1d0a329d77262917ac0f3` (diff `a02860b4…0ebb`). Reviews:

- Specialist: **FAIL**, 2 HIGH and 2 MEDIUM.
- Santa A: **FAIL**, 2 MEDIUM.
- Santa B: **FAIL**, 2 MEDIUM.

The two Santa reviews were independent. All three confirmed the facts, and the
outbox/no-blind-regrant design and no-repurchase catch-up are sound. Apply
[boundary.md](boundary.md) first. This document now owns the issuer key.

## Required

1. **Issuer key security (HIGH, specialist).**
   - Name this document as the owner of the issuer key.
   - State the minimum requirements, without selecting a vendor:
     - a compromised KeyGranter can mint to any address and extend keys;
     - LockManager revocation of the role, including on-chain revocation time and who
       holds LockManager;
     - the signer's balance cap as the loss limit;
     - key storage class (KMS/HSM versus env);
     - rotation without breaking nonce order;
     - no key in images, logs or the build.
2. **Stuck nonce (MEDIUM, specialist).** Define the path explicitly:
   - a pre-approved same-nonce fee bump with a ceiling;
   - same-nonce cancellation for a dropped transaction;
   - whether the next send waits for inclusion or for finality, with the resulting
     throughput.

   Base finality is about 20 minutes; waiting for finality allows roughly 3 mints an
   hour. Choose and justify.
3. **Schema fit (MEDIUM, specialist).**
   - `commerce-redemptions` requires an `admission`: define how holder benefits are
     stored.
   - Event capacity counts only paid units: define how holder places count.
   - Make your tables canonical for `token_type_targets` and the attempt/evidence data,
     and list the unlock-auth fields you consume.
4. **Slot reservation race (MEDIUM, Santa A).**
   - State when a type slot becomes `reserved`, and whether settlement reads or writes
     it. Settlement reading the slot changes P2a's "no membership read at settlement";
     label this as a P2a amendment.
   - Settle this race, or make it a named policy input: the buyer's own unit settles
     while the buyer activates another same-type gift first.
5. **Owner decision 2 (MEDIUM, Santa B).** The registry records zero minted
   memberships before this sale, so every launch holder has a sold place. Narrow the
   double-count hold to the cancelled and returned-after-activation cases, which
   frees one decision slot.
6. **Dated plan (HIGH, specialist; MEDIUM, both Santas).** Replace the build order
   with a dated calendar shared with unlock-auth (boundary.md). It needs:
   - a latest date for each dependency: owner lock delivery, owner decisions,
     AUTH-1–5 and P2a acceptance;
   - Proof A (read-only lock audit) moved to week 1;
   - slack before 2026-12-04;
   - a go/no-go checkpoint on 2026-11-26, with the criteria for each outcome.

   Account for P2a not being integrated yet: it is in its last review cycle.

## LOW, apply

- Date the cost rows inline.
- Note that the hosted dispatcher defaults the key manager to Unlock's team multisig.
- Label filling the chain target later as a P2a amendment.
- A grant that reverts because the recipient already holds a key goes to review, not
  not-issued.
- Make decision recommendations plain language.
- The handback cites `23a0d8a` but HEAD is `7567e05`; reconcile.

Commit new commits with no amend, append a "Rework cycle 1" section, and send one `worker_done`.
