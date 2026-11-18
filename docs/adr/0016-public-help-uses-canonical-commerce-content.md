# 0016: Public Help uses canonical commerce content

- Status: accepted under delegated design authority
- Date: 2026-11-18
- Scope: Help and Shipping/Returns pages, not publication or commerce mechanism approval

## Context

The Help and Shipping/Returns routes were heading-only scaffolds. The owner directed autonomous, page-first delivery, normally following The Hideaway with necessary fixes. Its inspected source has no dedicated Help/Shipping route; its editorial layouts use semantic theme tokens, generous spacing and direct navigation. Existing Sophomores account settings, shop and policy routes are real destinations; the account overview and order-list scaffolds are not useful substitutes.

Approved seller and policy content already has one server projection: `loadPublishedCommerceDisclosure`. The current offer owns delivery charges and dispatch timing through `loadCommerceOffer`. A null result is missing information, not a default fee, policy or confirmation of a request.

## Council

- Architect, recorded before consultation: build a task-based editorial index and use canonical policy/disclosure content, avoiding a second support backend or duplicated terms.
- Skeptic: a link directory does not answer a purchase question; sending a previous purchaser to browse the shop is especially weak.
- Pragmatist: implement the two pages now, with real navigation, canonical returns paragraphs, conditional seller contact and explicit unavailable states.
- Critic: labels must not promise tracking, return requests or receipts the destinations cannot provide; retain all policy conditions.
- Strongest dissent: a policy dump with a shop link is not a useful shipping page. This changed the implementation: show current-offer delivery charge and dispatch schedule directly when available, explicitly distinguish them from previous orders, and never label account settings as order management.

## Decision

1. Help is a task-based editorial index: Shipping/Returns, actual account settings and the shop, followed by seller contact and policy navigation.
2. Shipping/Returns renders current-offer shipping facts and approved return sections without rewriting their substance. Previous-order details are not inferred from the current offer.
3. Seller contact is rendered only from the approved public disclosure projection. There is no contact form, request receipt or fabricated support availability.
4. Null/read failures produce explicit information-unavailable text while retaining usable navigation. They do not block source implementation or cause fake operational promises.
5. Shared PageFrame uses the existing semantic foreground/border/typography roles, fixing the former dark-only heading treatment in light mode. No new palette, dependency, authentication or storage mechanism is introduced.
6. Shop and Help are reachable through the existing mounted Hideaway menu. Its choreography is retained; the navigation region is bounded and scrollable on short viewports rather than extending the existing fixed-position list beyond the screen. No competing navigation shell is introduced.

## Alternatives

- Static FAQ with copied policies: rejected because terms and shipping facts would drift from the canonical sources.
- Wait for all operational facts: rejected because honest data states and supported navigation can be implemented now.
- New support/returns/tracking forms: rejected because no corresponding mechanism exists in this scope.
- Link-only Shipping page: rejected after council; current-offer facts can be displayed directly using the existing loader.

## Consequences And Reassessment

### Related Public Page Implementation

The same content ownership applies to the current single-offer shop and policy-reading pages. The shop retains its real `/shop` route and unchanged purchase children, with semantic editorial presentation and an explicitly dark purchase panel until its existing dark-only descendants are restyled by their owner. A purchase-options anchor navigates to that panel; it does not submit a payment. Availability uses the current offer's public quantity, not personal eligibility.

Policy reading follows The Hideaway's actual `DocsShell`: desktop contents/related navigation and readable mobile flow. Undine's narrow patch also exposes optional `document` and `showSeller` presentation props so its newer callers remain compatible; Hamlet's existing callers use neither. An explicitly supplied rich-text document wins over fallback policy sections. No business-info loader, CMS config or seller data is copied or changed. This is a view contract, not new legal-content authority.

Source delivery is separate from live visual acceptance. Missing approved data remains visibly missing, not deemed complete operational content. No deployment, provider, payment or legal approval follows from this ADR.

Reassess when a real order-history/support read model becomes available, when multiple public offers need selection, or when shipping facts must remain available outside the current sale window. Reuse the owning mechanism rather than extending a generic help catalogue into a second commerce source.

## Shipping Projection Reassessment - 2026-11-18

Independent source review identified that `loadCommerceOffer` hides delivery facts outside the sale window. Help now consumes Auth's reviewed `loadPublishedCommerceShipping` / `CommerceShippingFacts` projection instead, once Maintenance adopts that prerequisite. The projection retains publication, product and associated-event validation and exactly-one-product selection; absent, invalid or ambiguous facts remain unavailable. It supplies no stock, purchase eligibility or historical-order evidence.

This supersedes only the current-offer shipping source in decisions 2 and the related alternatives above. The named product's published delivery charge and dispatch schedule remain readable after sales close; copy explicitly separates those facts from purchase availability and previous orders. Returns and seller contact retain their existing disclosure source and failure handling. No page-specific query, product chooser, first-row fallback or purchase-loader modification is introduced.

Keeping the offer loader would hide useful published information after a sale. Duplicating its query in Help would create a second commerce authority. Showing all products or selecting the first would change the reviewed selection contract, so multiple-product selection remains a future owning-mechanism task. Restore only this caller delta and its three English values together if the projection is withdrawn; reassess when an explicit product-selection or historical-order contract exists. Source review does not establish post-sale, ambiguous-product, database or live visual acceptance.

## Original Presentation Restore

To restore the earlier presentation, revert only the Help route files, their new catalogue keys, the help contact component, PageFrame changes, the menu data/viewport-style addition, and the offer/policy view changes from this batch. Preserve independent Arc globals and all pre-existing staged work. Policy data and purchase mechanisms are unchanged; no data migration or credential rollback is needed.
