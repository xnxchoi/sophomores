# 04 — Aesthetic and design direction

> **Provisional, archived draft (2026-11-14).** Not an approved direction and not reviewed by the owner in the current design round. It rests on the earlier Analogue and Má reference mechanics, and it conflicts with later owner decisions: the type (this draft rules out serif; the owner chose Narcissian Nectare, then asked for the Hideaway type), the green-led palette (V1), and the flame-as-light (V5). Decisions V1–V5 stay open.

Working draft · 2026-11-13 · Direction for review, not an approved visual design.
Part of [the product sales page plan](README.md). Builds on [01](01-product-definition.md)–[03](03-copy.md).

## What the content asks of the form

| Content fact | What it means for form |
| --- | --- |
| The product is a physical object, and the PG must see the actual product | The first viewport shows a real photograph. Evidence images are shot in neutral, colour-true light. 3D and flame-lit images add atmosphere and never stand in for evidence |
| What the object carries (membership) is invisible and permanent | Continuity of light and object across the scroll makes "it lasts" felt, without a diagram of a blockchain |
| The voice is dry, calm, grounded, affectionate; no selectivity or prestige | No luxury theatre, countdowns, scarcity badges, crests, gold-foil hype or crypto tropes (neon, chains, holograms) |
| Many facts are legally required (seller, product notice, refunds) | A calm, readable fact layer is part of the design. Seller identity and the product notice are visible, not collapsed |
| Buying more than one means giving someone a coin | The gift idea gets one quiet, human beat, not a separate gift-shop mode |
| The visitor may be anyone from a holder to a first-time arrival | The page reads complete without sign-in. Holder lines appear only for the visitor's own signed-in status, in a reserved compact slot so nothing jumps when they resolve |
| The page structure serves later releases too | Reusable structure and launch-only content are kept apart (below) |

## Brand material already available

| Material | Status | Use here |
| --- | --- | --- |
| `BrandMark` + Helvetica | Approved; wordmark integrity rules apply | Only where the site header already renders it. Any new placement needs a wordmark-integrity check first |
| Luminous flame (footer renderer, `public/masks/flame-envelope.png`, `gilded-flame` palette) | Approved shape and mask. The palette is prismatic, violet-blue with gold and copper (`flame-backdrop/config.ts:307-313`), not simply warm. The shared renderer is owned elsewhere | Source of the page's light. Any adaptation onto a 3D coin is **new artwork needing owner review** (decision **V5**) |
| Type tokens: `--font-sans` Helvetica, `--font-heading` mono | In `globals.css` | Mono for eyebrows, labels and figures; Helvetica for reading. The archived spec's serif/mono contrast is not used: the live tokens have no serif, and adding one is a brand decision outside this page |
| Palette `sophomores-tailwind-v4.css` | Tracking the file was approved as a build fix (SPH-BRANDTOKENS-20261112-01), which does not approve the palette. It is imported by `globals.css` and its dark-scheme overrides are live. It is green-led and carries the motto "Sapienter Stulti" | Not used as a direction until the owner confirms its status (decision **V1**). The archived spec warns against a green wash and institutional motifs |
| Reference mechanics (Analogue hero, Má pacing, Analogue pricing breakdown) | Selected as direction ([integration spec](../integration-specification.md) §3). Earlier study executions were rejected | Mechanics only: light that becomes an object, one idea per beat, a clear breakdown |

## Recommended direction: "the coin in the flame's light"

The page opens on a real photograph of the coin on the site's dark ground, with the
approved flame light moving softly around it, not over it. Once the 3D coin has
loaded and been signed off against the production sample (06, I1), it can take over
from the photograph in the same pose and turn with the scroll. As the visitor
scrolls on, the coin comes to rest, and the page moves to colour-true photographs
and plain, well-set information. The flame recedes before the purchase section.

- **Ground:** the site's dark off-black (`--off-black`), so the flame reads as light.
  Information sections may sit on a slightly raised surface; they stay flat.
- **Light:** the flame's own prismatic palette, violet-blue through gold, low and
  directional around the hero. It never tints the evidence photographs, the product
  notice or the purchase panel.
- **Object:** proportions stated with a dimension line (diameter, thickness) from the
  spec fields, not a claim of true on-screen size.
- **Type:** large, quiet Helvetica statements; mono for facts and figures with
  tabular numerals. Short headings, generous measure, left-aligned reading.
- **Depth:** restrained. The 3D coin is the only layered element in the story; the
  purchase panel keeps whatever surface T003 gives it.
- **Motion:** full motion (project default). One coherent motion per state change;
  scroll-linked and reversible; no wheel capture or timed gates. DOM through Motion,
  WebGL through R3F/Three.

### How the flame lights a coin (for V5)

The flame is a 2D field mapped across the screen, so lighting a 3D object with it is
new. The proposed approach is for owner review: sample the palette's stops into a
small set of coloured area lights and a low-resolution environment texture around
the coin. The shared footer renderer is not edited, and its shader equations are
adapted into an isolated R3F layer (integration spec §1). If the footer flame is
mounted on the same page, the two must share one WebGL context or the footer must
stay unmounted until the hero canvas is gone. Two contexts on a phone is not
acceptable.

### Purchase panel boundary

The purchase panel's internals (quantity, inline account entry, verification,
address, payment) belong to T003 and the AGENTS.md account-entry contract. Account
entry and verification use the neutral monochrome palette, so the flame stops at
the panel's edge and nothing behind the panel is tinted.

### Alternative with a real trade-off: "archival light"

A light vellum ground, ink text, and the coin photographed like an object on paper,
with the flame only at the gift and evening beats. It reads well in daylight and
suits a collectible. It depends on the palette V1 must confirm, risks the
institutional motifs the archived spec warns against, and breaks continuity with the
site's dark flame identity. The 3D question (V3) is the same in both.
**Recommendation:** the dark direction.

## Reusable structure versus launch content

| Reusable page structure (any release) | Launch content (Payload, P5) |
| --- | --- |
| Hero slot: product photograph, name, one-line proposition, price, Buy | The hero proposition and the 3D coin |
| Gallery and product details (R-A2, R-A3) | The story beats: what holding it means, the launch evening, buying for someone else |
| What's included and the token rows | Evening facts (R-D) |
| Delivery and activation steps (wording varies by P4) | — |
| Purchase section (T003) | — |
| Seller identity, product information notice, policies | — |

A later release reuses the left column with new content. The 3D hero is optional
for any release; the page is complete without it.

## Section composition (desktop / phone)

| Beat | Desktop | Phone |
| --- | --- | --- |
| Hero | Photograph (later the 3D coin) offset right, copy left; Buy scrolls to the purchase section | Coin fills the upper half; copy and Buy within the first screen |
| The coin | Colour-true photographs (obverse, reverse, edge, in hand, box) with the spec line | Swipe gallery with previous/next buttons (48 px) and keyboard support; spec stacked |
| What holding it means | Text column beside the coin at rest | Text, then a small coin detail |
| The launch evening | Part I → Part II as a simple typographic sequence | Same, stacked |
| Buying for someone else | One photograph of a coin being handed over | Same |
| Delivery and activation | Three plain steps with small line illustrations | Stacked |
| Purchase | Existing two-column grid: facts left, purchase panel right (T003). A short withdrawal and refund summary sits beside the purchase, linking to the full policy | Facts, summary, then the panel |
| Seller and product information | Seller identity shown open, as today. The statutory product notice (R-B3) as a visible table | Same |
| Policies | Terms, privacy and refund policies as expandable sections that collapse fully | Same; 48 px summaries |

Placement of the age rule (R-B9) and any hosting or escrow notice (R-B8) waits for
the legal answers; both stay visible rather than hidden in a collapsed section.

## Critical states

Every direction shows the same states, so options are compared on composition, not
on differing promises (integration spec §5.1).

| State | Composition |
| --- | --- |
| No published offer (`offer === null`) | The existing "Purchasing is not open" page. No story, no hero, no Buy |
| Sale not yet open / closed (R-E2) | **Today:** the loader returns no offer outside the sale window, so the whole page shows "Purchasing is not open". **If R-G1 adds a pre-sale state:** story renders, the purchase section shows the actual state, and Buy becomes a link to the details |
| Sold out or event at capacity | The purchase section shows the actual state; no restock or waitlist promise |
| Allowance used up | The purchase panel's own state (T003); the sales page does not repeat it |
| Signed-in launch-token holder | Identical page; `giftRuleHolder` replaces `giftRule` in its reserved slot |
| After the launch evening (P8) | The evening section changes from future to past tense, or is removed; the decision is P8 |

## Performance budget

- The largest paint is the hero photograph (AVIF, at most 200 KB), never the canvas.
- The 3D chunk loads after first paint and only on devices that can run it; the
  photograph stays if it can't.
- One WebGL context per page at most (see V5 above). Device pixel ratio capped on
  phones; the render loop pauses off-screen.
- Asset sizes and formats are set in [06](06-asset-plan.md).

## Constraints the direction must respect

- Tailwind only; no custom CSS classes.
- Real photographs are the primary product images; renders must match the
  production sample and are never the only images.
- Focus indicators and essential text keep contrast over changing light.
- Touch targets at least 44 × 44, preferably 48.

## Decisions for the step-7 review

| ID | Decision |
| --- | --- |
| **V1** | Status of the `sophomores-tailwind-v4.css` palette: approved direction, partial, or historical |
| **V2** | Dark "coin in the flame's light" (recommended) or "archival light" |
| **V3** | Whether the hero ever becomes a live 3D coin, a rendered video loop, or stays a photograph with light motion (cost and performance; see [06](06-asset-plan.md)) |
| **V4** | Whether this page becomes the site's required Analogue-inspired hero placement, or keeps its own hero |
| **V5** | Approval of the flame-as-light adaptation onto the coin, as new artwork |
