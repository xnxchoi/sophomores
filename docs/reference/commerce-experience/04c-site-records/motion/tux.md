# tux: motion, captured 2026-11-15 (1440×900, 390×844)

Sources: `MC/out/tux/` — events `tux-home`, `tux-r2` … `tux-r7`, `tux-r6m` (phone), `tux-r4v` (video run); summaries `*.summary.txt` (re-run with the corrected analyze.mjs names); frame sheets `menu-open-sheet.png`, `team-sheet.png`, `bar-sheet.png`; site CSS saved in `dl/all.css`. All offsets are measured from a page-clock `pointerdown/click` listener (or `popstate`/`pushState`) unless stated, so the Node mark/page clock skew does not enter (it was ≤ 2 ms). Sample rate (median gap per element): ≈17 ms on load, scroll and the people page; ≈33 ms whenever the 15 px backdrop blur is on screen (menu, page changes). A re-run with the GPU-flagged recorder (`tux-r8`) gave the same 33 ms under blur and reproduced every menu value (word starts within ±15 ms, same curves and durations, except one looser fit — run 1 Culture, rms 0.0034), so this is the page's own frame cost in headless Chromium, not a software-rendering fallback; fits use real timestamps and hold at either rate. Inline-style timings are ±1 frame. "Declared" = CSS transition/animation read from `getAnimations()` and confirmed in the site stylesheet (exact). "Fit" = per-frame inline-style samples fitted with free start/duration (GSAP names, polynomial in brackets). Frames from video are **estimated**.

## 0. Motion in one paragraph
Slow, heavy surfaces and fast chrome. Structure (green menu sheet, dark cover panel, whole pages) moves 0.8–1.3 s on steep in-out curves; chrome (bar links, burger, hover pill) changes in 200 ms; hover feedback in 300 ms ease-out. Display type never fades: the 223 px TuxPlaza words rise inside a clip mask over a long 2 s quart-out tail, staggered 100 ms, so they are still settling a second after the sheet has stopped. Mono type almost never appears plainly: it is decoded through a character scramble that sweeps right→left. The cursor carries two followers lagging at different rates. Everything in one interaction is offset in time and uses a different curve per property class; nothing is simultaneous-and-identical except paired elements (a surface and its counter-translated content).

## 1. Stack
- Nuxt 2 / Vue (`window.__NUXT__`, `_nuxt/*.js`, `nuxt-link` classes), Vue page transitions `page-leave-active` / `page-enter-active` (CSS, **measured** + stylesheet).
- JS tweens write inline `translate3d(…)` during and `translate(0px, 0px)` at the end — GSAP's `force3D:"auto"` signature — but `window.gsap` is not exposed, so tweens were measured as inline-style runs (fits), not read as GSAP vars.
- No smooth-scroll library: native `scrollY` moves, `.smooth-scroll` wrapper has no transform (only `pointer-none/initial` class toggles while scrolling) (**measured**). No three.js; `<canvas>` elements live inside the hover vignettes. Vimeo iframes for films, Cloudflare Turnstile on the contact form (not touched).
- Site ships `prefers-reduced-motion` overrides (observed in CSS; not exercised).

## 2. Load and intro (home, 1440; +0 = app hydration, ≈1.3 s after navigation in this capture)
| +ms | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| 0 | floating bar `header` | translateY −117.8 px (−200 %) → 0 | ≈505 | 0 (first painted frame +160, long task) | power2.out (cubic), rms 0.002 | fit |
| 0 | bar links Work/Culture/Contact | opacity | 200 | 0 | (0.645,0.045,0.355,1) | declared |
| 0–560 | hero services words (6 rows) | character scramble → text | ≈560 | — | R→L sweep | measured (text) |
| 280–1060 | hero tagline (52 chars) | scramble in; letters become visible R→L from +280, all visible ≈+800, settled +1060 | ≈780 | — | ≈10 ms/char | measured (text) |
| 450–770 | brand "TUX CREATIVE HOUSE" | opacity 0→1 | ≈300 | — | near-linear | sampled |
| 610–1480 | bar links | scramble ("oyrq"→"Work"), links in sequence Work → Culture → Contact, ≈120 ms apart | ≈870 | — | — | measured (text) |
| ≈2550 | hero video | opacity 0.2→1 | 600 | network-dependent | expo.out, rms 0.000 | fit |
- No loader, no curtain. `defiler` marquees are created at load as CSS animations (5000 ms linear, infinite) but `paused` until their menu row is hovered (declared).

## 3. Page change (SPA via `pushState`; bar, footer and popin persist)
Three choreographies. A and B were each captured at least twice; their fixed parts agree within ±40 ms. C was captured once.

**A. Bar link (Work/Culture/Contact), browser Back, and scroll-past-footer "Next page": 2.21 s click → settled** (r3 bar Culture, r3 back ×2, r7 scroll-next)
| +ms | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| 0 | clicked bar link | label scramble (≈300–550 ms), pill `:before` | 200 | 0 | (0.645,0.045,0.355,1) | declared |
| 15 | `.page-transition .overlay` (backdrop blur 15 px + noise PNG at 0.3 overlay) | opacity 0→1 | 400 | 0 | (0.49,0.07,0.6,0.98) | declared |
| 15 | `.page-transition:after` (#121212 panel) | translateY 100 % → 0 (rises from bottom, covers) | 800 | 200 | (0.645,0.045,0.355,1) | declared |
| 45–50 | old page + footer | translateY 0 → −20vh (−180 px) | 1300 declared, cut at ≈930 ms when Vue swaps | 0 | (0.645,0.045,0.355,1) | declared |
| 980–1016 | new page + footer | translateY +20vh → 0 | 1000 | 0 | (0.645,0.045,0.355,1) | declared |
| 1209–1216 | cover panel | translateY 0 → −100 % (exits through the top) | 1000 | 0 | (0.645,0.045,0.355,1) | declared |
| 1209–1216 | blur overlay | opacity 1→0 | 1000 | 0 | (0.49,0.07,0.6,0.98) | declared |
| ≈2210 | — settled | | | | | |
Frames (estimated): page blurs and dims, the dark panel wipes up from the bottom edge, holds ≈200 ms fully opaque, then continues upward and off, uncovering the new page while it is still rising its last ≈180 px.

**B. From the menu (sheet already open): route resolve + 2.0 s** (r3 Contact ×2: 2.02–2.03 s click → settled, `pushState` ≤ 1 ms after the click; r4 / r4v Team, first visit: `pushState` 0.89 / 0.78 s after the click (cause not measured, network-dependent), enter end 2.95 / 2.84 s)
| +ms after leave start | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| −80 | clicked menu word | stays at hover opacity 0.7 | | | | |
| 0 | old page + footer (hidden under the sheet) | translateY 0 → −20vh | 1300, cut at ≈930 | 0 | (0.645,0.045,0.355,1) | declared |
| ≈930 | sheet `.inner` + `.menuChild` | 0 → 100 % / 0 → −100 % (wipe down, content stationary) | 1000 | 0 | (0.9,0,0.1,1) | declared |
| ≈900 | menu words (start ≈30 ms before the sheet) | translateY 0 → 60 %, reverse stagger 100 ms | 1000 each | 0–400 | power2.in (cubic), rms 0.0008–0.0016 (r4 refit) | fit |
| ≈930 | mono labels | scramble out R→L | 170–480 | — | — | measured (text) |
| ≈950 | new page + footer | translateY +20vh → 0 | 1000 | 0 | (0.645,0.045,0.355,1) | declared |
| ≈930 | page blur `#overlay` | opacity 1→0 | 400 | 500 | (0.49,0.07,0.6,0.98) | declared |
| ≈1950 | — settled (people page then fades its credits in, §People) | | | | | |
The earlier record's ≈2.8 s was menu→Culture in a throttled tab; the choreography itself is a fixed ≈2.0 s (menu) / 2.2 s (bar).

**C. Footer "Next page — Come Wander With Us — Culture"**: scrolling into the end of the footer counts a mono number 0→100 (≈2.7 per frame, 0→100 in ≈740 ms while wheel input continued), the 334 px vignette preview scales in (below), and at 100 the route changes with choreography A. Whether the counter is time-driven or wheel-driven was not separated.

## 4. Navigation and menu
**Bar hover** (each link): pill `:before` rgba(0,0,0,.45) radius 5 px, opacity 0→1 + scale 0.9→1, 200 ms (0.645,0.045,0.355,1) (declared); the label re-scrambles to itself in ≈550 ms ("qprc"→"Work") (measured, text). Burger hover: four dots transform 200 ms same curve. No hover on the brand.

**Menu open** (r2 ×2, r1; phone r6m ×2; identical recipe each time)
| +ms after click | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| 0 | burger: inner + 4 dots | rotate 90°, dot `:before` 45° | 200 | 0 | (0.645,0.045,0.355,1) | declared |
| 0 | menu word 1 "Work" | translateY 60 % (120.8 px at 1440, 44 px at 390) → 0, inside a clip-path that cuts the lowest 14 % of the line | 2000 | 0 | power3.out (quart), rms 0.0002–0.0005 | fit |
| 100/200/300/400 | words 2–5 Culture, Team, Contact, Jobs | same | 2000 | stagger 100 ms (measured 98–103) | same | fit |
| 12 | sheet `.inner` (#17e013, radius 15 15 0 0) | translateY 100 % → 0 | 1000 | 0 | (0.9,0,0.1,1) | declared |
| 12 | `.menuChild` (all menu content) | translateY −100 % → 0 — cancels the sheet's motion, so content stays still while the green edge wipes up over it | 1000 | 0 | (0.9,0,0.1,1) | declared |
| 12 | bar links | opacity 1→0, then visibility hidden | 200 | vis 200 | (0.645,0.045,0.355,1) | declared |
| 12 | `#overlay` page blur 15 px | opacity 0→1 | 400 | 0 | (0.49,0.07,0.6,0.98) | declared |
| ≈720–760 | mono labels (2 addresses, "House of diverse thinkers…") | scramble in R→L; per-letter visibility sets at +929…+1331 (r2 run 1) / +962…+1330 (run 2), settled +1860–1900 ("United States" +1395); one more random glitch after settling ("La piezrga" ≈+1520) | ≈1130 | — | — | measured (text, opacity sets) |
| 1012 / 2000–2400 | sheet settled / words settled | | | | | |

**Menu close**
| +ms after click | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| 0 | burger | back | 200 | 0 | (0.645,0.045,0.355,1) | declared |
| −5…+396 | words, Jobs first → Work last | translateY 0 → 60 % | 1000 | reverse stagger 100 ms | power2.in (cubic), rms 0.0005–0.0015 | fit |
| 25 | sheet + `.menuChild` | wipe down | 1000 | 0 | (0.9,0,0.1,1) | declared |
| 55 | mono labels | scramble out R→L, letters hidden from the end | 180–270 (tagline 480) | — | — | measured (text) |
| 25 | `#overlay` | opacity 1→0 | 400 | 500 | (0.49,0.07,0.6,0.98) | declared |
| 25 | `#menu` | visibility hidden | 0 | 600 | linear | declared |
| ≈1025 / ≈1400 | sheet down / last word out | | | | | |

**Menu word hover**: hovered word opacity 1→0.7, 300 ms (0.215,0.61,0.355,1) (declared); a mono data row (section name, count, description marquee) appears at the pointer's row (snaps in ≤ 130 ms, no easing), its count scrambles (≈500 ms), its marquee runs (`defiler`, translateX 0→−50 %, 5000 ms linear); the whole word list follows pointer Y with a lerp of 0.17 per 60 fps frame (τ ≈ 88 ms, 95 % ≈ 265 ms), measured on two runs.

## 5. Hover and micro-interactions
- Cursor followers on home (both time-normalised exponential smoothing, measured from a 800 px pointer jump): the 334 × 334 vignette (radius 15 px, clip-path) at lerp 0.156/frame (τ ≈ 99 ms, 95 % ≈ 296 ms); the mono cursor label ("Click & Hold", "See project", "Read More") at 0.25/frame (τ ≈ 58 ms, 95 % ≈ 174 ms). The label changes word per zone through a scramble (≈600 ms; "Click & Hold" re-scrambles every time the pointer returns to the hero).
- Vignette preview (footer "Next page"): inner scale 0→1 ≈480 ms and 1→0 ≈510 ms, cubic in-out (fit rms 0.003–0.005; matches the site's (0.645,0.045,0.355,1)); on exit its canvas scales 1→3 at the same time (fit).
- Hero click & hold: pointerdown fades the cursor label and speaker icon out (300 ms (0.215,0.61,0.355,1)), scrambles the tagline out R→L (≈670 ms), then scrambles four "services" rows in (+530…+1160). Release reverses: services scramble out (≈190 ms), tagline back in (+524…+1624), label 300 ms, speaker 300 ms after a 150 ms delay (declared + text). What the video does while held was not inspected.
- News cards: image div scale 1→1.05, intro text colour, and a noise overlay opacity, all 300 ms (0.215,0.61,0.355,1) (declared, seen firing as cards passed under the pointer).
- Hero halves (`.homeHero .bg .left/.right`, ≥ 1024 px): clip-path reveal 1000 ms (0.76,0,0.24,1) in, 500 ms out (stylesheet only; not triggered in capture).
- News popin video: transform 600 ms (0.215,0.61,0.355,1) on hover in/out (declared). Footer buttons: colour/background 600 ms (0.19,1,0.22,1) (stylesheet).

## 6. Scroll
- Native scroll, no smoothing on the page itself (measured `scrollY` per wheel step).
- Case films: `img.hfond` translateY scrubbed from −30 % to +30 % as a 1100 px band crosses the viewport; linear with scroll while the wheel runs (fit linear, rms 0.03–0.05), then a short decelerating tail of 490–745 ms after the last wheel event (ease-out shape; fits css ease rms 0.022, power2.out rms 0.047 — weak) (fit, re-run with the corrected analyzer).
- News grid: each card `div.para` offset −50 px → 0 as it enters, linear with scroll (rms 0.007, no smoothing); the 4th, taller column travels a different amount (−32.3 vs −28.8 px at the same scroll) (fit).
- No pinned sections, no triggered reveals on the values billboard or the green contact block (no events while scrolling through them); the bar stays; `html` swaps `-ui-dark/-ui-light` classes by section (no transition).

## 7. Type in motion
- TuxPlaza display (menu words, 223 px / 60 px phone): whole words rise 60 % of their line height inside a clip mask; never per letter, never faded. Long quart-out tail (2 s) on entry, cubic-in 1 s on exit; 100 ms stagger forward in, reverse out.
- Mono labels (addresses, taglines, bar links, cursor labels, counts, hero services): split into per-letter spans; the scramble replaces characters with random lowercase letters and resolves them, sweeping right→left (the end of the string settles first), about one character per 10–13 ms, then individual characters may glitch again once. Exit is the same sweep, faster (≈170–270 ms for a 20-character line), then letters are hidden.
- People card name/role (NeueMontreal): plain instant text swap, no scramble.
- Values billboard and "Contact us" megaTitre: no entrance motion.

## 8. Phone differences (390×844, touch)
- Menu: identical timings and curves (sheet 1000 (0.9,0,0.1,1); words 60 % = 44 px, 2000 ms quart-out, 100 ms stagger; close 1000 cubic-in reverse stagger) (fit rms 0.0004–0.0012). Five words incl. Jobs at 60 px; addresses replaced by footer links (Karma Foundation, Privacy policy, Brouillon, FR/EN). No bar links to fade.
- People: no roll and no photo card — credits are a static two-column list (box 360 × 3500) that only fades in on load; tapping a name did nothing observable.

## People page (`/en/people`) — modelled-on reference
- Entry from menu: `.equipe` translateY +20vh → 0, 1000 ms (0.645,0.045,0.355,1) (declared), then the credits column fades 0→1 ≈480–630 ms power1.out (quad) starting ≈900 ms after the enter began (fit), then the roll starts. Direct load: header/bar identical to home; credits fade at +3066 ms after navigation, roll at +3549.
- Roll: `.credits` translateY at a constant **83.3 px/s, linear** (fit rms 0.000 over 5.7 s; identical at 30 and 60 fps, so time-based). The 3,239 px column is the list twice; position wraps at ≈1,619 px, so it loops seamlessly (one loop ≈19.4 s).
- Pause: hovering the credits column (role or name text) decelerates the roll to a stop over ≈800 ms with ≈35–38 px of travel (ease-out shape; fits css ease / power2.out at rms 0.04–0.05, weak). Hovering the gap between column and card, or the card area, does not pause it (linear, rms 0.001). Leaving the column restarts it with an ease-in ramp from 0 to 83 px/s over ≈500–1000 ms (sampled; fits ease-in rms 0.05, weak).
- Before any hover the page is only the rolling column on #121212: no card, no bullet, no blurred backdrop (screenshot `people-prehover.png`).
- Hover on a row: the right-hand card (photo, name, mono role) switches to that person immediately, row by row as the pointer crosses (16–33 ms apart), plain text swap, no scramble. The photo first shows a blurred low-resolution placeholder and the full image replaces it ≈3 burst frames later (≈150–250 ms, network-dependent, no visible fade between frames; **estimated**, `burst-sheet.png`). The backdrop layer `fondFlou` (opacity 0.35, `blur(15px)`) uses 16×20 px thumbnails of every person, all assigned at load. On leaving, the card's text resets to the first entry (Alexander Nguyen); whether the card itself hides was not checked.
- Wheel: drives the roll directly at ≈1,500–1,750 px/s during wheel input, in both directions, and returns to the 83 px/s cruise within one ≈50 ms sample after the last wheel event (no inertia).

## 9. Vocabulary
Curves (declared unless marked):
- cubic-bezier(0.645,0.045,0.355,1) (in-out cubic), 9 uses: bar link opacity/pill 200, burger 200, page leave 1300, page enter 1000, cover panel 800 (+200) and 1000, footer follows page 1300/1000; vignette scale ≈480–510 (fit). Position of whole surfaces, chrome state.
- cubic-bezier(0.9,0,0.1,1), 2 uses: menu sheet and its counter-translated content, 1000 both ways.
- cubic-bezier(0.49,0.07,0.6,0.98), 3 uses: blur overlays 400 (in), 400 delayed 500 (menu out), 1000 (page-change out). Opacity of veils only.
- cubic-bezier(0.215,0.61,0.355,1) (out cubic), 7 uses: menu word hover 300, card image scale 300, card text colour 300, noise overlay 300, cursor label 300, speaker 300 (+150), popin video 600. Hover feedback.
- power3.out (quart) 2000 (fit): display words in. power2.in (cubic) 1000 (fit): display words out. power2.out (cubic) ≈505 (fit): bar drop on load. power1.out (quad) ≈500 (fit): credits fade. expo.out 600 (fit): video fade-in.
- (0.76,0,0.24,1) 1000/500 hero halves, (0.19,1,0.22,1) 600 footer buttons (stylesheet only).
- Linear: marquees 5000 loop, credits roll 83.3 px/s, spinner 2000/1500.
- Lerp followers: 0.156, 0.17, 0.25 per 60 fps frame.
Durations: 200 (chrome), 300 (hover), 400 (veils), ≈500 (scale, bar drop, fades), 800/1000/1300 (surfaces and pages), 2000 (display type).

## 10. Sequencing
- Menu open runs five layers at once, each with its own curve and clock: chrome 200 ms (0.645…), veil 400 ms (0.49…), sheet 1000 ms (0.9,0,0.1,1), display words 2000 ms quart-out with 100 ms stagger, then mono labels decoding from ≈+750 to ≈+1900. The words start at the click with the sheet but finish 1–1.4 s after it, so the type is still drifting after the surface is still.
- Close is not the reverse played back: everything is shorter (words 1000 vs 2000), curves flip to ease-in (cubic-in), stagger order reverses, the scramble-out takes a fifth of the scramble-in time, and the veil waits 500 ms so the page stays blurred until the sheet has mostly gone.
- Page changes overlap leave and enter: the 1.3 s leave is interrupted at ≈930 ms, the enter and the uncover begin together (menu) or 200 ms apart (bar), and the veil fades over the same 1000 ms as the uncover.
- Snappy vs subdued, by property: chrome state and scale are quick (200–500 ms); hover opacity 300 ms; position of surfaces 800–1300 ms on steep in-out curves; display-type position longest (2 s) and softest (long out tail). Followers lag at three distinct rates. This matches the Osklen description in shape (quick shape/state, subdued position, distinct curve per concurrent element), with longer absolute durations.

## 11. Gaps
- `window.gsap` not exposed: JS tween durations/eases are fits, not read values; the sub-frame start of words is anchored to the click.
- People card photo element type (img/canvas) not identified; the placeholder→photo swap is from screenshots only (estimated), and no transition or animation was recorded on the card or `fondFlou` during hover.
- Hero hold: what the film does while held, and the hero halves clip-path hover, were not inspected visually.
- Footer "Next page" counter: time-driven vs wheel-driven not separated.
- Video frames ran slower than the timing runs; all frame-derived descriptions are estimated.
- Phone was emulated touch in headless Chromium; no real-device swipe or momentum behaviour.
