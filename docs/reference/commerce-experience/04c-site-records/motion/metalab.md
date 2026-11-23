# metalab: motion, captured 2026-11-15 (1440×900, 390×844)

Source labels used on every number:
- **[G]** declared, exact: a live GSAP call captured as it ran (the bundled GSAP was exposed and its `to/fromTo/set` wrapped, so target, values, duration, delay and ease are logged).
- **[C]** declared, exact: a CSS transition or WAAPI animation read from `getAnimations()`, or a CSS rule in the site stylesheet.
- **[B]** declared in the bundle source only, not seen running.
- **[S]** sampled inline style or SVG attribute per frame: duration ±1 frame, easing is a fit. Fits use GSAP names: power1 = quad, power2 = cubic, power3 = quart, power4 = quint.
- **[E]** estimated from video frames.

Timings are given as offsets from the trigger (pointer enter, click), measured in a foreground headless Chromium at full frame rate. This corrects the 2026-11-14 record, whose JS numbers came from a 2 fps background tab. Frame-rate check: the median gap between consecutive style samples of one element was 17 ms in every run (p90 19–33 ms), so the sampled durations are at full rate. The site uses no WebGL.

## 0. Motion in one paragraph
Almost every transition on Metalab is a GSAP tween in a small vocabulary. Power3.easeOut (quart out) handles reveals. Power4.easeInOut and Power3.easeInOut (quint and quart in-out) handle large surface moves. GSAP's default power1.out (quad out) handles plain fades.

Speed is set by direction rather than by property. Things arriving are slow and soft: a preview enters in 0.8 s, the menu frame in 1.2 s, the click-to-case-study expansion in 1.5 s. Things leaving are fast: a preview retracts in 0.3 s, and a menu link loses its underline in 0.3 s.

Within one interaction, concurrent pieces mostly share a single duration and ease and start on the same frame. There is no per-letter or per-word typography. Offsets come from a few deliberate places:
- The menu's content rail starts 0.5 s late.
- The menu's notification cards are staggered 50 ms apart.
- The menu frame and the page shrinking inside it use different eases.
- The hero backdrop is a CSS fade on a 100 ms delay, while the GSAP previews start immediately.

The character is calm and sequenced rather than snappy. The only snappy parts are the 0.2 to 0.3 s CSS colour changes on pills and the cursor ring.

## 1. Stack
- **GSAP 3.14.2**, bundled and not exposed as `window.gsap`. Found via the webpack runtime (`webpackChunk_N_E`) and module 8112's `Ay` export. `gsap.defaults()` = `{duration: 0.5, overwrite: false, delay: 0}`, so the default ease is power1.out. ScrollTrigger is registered, and Draggable/Inertia code is present in the bundle.
- **Lenis**: `html.lenis.lenis-smooth` is set. It is constructed with `duration: 1.2` and Lenis' default exponential-out easing, and driven by the GSAP ticker with `lagSmoothing(0)` [B].
- **Next.js 16.4.3, pages router**: page changes are client-side.
- **A WAAPI page wrapper** (`PageTransition_page`), probably Motion/AnimatePresence: it runs opacity animations of 0 to 300 ms with `cubic-bezier(0.25, 0.1, 0.35, 1)` [C]. It mostly holds or cuts; GSAP does the visible work.
- **Video** carries the moving imagery: the hero 3D loop, case-study hero videos and the menu previews. There is no canvas and no WebGL.
- **CSS transitions** are used only for pill colours (0.2 s `ease`), the cursor stroke (0.2 s), the hero video container (0.6 s `ease`, 0.1 s delay), image load fades (0.3 s) and pill opacity on phone (0.2 s).
- **Shared constants** in the bundle: 1.2 s, 1.4 s, `Power3.easeInOut` [B].

## 2. Load and intro (1440, home, cold load; offsets from navigation start)
The intro runs on a white ground. The serif words "We / Make / Interfaces" and small labels ("BC, CA", "EST 2006", "0→1", a GMT clock) are scattered across it. A rounded vertical window opens in the centre onto the purple-black 3D hero video. While the window is open, the words and labels hop between positions. The window then expands to full screen and the hero UI fades in [E].

| +ms | element | property | duration | delay | easing | source |
|---|---|---|---|---|---|---|
| ~610 | window mask (SVG clip rect, `ContentMask`) | starts at width 0, height 700, centred | set | – | – | [G] |
| ~710 | preloader words/labels (`TranslatingItem`) | x/y hop to the next position, repeating timeline | 1.0 s per hop | – | Power3.easeInOut | [G] |
| ~900 | window mask | width 0→432, corner radius 0→15 | 1.0 s | 0.2 s | Power3.easeInOut | [B]; sampled 1→432 over 778 ms, cubic in-out fit, rms 0.012 [S] |
| ~3770 | window mask | grows to 1440×900, radius 15→0 (starts 3 s after the first grow) | 1.8 s | 3.0 s | Power3.easeInOut | [B]; sampled 433→1440 over 1486 ms, height 701→900 over 1319 ms [S] |
| ~5040 | hero headline + intro paragraph | opacity 0→1 | 0.6 s | – | power1.out | [G]/[S] 579 ms, quad fit, rms 0.001 |
| ~5420 | header | opacity 0→1 | 0.5 s | – | power1.out | [G]/[S] 483 ms |
| ~5440 | client pill list | opacity 0→1 | 0.3 s | – | power1.out | [S] 283 ms |

The whole load settles about 5.9 s after navigation, and the home page never scrolls.

## 3. Page change
**Path A: home pill click → case study (`/work/uber`).** This is an SPA route push that happens only after the expansion finishes. The header persists, and its clock keeps rolling.

| +ms after click | element | property | duration | delay | easing | source |
|---|---|---|---|---|---|---|
| 10 | thumbnail clip rect | width/height to 1440×900, x/y to 0, radius 8→0 | 1.5 s | – | Power4.easeInOut | [G] |
| 10 | thumbnail image container | x/y/scale from the thumbnail's spot (scale 0.4, 0.5 or 0.55 by layout) to 0/0/1 | 1.5 s | – | Power4.easeInOut | [G]; sampled 1492 ms, quint in-out fit, rms 0.018, p25/50/75 = 0.02/0.56/0.99 [S] |
| 10 | client pill list | opacity 1→0 | 0.3 s | – | power1.out | [G] |
| 25 | cursor ring and dot | radius back to rest | 0.3 s | – | Power3.easeOut | [G] |
| ~1520 | (route push in onComplete) home page wrapper | opacity 1→0 instantly; the image covers everything | 0 | – | – | [C] |
| 1520 | case-study sections | opacity 0→1 | 0.3 s | 0.1 s | power1.out | [G] |
| 1540 | scroll proxy `{current}` | 0 | 0.96 s | – | Power3.easeInOut | [G] |
| 1693 | case-study hero image container | fromTo height 900, y −450 → height 838, y 0. The full-screen image slides about 450 px down, uncovering the 140 px title and metadata row above it | 1.2 s | 0.2 s | Power3.easeInOut | [G]; frames [E] |
| 1908 | home preview layer | opacity 1→0 over the identical case-study image | 0.2 s | – | power1.out | [G] |
| 3107 | case-study hero video | replaces the still: opacity 0→1 | 0.05 s | – | – | [G] |

Total from click to settled is about 3.1 s. The sequence runs in three parts: a 1.5 s expansion, about 0.2 s of hold, then a 1.2 s slide down.

**Path B: browser Back (popstate) → home.** There is no cover. The case study cuts to black (one frame) [E]. Then:
- The pill list fades in (opacity 0→1, 0.3 s) [G].
- The pill container fades in (0.5 s after a 0.2 s delay) [G].
- The headline fades in (0.6 s) [G].
- The hero video fades in by CSS (0.6 s after 0.1 s) [C].

The wrapper's WAAPI animation runs 300 ms with keyframes 1→1, so it changes nothing visible [C]. The page settles in about 0.7 s.

**Path C: wordmark click on a case study → home.** This uses a separate four-panel "wipe" layer (`PageTransitionPortal`). It is not the menu's panels.

| +ms | element | property | duration | delay | easing | source |
|---|---|---|---|---|---|---|
| 49 | four edge panels plus four rounded-corner pieces | close in: the window narrows to a central vertical slit, then the screen is fully covered | 0.7 s | – | Power4.easeInOut | [G]; sampled quint in-out fit, rms 0.041 [S]; slit [E] |
| 57 | header | opacity 1→0 | 0.3 s | – | Power3.easeInOut | [G] |
| ~750 | page wrapper | route swap under the cover (WAAPI 0→1, duration 0, delay 0.7 s) | 0 | 0.7 s | – | [C] |
| – | – | hold while covered | 0.5 s | – | – | [B] |
| 1265 | panels and corners | open out | 0.7 s | – | Power3.easeInOut | [G] |
| 349 | header | opacity 0→1 | 0.3 s | 0.84 s | Power3.easeInOut | [G] |
| 1936 | client pill list | opacity 0→1 | 0.3 s | – | power1.out | [G] |

Total is about 2.2 s. Closing uses quint in-out and opening uses quart in-out.

## 4. Navigation and menu (1440)
**Header hover** on Menu, the wordmark, theme and mail: the cursor ring grows from radius 6 to 17 and the dot shrinks from 6 to 1 (0.3 s Power3.easeOut [G]; sampled 280 ms, quart fit, rms 0.002 [S]). The ring stroke turns violet `--bg-highlight` (CSS `stroke 0.2s` [C]). On the Menu pill, the border colour changes over 0.2 s `ease` [C]. Leaving reverses all of this with the same timings.

**Menu open**, timed from the click:

| +ms | element | property | duration | delay | easing | source |
|---|---|---|---|---|---|---|
| 68 | Menu pill | width 64→77 | 0.6 s | – | Power4.easeOut | [G] |
| 68 | theme toggle (moon), appears in header | opacity 0→1 | 0.5 s | – | power1.out | [G]/[S] 484 ms, quad fit, rms 0.002 |
| 68 | clock group | x 30→0 (shifts left to make room for the toggle) | 0.5 s | – | power1.out | [G]/[S] 74→577 ms |
| 72 | wordmark + clock text | colour white→black for the white ground | 0.4 s | – | CSS `ease` | [C] |
| 68 | "Menu" label | y 0 → −105% | 0.6 s | – | Power4.easeOut | [G]/[S] quint out, rms 0.003 |
| 68 | "Close" label | y 105% → 0 | 0.6 s | – | Power4.easeOut | [G] |
| 68 | × icon | y 50% → 0 | 0.6 s | 75 ms | Power4.easeOut | [G] |
| 69 | four white panels (top/bottom 80 px, left/right 504 px) | slide in from the edges to x/y 0 | 1.2 s | – | Power4.easeInOut | [G]/[S] 1198 ms, quint in-out, rms 0.022 |
| 69 | four corner-radius pieces | travel with the panels (±503.5, 80) | 1.2 s | – | Power4.easeInOut | [G] |
| 69 | current page | scale 1 → 0.9044, into the 432 px wide window | 1.2 s | – | **Power3.easeInOut** | [G] |
| 69 | menu media preview | rises from y 900, scale 0.9044 | 1.2 s | – | Power4.easeInOut | [G] |
| 69 | hero headline + paragraph | opacity → 0 | 0.6 s | – | power1.out | [G] |
| 72 | client pill list | opacity → 0 | 0.3 s | – | power1.out | [G] |
| 569 | nav list + case-study list | x −150 → 0, opacity → 1 | 1.2 s | 0.5 s | Power3.easeOut | [G] |
| 569 | "©2026" | opacity → 1 | 1.2 s | 0.5 s | power1.out | [G] |
| 568–768 | five notification cards | x → 0 | 1.2 s each | 0.50/0.55/0.60/0.65/0.70 s | Power3.easeOut | [G] |

Settled at about 1.9 s.

**Menu close**: the same elements in reverse, all starting on the click frame.
- The panels slide out over 1.2 s with **Power3.easeInOut** [G]; sampled 1177 ms, quart in-out fit, rms 0.015 [S]. Open uses quint and close uses quart.
- The page returns to scale 1 over 1.2 s, Power3.easeInOut [G].
- The lists move x→−150 and fade out over 0.9 s, Power3.easeOut, with no delay [G].
- The cards move x→300 over 1.2 s, Power3.easeOut, all together with no stagger [G].
- The media preview fades out over 0.4 s [G].
- The labels swap back over 0.6 s, Power4.easeOut [G].
- In the header, the theme toggle fades out (0.5 s, power1.out), the clock shifts x→30 (0.5 s, power1.out) [G], and the wordmark and clock colour return over 0.4 s CSS `ease` [C]. All of this starts on the click frame.

The earlier record's "close is near-instant" was an artefact of the throttled tab.

**Menu link hover** (What We Do, About Us, Latest News, Get in Touch):
- The hovered link's underline wipes in from the left (x −102% → 0) over 0.6 s, Power3.easeOut [G]. Its label goes to opacity 1 over 0.6 s, Power3.easeOut [G].
- Every other link's underline exits to the right (x → 102%) and its label dims to opacity 0.3, both over 0.3 s, power1.out [G].
- The centre preview cross-fades: the hovered preview reaches opacity 1 in 0.2 s, and the others reach 0 in 0.2 s after a 0.2 s delay [G]. The incoming preview therefore covers the outgoing one before it goes.

Case-study links in the menu use the same 0.2 s CSS pill colours [C].

## 5. Hover and micro-interactions
### 5.1 Client index hover swap (desktop)
Each client in the pill list owns a full-screen `CaseStudyPreview` layer. All ten layers are stacked, and the active one gets `z-index: 10`. The swap starts on the same frame the pointer enters the pill's list row. Pointer-enter on the button and the first tween are within 1 frame of each other, and client pills have **no debounce**.

**Hover in** (example: Uber, layout 2):

| +ms | element | property | duration | delay | easing | source |
|---|---|---|---|---|---|---|
| 0 | pill | background → transparent; 1 px border → `--border-bold` (white) | 0.2 s | – | CSS `ease` | [C] |
| 0 | cursor | position via `gsap.set` on every pointer move; no smoothing or lag | – | – | – | [G] |
| 0 | cursor ring / dot | radius 6→17 / 6→1; stroke white → violet `#584dff` | 0.3 s / 0.2 s | – | Power3.easeOut / CSS | [G]/[C] |
| 0 | hero backdrop video container | opacity 1→0 | 0.6 s | 0.1 s | CSS `ease` | [C] |
| 0 | hero headline + intro paragraph | opacity → 0 | 0.6 s | – | power1.out | [G]; sampled 580 ms, quad fit, rms 0.002 [S] |
| 0 | client background layer (full-bleed photo with a 20/40/60% dark overlay) | opacity 0→1 | 0.8 s | – | Power3.easeOut | [G] |
| 0 | client name (PP Eiko 88 px), short description, product-type line | opacity 0→1 and translate ±40 px → 0; the three elements are simultaneous, with no stagger | 0.8 s | – | Power3.easeOut | [G]; sampled 797 ms, quart fit, rms 0.005 [S] |
| 0 | product thumbnail (SVG clip-rect reveal) | grows from one edge to full size (576×360 / 360×495 / 446×450); radius 0→8 | 0.8 s | – | Power3.easeOut | [G]; sampled 780 ms, quart fit, rms 0.001 [S] |

**Hover out** to empty space: every preview piece reverses in **0.3 s Power3.easeOut**.
- The texts return to their ±40 px offsets and fade out.
- The background layer fades out.
- The thumbnail collapses back into the edge it grew from, and its radius returns to 0.

Sampled reversal durations were 259 to 291 ms [S]. At the same time:
- The hero headline returns over 0.6 s, power1.out [G].
- The hero video returns over 0.6 s after a 0.1 s delay (CSS) [C].
- The cursor returns over 0.3 s [G].
- The pill colour returns over 0.2 s [C].

**Entry direction per layout**. Each client has a layout type, and the type sets where each piece starts (its offset when hidden):

| layout | clients | name | description | product type | thumbnail grows from |
|---|---|---|---|---|---|
| 1 | Robinhood, Suno, Atoms, The Atlantic, All Work | right (+40 x) | left (−40 x) | top (−40 y) | bottom edge, 360×495 at (1056, 381) |
| 2 | Midjourney, Uber, Calvin Klein | left | bottom (+40 y) | top | right edge, 576×360 at (749, 117) |
| 3 | Ro, Headspace | right | right | bottom | left edge, 446×450 at (245, 378) |

**Moving between items:**
- **Adjacent move** (Uber → Suno): Uber's 0.3 s reversal and Suno's 0.8 s entry start on the same frame (1 ms apart) [G]. This is a cross-fade with the incoming layer on top (z 10). The hero headline and hero video stay hidden: only a redundant "opacity 0" call is made, so no blank hero shows between clients.
- **Interrupted tweens**: each change calls `killTweensOf` and starts a new tween from the current value. Nothing snaps or restarts from zero [G]/[S].
- **How far each preview gets during a sweep** [S]. Values are the peak thumbnail size (full size is 576, 495 or 446 px) and the peak opacity of the client background between activation and retraction. Each preview then retracts over 0.3 s.

| sweep | dwell per pill | thumbnail peak | background opacity peak |
|---|---|---|---|
| instant (18 pointer steps, 9 pills in ~350 ms) | 20–46 ms | 51–124 px (~10–25%) | 0.14–0.22 |
| ~60 ms steps | 70–93 ms | 144–229 px (~30–45%) | 0.32–0.40 |
| ~200 ms steps | 215–217 ms | 322–414 px (~70–85%) | 0.71–0.77 |

  Every pill crossed fires a full entry/exit pair. A fast sweep reads as a flicker of faint, overlapping client backgrounds with stubs of thumbnails. The hero never returns between pills.
- **"All Work" is the exception**: its activation goes through a 100 ms debounce [B]. Measured 109 ms from pointer-over to tween [G]. Sweeping onto it, the hero headline is briefly told to return (+350 ms) and is then hidden again when All Work activates (+458 ms).

### 5.2 Custom cursor
- At rest it is a 12 px dot: an outline ring and a filled circle, both radius 6 [S].
- On a control (`FOCUS` state) the ring grows to 34 px (radius 17), the dot shrinks to 2 px, and the stroke turns violet (`--bg-highlight`) [G]/[C].
- `HOVER`/`DRAG` states (radius 48, with a text label that slides y 110% → 0 over 0.45 s and out to −110% over 0.225 s, Power3.easeOut) exist in the bundle [B] and log on every state change [G]. They were not triggered on home or in the menu.
- The cursor appears with opacity 0→1 over 0.3 s, Power3.easeOut [G].

### 5.3 Clock
The header clock cycles through city code and time pairs every **≈5.97 s** [S]. Each line rolls up y 0 → −105% over 0.8 s, Power3.easeOut, with code and time staggered 0.07 s [B]. The next pair rolls in from 105% over 0.8 s with a 0.1 s stagger, overlapping the exit [B].

### 5.4 Pill depth drift
After every list fade, each pill tweens `z` to a random 1 to 100 px over 0.75 s, power1.out [G]. No ancestor has `perspective` (checked), so this has no visible effect.

## 6. Scroll
- **Home**: none at 1440; wheel input produced no motion.
- **Case study**: Lenis smooth wheel (duration 1.2 s, exponential out) [B]. Pages are 11–15 k px tall.
- **Header on first scroll**: it condenses from full width (1429 px) to a centred 645 px capsule and drops 12 px, over about 365 ms [S]. The curve is close to quad out (p25/50/75 = 0.42/0.72/0.92). At the same time the icon buttons' backdrop blur goes 14 → 0 px (231 ms) [S].
- **Reveals are triggered, not scrubbed**:
  - Text blocks fade in: opacity 0→1 over 1.0 s with a 0.1 s stagger across ×10 headings and paragraphs, power1.out [G].
  - Image masks (`MaskReveal`) tween CSS variables `--left-y`/`--right-y` to 100% over 0.8 s, Power3.easeInOut, with the inner image scaling to 1 over 0.8 s, Power3.easeInOut, in sync [G].
  - Image load fades are 0.3 s CSS.
  - The "Next case study" ticker fades in over 1.2 s, Power3.easeOut [G].
- **Scrubbed motion**: only on phone (see section 8) and in the bundle's ScrollTrigger scrub tweens [B].

## 7. Type in motion
- No per-letter, per-word or per-line animation was found on home, in the menu or in case-study headings.
- Type moves as whole blocks: the preview name and lines translate 40 px with opacity (0.8 s in / 0.3 s out), and the hero headline fades as a block (0.6 s).
- The only line-level motion is in labels:
  - the Menu/Close label swap, masked y ±105% over 0.6 s, Power4.easeOut [G];
  - the clock roll (0.8 s, Power3.easeOut, 70 to 100 ms staggers) [B];
  - the intro words hopping position (1.0 s, Power3.easeInOut) [G].
- Menu link emphasis is opacity (0.3 ↔ 1) plus an underline wipe, not a type change.

## 8. Phone differences (390×844, touch emulation)
- **Index**: the client list scrolls inside its own container (scroll range 360 px). No pointer hover is involved:
  - The item that comes to rest under an activation line becomes active after a **200 ms debounce** [B].
  - During momentum scrolling, the in-between items mostly do not fire. One swipe activated Uber, then The Atlantic once scrolling settled [G].
  - The preview tweens match desktop: 0.8 s in / 0.3 s out, Power3.easeOut [G].
  - Phone has **no thumbnail** and no background image: the preview's background image is not rendered on mobile [B], and the clip rect stays at 0. In one screenshot the visible change was mainly the active pill turning solid white, with inactive pills at opacity 0.4 [E]. That opacity uses CSS `opacity .2s` [C]. The preview title was not visible in that frame.
- **Hero text**: the phone headline is scrubbed by list scroll (ScrollTrigger `scrub: true`) and faded about 0.99 → 0.19 within about 300 ms of scrolling [S]. The phone description fades in, scrubbed, at the list's end [B]/[S].
- **Menu**:
  - Same panels, durations and eases: open 1.2 s Power4.easeInOut, close 1.2 s Power3.easeInOut [G].
  - The window margin is 15.5 px.
  - The page does **not** shrink (scale stays 1) [G].
  - The media preview goes to 390×515 at y −51 [G].
  - The Menu pill grows to width 82 [G].
  - There is no separate case-study list column [G].
- **Cursor**: the custom-cursor code still runs on emulated taps (it is set at the tap point and its ring grows). Whether it is visible on a real phone was not verified.

## 9. Vocabulary
Counts are captured GSAP calls (tween starts) across all runs. They are weighted by how often each interaction was exercised, so read them as relative use, not as a design inventory.

| easing | durations | used for | count |
|---|---|---|---|
| power1.out (GSAP default, quad out) | 0.2, 0.3, 0.5, 0.6, 0.75, 1.0, 1.2 s | plain opacity fades: hero headline 0.6, pill list 0.3, menu link dimming 0.3, menu preview cross-fade 0.2, sections 0.3, text reveals 1.0 | 1,017, including 300 invisible pill z-drift tweens and many section fades |
| Power3.easeOut (quart out) | 0.225, 0.3, 0.45, 0.8, 0.9, 1.2 s | reveals and retractions: preview in 0.8 / out 0.3, cursor 0.3, menu content rail and cards 1.2, menu link underline 0.6, clock 0.8, tickers 1.2 | 645 |
| Power3.easeInOut (quart in-out) | 0.7, 0.8, 0.96, 1.0, 1.2, 1.8 s | large moves away from the user and secondary layers: menu close 1.2, page scale inside menu 1.2, wipe open 0.7, case-study hero slide 1.2, mask reveals 0.8, intro hops 1.0, intro mask 1.0/1.8 | 97 |
| Power4.easeInOut (quint in-out) | 0.7, 1.2, 1.5 s | the biggest arriving surfaces: menu open 1.2, wipe close 0.7, click expansion 1.5 | 44 |
| Power4.easeOut (quint out) | 0.6 s | Menu/Close label swap and Menu pill width | 24 |
| CSS `ease` | 0.2, 0.3, 0.6 s (+0.1 s delay) | pill border/background, cursor stroke, image load fades, hero video container | most hovers |
| WAAPI `cubic-bezier(0.25, 0.1, 0.35, 1)` | 0.3 s | page wrapper hold during route swaps | 2 |

By scale and direction rather than by property:
- **Colour**: CSS 0.2–0.4 s.
- **Component-scale pieces** (preview texts ±40 px, thumbnail clip-rect size, underlines, labels, Menu pill width, cursor ring radius): one out-curve per interaction. That is quart out 0.8 s (preview), quart out 0.6 s (menu underline), quint out 0.6 s (Menu/Close label and pill width) or quart out 0.3 s (cursor). Position and size share the same curve.
- **Full-screen surfaces** (menu frame panels, wipe panels, click expansion, page scale, case-study hero slide): in-out curves, 0.7–1.5 s.
- **Opacity-only fades**: power1.out, 0.2–0.6 s.
- **Exits**: about 2.7× shorter than entries (0.3 vs 0.8 s; 0.3 vs 0.6 s).

## 10. Sequencing
- **Same frame, same curve, no stagger inside a component.** The preview's background, three text blocks and thumbnail all start on the pointer-enter frame with identical 0.8 s Power3.easeOut. On exit they all take 0.3 s Power3.easeOut [G]. There is no stagger between the name, description and type lines.
- **Different engines and eases run side by side in one interaction.** On hover-in, alongside the 0.8 s quart-out preview:
  - the hero headline fades on a separate 0.6 s quad-out tween;
  - the hero video fades on a 0.6 s CSS `ease` that waits 0.1 s;
  - the pill recolours over 0.2 s CSS;
  - the cursor ring changes over 0.3 s quart out.

  Five distinct timings start together.
- **Arriving is slow, leaving is fast.** The ratios are:
  - preview: 0.8 s in, 0.3 s out (2.7:1);
  - menu link: 0.6 s in, 0.3 s out;
  - menu content: 1.2 s in after 0.5 s, 0.9 s out with no delay;
  - Back navigation: no exit animation at all.
- **Distinct eases for parts of one move.** On menu open, the frame panels use quint in-out while the page shrinking inside them uses quart in-out over the same 1.2 s. Menu and wipe use quint in-out to close in and quart in-out to open out [G].
- **Explicit delays and staggers** appear only in the menu and in labels:
  - the content rail starts at +0.5 s;
  - notification cards run at 0.5 + 0.05·i s;
  - the × icon runs 75 ms after the label;
  - the clock staggers by 70 and 100 ms;
  - case-study text blocks stagger by 0.1 s.
- **Snappy vs subdued**: the split is by surface scale and by direction, not by property type.
  - Colour is the snappiest (0.2 s CSS).
  - Component-scale shape and position changes share one out-curve (0.6–0.8 s in, 0.3 s out).
  - Full-screen surfaces are the slowest and softest (0.7–1.5 s, in-out).
- **Checks against the owner's Osklen reading:**
  1. *Snappy size and shape, subdued position*: **No.** Size and shape are never snappier than position. The thumbnail clip grows on the same 0.8 s quart-out curve as the ±40 px text moves, and the Menu pill width runs on the same 0.6 s quint-out curve as its labels. The fastest shape change is the cursor ring (0.3 s), which also times the dot. The full-screen shape changes (1.5 s expansion, 1.2 s frame) are the slowest motions on the site.
  2. *Distinct easings and timings for concurrent animations*: **Yes across engines and components, no within a component.** On hover, five timings start together: preview 0.8 s quart out, headline 0.6 s quad out, hero video 0.6 s CSS ease after 0.1 s, pill 0.2 s CSS, cursor 0.3 s quart out. In the menu, the panels use quint in-out while the page uses quart in-out. Inside the preview itself, all five pieces share one duration and ease with no offsets.
  3. *One header interaction animating every header element, each granular*: **Partly.** Menu open/close drives the Menu pill (width 0.6 s quint out), its two labels (0.6 s quint out), the × icon (+75 ms), the theme toggle (0.5 s quad out), the clock group (x 30 px, 0.5 s quad out) and the wordmark/clock colour (0.4 s CSS). That makes four distinct timing groups. Header hovers change only the hovered control plus the cursor. Page changes fade the header as a whole (wipe path: 0.3 s quart in-out, back in after a 0.84 s delay).

## 11. Gaps
- **Not caught by the GSAP wrapper**: tweens built inside GSAP timelines (the intro mask, clock and preloader hops). For those, the bundle values [B] are paired with frame samples [S].
- **Theme toggle**: not exercised. It is hidden (opacity 0) on home outside the menu, so the scripted click hit nothing. The light/dark flip timings are only the CSS `color 0.4s` / `stroke 0.4s` noted on 2026-11-14.
- **`HOVER`/`DRAG` cursor states and the draggable review grid**: in the bundle only; no page visited used them.
- **Phone scrolling**: emulated with CDP touch gestures. Momentum distances (one 120 px gesture scrolled 238 px) are Chromium's, not iOS's.
- **Phone cursor**: whether the custom cursor is visible on a real phone was not checked.
- **Wipe panel colour**: assumed to follow the theme (`data-themed` background); it was white in this capture.
- **Shared analyzer bug**: the coordinator's fixed `MC/analyze.mjs` still mis-fits every `translate3d(...)` → `translate(...)` run. Its number regex reads the "3" in `translate3d` as a value, which produces "power2.in, p@=0.00" on the preview containers, menu lines and cursor labels. Transform fits in this record come from `MC/sites/metalab-an.mjs`, which strips function names first.

Evidence files are in `MC/out/metalab/`:
- events: `metalab-{hover2,page,menu,load,phone,phone2}.events.json`
- summaries: `*.summary.txt` from `metalab-an.mjs` and `*.analyze.txt` from the shared analyzer
- video: `*.webm`
- contact sheets: `frames-click/`, `frames-logo/`, `frames-load/`, `frames-back/`
- screenshots: `adjacent-uber-suno-400ms.png`, `hover-robinhood.png`, `menu-open.png`, `phone-*.png`
- layouts: `preview-layouts.json`
