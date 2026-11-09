# Commerce launch plan

**Updated:** 2026-11-10. **Phase: local implementation review checkpoint; launch gates open.**
This is the owner-approved implementation contract, not approved public sales copy
or a claim that the implementation, PG review or launch is complete. Current work
and evidence are tracked in the [QA progress panel](../qa/src-stabilization-20261109.md#payload-commerce-implementation--current-progress).

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
