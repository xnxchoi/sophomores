# Wallet Activation: Coordination And Review Ledger

Updated: 2026-11-17. Review checkpoint: **not accepted**.

This is the coordinator's working ledger in `undine`, not a replacement for
the owner plan or a new decision catalogue. Update this file in place. The sole
writer of `docs/qa/auth-payment-nfc/consolidation.md` receives scoped sync requests;
the coordinator does not edit another session's checkout.

## Revision And Custody

| Surface | Observed state | What it establishes |
| --- | --- | --- |
| Run | `run_f7d117af78fa`, resumed by coordinator terminal `term_d6135a5f-d121-49e3-9433-c97f0a0088a8` | Existing assignments retained; actual wake and worker acknowledgment received |
| Fix checkout | `wallet-r4-blocker-audit`, checkpoint `1423ba57` plus reviewed four-file race delta | Both checkpoint and delta remain FAIL/not accepted; see current checkpoint below |
| Reviewer checkout | `wallet-independent-review`, detached `c205cd08`, no tracked edits observed | Independent, read-only baseline review |
| Owner checkout | `wallet-activation-20261116`, `cf1aa812`, pre-existing modified `.gitignore` | Owner candidate only; untouched by coordinator |
| Delta | Six commits, `c205cd08..cf1aa812` | Welcome round-7 UI, motion, copy, tests and evidence; package/lock manifests unchanged |

Follow-ups reuse the existing agents. Fix dispatch `ctx_bf515f9fd6f2` completed
with a frozen patch; actual independent review dispatch `ctx_be0bf9c945af`
reported **FAIL** on that artifact. Original fix agent now acknowledges race
repair dispatch `ctx_313e6eacfcb9`; no replacement or duplicate was launched.

Earlier custodian requests to `run:run_2b9ca801758e` have no observed
acknowledgment; the old terminal is gone. The owner's latest instruction assigns
main coordination to this session, subject to a fresh one-writer check before
writing there. Canonical owner-plan synchronization remains pending.

## Current Checkpoint: 21:00 UTC, November 16

- Same independent reviewer `ctx_016b5324b8c3` verified frozen four-file delta
  SHA-256 `eab1194ba35c4f80bfce0abc3edc5e78d78d6fdf1ca31b0c7805f146758fd658`
  atop `1423ba57826aa3e2e74f82a2afe2f65c3bd7a92b`, and combined diff versus
  `c205cd08`, SHA-256
  `d2aab00f2801c9934d2bfb50a29f4883f5877c3b76f0c3df04ccf7be97d3a976`.
  Verdict **FAIL**: previous stale-status publication and committed-replacement
  races are addressed, but welcome mutates generation and latest-check refs in
  render. An abandoned concurrent render can invalidate still-committed actions,
  suppress their finally/timer, and strand busy state. Coordinator inspected the
  actual writes in `welcome.tsx` and confirms this source-traced risk; it is not
  claimed as a reproduced runtime failure.
- Raw final log `/tmp/wallet-r4-races-final.log.w5kggi3q.log` independently reads
  153/153 with no skips. Reviewer inspected RED (56/64, eight intended failures),
  intermediate GREEN (61/64), and final guard receipts: exit 0, peak 486391808
  bytes, four processes, no remaining PIDs or uncertain cleanup. The final green
  suite lacks the abandoned-transition case; test count is not acceptance.
- Original fixer follow-up `ctx_79016de2f337` actually acknowledged preserving
  the reviewed four-file failed pass as a separate commit, then suspended-render
  RED/GREEN and minimal commit-phase ref publication. No duplicate fixer or
  reviewer; no new endpoint/schema/count inference or presentation override.
- Hamlet's existing owner `ctx_6a599957c0db` acknowledged concrete D1 slice 3
  sizes/radius/gutter implementation at `3d2338e`, with tests first. Colors,
  fonts and cursor remain unchanged; h5/h6 defaults are NON-HUMAN-REVIEWED.
  Hamlet has the first scheduled preview slot, not a claim that preview is live.
- Dedicated auth owner completed its initial read-only audit. Verified refs:
  main `9ae2d35b`, auth `2e8708ed`, unique counts 22/112, 18 overlap paths.
  Earlier coordinator `c8c*` baselines/counts were erroneous, not unexpected
  concurrent writes. Preserve auth history and `.tmp`; never whole-merge the
  pre-rewrite histories. Concrete per-hunk foundation/round-7 manifest and
  installed dependency-lock provenance are next; source/ref changes remain held.
- Physical RAM is **48 GiB**, not the earlier dispatched 64 GiB. Require fresh
  headroom/aggregate checks before workloads; serialize heavy checks and preview.
  Shutdown limits remain 22:35 UTC heavy-start cutoff and 23:00 UTC wind-down.

The sections below preserve prior-pass evidence; they do not supersede this
current verdict. Integration, final-candidate typecheck/default-suite/coverage,
disposable DB proof and actual browser/Santa review remain pending. Local guarded
testing/preview and per-pass commits are now explicitly requested; installs,
providers, push, deployment, credentials and destructive cleanup are not.

## Decision Authority

**Owner guard (2026-11-17): all decisions made by sessions from this point are
non-human-reviewed.** Formally review conflicts rather than stopping the whole
workstream. An earlier explicitly owner-approved decision wins over a new
session proposal. Where the existing approach was not a decision item and has
little owner discussion, weigh it equally against the proposal; inspect related
surfaces/components together and compare change footprint. More required change
is a warning heuristic, not proof of a wrong choice. Mark unresolved cases
**NEEDS OWNER REVIEW (priority)** and defer that choice while unaffected work
continues. Do not perform a destructive override during review. Reviewer
consensus, passing checks and commits are not human acceptance; historical ADRs
retain their own status.

| Decision | Authority | Review consequence |
| --- | --- | --- |
| Custody-controlled Safe at payment; ordinary optional sign-in passkeys; independent welcome page | [ADR-0013](../../adr/0013-wallet-we-control-created-at-payment.md), accepted owner decision, 2026-11-16 | Do not restore passkeys as wallet owners or add activation before the Signet |
| Settle-time grant outbox | [ADR-0004](../../adr/0004-key-grant-outbox-at-settle.md) | Preserve transaction, locking and replay invariants |
| Signer custody and library boundaries | [ADR-0008](../../adr/0008-signer-custody-and-libraries.md) | Source review does not establish deployed signer/provider acceptance |
| Signet lock constraints | [ADR-0011](../../adr/0011-signet-members-lock.md) | Preserve recipient and grant constraints; do not reopen owner decisions |
| Verified email without phone may use welcome/passkey registration; checkout and `/link-social` keep phone gate | Current owner assignment, with ADR-0013's independent welcome contract | Test each gate separately; no broader authentication redesign |

Implementation constraint for the current repair: an aggregate count is not
operation-bound proof. Prefer exact credential/account evidence through existing
APIs; otherwise preserve an unknown outcome. This is a review constraint, not a
new owner-approved server contract. Do not add an endpoint, receipt store, schema
or public identity field without a separately reviewed proposal.

If that architectural contract becomes necessary, prepare a short ADR draft with
context, alternatives, consequences and risks. Present it for owner approval
before writing or numbering a new file under `docs/adr/`. Coordinate numbering
with the custodian; do not duplicate accepted decisions or assume the local ADR
index is the newest project-wide state.

## Findings And Actions

| Priority | Finding | Evidence and action |
| --- | --- | --- |
| High | Aggregate counts can misattribute a lost registration response | At `cf1aa812`, `src/lib/member-auth/client.ts:409` still compares current count with the saved baseline. Another-device addition or delete/add can invalidate attribution. Existing fix worker must add adversarial tests and use operation-bound evidence or retain unknown. |
| High | Pending ceremony can survive account transitions | Baseline `src/components/Authentication/member-auth/_shared/session.ts` retains pending state across sign-out/status replacement. Welcome calls the same reconciliation client. Clear obsolete state and prevent late results from being applied to another account; test actual switch and in-flight races. |
| Medium | Browser regression expects the removed phone gate | Baseline `tests/browser/member-auth-passkey.spec.mjs:146` expects 403 after verified-email/no-phone setup. Update registration expectation while keeping checkout and social-link gates. Source correction is not a browser execution receipt. |
| Gate | Candidate differs from reviewed baseline | Review `c205cd08..cf1aa812` separately, then review the frozen final fix patch. No claim that baseline review accepts round 7. |

The first fix handback is not a clean bill of health: its tests did not cover all
three independent findings. The existing worker is addressing those gaps, not
starting a competing implementation. The reviewer must not inspect a moving
patch as if it were a frozen final artifact.

## Deferred Priority Owner Review: Round-7 Presentation

Independent delta review covered all 34 `render-r7` stills and four frame strips.
Coordinator source checks confirm the following concerns; they are not automatic
permission to undo the documented round-7 treatment.

| Item | Existing rationale and affected surfaces | Recommendation (non-human-reviewed) |
| --- | --- | --- |
| Idle unknown outcome reads `Checking...` between requests | At `cf1aa812`, `welcome.tsx:456` chooses this text while a timer is scheduled, not only while a check is running. The handback at line 215 calls this coordinator-restored binding copy, not independently verified human approval. Welcome status, request timing, Check again and account-tray consistency must be considered together. | NEEDS OWNER REVIEW (priority): keep active checking text for actual requests and use existing neutral uncertainty text between requests; prefer a local state-selection change over new catalogues or workflow. Preserve the current treatment until reviewed. |
| Server-rendered welcome content starts invisible | At `cf1aa812`, `welcome.tsx:78` defines hidden opacity and line 483 applies the hidden initial variant. The handback at line 74 documents the hydration trade-off, but is not itself explicit human approval. All welcome states, navigation, passkey actions, initial animation, slow/failed hydration and no-JS behavior are affected together. | NEEDS OWNER REVIEW (priority): prefer visible server content with the approved full-motion entrance enhanced after hydration; assess the smallest local/library-supported change rather than redesigning the page. No new reduced-motion path is proposed. |

These are presentation trade-offs, separate from the three passkey repair
blockers. Defer the disputed changes, not the independent fix/review work. A
static inline transform-origin style at `welcome.tsx:179` is also a low-severity
Tailwind-only compliance issue; no broad styling migration is justified.

## Evidence And Limits

- Inspected focused test log: `/tmp/wallet-r4-ownerdeps-final.log.5o4hvvx5.log`,
  117 tests passed, zero failed; adjacent metrics report exit 0, maximum accounted
  workload 487800832 bytes, four processes, no remaining PIDs and no uncertain
  cleanup. This proves that command's execution, not sufficiency of its assertions.
- Follow-up frozen artifact: `/tmp/wallet-r4-followup-e2afdebace5131fa.patch`,
  base `c205cd08`, 15 paths, SHA-256
  `e2afdebace5131fa3d12a0dc473dcf0aaa3311642fa4120a7c6a1590fb4728bb`.
  Coordinator verified both the frozen bytes and current worker `git diff
  --binary` produce that hash. No source commit or acceptance yet.
- Follow-up log `/tmp/wallet-r4-followup-final.log.3_8nm19a.log` independently
  reads 145/145 passing, no skips; metrics show exit 0, peak 518930432 bytes,
  four processes, no remaining PIDs or uncertain cleanup. Tests still use the
  disclosed borrowed dependencies. Retained Korean values are unchanged and
  literal EN/KO structure/order matches; obsolete keys are removed symmetrically.
- Source review confirms aggregate outcome inference is removed, opaque session
  identity uses the existing Better Auth `getSession` API without cookie cache,
  and the browser no-phone expectation is corrected. Independent review must
  still assess recovery usefulness, session races and the conservative unknown
  contract; no count-based success/failure inference may be restored to unblock
  a workflow.
- Read-only `git apply --check` against owner `cf1aa812` fails in six files:
  both catalogues, session state, welcome, account SSR tests and welcome DOM
  tests. This is a reconciliation gate, not permission to overwrite round 7.
  The other checkout and its `.gitignore` remain untouched. The custodian needs
  a reviewed adaptation/manifest; this baseline patch is not directly applicable.
- The command uses the fix checkout's tests/source and an external temporary
  dependency resolver, borrowing the existing owner `node_modules` read-only.
  The loader retries unresolved package imports against the owner's package root.
  No install was authorized. Unchanged manifests do not alone prove every installed
  package's lockfile parity; require version/provenance disclosure in the handback.
- Earlier failures remain part of the loop: intended RED failures; dependency
  resolution failures; missing CSS-module hook; one incorrect accessible-name
  query; missing `viem` in the first borrowed dependency tree. The final green run
  does not erase those limitations or the independent findings.
- First handback artifact `/tmp/wallet-r4-blocker-audit.patch` is a mutable
  temporary path, not a durable identity. Its earlier draft hash was not verified
  against the current file and is withdrawn. Require a content-addressed frozen
  artifact with a verified hash for the next review; do not cite this path as the
  final reviewed fix.
- Baseline review reported settlement/locking, offline Safe prediction and
  passkey-as-owner removal without a new demonstrated code blocker. Disposable
  PostgreSQL transaction/replay proof remains unverified in this coordination run.
- Supplied PNGs/frame sequences are historical render evidence, not a new live
  browser inspection. No live browser, physical WebAuthn, provider or production
  acceptance is claimed. Later owner instructions request guarded local browser
  QA; fixture/provider isolation and shared preview ownership must be verified
  before a start. No production database or provider access is authorized.
- Whole-final-candidate typecheck, default suite and required DB/live gates are
  still pending. The focused 117-test run is neither those gates nor 80% coverage.

## Frozen Patch Review: e2afdeb Pass Is FAIL

The independent reviewer confirmed the full frozen hash and the 145-test receipt.
Aggregate-count attribution and the browser gate assertion are resolved in this
patch, not yet in the owner candidate. Account isolation is only partially fixed:

1. `session.ts:154` reads account A status before `passkeySession()` detects B or
   anonymous at line 157. It clears pending state but returns A's status; refresh
   can publish that stale membership/phone state. Reject the detected mismatch
   through the existing session-changed path, clear stale status, and test the
   deferred response across an account switch.
2. Welcome replaces its authoritative view and clears pending at line 142, but an
   older add/check promise can later restore the previous account's state. Use
   component-owned action freshness, invalidated when authoritative props change;
   discard obsolete success, error and finally updates. Test deferred add/check
   completion across rerender, including an unavailable identity read.
3. Welcome line 52 still claims the first timer fires when registration can no
   longer commit. Remove that unsupported claim; the timer is a recheck schedule,
   not a settlement deadline.

These are source-traced findings; neither coordinator nor reviewer executed the
race in this pass. Worker RED/GREEN tests must supply that evidence. The initial
145 tests did not exercise these interleavings. The conservative unknown result
is retained: without operation-bound proof, a session check cannot certify the
lost registration or its absence. No new receipt endpoint or unsafe count
inference is authorized.

Per the owner's per-review-pass commit instruction, the fix worker must first
checkpoint the exact reviewed patch with explicit FAIL/non-human-reviewed/not
accepted labeling, then repair only these races. A failed checkpoint commit
preserves evidence; it is not permission to integrate or a new human decision.

## Next Checkpoint And Efficiency

1. Observe follow-up acknowledgments through Orca wakes; do not poll mail or retry
   an unknown start. Preserve reviewer independence and the original workspaces.
2. Collect a frozen patch, SHA-256, exact changed paths, RED/GREEN commands,
   resource receipts and limitations from the fix worker. Check source and
   dependency provenance before accepting test claims.
3. Give that immutable artifact to the same independent reviewer. Reconcile its
   findings with the owner delta; send a precise integration manifest to the
   custodian, without editing or merging the owner checkout.
4. Escalate only genuine unresolved owner choices. Later owner instructions
   authorize per-pass commits, local test/browser QA and eventual reviewed
   integration to main. They do not authorize installs, provider calls, pushes,
   deployment, credentials or destructive cleanup.

Use changed-surface review, concise reports and one ledger rather than repeated
full-tree summaries, duplicate workers, broad reruns or parallel heavy workloads.
Recheck revision/custody before any write. Recheck actual physical headroom before
guarded checks; receipts for one process group do not prove whole-session memory
compliance. Preserve at least 10 GiB system headroom and the stricter workload
limits. No exact token or cost total is available from these CLI receipts; do not
invent one.

## Autonomous Window And Pass Commits

Owner instruction at approximately 2026-11-17 04:47 KST authorizes autonomous
continuation and a commit per finished review pass. A failed review can be
recorded as a failed checkpoint; a commit never changes its acceptance status.
Commit only explicitly owned paths in the owning checkout. The custodian remains
the only writer of `main` and the consolidation plan; current custody must be
rechecked before writing. The later owner request authorizes reviewed integration
to main, not a blind merge. Pushes, provider calls, installations, deployments
and destructive operations remain gated.

Stop starting heavy work by 07:35 KST (22:35 UTC on Nov 16); wind down by 08:00
KST, ahead of the approximately 08:10 KST shutdown window. Recheck time on each
wake. Preserve partial work and report remaining gates rather than racing shutdown.

The requested refactor-clean pass is diff-scoped: `knip`, `depcheck` and
`ts-prune` are not installed in the coordinator checkout; no download is allowed.
Use static reference checks and avoid deleting anything without the skill's
baseline/recheck evidence. No broad source cleanup is justified by a docs pass.
Skip uncertain or decision-conflicting cleanup. Never use destructive checkout,
reset or clean commands to roll back another session's or the owner's work.
