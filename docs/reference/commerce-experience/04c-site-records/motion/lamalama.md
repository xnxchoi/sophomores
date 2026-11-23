# lamalama: motion, captured 2026-11-15 (1440×900, 390×844)

URL `https://lamalama.com/` (EN). Foreground headless Chromium (playwright-core 1.63). No cookie banner appeared. Runs: `out/lamalama/desk.*` (1440, video; re-run with the GPU-flag recorder; the first SwiftShader run is kept as `desk-sw.*`), `wipe.*` (1440, timed full-resolution screenshots of one page change), `phone.*` (390×844, `mobile: true`, touch taps, video).

**Provenance labels used below**
- **[D] declared:** exact. The site's bundled GSAP 3.15.0 is not on `window`. I caught the instance through an `Object.prototype.gsap` setter at install time, then logged every tween's vars, duration, ease, stagger and absolute scheduled start (`globalTime`).
- **[S] sampled:** per animation frame, ±1 frame. Covers text content, scroll position and plain-object tween values such as the transition progress.
- **[B] bundle:** read from the site's JS (`dist/assets/app-B1J_BPa2.js`), including the shader source.
- **[E] estimated:** from video frames or screenshots.

Table offsets are scheduled start times and already include any declared delay, so there is no separate delay column.

**Frame rate:**
- In the GPU-flag desktop run and the phone run, the median gap between inline-style samples is 17 ms for every mark, except the work-row hover (25 ms) and history back (32 ms).
- One headless render stall remains: about 175 ms at +115 to +290 ms of menu open, when the 16 px backdrop blur turns on. Measured start offsets in that window are quantised.
- The first desktop run (SwiftShader, 22–43 fps) is used only for the page-change samples, which ran at 17 ms gaps.
- Durations and easings below are the declared values. Inline-style fits are used only as corroboration.

## 0. Motion in one paragraph
Fast, crisp, heavily sequenced, and built on two curves. Almost every transform, mask and size change is `expo.out`, and almost every fade is `power4.out`, so things land within the first third of their duration and then glide. Opening and growing movements are short:
- size changes, such as the menu unfolding and the dropdown: 350–450 ms;
- masked line reveals: 650–850 ms;
- media fades: 1 s `power2.out`, so they are the softest.

Each interaction splits into many concurrent per-element tweens, each with its own property, duration and easing, offset in 50 ms steps. Closing is not the open reversed: there is no stagger, and the closing ease is `power4.inOut`. Type moves per line (masked slide-up); only the 10 px mono labels go letter by letter, as a two-pass character scramble. The page change is a WebGL ordered-dither wipe: 16 px cells, each filling 4×4 dots in a fixed order, timed by a static noise field rather than a stagger list. Smooth scroll (Lenis, lerp 0.1) runs on desktop; touch devices scroll natively.

## 1. Stack
- **GSAP 3.15.0** (bundled; `window.gsapVersions` = ["3.15.0"]) with SplitText (lines and words), ScrollTrigger and ScrollToPlugin. Detected live via the install hook, and in the bundle [B].
- **Lenis** (`div.ll-scroller.js-scroller.lenis`, wrapper mode). Source options: `lerp` default 0.1, `easing` expo.out for programmatic `scrollTo` [B]. On touch the site uses native scrolling (`setupNativeScroll`) [B], and the phone runs confirmed it [S].
- **swup 4.** Plugins: JS, Preload (hover preloading), Morph, Scroll, Head and others. Containers: `#page`. `animateHistoryBrowsing: false` [B].
- **WebGL2** canvases: `js-canvas` for images and video, `js-upper-canvas` (z 8) for the page transition and loader logo. The wipe shader is custom GLSL [B].
- Own rAF ticker driving `gsap.updateRoot` [B]. GSAP default ease and duration (`power1.out`, 0.5 s) are not overridden [B].

## 2. Load and intro
Offsets are from the `goto` mark. The document committed at +1000 ms. The black loader (centred `100%` counter) held until **+7652 ms**; this hold depends on network and assets ([E], headless). Rows from L = +7652 onward are scripted [D]. The phone run is the same sequence with L = +8120 ms; bar at L+4375 ms.

| +offset ms | element | property | duration | easing | |
|---|---|---|---|---|---|
| 7219 | hero backdrop video | opacity 0→1 | 1000 | power2.out | D |
| L+0 (7652) | loader counter "100" | yPercent 0→−100, clip-path to `inset(100% 0 0 0)` (exits upward) | 450 | power4.in | D |
| L+0 | loader overlay | opacity 1→0 | 650 | power4.out | D |
| L+0 | WebGL pixel-logo intro (upper canvas) | showLogo 0→1 | 350 | none | D |
| L+0 | same | logoProgress 0→1 | 2750 | power3.in | D |
| L+0 | same | LOGO_START_GRID_SIZE →16 | 3750 | power3.in | D |
| L+0 | same | colorProgress 0→1 | 4250 | power4.inOut | D |
| L+364 | bar pixel icon (12×12 canvas tiles) | alpha per tile; 144 tiles, stagger amount 250 ms `from: random` | 25 each (275 total) | power1.out | D |
| L+364 | mono labels on page (about 30) | character scramble (see §7) | 0.25 s + 5 ms/char | power2.out | D |
| L+500 | WebGL intro | fullProgress 0→1 | 3250 | power4.in | D |
| L+564 | right card stack items | opacity 0→1 | 650 | power3.out | D |
| L+2350 | WebGL intro | hideProgress 0→1 | 1450 | power4.in | D |
| L+3714 | halftone background grid | scale →1 | 3150 | power4.out | D |
| L+4314 | halftone background | nogrid_progress 0→1 | 1950 | power3.in | D |
| L+4380 | hero h1, 3 lines | scale .96→1, yPercent 80→0, opacity 0→1, clip-path bottom 110 %→−10 %; line offsets 0 / 112 / 225 ms | 850 each | expo.out | D |
| L+4380 | hero paragraph, 5 lines | same; offsets 0 / 71 / 142 / 213 / 285 ms | 850 | expo.out | D |
| L+4514 | hero foot hairline | scaleX 0→1 (origin left) | 750 | expo.out | D |
| L+4564 | command bar `js-menu` | opacity 0→1 | 950 | power4.out | D |
| L+4564 | contact card stack | opacity 0→1 | 950 | power4.out | D |
| L+5264 | hero foot labels | pointer-events on | 0 | — | D |

What it looks like [E, `contact-load.png`]:
1. A black screen with a tiny centred counter.
2. The pixel "LL" logo appears at the centre.
3. Its pixel grid scales out into a full-screen grey dot field.
4. The dot field resolves into the organic halftone blobs over the hero.
5. Then the bar, the cards and the hero type arrive.

Line-offset formula [B]: `i·(0.135 + 0.03·n)/(n−1) + 0.15 s`. It matches the measured offsets for n = 3 and n = 5 exactly.

## 3. Page change
The page change is an SPA (swup). The content of `#page` is swapped. What persists:
- the command bar;
- the contact card;
- both canvases;
- the scroller element.

The browser Back button triggers **no** wipe: `animateHistoryBrowsing: false` [B], and no transition tween fired on back [D]. Sequence, from the click on "View case" (desktop, link preloaded by hover):

| +offset ms | element | property | duration | easing | |
|---|---|---|---|---|---|
| +34 | clicked button | backdrop opacity→0 and scale .98 / hover backdrop →1 / arrow scale swap | 250 / 350 / 450 | power4.out | D |
| +34 | right card stack | opacity→0 | 600 | power4.out | D |
| +34 | **wipe in**: `inProgress` 0→1 | (sampled: .50 at +229, .90 at +479, 1 at +662) | 650 | sine.out | D, S |
| +934 | percentage counter overlay (`js-page-transition-counter-container`) | opacity 0→1. Scheduled at 0.9 s, i.e. DURATION_IN + 0.25 s [B]. Counts 0→100 over about 130 ms here (+982 → +1112) | 250 | power4.out | D, S |
| +945 | bar remark "CASES WITH TEETH" | scrambles out: real letters → symbols right→left by about +1015, then symbols deleted; empty at +1330 | 0.15 s + 5 ms/char per pass | power3.out | D, S |
| +957 | menu text and lines (closing, even if already shut) | yPercent→80, clip; lines scaleX→0 | 650 | power4.inOut | D |
| +1124 | old `main` / new `main` | opacity 1→0 / 0→1 (instant set, hidden under the wipe) | 0 | — | D |
| +1324 | **wipe out**: `outProgress` 0→1 | starts 200 ms after the swap [B, D] | 650 | power4.out | D |
| +1324 | counter overlay | opacity→0 | 325 | power4.out | D |
| +1328… | new-page mono labels | scramble in | 0.25 s + 5 ms/char | power2.out | D |
| +1478 | new-page title lines ("Moov") | line reveal, as in §2 | 850 | expo.out | D |
| +1932 | case hero WebGL video | revealProgress →1.1; opacity →1 | 1250 / 1000 | power2.out | D |

**Total time.**
- Click to wipe gone: **1.85–1.97 s** desktop (two runs, link preloaded by hover; content swapped at +999 / +1124), **≈3.04 s** on the phone tap (no hover preload; content swapped at +2194).
- Structure [B, D]: 650 ms in, then a load-gated hold, then the swap, then 200 ms, then 650 ms out. The minimum is about 1.5 s plus load.
- The wipe-shot run (+3662 swap) is discarded: blocking screenshots slowed it.

**The wipe itself**

*Cells* [B; E confirmed at 1:1, DPR 1]:
- The grid is 16 CSS px. At 1440×900 that is 90 × 56.25 cells. Cells are anchored to the bottom-left of the viewport, so on screen the cell rows start at y ≡ 4 (mod 16) and x ≡ 0 (mod 16).
- Each cell is a 4 × 4 matrix of 4 px square dots: a fixed 16-step ordered dither.
- The colour is the opposite theme's background. Over the dark home page it is cream `#f9f4eb`-ish on dark.

*Order inside a cell* [B for the full list; 7 of the 16 positions confirmed by the 1:1 screenshots `wipe-shots/00–04`, E]:
- Positions are (column, row), 0-based from the top left of the on-screen cell.
- The shader's block list, mapped to the screen (x offset +1, uv bottom-up), lights dots in this order:
  1. **(1,3)**
  2. **(3,3)**
  3. **(3,0)**
  4. **(0,2)**
  5. (0,1)
  6. (1,0)
  7. (1,2)
  8. (3,2)
  9. (2,1)
  10. (0,0)
  11. (2,3)
  12. (3,1)
  13. (1,1)
  14. **(0,3)**
  15. **(2,2)**
  16. **(2,0)**
- Bold positions are confirmed by the 1:1 screenshots: in an early frame, 94 %, 78 %, 60 % and 32 % of cells had the first four lit. Near full, (0,3), (2,2) and (2,0) were the last positions still dark.
- Late in the in-phase (about +344 to +585 ms) and in the first ~26–86 ms of the out-phase, most cells sit at 15/16 with only (2,0) dark. That one-dot-per-cell lattice is the "checkerboard" in the earlier record's screenshot, which caught a mid-transition frame.
- **The hold itself is full cover.** Screenshots at +585 to +950 ms are 98.3 % cream, and video frames 020–037 are at constant full luminance [E].

*Order across cells: no time stagger* [B]:
- Each cell's level is `1 − smoothstep(0, 1, (1−p)·(1+n))` minus the same function of the out-progress.
- `n = 0.5·valueNoise(uv·8)²` lies in [0, 0.5]. It is a static field: `u_time` is never set, so the noise never rotates.
- The result is soft blobs, about ⅛ of the viewport across. Cells with low `n` fill first and also empty first: first in, first out.
- Evidence [E]: the luminance maps of a mid-in and a mid-out frame are anti-correlated (r = −0.42).

*Derived timing* [B formula plus the D/S progress curves]:
- **In phase.** The earliest cells (n = 0) get their first dot at +63 ms after the wipe starts; the latest (n = 0.5) at +186 ms. Half density: +217 to +302 ms. 15/16 density: +419 to +462 ms. By the shader formula the last dot needs p = 1 (+650 ms). Measured full cover arrived earlier: 91 % of cells were at 16/16 in the screenshot taken +536 to +585 ms, and the video reached full luminance at about +590 ms [E]. The difference (8-bit texture or the layer's self-feedback) is unresolved.
- **Out phase.** Cells drop below 15/16 at +26 to +86 ms after out starts. Half: +103 to +156 ms. Last dot gone: +244 to +283 ms. The rest of the 650 ms `power4.out` is invisible tail.

*Cross-check* [E, video luminance normalised between the pre-wipe, full and post-wipe frames; video clock ≈ −80 ms]:
- In phase: 50 % coverage at about +270 ms, about 93 % at +470 ms, 100 % at about +590 ms.
- Out phase: 50 % at about +60 ms, gone at about +260 ms.

## 4. Navigation and menu
Bar: 438 × 50 at 1440, 358 × 50 at 390. Hover on the bar logo, the hamburger and the "This is us" toggle produced **no tween and no CSS transition** [D, S].

**Menu open** (click hamburger). The bar itself does not move or resize. The items container *inside* the same glass shell grows below it (0 → 386 px, so the panel is 438 × 436 in total) [D]:

| +offset (from first tween) | element | property | duration | easing | |
|---|---|---|---|---|---|
| 0 | menu items container | height 0→auto (386 px) | 450 | expo.out | D |
| 0 | full-screen blur layer (`rgba(0,0,0,.4)`, blur 16 px) | opacity 0→1 | 350 | power4.out | D |
| 0 | hamburger top bar / bottom bar | y +0.3125 rem / −0.3125 rem (merge into one bar) | 450 | expo.out | D |
| 0 | phone-only showreel toggle (bottom centre) | opacity 0→1; label "This is us" scrambles in | 350 | expo.out | D, S |
| 0, 50, 100, 150, 200 | nav items Work, What we do, About us, Careers, Contact (`tl.add` at i·50 ms [B]; measured starts: +16, +49, then +233 for the last three after the render stall (GPU run); +35, +122, +122, +212 ms in the SwiftShader run) | text: yPercent 80→0 + clip-path bottom 100 %→0 | 750 | expo.out | D |
| same | each item's hairline | scaleX 0→1, opacity →0.1 | 650 | expo.out | D |

- Derived cross-check (declared ease, not sampled): `expo.out` over 450 ms is 91.5 % open at 160 ms. That matches the earlier note "90 % open at 160 ms".
- The last item starts at 200 ms and settles at about 950 ms. The container settles at 450 ms.
- **Absent on open** [D]: no tween on the three CTA buttons (pitch deck, Schedule a call, Start a project), which are revealed only by the height mask. No tween on the bar remark or the bar logo.

**Menu close** [D]:
- Container height →0, 450 ms expo.out.
- Blur →0, 350 ms power4.out.
- Hamburger bars y →0, 450 ms expo.out.
- All item texts at once (no stagger): yPercent →80 and clip-path to `inset(0 0 100% 0)`, **650 ms power4.inOut**.
- Hairlines scaleX →0, 650 ms power4.inOut.
- So the masks keep moving for about 200 ms after the container has shut.

**Item hover in the open menu** [D]:
- Row backdrop opacity 0→1, 650 ms power4.out. The previous row fades out simultaneously.
- A 10 × 10 pixel icon left of the label: 13 pixel paths fade in, 150 ms power4.out each, stagger amount 75 ms `from: random`.
- From about +230 ms, the icon runs a 4-frame sprite loop at 100 ms per frame (icon → mid → alt → mid-second → icon).

**"What we do" dropdown** [D]:
- Open:
  - children container height 0→auto (160 px), 450 ms expo.out;
  - plus/minus blocks y ±0.25 rem, 450 ms expo.out;
  - 4 children at 50 ms steps, each with text yPercent and clip, 650 ms expo.out, and hairline scaleX, 650 ms expo.out;
  - a 2 px dot opacity, 550 ms expo.out, starting 100 ms after its row.
- Close: height →0, 450 ms expo.out; texts and lines 650 ms power4.inOut and dots 450 ms power4.out, all at once.

Phone (390): identical tweens and values [D]; frame rate there was 60 fps, giving measured item steps of 50 / 32 / 68 / 33 ms.

## 5. Hover and micro-interactions
- **Contact card ("Get in touch")** [D]: backdrop 0→1, 250 ms power4.out. The label swaps through two mono scrambles: the original text hides (power3.out) while the hover copy shows (power2.out, 110 ms for 12 characters). Leave reverses with the same 250 ms power4.out.
- **Work rows** (full-width `button` rows, 168 px tall) [D]:
  - On hover the bracketed "( VIEW + )" label opens: the gap inside the brackets goes 0→6 px, 450 ms power4.out, and "VIEW" scrambles in (4 characters, 70 ms power2.out).
  - The previously hovered row closes at the same instant (gap 6→0, 450 ms power4.out; text hides, 170 ms power3.out).
- **Row click (expand)** [D]:
  - Content height →28.5 rem and description height →auto, both 1050 ms power4.out.
  - Thumbnails scale →1, 950 ms expo.out, 100 ms apart (9 images).
  - Description lines do the line reveal (850 ms expo.out, 85 ms apart).
  - "View case" button opacity, 750 ms power4.out.
- **Buttons** ("View case") on press [D]: backdrop →0 with scale .98 (250 ms), hover backdrop →1 (350 ms), arrow icon scale swap (450 ms), all power4.out.
- **Cursor label** (`js-cursor-label`, 16 × 22): follows the pointer via a `+=` quickTo, 450 ms expo.out [D]. Its label text never appeared in these runs (see §11).
- **WebGL images** track the pointer: cursorX and cursorY, 550 ms power4.out, retargeted continuously [D].

## 6. Scroll
- **Desktop.** Lenis, wrapper mode. After the last wheel step the remaining distance shrinks by ×0.88–0.90 per 16–18 ms frame [S], consistent with lerp 0.1 at 60 fps. Settles about 1 s after the last input (1400 px target, last sub-pixel step at +2436 ms) [S].
- **Phone.** Native: each 100 px wheel step lands at once, with no easing tail [S].
- **Reveals** are triggered, not scrubbed. ScrollTrigger `start: "top bottom"` fires the line reveals (850 ms expo.out) and the mono scrambles [B, D].
- **Media** fade in on entry: images 750 ms GSAP default (power1.out), videos 1000 ms power2.out [D].
- **Section-change events** (all triggered) [D, S]:
  - Bar remark: the old remark scrambles out right→left, then a new one types in. Observed remarks: "LET'S DO DAMAGE" (hero), "BIG PROJECT ENERGY", "CASES WITH TEETH", "OUR GREATEST HITS".
  - Bar pixel icon morphs (144 tiles, 250 ms random stagger, 25 ms each, power1.out).
  - Leaving the hero: the foot hairline goes scaleX→0, 550 ms expo.out, and its labels scramble out (power3.out, 140–240 ms). Returning: hairline scaleX 0→1, 750 ms expo.out, labels scramble in.
  - Work section: a sticky "( + ) Work" button enters at the bottom centre (opacity, yPercent 80→0, clip, scale .98→1; 550 ms expo.out). It leaves with the reverse values (yPercent 80, scale .98), also 550 ms expo.out.
  - Right card stack: the active card collapses (header height →3.125 rem, body height →0 with opacity, 350 ms expo.out) and the next opens.
- **Parallax.** WebGL images carry `parallaxProgress −1→1` tweens (ease none, 500 ms). Their values did not change during my scroll range, so scrub-versus-trigger is undetermined (§11). The client logo marquee drifts linearly (translateX) [S].
- No pinned sections were observed. The header does not change on scroll, apart from the remark and icon.

## 7. Type in motion
**Display and body type moves per line, not per letter.** Only the mono labels go letter by letter.

- **Lines** [B, D]:
  - SplitText (`type: lines, words`, but only lines animate).
  - Each line goes from scale .96 / yPercent 80 / opacity 0 / clip-path `inset(-10% -10% 110% -10%)` to its rest state, 850 ms expo.out.
  - Line step: `(0.135 + 0.03·n)/(n−1)` s. For 3 lines that is 112.5 ms; for 5 lines, 71 ms.
  - Exit (hide): all lines at once to yPercent −80 / scale .96 / clip from the top, 650 ms expo.out.
- **Menu labels**: a single-line mask (yPercent 80→0 plus clip), 750 ms expo.out in and 650 ms power4.inOut out (§4).
- **Mono labels** (the 10 px Sometype bracketed tags, bar remark, button labels) [B, D, S]. The scramble runs in two passes:
  - Pass 1: a counter (power2.out) prints random symbols left→right. The symbol set is `# # # # # $ * @ ( 0 % 1 >`; a space shows as `_`, and brackets are kept.
  - Pass 2, starting 200 ms later: a second counter, same duration and ease, replaces them left→right with the real letters.
  - Duration has three bases, each plus 5 ms per character:
    - 0.25 s for page labels;
    - 0.15 s for the bar remark and small toggles;
    - 0.05 s for hover label swaps ("VIEW": 70 ms for 4 characters; contact card: 110 ms for 12).
  - Hide: real letters revert to symbols right→left (power3.out, 0.15 s + 5 ms per character), then the symbols are deleted right→left starting 100 ms later.
  - Measured example, bar remark "LET'S DO DAMAGE" (15 characters, declared 225 ms per pass) [S]:

    | +ms | text |
    |---|---|
    | 0 | (empty) |
    | 3 | `>##@` |
    | 18 | `>##@@_` |
    | 97 | `>##@@_$>_#$>##` (14 symbols) |
    | 194 | `LET'@_$>_#$>##` |
    | 230 | `LET'S DO_#$>##$` |
    | 264 | `LET'S DO DAM##$` |
    | 414 | `LET'S DO DAMAGE` |

    Total is about 414 ms, against the declared 200 + 225 = 425 ms.
  - Out example, "CASES WITH TEETH" on page change: from +945 ms it reverted right→left over about 70 ms; the symbols were then deleted, finishing at +1330 [S].
- **Numbers**: the page-transition counter steps integers 0→100 (§3). The hero clock ticks once per second.

## 8. Phone differences
- Same GSAP values for the menu, dropdown, wipe, intro and line reveals [D]. The bar is 358 wide, with the hamburger at (346, 41).
- **Native scroll**, with no Lenis easing [S].
- No hover set: nav, row and card hovers are bound only when `!hasTouch` [B].
- A showreel toggle (bottom centre, "This is us") fades in with the menu: 350 ms expo.out, with a scramble label [D].
- Page change from a menu tap: the menu closes simultaneously with the wipe-in (container height →0, 450 ms expo.out; texts 650 ms power4.inOut) [D].
- During the phone wipe, a 7-tag case filter bar (bottom) was tweened to yPercent 100 and scale .96 (500 ms, GSAP default ease) before the swap [D]. Its entrance afterwards was not isolated.
- The right card stack is hidden: it has tweens but a zero-size box.

## 9. Vocabulary
Counts are GSAP tweens logged over the desktop and phone runs [D], excluding 0 ms sets.

| easing | durations (count) | used for |
|---|---|---|
| expo.out | 350 (15), 450 (50), 550 (23), 650 (62), 750 (19), 850 (101), 950 (20) | sizes: menu and dropdown height, card collapse (350–450); all transform and clip masks: hamburger, item and line reveals (450–850); thumbnail scale (950) |
| power4.out | 150 (10), 250 (5), 325–350 (9), 450 (100), 550 (32), 600–650 (22), 750 (8), 950 (4), 1050 (2), 3150 (4) | opacity of backdrops, blur and overlays (150–650); bracket-gap widths (450); pointer follow (550); page-transition out (650); bar fade-in (950); row expand height (1050) |
| power4.inOut | 650 (76); 4250 (2, intro colour) | every *closing* mask: menu, dropdown and nav texts and hairlines |
| power2.out | 70–445 (about 1500 scramble counters); 1000 (32) | mono-label scramble in; video fades |
| power3.out | 140–245 (about 250 counters); 650 (9) | mono-label scramble out; card-stack opacity |
| sine.out | 650 (2) | page-transition in |
| power3.in / power4.in | 450 (counter exit), 1450–3750 (intro) | loader exit and the WebGL logo intro only |
| power1.out | 25 per tile (4 morphs); GSAP default 750 for image fades (39) | bar pixel-icon morph; image fade-in |
| none | 350–500 | WebGL progress uniforms (intro, parallax) |

Steps: 50 ms (menu and dropdown items), 100 ms (sprite frames, thumbnails), 200 ms (between scramble passes, between the content swap and the wipe out), and random stagger amounts of 75 ms (nav icon pixels) and 250 ms (bar icon tiles).

## 10. Sequencing
Compared against the Osklen reading. These are observations only.
- **Snappy in size and shape:**
  - The menu container and dropdown heights are 450 ms expo.out (91 % at 160 ms).
  - Card collapse is 350 ms expo.out.
  - Bracket gaps are 450 ms power4.out.
  - The hamburger merge is 450 ms expo.out.
- **Position and mask reveals are longer:**
  - Item text 750 ms and lines 850 ms, both expo.out.
  - Hairlines 650 ms.
  - The softest motion is media opacity: 1 s power2.out.
  - Under `expo.out` even the long reveals read fast, because the long tail is what makes them feel subdued.
- **Concurrent elements each get distinct timing.** One hamburger click starts six tween families at once:
  - container height, 450 ms expo.out;
  - blur opacity, 350 ms power4.out;
  - hamburger bars, 450 ms expo.out;
  - showreel toggle, 350 ms expo.out;
  - per-item text, 750 ms expo.out, at 50 ms steps;
  - per-item hairline, 650 ms expo.out.
  - Hover and dropdown add more: pixel-icon fades at 150 ms with random 75 ms spread, then a 100 ms sprite; dots at +100 ms, 550 ms.
- **Open and close are asymmetric.** Open uses staggered `expo.out`. Close uses unstaggered `power4.inOut` on the masks with `expo.out` on the container, so the masks finish about 200 ms after the container.
- **Page change is a single choreography:**
  - wipe in (650 ms sine.out, softer start);
  - counter at 0.9 s;
  - instant content swap under cover;
  - a 200 ms beat;
  - wipe out (650 ms power4.out, abrupt clear);
  - new-page line reveals starting about 150 ms into the wipe out.
  - Within the wipe, timing varies across space (noise field), not through an index stagger.
- **Text** pairs a motion envelope with a content change: line masks for statements, symbol-then-letter scramble for labels. The two passes overlap: pass 2 starts 200 ms after pass 1.

## 11. Gaps
- **Frame rate.** Headless frame rate was 22–43 fps for most marks, so callback offsets are quantised and inline-style fits are unreliable. Declared GSAP values are used instead.
- **DPR 2 not captured.** The cell size (16 CSS px at DPR 1) was verified only at DPR 1. Source: `GRID_SIZE·devicePixelRatio`, with DPR forced to 1 on some devices [B].
- **Loader length** up to +7.65 s depends on network and assets in headless. Only the sequence after the loader is scripted.
- **Wipe colour** was seen only from a dark page (cream dots). From a light page the source picks the dark theme colour [B]; not observed.
- **Phone wipe frames.** The video segment I extracted started after the wipe-in, so the phone noise pattern could not be compared with desktop. The source says it is static (`u_time` unset).
- **Parallax scrub.** Parallax progress values did not move in my scroll range, so scrub versus trigger is undetermined. The WebGL image and video shaders sit in a lazy chunk I did not read.
- **Cursor label** on `data-label` text never triggered, and hover on the hero statements was not tested.
- **Pitch-deck viewer, form, Cal embed** were not opened. Forms are out of bounds by rule.
- **One run's screenshots** blocked rendering; its swap time (+3662 ms) is excluded.

Evidence files (all under `MC/out/lamalama/`):
- `desk.events.json`, `desk.summary.txt`, `desk.gsap.txt`, `desk.webm`;
- `phone.*`;
- `wipe.events.json`, `wipe-shots/00–29.png` with `times.json`;
- `desk-sw.*` (first desktop run; the `frames-pagechange/`, `contact-pagechange.png`, `contact-load.png` and `frames-load/` frames come from `desk-sw.webm`), `crop-cells.png`;
- `src/` (bundle excerpts read as text), `menu-pretty.txt`.

Scripts are in `MC/sites/`: `lamalama.mjs`, `lamalama-phone.mjs`, `lamalama-wipe.mjs`, `lamalama-hook.mjs` and the analyser `lamalama-gx.mjs`.
