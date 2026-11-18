# 0018: Cart uses the existing account-owned provider

- Status: accepted under delegated design authority
- Date: 2026-11-18

## Context

The inherited P4 cart route was a heading-only scaffold. The Hideaway's actual LOSTINSEOUL cart page presents product media, saved lines, quantities, removal, totals and a purchase continuation. Its independent store, product routes and custom styles are not Sophomores' commerce contract. Sophomores already has a membership-gated ecommerce provider and a working purchase composition at `/shop`; `/shop/checkout` remains a scaffold.

## Decision

Render cart contents through the installed ecommerce `useCart` hook inside the unchanged `CommerceAccountGate`. Retain the reference's task-based line/estimate/continuation structure without copying its store, custom CSS, branding or checkout destination. Use a scoped dark island for the existing account presentation, semantic Tailwind styling and the shared page wrapper; shared page motion remains owned by the public layout.

Quote an estimate only for exactly one saved line matching the validated current offer, with a supported quantity and safe integer arithmetic. Never substitute the cart's subtotal or invent prices for unknown, stale or multiple releases. Continue explicitly into the real `/shop` purchase flow; final availability and amount remain its responsibility. A missing cart is unavailable, not proof of emptiness.

The installed SDK catches removal errors and returns `Promise<void>`. A resolved promise therefore does not prove removal. Announce success only when observed same-cart state no longer contains the requested row. Otherwise report that removal is unconfirmed and offer the SDK's explicit refresh action for an available cart. Do not duplicate its fetch implementation or access cart secrets.

## Alternatives

- Copy the reference's cart store: rejected because it would create a second selection/session authority and unapproved guest-cart behavior.
- Continue to `/shop/checkout`: rejected because that route does not contain the actual purchase composition.
- Trust `removeItem` fulfillment: rejected after reading the installed implementation; failed HTTP calls can resolve without changing the cart.
- Show a total for every saved row: rejected because current published offer data does not validate prices for arbitrary or multiple releases.

## Consequences And Reassessment

The page exposes real saved cart state without changing account, membership, payment, SDK or persistence mechanisms. Unsupported states remain visible and navigable, but some saved items cannot receive a price estimate here. Reassess after a mechanism owner supplies an authoritative multi-release cart projection, a real dedicated checkout page or an explicit operation receipt.

Independent source review and catalogue preservation do not establish runtime, keyboard, visual or purchase acceptance. Exercise loading, unavailable/empty/matching/stale/multiple-line states, removal failure, refresh, account changes and responsive themes in the existing serial live-review lane.

## Dedicated Checkout Reassessment - 2026-11-18

Auth now supplies a real `/shop/checkout` server page using the existing offer, capabilities, account gate and checkout composition. Once Maintenance adopts that reviewed route and reconciles the composed source, the cart may navigate there for a matching single, unpurchased, non-variant line with quantity one and sufficient current published availability while no load/mutation is pending. This follows the actual mechanism's one-unit purchase contract; the older quantity-two-or-three estimate is not checkout eligibility.

Empty, unavailable, loading, stale, multiple-line, unsupported-variant, purchased or currently unavailable selections keep their existing Shop destination and recovery actions. The estimate, remove/refresh SDK calls, state and notices are unchanged. The destination is an opportunity to review, not a stock reservation or authorization to pay; the existing checkout mechanisms revalidate the actual server cart and authoritative amount.

This supersedes only the earlier dedicated-checkout alternative and primary continuation destination for that narrow supported state. Keeping every cart on Shop after a real route exists would add an unnecessary detour; routing every saved cart to checkout would imply support for invalid selections. No client cart transfer, address storage, payment state or new provider is introduced. Reassess on a changed quantity/variant contract or authoritative multi-release cart support. Reverse only this exact CTA/gating delta and its one additive/two replacement English values (and new empty KO key) to restore the prior Shop-only navigation; no data rollback is needed. Actual cart continuity, keyboard, focus and visual/Santa acceptance remain unperformed.

## Original Cart Restore

Restore only the cart route scaffold and remove the new cart component and its catalogue additions. No persisted cart, provider, account or payment state changes need reversal. Preserve other public UI batches and unrelated staged work.
