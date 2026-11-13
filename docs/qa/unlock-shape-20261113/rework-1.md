# SPH-T002-UNLOCK-SHAPE-20261113-01 rework cycle 1 of 3, 2026-11-13

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
