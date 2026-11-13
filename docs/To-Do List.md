# To-Do List

**Handoff compaction · 2026-11-12.**
This registry owns the single active progress/ownership panel. The [execution
plan](reference/backlog-execution-plan.md) owns slice contracts and routes; the
[commerce launch plan](reference/commerce-launch-plan.md) remains governing.
Deployment is its final milestone, not a shortcut around unfinished functionality.
[Verbatim originals and hashes](archive/handoff-20261112/README.md) preserve the
full captures, owner decisions, failed reviews and prior checkpoints.

## Purpose and maintenance mandate

Keep stable IDs and unfinished requirements; clarify consequential ambiguity before
implementation. “Owner” means the user directing this project; on 2026-11-12 the
owner delegated custody of the whole codebase, including all branches and worktrees,
to the custodian. Custodian alone accepts, integrates and changes official assignment
state; executors return candidates, never successor takeover or parent completion.
Current custodian: Claude Code in Orca terminal `term_657cd5a3-8919-49a4-a057-e124be9e626e`,
bound to Run `run_ac424ae06af8`, checkout
`/Users/seanschoi/.codex/worktrees/main-history-integration/sphmrs` (`main`). Former
custodian terminal `term_50862586-31e0-4a84-a0da-8c9a99a5f6e2` no longer resolves.
Earlier references to “this chat” mean historical custodian
`01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1`.

Markers: `( )` implementation unstarted (research/design may be complete), `(△)`
partial implementation, `(✓)` implemented with evidence and remaining gates stated.
No parent below is complete. Planning, local checks, actual runtime and provider/
production acceptance are separate. Attention order is not execution authority:
unfinished implementation first, then owner priority/dependencies. Owner-stated:
T001 is explicitly high priority (P1), and T002 is the owner-authorized focus. Every other
P1/P2 label is an agent proposal; per-task bases are in the [original index](archive/handoff-20261112/to-do-list.original.md#task-index--attention-order-not-execution-authorization).

## Current maintenance checkpoint

**Owner resumed feature dispatch on 2026-11-12; the earlier pause/hold is cleared.**
New assignments still follow the execution policy below. Provider/DB/RPC/email
actions, credentials/permissions, dependency installs, paid jobs, production access,
backups/restores, image/readiness/cutover and deployment keep separate approvals.
Scheduling/cadence/enabled state is untouched; no watcher or between-turn guarantee.
Baseline source/delivery checkpoint is `701b1b86a01833c77e4bb10777cc2b3b6e0f84a8`;
frozen dispatch `1c779316ceb83d958f350f07cd0602f2fafc923f` adds administrative docs,
not implementation. Later administrative main commits record handoff custody and,
at `6dc19d1`, adopt the owner's 2026-11-11 admission/account amendment and
[supplement](reference/ticket-account-planning-20261110.md) from the `944f` worktree.
Never move main behind its checked-out tree. The canonical
`/Users/seanschoi/Projects/sphmrs` checkout is preserved on
`codex/main-checkout-preserved-20261112T005312Z`, not main.

**Owner rule, 2026-11-13: Payload-native DB only.** "if it's used by PayloadCMS, don't directly touch- changing database tables, adding/deleting entries, adding new tables- the db without trying every single workaround or temp fix to get it working via payload native methods." **Owner clarification, same day:** the rule covers operational work, meaning "tweak this quickly" changes. Schema-level work and stable, consistent hooks are fine. It is codified in AGENTS.md and the shared rules. The earlier custodian over-application to the I0DB test fixtures and to the Unlock schema is withdrawn.

**Owner pause, 2026-11-13 — lifted the same day.** The owner resumed work ("Continue"). The paused passes are retried, and the T004 I0DB/I1 assignments may now be dispatched as resources allow.

| Item | Actual phase / bounded evidence | Next actor and supported action |
|---|---|---|
| SPH-HANDOFF-DOCS-20261112-01 | **Integrated** at main `ad1db35` (candidate `914ce48`). Original candidate: Task `task_edd3a20a19f5` / Dispatch `ctx_8ac6e991861e`, released. Follow-up Task `task_54c299b1add3` / Dispatch `ctx_153f28be1f47` exited during the owner pause with no changes; its Orca release is `release_unknown`, with no live process. The custodian applied the rework. Review: cycle 1 FAIL/FAIL, cycle 2 FAIL (HIGH)/FAIL, cycle 3 PASS/PASS. See the [ledger](qa/handoff-prep-20261112/docs-rework-custodian.md) and [custody](qa/handoff-prep-20261112/dispatch.md) | `learning_pending`. Cycle-3 LOW wording follow-ups were accepted and integrated at main `e611abc` (SPH-DOCS-LOW-20261112-01; review cycle 2 PASS/PASS, [record](qa/batch-20261112/dispatch.md)). Retain the worktree until learning and evidence custody close. |
| SPH-HANDOFF-TESTS-20261112-01 | Audit (Task `task_6d2a53643686` / Dispatch `ctx_081d84445c42`, released; [intake](qa/handoff-prep-20261112/tests-intake.md), [custody](qa/handoff-prep-20261112/dispatch.md)) found no SAFE cleanup. The owner-approved [re-scoped baseline](qa/handoff-prep-20261112/tests-baseline-20261112/README.md) gave 2,587 pass / 5 fail / 39 skipped. Three failures came from the untracked `sophomores-tailwind-v4.css`; SPH-BRANDTOKENS-20261112-01 fixed that at main `e7e8fdd` (dual PASS). The combined default suite on integrated main `ad1db35` gives **2,590 pass / 2 fail (owner-deferred styling only) / 39 skipped**; the functional gate is green, with no DB/provider env | Closed audit-only: no test or artifact is safely deletable. The large DOM suites stay. Retain raw audit evidence in its worktree until custody closes. |
| T005 `(△)` | A backend outcome contract locally accepted; G1 and B delivered (identities below). C design (outcome matrix) accepted 2026-11-12: 3 narrowly ready / 10 held. Owner widened S1 to the whole invitation page on 2026-11-12 (decisions in T005 below). UI/holds/full acceptance remain | **Waits on T002** (owner, 2026-11-13): the T002 reframe invalidates the invitation framing, so the S1 copy is redrafted after the token model settles. The draft spec is held at `qa/invitation-s1-20261112/spec.md` ([matrix](qa/t005-c-20261112/outcome-matrix.md)). |
| I18N mirror | **Integrated** at main `48a256d` (candidate `15710d4`): `ko.json` mirrors `en.json` (1,202 keys, the 175 existing values preserved, 1,027 `""`), and an empty Korean string shows English. The owner activated the breakpoint on 2026-11-13. Review: specialist PASS, Santa FAIL/FAIL → PASS/FAIL → PASS/PASS. Live render: synthetic loopback preview only ([custody](qa/ko-mirror-20261113/dispatch.md)) | Every English key change carries the matching `ko.json` structural change in the same commit (AGENTS.md, shared rules). `learning_pending`. |
| T013 `( )` | New 2026-11-12. Invitation journey UX review; not started | Custodian scopes a live screen-by-screen review against T001/T010 decisions after S1. |
| T001 `(△)` | Owner-stated P1. A settlement self-occupancy locally accepted; activation/display and real acceptance open | Scope same-unit activation/continuation with T010/T003; no token prerequisite for allocation. |
| T009 `(△)` | A own-ID read/sync locally accepted after candidate 2; full member/readiness journey and retention open | Review whole-gate actor/action/retention matrix; owner decides persistence before implementation. |
| T002 `(△)` | **Owner priority from 2026-11-13.** T002-A reframed token model and local P2a/P2b contract **integrated** at main `16a07eb` (candidate `5c3f459`; 3 review cycles plus an owner-authorized narrow fix 4; the final round was Santa PASS/PASS and specialist PASS) ([model](qa/t002-a-20261113/model.md), [custody](qa/t002-a-20261113/dispatch.md)). Design only: no source, schema or provider work | P2a kernel **integrated** at main `13a29ee` (cycle 3 PASS/PASS/PASS; single launch token type; provider-free). Unlock auth/shape investigations in review. Custodian: next production wiring + type dimension; formerly: dispatch P2a (provider-free allocation, activation and attendance kernel) from the model. The owner answers the plain-language questions in the model's owner section before production wiring. Probe A is not approved. |
| T004 `(△)` | A design accepted. **I0 integrated** at main `32ccc27` (2026-11-12): native payment completion/ownership, provider-free and synthetic only. I1–I6 unstarted | Owner: approve the real-PostgreSQL fault/concurrency/restart proof for I0 before any durability claim; then scope I1+ from the [design](qa/t004-a-20261111/reconciliation-design.md). |
| T006 `( )` | Investigation complete; correction authority/transfer policy unresolved | Owner reviews actor-by-state correction versus reassignment matrix before engineering. |
| T007 `( )` | Bound-phone/same-account decisions recorded; correspondence and grant not implemented | Scope recovery case/correspondence/proof/grant design; copy remains with calibration owner. |
| T010 `( )` | A server-owned intent proposal independently reviewed, not storage/resumability approval | Review account/callback/lifecycle/transport boundaries; coordinate T001/T005/T009/T003. |
| T003 `( )` | Purchase/claim interaction direction recorded; implementation unassigned | Consume ready allocation/outcome/identity/payment contracts; real UI review remains mandatory. |
| T011 `( )` | KOCOPY-20261111 final editorial dual PASS/security/document checks reported; no final Korean owner/source/live acceptance | Copy owner and custodian triage F01–F59 to existing system owners; Korean unchanged. |
| T012 `( )` | ENCOPY-20261111 audit and separate safe copy passes delivered; held states remain | Custodian routes 30 issue groups/86 held keys and concurrent-owner candidates; contracts before final copy/live acceptance. |

**Delivery already achieved, not a current blocker:** G1 candidate
`92cfe64cb2798791254c2dccfcad9c798680b2e4` → integration
`df32b881c88da488e4bf3bfe89e8ec3f7bacb5d2`; B candidate
`a0519d77d6b76acc04cc8a8a8c3597015d98074e` → integration
`6732a171afecaed11c08a5628ffb9e1cb160cbba`; S1 credential candidate
`9b31da64628f5f0b3e2039725af9fdffcd19ba86` → integration
`61265b8a9d7e6b76a4bd708d11f95dc0c9c64cf5` plus private-visibility correction
`fb4ca49e74f33ed5f22e62de24405defd5de3956`. All are ancestors of the source
checkpoint. Recorded ordinary push and independent remote verification succeeded at
`fb4ca49`; initial preparation source/main/remote checkpoint was `701b1b8` per
owner contract. These dated observations are not a claim about the current remote;
verify remote ancestry before any push.

Retain [G1 acceptance](qa/t005-g1-20261111/custodian-acceptance-1.json),
[B acceptance](qa/t005-b-20261111/custodian-acceptance-20261112.json) and
[S1 acceptance](qa/delivery-s1-20261111/custodian-acceptance-20261112.json).
Final delivery records report round3/3 PASS/PASS, 405/405 combined regressions,
3/3 reading-route tests, scoped strict types and lint. Round2 private-visibility
FAIL is preserved, corrected by `fb4ca49`, not erased. Most of
`docs/qa/resume-20261112/final-delivery/` is tracked (24 files). Six entries remain
untracked and exist only in the original checkout
`/Users/seanschoi/Projects/sphmrs/docs/qa/resume-20261112/final-delivery/`
(preservation branch): `prepush-final.json`, `privacy-candidate/`,
`privacy-stage-admission.json`, `privacy-validation-stage.json`,
`round3-admission.json` and `round3/`. Only the round3 Santa reports are
duplicated byte-identically, under `docs/qa/history-reconciliation-20261111/delivery-round3/`
in the main checkout. That directory's `privacy-validation-stage.json` is a
different file. Do not retire the original checkout before consolidating them; see
[historical handback limitations](qa/handoff-prep-20261112/docs-handback.md), whose two-entry list is superseded by the six-entry list above.
Do not infer full-project build/typecheck/coverage, real DB/provider/hydration,
live Next404, PG or deployment acceptance. Delivery is separate from remaining
learning/evidence consolidation and recoverable worktree/chat `archive_pending`.
Earlier start-unknown/running and G1/B integration/push holds are historical, not
current owners. Preserve original untracked QA and S1 evidence until safe archival.

## Active execution policy — owner instruction 2026-11-11

Assignment contracts bind their executors only. The 2026-11-12 handoff-preparation
[plan](qa/handoff-prep-20261112/plan.md), [DOCS](qa/handoff-prep-20261112/docs-spec.md)
and [TESTS](qa/handoff-prep-20261112/tests-spec.md) contracts barred those executors
from nested reviewers, app checks, installs, services, commits and pushes. They are
not standing prohibitions on custodian semantic review, scoped administrative
commits, acceptance, integration or gated delivery, nor on later properly authorized
assignments. No contract grants blanket provider or deployment permission.

Standing orchestration policy: one execution owner per bounded task,
fresh managed worktree and unique `codex/…` branch, exact base/dependencies/owned
paths/dirty provenance recorded before launch. Custodian coordinates, does not
silently take production ownership. No whole-tree dirty-source copying, broad
staging, reset/stash/clean or overwriting others. Across worktrees coordinate
shared contracts and integration order; isolation is not semantic independence.

TDD and deterministic checks precede required specialist and two fresh independent
Santa reviews of the same frozen spec/output/rubric, neither seeing the other;
both pass, maximum three fix/review cycles. UI additionally needs actual local
render/harsh review. Use adequate existing evidence, not expensive unchanged reruns.
Stopped plan-canvas sessions stay stopped. One guarded app workload per checkout, ≥10 GiB actual system headroom and ≤15 GiB
aggregate agent/tools/reviewers/browser usage; audit descendants, isolate mutable
outputs and stop only verified owned idle workloads. Existing dependencies only;
never bypass a resource stop or copy credentials/environments.

Lifecycle: ready → dispatching → running → candidate → review → accepted →
integration_pending → integrated → learning_pending → archive_pending → closed,
with explicit blocked/rework/interrupted branches. Submission is not acceptance.
After acceptance, custodian serializes safe local integration, checks current main
and the combined result, reruns affected gates after changes and preserves owner
WIP. Custodian holds scoped local commit/merge and gated ordinary-push authority;
executors commit only when their contract says so. Maintenance docs stay separate from source.
Before any later authorized push verify exact remote/ancestry/outgoing history,
privacy, branch rules and CI/deployment/cost effects; no force-push or implicit
publication. Preserve exact blockers without reviving resolved divergence.

Persist evidence/learning before recoverable supported worktree/chat retirement;
verify main reachability, combined checks, no unresolved work/workloads and safe
preservation of ignored evidence. Executor never completes parents or archives
itself. No new global memory, hooks, observers or scheduling changes.

## Event-first terminal reporting — owner authorization 2026-11-11

Orca executors report only through their supplied Task/Dispatch `worker_done`;
questions use `ask` to their coordinator. Persist the handback first and include exact
identity/status/evidence, next actor and owned resources. No polling or ack loop.
Historical native reporting to custodian thread
`01a1c5e4-2b9f-7fe2-aa5e-c9df4688edf1` was approved for those assignments only.
While active, supported waits/direct reports are event-first; heartbeat is recovery,
not a guaranteed hard-crash subscription. Receiver deduplicates event keys before
side effects; transport delivery alone proves neither execution nor processing.

## Concurrent intake and task IDs

The custodian validates new IDs against the latest registry before accepting them.
IDs submitted concurrently are provisional until uniqueness is checked; preserve
all task content and source provenance when repairing a collision. Do not delete
or merge distinct tasks merely because contributors used the same number.

T006 remains guest-name corrections. Concurrent recovery T006 became T007;
gift T006/temporary T008 became confirmed T010; checkout T006 became T009.
T008 is retired, not reusable. Interpret older references by title/provenance;
no distinct scopes were merged. Stable task IDs and original incoming headings
remain in the verbatim capture. [Split/merge, orchestration and external-model proposals](archive/handoff-20261112/to-do-list.original.md#splitmerge-and-orchestration-proposals--owner-review) remain
owner decisions, not permission or verified model availability; no new ADR system.

## Active and unstarted tasks

### T005 — Known outcomes, error clarity and review correction

**Contract:** preserve authoritative causes through domain/transaction → HTTP →
next-intl UI; distinguish verified expiry, invalid/rotated bearer, foreign consumed
state, own completed claim, existing event binding, eligibility/auth/security,
cooldown and genuinely unknown receipts. A 403 is not proof of expiry/missing phone;
missing/rotated history is not proof of a particular cause. Known rejection requires
proved owned rollback; typed-looking infrastructure errors remain unknown. B now
recovers the original receipt only for its same eligible claimant and still-valid
original bearer, with zero writes; UI/result destinations remain separate work.

**C design (accepted 2026-11-12, design only):** [outcome matrix](qa/t005-c-20261112/outcome-matrix.md),
merged at `11b442e` from `28ee1a1`. Ready: C01 CLAIM_INVALID and C03 CLAIM_CONSUMED (the
latter scoped to bearer + confirmed account identity) as terminal refusals with no
recovery CTA, and C08 acknowledgement mechanics only. The existing success-screen
benefit sentence is a recorded held defect (FRONT-02/T001/T003): it can be false after
B recovery of a checked-in admission. Proposed slice S1 needs owner-approved wording
first; review record and carry-forward LOWs: [batch dispatch](qa/batch-20261112/dispatch.md).

**Owner direction, invitation page (2026-11-12).** This amends the C design's ready set.
State every known server cause plainly, one message per typed code. Parse code and
status together with `guestClaimRejectionSchema`, never status alone. Anything
untyped or unparseable shows the unknown-result message. A remedy is offered only
where a capability exists; otherwise the message states the cause and stops, apart
from the support pointer below. Decisions:

- Customer copy drops "claim", "gift" and "guest package"; code, staff screens and
  this registry keep them. This supersedes the wording quoted in T010.
- C07 unknown result: the owner allows "We couldn't confirm the result. Try again."
  with the button re-enabled. B makes a same-account, same-bearer retry safe. This
  overrides C07's hold for that message only.
- Expired and no-longer-available refusals point to support; the owner supplies the
  channel. Account-not-eligible must not reveal a ban; splitting its three causes is
  separate server work.
- The local missing or malformed link no longer sends the reader to the buyer.
  Remove the loading text. Replace the email-code paragraph with a plain
  keep-this-page-open line. Drop "Registration is optional" without claiming
  registration is required, since name-based admission is still live code (T013).
- The success screen gets a short headline plus a full-width "included" table, which
  fixes the C08 benefit-sentence defect by stating what is included, not what
  remains. The headline is pending owner choice after benchmark research ("accepted"
  was rejected). The destination after success stays held (C06/C09).
- Tab retention of the link is a separate follow-up needing security review.
  Buyer-side link wording is its own small copy change.

For each case establish reader objective, authoritative result, next actor/why,
actual supported action/context, protected fact/threat and tests before copy.
Expiry at event cutoff does not imply a replacement/extension exists. No raw errors,
other claimant identity, automatic reissue/grant/payment/refund/transfer workaround.
Coordinate admission-name/link loss, cart mutation uncertainty, recovery intake and
staff literal-error consumers; T004 owns money, T009 identity and T006 corrections.
Member-auth typed code/rate/phone-conflict outcomes are a counterexample to preserve.
Two earlier copy reviewers accepted unsupported customer guidance; reviewer agreement
and a visible retry button are not usability or owner acceptance. Full case matrix,
failed reviews/source anchors and original investigation remain [verbatim](archive/handoff-20261112/to-do-list.original.md#t005--known-outcomes-error-clarity-and-review-correction).
[Accepted A evidence](qa/t005-claim-contract-20261111.receipts.json) retains two
rejected candidates, native fake-client versus real-DB limits and partial coverage.

### T001 — Tickets and accounts

**Settled:** no minted memberships at launch; no separate member/nonmember customer
journeys. Wallet/physical NFT goals are explicit but not launch dependencies ([archived T001 section](archive/handoff-20261112/to-do-list.original.md#t001--tickets-and-accounts)).
Account, token, event entitlement,
buyer, recipient and attendee are distinct. First paid unit reserves immutable
buyer/event self occupancy if absent; extra/subsequent units are gifts. One account
has one event ticket/package; membership alone gives no seat. Pending gifts are not
fabricated accounts. Required verified gift claim uses bearer possession, not a
buyer-entered name match, and changes no payment/shipping/fulfillment ownership.
A gift consumes buyer allowance, not recipient purchase allowance. Minting cannot
postpone allocation. Physical private activation is a proposal; claim secret is
not a door pass. Finite giveaways are separate configured scope.

A reserves `eventAccountKey` but leaves `claimedAccount` unset; it is not activation,
perk eligibility or usable display. Promote that same unit under swappable
server-owned after-purchase/delivery-gated timing; neither is selected. No second
claim engine or duplicate allocation. Wallet custody, replacement/revocation,
transfer/returns, hardware/delivery recovery remain decisions/proofs, not implicit
refund/account-merge/benefit-reset authority. [A evidence](qa/t001-allocation-20261111.receipts.json)
records local fake-interleaving/coverage limits, not PostgreSQL races or device proof.
Unlock is preferred for serious exploration. Replacing incompatible code is allowed in
principle, but this is not blanket reset or destructive-operation authority. **Completion
evidence:** exact-once paid allocation; one self binding across orders and concurrent
tabs; existing/new recipient claims; physical activation and token recovery without
duplicate grants; guarded regression/coverage; actual device/UI and provider acceptance,
each separately approved. [Full capture](archive/handoff-20261112/to-do-list.original.md#t001--tickets-and-accounts).

#### Purchase/claim overlap — owner item 12B, investigation recorded 2026-11-11

[Original eleven-scenario matrix](archive/handoff-20261112/to-do-list.original.md#purchaseclaim-overlap--owner-item-12b-investigation-recorded-2026-11-11)
retains pre-A source predictions separately from intended rules: gift versus prior
self purchase; membership-only; prior event claim; claim/settlement race; multiple
gifts/claimants; distinct events/orders versus replay; buying for others; lost claim
success (now B); rename/reissue; old no-account check-in/cutoff; held/cancelled/returned
units. Test these against the same event/account authority; rejected invitations
stay unconsumed. Old optional/name-only and placeholder-account captures are
superseded, not current policy. Correction/reassignment remains T006.

### T009 — Checkout identity and system-managed recovery

A distinguishes 401/valid anonymous from forbidden, rate, malformed/body-read
transport and sync failure; 403 alone does not reauthenticate. Same-account mounted
inputs survive; confirmed account change remounts private state. Full account gate,
fresh member readiness, provider startup/no-user/partial sync, response races,
deadlines/budgets/cooldown and case feedback remain open. Same-account read is not
phone proof. System performs safe checks when no customer decision is needed;
a retry control alone does not make recovery the customer's responsibility.

Owner must decide original-account draft restoration after switching back and
reload/new-tab retention/privacy/lifetime before persistence. Never expose another
account's address/attempt, erase financial evidence or silently resume payment.
No automatic codes/charges. [Candidate ledger](qa/t009-identity-20261111.receipts.json)
preserves candidate1 FAIL/PASS, body-stream correction and synthetic-render limits;
100% owned mapped lines/functions and 96.63% V8 ranges are not semantic branch or
whole-checkout 80% coverage (recorded whole checkout 63.41%).
[Full investigation](archive/handoff-20261112/to-do-list.original.md#t009--checkout-identity-and-system-managed-recovery).

### T002 — Unlock Protocol

P1 [blueprint](reference/unlock-integration-blueprint.md) is delivered research,
not owner policy/provider/SDK acceptance; P2–P7 not authorized by delivery. Review
G1 custody, G2 replacement/expiry, G3 transfers/returns, G4 single check-in authority/
availability and G5 device/delivery policy before a smallest separately approved
fixture/proof. Native email/pass-first custody, distinct membership/event credentials
and ledger-only check-in authority are recommendations, not selected architecture.
Native pass signatures are not holder proof; inspected check-in history is not atomic
single-use proof. Current readiness is not an NFT gate. No broad repeated P1 research,
provider/chain/RPC, signing/wallet/minting, install or hardware provisioning.
The 2026-11-11 [account/token/NFC supplement](reference/ticket-account-planning-20261110.md)
is adopted on main. It records owner decisions but does not approve implementing the whole
supplement. Older `944f` worktree source remains provenance, not a transplant baseline.
[Full capture](archive/handoff-20261112/to-do-list.original.md#t002--unlock-protocol).

**Owner reframe, 2026-11-13 (product policy; not yet implemented).** This now takes
priority over T005 copy and T013.

- **What is delivered:** an NFT token, not an invitation, seat or reservation. It
  grants eligibility; the event is one perk among others. It is not bound to an
  event and is intended to last indefinitely, like a DAO token. That is why each
  account may hold one.
- **Gifting:** a purchased extra unit is a gift of a token. Until it is activated, a
  holder of the required receipts can take it first, whether or not the buyer is
  present.
- **No deadlines:** links have no end date and stay valid while the token is not yet
  activated. The event date is only the event's date, not a claim cutoff. The token
  remains after the event.
- **Refunds:** tokens that have not been activated cannot be refunded.
- **After activation:** lead the holder to a page. Which page is not yet defined.
- **Vocabulary:**
  - Avoid "invitation", "accept" and "ticket for this event".
  - "Already claimed" fits the concept, but the owner dislikes "claim". "Redeem" is
    imperfect.
  - The activation verb is open, along the lines of confirming or verifying.
  - Support channel: `concierge@sophomores.co`.

This conflicts with current code and plans, which must be reconciled rather than
silently overridden:
- link expiry set from `claimCutoffAt` and issuance blocked after it (`guests.ts`);
- the blueprint's one-event-lock-per-event mapping (§4);
- the claim-cutoff wording in T001, T005 and the commerce plan;
- current return handling (`returns.ts`).

Check the no-refund policy against applicable consumer-protection and PG terms
before it reaches checkout or terms copy.

**Owner answers, 2026-11-13:**
- **Events:** each event decides what holding a token entitles. The token is the
  prerequisite.
- **Capacity:** event access is bought, and the number sold is the cap. This keeps
  T001's "membership alone gives no seat".
- **Transfer and voting:** an activated token is not transferable, and there is no
  onchain voting yet. Recovery happens only through Sophomores, and walletless
  custody (G1) stays viable.
- **Next step:** local work first. Settle the model, then build account, token and
  allocation logic against a fake issuer. Live Probe A is not approved.

**Owner decisions, 2026-11-13 (later):**
- **Check-in by name is removed.** Arrival becomes one process: activate on the spot.
  Staff either guide the guest through activation or carry it out on the guest's behalf.
  Activation must therefore be reliable enough to run that way. No separate
  workaround path.
  - Open design point: how staff-assisted activation proves the guest's own account
    and consent without letting staff bind tokens to arbitrary accounts.
- **A cancelled payment releases its units.** Cancelled units do not count against the
  buyer's allowance or event capacity. This keeps the current release in
  `reservations.ts:101-104,117,122` and overrides T002-A candidate `581c2ab`, which
  proposed the opposite. The owner never chose that.

**Owner answers to the T002-A owner questions, 2026-11-13:**

- **Repeat purchases by a holder.** A member can buy several tokens, but only one is
  ever bound to their account. The rest stay inactive, each open to activation through
  its own link.
- **Token holders and the launch event.** Holders attend without buying. A holder's
  purchased units are all gifts, and each carries event access to whoever activates
  it. This per-event rule supersedes "buying sets the cap" and T001's "membership
  alone gives no seat" for this event only. The event cap counts sold units plus
  attending holders. The sale starts with zero minted memberships, so every launch
  holder comes from this sale.
- **Gift opened by a holder.** If someone who already holds a token opens a gift, the
  gift stays untouched, and they receive neither its token nor its event access.
- **Still open:** the T002-A model's questions on returns after activation, per-event
  passes, the legal/PG check of the no-refund rule, and staff proof and consent.
  Override of the used-seat ruling also stays open.

**Owner clarification: tokens are typed, 2026-11-13.**

- A ticket is a subset of tokens. An NFT has no inherent function: Sophomores decides
  what each token does. Like a printed ticket, it persists after its event date.
- "Token holder" therefore always means a holder of a **specific token type**. Future
  types may be issued. If an event requires token B, holders of token A must buy token
  B, because each type is separate.
- The launch rule "holders attend without buying" applies to holders of the launch
  token type only.
- Each event names the token type or types it requires.

**Effect on T002-A/P2a.** These are currently untyped: there is one membership slot
per account, and `ALREADY_HOLDS_TOKEN` and `holdersAdmitted` apply to any token. That
is correct only while a single launch token type exists. Adding a token-type dimension
(slot, refusal and event rule keyed by type) is a follow-up slice.

**Owner confirmed, 2026-11-13:** "one per account" means one bound token per token type. An account may hold one A and one B, but never two A. **Owner direction, 2026-11-13: ship.** Bring only the essentials to deployment quality, fast. This is a priority signal, not deployment or provider approval.

**Owner launch-scope decisions, 2026-11-13:**

- **Tokens at launch.** Tokens are recorded in the Sophomores ledger from day one, so
  holders are holders from launch. On-chain minting for the same holders follows after
  launch, with no re-purchase. Unlock and on-chain work (P2b real issuer, G1–G5, passes,
  NFC) moves off the launch critical path.
- **Migrations.** Workers may write additive migrations (new tables and columns only;
  no drops and no rewrites of existing data), reviewed by the custodian and tested
  locally only. Running any migration against production keeps its own approval.
- **Deferral list** (multiple token types, staff-assisted activation, self-service
  returns, T006, extended T007, Korean translation). The owner accepts it in principle,
  with exceptions still to be named.

**Owner launch directives, 2026-11-13 (later; these supersede the earlier answers where they conflict):**

- **Copy is first-class.** All copywriting and every user-exposed item has first-class
  priority. Each one is resolved to completion before launch, or the owner explicitly
  marks it deferred. There are no implicit deferrals; the earlier list is a proposal
  until the owner names each item. The default locale is `ko` (`src/i18n/request.ts:7`)
  and 1,027 Korean keys are `""`, so Korean visitors see English. That needs Korean copy
  or an explicit owner deferral.
- **Schema freeze for launch.** Keep iterating on schema changes. Right before
  production:
  - freeze the schema at its latest reliable state;
  - move the existing migrations (19 files in `src/lib/migrations`) to an archive
    folder;
  - regenerate a single one-shot launch migration.

  Because this is the platform's first deployment, the **Sophomores** database may be
  wiped and re-migrated repeatedly with no backup. Required data comes from seed
  scripts. Boundary: this covers only the Sophomores database. Hideaway data on the
  same host stays untouched (plan step 9), and production execution keeps its own
  approval.
- **Unlock is back on the critical path.** It supersedes "mint after launch" above.
  All token and Unlock investigations start now and must be live and reliable within
  three weeks, by about 2026-12-04. Every decision about the service's or data's surface
  and shape is in scope.
  - The owner handles the token itself.
  - Priority: connecting Unlock to authentication, plus how walletless accounts (Unlock
    creates a wallet for the user and binds their email) are created and handled.
- **Products are Payload-managed.** Confirmed in source: `ecommercePlugin` owns
  `products` with a `productsCollectionOverride` (`src/lib/commerce/ecommerce.ts:231,250`).

**Launch critical path (custodian proposal):**

1. P2a, then production wiring of the token kernel.
2. Activation page for the launch token.
3. A truthful purchase page.
4. Public phone verification (step 6). This blocks everything, because public trust
   currently denies every grant.
5. Product and policy facts from the owner.
6. PortOne sandbox and webhook, plus a real PostgreSQL proof (each needs approval).
7. Dependency disposition, image, Hideaway recovery capsule and cutover (each needs
   approval).

**Owner confirmations, 2026-11-13 (these answer the three interpretations above):**
- **U1:** "even if we are absent" means both Sophomores and the buyer, in the sense of
  permanence without agency. The buyer may regenerate the code until the token is
  activated.
- **U2:** one token per account, because the token is permanent.
- **U3:** a token can be activated after its event. The holder is then recorded as
  holding the token, which likely becomes the basis for how far their history with
  Sophomores extends.

**Owner Unlock basis, 2026-11-13 (supersedes the custodial-wallet designs).** After both the auth and shape fix-4 reviews failed for the same root cause, the owner chose [Unlock's own recommended pattern](qa/unlock-auth-20261113/unlock-recommended-pattern.md):
- After payment, the server grants keys with `grantKeys` from a dedicated wallet that holds only the KeyGranter role.
- Walletless buyers get a keyless address derived by **Unlock's email formula**.
- Only Sophomores, as lock manager, can move a key, which keeps the token soulbound.
- Issuance has a low cap, monitoring and a kill switch.
- Privy, the quorum, the attestation service and the Scale plan are dropped.

Public on-chain membership is intended ("I want people to be proud of this"). A single consolidated design rewrite follows.

**Unlock investigations, 2026-11-13.**
- **Auth decision ([unlock-auth](qa/unlock-auth-20261113/dispatch.md)).** Candidate `eb20002` failed review cycle 3 of 3 (security, Santa A and Santa B). There are no HIGH findings. Both Santa reviews independently found the same two MEDIUM findings:
  1. Under option D, the 48-hour step-up wait also blocks wallet creation. A new guest therefore cannot activate at the door. That contradicts "activate on the spot", and the owner decision text does not say so.
  2. The authorization service's quorum check reads passkey and eligibility records that the web app can write, so one web-app compromise can forge both authorities.

  The review cap has been reached, so this is **held for the owner**. The options are one narrow extra fix limited to these two items (receive-only wallet before step-up; signing gated; factor and eligibility state owned by the authorization service, with a forged-record negative proof), or accepting it with the conflicts stated.
  **Owner, 2026-11-13: one narrow fix 4 authorized.**
- **Shape ([unlock-shape](qa/unlock-shape-20261113/dispatch.md)).** Candidate `222d85a` failed review cycle 3 of 3 (specialist, Santa A, Santa B). There is no HIGH finding. The consolidated MEDIUM findings:
  1. **Validating signer.** Its trust root for approved recipients, its cumulative cap and its build slot are all undefined. The residual exposure under isolation is not stated.
  2. **Launch cut.** The new access tables and the paid-command authority are inconsistent.

  The new tables must be Payload collections (owner rule). **Held for the owner.**
  **Owner, 2026-11-13: one narrow fix 4 authorized.**

### T004 — Payment confirmation and recovery

A design is accepted/closed. **I0 is integrated** at main `32ccc27` from candidate `f592a81`
(native COMMIT/rollback acknowledgement, fail-closed ownership, official rejections
preserved only after acknowledged rollback; [handback](qa/batch-20261112/t004-i0-20261112-handback.md),
[review record](qa/batch-20261112/dispatch.md)). Proof is provider-free and synthetic:
no real PostgreSQL, hook, restart or exactly-once evidence. I1–I6 remain unimplemented. [Custodian acceptance](qa/t004-a-20261111/custodian-acceptance.json)
and [I0–I6 design](qa/t004-a-20261111/reconciliation-design.md) retain source,
B01–B16 blockers and dependency-aware proof. Claim-native rollback work does not
repair or prove payment commit/rollback durability; trace installed completion and
separately approve local-DB fault proof before exactly-once claims.

**I0DB real-PostgreSQL proof, 2026-11-13: RED.** Candidate `61edde8` on a disposable PostgreSQL 16.15 instance, which has been removed. **RED-01:** Payload 3.92.1 `findByID` passes the adapter a projected request `{ transactionID }`. The I0 ownership proxy (`src/lib/commerce/_shared/transaction.ts:193-196`) rejects it, so any Local API read inside `inPaymentTransaction` (`reservePurchase` → `readCommerce`) contaminates ownership, and settlement resolves as unknown. **Integrated I0 durability is not proven, and the in-transaction payment path is blocked.** [Remediation 1](qa/t004-i0db-20261113/remediation-1.md) (narrow adapter-projection acceptance with RED-first tests, then the full matrix on a new disposable instance) was sent to the same worker. **I1 is integrated** at main `a8abf37`, from candidate `805b12d`, after two review cycles: [record](qa/t004-i1-20261113/dispatch.md). It is a provider-free typed result/outcome projection plus the exact GET `/payments/portone/result`, with `local-consistency` assurance only. Typecheck and the default suite pass on main.

**Owner priority and approvals, 2026-11-13.** PortOne integration is the most important launch item.

- **PG/merchant contract:** **not yet applied.** Live payments cannot happen until
  the application is filed and approved. The application is now on the critical
  path, and it depends on the owner's product and policy facts. Approval timing is
  PortOne/PG's and is not promised here.
- **Local PostgreSQL proofs approved.** Workers may run an isolated, disposable,
  loopback-only PostgreSQL for payment and token fault, concurrency and restart
  proofs, then wipe it. This covers the I0 durability proof. There is no provider
  access, and the shared-rules DB prohibition is lifted only inside such a slice.
- **PortOne TEST-mode sandbox approved,** capped at **30 test payments** plus
  test-webhook registration. It uses TEST keys that the owner supplies in
  `.env.local`. No live mode and no real money. The keys are still pending from the
  owner.

**Custodian sequence:**
1. I0 real-PostgreSQL proof and I1 (typed result projection), dispatched as resources
   free.
2. I2, which needs owner numeric limits: the custodian proposes them and the owner
   approves.
3. I3, official settlement and webhook.
4. The sandbox adverse-payment matrix once TEST keys arrive.
5. I4–I6.

#### Payment confirmation and recovery — system-managed, same-attempt reconciliation

[Exact original financial brief](archive/handoff-20261112/to-do-list.original.md#payment-confirmation-and-recovery--system-managed-same-attempt-reconciliation)
is preserved with SHA256
`a25d435fb48c655d478b634be9d126db76cf75a3d873f76f4d5925a1142a88b7`.
It remains binding in full: separate local reads, bounded server PortOne
reconciliation and explicit initiation/resumption; the official Payload finalizer
is the only settlement authority. System owns uncertainty; customer intervenes only
for real information/decision/authorization. Return/restore may reconcile the exact
same-account attempt, never silently choose among multiple attempts or launch SDK.
Preserve immutable snapshots/IDs, locks, financial evidence, once-only order/stock/
allowance/admission/fulfillment effects and discoverable canonical results.

Never automatically charge, reopen SDK, retire, rotate identity, release by age or
clear holds. Not-found/old READY/timeouts are not no-charge proof; Payload
`transactionID`, SDK `txId` and webhook `transactionId` are distinct. Known paid,
verified failure and genuine unknown differ. Review/late payment/reversal/dispute,
auth/identity/integrity/config/rate/budget conditions stop automatic work. Deadlines,
backoff/provider-read budgets, cooldown/escalation, durable webhook catch-up actor/
mechanism and retention remain unselected; no invented timing guarantee/queue/SLA.
S5 copy and exact Korean remain held. Full original fault/browser/webhook/race matrix,
research qualifications and no-auto-launch safeguards survive in the linked brief.

### T006 — Guest-name corrections versus admission reassignment

Investigation established a missing supported staff correction operation despite
the plan's superadmin promise; buyer-only naming is not a fallback. Existing lock
tests/history establish implementation, not primary owner rationale for every ban.
Owner decides name purpose/entry identity proof and correction authority for buyer,
claimant/staff across available/claimed/checked-in/revoked/held/returned/cutoff states;
decide attendee replacement/consent/deadlines/outstanding links separately.

Correction preserves admission/buyer/account/event key/payment/fulfillment and
attendance/redemption audit. Even a label can transfer door access if staff treat
it as authority; spelling similarity is not same-person proof. No hold release,
benefit reset, refund/transfer/new staff grant/cutoff exception. Name change leaves
old bearer valid; explicit reissue rotates it; neither implies transfer policy.
[Original actor/state investigation and test matrix](archive/handoff-20261112/to-do-list.original.md#t006--guest-name-corrections-versus-admission-reassignment).

### T007 — Account recovery: bound-phone proof and concierge follow-up

**Settled:** concierge@sophomores.co correspondence; any mailbox-authorized staff
may handle cases, without automatic CMS/identity grants. Fresh control of the phone
already bound to the account restores access to that SAME account. Typed numbers,
matching records or contact inbox alone are not proof. No replacement account,
merge or unsolicited email change; email changes need separate request/proof.
Accepted Korean receipt stays verbatim with calibration owner; follow-up instructions
belong in email. Lost bound-phone control has no approved exception path.

Current intake stores unverified claims and restricted superadmin metadata review,
not correspondence/proof/access grants. Design case-owned secure continuation,
recovery-specific authoritative phone proof, atomic single-use grant and safe lost-
receipt recovery. Metadata state never grants access; no extra discretionary staff
approval after valid phone proof is proposed. Separate queued/provider-accepted/
uncertain/bounced/customer-response mail states; deduplicate bounded sends, audit
staff concurrency and escalate without invented SLA or promised delivery.
Current 30-day intake retention/on-intake cleanup is not a scheduler; correspondence
retention/session scope/invalidation/expiry need review. Do not request passwords/
sign-in codes by email or disclose registered identity before proof.
[Full decisions/proposal/acceptance](archive/handoff-20261112/to-do-list.original.md#t007--account-recovery-bound-phone-proof-and-concierge-follow-up).

### T010 — Required gift registration and resumable claim completion

Registration is required: “To claim your gift, register.” Existing people sign in/
continue, never register again. Explicit means informed claim intent, not a mandatory
second post-registration confirmation. Preserve separate proof/binding/claim writes
and authoritative result; only requested missing setup should be asked.

Reviewed server-owned intent design uses a protected opaque handle as a proposal,
not approved storage/cookie/TTL/tab/device architecture. Separate retained context,
intent, selected account/auth correlation, proof/readiness, same claim transaction
and authoritative result. GET/open/preview/refresh/callback/readiness alone never
consume a gift. Account change invalidates old intent; no silent repinning. No raw
bearer/digest/handle in logs/telemetry/onward URLs or unapproved persistence.
Before handle acknowledgement, refresh may still lose transient original fragment;
do not promise seamless pre-ack recovery or invent reissue. Google/magic-link enablement
alone cannot restore invitations. Current proof monitoring is not binding/claiming.

B supplies valid-bearer same-account result recovery, not full resumability or
expired recovery. Self timing remains server-swappable and unselected; both methods
promote T001's same reserved unit. Order delivered alone is not per-unit possession.
[T010-A design evidence](qa/t010-continuation-design-20261111.receipts.json) and
[full captured flow/fault cases](archive/handoff-20261112/to-do-list.original.md#t010--required-gift-registration-and-resumable-claim-completion).

### T003 — UI for purchase

Show enforced fresh event-specific self/gift rows, real physical offer/totals and
inline account entry, not a fake choice contradicting one event binding. Coordinate
T010 informed intent/registration with T001 allocation, T005 typed results, T009
identity and T004 system-owned money recovery. T002 controls any selected cinematic
physical/token activation dependency. Distinguish ready/pending/held/expired/consumed/
unknown and expose only supported safe result destinations. No refund/transfer or
replacement promises; new English uses next-intl, Korean unchanged. Source/synthetic
checks do not replace actual desktop/touch render and harsh Santa acceptance.
[Original capture and direction](archive/handoff-20261112/to-do-list.original.md#t003--ui-for-purchase).

### T011 — Korean UX copy finalization

KOCOPY-20261111 remains one cross-journey task under the copy calibration owner;
editorial PASS is not final owner wording, implementation or live acceptance.
[Run](reference/korean-copy-passes/00-run.md) and
[complete F01–F59 index](reference/korean-copy-passes/05-coverage-findings-and-task.md)
retain all six artifacts and repaired/borderline cases. Route system changes through
existing owners, not duplicate implementations: F01–20 account/proof/settings;
F21–26 navigation/reading; F27–33 offer/cart/address/legal; F34–48 payment/operations/
entitlement/recovery; F49–52 refresh/link/bearer; F53–56 studies/local-save/media;
F57–59 drift/owner/runtime/provider/device gates. Confirm exact information and real
actions before tone; never bulk-translate names or implement held policy through copy.
[Verbatim incoming capture](archive/handoff-20261112/to-do-list.original.md#original-incoming-capture--kocopy-20261111).

### T012 — English interface copy: deferred states and acceptance gaps

ENCOPY-20261111 [report](qa/en-copy-refinement-20261111.md) and
[per-key ledger](qa/en-copy-refinement-20261111.json) retain 1,198 original keys plus
four staff-reason keys, 86 held keys, three concurrent-owner candidates and all 30
source issue groups/near failures. Separate safe copy passes stay accepted; this is
not authority to reopen their words or declare whole screens functional.

Routing: AUTH-01/02/05 + FRONT-01 → T005/T009; AUTH-07 + FRONT-02/03/04 →
T001/T003/T005/T006/T010; FRONT-05/06 + SD-F03/A03 → T004/T005/T009;
AUTH-03 + SD-F02 → T007/T005; AUTH-04 + FRONT-07 disclosures → T001/T005/T010
with owner privacy/communication decisions. FRONT-08/09 settings and SD-F01/05
staff send/verify need actual outcome/capability contracts, not temporary-outage
promises. FRONT-13/14 mounted tour targets and reading write durability have no
existing implementation task: custodian must bound new scope before work.
AUTH-06 + FRONT-10/11 studies/dormant shells are not working journeys; do not
reactivate them for copy. AUTH-08 emailHelp/resendIn/failures.network remains with
concurrent copy owner; title/screen-reader locked-handle wording is not proven touch
discoverability. [Exact routing table and acceptance](archive/handoff-20261112/to-do-list.original.md#consolidated-routing--one-item-existing-system-owners-retained).

For every normal/waiting/empty/error/complete/lost-receipt case establish reader task,
known/unknown result, next actor and concrete supported action before prose. Preserve
owner wording and Korean bytes. Original audit's eight scoped type diagnostics and
six dependency advisories (four high) are dated audit observations, not current
whole-project validation; G1/B later scoped success is not a full-project green.
Do not silently waive advisory/coverage/dependency/provider gates or start upgrades.

### T013 — Invitation journey UX review

Owner request, 2026-11-12. Walk the live invitation journey screen by screen, from
the buyer creating a link to the guest finishing. Check that the reader is guided
through each step rather than told to "confirm below", and list every place where
the screens contradict recorded decisions. Known example: the page said
registration was optional, but T001/T010 record required registration, while
`issueGuestClaim` still requires a guest name and check-in before acceptance is still
permitted. T010 keeps the mechanics; T013 judges the experience and routes defects
to their owners.

**Owner direction for the activation page, 2026-11-13.** These are illustrations, not
approved copy.

- **The page depends on who arrives.** A signed-in account that already holds a
  bound token sees a holder view, for example "Patron since …" and "Thank you for
  being part of all this". It also gets a small, subtle link asking whether they were
  given a token.
- **First design how the page works out which token is in scope.** The holder view
  assumes the page already knows which token is in scope when someone arrives. That
  may not hold, especially if Sophomores later issues different token types. So the
  UX must first establish the exact token and variant, and only then choose a view.
  The constraint: a link-only, pre-sign-in lookup of a token's type must not become an
  existence oracle (T005 C13), so revealing a variant before sign-in needs a security
  decision.
- **What this replaces.** It supersedes the invitation-page framing in T005 S1 and in
  the held `qa/invitation-s1-20261112/spec.md`. Copy waits for this state model, and
  is drafted with `/ux-writing`.

## Completed tasks

No parent task is implementation-complete. Delivered bounded slices/designs remain
linked above. [Historical captures](archive/handoff-20261112/README.md) preserve
original captures/requirements rather than deleting unfinished work.

Scheduled custody: automation `sophomores-to-do-maintenance` is unchanged by this registry,
including its cadence and enabled state. On invocation it reconciles ownership and
evidence, then resumes one assignment or dispatches one dependency-ready bounded local
execution. A registry with more than two implementation-unstarted tasks also triggers
this routing. It is not a continuous watcher, and separate approvals still apply
([original](archive/handoff-20261112/to-do-list.original.md#scheduled-custody)).

<!-- Historical inbound-anchor compatibility; content preserved in the linked verbatim capture. -->
<a id="attention-order-and-priority-logic"></a>
<a id="closed-assignment-contract--sph-t004-a-20261111-01"></a>
<a id="consolidated-routing--one-item-existing-system-owners-retained"></a>
<a id="current-assignment-contract--sph-delivery-s1-20261111-01"></a>
<a id="current-assignment-contract--sph-t005-b-20261111-01"></a>
<a id="current-assignment-contract--sph-t005-g1-20261111-01"></a>
<a id="current-delivery-contract--sph-delivery-20261111-01"></a>
<a id="execution-status-clarification--2026-11-11"></a>
<a id="handoff-preparation--owner-scope-2026-11-12"></a>
<a id="isolated-execution-integration-and-retirement--owner-update-2026-11-11"></a>
<a id="original-capture--retained"></a>
<a id="original-capture--retained-as-provenance-not-current-policy"></a>
<a id="original-incoming-capture--kocopy-20261111"></a>
<a id="restart-recovery--2026-11-12"></a>
<a id="scheduled-custody"></a>
<a id="scope-and-evidence-boundary"></a>
<a id="separate-maintenance-commits-and-gated-delivery--owner-update-2026-11-11"></a>
<a id="smallest-useful-acceptance-and-fragile-final-pass"></a>
<a id="splitmerge-and-orchestration-proposals--owner-review"></a>
<a id="status-ownership-and-evidence"></a>
<a id="task-index--attention-order-not-execution-authorization"></a>
