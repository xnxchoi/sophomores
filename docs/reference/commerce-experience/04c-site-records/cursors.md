# Cursors: Analogue and lamalama (captured 2026-11-15)

For F13 in [05 — Design requirements](../05-design-requirements.md): the owner's two cursor candidates. Captured in
headless Chromium (GPU on) at 1440 × 900 with a per-frame log of element position and computed style.
**[M]** measured, **[S]** read from the site's JS bundle, **[E]** estimated. Headless screenshots never draw the
system cursor. Durations are evidence, not targets (no fixed durations; owner, 2026-11-15).

## Analogue (Framer)

- **The native cursor is hidden** (`body { cursor: none }`) [M]. Over the header it returns as the normal pointer;
  the custom cursor unmounts there [M].
- **A small frosted dot:** a fixed 20 × 20 circle, `rgba(0,0,0,.35)` with `backdrop-filter: blur(5px)`, no border,
  normal blend [M]. Grey glass on light sections, nearly invisible on the dark hero.
- **No lag:** it lands on the pointer the next frame, with no easing [M].
- **Zones decide its form** (Framer `data-framer-cursor`) [M]:
  - page background: the dark dot; text links and cards change nothing;
  - case-card image: the same dot turns white glass, `rgba(255,255,255,.25)`, a soft colour change of a few
    hundred milliseconds, spring-like [M/E];
  - a strip across each case card: the dot grows into a "SEE CASE" pill, 100 × 40, about 5 px radius, nearly
    clear glass with the same blur, uppercase label `rgb(237,237,237)`; grows by scale, front-loaded, no
    overshoot, and shrinks back the same way [M].

Shots: [rest on light](cursors/analogue3-09-rest-light-bg-crop.png) ·
[over the nav, custom cursor gone](cursors/analogue-02-over-nav-work-crop.png) ·
[over a case image](cursors/analogue3-08-over-case-image-crop.png) ·
["SEE CASE" pill](cursors/analogue3-07-see-case-label.png).

## lamalama

- **The native cursor stays** (`cursor: auto`; links `pointer`) [M]. Nothing follows the pointer as a dot or ring.
- **A trail drawn only by movement** [S, M]: a velocity field on a full-viewport WebGL backdrop, stored at 1/36 of
  viewport resolution; each move adds a soft blob about 0.04 × viewport height; drawn as a dot-matrix on an 8 px
  grid in the theme's cursor colour (cream dots on the dark hero) and nudging the backdrop image along the
  motion. It decays about ×0.93 per frame (half-life about 170 ms) [S]; a 1000 px sweep left a trail about
  1000 px long, gone within two seconds [M]. Off at rest, on touch, and without the `EXT_color_buffer_float`
  extension [S].
- **A label tag** (`.js-cursor-label`) [M]: black, cream text `rgb(249,244,235)`, Sometype 10 px weight 500,
  uppercase, 22 px tall, square corners, its bottom-left at the pointer. Shown over elements with `data-label` /
  `data-text`: certain headings ("Not just pretty"), WebGL images, the logo marquee, "Follow us" → "Stay in the
  loop". It appears at once and its text scrambles in through random glyphs; it follows with a lag on an
  `expo.out` ease [S]; on leaving, the text unscrambles, then it fades.
- Nav links, the menu toggle, buttons and case thumbnails: no cursor change [M].

Shots: [trail at 0, 250 and 1750 ms](cursors/lamalama-02-trail-sequence-0-250-1750ms.png) ·
[label over a heading](cursors/lamalama2-09-label-over-text-crop.png) ·
[label over an image](cursors/lamalama3-12-label-over-media-crop.png).

## How the two differ

Analogue replaces the pointer with one small glass object that changes form by zone (dot → white dot → labelled
pill). lamalama keeps the pointer and adds two separate layers: an ambient trail in the backdrop and a lagging,
scrambling label. Both tie in with traits in 4c: Analogue's glass matches "glass only on the floating layer";
lamalama's label is its witty-remarks voice (4b) and its dot-matrix the mono/technical strand.
