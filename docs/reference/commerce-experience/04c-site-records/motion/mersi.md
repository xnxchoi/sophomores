# mersi: motion, captured 2026-11-15 (1440×900, 390×844)

Method: headless Chromium (foreground), recorder + analyzer from the brief. Evidence: `MC/out/mersi/` (`mersi-desktop.*`, `mersi-phone.*`, `desktop.summary.txt`, `phone.summary.txt`, `frames-*/`, screenshots). The site's own bundle (`https://mersi.netlify.app/main.js`, saved as `MC/out/mersi/src/main.js`) was read to confirm declared values. Labels used below:
- **measured-declared**: the GSAP tween's own duration, delay and ease, captured at runtime. Exact.
- **measured-sampled**: the inline-style value sampled per frame. Duration is ±1 frame (~16 ms); the easing is a fit.
- **source**: read from the bundle, not observed at runtime.
- **estimated**: from video frames.

Video frame times sit about 1.2 s behind the recorder clock (estimated).

Analyzer naming caveat: the analyzer's fit names count the polynomial exponent, so its `power3.inOut` (4x³) is GSAP's `power2.inOut` (cubic), its `power4.inOut` is GSAP's `power3.inOut`, and its `power3.out` is GSAP's `power2.out`. For GSAP power1–3, every runtime fit agreed with the declared ease once shifted by one. GSAP power4 (quintic) has no analyzer equivalent, so it best-fits the analyzer's own `power4.inOut` (quartic) with no shift; the loader swatches and split panels are examples. Easings below use GSAP names.

## 0. Motion in one paragraph
Slow, heavy masks with fast type. Nearly every large change is a clip-path wipe or a solid "curtain" panel, and nothing translates or scales in the reel itself; masks open over still photographs. These masks run 0.8–1.35 s on strong in-out curves (GSAP `power3/power4.inOut`). Type is the opposite: hover labels roll per letter in 450 ms, and state changes (colour, opacity) are short, quiet 400 ms `power2.out` fades. The split-screen idea runs through all of it: the two halves always wipe in opposite directions (left from the bottom up, right from the top down; on phone the top and bottom halves open from the centre seam). Sequencing is mostly serial hand-offs (card retracts → curtain closes → image flies → title rises) plus fixed 300 ms delays and small staggers (15 ms per letter, 30 ms per character, 50 ms per line). Film grain is a static overlay and does not animate.

## 1. Stack
- **GSAP 3.13.0** (`window.gsap`): drives all motion. `document.getAnimations()` returned **0** throughout (measured). Bundled plugins:
  - ScrollTrigger;
  - SplitText (`mask: "lines"` / `"chars"`);
  - Flip;
  - Observer;
  - CustomEase;
  - ScrollTo.
- **Lenis** (`lenisVersion` global; `html.lenis` classes measured): `lerp: 0.06`, `wheelMultiplier: 0.8`, `touchMultiplier: 1.5`, smoothTouch off (source).
- **Taxi.js** page router: SPA transitions with `[data-taxi-view]`, a default renderer and a project renderer (source; the URL changes without a reload, measured).
- **Webflow** host. jQuery is present but plays no part in the motion. No three or canvas.
- The custom bundle is credited in the menu footer as "Website by FLOT NOIR".

## 2. Load and intro (first visit; the loader is skipped for 24 h via `localStorage.loaderSeen`, source)
Offsets are from `goto` at 1440. The loader started at +2.3 s on desktop and +7.5 s on phone, dependent on the network.

| +offset ms | element | property | duration | delay | easing | basis |
|---|---|---|---|---|---|---|
| 0 | `.loader` (beige ground; outline "MS" `.ms-real` with "Quiet luxury interiors" / "shaped by true stories" labels either side) | display, opacity 1 | set | – | – | measured |
| +2298 | `.ms-fake` #1 (MS letterforms filled with a material photo: wood) | clip-path polygon, from a horizontal centre line to full (opens vertically from the middle) | 800 | 0 | power4.inOut | measured-declared; sampled 748 ms |
| +3126, +3992, +4857, +5706 | `.ms-fake` #2–5 (travertine, beige stone, dark slate, veined marble; estimated from frames) | same, each over the last | 800 each, 60 ms gap | serial | power4.inOut | measured-declared; sampled 771–797 ms, cadence ~860 ms |
| +6572 | all `.ms-fake` + both side labels (×7) | opacity 1→0 | 500 | 0 | power2.out | measured |
| +7075 | `.ms-real` outline | opacity →0 | 300 | 0 | power2.out | measured |
| +7090 | two beige half panels (50vw × 100vh) over the reel | left: clip `inset(0 0 100% 0)` (retracts upward); right: `inset(100% 0 0 0)` (retracts downward) | 1200 | 0 | power4.inOut | measured-declared; sampled 1149 ms |
| +7725 | centre project card `.home-slider_btn_list` | clip `inset(0 0 100% 0)`→0 (wipes in top-down) | 1200 | 300 (created +7392) | power4.inOut | measured |
| ≈ +8850 | settled | | | | | measured |

Phone differences:
- Each swatch takes 600 ms `power2.in` with a 40 ms gap (measured-declared; sampled ~600 ms).
- The two panels are top and bottom halves (50vh), not left and right (source).
- Returning visitor (source only): wait 0.5 s, then fade the loader in 500 ms `power2.out`.

## 3. Page change
Taxi SPA throughout; no reload (measured). The logo, nav and the grain overlay persist. The `.curtain-left` and `.curtain-right` panels sit at z 998, under the grain (z 1000), so the curtains are grained too.

**A. Nav link (Home → Agence), 1440. The URL changes at 1008 ms and the curtains clear at 2006 ms (both measured). The entrance text finishes at ≈ 2.39 s (declared sum: +1037 + 300 delay + 1050).**

| +ms | element | property | duration | delay | easing | basis |
|---|---|---|---|---|---|---|
| +10 | Lenis | stopped (scroll locked) | until +1027 | | | measured |
| +11 | both curtains, filled `#CAC0B3` taupe (the default; the clicked card's colour when there is one) | height 0→100%. Left half rises from the bottom; right half drops from the top. | 1000 | 0 | power3.inOut | measured-declared; sampled 50% at 506 ms |
| +1037 | new page swapped in under the curtains; nav links | non-active links opacity →0.4 | 400 | 0 | power2.out | measured |
| +1037 | both curtains | height 100→0%, retracting toward the edges they came from (left down, right up) | 1000 | 0 | power3.inOut | measured; reached 0 at +2006 |
| +1037 | in-view text lines (SplitText lines in masks) | yPercent 100→0 | 1000 | 300 | power3.out, stagger 50 ms | measured-declared |

**B. Project card (Home → Hamelin), 1440. The URL changes at 1399 ms (measured). The Flip and curtain finish at ≈ 2.7 s, and the title characters at ≈ 3.29 s (declared sums, same definition as A).**

| +ms | element | property | duration | delay | easing | basis |
|---|---|---|---|---|---|---|
| +15 | card list | clip-path, collapsing upward | 400 | 0 | power2.out | measured-declared |
| +415 | right curtain only, filled with the card's colour (`rgb(187,126,74)` copper, measured) | height 0→100%, dropping from the top over the right photo | 1000 | 0 | power3.inOut | measured |
| (at +415) | the current left photo is cloned to a fixed `img#flip-persistent-image` | – | – | – | – | measured |
| +1414 | that cloned left photo | Flip (x, y, width, height): flies and shrinks from the full 720×900 half into a small framed portrait in the project hero | 1200 | 0 | expo.inOut | measured-declared |
| +1414 | right curtain | height →0 (retracts) | 1000 | 300 | power3.inOut | measured-declared |
| +1532 | project title "Hamelin" | per character, yPercent 100→0 in a mask | 1400 each (1580 total) | 300 | power4.inOut, stagger 30 ms | measured-declared |
| +1531 | meta lines ("Paris 16", "2026", description) | yPercent per line | 1000–1050 | 300 | power3.out, stagger 50 ms | measured-declared |

Frames (estimated) show the copper curtain covering the right half while the left photo stays. The photo then contracts into an embossed-frame portrait on a copper field, the right half reveals the second photo, and the title rises at the bottom left.

**C. Back (popstate), both viewports. Settles in about 820 ms; the card re-wipes until about 1.9 s.**

| +ms | element | property | duration | delay | easing | basis |
|---|---|---|---|---|---|---|
| +6 | old `.page_view` | opacity 1→0 | 400 | 0 | power2.out | measured |
| +421 | new view | opacity 0→1 | 400 | 0 | power2.in | measured |
| +421 | nav | colours and opacities restore | 400 | 0 | power2.out | measured |
| +421 | home card | clip back in | 1200 | 300 | power4.inOut | measured |

The reel restarts at its loop origin (Hamelin).

**D. Phone (390).** Same router, different curtain geometry:
- The two curtains are the top and bottom 50vh halves (measured `set` styles).
- **Leave:** the top curtain goes `inset(100% 0 0 0)`→0 and the bottom goes `inset(0 0 100% 0)`→0, so taupe grows outward from the centre seam to both edges (1000 ms `power3.inOut`, measured-declared; frames estimated).
- **Enter:** the reverse. A slit opens at the seam and the panels retract to the top and bottom edges (1000 ms `power3.inOut`).
- From the menu, the curtains cover the open menu directly; the menu does not close first.
- A card tap uses the card colour on both halves (copper measured) and has **no Flip** (source; no Flip tween measured).
- The project page then draws its hairline rules (`div.line` width 0→100%, 1000 ms `power3.out`, delays 300/400 ms) and clip-reveals its image (1350 ms `power4.inOut`, delay 300).

## 4. Navigation and menu
**Desktop hover on every nav text link (PROJETS…CONTACT, INSTAGRAM).** Each label is split into two stacked copies of per-letter spans inside an overflow-hidden box.
- **Hover-in:** each top letter goes yPercent 0→−100 while its twin below goes 100→0. Both move together: 450 ms per letter, **15 ms stagger** (sampled ~16 ms), `power3.inOut` (measured-declared; GSAP reports 540 ms total for 7 letters).
- **Hover-out:** the exact reverse with the same timing (measured).
- PROJETS: letters start at +64, +84, +84, +97, +118, +131, +152 ms after pointer entry. Each run is 446–452 ms over 28 frames (measured-sampled).
- The logo, the dash and the images have no hover (0 events, measured). Disabled at ≤991 px (source).

**Nav state on route change.** Opacity and colour only, all 400 ms `power2.out` (measured-declared):
- inactive links go to 0.4;
- the bar turns `#1A1A1A` on light pages;
- on project pages a ScrollTrigger flips the right cluster between `#ede7de` and `#1A1A1A` at 50vh scroll (source).

**Phone menu (390, opened by tapping MENU; `locator.tap` worked).**

| +ms | element | property | duration | easing | basis |
|---|---|---|---|---|---|
| +65 | `.menu_w` full-screen beige panel | clip `inset(0 0 100% 0)`→0 (unrolls top-down) | 800 | power3.out | measured-declared; sampled 784 ms |
| +65 | `.voile` (top dark gradient) | opacity 1→0 | 400 | power2.out | measured |
| +65 | navbar, logo, `.nav-r`, menu button | color `#ede7de`→`#1A1A1A` | 400 | power2.out | measured |
| +65 | button label | "menu"→"close" text swap, instant | – | – | measured |
| close +64 | `.menu_w` | clip →`inset(0 0 100% 0)` (rolls back up) | 600 | power3.in | measured-declared; sampled 584 ms |
| close +64 | voile; nav colours | opacity →1; colours cleared | 400 | power2.out | measured |

Menu content: centred uppercase links (PROJETS, AGENCE, PROCESS, SHOP, CONTACT, INSTAGRAM), a large embossed outline "MS" monogram, and a footer row (News, Mentions légales, a ✧ glyph, Website by FLOT NOIR). The links and monogram do **not** animate; they are revealed only by the panel's mask (measured, no tweens on them).

## 5. Hover and micro-interactions
- **Reel photos (left and right halves):** no hover response and no cursor change (0 events, measured).
- **Project card (540×108):** `cursor: pointer` (measured). Only the project name rolls per letter: same 450 ms, 15 ms stagger, `power3.inOut`. For "Hamelin", letters start at +81…+164 ms (measured).
  - A multi-line name would add 40 ms per line (source).
  - The location, type, year, ↗ and embossed "MS" on the card stay still.
- **Projects index (source only, not visited):** a tag strip clip-reveals on tile hover, in 800 ms `expo.out` and out in 500 ms `power2.inOut`. Filtering uses Flip at 1200 ms `power4.inOut`, stagger 40 ms.
- No custom cursor.

## 6. Scroll
**Home reel (desktop).** Lenis smooth wheel (lerp 0.06), an infinite loop, and a 900,425 px tall document (100 loops × 10 projects × 900 px, measured) re-centred silently.
- **Scrubbed phase:** scroll progress inside each 900 px project maps directly to clip-path with no easing of its own (Lenis lerp is the only smoothing).
  - The left photo is revealed bottom-up.
  - The right photo is revealed top-down.
  - **The card is revealed bottom-up with values identical to the left photo** (measured: the same inset % every frame). This corrects the earlier record: the card's colour does not wipe horizontally and its text does not roll; the whole card is wiped vertically by a mask.
  - Example: 12 wheel notches revealed Naya from 52%→0% in 666 ms (measured-sampled).
- **Snap phase:** about 500 ms after the last wheel event (declared idle 500 ms, source; measured tween creation consistent):
  - Lenis is stopped and scroll is locked for about 815 ms (measured class change).
  - A `power2.out` 800 ms tween finishes or reverses the partial reveal: forward if progress ≥ 0.5, back if below (measured-declared). Both directions were observed. Maurice Cafe was 34% revealed, then snapped back to 100% hidden at +2044.
- **Photos never move.** No transform, scale or parallax on any reel image (no transform runs, measured). Only the mask edges travel.
- **Agence page:** a pinned section scales a framed image from 310×76 to 1029×601 px during six notches of 120 px. The image runs on ScrollTrigger `scrub: 1` (lags input by about 1 s), with its clip inset going 1%→0 (measured-sampled + source).
  - At 90% progress the subtitle colour tweens to white (400 ms `power2.out`).
- **Scroll-triggered reveals** fire at `top 85–90%`, play once:
  - text lines (yPercent 100→0, 1000 ms `power3.out`, 50 ms stagger);
  - `reveal-clip` images (1350 ms `power4.inOut`);
  - hairline rules (width 0→100%, 1000 ms `power3.out`).
- Project pages run a pinned horizontal track (ScrollTrigger `scrub: 1`, measured tween).

## 7. Type in motion
- **Hover labels:** per-letter dual-copy roll, 450 ms, 15 ms stagger, `power3.inOut` (measured).
- **Entrance, body lines:** SplitText lines in masks, yPercent 100→0, 1000 ms `power3.out`, 50 ms stagger, 300 ms delay (measured-declared).
- **Entrance, display titles:** per character in masks, 1400 ms each, `power4.inOut`, 30 ms stagger, 300 ms delay (measured on "Hamelin").
- **Scroll-triggered character variant:** 800 ms `power3.out` (measured-declared on the "01/02" counters).
- The Agence hero "QUIET LUXURY INTERIORS SHAPED BY TRUE STORIES" had no entrance tween (static, measured).
- **The texture–type link:** the loader's "MS" letterforms are a stencil window cycling five material photographs.
  - Each material opens from a horizontal centre line, like a blind.
  - The outline "MS" left behind then fades out.

## 8. Phone differences
- **Reel:** discrete, not scrubbed. Lenis is stopped and a vertical swipe of 30 px or more triggers on touchend (source).
  - The top photo is revealed bottom-up and the bottom photo top-down.
  - The card opens from its centre line outward (`inset(50% 0)`→0).
  - All three move together: 800 ms `power2.inOut` (measured-declared, sampled 798 ms over 49 frames). A swipe back reverses the directions (measured).
- **Menu:** see §4. Hover rolls are disabled.
- **Page curtains:** split at the horizontal seam, opening from and closing back to the centre line. No Flip.
- **Loader:** swatches 600 ms `power2.in`.

## 9. Vocabulary
Runtime-observed tweens, plus counts of `ease:` literals in the app code (source, about 100 literals):

| ease (GSAP) | source count | used for (observed) |
|---|---|---|
| power2.out | 34 | state changes: colour, opacity, voile; card retract 400 ms; reel snap 800 ms; loader fades |
| power4.inOut | 15 | big mask reveals: loader swatches, loader split, card intro (1200), `reveal-clip` (1350), title characters (1400) |
| power3.out | 10 | text-line reveals (1000), menu open (800), rule draws (1000) |
| power2.inOut | 8 | phone reel swipe (800); project-tag hide (500) |
| power3.inOut | 3 | letter-roll hover (450); page curtains (1000) |
| expo.out | 5 | project-grid tag reveal (800, source) |
| expo.inOut | 3 | Flip image flight (1200) |
| power2.in / power3.in | 4 / 1 | popstate fade-in (400); menu close (600); phone loader swatches (600) |
| none | 2 | scrubbed timelines |
| power1, power2, power1.out | 2, 1, 1 | source only; use not located |

Durations (source counts): 0.4 s ×16, 0.8 s ×9, 1 s ×7, 1.2 s ×6, 0.6 s ×5, 0.5 s ×4, 0.3 s ×4, 1.4 s ×2, 1.35 s ×2, 0.45 s ×1. Source only, use not located: 1.8 s ×4, 2 s ×4, 0.35 s ×1.

By property class:

| property class | duration | easing |
|---|---|---|
| colour and opacity | 400 ms | power2.out |
| letter position (hover) | 450 ms | power3.inOut |
| text-line position (entrance) | 1000 ms | power3.out |
| clip-path, curtain height, Flip geometry | 800–1400 ms | power3–4.inOut or expo.inOut |

## 10. Sequencing
- **Concurrent elements share one curve and start together** within a beat, with opposed directions instead of offset timings. Examples:
  - the reel's left photo, right photo and card (same tween length, same ease, same frame);
  - both curtains;
  - top and bottom letter copies.
- Distinct timings appear only across **property classes** in one interaction. Phone menu open: mask 800 ms `power3.out`, with the colour shift and voile fade at 400 ms `power2.out` alongside it.
- **Serial hand-offs** over overlap:
  - load: five swatches at an ~860 ms cadence → fades → split → card +600 ms;
  - card click: card 400 → curtain 1000 → Flip 1200 + curtain retract + text at +300;
  - popstate: fade-out 400 → fade-in 400.
- **Fixed 300 ms entrance delay** on every reveal after a page swap. Fine staggers: 15 ms per letter (hover), 30 ms per character (titles), 50 ms per line (paragraphs), 40 ms per tile (grid).
- **Snappy vs subdued (against the owner's Osklen reading):** at Mersi the slow, dramatic moves are the **shape and size** changes:
  - clip masks 0.8–1.35 s;
  - curtains 1 s;
  - Flip 1.2 s.

  Small **position** moves are the quick ones (letter rolls 450 ms). **State** (colour, opacity) is the quietest and shortest (400 ms `power2.out`). Mersi therefore inverts Osklen's split: size and shape are slow, and particular state changes are subdued and fast.

## Texture, grain and image treatment in motion
- **Grain is static.** `.grain-bg` is a fixed full-viewport div (z 1000, `pointer-events: none`), tiling a 150 px grain WebP with `mix-blend-mode: color-dodge`.
  - It has no CSS animation, no WAAPI and no inline-style change for the whole session (measured).
  - Two idle screenshots 700 ms apart were byte-identical (measured).
  - The bundle never references it (source).
  - The file itself is a single-frame 300×300 WebP: the VP8X header has only the alpha flag set, with no ANIM/ANMF chunk (file header, measured).
  - Because it sits above the curtains, loader and menu, every moving solid colour carries the same frozen grain. The texture reads as being on the "glass" while the content moves beneath.
- **Images are never moved, scaled or filtered on the home reel.** Only mask edges travel (clip-path inset), and the two halves always wipe in opposite directions, so mid-transition each half shows two projects stacked.
- **Embossed relief as a surface:**
  - the "MS" monogram on the card (SVG groups with `mix-blend-mode: overlay`, measured), which takes on each card colour;
  - the large outline "MS" in the phone menu;
  - the bevelled frame around the project hero portrait.

  None of these animate in place; they arrive only via masks.
- **Material swatches as a loader:** wood, travertine, stone, slate and marble photos are clipped through the MS letterforms, one after another (estimated identification from frames).
- **Colour from the work:** page-change curtains take the clicked project's card colour (copper `#BB7E4A` for Hamelin, measured), otherwise taupe `#CAC0B3`. The transition is effectively a flat colour field from the project's palette, grained by the static overlay.
- **One image-continuity move:** the desktop card click flies the left reel photo (Flip, 1200 ms `expo.inOut`) into the framed hero portrait on the project page.
- **Scroll scale-up** on Agence: a framed image grows to near-full-bleed under scrub.

## Corrections to the 2026-11-14 record
- The card wipe is vertical, not horizontal: the card is masked bottom-up in lockstep with the left photo, and its text does not roll.
- The page change is now measured: the URL changes at 1008 ms and the curtains clear at 2006 ms. This replaces the earlier "~1 s" estimate.
- Hover now registers: nav letter rolls and the card's name roll were measured. The photos have no hover.
- The phone menu now opens and is measured (800 ms open, 600 ms close).
- The grain is confirmed static.

## 11. Gaps
- **Returning-visitor loader** (0.5 s wait + 500 ms fade): source only; every run used a fresh context.
- **Projects index:** the grid, Flip filter and tag hover were not visited (source values only). Process, Shop and Contact were not visited.
- **Phone input was synthetic:** the swipe was CDP touch events and the menu used `locator.tap`. Real-finger velocity was not tested; the code ignores velocity and uses only a 30 px threshold.
- **Grain** was checked over one 300×200 px region at idle; it is not animated in code, so this is unlikely to differ.
- **Video timings** are offset by about 1.2 s from recorder time (estimated). Direction descriptions come from frames and agree with the declared inset values.
- **Desktop page-change totals are network-dependent.** The curtain covers for a fixed 1000 ms. The new page loaded within that time in these runs, so the 2006 ms total assumes a fast fetch.
