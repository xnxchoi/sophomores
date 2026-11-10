# Commerce launch plan

**Updated:** 2026-11-10. **Phase: Batch 7a locally validated; Gate 2 approved for the local checkpoint commit only.**
This is the owner-approved implementation contract, not approved public sales copy
or a claim that the implementation, PG review or launch is complete. The execution
worklist below is the current progress panel. Earlier local commerce receipts are
in [the commerce QA archive](../qa/src-stabilization-20261109.md#payload-commerce-implementation--current-progress);
the latest repository-wide baseline is in
[the i18n checkpoint](../qa/i18n-consolidation-20261110.md).

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

## Admission, guest assignment and optional registration

- **One coin guarantees one admission.** The buyer can assign a guest name for
  each admission; that guest does not need an account to attend.
- Each guest may optionally complete their own full verified registration and
  secure claim. That individual claim grants **four Part I drinks** and shared
  **Part I → Part II transport**. Registration by the buyer does not unlock
  packages for other guests.
- One account may claim only one guest package per event. Claims and redemption
  must prevent duplicate grants/use, concurrent claims and unauthorized transfers.
- Buyer editing stops once an admission is claimed or checked in. Later corrections
  are staff operations, initially superadmin-only. Returns involving checked-in
  admission or consumed benefits require review, not automatic entitlement rollback.

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

The owner asked this session to handle execution, not make them paste routing
commands. The `plan-orchestrate` command output was routing only; it neither ran
the commands nor approved every command's internal actions. Use this worklist to
continue the same plan and close actual gaps, not rebuild locally accepted work.

| ID | Scope | Current checkpoint / next acceptance | Dependencies and approval boundary |
|---|---|---|---|
| <a id="step-1"></a>1 | Plugin/identity/legacy compatibility | Local compatibility and preserved historical records accepted; retain existing authority. Public configuration and target data acceptance remain. | No second identity store, new staff grants or history rewrite. |
| <a id="step-2"></a>2 | Plugin commerce and PortOne adapter | Local catalogue/cart/transaction/finalization and replay coverage exists. Current-plugin real provider acceptance remains in step 8. | Do not recreate the engine or infer payment activation from synthetic PAID tests. |
| <a id="step-3"></a>3 | Allowance, shipping, admission and perks | Local safeguards/operational code accepted. Authenticated operator/device acceptance and approved physical-product facts remain. | Preserve net-three, name-only admission and one package per registered account/event. |
| <a id="step-4"></a>4 | Checkout/admin/publication surfaces | Local and synthetic UI checkpoints exist. Real account/CMS/address journeys and publication approval remain in step 8. | Missing owner facts stay fail-closed. Copy research stays in its separate read-only chat. |
| <a id="step-5"></a>5 | Regression and review | Batch 7a fresh guarded compiler and focused deployment/auth/verifier/commerce checks pass. Last full-suite baseline remains 2,084 passes, 4 retained failures and 39 opt-in skips; not rerun or waived in 7a. | Step 7b must distinguish deferred CSS from real functional/security defects; no silent skip or false green. |
| <a id="step-6"></a>6 | Public membership and phone-verification readiness | **Design/owner policy needed.** Local mode, HTTP authority, receiver/runtime and carrier trust are separate controls; public trust currently denies all grants. | Confirm production origins, ingress/sender-number assurance, carrier coverage and key-rotation policy before public enablement. The local pinned 1024-bit exception is not production approval. No new fence based merely on `NODE_ENV=production`: a production-built local TEST server is still a valid local use case. |
| <a id="step-7"></a>7 | Release configuration, persistence and gate contract | **7a locally validated, awaiting commit approval:** synthetic command-scoped build/package-smoke inputs; runtime schema unchanged. **7b later:** explicit release-check disposition, dedicated database/media/migration inputs, actual image acceptance. | Gate 1 approved; Gate 2 before commit. No production secrets in build, implicit migrations, provider activation, image build or server work in 7a. Public functionality in step 6 remains mandatory. |
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
| Current gate | **Gate 2: owner approved the local checkpoint commit only. No push or subsequent batch authorized.** Commit: `fix: isolate build and packaging smoke configuration`. Include the reviewed source/tests and the existing root-owned planning/inventory documentation; exclude `messages/en.json`. |
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

After Gate 2, only the approved commit is authorized; push and external execution
remain separately scoped. Do not start 7b as an implied continuation.

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
