# 06 — Visual assets: requisites and securing strategy

Working draft · 2026-11-13 · Plan for review; nothing is commissioned, bought or made.
Part of [the product sales page plan](README.md). Serves the direction in
[04](04-design-direction.md) and the storyboard in [05](05-ux-flow.md).

## Summary

| ID | Asset | Source | Load | Depends on | Serves |
| --- | --- | --- | --- | --- | --- |
| X1 | Coin artwork (obverse, reverse, edge) as vector, plus the manufacturer's spec sheet | External: coin designer or mint | S, if it exists | Owner | I1, spec line, R-A2 |
| X2 | Production samples, at least two (one for photography, one for NFC testing) | External: mint | **Long lead** | Manufacture schedule | X3, I5, NFC test, I1 sign-off |
| X3 | Product photography set | External commission or in-house shoot, art-directed internally | M | **X2** | Gallery, hero poster, PG review |
| X4 | HDRI environment map for metal reflections | External: CC0 library (e.g. Poly Haven) | S | — | I1, I2 |
| X5 | Interface icons | Installed: `lucide-react`, `@phosphor-icons/react` | S | — | Gallery arrows, steps |
| X6 | Payment-method marks, if the PG requires them | External: PG | S | R-B12 | Purchase section |
| I1 | 3D coin model (GLB) | Internal | M | X1; X2 for material sign-off | I2, I3, I9 |
| I2 | Hero scene: coin, flame light, scroll choreography | Internal | **XL** | I1, X4, V2, V3 | Beats 1 and 3 |
| I3 | Hero poster still | Internal render; final from X3 | S–M | I1 or X3 | First paint, 3D fallback |
| I5 | "Coin handed over" image | Internal art direction, shot with X3 | M | X2 | Beat 5 |
| I6 | Activation step illustrations (three) | Internal | S–M | P4 | Beat 6 |
| I7 | Part I → Part II connector | Internal (code) | S | R-D2, R-D3 | Beat 4 |
| I8 | Scale line beside the coin | Internal (code SVG) | S | R-A2 | Beat 2 |
| I9 | Social share image | Internal | S | I3 or X3 | Link previews |
| I10 | Page colour and light tokens | Internal | S–M | V1, V2 | Whole page |
| I11 | Alt-text set for every image | Internal draft, owner approval | S | X3, I5 | Accessibility, R-A6 |

Load: S hours, M one to three days, L about a week, XL more than a week of focused
work including review. These are planning sizes, not commitments.

**Critical path: X2.** The PG reviewer sees the page, and the plan requires the
actual product to be shown, so real photographs gate the PG application. The same
sample gates the NFC antenna test. Ask the mint for a sample date first.

## External assets: secure quickly

| ID | Requisites | How to secure |
| --- | --- | --- |
| X1 | Vector (SVG/AI/PDF) of each face at 1:1 mm; relief depth map or layered heights if the mint uses them; edge treatment (reeded, plain, lettered); spec sheet with diameter, thickness, weight, alloy, plating, finish | One email to the designer or mint. If no vector exists, a 600 dpi flat scan of each face is the fallback |
| X2 | Final alloy and finish, NFC tag fitted where it will ship, packaging included | Ask the mint for two finished units ahead of the run. Note on order: one sample may be consumed by NFC placement tests |
| X3 | See the photography brief below | Book once X2 has a date. In-house is viable if a macro lens, a light tent and a colour checker are available |
| X4 | Neutral studio HDRI, 2k for the web, 4k for stills; warm key and dark surround to match the flame | Download a CC0 map; record its source and licence beside the file |
| X5 | Already installed. Pick one family and use it consistently | No procurement |
| X6 | Exactly the marks and placement the PG's terms require | Ask PortOne/PG with the merchant application |

### Photography brief (X3, I5)

- **Truth first.** Calibrated colour (shoot a colour checker in every setup); no
  retouching that changes the product's colour, relief or finish. Dust and
  reflection cleanup only.
- **Set:** obverse; reverse; edge; three-quarter view; in hand for scale; box
  contents laid out; NFC tap position on a phone, if P4 keeps NFC; the coin being
  handed from one hand to another (I5).
- **Look:** dark ground matching `--off-black`; one warm, low key light from the
  flame's side; soft fill; deep but not crushed shadows. Calm, still, close.
  No props that suggest luxury, gambling or crypto.
- **Format:** square 1:1 crops to suit today's gallery (`aspect-square`); also shoot
  4:5 and 16:9 safe areas in case the layout changes (V3). Masters 4000 px on the
  short edge, 16-bit TIFF, archived outside the repo. Web derivatives come from
  Payload's sharp pipeline: AVIF/WebP, each at most **300 KB** at 1600 px, with the
  hero poster at most **200 KB**.
- **Hands:** neutral, unbranded sleeves; no faces; no rings or watches that compete
  with the coin. A model release if anyone identifiable appears.

## Internal assets: concept, references and requisites

The reference sites below are **candidates to capture and verify**, the way the
earlier integration spec recorded Analogue and Má. Nothing here asserts exactly how
they behave until a capture exists. They are mechanics to learn from, never looks to
copy or assets to reuse.

### I1 — 3D coin model

- **Concept:** a coin is simple geometry, so it can be built in code rather than
  modelled by hand. A lathe or cylinder body takes a normal map and a shallow
  displacement map made from X1's vector faces, with the edge pattern as a tiling
  normal map. This reuses installed `three`, `@react-three/drei` and `maath`;
  Blender is needed only if the relief is too complex to bake from vectors.
- **Requisites:** real-world scale in millimetres, centred pivot; PBR
  metal/roughness from X2's actual finish; GLB at most **1.5 MB** with meshopt or
  Draco geometry compression and KTX2 textures at 2k; at most 50k triangles.
- **Sign-off:** a side-by-side of the render and an X3 photograph under matched
  light. The owner approves the match before any render appears on the page.

### I2 — Hero scene

- **Concept:** the approved flame becomes a light source that falls on the coin. The
  coin turns on scroll, settles, and later gains a rim of flame light (05 beats 1 and
  3). The flame's shader equations are adapted into an isolated R3F light. The
  shared footer renderer is not edited, and no second raw renderer is mounted
  (integration spec §1).
- **References to capture:**
  - Analogue home (already selected): light that becomes an object, then evidence.
  - Apple product pages with scroll-scrubbed product rotation, e.g. AirPods
    Pro-style hero sequences: the object turns exactly with scroll position and is
    reversible.
  - Teenage Engineering product pages: the object stands alone on a plain ground,
    with flat, mono-set facts beneath. This is the model for the information beats
    after the hero.
- **Requisites:** R3F/Three for rendering, Motion for any DOM coupling, no GSAP for
  new work, and native scroll (the scene reads scroll; it never drives it). The
  poster and the first frame of the scene match in pose and light. Device pixel
  ratio capped at 1.5 on phones; the render loop pauses off-screen; the chunk loads
  after first paint. Aim for smooth motion on a mid-range phone, verified on a real
  device.
- **Load:** XL. It is the one asset where the concept carries real risk, so
  prototype it early with a placeholder disc while X1 and X2 are pending.

### I3 — Hero poster

- **Requisites:** the exact first pose of I2; 1600 × 1600 (square) with a
  1920 × 1080 safe area; AVIF at most 200 KB; descriptive alt text. Starts as a
  render from I1 and is replaced by, or checked against, an X3 photograph before
  publication.

### I5 — Coin handed over

- **Concept:** two hands, one passing the coin to the other, in the same light as
  the rest of the set. This is the gift beat, said in one image. It is a photograph,
  not a render, because it has to feel human.
- **Requisites:** shot with X3; 4:5 portrait for phones, with a 16:9 desktop crop
  available; at most 300 KB.

### I6 — Activation step illustrations

- **Concept:** three single-weight line drawings: the box arriving; the coin meeting
  a phone (or a card being scanned, per P4); an account screen with one confirm
  step. They are drawn in the icon family's stroke weight, so they read as part of
  the interface, not as clip art.
- **Requisites:** SVG; `currentColor` strokes so they follow the page tokens; each
  animates once in its own fixed box (05 beat 6); decorative, so `aria-hidden`,
  with the copy carrying the meaning.

### I7, I8 — Code-drawn graphics

- **I7:** a single line connecting the Part I and Part II blocks, drawn on scroll.
- **I8:** a millimetre scale line at the coin's true diameter. Both are inline SVG in
  Tailwind-styled components, with no image files.

### I9 — Social share image

- 1200 × 630, PNG or JPEG under 300 KB. The coin poster on the page ground plus
  `BrandMark`, with no price or date (they change). Generated from I3 or X3.

### I10 — Page tokens

- Ground, raised surface, text, muted text, hairline, and the warm light colour
  sampled from the flame. They extend existing tokens in the global theme layer
  rather than adding parallel ones. They depend on V1 (palette status) and V2
  (direction).
- Contrast: body text at least 4.5:1 on every surface it can sit on, including
  under the light.

## Orchestration

| Phase | Starts when | Work |
| --- | --- | --- |
| **0: now** | No dependency | Ask the mint for X1 and the X2 date; get X4; choose the X5 family; prototype I2 with a placeholder disc; draft I6–I8; draft I10 once V1 is answered |
| **1: artwork in hand** | X1 received | Build I1 from vectors; render a provisional I3; put I1 into the I2 prototype |
| **2: sample in hand** | X2 received | Shoot X3 and I5; run the NFC placement test; sign off the I1 material match; replace the I3 render with, or check it against, a photograph |
| **3: finish** | X3 approved | I9, I11 alt text, final compression and size checks, live render review on desktop and a real phone |

Every internal asset gets the project's live-render check and a harsh review before
it counts as accepted. Passing review is a quality gate, not owner approval.

## Decisions for the step-7 review

| ID | Decision |
| --- | --- |
| **A1** | Photography: commission a photographer, or shoot in-house |
| **A2** | Whether any render may appear before X3 photographs exist (for example on a pre-launch page), and how it is labelled |
| **A3** | Whether to start the I2 prototype now, before V2 and V3 are answered, accepting rework risk |
