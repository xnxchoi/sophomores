# /Users/seanschoi/Projects/sphmrs/docs/To-Do List.md

Current assignment contract — SPH-T005-B-20261111-01

- **State:** resuming; accepted dependency 92cfe64 integrated privately with existing B hashes preserved. Stale guest-regression ownership amendment is authorized; no wait for unrelated delivery. Parent T005-B. Chat `01a1ca3b-c6b6-7890-9c58-94885f1c1631`, host local, managed worktree `/Users/seanschoi/.codex/worktrees/3041/sphmrs`, verified branch `codex/t005-b-claim-result-20261111`.
  Custodian `01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`, host local.
- **Outcome, ownership and three criteria:** T005-B scope/criteria under the named
  section and step-10 in [bounded execution plan][1]; same-account valid-bearer
  already-successful result only, no new entitlement. No UI/copy or payment changes.
- **Base/dependencies:** `/Users/seanschoi/Projects/sphmrs` main
  `3c853b0e670abde45f591f2f86d09dbbf4472983`; exact source/dirty/resource baseline
  [here](qa/t005-b-20261111/assignment-baseline.json). New managed worktree from
  committed main, NOT working-tree/all-WIP copy. Unique branch
  `codex/t005-b-claim-result-20261111`; confirmed managed worktree `/Users/seanschoi/.codex/worktrees/3041/sphmrs` at exact base. Creation token `client-new-thread:2f7869e3-4003-4e07-a5b2-8183a0218a16` resolved to chat `01a1ca3b-c6b6-7890-9c58-94885f1c1631`; no duplicate created.
- **Owned paths:** `src/lib/commerce/guests.ts`; root `tests/commerce/domain/`
  claim-outcomes.test.ts, claim-http.test.ts, new claim-recovery.test.ts, and (custodian amendment) guests.test.ts solely for the stale replay expectation/retained invariants; own QA
  evidence directory excluding custodian baseline/dispatch. Everything else is
  read-only, including canonical registry/plan/catalogues/native transaction helper.
- **Resources:** admission sample ~12.677 GiB accounted, ~21.085 GiB available of
  48 GiB. Recount before tools/review/workloads; no workload while existing total
  >13.5 GiB or system headroom <10 GiB. Focused app checks ≤1 GiB guarded, one per
  worktree, aggregate ≤15 GiB. No preview/build/parallel tests. If unable, stop and
  report resource blocker; no bypass or limit increase. Keep caches/outputs local.
- **Permissions/holds:** settled local source/test work and reviewed scoped local
  commits; no providers/DB/transport/services, env/credentials, installs, policy
  selection, new permissions, pushes/readiness/deployment or destructive cleanup.
  Inspect installed Next/library docs before code. Tests first, preserve actor/
  outcome/native completion/privacy/expiry/hold boundaries. Do not manufacture
  an expiry override or choose unresolved recovery/reissue policy.
- **Review/handback:** deterministic checks first, required code/type/security
  reviews plus two fresh independent Santa reviewers with identical original spec/
  candidate/rubric and no mutual assessment visibility. Both PASS; at most three
  fix/review cycles. Report exact branch/base/candidate/source hashes, RED/GREEN/
  actual failures/checks/limitations, decisions and remaining owned PIDs in durable
  worktree handback and final turn. Custodian reads/waits; no wake guarantee.
- **Integration/retirement:** candidate is not merged or complete. Custodian
  serializes integration, checks current main and combined result, reruns affected
  gates after changes, preserves concurrent WIP; then learning/evidence and verified
  main reachability/no workloads before recoverable managed worktree and chat archive.
  Executor cannot update registry, archive itself or broaden scope.


# /Users/seanschoi/Projects/sphmrs/docs/reference/backlog-execution-plan.md

## T005-B — same-claimant valid-bearer result recovery

Assignment `SPH-T005-B-20261111-01` implements only recovery of an already
completed claim by its same canonical account while the original bearer and
existing expiry/cutoff/eligibility/hold gates are still valid. Existing same-event
occupancy and immutable admission identity are authoritative; no second grant,
transfer, reissue, expiry override or new retention policy. T001/T005 source
dependencies are in main `3c853b0e670abde45f591f2f86d09dbbf4472983`.

**Criteria:** (1) RED then GREEN: lost-success replay by the same eligible claimant
returns the original admission with zero writes/new grants/counters/benefits; exact
claimed account, event/account key and admission linkage must agree under existing
locks. (2) Foreign claimants and invalid/revoked/expired/cutoff/held/ineligible or
inconsistent states keep private typed/fail-closed outcomes; no bypass of existing
gates or native transaction proof, no non-claim behavior change. (3) domain + HTTP
replay/race/fault regressions, guarded scoped checks/typecheck and required code,
TypeScript/security and fresh dual Santa reviews pass against exact candidate; no
UI/provider/DB/live acceptance claimed. Genuine unresolved precedence/policy stops
that branch rather than guessing; broadened recovery after expiry is out of scope.

**Ownership:** isolated executor owns `src/lib/commerce/guests.ts`, existing
`tests/commerce/domain/claim-outcomes.test.ts`, `claim-http.test.ts`, new
`claim-recovery.test.ts`, and its own `docs/qa/t005-b-20261111/` evidence (not
custodian baseline/dispatch). Other source/catalogues/transaction wrapper and
canonical registry/plan are read-only. Runtime dependency reuse may reference
existing installed packages read-only only after verifying isolated writable
outputs/caches; no installation. New helper/package/endpoint not presumed needed.

<a id="step-10"></a>
**Generative route:** /orch-fix-defect (not executed by the router).

```text
/orch-fix-defect "[Plan: docs/reference/backlog-execution-plan.md#step-10] Recover a lost successful claim receipt only for its same eligible account and still-valid original bearer. Acceptance: RED/GREEN proves original admission returned with zero grant writes; foreign, expired, revoked, held and inconsistent states remain private/fail-closed; scoped regressions and independent reviews pass. Out of scope: unresolved policy and separately gated external actions."
```

