# Auth · Payment · Unlock/NFC — one branch, one plan

This file is the plan. On 17 Nov the owner retired the live doc (https://claude.ai/artifact/Bt65UugGE56CBfTSRnXKkf); this copy was checked against its final state that day (revision 244 of Plan, 2 of Rules, 12 of History). Subsequent coordination updates live here, not in the retired doc. It holds the live doc's three tabs in order: Plan, Rules and History. The two diagrams are `system-map.png` and `journeys.png`, rendered from their exact sources `system-map.source.txt` and `journeys.source.txt` in this folder.

Nov 14, 2026 · @Sean

## Current priority and delivery order (owner, 19 Nov)

> "UI can be styled as needed, modified- prioritize backend work."

This supersedes the 18 Nov UI-first ordering
([ADR-0032](../../adr/0032-backend-first.md); ADR-0015's other delivery
rules stand). The directly requested margins,
footer, headings, inline form and header corrections continue in parallel
through their UI owners, with Maintenance handling landing. Keep the complete
functional commerce journey; the review copy is not a marketing-only launch,
and launch/deployment remains the final milestone. The delivery rules below
still apply. See the [road to launch](#road-to-launch-21-nov) for the proposed
sequence and the owner's review-copy timing.

## Current delivery policy (owner, 18 Nov; accepted ADR-0015)

[ADR-0015](../../adr/0015-autonomous-page-first-ecommerce-delivery.md) records the
accepted owner delivery reset relayed in `msg_d3f32ec4ed98`. Deliver coherent
pages and complete customer journeys through existing owners using established
installed/native facilities. Show imperfect current work early; preserve the
full functional ecommerce programme, not a marketing-only substitute.

Tests NEVER affect progress: failed, no-op, partial or unrun tests do not halt
implementation or force retries. Check at completed-page/whole-flow milestones;
granular diagnostics are useful only for unfamiliar/custom behavior. Auth SSR,
Arc raw-role, old default-suite/coverage/RED-GREEN conditions and test-only review
are not prerequisites. Keep their actual historical results and unrun status;
do not convert them into PASS or claim unobserved functionality.

Council is strongly recommended, NOT mandatory, only for choices that otherwise
would have needed explicit owner approval. It is not a routine/all-the-time
implementation, ambiguity, check, fix or retry gate. Choose the fitting direction,
record consequential decisions once, and execute without another draft-approval
loop. The older blanket ADR-proposal/checkbox rule is superseded; unresolved
product facts/decisions in Waiting for you retain their actual scope/status.

There is no blanket production-isolation or project-level approval hold. Use the
fitting working environment without unnecessary production touches or real
charges/messages/destructive actions merely to show a page. Higher-priority or
platform action-time confirmations apply only where concretely relevant; the
ADR cannot manufacture consent or override them. Preserve existing product
scope, ownership, 48 GiB host accounting, <=15 GiB aggregate and >=10 GiB system
headroom. Actual broken journeys guide repair without freezing unrelated work;
implemented, visibly exercised and unresolved behavior stay distinct.

This accepted policy is effective now and does NOT wait for DOC-01 activation.
The old Work order, Rules, History, failed attempts and approval wording below
remain dated source; conflicting test/isolation/proposal-acceptance process
holds yield to this later owner instruction. This recording is not deployment,
provider acceptance or a claim that unfinished flows work.

## Waiting for you

Tick a box to accept what I propose. To answer differently, comment on the item or write underneath it. I read this section before every change. Accepted items move to *Your decisions so far (History tab)*, and the ADR named on each item gets marked accepted.

*16 Nov: The flow from zero, below, replaces parts of items 8, 8b, 9, 11 and 14.*

**Unlock build, next**

- [x] **14. Four details for check-in on Events by Unlock.** Settled 16 Nov by The flow from zero: holders get a free launch-event Ticket by airdrop; the NFC card is bound to the account (below); a dead phone at the door is out of scope (item 17); Tickets can't be transferred (a build call in The flow from zero). Door staff each need a wallet to be added as a verifier.
  - **The NFC card.** Decided: the card is bound to the account and no longer opens the door. Its first tap opens the welcome page, which adds a passkey on that phone; after that, a tap shows membership. The card build (step 9) follows this.

**Recovery-policy decision (17 Nov; owner choice recorded, implementation pending)**

- [x] The earlier 17 Nov question asked whether historical keys left after a
  bounded transaction need durable automatic catch-up or staff-triggered
  recovery. The owner later answered **"automatic catchup it is"**, relayed by
  the recovered main coordinator in `msg_f4a8a7f51728`: durable automatic
  recovery of clearly owed pending wallet/key attachments is chosen.
  Current-payment attachment stays immediate. This closes the policy choice,
  not implementation, schema, signing, scheduler/job, provider, dependency or
  deployment approval. Proposed work-state/budget/producer/consumer machinery
  remains unaccepted architecture until separately reviewed.

**Your to-dos**

- [ ] File the PortOne 바로오픈 (KG Inicis) application once the site is running. The owner updated the timing on 21 Nov: "This can only be done once we have a running site".
- [x] **21. Signet lock deployed by the owner on Polygon (chain 137).** Lock: `0xcc95180d590365d88f8aad870c264d127b221506`. The coordinator's 20 Nov read-only check (`msg_9c7493a9fac4`) reported PublicLock v15, zero price in the native token, no expiry, `maxNumberOfKeys` 0, one key per address, transfers disabled (10,000 basis points), and total supply 0. The live grant signer `0x2CDb060E373F0EFE93BefFD1478cdE739cBc5336` has `KEY_GRANTER` and is not a lock manager.
  - **Observed, not a new decision:** the on-chain name is `SIGNET - SPHMRS`, not `Signet` as written in ADR-0011. The adapter was tested on Base Sepolia; Auth still needs to confirm compatibility with this v15 lock in Slice 3. **Confirmed 24 Nov (Auth, read-only `eth_call`):** Signet is PublicLock v15 and Edition I is v14; every function, selector and event we call or decode is byte-identical in both (`grantKeys` 0x81a3c943, `expireAndRefundFor` 0x558b71e9, `isValidKey`, `totalKeys`, `maxKeysPerAddress`, `isLockManager`). The one v15 difference that matters is `onHasRoleHook` (zero today; a preflight check is planned). Both locks have `maxKeysPerAddress` = 1. This deployment does not approve enabling Polygon in the application.
- [x] **22. Live grant signer funded.** The owner sent 2 POL to `0x2CDb060E373F0EFE93BefFD1478cdE739cBc5336` for grant gas. The coordinator verified a balance of 2.000000 POL on 20 Nov (`msg_2e81e351e856`); this is a dated balance, not a continuing guarantee.
- [x] **Polygon one-grant check (owner-run). Done 22 Nov (01:14 KST):** tx `0x8dc0c2a66771a57240a01931a359ea08af41a75240e8e0a60a72075abe84301f`, block 97714798, token 1, final 436/256 (`POLYGON-EXIT1-DIAGNOSIS.md` in the auth worktree). Original item: run the dry run, the single broadcast and the finality check in [Polygon owner commands](polygon-owner-commands.md); no agent broadcasts or moves funds.
- [x] **Superseded 24 Nov.** Owner, verbatim: "One lock + guest label at door". One Edition I lock per event, a distinct key per admission, and staff see guest or member at the scan. The two-lock text is kept as history. The owner created the event and its Edition I lock. Original item: create one event in Unlock's EVENTS app from MetaMask, once you have POL, and create both locks on it: one for members, one for guests. Add the live grant signer 0x2CDb060E373F0EFE93BefFD1478cdE739cBc5336 to each as a key granter, turn off self-serve sign-up and make tickets non-transferable on both, and send me both lock addresses. Owner, 23 Nov: "locks indeed are twofold" ([23 Nov rulings](#23-nov-owner-rulings)).
- [x] **24. Wallet owner key approved, created offline, and backed up.** The owner approved creation (`msg_1c3474f51a6f`). Public address: `0xe2f6f26929a4f27cd39aa24a850dbf285ab81fc7`. It is separate from the grant signer and lock manager. It signs nothing at launch, but every member Safe address depends on it. On 20 Nov the owner confirmed an owner-held password-manager backup (`msg_f6812d705807`); the original remains on this Mac. No restore test was performed. This is not approval to enable Polygon or to use the key on chain.

### Open follow-through from the 21 Nov owner answers

- [x] **NFC sourcing: answered 21 Nov; tags ordered 22 Nov.** Cost 10K or less each; under about 1 mm with a 0.5 mm plate; AliExpress only; LED: the cheapest and brightest of orange, yellow, white and light blue; the owner prints. Records recovered to `~/orca/archives/nfc-sourcing-20261121-recovered/`. Original item, for Tue 24 Nov: reader location is tentative; print route, LED colour and thickness (1.5–2.5 mm) are open; include iPhone Air in device checks. The owner will check the NT4H2421 listing and customs code on AliExpress. See the [decision ledger](#21-nov-owner-answers).
- [ ] **UI review:** show shop and checkout margin option B before landing it; verify the phone bottom menu frame and tentative no-strip direction visually; explore the main product explanation at the top of the Mersi hero without assuming wider carved-frame placement is approved.
- [ ] **Branches:** Auth must confirm the rebuilt branch carries everything and send its adoption packet via the coordinator before Maintenance adopts it or updates the one-branch rule. Port the retained Warp intro work separately after reconciling the conflicts in three Warp files.
- [ ] **Approver and super-admin:** the owner sets them in Payload admin at activation. Do not put personal email addresses or address spellings in the repo.

## Open work retained by the owner (21 Nov)

The owner marked all 22 master-plan items Keep. They remain open in this plan;
keeping them does not approve every proposed implementation or lift the colour
hold. Observations below are the coordinator's dated snapshot, not a new runtime
or provider check.

### Product and checkout

- [ ] **Purchase journey (19–20 Nov).** Owner: "very important". At the coordinator's snapshot, purchase was switched off on main and had no assigned lane. Coordinator proposal: make standard checkout the first backend delivery milestone.
- [ ] **Live test stage (16 Nov).** Stage about 10 keys across the four owner-designated inboxes, exercise member-to-guest invites on live, then "50 keys for the full thing". Only sandbox evidence and one test email were recorded. Owner, 24 Nov: "we used them to actually live-test the process. We conducted several rounds of use naver pay to pay -> check if it goes through + check how it gets marked on the system" (no on-disk evidence of those rounds). No live execution or messaging is approved by this note.
- [ ] **All editions launch together (20 Nov).** Carry this across launch scope; it had previously been recorded only in a lane state file.
- [ ] **Setlist slot numbers (19 Nov).** Owner: "Slot number should not be like that". The coordinator saw fractional slot numbers accepted; proposed fix: require integers and preserve the curator flow.
- [ ] **Payload drafts and access (19 Nov).** Owner: "We need to audit our approach". The Home draft correction was the only recorded fix; broader drafts and access review remains open.

### Look and feel

- [ ] **Colour direction (14–16 Nov; hold).** Retain neutral monochrome with slight accents, blue/green comfort to white-hot passion in the flame, red/orange/blue references, analogue grain and warm-tinted black and white. References: 80s–90s Sony, Aston Martin, Porsche, Gulf, Singer, *La nuit sera calme*, Camus and Francis Bacon. "Red sucks… stop giving me pinkish colors" conflicts with the parked blood-orange idea; no palette change is authorized.
- [ ] **Korean type (16 Nov).** Mix fonts by role; the owner likes Pretendard but not in bold. The Copperplate role was not finished. Pretendard assets were present but not loaded in the coordinator's snapshot.
- [ ] **Arc principle (17 Nov).** Owner: "communicate with intent through differentiated means… nothing is used without meaning." Apply Arc to primitives and forms, not as a replacement for bespoke page design.
- [ ] **Home header (15 Nov).** The Hideaway reference shows/hides on hover intent, per page, with a reset on leaving; main was observed to hide per route only.
- [ ] **Scenes after Warp (15 Nov).** They were reported to run about 3–4× too long; revisit the deferred timing rather than treating it as fixed.
- [ ] **Token names (20 Nov).** Owner: "consolidate the three names" for the colour and grain tokens.
- [ ] **Unlock event text (19 Nov).** Use a formal Korean ending: "more deference and formality… it's an invitation". This is an exception to the ordinary brand voice.
- [ ] **`/lostinseoul` (20 Nov).** Owner: "we should check that". The coordinator found route-specific branches in page-transition code. Hideaway features exclusive to this route remain out of scope.

### How agents work

- [ ] **File authorship (18 Nov; widened 21 Nov).** Owner, 18 Nov, about the split UI workflow: "Only Claude may write files". Owner, 21 Nov: "all lanes, Claude only writes files". Codex sessions may read and review, reporting by message only; main's single writer is a Claude Maintenance session. Open: move remaining Codex-written lanes to Claude writers (Codex writing was still observed in the review).
- [ ] **Readable names in reports (17 Nov).** Owner: "long ids are kind of hard to understand for me." Use lane and work names in owner updates; evidence logs can retain identifiers.
- [ ] **Never block on a dependency change (17 Nov).** Preserve this from the old handoff: work around a pending change where possible, not by installing an unapproved dependency.
- [ ] **Learning and compaction skills (17 Nov).** Retain the direction to run them at the start and end of each session.
- [ ] **Original design-first plan (20 Nov).** Find the plan that enumerated paths, then pages, then components, with design before code. It has not been recovered or resumed; it does not override the current backend priority.
- [ ] **Coordinator split (19 Nov).** Separate backend and frontend coordination as decided; the split had not yet been set up.

### Agreed work still open

- [ ] **Scripts cleanup.** Reconcile `scripts/deploy.ts` with `scripts/deployment/`; group phone-verification scripts in their own folder.
- [ ] **Copy catalogue cleanup.** Reduce broad delivery/imports of the catalogue: the snapshot counted 1,665 keys, staff keys delivered to every page, and 45 imports of the full English catalogue.
- [ ] **Brand brief (15 Nov).** Capture the private-club idea, the love-hate stance towards Harvard-style institutions and Korean schooling, and "celebrating human will". The institutional theme is missing from the current identity document.

## Road to launch (21 Nov)

**Owner timing:** the VPS review copy is targeted for "this weekend" (21–22
Nov), not 9–15 Dec. Friday 18 Dec is the launch target; Tuesday 24 Nov is the
NFC parts order target. The table is the **coordinator's proposed sequence and
target windows**, not readiness or permission to deploy, charge, message or
broadcast. Keep the separately scoped action-time gates.

| Window | Backend (priority) | Site and operations |
| --- | --- | --- |
| **21–24 Nov** | Auth prepares and reviews the Polygon dry-run/broadcast instructions; proposed live check is one owner-run grant, capped at USD 0.10, then the one-coin-per-account review. | VPS review copy **21–22 Nov**; keep the header, footer grain, headings, bottom bar, inline form and shop margin fixes moving, with B shown before landing. Target NFC parts order on 24 Nov, subject to sourcing decisions. |
| **25 Nov–1 Dec** | Adopt the rebuilt auth branch only after completeness confirmation and the coordinator's packet; merge reviewed slices to main. Enable standard checkout: one payment ID per attempt and reused on resume, server re-read and exact amount check, one order per payment, idempotent settlement, webhook-triggered settlement and periodic re-check. | Osklen-style footer and Help, Hideaway headings across the site, Mersi work only within its reviewed direction. |
| **2–8 Dec** | Admin refunds through PortOne, guest invites, Polygon keys only after the owner's go-live, and the signer recovery runbook. | NFC slice: first tap → welcome → passkey. Owner, 23 Nov: "Oh btw NFC does not have to be fully functional at first-deployment; the requisite is that our system can accommodate the NFC functinality with stress-resistant, field-ready level of security, reliability and resilience." |
| **9–15 Dec** | Live test stage (about 10 keys and live invites), sandbox journey run within 30 test payments, and security hardening after review-copy upload. | Final phone and desktop page passes. |
| **18 Dec** | **Launch** as the final milestone, following functional journey completion and applicable release approvals. | |

**After-preview gate (owner, 23 Nov: "that will have to come AFTER we first have the site running for preview. That's when the staff will test"):** once the preview site is up, staff run the Unlock real-phone single-use test: a second scan, a copied screenshot, the name fallback then a scan, and offline. See the [23 Nov rulings](#23-nov-owner-rulings).

Still open for the owner: the PortOne application once the site is running and
creating the launch event in Unlock's EVENTS app, as listed above. Checkout
acceptance should cover one order on repeated settlement, exact-amount mismatch
refusal and reuse of a resumed attempt's payment ID. Refund acceptance should
cover a paid order marked refunded and its dependent key cancelled once even
if retried, consistent with the later ticket and seat decisions in this plan.

### Resume and review order (coordinator)

Auth: prepare the one-confirmation Polygon check and read-only finality
verification, get review, then hand the owner the dry-run and broadcast
instructions. UI-Commerce: show B, then submit the reviewed commerce/form
packet; UI-Shell: check the bottom bar, grain and dark header/buttons on the
phone before submitting its packet. UI lanes share the preview/browser and
take turns. NFC + Sourcing finalises the order list. Reviewers take scoped
packets; Maintenance lands only coordinator-supplied packets and pushes only
with approval of the exact SHA. The restarted UI-Shell, UI-Content and Codex
lanes resume from saved state in their own worktrees, preserving uncommitted
work; a lost terminal is not an instruction to reconstruct their changes.

### Coordinator follow-ups, not execution approvals

- **After-upload hardening inventory:** review Apple Music route authorization and rate limiting, Payload access enforcement for setlist/track writes, sync-secret handling, transaction ownership and owner-token storage. Reconcile split auth and Payload collection placement, check the missing migration snapshots, case-sensitive Devtools test paths and environment-template coverage. These are dated coordinator findings, not a current audit or a prerequisite to documenting DOC-01.
- **Cleanup candidates:** check merged branches and missing worktrees, bundle superseded passkey-wallet branches, retain any needed Pretendard assets, assess large binaries and older QA logs, and review unused UI and Hideaway source by actual consumers. Check implicit dependencies and overlapping icon, ID, dialog and button systems slice by slice. No blanket deletion, dependency change or history rewrite follows.
- **Decision-record candidates:** confirm the grant cap and who pays, sole-approver override until a second approver is added, signer recovery, iPhone-only NTAG 424 DNA light-up card, Hideaway/Arc scope, all-edition launch and backend priority against their sources before promoting them into ADRs. The design ADRs from `feature/product-production` are on main as ADR-0036 to ADR-0044 (renumbered from design 0001–0009, 24 Nov); the design docs they came with are in `docs/reference/commerce-experience/` (`04c-direction.md`, `04c-site-records/`, `05-design-requirements.md`, `05-evidence/`).
- **Coordination:** keep one canonical plan on main, read the latest dated owner words before resuming, label checked versus unverified claims, and spell out ambiguous instructions before dispatch. Proposed workflow safeguards include lint enforcement of styling and test-location rules, disciplined branch closure, smaller scan models, one browser lane at a time and per-lane budgets.

## Where we are

- **21 Nov — DOC-01:** Maintenance resumed in the canonical `main` checkout by coordinator dispatch; the coordinator remains read-only. The approved push of `888b97f2` is recorded in the [decision ledger](#21-nov-owner-answers). This file on main is the only plan to edit; the auth-branch copy and the migration snapshot below are history. Separately queued Auth adoption and the one-branch rule update are not part of DOC-01. Under the owner's 21 Nov rule ("all lanes, Claude only writes files"), main's single writer is now a Claude Maintenance session; the 17 and 18 Nov writer identities below are history.
- **Merged into this branch (16 Nov):** the Unlock adapter with a Base Sepolia test lock, the paid guest invite (to be reworked for the new flow), key-grant hardening, and the checkout fix (also on main).
- **Current coordination (17 Nov):** coordinator `run:run_bbf9450ca334` owns scheduling and cross-session decisions and is read-only on main. The owner-authorized sole maintenance writer, `dispatch:ctx_aa5968f8e465`, owns all main checkout/index/commit/merge/push and canonical-ledger writes; transfer ACK `msg_058ff28c59ad` verified main `813bd8d4e316b35cd0e0b24f210943803aac9e7b`, empty index and the handoff hashes. Undine coordinates the wallet lane through `run:run_f7d117af78fa`; retained auth remains the single mechanism writer. Committed pins at handoff are main `813bd8d4` and auth `d31f2349`. The earlier `9ae2d35b`/`2e8708ed` comparison and 20 main-only/112 auth-only counts are historical, not a current divergence measurement or bulk-merge permission. Existing unrelated main WIP stays untouched. The [custodian board](../handoff-20261117/custodian-board.md) is historical dispatch/evidence only; current status and decisions live here.
- **Post-migration routing (18 Nov; source/preparation only):** accepted successor Maintenance `run:run_46831d59b2c6` owns canonical documentation preparation in `/Users/seanschoi/orca/workspaces/sphmrs/visible-main-maintenance-20261118`, branch `codex/visible-main-maintenance-20261118`, base d04b4e45. Sole coordinator successor `run:run_bbf9450ca334` schedules and remains main-read-only; Undine successor `run:run_f7d117af78fa` routes Auth instructions to `run:run_ae05f677ee6c` on `codex/visible-auth-payment-nfc-20261118`, while Hamlet successor `run:run_4505da7cdaca` owns UI on `codex/visible-hamlet-20261118`. Original main/predecessors are frozen rollback/history; legacy Dispatch identities above are dated provenance only. Verified coordinator final-release/receipt and msg_2aca9f16dabe release only existing bounded source/preparation queues. This file remains canonical until separately reviewed local PLAN activation; no adoption, index/commit/merge/push, runtime/browser/provider/DB/dependency/cleanup/deployment authority follows.
- **Failed-attempt accounting (17 Nov; Undine `msg_fafcb3ffd858`, main cross-link `msg_c728f159b62a`):** notification Task `task_3a13fd1eac9e` includes abandoned Dispatches `ctx_6a599957c0db` and `ctx_b2f5f25fb628`, with missing-terminal failures; recovery of the original Hamlet conversation does not clear or retry either attempt. Historical wallet-manifest W-01 is a different Task/Run: `task_f00a5b096a31` / `ctx_fe361decdf9c` / `run_2b9ca801758e`. Its reported state is failed, `launch_state=active`, `process_resync_unknown`, liveness unverifiable; do not infer either a running worker or a stopped process. Undine `msg_a511978744d9` reports `worker-read` returned `archive_unavailable` / `session_not_reported` and task result is null: there is no available transcript/report or accepted wallet integration manifest from that attempt. This corrects the board's earlier terminal-release claim without erasing its dated evidence. No recovery/rebind/release/cleanup or new assignment follows.
- **Main checkpoint audit debt and limited owner exception (17 Nov):** required `pnpm audit --json` exited 1 on the unchanged dependency tree: zero critical, four high, seven moderate and two low advisories. Exact report `.tmp/main-maintenance-handoff-20261117/worker-checkpoint/dependency-audit.json`, SHA-256 `304cde82186653c6763b4fa706ff463c97bb9cabd12c5e517d2e8d0d81bd7733`. High advisories include happy-dom host-code execution/SSRF through Payload/Lexical and auth dependencies, follow-redirects credential forwarding through wait-on/axios, and joi email-input DoS through mailauth/resolvers/wait-on; these are not all dev-only. Unchanged manifests/lock do not establish production safety. Main `msg_cfb96d247791` reports native security-reviewer transport failed to deliver readable instructions, so no independent security PASS exists. After the hold and documentation-only preparation, the owner explicitly chose **"Lets go with your rec on the audit debt."**, relayed by main in `msg_e0b2c5951356`: commit/push only this docs/test/ownership checkpoint while recording the existing audit debt. This lifts only its staging/commit/push hold, not dependency changes, audit-hook bypass, security clearance, plan adoption, arc integration, runtime/provider work or deployment; release remains held. The earlier automated mailbox notice was not an owner exception. Orca rejected earlier worker/coordinator attempts to mark this active Task blocked; no Task-state change, worker exit or failed-task completion is claimed.
- **In review:**
  - Payment-created wallet and `/welcome`: owner candidate `cf1aa812`, independent baseline `c205cd08`. Final repair `807dcebe` received independent **bounded source/test PASS**, including commit-phase invalidation and suspended-transition regressions (final-fixture RED 24/29, GREEN 158/158). The earlier failed checkpoints remain history, not acceptance. Combined patch SHA-256: `a8f9184bebd2bbae62852f0f30bbb8e28e34c32d412671e0dca9c654e736a58e`. A wrong completion-message hash was retracted; actual artifact and committed bytes were verified. RED source restoration was not independently observed or cryptographically bound to the log.
  - Auth owner committed six-path Batch A as `d31f2349` on retained `2e8708ed`, after independent bounded source/security PASS (verified-email passkey backend; phone-before-order/link-social retained). Behavioral RED: four expected failures/one security-control pass; focused GREEN 40/40, expanded security 64/64, no skips. Affected backend coverage: 95.91% lines/87.75% branches/89.25% functions. Committed patch matches `b691800bba0d4cae51d6b6db4488ed6f87f2c7efcdf8090f97a4972ead7d862a`; report `/tmp/sphmrs-task_ca6530166b9d/review-handback.md`. No DB run or valid candidate typecheck yet. The 51-path manifest/18 overlaps are not blanket integration permission.
  - Next wallet foundation proposal is reduced from 20 to 19 paths: remove the unnecessary commerce/access export. Independent source review found 500 held awaiting intents can starve an eligible later intent for the same member; the per-member keyset correction remains unapproved (500 rows/page is not a total transaction-work bound). The first test-preparation packet invented fields/configuration and was rejected without execution. Corrected four-case tests received readiness review, then one guarded run on unchanged `d31f2349` produced three semantic assertion failures/one absent-config control pass, zero skips; raw log/receipt and unchanged production hashes independently verified. Durable handback: auth workspace `.tmp/task_024774b47567-red/handback.md`. This is RED only, not GREEN or production-port permission. Held-prefix/tie/mixed/all-held and typecheck diagnostics retain their actual run status, not an automatic test prerequisite. The concrete starvation/total-work/native-transaction safety questions still need resolution within approved scope; test-only changes stay uncommitted in the owning auth checkout.
  - **Batch B independent proposal review returned:** provenance/references PASS only, not correctness, native-transaction or architecture acceptance. Report: reviewer workspace `.inbox/plans/task_032fe3e28efc-review.md`, SHA-256 `fee66b40b58b23e1736fff69d32c8695fbff3ceb766c38a2a62b22e8ec33cea3`. **P2-01:** the four RED cases characterize missing behavior; they do not isolate cap failures or prove traversal/total-work bounds. **P2-02:** transaction-ID checks before/after work do not prevent autocommit fallback or prove rollback/cursor atomicity. Both findings remain open.
  - **Exactly two-path test-only preparation:** main authorized retained auth to edit only `tests/commerce/domain/storage-fake.ts` and `tests/commerce/keys/member-wallet.test.ts`, preserving the original four cases and valid RED/rejected-packet history. That dated test-preparation assignment put isolated fake-query conformance cases before minimal fake support; it is not a current test-first prerequisite. No invented consumer APIs or production attachment logic belongs in fixtures. Task `task_df96ca8af3b6` / Dispatch `ctx_ba3e9c4837a2` is settled. Independent report `.inbox/plans/task_a7ba894e82e0-preparation-review.md` returned bounded source-only PREPARATION PASS for delta SHA-256 `f88b70727757d88e2b58782dac14806cd0c4b0c01d70e8d933a832b1440188c7`: original four-case prefix/evidence preserved, eleven new top-level model-conformance cases. No tests ran; this is not observed TDD, GREEN or coverage. This gate authorizes no production/schema/runtime/dependency edits, execution, providers/DB, browser, commits or merges. Traversal, transaction-owned budgets, native fencing/rollback, cursor atomicity and wakeup/producer races remain blocked pending reviewed contracts/baseline and the recovery-policy decision above.
  - Existing wallet dependency tree matches auth's application lock and all 160 locked direct versions, but manifest specifiers for `sharp` and `uuid` differ from that lock. Investigate and disclose; no install, lock repair or symlink repoint is authorized. Scoped checks may use a disclosed read-only resolver, not claim full dependency parity. The current preparation does not authorize restoring a resolver link.
  - Tests, typecheck/default-suite results and coverage are diagnostics, not current TDD/every-suite-GREEN/coverage-quota prerequisites or automatic rerun tasks. Report unrun and failed checks accurately. Concrete user-flow defects, native transaction/security correctness and actual browser/Santa/owner review remain distinct acceptance questions in their existing scope; PNGs or focused counts do not establish live/native/provider acceptance.
- **Page/UI lane:** Hamlet token commit `f96d5fa2` has narrow source/compiler/live-value PASS, not overall UI acceptance. Its reviewed token-only content is integrated on main as `f13f8cd` (RED four expected failures/two passes, GREEN 6/6); main fonts/palette and unrelated WIP are preserved, exact-main live acceptance remains unproved; typecheck/default-suite diagnostics retain their unrun status without becoming automatic work gates. Notification patch `a42aa676` has bounded independent source/security PASS: initial RED two failures/one pass, final focused 18/18, typecheck clean and functional 2,925 pass/40 skipped/zero failures (not full default; predates final legacy-hook removal). Actual 390px live checks show visible/unclipped portal and correct Escape/focus return without reading/navigation, but **keyboard focus indicator FAIL**. The old worker was abandoned; its screenshot-write prompt is obsolete, not a current owner gate. At the earlier checkpoint, N-01 recovered Task `task_3a13fd1eac9e` to Dispatch `ctx_b2f5f25fb628` with a bound-session ACK and frozen manifest hashes verified. After the restart that Dispatch is abandoned, not accepted. Main restored the exact pre-restart Hamlet conversation `01a1e72c-f2f8-7f82-9b46-d014087f380f` in its existing tab; actual recovery ACK `msg_f68cbb3d2359` confirms sole Hamlet custody, checkpoint only. Undine independently confirms receipt in `msg_6a3ec557cc2b`. Recovery does not retry the abandoned capability or authorize implementation; fresh scoped assignment/resource/lane admission is still required. The narrow assignment supersedes the old broad D1 body. Undine source-reviewed a proposed addition of only inline `focus-visible:inset-ring-2` and `focus-visible:inset-ring-current` to `src/components/shell/header-actions.tsx`. No correction has been edited, compiled or run. Synthetic RED/GREEN or an all-green suite is not a prerequisite. The reproduced keyboard-focus defect still needs intended-flow correction and actual 390/1280 keyboard/Escape/focus-return/Santa/owner review under its existing scope; no new commit authority follows. The earlier preview guard timed out after 1,800 seconds (exit 124, remaining PIDs empty, cleanup certain); that historical port check is not current preview permission. No notification commit, final live GREEN or acceptance. Mobile menu interception, small trigger/read targets and light Help contrast remain unresolved; no-baseline visual regression INCONCLUSIVE. Direct browser handoff is unavailable; live checks use coordinator-selected worker relay plus independent capture review. One guarded workload/browser driver at a time; palette/mark/logo/font decisions remain held, h5/h6 provisional and non-human-reviewed. Never whole-merge pre-rewrite history.
- **Resource gate; default-suite diagnostic status:** the 14.21 GiB readable-footprint/unreadable-client sample is historical. The newer Hamlet packet `.tmp/n01-bound-preparation-01a1e72c.md`, SHA-256 `c0c17fbee61736e09aeead19239fd97c3a994ed7951dc3e15999dc4911af70ef`, reports **18.810 GiB measured conservative mixed accounting before a job; 20.310 GiB with the proposed job/tolerance**. This is not a proven pure agent-owned allocation: captured chat PIDs had readable footprint, but newly appearing PIDs lacked initial guard identity and census completeness remained unproved. That historical sample did not admit work. A fresh post-restart passive census at 17 Nov 06:10 UTC confirms **48 GiB RAM, normal pressure (level 1), 23.924 GiB guard-available memory**, with no unreadable live user-workload footprints in the measured union. The conservative mixed user CLI/Orca/browser union is **14.982 GiB**, not a pure agent-owned allocation; with the proposed 0.5 GiB canvas server and 1 GiB control/existing-tab allowance it projects **16.482 GiB**, so that conservative canvas admission remains **DO NOT ADMIT** under the unchanged 15 GiB ceiling. Evidence: `.tmp/session-hygiene-20261117/post-restart-admission.json`; this sample predates Hamlet resumption and is not a fresh launch grant. Root-owned terminal login shims are identified system infrastructure, not unknown agent jobs; whole-system headroom still includes them. The pressure warning has cleared. Further passive attribution is allowed; no additional session closure is authorized. No fresh census, cleanup, threshold change or job launch is authorized by that sample. The resumed user-interacted blocker-audit session stays protected; retiring it alone would not establish admission. Main default suite and N-01 execution remain unrun. A native default-suite worker stopped before launch; its encrypted follow-up delivery failed, not the suite. Main's nested-worktree architecture-scan fix has focused 3/3 and source-review evidence only; the full rerun remains unrun diagnostic evidence, not an automatic implementation hold or retry task. Article `text-[10px]` and `HA_Spinner` `animate-spinner` checks remain owner-deferred. Read-only work and separately authorized docs/test preparation can continue.
- **DOC-01, owner-authorized consolidation:** merge this plan and `docs/To-Do List.md` into one current all-scopes plan/progress source, then consolidate docs and agent-serving entrypoints. Through Undine, retained auth returned a concrete plan and 575 coverage units (570 original-source units plus five status overlays); Hamlet returned an 850-surface/1,799-static-reference inventory and sixteen draft files: zero SAFE deletions. Independent input and exact-v2 source reviews returned **CORRECTIONS REQUIRED**, not acceptance. Main's exact-v5 candidate corrects notification evidence chronology, task-relevant current routes and review-status freshness; the dated about-2026-12-04 Unlock target remains NEEDS OWNER REVIEW for applicability. Both original review reports are preserved. The competing custodian-board queue is being replaced in the candidate by an exact historical capture and anchor-preserving pointer; the progress map belongs in the single plan. Main verified 163 current/historical routes, coverage destinations and the proposed README's 27 ordered script rows statically, without execution; Exact-v5 independent source review returned **SOURCE-ONLY PASS** (task `task_6367765c0ece`, manifest `6d34a84d8d0c3866f9088e39a990af8bd15f720d213a744bc8da3504183b1621`), closing the identified source findings without rewriting either earlier CORRECTIONS REQUIRED report. Adoption remains held for rendered-anchor and actual inbound/dynamic-consumer checks; source-only PASS is not live/runtime/production acceptance. The remaining-14-document supplement v1 also returned CORRECTIONS REQUIRED; its separate v2 now has bounded SOURCE-ONLY PASS (task `task_7a949aa23322`): 13 KEEP, one deployment-README candidate changing only three navigation spans. The historical 7b link now targets the original archive directly, and the unchanged Tour vision has an explicit owner-first authority caveat in its classification. All commands/procedures/generated blocks and all 14 sources remain unchanged; the mistaken preliminary 13-absent claim is invalid/retracted, not source loss. The exact combined v6 received bounded SOURCE-ONLY PASS (task `task_d1808b0de950`, manifest `0069b85cf8a5439341887594660313d814785fefd42e2d25c093c1cfbf7b4d61`): all 25 candidate/current-source pins, 16 captures, 414 static links and the integrated navigation/status/authority delta were checked. This is not adoption, actual target-renderer/inbound/dynamic-consumer proof or moving-file approval. Migration stays held at those remaining checks. A scoped stateless GitHub render-only check for 13 Markdown surfaces has been requested from the owner but is not approved or executed; local rendering/Plan Canvas remains resource-held. No new job, browser, cleanup or external write follows. Exact pre-migration plans are preserved in `docs/archive/planning-20261117/`, with original link bases/hashes; these are historical captures, not current parallel plans. Main remains sole plan/checkout writer. Candidate destination is `docs/PLAN.md`; until reviewed migration, this file still governs mechanisms. The owner-requested Plan Canvas is not open. The 17 Nov 03:58 UTC pressure warning is historical and has cleared; use the fresh dated resource evidence above. The owner-approved Independent Reviewer closure completed with zero recorded process survivors; its worktree, branch and final report remain intact, and its Dispatch chain stays closed. Main resumed the existing durable run after verifying its new terminal identity. Hamlet is restored as a checkpoint-only conversation, not a restarted implementation job. No canvas/browser or application workload launched. Frozen v6 is unchanged; this status-only delta must be reconciled before migration. The owner separately authorized a main checkpoint commit and push; that does not activate the unadopted candidate or grant deployment authority. Preserve all task IDs, explicit decisions, unresolved requirements, financial safeguards and exact historical captures; no new source/config/dependency/provider/deployment authority or broad deletion follows.
- **Latest relayed owner decisions (17 Nov; implementation/runtime acceptance pending):** Undine's `msg_9c1d7c4f1987` relayed welcome idle wording = "Uncertainty while idle" and entrance = "Visible SSR, full-motion enhancement", superseding the earlier presentation hold. Next, `msg_137a15d03aed`, relayed by main in `msg_e60081b3e71f`, selected "Keep hidden initial content". The latest owner quote, **"Actually, if its possible i prefer SSR.."**, from `msg_c590d8b11ebe` (Undine relay `msg_1aed18679ab6`; main confirmation `msg_a7fba3da69bf`), supersedes that hidden-initial choice: **visible SSR if feasible, with full motion**. Idle wording remains **"Uncertainty while idle"**. Feasibility assessment and no-JS, failed-hydration and actual live behavior remain unproved; do not replace this conditional preference with implementation or runtime acceptance. Route welcome/auth work to the retained auth owner through Undine/main; the full-motion policy is unchanged. The owner also requested notification Escape and minimal Help heading contrast fixes, routed through main/Undine to the original recovered Hamlet conversation. Undine's read-only triage, relayed in `msg_e60081b3e71f`, reports Escape behavior already exists in Hamlet's dirty Base UI Popover WIP/tests; do not duplicate listeners/tests or claim a new fix. Its proposed Help delta is only `PageFrame`'s `text-neutral-100` to `text-foreground`, pending separate owning-checkout validation. Notification focus/Escape and Help remain separate scoped UI-lane work, not implementation granted by this checkpoint. Palette/mark/logo/font/timing holds remain; neither agent rationale nor static renders prove human or live acceptance.
- **Full design/UI programme packet received, not accepted (17 Nov):** main `msg_d098b15bd428` relays Hamlet `msg_cc39e78316f9` and the owner's restoration of the full design/UI scope, not only N-01. Packet in the owning Hamlet checkout: `.tmp/hamlet-design-programme-status-20261117.md`, relayed SHA-256 `a6d821c0b8038036c860f723db752bd1ac6426282338225e3479b48cdc9b062e`, plus `.json`, relayed SHA-256 `581e42155289e1842b2f15c36d72400132297389ea45f9386b377550b3716a85`. This checkpoint records receipt only: all 64 F/S/C/P/D IDs await source-only reconciliation into the one plan after the checkpoint, preserving decision provenance. No second launch queue, implementation/design acceptance, whole-branch merge, main font/palette overwrite or automatic translation follows; pending owner holds and runtime/live gates remain distinct.
- **Next:** guest invites and Tickets (a free launch Ticket per Signet holder; invite Tickets go to the member, cap 2 as a setting; unused invites refundable; capacity counted by Tickets); then the NFC card; then refunds in the admin.
- **Dropped today:** our own door page, replaced by Unlock's EVENTS app.
- Polygon is still refused in code until you approve it.

The branch rules are on Rules. Your decisions, answered items, the change log and finished cleanups are on History.

## Owner feedback after the plan review (17 Nov 2026)

Source: the owner pasted four recovered Canvas annotations into retained conversation `01a1e837-de80-7cb0-a35f-3339c6e4cce2`, then directly specified printing, the premium tier and the intended returns policy. Exact owner text and original annotation anchors are retained privately in `.tmp/docs-consolidation-main-20261117/approved-review-v2/feedback-recovery/owner-product-annotations-20261117.json`. This is newer owner input, not a Canvas approval, activation of the frozen draft plan or acceptance of an implementation. Keep the older financial/product history below intact; the new product proposal must be reconciled before implementation rather than silently treated as the old one-offer model.

- **Purchase-intent routing:** signup naturally continues into order/payment only when initiated through an action with clear purchase intent. Do not turn standalone account creation into an unsolicited checkout funnel.
- **Presentation hierarchy:** the sales/product page sells the complete package confidently through its real benefits. The order screen is a straightforward selected-edition/SKU, quantity and total presentation, not an explanation that the book is the main product or the key a free gift. Supporting technical/contractual detail belongs in an appropriate terms context; this does not authorize hiding material purchase conditions, inventing a non-refundable policy or omitting required disclosures. This is direction, not approved final sales copy.
- **Three-variant product direction:** retain the owner's proposed book-only tier at **KRW 35,000**; **édition personnelle at KRW 82,000**; and a third, premium tier at **KRW 329,000**. The personal edition adds a cover personalized to the purchasing member, now explicitly by **printing**; a yearbook place with name, quote and a submitted image subject to editorial approval; a permanent yearbook slot and proposed future-event priority-seat benefits (not an unspecified perpetual membership term); and the complimentary membership plate/bound membership token offered for this release only (the offer is time-limited; no plate/token expiry was specified). Customer-facing positioning describes those benefits, not NFT terminology. Do not invent the standard book's personalization, guaranteed event admission, a finished yearbook/privacy contract or membership-plate payment capabilities.
- **Premium tier, concept only:** the KRW 329,000 option adds a **dedicated metal plate**, intended to be **tap-to-pay ready and transportation-usable**, with **one free replacement**, in addition to the personal edition's proposed benefits. The owner explicitly says not to detail this now. Its name, issuer/payment/transit support, hardware, credential separation, fulfillment and replacement conditions remain unspecified/unvalidated; no provider, credential, payment, hardware-order or launch action follows.
- **Returns policy intent, not legal acceptance:** the owner intends personalization to justify refusing returns. Record that intent faithfully, but do not turn it into a validated blanket no-returns rule. Determine which variants are actually personalized, the applicable disclosure/consent and cancellation conditions, and required defect/damage/incorrect-item remedies before policy publication. The KRW 35,000 book-only proposal is not automatically covered by a personalization exception.
- **Stronger membership binding requested for assessment:** the owner's question about binding more securely/tightly challenges the existing shared wallet-owner-key/salt build choice; it does not approve it. Retained auth, through Undine/main, should assess account-to-wallet authorization, per-member key isolation, compromise scope and legitimate recovery against the actual design. Do not implement an unreviewed replacement, make passkeys phone-gated, infer portability/ADR/security acceptance or silently choose custody/recovery policy.

**Source answer to the binding question, not a new work gate:** the retained auth assessment, independently checked by Undine (relay `msg_be01073c5ccd`), confirms that the current Safe configuration has one configured owner and threshold 1 for all predicted member Safes. Per-member salts give distinct addresses, not independent signing authority or private-key compromise isolation. Existing member/chain binding is useful, but changing the configured owner does not rotate already-reused wallets. Stronger independent ownership isolation is possible; per-member independent keys and threshold/co-signing choices have different custody/recovery/availability tradeoffs and remain unaccepted alternatives. Do not silently mandate passkeys, implement rotation/migration or block the existing passkey fix on this separate design question. Source assessment SHA-256 `b1dc316d4a12c08b8a922a268366b9ea81feb38ac9fb608590ef77ab66ad0be8`; no actual custody key was loaded or provider called.

**Existing local execution is not waiting for parent routing recovery:** after the parent was temporarily absent from live inventory, original Hamlet reports the owner's explicit `Delegate the local lane here` instruction (`msg_e2aee9753473`, corroborated by Undine `msg_cc052df5edde`). That retained session owns its bounded serial local implementation/test lane, subject to fresh resource admission, WIP preservation and independent review; this is not global scheduling takeover, a competing main writer or browser/install/provider/deployment permission. Undine withdrew its overbroad no-project-env-read prerequisite (`msg_18761adea02d`, `msg_ca38cffb2dbf`): the real loader trace remains evidence, but no wrong disposable-DB target or unauthorized provider effect was demonstrated. Keep concrete target/configuration/external-effect checks for the relevant DB work, not a new hermetic-loader redesign or a global UI/passkey gate.

**Recovered coordination and corrected approvals:** the original coordinator is again live as `MAIN COORDINATOR`, terminal `term_151760c1-562e-45de-99c3-e331e446b92e` (own identity recovery reported in `msg_f4a8a7f51728`; it alone rebinds its own coordinator Run). Main maintenance remains the sole main writer. The same relay corrects stale summaries: Canvas was already owner-approved; Arc UI module CSS is explicitly 100% approved within that scope; and the mobile shell must port the owner-selected Hideaway source, not the coordinator's abandoned proposed composition. Preserve those decisions without treating them as blanket CSS exceptions, a whole-history merge, reviewed integration, or live acceptance; do not interrupt existing owner-authorized work.

These updates route commerce/mechanism feasibility to the retained auth owner and product/page presentation to original Hamlet through main/Undine. They create no competing work queue and do not release existing source/security/resource or owner-decision gates. No implementation, commercial publication, plan adoption, commit/push or deployment is accepted by this status update.

### DS05 display integration (18 Nov; source only)

Maintenance integrated the reviewed Auth v3 and Hamlet v2 packets together
over the UI checkpoint: native edition registration, legacy offer isolation,
the display projection, and the actual Shop consumer. See
[ADR-0023](../../adr/0023-native-variants-own-edition-identity.md) and
[ADR-0024](../../adr/0024-book-presentation-consumes-authoritative-editions.md).
Edition purchase and publication are not enabled by this source intake.

Next: Maintenance and Auth reconcile generated Payload types, schema, admin
import map, and an unapplied migration/snapshot/index. Review the generated
diff and compare it with the separately admitted read-only PG inventory before
runtime. No generation, DB access, tests, or browser acceptance in this intake.
The later quote, reservation, settlement and edition-specific benefit contracts
remain Auth-owned; unapproved prices, terms and premium details stay unpublished.

### Later: Payload roles and visibility (impact only; owner decision pending)

The private review owner retains existing CMS access. For later multi-person
staffing, consider Payload collection and field access for enforcement, with
role-aware `admin.hidden` only for navigation. Hiding a collection does not
deny REST or relationship reads. Do not change roles or permissions yet.

| Proposed boundary | What changes or needs replacement |
|---|---|
| Only admin reads Users | Staff and editors lose collection-wide account lookup, export and relationship population. Team editors need an admin to link accounts or a narrowly scoped eligible-account picker; preserve the public roster projection and its consent requirements. Check Track contributor lookup and membership support before removing access. |
| Only admin reads Orders | The base `orderAccess` grants CMS staff reads, but the mounted ecommerce Orders override and fulfillment mutations are already superadmin-only. Check any remaining legacy reads, exports and fulfillment screens. If staff must pack, ship or accept returns, provide a scoped fulfillment view/action with only the necessary shipping data, not full order access or refund authority. |
| Editor edits content | Editors keep Home drafts, product copy, Team, setlist and track editing as approved. Home publish/fallback and product/commerce publication and inventory controls have separate restrictions today; decide those explicitly rather than broaden them with an editor role. |
| Staff performs fulfillment only | Staff would lose broad content writes and Users access. Decide required order lookup, shipment/tracking/return actions and support visibility; review door operations separately. Preserve customer self-reads where allowed and leave payment, wallet and refund authority unchanged. |

Require route/relationship projections and explicit role regression tests before
changing any permissions, including admin UI and direct REST, and verify that
provider and customer actions remain separate from CMS authority.

## Work order for this branch

**Historical work order.** The [21 Nov road to launch](#road-to-launch-21-nov)
supersedes the old post-launch scheduling for checkout, refunds, invites, keys,
NFC and sandbox work. Item numbers and functional descriptions are retained
for cross-reference; Signet transfer remains backlog.

4. **Standard checkout:**
   - one payment ID per attempt, reused when the buyer resumes;
   - the server re-reads the payment and checks the exact amount;
   - one order per payment;
   - a settle step that is safe to run twice;
   - the webhook only triggers that settle;
   - a periodic re-check job.
5. **Delete the dead weight** once step 4 works: the I2 reconciliation machinery and anything else listed under Bloat on the History tab.
6. **Refunds.** Done manually from the admin through PortOne's cancel.
7. **Guest invite.** A separately paid invite that skips the membership gate. Unused invites are refunded, and offline corrections are made by hand. Members-only: the member pays and receives every QR; the cap is a setting (2 for now).
8. **Unlock keys.** We control each member's Safe; it is created at payment and Signet is granted to it at once. Every Signet holder gets one free launch-event Ticket. Guest-invite Tickets go to the member who paid.
9. **NFC.** The card is bound to the account. Its first tap opens the welcome page and adds a passkey on that phone; later taps show membership. Door check-in is the QR, not the card.
10. **Move a Signet to a member's own wallet** (lock manager, on request). Backlog; not built yet. Signet stays non-transferable; the lock manager moves it in one transaction, and it keeps its number (ADR-0011).
11. **Sandbox run.** Every path once, within the 30 test payments.

The later [21 Nov owner answer](#21-nov-owner-answers) controls PG application
timing: once the site is running.

## The flow from zero (16 Nov)

You re-laid the whole journey on 16 Nov. This section is now the reference: where an older item, ADR or the map below disagrees, this wins. Being built: the wallet at payment and /welcome (in review), and social-only sign-up (in review).

**The journey**

1. Everyone starts as a guest, staff included. There are no earlier users.
2. Sign-up is social only: Apple, Google or Kakao. The provider's email becomes the primary email and can't be changed. A secondary email is out of scope for now.
3. After that, members sign in socially, or with an email code once registered. Passkeys are recommended, and can be added or removed in settings; they are never required.
4. Phone verification comes next (the code service is plugged in later).
5. Order and payment, through the standard checkout. The book is the main product.
6. Once payment is confirmed, we create the member's wallet, a Safe that we control, bound to the account, and grant it the one Signet. Signet is a free perk that comes with the book: it can't be transferred or refunded.
7. Every Signet holder gets one free Ticket for the launch event, airdropped. Later events are out of scope.
8. Members can invite guests, up to 2 (a setting, so 1, 3 or any number works). It stays a members-only guest invite. The member pays, and every QR goes to them.
9. At the door, event staff (temps, using their own wallets) scan Tickets in Unlock's EVENTS app.
10. The NFC card is bound to the account. Its first tap opens the welcome page: a welcome, then adding a passkey on that phone, the device the member carries everywhere. After that, a tap shows membership without asking for a phone number.

**What each answer changes**

| Answer | Touches | What stops working | Kept |
| --- | --- | --- | --- |
| We control the wallet | ADR-0001, ADR-0005, item 9 | No passkey owns the wallet, and Signet no longer waits for activation | Safe address prediction, the member wallet record, the key queue |
| Signet can't be transferred | ADR-0011 | Nothing | ADR-0011 as decided |
| Free Ticket for the launch event only | ADR-0012, item 14 | Members no longer need tickets by email or purchase | Event lock, key queue. **Ours: use the [20 Nov member and guest ticket entry](#member-and-guest-event-tickets-20-nov) for the lock split.** |
| Email code for registered users only | Sign-in; the purchase sign-in rule in the repo instructions | An email code can no longer create an account. Apple and Kakao must be added | Google, email code, passkeys, phone verification |
| Staff sign up like everyone | Staff role | Nothing | Staff sign-in to the admin |
| NFC card binds to the account; first tap opens the welcome page | ADR-0003, step 9, the activation page | The card no longer opens the door | Gemini's tap verification design; the activation page, reworked as the welcome page |
| Signet can't be refunded: a free perk with the book | ADR-0009, refunds | No refund path for Signet itself | Refund hold and on-chain cancel, for the book and guest invites |
| Guest invites: member pays, QR to the member, cap 2 | Guest invite build (merged), ADR-0002, items 8, 8b, 11 | Guest pays, the 48-hour hold, Unlock emailing the guest | Members-only invite, separate paid product, settlement that skips the membership grant, capacity admission |

**How I'll build it** (my calls; say if any is wrong)

- A passkey is only a way to sign in, not an owner of the wallet. That's my reading of "we hold control".
- One owner key that we hold signs for every member's Safe, and each member's Safe gets its own address from their account. This key is a third secret, kept apart from the grant key and the lock manager key. It must be settled before the first live Signet: the wallet address is computed from it, so changing it later would strand Signets already granted.
- The Safe exists as an address from payment, and Signet is granted to it at once. It is created on chain only when it first has to act, which saves POL on every sale.
- Event lock settings: self-serve purchase on Unlock's event page turned off, so only our grant key issues Tickets; Tickets can't be transferred; the per-wallet limit set high. The cap of 2 lives in our database, so changing it needs no blockchain transaction. These settings apply to each of the event's two locks, one for members and one for guests (owner, 23 Nov: "locks indeed are twofold"; see the [20 Nov member and guest ticket entry](#member-and-guest-event-tickets-20-nov)). **Superseded 24 Nov.** Owner, verbatim: "One lock + guest label at door". One Edition I lock per event, a distinct key per admission, and staff see guest or member at the scan. The two-lock text is kept as history.

**Branches**

- Wallet activation (in review at 5d110c6, round 5; not merged): becomes the welcome page the card's first tap opens. Kept: the page, the Safe prediction and the member wallet record. The passkey it adds is a sign-in passkey; binding a passkey as wallet owner is dropped.
- Social sign-up (`codex/social-signup-20261116`, in review; not merged): Apple, Google, and Kakao behind a switch; the email code signs in registered members only.
- Door page (c55bc77, not merged): replaced by Unlock's EVENTS app.
- Guest invite (merged on this branch): stays a members-only invite; who pays, where the QR goes and the hold change.
- Each is archived once its rework has taken what it needs.

**Not in your flow** (tell me if I've read any wrong)

- Kept: the Signet deploy and POL to-dos; the key queue, stuck-grant and cancel work; the Base Sepolia check of what a second scan shows.
- Dropped: lost-passkey recovery (signing in recovers everything); the "invited" and "waitlist" member statuses, since there are no earlier users.
- Nothing open: item 17 is settled.

The structure map below still shows the old flow; it is redrawn when the wallet and sign-up slices merge.

## How it all connects

*Superseded by The flow from zero (16 Nov): the map, the journeys and the 15 Nov gaps below still show the old flow (a passkey-owned wallet, our own door page against our admissions list, guest keys by email). They are redrawn when the wallet and sign-up slices merge.*

&#91;embedded content: structure map · 15 parts across account, purchase, key and door\]

Follow one purchase along the arrows. A member, or a guest with a paid invite, pays by card. The payment settles once and records the key owed, activation grants the key, and the key gets them in at the door. Parts that work today stay as they are; new parts are added around them. Comment on any box to add, change or remove it, and I'll answer with what that affects before changing anything.

### Journeys, hop by hop

&#91;embedded content: journeys · member and guest, hop by hop\]

I re-walk this every time anything changes. A hop with no code, no decision from you, or no owner gets listed in the change log before I act.

### Gaps found walking the journeys (15 Nov)

The biggest gap is one my own plan text got wrong. It said the key is granted when the order settles. Your decision was that the member's passkey is created at activation, and the wallet address is worked out from that passkey. So there is nowhere to send a key until the member activates, and activation was meant to be the first NFC tap, which only happens after launch. As written, no member would receive a key at launch.

| Gap | Why it matters | Proposed default |
| --- | --- | --- |
| When and how a member activates | The key can't be granted before the wallet exists | Activate on the website right after payment: one passkey prompt, then the key is granted. The NFC card's first tap later links the card to that key |
| The member never makes a passkey | Sign-up allows email or Google only | Activation asks for the passkey; until then the member page says "Activate your membership" |
| Network | Lock, wallet and server signer all depend on it | **Live on Polygon (16 Nov);** testing on Base Sepolia. Polygon has no Unlock testnet ([Unlock: no Amoy support](https://github.com/unlock-protocol/unlock/issues/13429)). Base has Unlock v14 ([networks](https://github.com/unlock-protocol/unlock/tree/master/packages/networks/src/networks)), Safe passkeys v0.2.1 ([deployments](https://github.com/safe-global/safe-modules-deployments/tree/main/src/assets/safe-passkey-module/v0.2.1)) and native passkey verification, at about $0.002 a transaction |
| Guest check-in method | The door can't be built without it | Decided 15 Nov: Unlock emails each guest a QR key; staff scan it against our admissions list, with name lookup as the logged fallback |
| What the door trusts | A live chain read at the door is slow and fails offline | The door checks our database; the chain is the ownership record behind it |
| Server signer and lock | A key on the server that may only grant keys, plus a funded lock | Testnet first, with a throwaway signer funded from a faucet; Polygon mainnet, gas from your cofounder's POL |
| Manual refund of a paid key | No rule for whether the key is cancelled | Decided 15 Nov: a manual refund puts the admission on hold at once, then a separate cancel authority cancels the key on chain (ADR-0009). That authority is the owner's wallet (ADR-0008, ADR-0011), reaffirmed 24 Nov; there is no manager key on the server. |
| New code libraries | No chain libraries are installed | Decided 15 Nov: viem, Safe protocol-kit, Unlock contracts, noble ciphers and SimpleWebAuthn server (5a, 5b) |

Superseded (16 Nov: sign-up is social only and passkeys don't own the wallet). Old correction: sign-up offers only email or Google, so there is usually no sign-in passkey to reuse, and one could be reused only if it is P-256 (Codex finding). Activation makes the wallet passkey.

---

# Rules

How this branch works: who owns what, what pages may rely on, and how changes are made.

## The rule

One branch, `codex/auth-payment-nfc`, owns *how* sign-in, phone verification, payment, Unlock keys, NFC and guest invites work. Every other branch builds pages and never touches that. This document is that branch's single plan and replaces the earlier scattered ones, including the Commerce scope review.

**Current sessions (17 Nov):** main coordinator/ledger custodian uses
`run:run_bbf9450ca334`, current terminal
`term_92737470-3871-4de6-bd14-5f04074d47e2`. Undine coordinates the wallet lane
through `run:run_f7d117af78fa`, terminal
`term_257d9803-00ed-4b7e-8d13-b1372d719b66`. Retained auth owner is terminal
`term_d5d4e050-85e3-4917-a333-90aff5a63a0e` in
`~/.codex/worktrees/main-history-integration/sphmrs`; recovered Hamlet owner is
terminal `term_8f506258-cade-4757-a204-0be8bae649ac`. Only main writes this
plan or commits/merges/pushes main; auth assignments and reviewer handbacks
route through Undine, not across a fenced Dispatch. Send requests to the Run
or exact current dispatch mailbox, not bare terminals. These identities
supersede the earlier terminals, not their decisions. All subsequent session decisions are
**NON-HUMAN-REVIEWED**: prior explicit owner approval wins; formally assess
undecided historical behavior against the proposed change and affected surfaces,
then defer genuine conflicts for priority owner review while other work proceeds.
Per-pass commits and reviewed integration are authorized, not installs, providers,
pushes, deployment, credential changes or destructive cleanup. Guarded local
tests/preview require isolated credentials and fresh resource/port ownership
checks. Actual RAM is 48 GiB; keep at least 10 GiB physical headroom and the
stricter 15 GiB aggregate workload ceiling. The earlier 07:35/08:00 KST shutdown
window was a historical session constraint, not current heavy-work permission;
the current admission gate is closed as recorded above. No job may launch
without fresh resource/ownership checks and its explicit bounded grant.

- **Created** 2026-11-14 from `main` (`0770cf3`) and pushed. The rule is in AGENTS.md and the worker shared rules.
- **Owned paths:**
  - `src/lib/{member-auth, phone-verification, auth, commerce, tickets, invitation}`;
  - the commerce and order collections, and the sign-in and membership fields on users;
  - the auth, member and phone-verification API routes;
  - the purchase steps (`tickets/payment`, `shop/payment`, `shop/orders`, `shop/invitations`, `account/continue`);
  - `src/components/{Authentication, auth, commerce, tickets}`;
  - their tests.
- **Interface work is part of the branch.** Interface pieces that only exist because of a mechanism, such as the sign-in sheet, the checkout step and the key status, are edited here, not on page branches.
- **Flow:**
  - `main` is merged into this branch regularly.
  - Finished, reviewed slices merge back to `main`; I do that.
  - Any worker on this mechanism work starts from this branch.
  - Nothing lands on `main` directly.
- **Already in flight:**
  - The Sunday build's payment mode, one unit per purchase and membership-on-payment changes come here.
  - The production sign-in work comes here too.
  - The Sunday build's business-info global, policy pages and footer go straight to `main` as page work.

## What pages may depend on

Page branches only see the states below. However authentication or payment works underneath, a page needs only to know which state the visitor is in.

| Track | States a page can show | Where a page reads it |
| --- | --- | --- |
| Account | Signed out · signed in; membership: applicant, invited, approved, waitlist, suspended, staff | the existing session helper and `users.membershipStatus` |
| Purchase | Not purchased · pending · paid · failed | the order for this visitor |
| Key | No key · awaiting activation · issued · card linked · checked in | the visitor's ticket or key record |
| Invite | No invite · invite to pay · paid invite · used | the invite record |

If a page needs a state that isn't listed, add it to the request list below instead of building it on the page branch.

**Requests from page work:**

- **Products: a 'featured' flag (UI-Commerce, 24 Nov; low priority; needs the owner's OK).** A checkbox in the product's page fields (`page.featured`, boolean, default false, editable in the admin). `/shop` lists only featured products under "New and featured"; every product stays on the shelf. It changes the products schema, so no one builds it before the owner agrees.

## How changes are made

This plan is never final. It changes whenever you realise something, without anything being rebuilt from scratch.

1. **You say it.** Comment on a box, write here, or tell me in chat.
2. **I write its impact first,** in the change log on the History tab: which parts it touches, what would break, and what stays as it is.
3. **You confirm or adjust.**
4. **I make the change,** check that everything else still works, and update the map.

Parts that work stay. New parts are added around them, and nothing is replaced wholesale unless you decide to replace it.

## Working with Gemini and Claude in step

There is one source of truth: this plan, and its decision ledger in particular. Both assistants read it, and only you change what counts as decided.

1. **Shared copy.** This file is the plan, in the repo at `docs/qa/auth-payment-nfc/`, where every assistant can read it. The live doc was retired on 17 Nov; when a diagram changes, edit its `.source.txt` and re-render its PNG.
2. **Gemini's ideas go to an inbox,** not straight into the plan. Save each session's output as a file in `docs/qa/auth-payment-nfc/inbox/`, one file per topic. Gemini can write it there itself.
3. **I take in each inbox file** the same way as your own changes:
   - I note where it agrees with the ledger, where it conflicts, and what it would affect or break;
   - I add that as a change-log entry and mark the file taken in.
4. **You confirm, and only then does it enter the ledger.** Until then, ideas from either assistant are proposals.

---

# History

What is settled: your decisions, answered questions, the change log and finished cleanups. Nothing here needs action.

## Answered from Waiting for you

Ticked items, kept as they were answered. Their decisions also sit in *Your decisions so far* below.

**Unlock build**

- [x] **3. How do guests check in?** Guests have no card or wallet, and today's guest code still requires an account, against your email-only decision. *Proposed:* Unlock emails each guest their key as a QR code, so we send no email ourselves. At the door, staff scan that QR and it is checked against our admissions list; failing that, staff find them by name and the check-in is logged. Door staff use the staff sign-in. (ADR-0007)

**Unlock build, next**

- [x] **9. Three wallet details for activation.** Plan: `docs/qa/auth-payment-nfc/member-wallet-activation-plan.md`.
  - **Where activation appears.** Decided 16 Nov: its own page. Activation is one deliberate passkey prompt on the device the member will carry, and it can fail on some computers (Windows Hello may not support it, so they switch to their phone), which needs room to explain. Decided: one page, linked from the order confirmation, the payment email, the account page and the card's first tap. It stays out of checkout, so paying never waits on it; the key simply waits until they activate.
  - **Lost passkey.** Decided 16 Nov; nothing is built for it yet. A social sign-in always stays available. Recovery: every member keeps Google (or email) sign-in alongside any passkey, so losing a passkey never locks them out of the account. To get the key back, they sign in that way, make a new wallet passkey on the activation page, and we cancel the old key and grant a new one to the new wallet. Social sign-in proves the account, not the old wallet, so the old key is cancelled, never moved.
  - **Who pays to create a member's Safe.** The Safe only needs creating when the member first uses it themselves; keys and the door don't need it. *Decided:* you pay, funded with POL from MetaMask (not OKX). Nothing is created for now; a member's Safe is created when they first use it.
- [x] 8b. Guest invites, after your answer. A member sends the invite and picks who pays. When the guest pays, they pay from the invite link without a Sophomores account. Does an unpaid invite hold a place at the event? Decided: it holds a place for 48 hours, then lapses and the member is told; nobody is charged. The member can send a new one.
- [x] 10\. Test network. Base Sepolia stays the test network, and the test signer is funded. Now that live is Polygon (ADR-0010), tests and live run on different chains. Proposed: install Foundry's anvil, a free tool that runs a private copy of Polygon on this Mac with its real Unlock and Safe contracts, and do one last check there before the first live grant. It spends no POL. Your answer: yes, but not now; it waits until after the key launch, and tests run on Base Sepolia until then.
- [x] 11\. Testing Unlock's emailed guest keys. This runs once the guest invite build is merged. The test sends a real QR email from Unlock to one inbox, on the test network. Decided 16 Nov: the concierge inbox, concierge@sophomores.co.
- [x] 12\. If a Signet can be transferred, what does the new holder get? Today membership belongs to the account that paid, and the door checks our database (ADR-0007), not the chain. So a transferred Signet changes nothing at the door: the original member still gets in and the new holder doesn't. Decided 16 Nov: Signet is non-transferable at launch, so the question doesn't arise; transferable tiers may come later. If you want membership to follow the token, that means the door reads the chain owner and accounts get linked to whoever holds it, which is a separate build after launch.
- [x] 13\. Approve one package for the door scanner? iPhone Safari can't read QR codes with the camera on its own, so on an iPhone staff would have to paste the link or use a hardware scanner. Proposed: jsqr 1.4.0 (Apache-2.0, published April 2021, about 280 KB, no dependencies), so the door page can scan with any phone's camera. Your answer (16 Nov): not needed. Members get a QR too, and it is their main check-in (16 Nov). Direction (16 Nov): check-in runs on Events by Unlock, not our own door page. Staff are added as verifiers, connect a wallet in Unlock's EVENTS app, and scan with the phone camera; Unlock records the ticket as used. Each event gets its own event lock, and only paid holders get a ticket, so each QR is one entry. To confirm on Base Sepolia before relying on it: what a second scan shows, and that an airdropped ticket emails its QR. **Ours: the one-lock and paid-only ticket assumptions are superseded by the [20 Nov member and guest ticket entry](#member-and-guest-event-tickets-20-nov).**
- [x] **15. Event capacity.** Yours to decide (16 Nov). Entry is checked by Ticket, not by Signet. Each member can hold at most 1 + the guest cap in Tickets: their free one plus one per guest. The build counts Tickets against the event's capacity without assuming any number.
- [x] **16. Non-refundable Signet.** Decided (16 Nov): Signet is a free perk that comes with the book, which is the main product, so there is nothing to refund on the Signet itself. If the book is refunded, its Signet is cancelled through the existing refund path.
- [x] **17. Smaller gaps.** Decided 16 Nov:
  - An Apple relay address becomes the primary email. That's how it is.
  - Kakao is built so it can be switched on or off. If Kakao's review isn't passed, it stays off; nothing else changes.
  - Email-code sign-in works with the secondary email too, since adding one means verifying it. Later the same day: the secondary email is out of scope for now.
  - Guest invites are refundable if unused.
  - A dead phone at the door is out of scope.

**Other open decisions**

- [x] **Product name.** I dont fucking know give me recs. Rejected so far (15 Nov): Good Standing, Legacy Admission, Tenure, The Varsity Letter, Deferred Admission, Honorary Degree, Associate's Degree, The Diploma, Degree Conferred, Bachelor of Letters, Terminal Degree, The Charter, The Endowment, Matriculation, Undeclared, Founders' Edition, Yearbook, Hall Pass, Enrolled, Roll Call, Standing, Credit, Transcript, Second Year, Sophomores, House Key, Room Key, Late Checkout, The Tab, The Regular. Ruled out: anything tied to an issue or edition, since the token outlives the issues; anything too "extra".

**Your to-dos**

- [x] Fill in the business info page in the admin. The footer and policy pages appear once it's filled. Given 15 Nov: trade name RESTORED PROJECTS, business registration number 753-32-01007, business type 전자소매업. Representative 최성윤, phone +82 10 4637 9289, support email concierge@sophomores.co, hosting by ITEASY (iteasy.kr; exact legal name to copy from their footer). No mail-order sales registration number: simplified-tax businesses (간이과세자) are exempt(check). Business address: 서울시 송파구 올림픽로4길 15. Only ITEASY's exact legal name is still missing.
- [x] Check whether the old ticket code is still needed. Your answer (15 Nov): keep it, but move anything live (the payment-ID helper the shop borrows, and the /tickets/payment page) into the folders where it belongs.
- [x] Send Base Sepolia ETH from a faucet the test signer 0x546804508ba4848a571e300a6bf440d72fbb67b8. The throwaway signer never holds real money.
- [x] Fill in the sign-in provider fields in `.env.local` (in `~/Projects/sphmrs`): Google, Apple and Kakao. Done 16 Nov; the custodian checked every entry is well formed, without reading the values.

**Work order: done by Sunday, 15 Nov**

Sunday needed only two slices: sign-in on sophomores.co, and live card payment that grants membership.

1. **Sign-in on the real domain.** Registration and login accept `https://sophomores.co`, with secure cookies and a hosted database. Local development is unchanged. **Done:** merged into this branch on 2026-11-14 (`86b247d`). Shop checkout now accepts the real domain too. At deploy, the proxy must pass `https://sophomores.co` through as the request address.
2. **Live card payment.** Test or live mode comes from config; one unit per purchase; membership is approved inside the same transaction as the order. **Done:** merged on 2026-11-14. Still to check on the real site: the one-unit add and remove control, which needs a published product and a signed-in member.
3. **Merge both to `main`** after a light review, so the deploy carries them. Done: main is at dfb2e4c. Typecheck is clean, and the full suite shows only the 2 known styling failures.

## Your decisions so far

This is the ledger everything else is checked against. A decision you made explicitly wins over anything an agent wrote; if two of yours conflict, the later one wins. Anything not on this list is a proposal, and when it conflicts with something else, I bring it to you.

| Date | Decision | Where you said it |
| --- | --- | --- |
| 2026-11-14 | Mechanisms live on one branch; the plan is iterated, and I check impact before every change | Chat |
| 2026-11-14 | Finished branches are merged and deleted right away; stale ones are deleted | Chat |
| 2026-11-14 | Quiet live launch on sophomores.co by Sunday, replacing Hideaway and LOSTINSEOUL on the VPS; the domain already points there | Chat |
| 2026-11-14 | You manage description, pictures and price in the admin; design and layout stay fixed | Chat |
| 2026-11-14 | Standard checkout pattern, as other companies do it, instead of the I3–I6 machinery | Chat |
| 2026-11-14 | One unit per buyer | Scope review comment |
| 2026-11-14 | Payment grants membership | Chat |
| 2026-11-14 | Customised product, so no returns; this is not tied to activation | Scope review comment |
| 2026-11-14 | The guest invite is a separate paid product that skips the membership gate. Unused invites are refunded, and offline corrections are made by hand | Chat |
| 2026-11-14 | Guests are email-only, through Unlock | Scope review comment |
| 2026-11-14 | Member wallet: Safe with a passkey owner, not Kernel | Unlock × NFC plan comment |
| 2026-11-14 | NFC: first tap activates, then the card is the check-in credential. Activation moved to the website on 15 Nov (below); the first tap now links the card | Unlock × NFC plan comment |
| 2026-11-14 | Perks stay as package detail | Scope review comment |
| 2026-11-14 | Bank transfer is separate from the PG route | Chat |
| 2026-11-14 | Delete dead weight once its replacement works | Scope review comment |
| 2026-11-14 | Live-readiness work: just implement, with no Santa review | Scope review comment |
| 2026-11-14 | PG through PortOne 바로오픈 (KG Inicis); you file the application once production is confirmed, before Monday | Scope review comment |
| 2026-11-14 | Payload code lives in `src/payload/`; the three Payload root files stay at `src/` | Chat |
| 2026-11-15 | Build the key-grant record at payment now: light tests, no installs, nothing on chain (ADR-0004) | Ticked 15 Nov |
| 2026-11-15 | Members activate on the website right after payment; the card's first tap later links the card. This replaces the activation part of the 14 Nov NFC decision (ADR-0005) | Ticked 15 Nov |
| 2026-11-15 | Network: Base, tested on Base Sepolia (ADR-0006) | Ticked 15 Nov |
| 2026-11-15 | Guests: Unlock emails each guest their key as a QR code, so we send no email ourselves. Staff scan it against our admissions list; name lookup is the logged fallback. Door staff use the staff sign-in (ADR-0007) | Ticked 15 Nov, with your edit and comment |
| 2026-11-15 | A manual refund puts the admission on hold at once, then cancels the key on chain through a separate cancel authority (ADR-0009) | Ticked 15 Nov |
| 2026-11-15 | Test network: viem and Safe's passkey SDK (exact versions shown to you before install), a throwaway grant-only signer, and a test lock on Base Sepolia; mainnet after Bithumb funding (ADR-0008) | Ticked 15 Nov |
| 2026-11-15 | Light tests: one end-to-end test per journey, plus checks on the grant step | Ticked 15 Nov |
| 2026-11-15 | Sunday: go live quietly without keys; keys follow once Unlock is ready. Switching the server still needs your go | Ticked 15 Nov |
| 2026-11-15 | Card only at launch; bank transfer is out for now | Ticked 15 Nov |
| 2026-11-15 | One refund rule: no refunds after purchase except by hand. This retires the four conflicting rules | Ticked 15 Nov |
| 2026-11-15 | No cancellation window before shipping; requests are handled by hand | Ticked 15 Nov |
| 2026-11-15 | Cancelled event: full refund through PortOne, started by you from the admin | Ticked 15 Nov |
| 2026-11-15 | No member offer to guests at launch; revisit after the first events | Ticked 15 Nov |
| 2026-11-15 | Gemini's NFC tap proposal accepted with the six corrections. Tap signatures are verified with a CMAC library (exact package shown before install) | Ticked 15 Nov, and comment |
| 2026-11-15 | Install viem, Safe protocol-kit, Unlock contracts, noble ciphers and SimpleWebAuthn server as direct dependencies (5a, 5b) | Chat |
| 2026-11-15 | Members send guest invites and choose who pays: the member or the invited guest (8) | Chat |
| 2026-11-15 | A social sign-in always stays available alongside passkeys | Chat |
| 2026-11-15 | An unpaid guest invite holds a place for 48 hours, then lapses and the member is told; nobody is charged (8b) | Comment |
| 2026-11-15 | You pay to create members' Safes, funded with POL from MetaMask (16 Nov; was OKX); a Safe is created only when its member first uses it (9) | Comment |
| 2026-11-16 | Base Sepolia is dropped as the test network, because its faucets require mainnet ETH | Chat |
| 2026-11-16 | Base Sepolia stays the test network after all: you funded the test signer from Coinbase's faucet, with no mainnet ETH needed (0.0001 test ETH, checked 16 Nov; at current gas that covers the test lock and dozens of key grants). This replaces the row above | Chat |
| 2026-11-16 | Activation has its own page, linked from where the member needs it; paying never waits on it (9, ADR-0005) | Chat |
| 2026-11-16 | Live keys run on Polygon, not Base. Testing stays on Base Sepolia, because Unlock has no Polygon testnet. This replaces the live half of the network decision (ADR-0006). Bithumb withdraws ETH only on Optimism and Arbitrum, not Base; the live signer's gas is your cofounder's POL | Comment |
| 2026-11-16 | The emailed guest-key test goes to the concierge inbox, concierge@sophomores.co, on the test network (11) | Chat |
| 2026-11-16 | The members token is called Signet, and its keys never expire | Chat |
| 2026-11-16 | Signet keys are non-transferable at launch; transferable tiers may come later (ADR-0011) | Chat |
| 2026-11-16 | Members get a QR code, and it is their main check-in at the door. The door scanner package (13) is not needed | Comment |
| 2026-11-16 | We control each member's wallet. It is created when payment is confirmed and bound to the account; passkeys are optional. Replaces the passkey-owned wallet (ADR-0001) and the activation step (ADR-0005) | Chat |
| 2026-11-16 | Sign-up is social only (Apple, Google, Kakao); the provider's email is the primary email and can't be changed; an email code signs in registered members only | Chat |
| 2026-11-16 | Signet stays non-transferable, and is non-refundable | Chat |
| 2026-11-16 | Tickets are separate from Signet. Every holder gets one free Ticket for the launch event; later events are out of scope. A holder can buy up to 2 extra Tickets (a setting), pays for them, and gets every QR. Replaces the named guest invite (ADR-0002) | Chat |
| 2026-11-16 | Everyone starts as a guest, staff included. Site staff sign up like everyone and get the staff role; event staff are temps who scan with their own wallets. The NFC card binds to the account and shows membership | Chat |
| 2026-11-16 | The activation page stays, usable on its own. The card's first tap opens it for a welcome and to add a passkey on the phone | Chat |
| 2026-11-16 | Guest invites stay a members-only feature; only parts of the flow and business logic change. Event capacity is the owner's call, and the build stays agnostic. Signet is non-refundable because it's a free perk with the book, the main product | Chat |
| 2026-11-16 | Apple relay addresses are accepted as the primary email. Kakao is built behind a switch and stays off until its review passes. Email-code sign-in works with a verified secondary email. Guest invites are refundable if unused. A dead phone at the door is out of scope | Item 17 |
| 2026-11-16 | Entry eligibility is the Ticket, never the Signet. Each member holds at most 1 + the guest cap in Tickets. Refunding the book cancels its Signet | Items 15 and 16 |
| 2026-11-16 | The secondary email is out of scope for now. Email-code sign-in uses the primary email only | Chat |
| 2026-11-16 | Adding or using a passkey doesn't depend on phone verification. Phone verification still comes before ordering | Chat |
| 2026-11-16 | Sign-in buttons stay monochrome except where a provider requires otherwise: Apple in its own black or white style, Google with its coloured G, and Kakao's yellow button shown only when Kakao is switched on | Chat (relayed by the custodian) |
| 2026-11-16 | The Korean label for the Kakao button is 카카오 로그인, as Kakao's design guide prescribes (owner translation request) | Chat (relayed by the custodian) |
| 2026-11-16 | The Kakao button follows Kakao's guideline wording even though we prefer 'sign in': English shows 'Login with Kakao', Korean shows '카카오 로그인', chosen by the page's language | Chat (relayed by the custodian) |
| 2026-11-16 | Signet stays non-transferable. A member who wants it in their own wallet asks us, and the lock manager moves it: PublicLock v14 lets a lock manager transfer even when transfers are off, so it is one transaction and the Signet keeps its number. Not built yet; a backlog item (ADR-0011) | Chat (relayed by the custodian) |
| 2026-11-19 | “Reminder - there are 3 variants: 1) book only 2) book + ticket + others 3) premium version of 2. 1 doesn't even get any ticket or token; 2-3 do” Resolves [ADR-0023](../../adr/0023-native-variants-own-edition-identity.md)'s book-only eligibility: book-only gets neither a Ticket nor a token; the personal and premium editions get both. | Owner chat (relayed in `msg_ff6a6d1b8077`) |
| 2026-11-19 | “yes, cancel. release seat.” After a verified book refund, cancel the dependent free launch Ticket and release its seat only once non-issuance or provider cancellation is proved. | Owner chat (relayed in `msg_ff6a6d1b8077`) |
| 2026-11-19 | "For visual design and interaction UX : The Hideaway is the default standard; however code implementation is always NextJS + other technical doc/official sources etc that wins if it collides." Anything that is used only in The Hideaway's `/lostinseoul` route is excluded. | Owner chat (relayed in `msg_aa37ce60b200`) |
| 2026-11-19 | "all the stuff that must be provided by us - the business- should be wired to Payloadcms for convenient editing." | Owner chat (relayed in `msg_3370f57e86b6`) |
| 2026-11-19 | Keep the first Korean value (A) in all 17 fold conflicts. | Owner decision (relayed in `msg_3370f57e86b6`) |
| 2026-11-19 | Restart Undine as the money reviewer. | Owner decision (relayed in `msg_3370f57e86b6`) |
| 2026-11-19 | Split coordination into backend and frontend roles after this rebuild. | Owner decision (relayed in `msg_3370f57e86b6`) |
| 2026-11-20 | [Member and guest event tickets](#member-and-guest-event-tickets-20-nov) | Owner chat (relayed by the coordinator) |
| 2026-11-19 | "UI can be styled as needed, modified- prioritize backend work." Supersedes the 18 Nov priority order without dropping requested UI corrections. | Owner chat (quoted in the master plan) |
| 2026-11-21 | [Owner answers: sourcing, UI review, main push, auth adoption and admin setup](#21-nov-owner-answers). All 22 [retained items](#open-work-retained-by-the-owner-21-nov) marked Keep. | Owner answers to master plan sections 3–4 |
| 2026-11-21 | "all lanes, Claude only writes files". Codex sessions read and review, reporting by message only; main's single writer is a Claude Maintenance session. Widens the 18 Nov UI-workflow rule. | Owner chat (relayed by the coordinator) |
| 2026-11-22 | [Owner rulings: no blocking gates, forward-compatible orders, single membership token, editions, frame and controls, checkout, policy pages, idle Codex lanes](#22-nov-owner-rulings) | Owner chat (relayed by the coordinator) |
| 2026-11-23 | [Owner rulings: /vault, `.history` kept, mechanism branch retired, `.inbox/` ignored, headings, local database migrated, legacy tickets server deleted, 8 GB builds, two locks per event, guest ticket plan, Unlock-hosted passes, guest QR to the member, NFC launch scope, Unlock door authority, stripe.press product page, guest-ticket changes](#23-nov-owner-rulings) | Owner chat (relayed by the coordinator) |

### Member and guest event tickets (20 Nov)

**Owner, verbatim (20 Nov):**

> "Guest tickets are eligible for Part I entry but only standing and no gift; Part II with less drink benefits  (this can stay ambiguous; will be decided later)
> Members are free, and they get the full benefit as described"

**Owner, verbatim (earlier):**

> "I want to separate the 2 in price and benefit; one for the members, one for the guests. The guests are not  given gifts."

**Owner, verbatim (23 Nov), confirming the two locks:**

> "locks indeed are twofold"

**Superseded 24 Nov.** Owner, verbatim: "One lock + guest label at door". One Edition I lock per event, a distinct key per admission, and staff see guest or member at the scan. The two-lock text is kept as history.

**Coordinator implementation note (ours, not an owner quote):** Each event has two Unlock locks, one for member tickets and one for guest tickets. Design and test against two lock addresses per event; never assume a single lock. The guest ticket plan and Unlock-hosted passes were approved on 23 Nov; see the [23 Nov rulings](#23-nov-owner-rulings). The grant signer issues the free member ticket. Guest pricing is an unset sale fact for later; it does not block launch. The exact Part II drink benefit for guests stays open by the owner's choice.

**Owner, verbatim (20 Nov):**

> "Door check-in begins at 20:30"

> "Part I : 2030-2230; Part II: 2300-0200"

> "Event date is december 18th"

**Coordinator scheduling note (ours, not an owner quote):** The owner did not state a year; we take this to mean the next 18 December, Friday 18 December 2026. All times are Asia/Seoul. Door check-in and Part I start at 20:30 on Friday, so no separate door field is needed; `commerce-events.partIStartsAt` covers both. Part I ends at 22:30 (`partIEndsAt`). Part II starts at 23:00 on Friday and ends at 02:00 on Saturday 19 December; `commerce-events` does not yet have fields for it.

### 21 Nov owner answers

Owner chat: "Look at the answers in section 3. It'll contain the rest, and then go."
The quoted column preserves the owner responses verbatim. The final column
records scoped follow-through, including coordinator interpretations and
proposals where noted.

| Item | Owner, verbatim | Scope and follow-through |
| --- | --- | --- |
| 1. NFC card reader | "overseas? I'll check" | Tentative, not a purchasing decision. Korea was quoted at ₩41–47k and overseas at ₩35k in the coordinator proposal. |
| 2. Print route, LED colour, thickness, iPhone models | "iPhone Air" | Include iPhone Air in testing; no decision on the other three choices. |
| 3. Card key custody | "Sure" | Accepted coordinator proposal: the setup master key stays offline; the server holds only the tap-check key as a secret. Not a credential change or activation approval. |
| 4. NT4H2421 listing and customs code | "I'll do it there" | Owner handles this on AliExpress. |
| 5. Shop and checkout margins | "Okay let's first see B" | Coordinator options: A 16/30/30, B 20/64/15vw (UI-Commerce recommendation), C 20/48/120. Build and show B; do not land it on the strength of this answer. |
| 6. Phone bottom-bar strip | "Hideaway has a separate component that visually covers the area the same way. We're keeping the bottom menu in the bottom frame, so maybe no" | Coordinator reading: tentative no strip, with the bottom menu kept in the frame; verify in the phone browser. |
| 7. Mersi carved-frame placement | "The main product explanation could have it as the top hero" | Explore the product explanation at the top of the hero; the answer does not select frame placement for the footer, shop or product cards. |
| 8. Push main | "sure" | Approved `888b97f2` only. Maintenance verified `ac13e304` as its ancestor and the live remote tip, fast-forwarded origin/main to the approved SHA, and rechecked the remote ref. No later push is approved. |
| 9. Adopt rebuilt auth branch and retire old branch | "sure" | Accepted rebuild direction (five patches on main). Execution waits for Auth's completeness confirmation and a coordinator adoption packet; the one-branch rule has not changed. |
| 10. `codex/nav-restore` | "Check" | Coordinator check: five owner-directed Warp intro commits at `08ab5c4d`, with conflicts in three Warp files. Keep for a scoped port, not stale deletion. |
| 11. Approver and super-admin setup | "I will set it in admin" | Owner does this in Payload admin at activation; no personal addresses in the repo. |
| PortOne 바로오픈 application | "This can only be done once we have a running site" | Owner action once the site is running; replaces the earlier before-Monday wording. |
| VPS review copy | "this weekend" | 21–22 Nov, not the December window in the coordinator's draft. Timing is not authorization to deploy. |
| File authorship (owner rule) | "all lanes, Claude only writes files" | Widens the 18 Nov "Only Claude may write files" from the split UI workflow to every lane. Codex sessions may read and review, reporting by message only; main's single writer is a Claude Maintenance session. |

See the [road to launch](#road-to-launch-21-nov) for the
coordinator's proposals, separately from these decisions.

### 22 Nov owner rulings

The quoted column holds the owner's words verbatim, taken from the coordinator's
record of the 22 Nov chat (`OWNER-ANSWERS.md`, 22 Nov sections, and
`owner-quotes-ledger.md` for the frame, Help, mobile button, Codex and editions
rows, unless the row names another source). Where it says "not quoted", no owner
words are on record; the facts in that row are ours or the catalogue's. The last
column is always our reading, not the owner's.

| Ruling | Owner, verbatim | Our reading and follow-through |
| --- | --- | --- |
| No blocking gates | "Taking payment, look, we need to test everything. So I need everything to work. You know, whatever is blocked should be like, just assume stuff works and just make note of what would change if we actually do make everything work." | No sale gate: R1 becomes a note, not a guard. Anything blocked on a missing fact, provider or approval proceeds as if it works, and the lane records what changes once it is real. Unchanged: no real funds, no secrets, pushes and VPS deploys need the owner's OK on an exact version. See [ADR-0033](../../adr/0033-no-blocking-gates-assume-it-works.md). |
| No legacy compatibility, but forward-compatible | "A past paid order does not exist. I told you that. This is completely new. We don't need to consider, backwards compatibility." Follow-up: "Yeah, but another thing about it, the system itself should be backwards compatible, so that we, you know, whatever happens later on," | No migration or handling for older orders, because none exist. New orders record the rule version they were sold under, so a later rule change never breaks them. See [ADR-0034](../../adr/0034-no-legacy-orders-forward-compatible-rules.md). |
| Never "coins"; single membership token per account | "Coins one? Coins? And why do you keep on saying coins? It's not the same. Don't say coins. And it should not be coins. It should be whatever we're selling them. It would be one of the three products, which should just say the product's name." Then: "It is a single token rule. Membership token rule. That's what it is. Single membership token per account." | The rule is one membership token per account, per token type; a future token type may have its own rule. Copy names the product, or says "membership". The nine "coin" strings in `messages/en.json` (Auth-owned components) still need product names. See [ADR-0035](../../adr/0035-single-membership-token-per-account.md). |
| Editions are separate products | "You do understand what we're selling, right? How many variants we're selling? Don't tell me you forgot that." Also "each edition will actually be a separate product" (quoted in UI-Commerce's pause state, 22 Nov). Prices: not quoted. | Three products, no edition picker at checkout: book only KRW 35,000 (no ticket, no token); édition personnelle KRW 82,000; premium KRW 329,000. The prices come from the product catalogue, not an owner quote. All launch together ([ADR-0031](../../adr/0031-all-editions-launch-together.md)). |
| Frame and phone bar | Frame: "Wait, the bottom bar is missing on desktop, but okay, so what all I need is for the visually the frame to be four-sided. It doesn't matter by what." Shrunk windows: "That's why I was testing for touchscreens, because there could be cases where you just, you know, shrink your browser to make it smaller when you're, you know, browsing the net on your" / "on your laptop." Phone bar: "What I wanted was the bottom bar to be it should take over the frame. In terms of the role. So it should either be fucking black, as the frames are, or it should not be there at all. And it's too fucking fat right now." | Desktop frame is four-sided at every width, including shrunk laptop windows. The phone bottom bar is the frame's bottom side, black and thin. |
| Help and mobile controls | Help: "Why is the help button still saying help? I thought I wanted an icon. And it needs to be smaller. It needs to be shorter. It needs to be more subtle, too." Mobile buttons: "If the buttons on mobile are that fat because of some rule that we enforced, and we could lax it so that we visually make it shorter or thinner and still allow a wider hitbox. Just a mobile." | Help is an icon: small, short, subtle. Mobile buttons may look smaller, but keep a 44px hit area; mobile only. UI-Shell builds both in one packet on top of the black bar. |
| Checkout additions | "The phone input may be nice. It's but you know, we just set the country automatically to Korea. And confirm with undo. Yeah, maybe. Pop-up toasts are nice too. I don't need to show them in line. As a matter of fact, if there are failures during payment, it's probably better to show them as toasts." Then: "The progress bar, I agree, but maybe the progress bar could be the thing that, as long as it doesn't rerun for every step, but it, you know, like it doesn't, if I am step on step 2 and then go to step 3, it goes up, you know, goes from 0 to 2 and then 0 to 3. As long as it could go from 2 to 3, 3 to 4 like that, I think maybe the progress bar could be something." | Payment failures show as toasts, not inline; this overrides the "results inline" default for payment failures only. Phone input with the country fixed to Korea. Confirm-with-undo only where it fits. The progress bar animates from the previous step to the next, never from zero. UI-Commerce builds these in checkout rev 5. |
| Policy pages | "The terms of use page has a weird layout. I mean, the topmost part with its page title is fine, but below, it looks weird. It looks half done, too. I think we should just bring over what we did from the hideaway for using showing the policy page. I think I had a layout for them." Then: "Yeah, today's Hideaway Docs layout is good. That's not what I saw, though." (both from UI-Content's policy packet notes) | Policy pages match The Hideaway's terms type and spacing, in our font. A plain "Legal" eyebrow replaces the hard-coded `/shop` back link. Packet C is in Codex review. Open owner calls: heading weight in Helvetica, and "Legal" staying English in Korean until translated. |
| Phone bar size (correction) | Not quoted. The coordinator relayed it as the owner's exception: "36px band, 42px bar targets". | The phone bottom bar is a 36px band; its controls keep 42px touch targets. This is an owner exception to the 44px touch default and corrects the "thin" reading above. |
| Codex lanes pause when idle | "Sorry, I was saying as long as codex lanes are not busy, they should stop or pause." | Codex lanes also pause once idle. Reviewers finish only their current review; queued items wait. |

### 23 Nov owner rulings

Same columns as above. Quotes come from the coordinator's relay of the owner's choices on 23 Nov.

| Ruling | Owner, verbatim | Our reading and follow-through |
| --- | --- | --- |
| The CMS moves to /vault | "change the admin pathname from /admin to /vault." On redirecting the old path: "No redirect (Recommended)". | Payload's `routes.admin` is `/vault` and the route folder is `src/app/(payload)/vault`. Every CMS screen follows: `/vault/login`, `/vault/collections/*`. `/admin` is not redirected and simply 404s. Staff magic-link and code callbacks now point at `/vault`, so a link sent before the switch lands on a 404; asking for a new email fixes it. The unused Hideaway AdminBar links are left alone (Hideaway exclusion). Auth's `/vault` packet carries the code; this plan and the deployment docs carry the paths. |
| `.history` is kept | "I recanted the deletion and would like it kept" | The `.history` folder stays, gitignored; the coordinator restored it. The Hideaway boundary check skips it. |
| The mechanism branch is retired | "Delete it, update rule (Recommended)" | `codex/auth-payment-nfc` is deleted. AGENTS.md now says mechanism work starts from `main` in its own worktree and lands through `main`'s single writer. |
| Lane mailboxes are ignored | "Yes, ignore .inbox/" | `.inbox/` (Orca lane mailboxes) is in `.gitignore`. |
| Headings typography | "Headings follow the same rule - Helvetica with Pretendard fallback" | Headings use the body stack: Helvetica, with Pretendard for Korean. The condensed-bold fix maps each weight to a local Helvetica Neue face. |
| The local preview database is migrated | "Yes, migrate it" | Backed up first, then migrated from 10 to 23 recorded migrations. Migrations landed after that (E2's `20261122_160100`) are not yet applied locally. |
| The legacy PortOne tickets server is deleted | "Yes, delete it" | Removed from `main` (`b02f50fd`). |
| Builds get 8 GB | "Yes, 8 GB for builds" | `build:guarded` runs with `--max-gib 8`; checks stay at 4 GiB and dev at 6 GiB. AGENTS.md states the new default. Builds still run one at a time, inside the 15 GiB aggregate and 10 GiB headroom. |
| Two locks per event | "locks indeed are twofold" | Each event has two Unlock locks, one for members and one for guests. Design and test against two lock addresses per event; never assume one. The owner to-do and the event lock settings now say so. Superseded 24 Nov by "One lock + guest label at door". |
| Guest ticket plan approved (recipient revised below) | "Okay, push and go ahead with the guest ticket plan and use unlocks passes." | NFC's plan (`msg_dd86bc386137`). When a registered guest's claim succeeds, the same transaction records one Guest Ticket grant intent. It is idempotent per admission and binds the recipient only through the verified claimant. A separate authorised worker dispatches it later. No QR or pass is shown before a matching receipt. Activation and the door resolve the lock by entitlement tier. One EVENTS event holds both locks, and capacity is shared. |
| Unlock-hosted passes | "Okay, push and go ahead with the guest ticket plan and use unlocks passes." (same message) | Wallet passes come from Unlock (Locksmith `/v2/pass/{network}/{lock}/{keyId}/ios` and `/android`), not from an issuer of our own. To confirm with Unlock before launch: what the pass route exposes (privacy), whether Google pass object IDs collide across the event's two locks, and how check-in behaves in the native EVENTS app. |
| Guest QR goes to the paying member | "Oh... hmm. Let's make it members receive the QR. The members can send it to the guests right? And we can check the QR at the door and have each qr be idempotent(not-usable-by-multiple)" | Revises the guest ticket plan row: the recipient is the paying member (the 16 Nov rule restored), not the claimant. Members pass the QR on to their guests. Each QR is single-use at the door. NFC is sending an impact note for the rest of the plan. |
| NFC launch scope | "Oh btw NFC does not have to be fully functional at first-deployment; the requisite is that our system can accommodate the NFC functinality with stress-resistant, field-ready level of security, reliability and resilience." | NFC need not be fully working at first deployment. What launch needs is a system that can take NFC with field-ready security, reliability and resilience under stress. Recorded in the road to launch (2–8 Dec row). |
| Unlock is the single door authority; phone test after preview | "2. Yes, but that will have to come AFTER we first have the site running for preview. That's when the staff will test 3. As stripe.press does! 4. yup" (item 2) | Unlock's EVENTS app is the only door authority. Every entry, including the staff name fallback, goes through Unlock; our system only reads check-in status. Staff run the real-phone single-use test (second scan, copied screenshot, name then scan, offline) once the preview site is up; it is an after-preview gate in the road to launch. |
| The product page follows stripe.press | Same message (item 3) | The product page copies stripe.press: the art / 3D book stays pinned while the purchase column scrolls. |
| Guest-ticket changes approved | Same message (item 4) | NFC's impact note (`msg_38017266dcd6`) is approved, with check-in now Unlock-only. |

### 24 Nov owner rulings

Same columns as above. Quotes come from the coordinator's relay of the owner's words on 23–24 Nov (Maintenance's mailbox).

| Ruling | Owner, verbatim | Our reading and follow-through |
| --- | --- | --- |
| The receipt PDF library is pinned to its latest version | "I liked it to be, you know, latest... If we have to fix it, I'd like to make it the latest thing that we fix it to." | The order receipt PDF uses `pdfmake` 0.3.15 and `@types/pdfmake` 0.3.3, pinned exactly (receipt r7, `2c3b2692`). Receipt r6, pinned to 0.3.11, did not land. A later bump also goes to the then-latest exact version. |
| Ticker crown and tape player are out of scope for the first release | "No , stash ticker crown. ANd also tape player. They're both out of scope for this initial release" | Removed from `src` with their own tests (reading cleanup r3). Both are kept whole on branch `xnxchoi/stash-ticker-tape-20261124`, bundled in `~/orca/archives/sphmrs-branches-20261124/`. The catalogue keys, public tape assets and `src/hideaway` stay. |
| Sleeping branches and worktrees are cleared | "we already have a bunch of commit... We have a lot of sleeping commits or workbenches too. We gotta take care of them, man." | Branch-lifecycle sweep: 133 local branches went down to about 40, and 32 worktrees to 21. Every deleted ref is bundled first in `~/orca/archives/sphmrs-branches-20261124/` (per-branch table in `SWEEP-REPORT.md` there). |
| Remote and unclear branches: read each one, then delete only when sure | "as long as archive means you taking a look at every single one of them and assessing with confidence that, you know, you either need it or you don't, and, you know, taking the appropriate measures and then deleting them maybe. If that's the case, go ahead." | Each branch was read (unique commits, diff, owning lane or decision) and given a reason with evidence. Eight remote and eight local branches were deleted after bundling. Kept: the owner's branches, `feature/product-production` until its design docs landed (now on `main` as ADR-0036–0044), and anything with unlanded work. |
| Unrecognised sleeping worktrees are removed | "There are at least 9 work trees related to this repo that I do not completely recognize and are either detached or are just asleep... just check and remove and tell me if they're not to be removed right away." | Six nested checkouts were removed after archiving their ignored proof scripts and uncommitted files. Parent lane folders and packet directories stay. |
| After a pause, every lane recovers its state first | "a lot of them were in the middle of something when we had to pause, so just make them... check back with whatever was going on up until then and ensure that they don't lose anything and locate everything they might have had. The inbox, the previous inbox, the plans, the previous plans, everything." | Each lane checks its transcript, pause notes, current and old mailboxes, `.inbox/`, this plan and its git state before resuming. Loose work goes to a named branch, never detached. |
| The FX opt-out is cleared | "Look, I'll give you the clear, okay?" | FX opt-out r3 landed (`f0396ca7`); pages may hold the FXFrame band off, and the policy pages do. |
| The sign-in recipient line reads "Code sent to" | "Yeah, code sent to member@example.com is so much bette…" (cut short in the relay) | English is "Code sent to" before the address (`c1064ec3`). The Korean value stays empty until translated; the Korean pass left it out because its English changed. |
| Personal-data pages follow standard web security | "Isn't this like web security 101? Why are we like treating this like some pioneering shit?" | Recorded in AGENTS.md ("Personal-data baseline") with the `sphmrs-personal-data-pages` skill. Reviewers fail a change that exposes personal data without the checklist's safeguards. |
| The owner's `articles/` folder is local only | Relayed by the coordinator; no verbatim quote. | The top-level `articles/` folder of example essays stays untracked: never committed, moved, formatted or gitignored without asking. UI-Content reads it to seed the local database. |
| Refunds close 3 days before the event | "Refund is only possible 3 days prior." | Refunds are possible only until 3 days before the event's Part I start, enforced by the admin refund action; a verified PortOne-side cancel is still reconciled. This refines the refund lines in [Your decisions so far](#your-decisions-so-far) (15 Nov "no refunds after purchase except by hand"; the cancelled-event full refund). Open for the content owner: the policy page copy (the Hideaway as-is draft) needs this rule. |
| Membership-included editions are not refundable; the book-only variant is | "Well, refunding the book is impossible for the main membership included one- we talked about this already. We're going to give them an entry in the magazine - personalized; it's custom-made, so it's subject to the "No Refunds" rule."<br><br>Correction, same day: "huh? no, the cheaper variant is not customized and subject to return." | Only the membership-included editions (book, ticket and the rest, and the premium) are custom-made and not refundable. This reaffirms [Your decisions so far](#your-decisions-so-far): 14 Nov "Customised product, so no returns" and 15 Nov "One refund rule: no refunds after purchase except by hand". Their personalised magazine entry is part of the edition and is what makes it custom-made. The cheaper book-only variant is not customised: it can be returned and refunded. The admin refund button covers the book-only variant (no event cutoff) and guest ticket orders (the 3-day cutoff above). An owner-initiated PortOne cancel (for example, a cancelled event: 15 Nov "Cancelled event: full refund through PortOne") is still reconciled. |

### 25 Nov coordinator decisions (under the owner's delegation)

These are the coordinator's decisions, not owner rulings. The owner delegated them; his own words are quoted where given.

| Decision | Basis | Follow-through |
| --- | --- | --- |
| Each event may carry a separate Guest lock, built behind a switch that stays off | The owner leaned towards "a separate ticket" (relayed by the coordinator). His 24 Nov ruling "One lock + guest label at door" remains in force while the switch is off. | AMW's separate Guest lock r2 (`448e845f`): with `UNLOCK_SEPARATE_GUEST_LOCK_ENABLED` unset nothing changes; the Guest lock must differ from Signet, and once set both locks stay pinned. |
| Door rule: amber means refuse | Coordinator decision, 25 Nov | A door scan that shows amber is refused entry. |

## Change log

Every change with its impact, newest first.

| Date | Change | Touches | Breaks or kept | Status |
| --- | --- | --- | --- | --- |
| 2026-11-25 | Polygon RPC is Alchemy (the owner's choice), checked by a read-only RPC check. The RPC URL is read only from an owner-only file through a checked loader (Alchemy URL shape, no redirects). Live gates left: run the checker on the tick server (the preview VPS), prove the scheduler raises the over-cap alert, then the owner's go | Key-grant tick and recovery scripts, signer, `deployment/KEY-GRANTS.md` | Off by default: `KEY_GRANT_POLYGON_LIVE` stays unset; the check only reads | Landed off; three live gates open |
| 2026-11-25 | Polygon finality landed, switch still off (Review-A PASS, r6 to r10 plus docs): a grant settles once its block is finalized, with the finalized block's canonical hash and the receipt's parent-hash ancestry checked; an over-cap alert and a one-shot, reconcile-only recovery command for one recorded grant. Live gates still open: the owner's RPC choice and proof that the scheduler raises the alert | Key grants, key-grant tick, `deployment/KEY-GRANTS.md` | Off by default: `KEY_GRANT_POLYGON_LIVE` stays unset, so no Polygon transaction is built, signed or sent | Landed off; live waits on the two open gates |
| 2026-11-25 | Admin refunds landed (Review-A PASS, r5, plus the tick-log follow-up): a cancel made on PortOne's side is reconciled through the signed webhook; staff cancel from the admin with a write-ahead record; guest Tickets refundable until 3 days before Part I; the book-only edition refundable, membership editions refused; an Unlock seat is released only after its key is invalidated, swept by the key-grant tick, which reports sweep failures | Orders (refund record, new migration `20261124_140000_order_refund`), PortOne webhook, admin refund, key-grant tick | Refund rules follow the owner's 24 Nov rulings; nothing refunds a membership edition | Landed locally |
| 2026-11-25 | Polygon key grants landed, switched off (Review-A PASS, r5): S1 go-live switch `KEY_GRANT_POLYGON_LIVE`; S2 the key-grant tick catches up owed keys and reconciles refund cancels run from the owner's wallet; S3 signer recovery runbook (`deployment/KEY-GRANTS.md`, `deployment/SIGNER-RECOVERY.md`). A receipt counts only when it sits in the canonical block at its height (block-hash finality) | Key grants, refund cancels, signer host | Off by default: with the switch unset no Polygon transaction is built, signed or sent; no signer, RPC, broadcast or activation is set up | Landed off; goes live only on the owner's switch |
| 2026-11-25 | Coordinator decisions under the owner's delegation: a separate Guest lock per event, built behind a switch that stays off; at the door, amber means refuse | Event lock configuration, door check | Nothing changes while the switch is off; the 24 Nov one-lock ruling stays in force | Recorded |
| 2026-11-24 | Records sweep: decided items no longer read as open. Polygon one-grant check ticked done (22 Nov); two locks per event marked superseded by "One lock + guest label at door"; NFC sourcing answered 21 Nov and tags ordered 22 Nov; the owner's live Naver Pay rounds noted; the cancel authority (the owner's wallet) restated | Owner to-dos, event lock settings, lock ledger rows, ADR-0012 amendment, Polygon owner commands | Schedule and records only; earlier text kept as history | Recorded |
| 2026-11-24 | Launch moved to about 26 Nov. Owner, verbatim: "we need to launch in 2 days"; "Admin refunds, guest invites deadline is tonight. Polygon keys too. sandbox live tomorrow 2am." The one-grant check is done; Auth will send the transaction facts. | Tonight's landing queue: guest invites, Polygon keys, admin refunds; the sandbox goes live at 02:00 on 25 Nov | Schedule only; no behaviour change | Recorded |
| 2026-11-24 | Owner rulings of 23–24 Nov recorded: pdfmake pinned at latest, ticker crown and tape player out of scope, sleeping branches and worktrees cleared under the read-each-one standard, recovery after a pause, FX opt-out cleared, "Code sent to", personal-data baseline, `articles/` local only | Receipt PDF dependency, reading surfaces, branch and worktree hygiene, sign-in copy, review checklist | Ticker crown and tape player leave `src` (kept on a bundled branch); no other behaviour change | Recorded |
| 2026-11-23 | Unlock is the single door authority, with a staff phone test after preview; the product page follows stripe.press; NFC's guest-ticket impact note approved (owner) | Door check-in (read-only status on our side), road to launch after-preview gate, product page layout, guest ticket flow | Our system no longer records door entry itself; check-in is Unlock-only | Recorded |
| 2026-11-23 | Guest QR goes to the paying member, single-use at the door; NFC need not be fully working at first deployment (owner) | Guest ticket recipient, door QR check, road to launch NFC scope | The claimant-bound recipient in the earlier guest ticket plan is revised; NFC's impact note follows | Recorded |
| 2026-11-23 | Guest ticket plan approved; passes are Unlock-hosted (owner) | Guest claim transaction, Guest Ticket grant intent and its worker, activation and door lock resolution, wallet passes, the owner's Unlock to-do (one event, both locks) | No pass issuer of our own; no QR or pass before a matching receipt; three Unlock questions stay open until launch | Recorded; NFC and Auth build it |
| 2026-11-23 | Two Unlock locks per event, members and guests (owner) | Event lock setup, the owner to-do, ticket grant and check-in design | The single-lock assumption is gone; every lock-address setting and test takes two addresses per event | Recorded; mechanism work follows |
| 2026-11-23 | `build:guarded` cap 6 → 8 GiB (owner) | `package.json`, the tooling test, AGENTS.md | Other guards unchanged; cold builds (6–7 GiB) no longer stop | Landed |
| 2026-11-23 | The CMS moves from `/admin` to `/vault`, with no redirect (owner) | Payload `routes.admin`, the `(payload)/vault` route, staff login and magic-link callbacks, the deployment route table, the codemap | `/admin` bookmarks and staff links already sent stop working (404); everything else follows the new path | Landed with Auth's `/vault` packet |
| 2026-11-22 | Ledger sync: the 22 Nov owner rulings added to the decision ledger, verbatim where the owner's words were recorded, readings labelled ours | Decision ledger (one row and the 22 Nov rulings section) | No application, provider, deployment or branch change | Recorded on main, not pushed |
| 2026-11-21 | DOC-01: folded the master plan and owner answers into the canonical plan | Priority, 22 retained open items, road to launch and owner decision ledger | No application, provider, deployment, branch adoption or rule change | Recorded on main; review-copy and launch gates remain separate |
| 2026-11-16 | Evening status from the custodian: item 14 closed as settled by The flow from zero; the provider-fields to-do done; the owner-key approval added as a to-do; Where we are, work-order steps 7 and 8, and the flow's status lines brought up to date; the old diagrams marked superseded | The Plan tab, the ledger (one row: sign-in button colours), Answered | Nothing in code. The done Sunday block moved to History word for word. Item 14 stays on the Plan tab, ticked, so its NFC comment thread stays attached | Done; the diagrams are redrawn when the wallet and sign-up slices merge |
| 2026-11-16 | The plan was too long, so it is split into three tabs: Plan (open items, status, work order, the flow, the diagrams), Rules and History | The doc's layout and the repo copy only | Nothing deleted: ticked items, the ledger, the change log and finished cleanups moved to History word for word. 7 answered comment threads on moved items are detached and stay in the Comments list | Done; repo copy at 8ba0022 |
| 2026-11-16 | Activation comes back as the welcome page the card's first tap opens: a welcome, then adding a passkey on the phone. Guest invites stay members-only. Capacity is yours to decide; Signet is a free perk with the book | The activation page and its branch, NFC first tap, guest invites, items 15 and 16, ADR-0003, 0005, 0013, 0014 | Kept: the activation page and its screenshots, the guest invite as a members-only product. Changes: the passkey the page adds signs in and doesn't own the wallet; the page no longer gates the Signet | Plan and ADRs updated. Waiting on 17 |
| 2026-11-16 | You re-laid the flow from zero: social sign-up, a wallet we control created at payment, Signet non-transferable and non-refundable, a free launch-event Ticket for every holder, up to 2 extra Tickets bought by the holder, and the NFC card bound to the account | Sign-in (Apple and Kakao added; email code for sign-in only), the wallet and activation, guest invites, event tickets, refunds, NFC, ADR-0001 to 0003, 0005, 0009, 0011, 0012 | Breaks: the activation page, the passkey wallet owner, named guests and guest-pays, the 48-hour hold. Kept: payment, phone verification, the key queue and on-chain cancel, Safe address prediction, the separate paid product and its capacity admission | Written up as The flow from zero; activation paused at a0bd38f. Waiting on 15–17 |
| 2026-11-16 | Check-in moves to Events by Unlock (your direction on 13). Each event gets its own lock, each paid admission gets a ticket on it, and its QR is the entry. Staff scan with Unlock's EVENTS app, and Unlock marks the ticket used. Lost passkey recovery is decided too (social sign-in, new wallet passkey, old key cancelled); nothing is built for it yet | Events gain a lock; settling grants one ticket per paid admission; a refund cancels that ticket; ADR-0007 is replaced by a new ADR; the NFC card build (step 9); last night's door page | Kept: payment, admissions and capacity, the key queue, the on-chain cancel, guest invites. Changes: a refunded ticket must be cancelled on chain before the doors open, or its QR still works; cancels run only when called today, so they must run promptly. The door depends on a network connection and Unlock's service. Each event costs one lock deployment, plus one grant per ticket, in POL. Our door page is not merged | Impact reported. Next: the Base Sepolia test (a second scan, and the emailed QR to the concierge inbox), and your answers on 14. **Ours: the single-lock, paid-only issuance, and one-deployment cost assumptions are superseded by the [20 Nov member and guest ticket entry](#member-and-guest-event-tickets-20-nov).** |
| 2026-11-16 | Overnight. Merged into this branch: the Unlock adapter with a Base Sepolia test lock (keys granted live), the paid guest invite where the member pays (48-hour hold), and key-grant hardening (one signer queue across processes, stuck grants and cancels re-sent, refunds cancel the key on chain). A checkout bug that broke every card payment was found and fixed on main too. Wallet activation and door check-in are built, but each failed its two-reviewer UI pass (activation twice, the door once). Most fixes are done on their own branches. Next session: activation offers every passkey and re-shoots every state; the door takes its origin from configuration, then runs every gate and re-renders. Then both go back for review | Key grants, guest invites, checkout, three new admin tables with their migrations | Checkout now works end to end (it didn't before, on main either). Polygon is still refused in code until you approve it. All checks: typecheck clean, 3,010 tests with only the 2 known styling failures, every database test passing | Done; activation and door in progress |
| 2026-11-15 | Item 0 built and merged to main: every paid order now records the key it is owed. A separate worker can grant it once there is a wallet and an adapter. The one-unit-per-buyer limit is fixed | Settlement, refund hold, the buyer limit, and one new admin table with its migration | Payment, membership and admissions behave as before. No chain calls; nothing installed. Proven against a real PostgreSQL database: one record per payment, none after a replay or a failed commit. Codex review: six findings, all fixed, then passed. The table is created on the next deploy | Done, on main |
| 2026-11-15 | Sunday check: main builds for production. The guarded build needed a memory cap on its TypeScript step, now built into the script | Build script only | Nothing else changed. The server switch still waits for your go | Done, on main |
| 2026-11-15 | Researched the QR code Unlock emails guests. Unlock only sends it for locks marked as events, it never expires, and Unlock doesn't stop reuse. Our door checks Unlock's signature, and our admissions list allows each entry once | ADR-0007 notes; docs/qa/auth-payment-nfc/unlock-qr-verification.md | The guest lock must carry event details, or guests get no QR | Done |
| 2026-11-15 | Throwaway test signer created for Base Sepolia (item 5). Package versions are proposed as item 5a | This Mac only (\~/.config/sphmrs); nothing in the repo | Next: wallet activation, chain adapter and test lock, once you approve 5a and fund the signer | Done: 5a approved, signer funded |
| 2026-11-15 | You accepted Unlock items 0–7, five open decisions and Gemini's NFC proposal; they are now in the ledger and ADR-0004 to 0009 are marked accepted | Ledger, ADRs, capability contract; next, the key-grant record (item 0) | Item 3 changed: Unlock sends guests their QR key, so we send no email. Item 3 stays listed until its comment thread is resolved. Still open: the product name and three to-dos | Done |
| 2026-11-15 | Codex analysed the Unlock build. Recorded as ADRs 0001–0009 and a capability contract | Docs only: docs/adr/, unlock-capability.md, Waiting for you, items 0–5 | Nothing in code. Three findings: the sign-in passkey is reusable only if it is P-256, so activation may still need a new passkey; refund cancellation needs a separate authority from the grant signer; the buyer limit is still 3 in the code against your one. The key-grant record at payment can be built now, whatever you decide | Done: accepted 15 Nov |
| 2026-11-15 | Gemini's NFC proposal taken in: card tap verification (SUN), prompted and unprompted taps, and staff check-in by tap | Step 9 only: new NFC collections, `/api/nfc/*`, a `/welcome` handler | Nothing that works today changes. Six corrections, the main one being that door staff use the staff login, not a member field. It rests on activation decision 1, which you haven't confirmed yet. Review: `inbox/taken-in/` | Done: accepted 15 Nov |
| 2026-11-14 | Live card payment, one unit per purchase, membership on payment, business-info admin page with footer and policy pages | Card checkout, settle, membership, the site footer, terms, privacy and refund pages | Policy pages keep their current text until you fill in the admin page; the footer appears only once the required business facts are filled. The old ticket code still exists | Done, on `main` |
| 2026-11-14 | Stale branches deleted; finished branches now close right away | Repo only | Nothing; all archived | Done |
| 2026-11-14 | Sign-in and checkout accept sophomores.co | Sign-in, phone check, card checkout | Local development unchanged. At deploy, the proxy must pass the real address | Done |
| 2026-11-14 | Mechanisms moved to one branch | Every branch's scope | Nothing broken; no code moved | Done |

## Inconsistencies

Nine conflicts, each resolved below. Two of them affect Sunday: the phone check, and the legacy ticket checkout the Sunday build edits.

| Topic | What the documents say | Resolved as |
| --- | --- | --- |
| Units per buyer | Commerce launch plan, To-Do T002, T002 model and I3 spec say three, with gifts; scope review, reconciliation and Sunday spec say one | **One.** The old documents are superseded |
| Refunds | Four rules: not refundable before activation (To-Do:320); returns only *while* the key is not activated, the opposite (reconciliation:38); full refund until 3 Dec (policy drafts); physical-goods rules (launch plan) | **Decided 15 Nov: no refunds after purchase except by hand** |
| Guests | Launch plan: guests must register, and admission is tied to an account. Scope review: guests use the email key or check out without an account | **Scope review.** Guest check-in decided 15 Nov: staff scan Unlock's QR key against our admissions list |
| Membership gate | Launch plan: verify before taking part. Scope review: the guest invite skips the gate | **Scope review** |
| Wallet | Your original plan: Safe or Kernel. To-Do (13 Nov): address derived from email. Reconciliation (14 Nov): Safe with a passkey owner | **Safe with a passkey owner** |
| Payment ID on resume | The uncharged-recovery note and the I3 spec reuse the same attempt and forbid expiring it. The scope review wants one ID per attempt, with abandoned attempts expiring | **One ID per attempt**, reused only to resume that same attempt |
| Which checkout | The Sunday spec edits `src/lib/tickets/portone/config.ts`, but the scope review calls the old ticket checkout dead code | **Check at integration:** Checked: the shop uses the new checkout, but it borrows one payment-ID helper from the old ticket code, and `/tickets/payment` is still a live page. So the old code is not dead yet |
| NFC order | The member already holds a key before the first tap (your plan) · the key is minted after activation (reconciliation:28) · activation happens at arrival (To-Do) · first tap activates, then the card checks in (reconciliation:37) | **Superseded 15 Nov: members activate on the website right after payment; the card's first tap links the card, which then checks them in** |
| Network | Stale `unlock-shape` decision says Base; main assumes Polygon | **Decided: live on Polygon (16 Nov), tested on Base Sepolia** |

Other gaps still to settle:

- **Phone check on the web.** Research says a web page can't force an MMS (`phone-verification.md:105-108`). Before Sunday I test the real phone check once on sophomores.co. If it fails, registration falls back to email plus Google for the quiet launch.
- **Passkeys made on localhost** don't carry over to the real domain. No real users have them, so nothing is lost.
- **Support email.** The policy drafts use a Hideaway address; the To-Do uses `concierge@sophomores.co`. You set this in the new business-info page in the admin.
- **Stale-branch decisions still worth keeping:**
  - one Unlock lock per token type, because one key per address blocks holding two types;
  - our own lifetime cap on granted keys, because granting skips the supply cap;
  - a policy for stuck server transactions;
  - email-derived addresses can be guessed from an email list, which matters for the guest email key.
- **Same word, different things.** "Kernel" means both the unused token kernel and a wallet type. "Activation" means three different steps. "Product" means a coin, a magazine or a token. From here on: *wallet* for the Safe\*; activation for making the wallet passkey on the website; first tap for linking the NFC card; door for the event entrance; staff for an account with staff status, the only kind that can scan people in; check-in for a member or guest being let in at\* the door\*. The reconciliation calls the product a magazine; confirm that name\*.

## Bloat and redundancy

Most of the code bloat is I2. It adds about 2,600 hand-written lines (code, tests and evidence), plus a generated 11,800-line migration snapshot, all for an edge case that the standard checkout covers far more simply. The documents restate one admission policy in four places.

**Code to delete, once its replacement works** (you approved deleting dead weight):

- **I2 reconciliation machinery.** 97 files in its squash commit: `src/lib/commerce/portone/{accounting, admission, ledger-transaction, policy}.ts`, the reconciliations collection and its migration, and the tests. Delete it after step 4.
- **Legacy ticket checkout** (`src/lib/tickets/portone`). The scope review called it dead code, but it isn't: `/tickets/payment` is still a live page, and the shop borrows its payment-ID helper. Removing it means moving that helper first and retiring the page. Decided 15 Nov: keep it, and move the live parts out to where they belong.
- **Unused token kernel** (`src/lib/commerce/token-entitlements.ts`, 283 lines). Nothing called it. Deleted on 14 Nov with its tests; recoverable from git.
- **The I3 branch.** Not merged; it can be dropped.

**Documents restating the same thing:**

- The admission and allocation policy appears in the commerce launch plan, the ticket account planning, the T002 model and the To-Do. All four are now superseded by this document.
- The payment financial brief is in three places (To-Do, backlog plan, T004-A design).
- The `boundary.md` files on the `unlock-auth` and `unlock-shape` branches are identical.
- Status lines in the To-Do contradict each other: one says I1–I6 haven't started, another that I2 is integrated. I'll replace the To-Do's mechanism sections with a pointer to this document.

**Branches:** done on 14 Nov; 24 stale branches were deleted (see Branches, checked against git).

## Test cleanup: impact before anything is deleted

The repo has 411 test files, about 4 MB. About 30 files can go now (groups A, E and the orphan browser specs in B), and only group E loses anything: guards for refactors that are already finished. 8 more tests never run and should be wired in. 15 go later, with the I2 machinery. Up to 99 test the wording of the code rather than what it does; those are rewritten when their code is next touched, not deleted in bulk.

| Group | Files | What they guard | Impact if removed | Proposal |
| --- | --- | --- | --- | --- |
| A. Dead | 2 orphan fixtures with no importer; `rework-hygiene.test.ts`, which only checks the review folder; 5 Python tests for the 25 Oct warp preview, which fail in a clean checkout; one test-discovery file duplicated three times over; a broken test reference in `STAGING.md` | Nothing current | None. The suite and typecheck are unaffected | **Remove now** |
| B. Never run | 3 database tests (including the membership-grant proof), 3 deployment `.mjs` tests (backup, restore, TLS hook) and 2 Python tooling tests: nothing invokes them. 11 browser specs have no runner | Real behaviour, but unenforced | Removing loses nothing today. Wiring them in adds checks | **Wire in** the database, backup/restore/TLS and tooling tests as an opt-in gate. **Delete** the 11 orphan browser specs; the 3 documented ones stay |
| C. I2 machinery | 12 tests import it directly, plus `fix4`, `rework`, the I2 database fixtures and `generation-isolation.cjs` | The reconciliation edge case | The review, retirement and webhook tests share an I2 fixture; split it first or they break | **With step 5**, after the simple settle works, not now |
| D. Unused token kernel | `token-entitlements.test.ts` (38 KB) and its fixtures | Code nothing imports | None for the site | **With your call** on the token kernel box in the map |
| E. Guards for past refactors | `src-relocation`, `source-ownership-*`, `legacy-loops`, `calendar-state-colors`, and the pre-refactor shader snapshots that pin "every original byte" | That a finished move or refactor wasn't undone | You lose nothing current, but a reverted refactor would no longer be caught. The policy rules (Tailwind-only, Payload placement, full motion) stay | **Remove**; keep only the rules still in AGENTS.md |
| F. Brittle text checks | Tests asserting exact shader numbers, column strings, class names or function names | Implementation details | Each one fails on any refactor, even a correct one | **Rewrite as behaviour tests** when that code is next touched; no mass deletion |
| G. Process names, real behaviour | `authentication-phase-studies`, `real-payload-acceptance` | Real login and payment behaviour | None | **Rename** to describe the behaviour |

The 2 known styling failures stay deferred, as you set earlier.

**Done 2026-11-14** (`main` at `b4807cd`). The suite is down from 2,980 to 2,873 tests, still with only the 2 known styling failures, and the typecheck is clean.

- **A:** done.
- **B:** done.
  - The 12 browser specs nothing could run are gone.
  - The deployment-script and Python tests now run with `--tooling`. One of them had drifted: it expected a 6 GiB dev memory cap where the script uses 5. It now checks for at most 6.
  - The membership database proof now has a launcher that creates and removes its own throwaway database. It passes 5/5.
- **C:** the endpoint ledger helper has its own file, so the webhook test no longer touches I2. The review and retirement tests still need I2, because the code they test calls it; that goes away with step 4.
- **D:** the unused token kernel and its tests are deleted. They can be recovered from git.
- **E:** kept. On inspection most of these check current behaviour, including a security boundary on notification actions, the Tailwind and migration setup, and the shipped flame shader values.
- **G:** renamed to `email-code-and-signup-flow` and `inventory-concurrency-and-returns.db`.

One finding for step 4: the old I0 payment-durability database proof had been failing since I2 landed, because confirmation now needs the reconciliation step first. Nothing ran it, so nobody noticed. It is retired with I2, and the standard settle gets its own database proof.

## Branches, checked against git

Cleaned on 2026-11-14. There were 32 local branches; 24 were stale and are deleted. Their code was already on `main` or on this branch, or one of your decisions had superseded it. Eight remain:

| Branch | State | What happens |
| --- | --- | --- |
| `main` | Live | Page work lands here |
| `codex/auth-payment-nfc` | Live | This plan's branch |
| `codex/sunday-launch-20261115` | Active worker | Merged when it reports, then deleted |
| `feature/product-production` (worktree `hamlet`) | Active: a session committed sales-page and commerce-experience drafts in the last 20 minutes | Left alone. It carries history from before the rewrite, so it must be cherry-picked when it lands, never merged |
| `codex/main-checkout-preserved-…` | Your original checkout in `Projects/sphmrs`, with the env file and 24 uncommitted changes | Kept |
| `experiments/flame-depth-20261025` | Kept on purpose ("preserve rejected flame depth experiment for later") | Kept |
| `studies` (22 Oct) | Three unmerged commits: footer field, flame editor, teaser removal. `main` has since taken the approved flame footer | **Your call** |
| `xnxchoi/gar` | One commit adding `.mcp.json` for the uiarc.dev design MCP; also on GitHub | **Your call:** commit it to `main`, or keep it local |

Everything deleted is recoverable. The archive outside the repo holds a bundle of all 24 branch tips plus each worktree's uncommitted files. To restore a branch, fetch it back from that bundle.

From now on, a finished worker's branch is merged and deleted in the same step, and I report it rather than ask (AGENTS.md, Branch lifecycle).

## Document map

Only four documents still steer the work. They are folded into this one; the rest are history or evidence. On this branch, older documents are read as background, never as instructions.

Two companions sit beside this plan. Neither is a second plan:

- **Architecture decisions** are in `docs/adr/`. ADR-0001 to 0003 record your decisions on wallet, guests and the NFC tap. ADR-0004 to 0009 were accepted on 15 Nov, when you ticked their items. A new ADR is accepted the same way.
- **The Unlock capability contract**, `docs/qa/auth-payment-nfc/unlock-capability.md`, says what must hold from payment to the door: actors, states pages may read, invariants and non-goals.

| Document | Status | Why |
| --- | --- | --- |
| Commerce scope review (`commerce-scope-review-20261114/summary.md`) | Folded in here | Your 2026-11-14 decisions on checkout, one unit and membership on payment |
| Unlock × NFC reconciliation (`unlock-nfc-plan-20261114/reconciliation.md`) | Folded in here, from line 34 | Safe with a passkey owner; first tap activates, then the card is the check-in credential (activation has since moved to the website) |
| Sunday and production sign-in specs | Current | The two Sunday slices |
| Unlock integrator report (`unlock-integrator-20261114/report.md`) | Reference | What Unlock actually returns |
| Frontend plan (`unlock-nfc-plan-20261114/plan-frontend-antigravity.md`) | Reference | The substance stands; its copy is placeholder |
| Backend plan (`plan-backend-codex.md`) | Partly superseded | Slices 2–5 are the old I3–I6 machinery |
| Commerce launch plan (`docs/reference/commerce-launch-plan.md`) | **Superseded**, though it still calls itself governing | Three per account, gifts, no guest checkout, and the product called a coin |
| Ticket account planning, T002 model, I3 spec | Superseded | Several units per buyer, gift claims |
| Uncharged-payment recovery note | Superseded | Reuses the old payment ID instead of a new one per attempt |
| Policy drafts (`commerce-policy-drafts.md`) | Superseded | Full refund until 3 Dec, and a Hideaway support address |
| Unlock blueprint, your original plan, integration spec | Background | Research; options already decided |
| Phone verification research | Background | Carrier facts; still valid |
| T004 I0–I2, T002-P2a, T005, Unlock auth/shape/launch, October auth notes | Evidence only | What was built and why |

Two plan files exist only on stale branches (`unlock-auth` and `unlock-shape`). Their decisions that still matter are listed under Inconsistencies, above.
