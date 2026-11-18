# 07 - Selected book: page and edition consumer contract

2026-11-18. DS05 implementation contract, not commercial publication or visual
acceptance. This supplements 01-06 without rewriting their historical proposals.
The newer owner direction is recorded in the canonical Maintenance checkout's
`docs/qa/auth-payment-nfc/consolidation.md`, section "Owner feedback after the
plan review (17 Nov 2026)". That document is not present in this older checkout;
the source was read directly from canonical rather than copied into local history.
Presentation decisions are delegated to Hamlet. Auth owns edition identity,
publication, price, reservation, immutable snapshot and settlement mechanisms.

## Reader task and page order

The visitor needs to understand the physical book, compare the available editions
and know what can actually be purchased. Lead with the book and its approved
photography/artwork, then the contents and edition differences, then delivery,
material conditions and the supported next action. The book is not a renamed
coin or an explanation that a key is a free gift.

Use the selected Stripe Press book treatment and moto-card scroll reference from
[04b](../commerce-experience/04b-references.md). Keep genuine content readable
without dragging a model or completing a scroll sequence. No fabricated cover,
trim, spine, page count, paper stock or shipping date fills missing content.
The local F8 inventory has no approved book artwork; decorative frames and teaser
assets are not product photographs. No CMS absence was established by that audit.

## Edition meaning

| Edition | Owner proposal, not a live quote | Presentation boundary |
| --- | --- | --- |
| Book-only | KRW 35,000 | Physical book; do not infer personalized cover or membership benefits. |
| édition personnelle | KRW 82,000 | Cover personalized by printing; yearbook name, quote and submitted image subject to editorial approval. Permanent yearbook slot and proposed future priority seats do not promise guaranteed admission or perpetual membership. |
| Premium | KRW 329,000, concept only | Do not expose an actionable option, detailed comparison or price-driven purchase action. Issuer, transit/payment capabilities, metal hardware and replacement conditions are not established. |

The personal edition's complimentary plate/bound token is a release-only offer;
this is not a specified token expiry. Customer presentation is about the real
benefits, not NFT terminology. The personalization no-return intent is not a
validated blanket returns policy. Preserve defect, damage and incorrect-item
remedies and do not extend an exception automatically to book-only.

These proposal amounts must never become client quote constants, invented CMS
rows, price fallbacks or submitted payment values. Actual offered prices and
published wording come from the owning projection.

## Concrete consuming seam

Current `src/app/(site)/shop/page.tsx` is a server page. It loads the approved
legacy offer and renders `CommerceOfferView` with the existing
`CommerceAccountGate` / `CommerceCheckout`. The new book consumer belongs at
this real server-to-view seam, using Auth's actual exported projection directly.
Do not create an unused projection facade, another payment flow or a selector
that submits a variant to the legacy coin checkout.

`/shop/[slug]` remains the intended PDP route, but requires a real published slug
and an exact product lookup from its owner. Do not fabricate a slug from a title,
choose the first published row or make a static route with a fake product. If
the first delivered projection has no slug, consume it at the existing `/shop`
seam rather than claiming the dynamic PDP is implemented.

The Hideaway's `src/lostinseoul/product-price-display.ts` checks actual SKU
identity, actionable mode and valid price before exposing purchase capability.
Carry that meaning, not its application-specific implementation. Use the target's
native edition/variant identity and existing commerce owners.

## Projection requirements

The final exported TypeScript type and loader names belong to Auth, not this
document. The actual contract must distinguish these meanings:

- Stable product/release identity and a distinct edition/variant/SKU identity;
  a display label or index is not identity.
- Published title, edition labels and description, with approved content scope.
- Authoritative KRW display price or explicit absence. Missing is not zero,
  free, the old coin price or the owner's proposal amount.
- Approved product media and their roles where already supported. An absent
  book image does not authorize unrelated decorative imagery or a synthetic cover.
- Publication/readiness state, including explicit `purchaseReady: false` in the
  first display-only edition projection authorized by Main/Auth.
- Any customer-visible allowance must represent the actual release/account
  mechanism, independently of the one-unit-per-purchase constraint.

Do not infer current inventory, accepted policies or an actionable price from
mere publication. Display-only projection is not the immutable order contract.
Native variants exist in the installed ecommerce plugin, but canonical commerce
currently rejects variant lines and snapshot v1 has no edition identity. That
mechanism must be deliberately versioned by its owner before purchase is wired.

## State and action contract

| Actual state | Necessary content | Supported next action |
| --- | --- | --- |
| No published book projection | Clear unavailable state; no sample book or speculative amount | Existing Help navigation; no payment or forced signup |
| Published display-only edition | Actual identity, supplied facts and price if present; purchasing is not open | Reading/comparison only; no purchase href, checkout intent or OTP |
| Missing price/media/policy | Distinguish the missing fact without inventing it | Do not unlock purchase from client state |
| Future purchase-ready edition | Fresh authoritative selection, price, required conditions and capability | Existing owner-approved checkout receives real edition identity only after its mechanism supports it |
| Purchase-intent account entry | Preserve selected edition through the existing supported flow | Existing capability-gated social signup, or social/registered-email sign-in; code sending needs its own explicit press |
| Standalone signup | Account task only | Return to account/caller; no unsolicited checkout |

No generic payment button is rendered merely to look complete. A disabled
purchase control must not conceal a working unrelated legacy action. Surface
absence and unready state honestly rather than claiming sold-out or payment
failure. Browsing editions does not send codes, reserve stock or mutate a cart.

The current account contract permits social-only signup through Apple, Google
and Kakao when enabled; email codes are for registered-email sign-in. Preserve
the existing provider capability switches and new-email lookup distinction.
This page does not introduce email signup or promise an unavailable provider.

### Native absence is not native ambiguity

The actual Auth v3 result distinguishes `product-unpublished` (no approved native
parent) from `product-ambiguous` (multiple approved native parents). Only explicit
`native-schema-unregistered` or `product-unpublished` may retain the independent
legacy Shop branch. Ambiguity, invalid native configuration, unpublished editions
and actual read failure show unavailable book information without an unrelated
legacy checkout. A null projection is not proof that the native product is absent.
The legacy offer/gate/checkout remains unchanged; this does not enable native
edition purchasing or retire legitimate legacy records.

## Acceptance and restoration

Before integration, independently review the actual projection and consumer
together: unavailable data, absent price, concept-only premium, edition identity,
unready action absence and unchanged legacy controller boundaries. Place tests
under root `tests/`; do not manufacture production fixtures to make a selector
look functional. No tests were run for this documentation contract.

Browser/Santa acceptance remains necessary for actual UI work, including narrow
touch/fine-pointer layouts, anchored controls and real artwork/motion. No live
book page or source-only visual acceptance is claimed here.

Keep changes additive and scoped. Reassess with a superseding ADR if the real
contract differs; do not reset another owner's source, catalogues or schema.
