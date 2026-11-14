# Commerce scope review — 2026-11-14 (owner-ordered)

**Status:** review complete. **No code changed.** Implementation is held until the owner decides.

- Live review for owner annotation: https://claude.ai/artifact/1o928dvxD34dXi58dvXQht
- **Trigger:** the owner questioned why idempotency (a solved problem) had produced so much machinery, and ordered a strict scope review.
- **Held:** T004 I3 is paused mid-work. Its edits are uncommitted in `orca/workspaces/sphmrs/t004-i3-20261114`.

## Findings

Sources: an independent architecture audit and an independent process audit. The custodian spot-checked the key claims against the code.

**Code beyond the standard checkout baseline.** About 40% of live `src/lib/commerce` exceeds it:
- the I2 ledger;
- the transaction-ownership wrapper;
- the deferred-risk path;
- an unused token kernel (283 lines, no importers);
- the net-three allowance;
- quantity 1–3.

**Dead code.** About 2,550 lines of legacy ticket checkout. Its result page posts to `/api/payments/portone/complete`, which no route serves.

**Missing.** Product needs that no code covers yet:
- refunds (nothing calls PortOne cancel);
- discounted guest invites;
- partial-refund handling (today it freezes all access on the order);
- live mode (sandbox-only, TEST channel pinned);
- abandoned-attempt expiry;
- an "activated" state;
- a re-check job.

**Process.**
- Since 2026-11-11: 212 docs commits and 21 source commits.
- An agent-proposed brief was hash-locked as "binding".
- Reviewers raised out-of-envelope threats.
- Each finding added a mechanism.
- Five assignments hit the 3-cycle cap; none were simplified.
- The owner's one-unit decision did not reach the I3 spec frozen hours later.

## Proposed rebuilt plan (pending owner)

1. Launch plan rewrite to the owner's facts.
2. Uniqueness plus a single `settle(paymentId)`.
3. A re-check job.
4. Refunds via PortOne cancel.
5. Product model: one unit, a priced invite line, an activated state.
6. Live readiness.
7. The sandbox matrix (≤30).
8. Delete the dead weight.

In parallel: the PG application.

## Owner decisions

Listed in the live review: adopt the plan, the envelope, the expiry rule, deletions, redemptions, the process rules, the I3 edits, the PG application and the legal check.

## Consistency check (2026-11-14, after owner comments)

The live doc now has a "Consistency check" section. It records:
- **Six contradictions:**
  - guest check-in has no defined path;
  - the guest-pays route is membership-gated, but our checkout requires an account;
  - the no-refunds rule needs a stated scope;
  - no step grants the membership on payment;
  - a PG filing before Monday needs a live build, but there is no deploy step;
  - the sandbox test listed payment methods that 바로오픈 doesn't offer at launch.
- **Missing standard items:**
  - terms of service and privacy policy;
  - data-transfer consent, including to Unlock overseas;
  - an escrow certificate for 통신판매업 신고;
  - refund-page wording;
  - a pre-shipping cancellation cutoff;
  - an alcohol age check;
  - a card-only launch;
  - an app-card return test;
  - a tracking notice.

I3 branch: it adds only `hasRetainedPaymentRisk` inside the I2 ledger, which the plan drops. Recommend setting it aside.

## Owner answers to the consistency check (2026-11-14)

- **Membership on payment:** `settle()` grants the account its membership in the same transaction as the order (one per account, idempotent). The token mint is separate and later.
- **Guest invite links:** two types, distinguished before routing.
  - *Paid* links go to Unlock email-only redemption.
  - *Pay-required* links go to the guest checkout. This is exempt from the membership gate and needs no account; the member's link is the authorization.
  - Only members create invites.
- **Unused invites:** the invite price is refunded in full after the event. Staff need a manual "mark used" override for when an offline check-in happened but the digital link failed. The refund runs after the override window.
- **Age check:** done at registration.
- **Deployment target:** Sunday 2026-11-15. The first deploy is the PG review build. The deploy action itself still gets an explicit go at the time.
- **Business type:** 간이과세자, not incorporated.
  - Generally exempt from 통신판매업 신고, so the escrow certificate becomes moot.
  - Escrow is needed only for cash prepayment.
  - Card-only through the PG avoids it.
  - Still to confirm: what KG Inicis asks for in review.
