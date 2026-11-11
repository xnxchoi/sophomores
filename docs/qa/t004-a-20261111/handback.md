# Handback — SPH-T004-A-20261111-01

**Status: candidate — documentation-only design; custodian acceptance pending.**
Candidate 1 passed both fresh independent Santa design reviewers in one round,
zero semantic fix cycles. No implementation or whole-parent completion. Executor
stops at this handback; registry/plan/learning/archive remain custodian-owned.

## Exact reviewed identity

- Checkout: `/Users/seanschoi/Projects/sphmrs`; HEAD
  `be96a3b8228a1edf166f6f307af2402c3a1f3c22`. No worktree/commit/push.
- [Candidate manifest](candidate-1-manifest.json) SHA256:
  `72e55c9edc8a4d0c8562b587296e00aec004bfbed865d909a1c5f9e26febfb9c`.
- Design SHA256: `5699dcd4be08b12b7aa0d661bbc8ab2cedccde166e85c14f4ce153bba26052cc`.
- Source-map SHA256: `a18ea3be1562c759eea77a5a29266421dd7b086ee63c6d71744f5165f13e7628`.
- Exact six-file candidate-set digest: `9219bd9e3901fdf5bb34e4497b08237294d36a8db8d1e3b3b51473dd7b9ee6a4`.
- Exact 52-file reviewed source-set digest: `51ef592929cd0b3719b9d8be6959f45e26c4c6ee3a5946fe3bdef0b2cbfbdaa5`.
  Every individual candidate/source byte hash and installed package identity is
  recorded in the manifest; these are the reviewed identities, not the HEAD alone.
- Preserved financial capture SHA256:
  `a25d435fb48c655d478b634be9d126db76cf75a3d873f76f4d5925a1142a88b7` (matches custodian baseline).
- Set digests use compact sorted-key JSON of path→whole-file-SHA256 maps. The 44
  anchor hashes normalize inclusive selected lines with LF plus a trailing LF;
  whole-file hashes use original bytes. This addresses reviewer B's reproducibility
  suggestion without changing the frozen candidate.

## Delivered scope and criterion evidence

| Original criterion | Delivered surface | Evidence / qualification |
|---|---|---|
| 1 — precise current source/authority map | [Source map](source-map.md), [44 anchors](source-anchors.json) | Both browser branches, discovery/resume/retire, verified signed dispatch, sole official finalizer, effects and installed native transaction-end gap. Source facts, not durability proof. |
| 2 — separate read / bounded reconcile / explicit payment | [Design §§1–5](reconciliation-design.md) | Front-loaded B01–B16, exact identity/privacy/holds, server accounting/fencing, honest outcomes/stops and browser-independent recovery requirements. No timing/budget/retention/authority chosen. |
| 3 — test-first implementation decomposition | [Design §§6–7](reconciliation-design.md) | I0–I6, three criteria each, affected callers/fault crosswalk/dependency order and owner/DB/runtime/provider/device gates. No tests or implementation run. |
| Governing scope/routing | [Original spec](original-spec.md), [generative route](routing.md) | Original financial capture preserved; commerce plan remains governing, deployment final. Only step 5 routing generated; no command executed. |

Only new design/evidence files under this QA directory were written. Existing
`assignment-baseline.json` and `dispatch.json`, production code, tests, catalogues,
registry, plans and archives were not edited by this executor. Concurrent registry
maintenance was preserved, not reverted.

## Actual checks and independent reviews

- [Pre-review checks](candidate-1-checks.json): PASS before reviews. 44 exact
  anchor ranges/hashes; six candidate files and 52 source files frozen; 1,826
  out-of-scope files compared; protected hashes and financial capture matched.
- [Review A](candidate-1-review-a.json) and [Review B](candidate-1-review-b.json):
  PASS/PASS, all eight rubric criteria. Fresh `fork_turns=none` reviewers received
  the identical original spec/output/rubric and no mutual assessment visibility.
  Architecture/security, actors/actions/disclosure, all callers/branches,
  failure/unknown states, acceptance coverage and safety were explicitly included.
- [Cycle ledger](review-ledger.json): one semantic round, zero semantic fixes;
  maximum three permitted. No redundant specialist reviews added.
- [Final checks](final-checks.json): **PASS_WITH_RECORDED_REGISTRY_DRIFT**.
  Candidate and all technical sources/plans/protected files remain unchanged.
  Whole `docs/To-Do List.md` hash changed concurrently as custody clarified
  execution statuses. Exact assignment contract and financial capture still match
  the reviewed originals. See [drift reconciliation](post-review-scope-reconciliation.json).
  Custodian must reconcile its current registry, not mistake the historical source
  hash for the latest whole-registry hash.

No fabricated RED/GREEN, coverage, live render, payment, provider, device, runtime
or production acceptance. No app/test/build/typecheck, browser, service/container,
DB, network transport, environment/credential inspection, install or hardware
exercise was performed. No public-current API verification was attempted.

### Actual failures/corrections and nonblocking review notes

1. [Initial deterministic FAIL](candidate-1-checks-pre-review-fail.json): relative
   links in verbatim relocated original-spec excerpts were initially checked at
   the QA base. Documented original ownership bases, corrected the checker and
   reran PASS **before reviews**; excerpt bytes/financial brief unchanged.
   [Pre-correction manifest](candidate-1-manifest-pre-review.json) retained.
2. [Final raw hash FAIL](final-checks-drift-fail.json): concurrent whole-registry
   status update, not a candidate/technical-source edit. Relevant original contract
   and financial bytes verified unchanged; retained raw failure and qualified
   reconciliation rather than concealing the mismatch or rewriting owner work.
3. Preparation issues: combined read output truncation/compression was corrected
   with bounded reads; missing project-local router/optional navigation file and
   wrong initial installed-provider path corrected to installed sources; one
   resource-inspection one-liner SyntaxError corrected with a heredoc. No test
   failures were invented from these tooling issues.
4. Review A's nonblocking shorthand clarification: I3's no-auto-release language
   prohibits **new/speculative** release rules, not the existing exact-evidence
   full-cancellation review path already explicitly preserved in design §3.
   Nothing authorizes age/absence-based release or weakens that existing path.
   Review B's anchor serialization clarification is recorded above. The passing
   candidate remains unchanged; suggestions are not new policy or owner acceptance.

## Remaining decisions and smallest acceptance gates

1. **I0 transaction authority first:** approve a bounded remedy/fault-harness slice
   preserving official finalizer ownership. Separate isolated PostgreSQL native
   commit/rollback/ownership/restart/concurrency proof before financial guarantees.
2. Owner-approved request/wait/deadline/backoff/provider-call budgets, cooldown,
   uncertain ownership recovery and signed-risk-event handling. Existing transport
   or plugin settlement-poll numbers are not a new policy.
3. Full fresh account/member readiness and all active callers; same-account draft
   retention versus cross-account isolation. Address/history retention and recovery
   discovery scope remain undecided; no retention defaults added.
4. Durable catch-up invocation/mechanism, authorized operational actor and actual
   escalation/review surface. No queue/service, new staff grant, notification or
   working background progress assumed.
5. Separately authorized current provider/KPN status/paid/failure/reversal/webhook
   delivery and physical mobile/in-app redirect/popup tests. Later UI requires a
   guarded actual desktop/phone render and harsh review; docs do not require a
   fabricated live test. Dependency/readiness/deployment phases stay separately gated.

Custodian next action: verify this candidate/source identity, preserved concurrent
registry update and three design criteria, then decide acceptance/rework. Any
implementation is a new explicitly bounded assignment. T004 remains unimplemented.

## Remaining processes and resources

- No assignment-owned app workload, preview, browser, container or test process;
  no remaining owned workload PIDs and no processes terminated.
- Both read-only reviewer agents completed; no review work pending. Host-managed
  MCP/repl clients may remain attached in the shared CLI. The census cannot safely
  attribute other chats' clients; no unverified idle duplicates or user apps killed.
- [Before](resources-before-review.json), [during](resources-during-review.json),
  [final](resources-final.json) full CLI-descendant audits retained. Machine RAM is
  48 GiB. Final shared CLI descendant RSS was 11.177 GiB,
  not an assignment allocation/native-footprint quota. Final reclaimable-page
  estimate 22.124 GiB; read-only memory-pressure
  query reported 74% free. No heavy workload started or resource stop bypassed.
  These samples are qualified observations, not kernel-enforced headroom guarantees.

No callback/wake, external message-back, learning or self-archive was performed.
