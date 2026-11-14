# SPH-T002-UNLOCK-AUTH-20261113-01 — dispatch custody

Dispatched on the owner directive of 2026-11-13: Unlock live in three weeks. The spec is frozen at main `52f4675`. Run `run_8a16b71cf6a4`, Task `task_62cd92a38731`, Dispatch `ctx_c40a2d2205e0`. Codex, default model. Before launch: 15.87 GiB available, 10.08 GiB accounted. The custodian submitted with Cmd+Enter, and the agent then showed Working.

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

New worker in the same worktree, started from resume brief `docs/qa/resume-20261113/unlock-auth-rework1.md`: Task `task_c797b0eb15ff`, Dispatch `ctx_8a917a9f6994`. Submitted with Cmd+Enter.

## Rework cycle 1 handback, 2026-11-13

Candidate `1f238be`, with a full diff from base of `6c63d234…4563`. `boundary.md` is a byte copy of `0d4fa7e`. The custodian verified scope and whitespace. The runtime was released. Cycle-2 rubric: [review-rubric-c2.md](review-rubric-c2.md).

## Review cycle 2, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Security | FAIL (2 MEDIUM) |
| Santa A | FAIL (2 MEDIUM) |
| Santa B | PASS |

The two Santa reviews were independent of each other. Corrections are in [rework-2.md](rework-2.md).

## Rework cycle 2 dispatched, 2026-11-13

Task `task_bc00396332d9`, Dispatch `ctx_55f3d0e93411`, using the existing worktree. Brief: `docs/qa/resume-20261113/unlock-auth-rework2.md`. Submitted with Cmd+Enter.

## Rework cycle 2 handback, 2026-11-13

Candidate `eb20002`, full diff from base `82c38170…898c`. The custodian verified scope and whitespace, and released the runtime. Cycle-3 rubric: [review-rubric-c3.md](review-rubric-c3.md).

## Cycle-3 reviews: FAIL, held for owner, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Security | FAIL (1 MEDIUM: synced passkeys and an action-bound challenge) |
| Santa A | FAIL (2 MEDIUM, 3 LOW) |
| Santa B | FAIL (2 MEDIUM, 2 LOW) |

The two Santa reviews were independent of each other and found the same two MEDIUM findings:
1. Under option D, the 48-hour wait blocks wallet creation, and with it door activation (`decision.md:116,128,153,198`, against To-Do List "activate on the spot").
2. Factor and eligibility records the web app can write feed the quorum's independent check (`decision.md:130,154`), and no proof covers forged records.

LOW findings:
- the AUTH-3 Nov 17 calendar amendment is not recorded;
- "our issuer" is ambiguous;
- "one real wallet that can sign" oversells D;
- the bootstrap's dependency on public phone verification is not named.

This was the third and final cycle, so the result is escalated to the owner. Next step: a narrow fix 4, if the owner authorizes it.

## Owner decision, 2026-11-13

The owner authorized one narrow fourth fix: [fix-4-owner-authorized.md](fix-4-owner-authorized.md).

Fix 4: dispatched as Task `task_50ac47dbaa9e`, Dispatch `ctx_32bfc2b18bdc`, using the existing worktree. Submitted with Cmd+Enter.

## Fix 4 handback, 2026-11-13

Candidate `113bd30`, full diff `bc696aff…863e`. The custodian verified scope, whitespace and that `boundary.md` is byte-identical, and released the runtime. Review rubric: [review-rubric-f4.md](review-rubric-f4.md).

## Fix 4 reviews: FAIL, held for owner, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (3 MEDIUM, 1 LOW) |
| Santa A | FAIL (2 MEDIUM, 2 LOW) |
| Santa B | FAIL (1 MEDIUM, 2 LOW) |

The two Santa reviews were independent of each other. Every cycle-3 item is resolved structurally, and the LOW items and the addendum are applied. Their findings, consolidated:

1. **Door activation depends on an independent readiness proof that does not exist.** Raised by Santa A M2 and Santa B M1. The attestation requires readiness to be verifiable outside the web app. All current readiness evidence is Better Auth and Payload, which are web-app authority (`decision.md:104-105,193,199`). Decision 2 (`:215`) omits this.
2. **The authorization service is an unstated single point of compromise.** Raised by Santa A M1 and Specialist M3, with Santa B L1. The service holds the quorum key, the factor registry, the challenge and attestation keys, and the activation evidence.
3. **App-writable inputs undermine independence.** Raised by Specialist M2. The binding, phone and notification channels come from the app database.
4. **The wallet creation window.** Raised by Specialist M1, with Santa A L1 and Santa B L2. Creation is not atomic with the quorum owner and policy, so the login token signer can pre-create a wallet or export its key.

**Root cause (custodian).** Every identity fact the service would check is produced by the web app, so moving the checks into a service does not make them independent. Any remedy is an owner design choice, not another patch. The authorized fix-4 cap has been reached.
