# Commerce launch plan

Updated: 2026-11-09. This is the current engineering reference for the revised
offer and launch follow-through, not approved public sales copy. This pass records
requirements; it does not change checkout, install dependencies or publish claims.

## Objective and the change in direction

The original objective was a finished teaser site connected to registration,
member management, ticket sales and PortOne payments, ready for PG inspection.

The intended offer is now a **shipped physical collectible coin**, with an
invitation to an exclusive brand event as an ownership benefit. This is a product
and fulfillment change, not just a replacement of the word “ticket”. The actual
product, invitation benefit and their conditions must all be disclosed to the PG.

Owner requirements:
- Show and describe the actual physical product, including representative images.
- State the shipping/dispatch schedule; the intended offer is not a preorder.
  Do not claim stock-ready/non-preorder status until inventory and fulfillment
  readiness support that claim.
- Collect a recipient shipping address using a standard address-search service.
- Limit purchases to **three coins per person across orders**, not merely three
  in a single checkout. The operational identity/counting rules still need definition.
- Keep physical fulfillment separate from the event-invitation entitlement.

Earlier ticket prices, event dates and event-date refund cutoffs do not
automatically become coin prices, dispatch dates or physical-goods return terms.
The old ticket-offer documents are background, not the revised offer specification.

## Where we are

| Component | Established | Remaining |
| --- | --- | --- |
| Landing and brand UI | Existing implementation and substantial auth/checkout refinement. | Final product presentation, content and cross-device launch acceptance. Landing was not visually re-audited in this pass. |
| Account and registration | Local email/Google sign-in, real SKT phone proof and registration binding accepted; ticket selection unlocks after authoritative verification. Club approval is separate from purchase eligibility. | Staff/recovery and adverse-path final acceptance; production/provider boundaries remain separate. |
| Payments | Real KPN V2 TEST payment independently verified PAID and local paid for ₩1,000; reference, owner, channel, currency and amount matched. | Payment branching, webhook delivery and operational acceptance; no live-payment/deployment approval. |
| Orders and limits | Durable preparation, strict provider references and reconciliation safety exist for ticket orders. | Physical SKU/items, inventory/reservations, recipient/address snapshot, shipment/tracking, invitation entitlement and cumulative three-coins-per-person limit. Current source still permits up to six per order. |
| Public commerce | Seller/disclosure surfaces and publication guards exist. | Actual approved policy bodies and suitable business contact; truthful physical-product, delivery, returns and benefit disclosures. |

Payment evidence, test receipts, resource stops and the current service checkpoint
remain in the [QA progress panel](../qa/src-stabilization-20261109.md).
The successful run had 242 ticket tests passing and a clean full TypeScript check;
this is not a claim of production or complete website acceptance. The TEST preview
was stopped and persistent payment mode remains disabled. The original manual-
approval attempt remains pending as evidence, not an additional paid purchase.

## Queued payment branches

These are follow-through tasks, **not scenarios established by the happy-path
sandbox run**. Existing provider-free tests and the
[uncharged recovery reference](portone-uncharged-recovery.md) are starting points,
not substitutes for gateway/browser acceptance.

| Scenario | Required behavior / acceptance |
| --- | --- |
| Cancel to change payment method | Preserve account, product, quantity and address. Distinguish abandoning payment UI from cancelling an order or signing out. Offer another available method only after the previous attempt is safe to retire. Other methods are not implemented merely because CARD works. |
| Gateway close, Back or explicit cancellation | No false success, lost cart or automatic new payment. Retain the exact attempt and resolve its authoritative state. |
| Request timeout / connection loss before a response | Treat the outcome as unknown, not automatically failed. Query/reconcile the existing reference before allowing another payment. |
| Connection loss after approval / delayed confirmation | Recover the paid order without another charge or duplicate fulfillment. Show a stable pending/recovery state while status is unavailable. |
| Provider decline or failure | Give an actionable in-place retry/method-change route after authoritative failure. Preserve inputs and use a valid attempt lifecycle. |
| Refresh, tab close/reopen, mobile redirect, blocked popup | Recover the same identity/order context; test actual mobile and in-app browser behavior. Never launch payment automatically on restoration. |
| Session expiry / account switch | Reauthenticate without losing the attempt. Never attach another account to the old order or expose its recipient details. |
| Double click, concurrent tabs or repeated orders | Idempotent preparation and approval, atomic inventory/person-limit enforcement, one fulfillment effect. |
| Delayed, duplicated or out-of-order callbacks | Verify signatures and reconcile authoritative provider state. Never regress paid/refunded/held state from a stale event. Webhook delivery itself remains untested. |
| Timeout of a stock/limit reservation | Do not release stock or purchase allowance while approval is uncertain; resolve provider state first. Define expiry and counting rules. |
| Cancellation, partial/full refund, return or exchange | Match physical-goods policy, shipping state and mandatory consumer rights. Define how stock, the three-coin allowance and invitation benefits change. Do not reuse the ticket event-date cutoff. |

Keep short status changes in compact stable slots. Longer errors may reflow once,
but must not jiggle controls or add successive explanatory modals.

## Address search recommendation

Use the official **Kakao/Daum Postcode Service** as the first candidate:
[official integration guide](https://postcode.map.kakao.com/guide).
Current official documentation states commercial use is free, without an API key
or usage limit, and provides Korean postcode/road-name search on desktop/mobile.
No package installation or provider-account setup has been performed.

Use the official script directly unless the installed-library/internal-helper
gate establishes a better existing option; no postcode integration was found in
the searched app or Hideaway source/package manifests. Keep provider branding
and script intact. Confirm actual in-app browser behavior: the guide warns that
custom webviews may be unsupported.

Collect recipient name, delivery phone, postcode, base address and manually
entered detailed address; delivery instructions can be optional. Confirm supported
countries/regions and fees before assuming domestic-only or worldwide delivery.
Provide a manual-entry fallback when search cannot load. Buyer identity, recipient
contact and coin-owner/invitation identity must not be silently conflated.

Validate on the server and snapshot the shipping details on the order. Restrict
address access to its owner and authorized fulfillment staff, keep addresses out
of telemetry, and define retention/courier disclosure before collecting them.
An address book is a separate opt-in feature, not a reason to retain everything.

## Next bounded batches

1. **Settle the actual offer.** Coin specification/photos, real stock/readiness,
   price, dispatch lead time, shipping fees/regions, and invitation conditions.
   Establish the truthful product category before public copy or PG submission.
2. **Adapt commerce.** Model physical items and fulfillment; add address entry and
   order snapshots; enforce the three-per-person rule atomically across orders.
   Define how paid, reserved, cancelled and returned quantities count. Preserve
   financial history rather than cosmetically renaming existing ticket data.
3. **Accept the payment branches.** Cover the matrix above with automated tests
   and separately approved bounded sandbox/browser runs; no blind payment retries.
4. **Finish PG-review readiness.** Product imagery/details, actual shipping
   schedule, seller/contact disclosures, terms/privacy/returns, operational support
   and final desktop/mobile review. Provider changes, dependencies, webhook
   registration and deployment retain their explicit approval boundaries.

### Facts still needed before implementation/publication
- What coin is actually available to ship, at what price, and within what dispatch
  period? Confirm shipping fee, coverage and inventory/readiness.
- Does each coin grant one invitation, guaranteed admission or only eligibility?
  How do multiple coins, gifting/transfers, ownership verification and event
  changes affect that benefit? Do not imply an answer in sales copy.
- What precisely counts toward “three per person”? Define verified identity,
  cross-account handling and whether completed returns restore the allowance.
  A shared shipping address must not become an unsupported identity rule.

The design direction remains restrained and monochrome: clear hierarchy,
consistent typography/spacing, device/input-aware surfaces, visible usable targets,
anchored controls and one coherent motion per state change. Purchase registration
stays inline. Do not turn this into a verbose marketing template or draft new
Korean brand/legal prose without settled facts and editorial review.
