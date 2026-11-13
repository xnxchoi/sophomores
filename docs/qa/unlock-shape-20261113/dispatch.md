# SPH-T002-UNLOCK-SHAPE-20261113-01 — dispatch custody

Dispatched on the owner directive of 2026-11-13: Unlock live in three weeks. The spec is frozen at main `52f4675`. Run `run_8a16b71cf6a4`, Task `task_6ceb5cb5c916`, Dispatch `ctx_f2551bc0037b`. Codex, default model. Before launch: 15.87 GiB available, 10.08 GiB accounted. The custodian submitted with Cmd+Enter, and the agent then showed Working.

## Review cycle 1, 2026-11-13

Specialist FAIL, Santa A FAIL and Santa B FAIL. The two Santa reviews were independent. The custodian set the ownership boundary in [boundary.md](boundary.md). Corrections are in [rework-1.md](rework-1.md).

## Shared calendar, 2026-11-13

unlock-shape proposed it, the custodian approved it, and the custodian forwarded it to unlock-auth.

Shared calendar (custodian-approved 2026-11-13):
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

## Worker lost, 2026-11-13 16:58

The terminal closed without `worker_done`, while the wake notice for the custodian reply sat unsubmitted in the composer. The worktree is clean at its cycle-0 candidate. The cycle-1 rework was not done. No retry was made, because the owner pause is in effect.

## Resumed, 2026-11-13

New worker in the same worktree, started from resume brief `docs/qa/resume-20261113/unlock-shape-rework1.md`: Task `task_deb6682b6092`, Dispatch `ctx_7720a8504597`. Submitted with Cmd+Enter.

## Rework cycle 1 handback, 2026-11-13

Candidate `b192c0b`, full diff from base `7bca7e9f…ec68c`. `boundary.md` is byte-identical to `0d4fa7e`. The custodian verified scope and whitespace. The runtime was released. The cycle-2 rubric is [review-rubric-c2.md](review-rubric-c2.md).

## Review cycle 2, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (4 MEDIUM) |
| Santa A | FAIL (5 MEDIUM) |
| Santa B | FAIL (3 MEDIUM) |

The two Santa reviews were independent of each other. Corrections are in [rework-2.md](rework-2.md).

**Dispatch of rework cycle 2 is queued.** Admission measured 13.45 GiB accounted with three Codex workers live (I1, auth rework 2, I0DB). A fourth would exceed the 15 GiB aggregate. The brief is ready at `docs/qa/resume-20261113/unlock-shape-rework2.md` and will be dispatched when a worker settles.

## Rework cycle 2 dispatched, 2026-11-13

Task `task_3625fb08990e`, Dispatch `ctx_a0987159fecf`, existing worktree. Submitted with Cmd+Enter after the auth worker was released.

## Rework cycle 2 handback, 2026-11-13

Candidate `222d85a`, with full diff from base `bf66335e…a486`. The custodian verified scope, whitespace and that `boundary.md` is byte-identical, and released the runtime. Cycle-3 (final) rubric: [review-rubric-c3.md](review-rubric-c3.md).

## Cycle-3 reviews: FAIL, escalated to owner, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (1 MEDIUM, 4 LOW) |
| Santa A | FAIL (1 MEDIUM, 5 LOW) |
| Santa B | FAIL (3 MEDIUM, 4 LOW) |

The two Santa reviews were independent.

**Medium findings, consolidated:**
1. **The validating signer has no source of trust, cap or build slot (all three reviewers).** `decision.md:83`'s "independently approved recipient/intent evidence" has no producer or credential outside the app. There is no cumulative cap: `grantKeys` bypasses supply, and only the 10/min rate limit applies. The residual exposure under isolation is not stated (`:90`). No owner or date covers building the signer policy and monitor (`:246,249-252`), yet Proof B (`:281`) needs it by Nov 24.
2. **The launch-minimum cut is unclean (Santa B).** `:158` makes the new access and attendance tables the owner, while `:162` and Proof D keep the paid commands authoritative. `:177-178` are launch tables with no build slot.

**Rule impact.** The owner's Payload-native DB rule (`33c31eb`) means the proposed tables (`:164-180`) must be Payload collections and fields with Payload migrations.

**Low findings:**
- `activationRecordConsistent` is untyped (kernel `:121-122`) and is missing from P2a-T.
- The recovery multisig can also mint through `grantKeys`.
- Nonce authority is claimed both at `:83` and `:99`.
- The pre-activation return conflicts with no refund before activation.
- The pinned source is master while v14 is deployed.
- Several terms are jargon.

The cap has been reached, so this is held for the owner.

## Owner decision, 2026-11-13

The owner authorized one narrow fourth fix: [fix-4-owner-authorized.md](fix-4-owner-authorized.md).

Fix 4 is **queued until a worker settles**, because of the 15 GiB aggregate ceiling. Three Codex workers are live: I1 rework, I0DB remediation and auth fix 4.
Fix 4: dispatched as Task `task_cc4fd6fbfdb8`, Dispatch `ctx_a4fdb2edfb7a`, using the existing worktree. Submitted with Cmd+Enter once the I1 worker had settled.

## Fix 4 handback, 2026-11-13

Candidate `ae483f9`, full diff `0379c7ca…8742`. The custodian verified scope, whitespace and that `boundary.md` is byte-identical, and released the runtime. Review rubric: [review-rubric-f4.md](review-rubric-f4.md).
