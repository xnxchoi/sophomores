# analogue: motion, captured 2026-11-15 (1440×900, 390×844)

Measurement notes:
- "Exact" means a declared WAAPI/CSS timing, read from `document.getAnimations()` or a hooked `Element.animate()`.
- "Fit" means a per-frame box sample of `getBoundingClientRect` at 60 fps. Those values are ±1 frame, and the easing is a best fit.
- t90 is the time to reach 90 % of the travel.
- Fit names: "cubic-out" is GSAP `power2.out`, and "expo-out" is `cubic-bezier(.16,1,.3,1)`.
- Framer bakes its springs into `linear(...)` easings or into many keyframes. Peaks quoted from those are exact.

## 0. Motion in one paragraph
The whole interface is one Framer pill that keeps morphing, and the motion runs at three distinct speeds.
- **Pill shape changes (fast).** Changes driven by scroll state are quick springs: t90 ≈ 250–340 ms, settled by ≈ 600–900 ms. This covers nav to case label, case to case, and case to newsletter.
- **About menu (slower).** It opens and closes on a slower, smoother `cubic-bezier(0.44,0,0,1)` over 1000 ms, with t90 ≈ 600 ms.
- **Page-level entrances (slow and soft).** These use long fades of 1.2–3 s, mostly linear or `(0,0,0,1)`, and a 3 s settle of the work grid.

Colour always has its own timeline, separate from shape: 500 or 650 ms baked springs, or 1000 ms cubic. Inside one interaction, the shape, colour and content fades start in the same frame, with no stagger. Stagger appears only in type, at 50 ms per letter or word and 75 ms per line. The pointer gets one small "breath" on entering the pill, quick up and slow down. The page change is a browser View Transition crossfade into a nearly empty white page, whose tiles then fade in at scattered delays.

## 1. Stack
- **Framer.** Detected from `data-framer-name`, `framer-v-*` variant classes and the `MotionHandoff*` globals. Its layout animations are FLIP: per-frame inline `scale(x,y)` with counter-scaled children.
- **Lenis smooth scroll.** Detected from the `lenis` / `lenis-scrolling` classes and `lenisVersion`. `window.lenis` is not exposed.
- **View Transitions API** for route changes. Detected from the `view-transition-enter` / `-exit` CSS animations and the `-ua-view-transition-group-anim-root` group.
- **WebGL hero canvas** on desktop.
- No GSAP, Barba or three globals.
- **Capture caveat.** The shared `recorder.mjs` ran this site at **7.5 fps**, because headless Chromium rendered the WebGL hero with SwiftShader. Every run here instead used a copy, `sites/analogue-recorder.mjs`, launched with `--use-angle=metal --enable-gpu --ignore-gpu-blocklist`. That measured 59–60 fps with video recording on; one page-change window ran at 53 fps. The first nav run was at 7.5 fps and was discarded.

## 2. Load and intro
The times below are ms from navigation start (performance clock) in one run. Hydration fell at ≈ 1115 ms.

| +ms | element | property | duration | delay | easing | source |
|---|---|---|---|---|---|---|
| 180 | hero light layer | opacity 0.001→0.9 | 2000 | 0 | linear | exact |
| 180 | second light layer | opacity 0.001→0.8 | 2500 | 500 | linear | exact |
| 607 | hero line 1 "Emotion is the heart", 17 letters | opacity 0.001→1 | 1000 | 0–800, 50/letter | `cubic-bezier(0.44,0,0,1)` | exact |
| 607 | same letters | scale 0.9→1 | ≈1000 | same | matches (0.44,0,0,1): progress .03/.17/.56/.86/.99 at 100/200/300/500/800 ms | fit |
| 607 | hero line 2 "of every decision", 15 letters | opacity, scale as above | 1000 | 1000–1700, 50/letter | (0.44,0,0,1) | exact |
| 1115 | pill (parked above the top edge) | variant D Intro → D Main; Menu BG 55×35 → 470×53, radius 100→20 | ≈1000, t90 ≈ 470 | 0 | ease-out, no overshoot | fit |
| 1115 | Menu BG | colour rgba(255,255,255,.4) → rgba(224,224,224,.45) | 1000 | 0 | (0.44,0,0,1) | exact |
| 1115 | WORK, ABOUT, logo | opacity 0→1 | 1000 | 0 | (0.44,0,0,1) | exact |
| 2181 | pill container | translateY −80→0 px, scale 0.3→1 | 1000 | 2000 | spring in 101 keyframes, details below | exact |
| 180 | bottom line "Ready when you are", 15 letters, offscreen | opacity | 2000 | 0–700, 50/letter | (0.44,0,0,1) | exact |
| 180 | two elements at y ≈ 4275, offscreen | rotateX 90°→0 | 500 | 4000 / 4500 | (0.44,0,0,1) | exact |

- **Pill intro spring.** Scale peaks at 1.112 at about 300 ms, which overshoots the travel by 16 %. It dips to 0.983 at about 600 ms and is within 1 % from about 800 ms. Y overshoots by +12.8 px.
- **Correction to the earlier record.** The widening from 55×35 to 470×53 happens while the pill is still above the viewport. The visible intro is the 0.3-scale pill springing down into place at about 2.2 s.
- Everything above the fold has settled by about 3.3 s: the last hero letter ends at 607 + 1700 + 1000 ms, and the pill at about 3.2 s.

## 3. Page change
The test: Home scrolled to 3000, then a click on WORK in the pill, going to `/cases-overview`. It is an SPA (a window flag persisted) using a View Transition.

| +ms after click | element | property | duration | delay | easing | source |
|---|---|---|---|---|---|---|
| 32 | URL | pushState | — | — | — | measured |
| ≈182 | whole DOM | swaps after one long frame of ≈170 ms; body #EDEDED → #FFFFFF instantly | — | — | — | measured |
| 182 | root group | UA group animation | 250 | 0 | ease | exact |
| 182 | old root snapshot | opacity 1→0 | 600 | 100 | `cubic-bezier(0,0,1,0.99)` | exact |
| 182 | new root | opacity 0→1 | 600 | 100 | linear | exact |
| 173 | work-grid wrapper | `perspective(1200px) translateY(231px) scale(1.2)` → none | ≈3000 | 0 | `cubic-bezier(0,0,0,1)`, rms 0.006 | fit |
| 197 | 23 tile containers | opacity 0.001→1 | 1400 | 300–1500 | linear | exact |
| 197 | other tiles | opacity 0.001→1 | 1200 / 1700 / 2000 / 2600 | 300–1500 | linear or (0,0,0,1) | exact |

- **What the "wash to white" is.** The old page crossfades over 282–882 ms into a white page whose tiles are still at about 0 opacity. The tiles fade in later.
- **Tile delays.** Example values: Nike 900, Vitra 1100, Honeybalm 1100, Menkind 900, M1 1000, APF 300 ms. They are not in reading order (exact).
- **What persists.** The pill is part of the root crossfade, but it is identical on both pages, so it reads as persisting (inferred). Nothing else persists.
- **Total.** From click to settled is about 3.2–3.3 s. The grid transform ends at +3197 ms, and the last tile fade ends at about +3300 ms.
- **Back.** It uses the same View Transition timings, starting at +76 ms. Scroll is restored to 3000 instantly, with no scroll animation. Home's appear animations replay: the letter fades and the 2000 ms line.

## 4. Navigation and menu (desktop)
All of this is one component. The variant names were read from `data-framer-name`: D Main, D Hover, About, Case1–5_v3, D Intro and Newsletter v2.

**Pointer enters the pill (any part).** The variant goes to D Hover for ≈ 385 ms, then returns to D Main by itself while the pointer stays. Each entry fires it once. Moving between WORK, logo and ABOUT does not re-fire it, and leaving does nothing.

| +ms | element | property | duration | delay | easing | source |
|---|---|---|---|---|---|---|
| 0 | Menu BG | height 53→63.7, centred (y 19→13.7) | peak at ≈185 | 0 | spring, ≈1 % overshoot | fit |
| 0 | Menu BG | colour rgba(224,224,224,.45) → rgba(242,…) | 500 | 0 | baked spring `linear()`, peak 1.081 | exact |
| ≈400 | Menu BG | height back to 53 | ≈900 | — | ≈(0.44,0,0,1) | fit |
| ≈400 | Menu BG | colour back | 1000 | 0 | (0.44,0,0,1) | exact |

Labels and the logo are counter-scaled (FLIP), so they do not stretch.

**About menu.**
- What opens it: a click on ABOUT. Hover does not open it, which explains the earlier failures.
- What closes it: the pointer leaving the pill.
- What does not close it: clicking ABOUT again, or pressing Escape.

Open, with everything starting in the click frame (+13 ms):

| element | property | duration | easing | source |
|---|---|---|---|---|
| Menu BG | height 53→512 | ≈1000, t90 604 | (0.44,0,0,1), rms 0.010 | fit |
| Menu BG | width 470→460, x 485→490 | ≈850, t90 ≈ 550 | (0.44,0,0,1) | fit |
| Menu BG | colour grey .45 → rgba(255,255,255,.4) | 1000 | (0.44,0,0,1) | exact |
| link list, contact block, visit block | opacity 0→1 | 1000, delay 0 | (0.44,0,0,1) | exact |
| link list | y 82→58, width 430→460 | ≈900 | (0.44,0,0,1) | fit |
| 6 link cells | width 215→230 | t90 ≈ 270, settled ≈ 600 | cubic-out | fit |
| WORK, ABOUT | x shift of 2–5 px | ≈850 | (0.44,0,0,1) | fit |

- **Close** (pointer leaves) mirrors the open. Height 512→53 takes ≈ 1050 ms, t90 635. The content fades 1→0 over 1000 ms on (0.44,0,0,1) (exact). Colour returns over 1000 ms (exact). Cells go 230→215 with t90 ≈ 300.
- **Link-cell hover while open.** Each cell has a 230×50 plate that fades 0→0.05 over 650 ms on a baked spring with no overshoot (exact). Moving between cells crossfades the two plates in the same frame. When the menu closes, a lit plate fades out over 750 ms on a spring.
- **Hovering WORK while open** only fades the cell plate. The pill does not morph.

**Between scroll states** (triggered by scroll, not scrubbed):
- **Trigger points, going down:** Case1 at scrollY 3350, Case2 at 4350, Case3 at 5350, Case4 at 6350, Case5 at 7350, and Newsletter at 8411–8442, via D Intro held for 52 ms.
- **Trigger points, going back up:** 8379, 7296, 6296, 5165, 4181, 3168 (to D Intro), and 944 (to D Main).
- **Evidence that they are triggered.** Each morph runs to completion over its own duration while the scroll continues. When scrolling fast (400 px per 60 ms), a morph is cut off at 230–250 ms and retargets mid-flight without restarting.

| change | element | property | timing | easing | source |
|---|---|---|---|---|---|
| D Main → Case1 | Menu BG | width 470→302 (centred), height 53→48 | t90 ≈ 290, settled ≈ 800 | expo-out | fit |
| D Main → Case1 | Menu BG | radius 20→40; outer radius 0→6 | settled ≈ 750 | — | fit |
| D Main → Case1 | Menu BG | colour → rgb(253,114,0) | 650 | baked spring, no overshoot | exact |
| D Main → Case1 | case title, "See case" | slide in along x | t90 ≈ 250 | expo-out | fit |
| D Main → Case1 | title letters | from translateY 10 px, opacity 0.001, blur 10 px to none, 1, 0 | step: declared duration 0, 50 ms/letter stagger | — | exact; confirmed by single inline sets per letter, no tween frames |
| D Main → Case1 | "See case" words | opacity | 400, delays 0 / 75 | baked spring | exact |
| Case → Case | Menu BG | width 302→252→206→230 | t90 ≈ 290, settled 600–750 | cubic-out / expo-out | fit |
| Case → Case | Menu BG | colour orange → rgb(5,5,5) → rgba(0,0,0,.2) | 650 | spring | exact |
| Case → Case | title | retypes | 50 ms stagger | — | exact |
| Case5 → Newsletter | Menu BG | 226×48 → 460×392 | t90 ≈ 290–340, settled ≈ 900; width dips ≈ 15 % first (the D Intro transient) | expo-out | fit |
| Case5 → Newsletter | Menu BG | colour → rgb(0,56,255) | ≈700 | spring | exact |
| Case5 → Newsletter | WORK, ABOUT, logo | opacity 0→1, moving out from the collapsed centre | 650, starts +32 | baked spring | exact |
| Newsletter → Case5 (going up) | Menu BG | height 384→48 | t90 256, settled ≈ 900 | expo-out | fit |

## 5. Hover and micro-interactions
- **Custom cursor.**
  - It is a 20 px dot, rgba(0,0,0,.35), with a 5 px blur.
  - It follows the pointer 1:1. After a one-step pointer jump, the cursor box moved in the same frame, with no easing or lag (measured).
  - Over dark case media it turns rgba(255,255,255,.25), taking 300 ms on `cubic-bezier(0.44,0,0,0.99)` (exact).
- **Home case images.** Hovering them (stationary pointer at 700,500) changed nothing in the page or the pill.
  - During the scroll run, the cursor became a 67×32 "See case" chip over case media.
  - It did not do so in the stationary test, so the trigger is unresolved (see Gaps).
- **Cases-overview tiles** (M1 Capital, Atomic Bootfinder and Erwin Olaf all behaved the same):
  - On hover, the tile image scales 227.5→221.5 (−2.6 %) on a spring. t90 is 187 ms, the overshoot is ≈ 8 % of the travel, and it settles by ≈ 350 ms (fit). On leave the reverse has t90 168 ms and the same overshoot.
  - The cursor swaps within one frame into a 100×40 frosted "SEE CASE" chip (radius 5 px, rgba(120,120,120,.05)).
  - On leave, the chip shrinks back to the 20 px dot over ≈ 300 ms: size fit (0.44,0,0,1) with t90 185, radius going to 50 %. The colour change takes 300 ms on (0.44,0,0,0.99) (exact).
- **The earlier "hover never registered"** came from the 7.5 fps capture. Hover works with real pointer events.

## 6. Scroll
- **Lenis.** A single 300 px wheel impulse eases scrollY over ≈ 700 ms, with t90 267 ms and an expo-out shape (fit on per-frame scrollY). Scrubbed elements inherit this curve.
- **Hero, scrubbed linearly to scroll.** Elements tracked scrollY frame for frame, including during the eased impulse.
  - From scrollY 0 to ≈ 450, the two hero text halves scale to 0.5 and move outward. The left half goes from x 398 to 163 and the right half from 750 to 1143.
  - From ≈ 950 to ≈ 1980, the light frame scales 1440×900 → 1152×720 (0.8), roughly linearly with scroll (≈ 0.31 px of width per scroll px).
  - At ≈ 1980 the sticky section releases.
- **Pill states** are triggered at fixed scroll positions (§4).
- **Text reveals, triggered on entering the viewport:**
  - The supporting sentence fades per word over 500 ms on (0.44,0,0,1), with a 50 ms stagger across 24 words.
  - The h1 statement is split per letter but timed per line: 5 lines at a 75 ms stagger, letters in a line together, 400 ms baked-spring opacity with no overshoot.
  - "Our work" fades per letter over 1000 ms on (0.44,0,0,1), with a 50 ms stagger. All timings exact.
- **Reverse scroll.** The hero restores, though not simply in reverse: on the fast way up, the frame's return to 1440×900 ran over ≈ 630 ms with t90 ≈ 370, as Lenis caught up. The pill states reverse at the positions listed in §4.

## 7. Type in motion
- Opacity-led throughout, with no masks or vertical travel.
- Hero letters: opacity plus scale 0.9→1, 1000 ms, (0.44,0,0,1), 50 ms per letter.
- Statement: per-line steps at 75 ms, with a 400 ms spring.
- Supporting copy: per word, 500 ms, 50 ms stagger.
- Case titles in the pill: a typewriter of instant steps at 50 ms per letter. Each letter goes from translateY 10 px, opacity 0.001 and blur 10 px to its final state in one frame.
- The LCD dot face is used for the WORK/ABOUT labels, "SEE CASE", and the "GENERAL INQUIRIES" / "VISIT" headings in the About menu.

## 8. Phone differences
- At 390 the pill is 376×45 with radius 10.
- Tapping ABOUT opens the "M About V2" variant and tapping it again closes it. Touch taps did work this time.
- Open: height 45→507 with t90 ≈ 266 ms and settled ≈ 900 ms (expo-out fit). Width 376→370 with t90 ≈ 270.
- Close is the mirror (t90 ≈ 266).
- Colour changes over 650 ms on a baked spring (exact).
- No separate content fade was declared. The links are mounted inside the FLIP and revealed by the pill's growth.
- So the phone menu is a faster spring than the desktop's 1000 ms cubic.
- Tapping WORK navigates to `/cases-overview`.

## 9. Vocabulary
These are counts of declared animations, summed over the five runs (nav, load, scroll, page, phone). The same element can be counted in more than one run, so treat them as relative frequencies.

| count | easing | used for |
|---|---|---|
| 544 | baked spring `linear()` 400 ms, no overshoot | statement lines, "See case" words |
| 470 | `cubic-bezier(0.44,0,0,1)` | letters, word reveals, About open/close, colour returns, content fades, rotateX flips |
| 222 | 0 ms steps (`ease-out`) | case-title typewriter: opacity and blur |
| 55 | linear `(0,0,1,1)` | hero light layers, tile fades, View Transition enter |
| 42 | `cubic-bezier(0.44,0,0.56,1)` | footer and line fades |
| 35 | `cubic-bezier(0.44,0,0,0.99)` | cursor colour, 300 ms |
| 22 | `cubic-bezier(0,0,0,0.99)` | 1300 ms tile fades on cases-overview (in the runs that open the page) |
| 21 | baked spring 650 ms, no overshoot | case colours, cell plates, phone colour |
| 14 | `linear` | the pill intro's 1000 ms spring keyframes (5); View Transition group, enter and exit (9) |
| 12 | `cubic-bezier(0,0,0,1)` | long tile fades |
| 8 | baked spring 500 ms, peak 1.081 | pill hover colour |
| 6 | baked spring 500 ms, peak 1.014 | newsletter colour |
| 2 | baked spring 750 ms, dips to −1.07 / −0.95 | cell-plate exit on close |
| 2 | `cubic-bezier(0.32,0.01,0.21,0.97)` | a circle cutout on cases-overview |
| 1 each | 400 ms spring with peak 1.015; `cubic-bezier(0.56,0.01,0.19,1)` | single elements |

- The View Transition exit uses `(0,0,1,0.99)`.
- JS layout springs (FLIP), fitted: t90 250–340 ms, settled 600–900 ms.
- Durations used: 0 (step), 250, 300, 400, 500, 600, 650, 750, 1000, 1200, 1400, 1700, 2000, 2500, 2600 and 3000 ms.
- Stagger units: 50 ms for letters and words, 75 ms for lines, 500 ms for the rotateX pair.
- By property class:
  - Size and shape of the pill: fast springs (t90 ≈ 0.25–0.34 s) for scroll states; 1000 ms cubic for the About menu.
  - Colour: separate 500/650 ms springs, or 1000 ms cubic.
  - Opacity for content and type: 400–1000 ms.
  - Page-level opacity and position: 1.2–3 s, linear or `(0,0,0,1)`.

## 10. Sequencing
- **One interaction changes many elements at once.** Each one has its own property and timing: box FLIP, colour, content opacity, cell widths and label shifts. They all start in the same frame, with no stagger between elements.
- **Durations and curves differ within one interaction.** Examples:
  - About open: the box runs about 1000 ms on (0.44,0,0,1), colour uses the same curve, and the cells reach t90 in about 270 ms.
  - Case morph: shape is a spring with t90 ≈ 290, colour is a separate 650 ms spring, and the title letters step at 50 ms intervals.
- **Snappy versus subdued:**
  - Shape and size changes are snappy: pill state springs at t90 ≈ 0.3 s, the hover breath peaking in 185 ms, the tile image spring at t90 ≈ 190 ms.
  - Position changes are subdued: the 3000 ms `(0,0,0,1)` drift of the grid after a page change, and the 900 ms return of the hover breath.
  - Opacity at page level is the slowest layer: 1.2–2.6 s, at deliberately scattered delays.
- **Where staggering happens.** It is used only in type (50 ms letters and words, 75 ms lines) and in the scattered tile delays, never between the parts of the pill.

## 11. Gaps
- **Frame rate.** The shared `recorder.mjs` captured this site at 7.5 fps because WebGL rendered under SwiftShader. The brief's assumption that a foreground tab runs rAF at full rate does not hold for WebGL pages without GPU flags. All the data here comes from the GPU-flag copy at 59–60 fps, except the page change at 53 fps.
- **Layout spring parameters.** Framer's FLIP springs run in JS, so their stiffness and damping were not readable. Only the fitted curves, t90 and overshoot are reported. Start offsets under about 80 ms on small-delta properties (≤ 10 px) are rounding artefacts of the first detectable 0.1 px.
- **Home "See case" cursor chip.** It was seen during the scroll run but not in the stationary hover test, so its trigger and timing are unmeasured.
- **About while in a case state.** Opening About while the pill shows a case label (WORK and ABOUT are hidden then) was not tested. Nor was the newsletter card's own form.
- **Wash timing.** The video-brightness estimate of the white wash was not aligned to the mark clock. The declared View Transition timings are used instead.
- **Page change from a case.** Only the Home ↔ cases-overview change was tested; a case page was not opened.
- **Phone coverage.** Only the menu open/close and WORK navigation were captured. Phone load and intro, scroll, the hero video and the pill-state morphs were not.

Evidence is in `MC/out/analogue/`:
- per-run `*.events.json`, `*.summary.txt`, `*.sampler.txt` and `*.raw.json` (per-frame boxes);
- `load.animate-calls.json`, which holds the full keyframes;
- videos `analogue-{nav,load,scroll,page,phone}.webm`;
- screenshots `about-open.png`, `case1-hover.png`, `cases-overview.png`, `phone-about.png`, and `frames-tile/hover-atomic.png` (the SEE CASE cursor chip).

Scripts are in `MC/sites/analogue-*.mjs`, with the sampler in `analogue-lib.mjs`.

The `nav`, `load`, `scroll` and `page` sampler files were written before the fit labels were renamed. In them, "power3.out" means cubic-out, which is GSAP power2.out.
