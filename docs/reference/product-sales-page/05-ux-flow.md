# 05 — UX flow

Working draft · 2026-11-13 · Interaction storyboard for review, not an implementation
spec. Part of [the product sales page plan](README.md). Uses the recommended direction
in [04](04-design-direction.md) and the section order in [03](03-copy.md).

## Ground rules

- **Native, reversible scroll.** No wheel capture, scroll-jacking, pinned sections
  that hold the visitor, or timed reading gates. Every scroll-linked effect plays
  backwards on reverse scroll. Scroll position maps to progress; it never triggers
  a one-way animation the visitor cannot undo.
- **Buy is always one action away.** The visitor never has to finish the story to
  reach price and purchase.
- **Meaning never depends on motion or 3D.** Every beat is complete as static text
  plus a photograph. Motion adds continuity.
- **Full motion is the default** (project policy). One coherent motion per state
  change, at most two stages for a larger change.
- **Ends at the purchase panel.** Quantity, account entry, address and payment are
  T003's flow and the AGENTS.md inline account-entry contract. This storyboard only
  hands the visitor to them in the right state.

## Arrival

| Trigger | Response | Why |
| --- | --- | --- |
| Page request | Server renders the hero **photograph**, product name, proposition, price and Buy. The flame light moves softly around the photograph, never over it | Fast, truthful first paint; the PG reviewer and slow phones see the real product at once |
| 3D ready (only if V3 adopts it and I1 is signed off) | The photograph hands over to the live coin in the same pose. No jump in position or scale | One continuous object |
| 3D fails, is unsupported, or is not adopted | The photograph stays | The page is complete without WebGL |
| Signed-in visitor who holds the launch token | The hero is unchanged. `giftRuleHolder` replaces `giftRule` in its reserved slot near the allowance, without moving surrounding content | The page sells the same product to everyone. Holder status touches only the gift rule |
| Offer not published (`offer === null`) | The existing "Purchasing is not open" state. No story sections, no CTA | Avoids selling something that cannot be bought |

## Scroll storyboard

Progress values are normalized for each section, not measurements of a reference.
Beats 3–6 are launch content (Payload, P5); the rest is reusable page structure
(04, "Reusable structure versus launch content").

| Beat | As the visitor scrolls… | …this happens | It tells them |
| --- | --- | --- | --- |
| **1. Hero** | 0 → 0.4 of the hero | With 3D: the coin turns slowly from obverse toward edge in the flame's light. Photograph only: the flame light drifts around the image | It's a real, weighty object |
| | 0.4 → 1 | The light recedes, the coin comes to rest face-on beside the left column, and the headline gives way to the first section | The object becomes the subject of the page |
| **2. The coin** | Section enters | Colour-true photographs fade in one at a time as each crosses 30% of the viewport; the dimension line draws in beside the coin | Exact, physical facts |
| | Pointer over a photo (fine pointer) | No light effect on evidence photographs; a cursor change signals the gallery can be enlarged | Evidence stays untinted |
| **3. What holding it means** | Section enters | The resting coin (3D) or its detail photograph gains a thin line of flame light along the rim, held while the section is in view | Something is now attached to the object |
| **4. The launch evening** | Section enters | Part I and Part II appear as two typographic blocks; a single line connects them as the visitor scrolls between them (the transport) | The evening's actual shape |
| **5. Buying for someone else** | Section enters | The image of a coin being handed over crossfades in; no further motion | One quiet beat for the gift |
| **6. Delivery and activation** | Each step enters | Steps 1 → 3 reveal in order as each crosses 40%; the current step's small illustration animates once, in its own space | The order of what happens after buying |
| **7. Purchase** | Section top reaches 60% of the viewport | The last of the flame light fades out before the section. The fact column, the withdrawal and refund summary, and the T003 panel are static, on a neutral surface | Buying and account entry happen without distraction, in the neutral palette AGENTS.md requires for verification |
| **8. Seller and product information** | Section enters | No motion. Seller identity and the statutory product notice are shown open | What a PG reviewer and a careful buyer look for is visible |
| **9. Policies** | Section enters | Expandable terms, privacy and refund sections ease open to their content height and collapse fully | Legal reading is calm and scannable |

## Persistent controls

| Control | Behaviour |
| --- | --- |
| **Buy** (hero) | Scrolls smoothly to the purchase section and moves focus to the panel's first interactive control. Never opens a modal |
| **Phone buy bar** | On touch, once the hero's Buy leaves the viewport, a compact bar slides up from the bottom with the price and Buy. It slides away when the purchase section is in view, and returns if the visitor scrolls back up. 48 px target |
| **Desktop** | No sticky bar. The hero's Buy, plus a "Buy" text link in the site header region for this page only (owner decision U-1) |
| **Section index** | None by default. Seven beats are short enough for linear scroll; an index adds chrome without need |

## States the page must handle

| State | Page behaviour |
| --- | --- |
| Sale not yet open or closed | **Today:** the loader returns no offer outside the sale window, so the page shows "Purchasing is not open", with no story. **If R-G1 adds a pre-sale state:** story renders, the purchase section shows the opening time from approved data, and Buy becomes a link to the details. Copy for that state is a gap |
| Sold out or event at capacity | Story renders; the panel shows the actual unavailable state. No restock or waitlist promise |
| Visitor at the allowance limit | Panel's own state (T003); the sales page does not repeat it |
| Policies or disclosure missing | The offer loader already returns `null`, so the whole page falls back to "not open" (no partial sales page) |
| Arriving from a coin's activation link | Not this page. Activation pages belong to T013 |

## Accessibility and input

- Every animated element has a static end state reachable by keyboard and screen
  reader; scroll-linked visuals are `aria-hidden`; copy is real text in reading order.
- Buy's scroll-to-section moves focus. The phone buy bar is a landmark-free button
  that does not trap focus.
- Gallery: swipe on touch, arrow buttons with 48 px targets, and keyboard arrows.
- Focus rings keep contrast over the flame light (04 constraint).

## Decisions for the step-7 review

| ID | Decision |
| --- | --- |
| **U-1** | Desktop: header Buy link, or rely on the hero Buy alone |
| **U-2** | Whether the hero coin responds to the pointer (desktop) beyond the scroll turn |
| **U-3** | Whether the launch evening gets its own anchored section, or stays inside the product story |
| **U-4** | Route: `/shop` for the launch only, or `/shop/[product]` with `/shop` listing releases |
