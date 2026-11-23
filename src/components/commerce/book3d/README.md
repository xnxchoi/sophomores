# Book3D: the product page's 3D book

**The book is unstyled on purpose.** The owner is designing the textures (23 Nov): "The 3d book can be UNSTYLED- I am desigining the textures today- but it SHOULD have all the interactivity and aninmations". Its interactions follow stripe.press, as mapped in `.tmp/packets-20261121/stripe-press-product-map-20261123/README.md` §C.

## Files
- **`book-stage.tsx`:** the product page's stage, holding the art with the book over it. It lazy-loads the canvas, renders only while the stage is in view, and passes the page's scroll and events to the book.
- **`book-canvas.tsx`:** the canvas, intro dolly, pointer spotlight, reflections and shadow catcher (dark theme only).
- **`book.tsx`:** the geometry, cover material, closed-book interactions, and the Look inside timeline and pose.
- **`look-inside.tsx`:** the leaves (12, so 24 pages), their bend shader, page physics and page gestures.

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

**Pages:** `<BookStage pageTextures={[...]}>` takes page images in reading order, two per leaf (front, back), about 1200×1600 each. With none, the pages are blank.

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

## Look inside
- **Opening.** The Look inside pill or a click on the book opens it. The book turns to the reader, tilts back and centres on the spread. The cover swings flat, and the pages fan up and drop.
- **Turning pages:**
  - drag a page (where you grab sets the curl; dragging up or down tilts the fold);
  - click either half;
  - flick the fore edge to riffle several pages;
  - swipe sideways on a trackpad.
- **Page behaviour.** Pages in flight can be caught, and they never pass each other.
- **Hover.** The page under the cursor lifts and its corner curls. Near the screen's edge, the block on that side is pushed.
- **Closing.** Close (left), Esc, ← and h close the book. So does a click on empty canvas or a tap past either end.
- **Saved page.** The page you leave is kept for the visit (sessionStorage `book3d:<product id>`).
- **Phone.** The stage covers the screen while the book is open.
- **Control bar.** Close (left), previous page, next page, and the magnifier. The magnifier is a lens that follows the pointer; on touch it stays put until a finger drags it.
- **Touch zoom and pan.** Pinch zooms 1–2× with rubber beyond. Two fingers, or one after a 300 ms hold, pan. On release it springs back into range.
- **Highlighter.** Not built yet. It waits until a build confirms page picking.

## Sounds
- **Synthesised (no files):**
  - the pointer across the closed book rubs the cover (band-passed noise, 55–295 Hz, with volume following speed);
  - dragging a page rubs paper (110–560 Hz);
  - a cover shutting fast slaps.
- **Sample slots** (`Book`'s `samples` prop): `pageTurn[]`, `grab`, `flop` and `crackle`. They are empty, because there are no files. When filled, they play through Howler, and the page turn plays faster for faster turns.
- **First sound.** Audio starts on the first press, as browsers require.
