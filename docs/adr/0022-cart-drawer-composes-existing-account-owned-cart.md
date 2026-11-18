# ADR-0022: Cart drawer composes the existing account-owned cart

**Date**: 2026-11-18
**Status**: accepted
**Deciders**: Hamlet under owner-delegated design discretion; Main scoped ownership

## Context

C4/P3 requires a reachable contextual cart surface. The integrated target already
has `CommerceCart`, its existing `CommerceAccountGate`, an approved-offer loader
and a real `/shop/cart` page. The account hub currently links to that page. Header
and C5 work have separate owners and are excluded from this batch.

The Hideaway SideDrawer uses a bottom surface on phones and a side surface on
desktop, but also imports unrelated radio, cursor and provider dependencies.
The target already provides a Base UI 1.9 Sheet with modal focus, dismissal,
portal and scroll ownership. Its installed types and version-specific
documentation support controlled state and explicit return-focus references.

## Decision

The existing account Cart card opens a page-owned Sheet composition under
`me/_cart`. Keep its real `/shop/cart` href for no-script and modifier navigation,
and expose a full-page link inside the surface. Bind the existing approved-offer
loader and unchanged account gate/cart view; do not author another cart store,
auth provider, data endpoint, financial action or modal framework.

Use a full-width bottom tray only for narrow coarse-pointer viewports. Fine-pointer
windows retain a full-height side surface even when narrow; wider surfaces are
capped at 40rem. Existing Tailwind pointer/viewport variants coordinate the size
and entry axis without a new media-query watcher. A left 48px close control,
native Sheet focus/Escape behavior, contained body scrolling and safe-area padding
remain available. Mark the owned popup with existing `data-lenis-prevent` so the
unchanged root Lenis does not consume its native wheel scroll. No fake grabber
implies a swipe gesture the Sheet does not own.

## Alternatives considered

### Copy The Hideaway SideDrawer
- **Pros**: Matches its existing layout and gesture implementation.
- **Cons**: Pulls unrelated providers and custom shell motion into this feature.
- **Why not**: The installed target Sheet supplies the needed modal behavior.

### New header cart control or separate cart/provider implementation
- **Pros**: More globally prominent entry.
- **Cons**: Collides with frozen header/C5 ownership or duplicates account/cart
  authority and mutation semantics.
- **Why not**: Account entry is reachable now without taking another owner's scope.

### Navigate to the cart page only
- **Pros**: Smallest existing supported path.
- **Cons**: Does not deliver the contextual drawer requested by C4/P3.
- **Why not**: Retain it as the actual fallback and full-page alternative.

## Consequences

### Positive
- Existing pricing validation, unknown/empty distinction, removal confirmation,
  session isolation and cart refresh remain with their current owners.
- Closing the surface does not issue sign-out, cart reset, order cancellation or
  payment actions; it returns to the account entry.
- No global header, shared primitive, catalogue authority or SDK mechanism changes.

### Negative
- The account page resolves its existing published-offer projection for the entry.
- The primitive owns mount/unmount; no new promise is made that transient input
  or feedback inside the closed surface survives remount.

### Risks
- If existing auth/modal coordination cannot safely host the unchanged gate,
  keep `/shop/cart` as the working action and hand back the exact capability gap;
  do not override the owner's lifecycle or invent another registration surface.
- Live pointer adaptation, keyboard focus/dismissal, safe-area scrolling,
  modifier navigation and session-return behavior remain unverified until the
  existing complete-surface browser lane; source review is not acceptance.

## Restoration and reassessment

Restore the original account Cart link from the exact saved preimage, remove only
the new page-owned `_cart` composition and its two copy leaves if unchanged, and
retain or supersede this record. Never reset unrelated WIP. Header entry and any
future quantity-editing changes require their own actual ownership/contract work,
not an implied expansion of this composition batch.
