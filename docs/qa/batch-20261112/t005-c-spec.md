# SPH-T005-C-20261112-01 — remaining outcome/UI scope contract (design only)

Slug `t005-c-20261112`. Follow [shared rules](shared-rules.md). **Read-only source:**
no `src/`, `messages/` or `tests/` edits and no Node workloads. Inputs: the T005
section of the registry, the T005-A contract in the execution plan, the T005-B
evidence, the T012 routing (AUTH-01/02/05, AUTH-07, FRONT-01..07) and its ledger,
and the claim UI consumers (for example `src/components/commerce/invitation-claim.tsx`
and `order-admissions.tsx`).

**Owned paths:** `docs/qa/t005-c-20261112/` and your handback file.

**Acceptance (1–3):**
1. An outcome matrix covering every T005-A outcome (CLAIM_INVALID, EXPIRED,
   CONSUMED, UNAVAILABLE, ACCOUNT_NOT_ELIGIBLE, EVENT_ALREADY_BOUND,
   CLAIM_RESULT_UNKNOWN), the B same-claimant recovery, and the own-completed /
   cooldown / auth cases the registry names. For each: reader objective,
   authoritative result, next actor and why, the supported action that actually
   exists, the protected fact or threat, the current UI consumer
   (`file:line`) with its present behaviour, and the existing `en.json` key or
   held T012 key.
2. Mark every case **ready** (all facts and actions exist) or **held**, naming the
   blocking owner decision or the T001/T003/T004/T009/T010 dependency. Do not
   invent an action, reissue, refund or timing, and draft no final copy.
3. Propose 1–3 bounded implementation slices, covering only ready cases, each with
   1–3 verifiable criteria. Include owned paths, a test-first plan, the
   next-intl/Korean-unchanged rule and the required live desktop/touch render. Note
   that other independent review is not owner acceptance.
