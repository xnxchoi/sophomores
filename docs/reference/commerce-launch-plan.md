# Commerce launch plan

**Handoff navigation updated:** 2026-11-12. **Recorded local checkpoint: Batch 7c source-ownership repair accepted; functional/provider/release gates remain; the clean-checkout stylesheet gate was resolved at `e7e8fdd`, as recorded in the [registry](../To-Do%20List.md#current-maintenance-checkpoint).**
This is the owner-approved implementation contract, not approved public sales copy
or a claim that the implementation, PG review or launch is complete. The
[To-Do registry](../To-Do%20List.md#current-maintenance-checkpoint) owns the single
active progress/ownership panel. The worklist below retains milestone contracts
and dated local checkpoints, not a competing active-session tracker. Earlier local
commerce receipts are
in [the commerce QA archive](../qa/src-stabilization-20261109.md#payload-commerce-implementation--current-progress);
the latest repository-wide baseline is in
[the i18n checkpoint](../qa/i18n-consolidation-20261110.md).

**Admission/account policy revised 2026-11-11:** the owner clarified buyer-first
allocation, one account-bound package per event, pending gifts, and membership
separate from account verification. The consolidated [account/token/NFC activation
plan](ticket-account-planning-20261110.md) records those decisions, the proposed
physical-activation experience, remaining integration choices and bounded work.
This amendment supersedes the old optional name-only guest-admission policy; it
does not approve implementation of the entire supplement. Existing release/test
receipts below remain historical and are not revalidated by this documentation
change. Other-checkout Batch 7c work is not altered or assessed here.

**Delivery direction confirmed 2026-11-10:** this remains the governing site and
commerce scope; deployment is the final milestone, not a substitute for the
remaining registration, verification, purchasing, fulfillment, guest/perk and
acceptance work. Target the existing VPS, retiring Hideaway only at a validated
Sophomores cutover while preserving its exact running installation and recovery
data. The approved read-only host inventory is recorded in
[the current preflight observations](../../deployment/VPS-PREFLIGHT.md#2026-11-10-read-only-inventory--existing-plan-retained).
It is not permission to bypass public-auth, payment/provider, product/policy or
backup/recovery gates to publish a reduced site.

## Approved authority and compatibility boundaries

- Use only the official **`@payloadcms/plugin-ecommerce@3.92.1`**, pinned exactly.
  The owner explicitly approved this dependency; the plugin is beta. Installation
  does not establish integration, migration or production readiness.
- Payload and its official ecommerce plugin are the sole authority for products,
  prices, inventory, carts, orders, transactions and their admin management.
  Payload also owns catalogue content, seller disclosures and policy publication
  gates. Retire environment/static catalogue and parallel quote authorities only
  after the replacement passes compatibility and acceptance checks. The current
  local pass now routes purchasing through Payload; superseded legacy HTTP ingress
  is retired rather than available as another catalogue/payment authority.
- Preserve canonical Better Auth sessions and existing `users`, staff/admin roles
  and account ownership. No anonymous checkout and no second customer identity
  system. Initial sensitive commerce operations are **superadmin-only**; do not
  grant new staff privileges as part of integration.
- Integrate PortOne through a custom payment adapter using the plugin's documented
  `finalizeOrder` contract. New pending payment attempts belong in plugin
  transactions; create/finalize orders only after authentic, authoritative `PAID`
  verification. Callback/browser assertions alone are not proof of payment.
- Preserve legacy order UUIDs/references and financial evidence. Keep legacy orders
  read-only and explicitly discriminated from plugin-owned orders; do not reset,
  silently rewrite or automatically grant new entitlements to old TEST orders.

## Physical offer and launch facts

The offer is a **shipped physical collectible coin**, not a renamed ticket or a
preorder. Show the actual product with representative imagery and disclose its
admission benefit truthfully to customers and the PG. Stock-ready/non-preorder
claims require actual product, inventory and fulfillment-readiness evidence.
Physical fulfillment and event admission remain separate records/lifecycles.

Do not invent or inherit old ticket prices, shipping fees, stock, dispatch dates,
event dates, refund cutoffs or legal terms. Public purchasing/publication stays
blocked until the owner approves the actual specification/photos, price, stock,
shipping regions/fees and schedule, seller/contact details, policies and event
conditions. Earlier ticket-offer documents are historical context, not authority
for physical-goods returns or the revised offer.

## Account allowance and inventory

Enforce a net maximum of **three coins per account per release across orders**.
Paid quantities plus active reservations consume the allowance. Confirmed
cancellations and accepted returns restore it. This is not a phone-number,
person, household or shipping-address cap; do not introduce cross-account identity
rules. Enforce stock and account allowance atomically under concurrent attempts.

Do not release a reservation or allow another charge merely because a request
or browser timed out. Resolve an uncertain provider state first. Cancellation,
partial/full refund, return, exchange and fulfillment transitions must preserve
financial history and account for stock, allowance, admission and consumed
benefits; staff review is required where benefits were consumed.

## Admission, account binding and physical activation

- One paid physical unit allocates one event admission entitlement. At settlement,
  bind the buyer's first unit to their account if no entitlement is already bound
  for this event. Additional units, and all units bought by an already-bound
  account, are pending gifts. A first order may include self plus gifts.
- One account can hold one ticket/package for this event, whether bought or claimed.
  Self-binding consumes that package. This is separate from the net-three purchase
  allowance above. Delayed token minting must not delay allocation or let a later
  purchase produce another self unit.
- Launch starts with no minted memberships. A canonical account and approved
  verification precede participation; an existing Unlock token is not a prerequisite
  for the first purchase. Membership itself is intended to be an Unlock credential,
  distinct from the account/phone readiness currently used by local code.
- Gift activation uses login/register, the recipient's own verification and an
  explicit bearer claim. Pending gifts do not create fake login accounts. The
  proposed physical-NFC flow delays membership/event-token issuance until activation
  while retaining the paid allocation; earlier issuance plus a welcome/reveal is a
  retained alternative, not an automatically selected fallback.
- The claimed, account-bound event credential supplies admission; the gift-claim
  secret is not a door pass. This replaces admission by guest name without an
  account. Member status does not automatically supply a free or reserved seat.
- Each eligible activated account's event package includes four Part I drinks and
  shared Part I → Part II transport. The buyer's registration cannot unlock other
  guests' packages, and issuing membership cannot create a duplicate allocation.
- Claims and redemption prevent duplicate grants/use, concurrent claims and
  unauthorized reassignment. Self units cannot be claimed by another account;
  an already-bound account cannot consume a second gift.
- Corrections, financial holds, transfers, tag/code replacement and returns after
  activation/check-in need the explicitly selected policy and authorized operations,
  initially superadmin-only. Do not silently reset consumed benefits or rewrite
  financial history. Remaining token, delivery and recovery decisions are tracked
  in the supplement; public/provider/hardware actions retain separate approvals.

## Shipping address

Use the official [Kakao/Daum Postcode Service](https://postcode.map.kakao.com/guide)
for Korean address search, with manual entry when search cannot load. Use the
existing installed-library/internal-helper gate before creating integration
helpers; no additional package or provider-account setup is implied.

Collect recipient name, delivery phone, postcode, base address and optional detailed
address, with optional delivery instructions. Shipping is South Korea only,
one recipient/address per order; actual fees still need owner approval. Buyer identity,
recipient contact and admission guest are separate concepts.

Validate server-side and snapshot the address on the order. Restrict access to
the owner and explicitly authorized fulfillment operators; keep addresses out of
telemetry. Retention and courier disclosure must be settled before collection.
An address book is a separate opt-in feature. Check actual mobile/in-app browser
search behavior and the manual fallback, not only desktop rendering.

## Payment and recovery acceptance

| Scenario | Required behavior |
| --- | --- |
| Close, Back, explicit gateway cancellation or method change | Preserve account, cart, quantity and address. Dismissing payment UI is not signing out or cancelling an order. Reconcile the exact attempt before safely retiring/replacing it; never launch another payment automatically. |
| Timeout, connection loss or delayed approval | Treat unknown as unknown; reconcile the existing reference before retry. Recover authentic paid results exactly once, without another charge or duplicate fulfillment. |
| Decline or authoritative failure | Offer actionable inline retry/method change only after safe attempt resolution. Preserve inputs. |
| Refresh, tab reopen, mobile redirect or blocked popup | Restore identity and attempt context without automatically opening payment. Physical-device acceptance remains separate. |
| Session expiry or account switch | Reauthenticate without losing context; never attach the attempt to a different account or expose its address. |
| Double click, concurrent tabs/orders | Idempotent transaction preparation/finalization; atomic stock and per-account/release allowance; one order, admission and fulfillment effect. |
| Duplicate, delayed or out-of-order callbacks | Verify authenticity and authoritative provider state; never regress paid/refunded/held state from stale events. Webhook delivery requires separate acceptance. |
| Cancel, refund, return or exchange | Apply approved physical-goods policies and mandatory rights, with correct stock/allowance restoration and consumed-benefit review. Do not reuse ticket event-date cutoffs. |

Existing [uncharged recovery guidance](portone-uncharged-recovery.md) is a starting
point, not evidence of plugin adapter or new physical-commerce acceptance. Short
status changes use compact stable slots; longer errors may reflow coherently.
Purchase registration remains inline, restrained and monochrome.

## Implementation and validation gates

1. Inspect plugin contracts and preserve compatibility before replacing authorities.
   Integrate canonical users/roles and explicitly discriminated legacy history.
2. Implement plugin-owned catalogue, inventory, carts and transactions plus PortOne
   adapter, paid-only order finalization and guarded migrations.
3. Implement atomic account/release allowance, shipping snapshots, admission,
   individual guest claims, benefits and authorized operational corrections.
4. Replace checkout/admin/publication surfaces only as their replacements pass.
   Keep unavailable owner facts and public purchasing fail-closed.
5. Use test-first RED/GREEN coverage for concurrent inventory/account/admission
   limits, duplicate finalization, perk claims/redemption and adverse payments.
   Run affected regression/type checks; inspect the actual live UI and perform a
   harsh concise Santa Method review. Source/tests alone are not visual acceptance.

## Execution worklist — preserve completed work

The milestone worklist remains the existing plan, not a fresh dispatch. Its local
receipts are dated checkpoints; later bounded outcomes and current ownership live
in the [registry](../To-Do%20List.md). The owner resumed feature dispatch on 2026-11-12;
each assignment still needs its own isolated worktree, resource admission and any
provider/deployment approval. Generative routing neither executes commands
nor approves their internal actions; do not rebuild locally accepted work.

| ID | Scope | Current checkpoint / next acceptance | Dependencies and approval boundary |
|---|---|---|---|
| <a id="step-1"></a>1 | Plugin/identity/legacy compatibility | Local compatibility and preserved historical records accepted; retain existing authority. Public configuration and target data acceptance remain. | No second identity store, new staff grants or history rewrite. |
| <a id="step-2"></a>2 | Plugin commerce and PortOne adapter | Local catalogue/cart/transaction/finalization and replay coverage exists. Current-plugin real provider acceptance remains in step 8. | Do not recreate the engine or infer payment activation from synthetic PAID tests. |
| <a id="step-3"></a>3 | Allowance, shipping, admission and perks | Local safeguards/operational code accepted. Authenticated operator/device acceptance and approved physical-product facts remain. | Preserve net-three and one package/account/event; buyer-first allocation and physical/token activation now follow the 2026-11-11 supplement, not the old name-only rule. |
| <a id="step-4"></a>4 | Checkout/admin/publication surfaces | Local and synthetic UI checkpoints exist. Real account/CMS/address journeys and publication approval remain in step 8. | Missing owner facts stay fail-closed. Copy research stays in its separate read-only chat. |
| <a id="step-5"></a>5 | Regression and review | **Batch 7c:** 2,110 pass, 0 fail, 39 existing opt-in skips; compiler and bounded desktop/mobile review pass. Source ownership repaired. Two deferred CSS failures remain visible; baseline lint/dependency debt is not waived. | See step 7c receipts and boundaries; these are local checks, not image/provider/production acceptance. |
| <a id="step-6"></a>6 | Public membership and phone-verification readiness | **Design/owner policy needed.** Local mode, HTTP authority, receiver/runtime and carrier trust are separate controls; public trust currently denies all grants. | Confirm production origins, ingress/sender-number assurance, carrier coverage and key-rotation policy before public enablement. The local pinned 1024-bit exception is not production approval. No new fence based merely on `NODE_ENV=production`: a production-built local TEST server is still a valid local use case. |
| <a id="step-7"></a>7 | Release configuration, persistence and gate contract | 7a/7b contracts retained; **7c local ownership acceptance complete, local commit approved**. Actual image/storage/runtime acceptance remains separately approved execution. | No production secrets in build, implicit migrations, provider activation or server work. Public functionality in step 6 remains mandatory. |
| <a id="step-8"></a>8 | Full functional and PG acceptance | Finish approved product/policy facts, real authenticated CMS/customer/operator journeys, address/device checks and the adverse-payment matrix above. | Steps 2–7 plus owner facts; real provider calls, bounded sandbox payments, webhook registration and any live-mode work require their specific approvals. No invented offer/policy values. |
| <a id="step-9"></a>9 | Recoverable old installation and exact candidate | Read-only live inventory is complete; fresh Hideaway recovery capsule, independent key custody, consistent DB/media recovery point and isolated recovery rehearsal remain. Freeze reviewed Sophomores source and produce/check its exact Linux image. | Separate backup/restore, image-build and target-data approvals. Keep Hideaway data untouched. Resolve shared LOSTINSEOUL ownership and any old-preview retirement before service stops. |
| <a id="step-10"></a>10 | Same-host cutover and retained rollback | Final milestone only: rehearse the scoped remote adapter, verify capacity and route ownership, switch approved routes and selectively retire Hideaway. | Steps 1–9 accepted and exact cutover approved. Preserve old image/data/config; no blanket Compose shutdown, volume deletion or unapproved cleanup. |

### <a id="step-7a"></a>Batch 7a — release configuration contract / commit checkpoint

**Gate 1: owner approved this exact batch; local implementation and reviews complete.** This is the first unblocked
local repair while step 6's public proof-policy decision remains open, not a
substitute for public registration or the full service. Security review found no
new verifier exposure that warrants changing the approved local pilot now.

Demonstrated mismatch: `src/lib/payload/configuration.ts` requires a database URI
and Payload secret at configuration load, but the Docker build supplies only a
release identifier; isolated smoke supplies only preview mode. Build, packaging
smoke and real runtime need distinct, explicit configuration contracts.

Proposed source ownership: `deployment/Dockerfile`,
`scripts/deployment/actions.ts`, and the existing deployment config/command owner
only where necessary; related tests under `tests/deployment/` and the runbook.
Reuse installed Payload/Zod/Next facilities and existing deployment boundaries.
No new dependencies or generalized environment framework.

Test-first acceptance:
1. An offline regression reproduces the missing-configuration boundary. A reviewed
   build/package-smoke configuration can pass required validation without real
   database, app or provider credentials; production secrets are not forwarded or
   embedded, and build-only values cannot become runtime defaults.
2. Real runtime configuration remains separately required and validated. Local
   TEST/auth/verification behavior, including a production-built local server,
   remains unchanged. No public origin, database authority, carrier grant or
   legacy-key exception is broadened by this batch.
3. Existing snapshot/fingerprint/secret exclusions and functional/security checks
   remain. Run focused guarded tests/typecheck and independent code/security
   review; report actual Linux image and public-service acceptance as pending.

Scope guard: code, fixtures/tests and documentation only. No install, image build,
database query/migration, secret/credential access or change, provider request,
server/container action, DNS/TLS change, publication or deployment. Preserve the
owner's `messages/en.json` edits and do not modify Korean. The four known full-suite
failures are not silently waived or hidden in this batch.

#### Review panel — 2026-11-10

| State | Work / evidence |
|---|---|
| Complete | RED regression reproduced both missing builder and smoke configuration failures; GREEN repaired both without changing the app schema or deployment child-environment allowlist. |
| Complete | Builder verification uses a single shell-scoped export of synthetic values and `--network=none`; isolated package smoke explicitly injects its own synthetic values. Runtime image stage has no database/secret defaults. All four verification commands remain in the same `&&` chain. |
| Complete | Guarded deployment/config/local-auth regression: 106/106; additional auth/verifier boundaries: 57/57; deployment plus commerce/PortOne regression run: 127/127 (overlaps the deployment group; do not sum as unique tests). No provider or database access. |
| Complete | Guarded typecheck and scoped ESLint pass; diff whitespace checks pass. Dedicated action-suite coverage: 100% lines/functions and 96.61% branches. Combined CLI-fixture coverage maps differed; retain both reports, use the isolated action report for this changed module, not a whole-repository coverage claim. |
| Complete | Independent Sol code and TypeScript reviews and Astra security review: no must-fix findings. Source/fixture review only, not image/runtime acceptance. Owner English and Korean catalogue hashes unchanged. |
| Open security debt | Fresh pre-commit production-dependency audit reports 3 high, 1 moderate and 1 low advisories in unchanged dependencies. The highs concern Happy DOM host-code execution/SSRF and Joi email-list parsing DoS. Security triage permits this configuration-only local checkpoint, not release: reachability is not established, and server-side mailauth prevents dismissing Joi as test-only. Separate assessment/remediation remains launch-blocking; no upgrades or waiver are included. See `.deployment/batch7a/receipts/precommit-audit.log`. |
| Current gate | **Gate 2: completed local commit 0c73f96. No push authorized; Batch 7b was approved separately below.** Commit: `fix: isolate build and packaging smoke configuration`. Include the reviewed source/tests and the existing root-owned planning/inventory documentation; exclude `messages/en.json`. |
| Pending | Step 7b release-test disposition, actual Linux image/static-generation/artifact inspection, real runtime configuration/database/media acceptance; public verification policy and remaining full-service acceptance stay on the existing plan. Each execution phase retains its own approval. |

Sanitized local logs, watchdog receipts and the review summary are retained under
`.deployment/batch7a/receipts/`. Every guarded run reported no remaining child
PIDs. Peak check footprint was below 1.5 GiB; a post-review full CLI-descendant
audit measured about 4.13 GiB RSS / 3.27 GiB physical footprint, with over 18 GiB
system headroom. This is sampled evidence, not a kernel-enforced quota.

**Fragile final pass, in priority order:**
1. Do not mistake schema-valid placeholders for data availability: Next static
   generation may still call Payload. No image build has been attempted.
2. The four known full-suite failures still stop Docker's unchanged verification
   chain. Resolve their release disposition explicitly in 7b, without hiding them.
3. Inspect the exact generated artifact and verify real runtime configuration
   under separate approval before any public-service claim. Local/public proof
   policy, production credentials and runtime persistence are not solved by 7a.

Gate 2 authorized only that local commit. Push/external execution remain separately
scoped; Batch 7b began only after its subsequent explicit owner approval.

Run only one guarded workload per checkout via `scripts/resource-guard.py`; retain
at least 10 GiB system headroom and the owner's 15 GiB aggregate workload ceiling,
including browser/tool overhead. Stop the owned preview before checks. Preserve
unrelated UI WIP and all historical payment evidence.

The accepted local KPN TEST ₩1,000 `PAID` result, local paid record, 242 ticket tests
and clean compiler run are **historical pre-change evidence**, not current plugin
validation. The preview is stopped, persistent payment mode disabled, and the old
pending attempt preserved. The separately approved local commerce migration is
applied, including the additive late-payment conflict marker, with private backups
and unchanged historical-row fingerprints. Local real-adapter and affected
auth/payment regression acceptance passes; current
adapter/review evidence and remaining QA are recorded in the linked progress panel.
Operator action UI/live staff acceptance, broader repository regression repair,
production build/package validation and separately approved real sandbox/device
checks still remain. Public product/policy facts have not been approved or published.
No production provider writes, new payment calls, staff grants,
resets, deployment, commit or push are implied by this plan. Dependency approval
is limited to the named official pinned package; other dependency/deployment
phases retain separate explicit approval boundaries.

### <a id="step-7b"></a>Batch 7b — local release checks and runtime/persistence contract

**Review checkpoint: local cleanup and contract complete; release gate remains
blocked. Owner approved the local checkpoint commit only; no push authorized.**

| State | Work / evidence |
|---|---|
| Complete | Fresh comprehensive prebuild RED baseline: 2,130 tests, 2,029 pass, 62 failures, 39 existing opt-in skips. Most additional failures came from owner-edited copy, not new app behavior. |
| Complete | Repaired stale auth/OTP/checkout/focus prose assumptions using current catalogue labels or existing semantic/action scope. Exact catalogue output remains tested for localization fallback, not frozen sentences in behavior tests. Fixed the stale study-wordmark locator without changing the mark. No production UI or copy changed. |
| Complete | Default prebuild discovery retains every assertion. Functional and deferred-styling modes are disjoint/exhaustive; incompatible modes fail before DB environment loading. New discovery/entrypoint tests went RED then GREEN. Docker selects the explicit functional gate. |
| Complete | Two CSS-only assertions moved intact into named deferred suites: article grid/type and CSS-clock policy. Content/image behavior, spinner status/geometry/motion behavior, auth, payment and architecture tests remain blocking. Separate styling report retains both failures; this is not visual acceptance. |
| Complete | Final guarded functional run: **2,132 tests, 2,092 pass, 1 fail, 39 existing opt-in skips**. The only failure is the untouched source-ownership inventory check. All copy-related failures are resolved in this run. |
| Complete | Fresh guarded typecheck passes. Scoped ESLint reports two preexisting plain-anchor fixture errors (reproduced from unchanged HEAD) and two warnings on untouched lines; no new lint diagnostics or rule suppression. Diff whitespace checks pass. |
| Complete | Sol code/TypeScript/React reviews and Astra security review found no must-fix issue in this delta. Architect independently verified the [runtime/persistence contract](../../deployment/README.md#runtime-and-persistence-contract--not-activation), including /app/media, explicit migrations, protected preview and artifact-dependent origin/cache behavior. |
| Blocking | `tests/architecture/component-source-layout.test.ts:9` lists an old inventory; 17 present modules need source-aware ownership/technical-requirement review. Some are real React hooks, others types/config/feature modules. Do not blindly whitelist them or rename pure modules to TSX. This batch leaves the check blocking rather than silently weakening policy. |
| Open security debt | Previously recorded high dependency advisories remain unresolved and launch-blocking. No dependency version or lockfile changed. |
| Current gate | Owner approved the local checkpoint commit for this batch only. Preserve owner `messages/en.json` WIP and the concurrent owner brand-voice commit `782f629`; Korean is unchanged. No push or subsequent source/infrastructure work is authorized. |

**Next fragile pass, in priority order:**
1. Trace actual production consumers of the 17 flagged modules; distinguish
   legitimate React/type/technical ownership from actual misplaced helpers and
   make the smallest behavior-preserving correction. Graphics/motion refactoring
   needs its live regression path; do not broaden this batch into server work.
2. Keep the two owner-deferred CSS failures visible and nonblocking without
   moving any functional/security check into that category. The default prebuild
   suite remains comprehensive, not green.
3. Use the reviewed runtime contract to prepare a separately approved exact Linux
   image and dedicated DB/media/migration acceptance. No build, credential access,
   database/server/provider action or deployment has run. Public proof policy,
   product facts, operational acceptance and Hideaway recovery/cutover stay on
   the governing plan.

Sanitized test/log/watchdog/review evidence is retained under
`.deployment/batch7b/receipts/`. Every guarded receipt reports no remaining child
PIDs; peak check footprint stayed below 1.3 GiB. Final CLI-descendant audit was
about 4.80 GiB RSS / 3.90 GiB physical footprint with over 16 GiB system headroom;
no unrelated process was stopped. No visual or production acceptance is claimed.

### <a id="step-7c"></a>Batch 7c — local ownership acceptance / commit checkpoint

**2026-11-11 review checkpoint: local implementation and bounded acceptance
complete; owner approved the local checkpoint commit.** Korean calibration belongs to its separate chat. This remains the
site/commerce launch plan; deployment is its final milestone, not a replacement.

| State | Current evidence / next work |
| --- | --- |
| Complete | All 17 flagged modules traced and corrected by actual ownership. Strict inventory now permits only three additional documented feature-private modules, not a blanket directory exception. Six genuine hooks retain React lifecycle code; no cosmetic TSX conversion. |
| Complete | Test-first RED preceded the source moves. Exact shader/default/lifecycle/scheduler parity and architecture checks pass. Focused architecture/link/reading/checkout run: **216/216**. Subsequent auth/focus/expiry/reauth/outage repair run: **112/112**; groups overlap the full suite and must not be summed as unique coverage. |
| Complete | Final guarded functional gate: **2,149 tests, 2,110 pass, 0 fail, 39 existing opt-in skips**. The source-ownership blocker is resolved. Stale selectors/feedback assumptions now use canonical catalogue keys or semantic DOM text; the original motion, focus, proof-expiry, no-grant, caller-identity and recovery assertions remain. No UI copy changed in this batch. |
| Complete | Final compiler passes at the existing project 2,048 MiB heap setting within a 4 GiB guard. The first attempt used the guard's lower default 1,536 MiB heap and exhausted that heap; it did not breach the workload ceiling. No limits were raised beyond the existing compiler contract. |
| Baseline debt, not a lint pass | Scoped lint of 45 files reports **12 errors and 44 warnings**. Guarded comparison with their HEAD predecessors, including renamed files, reproduces every diagnostic: **zero new diagnostics**. No suppression or waiver. These existing React/type lint issues remain recorded, not reclassified as CSS debt. |
| Deferred, nonblocking | The two explicitly owner-deferred CSS suites still report **2 failures** separately. Their assertions remain intact and in comprehensive default discovery; no functional/security test was moved into that category. |
| Complete, bounded visual acceptance | Real production graphics components rendered at **1365 × 900** and **390 × 844** in a synthetic local fixture. Verified gradient/ticker/rail/dial rendering, no horizontal overflow, progress 25% → 75%, claims 2 → 1 → 0 with demand-loop pause, and remount restoring 2 claims without losing progress. No console errors. Only the navigation store is mocked; the fixture supplies the component's navigation foreground token. This is not full-site composition, physical-device or FPS/timing acceptance. |
| Complete | Independent code, TypeScript, React and Astra security reviews found no remaining must-fix delta. Two independent Santa reviewers inspected desktop/mobile screenshots and passed bounded ownership/representative visual acceptance. Notification action is byte-identical to its predecessor and retains session-derived identity and collection access enforcement. |
| Complete | Synthetic preview HTTP boundary checks: **9/9**. Exact-root GET document navigation is allowed so extension-driven entry works; wrong Host/Origin, cross-site scripts/embeds, writes, queries and unapproved assets remain rejected. This exception is confined to the inert, loopback-only test fixture, not production. |
| Resolved | The owner authorized coordinating with **Review Sophomores To-Do plan**. Its shared-checkout lock was already released when checks resumed; coordination requested it remain free. No other chat's process was terminated and no guard was bypassed. Preview is stopped, its port closed, temporary browser tab closed and viewport override restored. |
| Historical validation base / preservation (2026-11-11; 7c later shipped in pushed `fb4ca49`) | The concurrent copy checkpoint `1266bee` is the validation base; local `origin/main` remains `cb82492`. This approved Batch 7c checkpoint contains only its reviewed paths; no push is authorized. Preserve the remaining owner English edits, Korean catalogue, docs deletions/Ulysses files and Korean calibration artifact. Both catalogue hashes stayed unchanged throughout this batch. |
| Historical local gate (2026-11-11; 7c later shipped in pushed `fb4ca49`) | **Owner approved the explicit-path local Batch 7c commit on 2026-11-11.** Stop after recording this checkpoint: no push, next batch, dependency change, image build, database/migration/provider action or deployment is included. |
| Open security debt | Fresh guarded production-dependency audit: **3 high, 1 moderate, 1 low; 0 critical**, consistent with recorded debt. Manifest and lockfile are unchanged. Astra security review permits only this approved ownership-only local checkpoint; exploit reachability is not established and dependency assessment/remediation remains launch-blocking. No waiver, upgrade or release approval. |
| Still pending on the governing plan | Baseline dependency advisories and lint debt; separately approved image/runtime/data acceptance; public verification policy; approved product/shipping/policy facts; real customer/operator/address/payment/device acceptance; Hideaway recovery and eventual cutover. No production/public-sales readiness claim. |

#### Applied correction by actual owner

| Modules (17 total) | Finding / applied disposition |
| --- | --- |
| Six real hooks: `UX/Tour/hooks/useAnchoredRect.ts`, `UX/Tour/hooks/useTourTarget.ts`, `gl/canvas-frameloop.ts`, `shell/ticker/useBezelDisplacementTexture.ts`, `shell/ticker/useLaneScheduler.ts`, `ui/tick-indicator/useSyncedMotionValue.ts` | Retain React-bound ownership and behavior; `.tsx` is justified by existing effects/state/frame subscriptions, not a token React import. Tour hooks have no current production consumers; preserve them rather than silently expanding into dead-feature removal. |
| `UX/Transition/pageGroups.ts` | One production owner, `useTransitionSetter.tsx:9`. Fold classification/selection into that owner without changing route decisions, timing or easing. Do not treat reference-only Hideaway callers as active consumers. |
| `core/Link/ReferencedLink/getUrlFromReference.ts` | One production caller, `ReferencedLink/index.tsx:36`; the helper only delegates to an optional resolver. Inline that delegation at its existing owner; retain unresolved-reference behavior and test it through the component. |
| `core/Link/types.ts`, `core/Media/types.ts` | Link contracts belong with the actual Link/ReferencedLink/Button owners, with type-only imports at consumers; no generic type dump. `ViewportSizes` derives solely from `cssVariables.breakpoints`; colocate it with that canonical data and update its three consumers. Preserve exported contracts rather than deleting unused-looking members casually. |
| `gl/layers.ts` | Six production consumers across canvas, shell and sections justify the existing `src/constants/` scope. Move the exact stacking data to `src/constants/site-layers.ts` (a new file in that existing scope); do not change values or styles. |
| `shell/menu-shaders.ts` | Sole production owner is `menu-gradient.tsx:8`. Inline byte-identical shader strings there; no shader/math rewrite. |
| `shell/ticker/field-config.ts` | Genuinely shared by the ticker server shell, client island and mesh. Use `ticker/_shared/field-config.ts` as a documented narrow exception. Move shared scheduler bounds/defaults there too so configuration no longer imports runtime values from a client-hook module. Keep all defaults and scheduler math unchanged. |
| `notifications/mark-read.ts` | A real `use server` action imported by the client inbox, not a React component. Relocate it to the existing notifications collection's server ownership scope; preserve authentication, `overrideAccess: false`, result/error behavior and the offline test interception boundary. No database call is authorized by moving its source. |
| `tickets/_shared/checkout-intent.ts`, `ui/tick-indicator/_shared/magnify.ts` | Already justified sibling-shared pure modules: checkout/result share the same recovery record schema; TickIndicator/TickDial share geometry. Retain with explicit inventory rationale and behavior coverage, not a blanket `_shared` exemption. |
| `ui/tick-indicator/index.ts` | Pure re-export facade with one active barrel consumer, `radio/progress-rail.tsx:5`. Import the actual component directly and remove only the facade. Preserve TickDial and its behavior. |

#### Fragile final pass and execution boundary

1. Prove ticker server/config imports do not cross into the client hook. Preserve
   exact shader strings, numerical defaults, GPU cleanup, scheduler behavior,
   canvas claim reference counting and stacking values.
2. Preserve server-action authorization and test interception: moving a file must
   neither bypass access control nor make offline tests contact Payload/providers.
3. Keep checkout persistence keys/schema, recovery and payment identities unchanged;
   keep navigation decisions and account/caller state unchanged.
4. Add behavior/ownership assertions before source moves. Retain strict unexpected
   module rejection and the two visible, nonblocking CSS suites; do not use this
   pass to conceal a functional failure or claim full release acceptance.

The owner's Batch 7c approval covers local source/tests, one guarded workload at a time,
provider-free preview review and this plan only. It excludes installs/upgrades,
credential access, database/migration/container/provider actions, image builds,
publication, deployment, commits and pushes. Preserve the owner's English-copy
edits, Korean catalogue, documentation deletions/Ulysses files and the separate
Korean calibration artifact. Guarded offline checks and the isolated preview have
run; no image build or infrastructure action has run in Batch 7c.
Sanitized watchdog receipts are under `.deployment/batch7c/receipts/`; all completed
checks report certain cleanup and no remaining child PIDs. One interrupted preview
teardown produced a transient supervisor-probe error; its receipt also confirms
certain cleanup and no remaining child PIDs. No workload ceiling breach occurred.
The final test/check peaks were below 2.2 GiB, and the preview peak below 0.5 GiB.
These are sampled watchdog measurements, not kernel quotas or a whole-repository
coverage percentage. No unrelated process
has been stopped. English and Korean catalogue hashes remain unchanged by this
batch; unrelated concurrent member-auth test edits are excluded from its scope.
