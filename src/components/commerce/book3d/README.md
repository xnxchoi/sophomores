# Book3D: the product page's 3D book

**The book is unstyled on purpose.** The owner is designing the textures (23 Nov): "The 3d book can be UNSTYLED- I am desigining the textures today- but it SHOULD have all the interactivity and aninmations". Its interactions follow stripe.press, as mapped in `.tmp/packets-20261121/stripe-press-product-map-20261123/README.md` §C.

## Files
- **`book-stage.tsx`:** the product page's stage, holding the art with the book over it. It lazy-loads the canvas, renders only while the stage is in view, and passes the page's scroll and events to the book.
- **`book-canvas.tsx`:** the canvas, intro dolly, pointer spotlight, reflections and shadow catcher (dark theme only).
- **`book.tsx`:** the geometry, cover material and closed-book interactions.

## Texture slots
Pass these to `<BookStage textures={…}>`. Any slot left out falls back to a plain surface.

| Slot | Used for | Size and layout |
|---|---|---|
| `coverDiffuse` | Cover art | 1920×1600, one atlas (layout below) |
| `coverBumpBase` | Paper or cloth grain | 1920×1600, same atlas |
| `coverBumpCustom` | Emboss or deboss | 1920×1600, same atlas (combined with the base grain) |
| `coverFoil` | Foil mask: white is foil (iridescent, metallic, polished) | 1920×1600, same atlas |
| `coverGloss` | Spot-gloss mask: white is gloss | 1920×1600, same atlas |
| `coverGlitter` | Sparkle, repeated 14× across the atlas | 100×100 tile |

**Atlas layout** (as seen from outside, u left→right, v bottom→top):
- The covers fill the top 79% (v 0.21–1): back cover u 0–0.455, spine u 0.455–0.57, front cover u 0.57–1.
- The bottom strip (v 0–0.1) holds the page edges: the fore edge at u 0.575–1, and the head and tail at u 0.15–0.57.

**Look inside** (a later commit) adds page slots: `pageFront[i]` and `pageBack[i]`, about 1200×1600 each.

## TEMPORARY: Stripe Press textures, replace before publishing
`TEMPORARY_BOOK_TEXTURES` in `book-stage.tsx` points at copies of Stripe Press's cover maps. The owner said, 23 Nov: "use stripe's for now". The copies are:

- `public/assets/textures/book-temp-diffuse.png` from `ShaderMaterial_diffuseMapBase.png`;
- `book-temp-bump-base.png` from `bumpMapBase`;
- `book-temp-bump-custom.png` from `bumpMapCustom`;
- `book-temp-foil.png` from `foilMap`;
- `book-temp-glitter.png` from `glitterMap`.

The originals in `references/StripePress/book/cover/` are untouched. Replace all five copies, and delete them, before anything is published.

## Driving the book from the page
- **`window.dispatchEvent(new CustomEvent("book3d:spin", { detail: { direction: 1 } }))`:** add to cart. The book turns once and dips; `-1` is a removal and turns it back.
- **`window.dispatchEvent(new CustomEvent("book3d:effect", { detail: { hologram: true } }))`:** the hologram. Pass `radio` for the ripple, and `false` to end either. On stripe.press, hovering the Ebook or Audiobook row does this.

## What it does (closed book)
- **Drag and fling.** Drag to turn and tilt the book, and fling it. It keeps its turn, and its tilt eases home.
- **Covers.** They swing open with spin speed and spring shut.
- **Lift.** The book comes forward while held.
- **Hover.** The cover peeks open 5°.
- **Spotlight.** A light follows the pointer.
- **Intro dolly.** On load, the camera moves in over 2 s.
- **Scroll coupling.** As the page scrolls, the book eases back and turns away.

stripe.press's numbers (map §C1) are the tuning reference. The code is ours.
