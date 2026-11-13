# Unlock launch design: dispatch

Task `task_9f834e13eb45`, Dispatch `ctx_81981d98b2cd`. New top-level worktree `orca/workspaces/sphmrs/unlock-launch-20261113`, based on main `9be1483`. Submitted with Cmd+Enter.

It supersedes the custodial-wallet candidates (auth `113bd30`, shape `ae483f9`). Those candidates are retained as evidence and are not accepted.

## Handback, 2026-11-13

The candidate is `62b104f`, with full diff `ec061128…b8cd`. The custodian verified its scope and diff-check, and released the runtime. Review rubric: [review-rubric-c1.md](review-rubric-c1.md).

## Cycle-1 reviews, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (4 MEDIUM, 2 LOW) |
| Santa A | FAIL (3 MEDIUM, 4 LOW) |
| Santa B | FAIL (1 MEDIUM, 5 LOW) |

The Santa reviews were independent. All three confirm the basis is sound. The corrections are in [rework-1.md](rework-1.md).

Rework 1: Task `task_32c01cf372bc`, Dispatch `ctx_bcbf6ba8317b`, existing worktree. Submitted with Cmd+Enter.

## Rework 1 handback, 2026-11-13

The candidate is `fe7bb93`, with rework diff `55a360da…ab39`. The custodian checked scope and ran diff-check, then released the runtime. Cycle-2 rubric: [review-rubric-c2.md](review-rubric-c2.md).

## Cycle-2 reviews, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (1 MEDIUM) |
| Santa A | FAIL (1 MEDIUM) |
| Santa B | FAIL (2 MEDIUM) |

The Santa reviews were independent. All three confirm the v14 facts and the retirement design. The remaining findings are the missing build, audit and deploy slot for the hook, and the revoke-first issuance halt. Next: [rework-2.md](rework-2.md).

Rework 2: Task `task_59d7c8aefce0`, Dispatch `ctx_cd2eccf50285`. Submitted with Cmd+Enter.

## Rework 2 handback, 2026-11-13

Candidate `e8ef092` (rework-2 diff `60b28cd5…8198`). The custodian checked scope and ran diff-check, then released the runtime. Final rubric: [review-rubric-c3.md](review-rubric-c3.md).

## Cycle-3 (final) reviews: FAIL, held for owner, 2026-11-13

| Reviewer | Verdict |
|---|---|
| Specialist | FAIL (2 MEDIUM, 6 LOW) |
| Santa A | FAIL (1 MEDIUM, 4 LOW) |
| Santa B | FAIL (1 MEDIUM, 5 LOW) |

The two Santa reviews were independent. No reviewer raised a HIGH finding or a design-soundness problem. The facts, the v14 mechanics and the owner decisions all hold.

The MEDIUM findings, consolidated:
1. **Config-version immutability can be bypassed** (Specialist and Santa A). The Payload 3.92.1 global `restoreVersion` skips `beforeChange`, and `commerce-publication` has drafts enabled. Fix: an append-only collection with update and delete denied, plus a negative test for restore, draft and publish.
2. **The calendar is not honest** (Specialist and Santa B).
   - The issuer build is squeezed to one Sunday afternoon and is missing from the critical path.
   - The hook deploy and multisig attach are on a weekend, and that assumption is not stated.
   - There is no float, and no early slip trigger (for example, "no auditor by Nov 17 or 18 means Dec 4 slips").
