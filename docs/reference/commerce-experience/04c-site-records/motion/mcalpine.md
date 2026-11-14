# mcalpine: motion, captured 2026-11-15 (1440×900, 390×844)

Sources: four recorder runs (`out/mcalpine/mcalpine-desktop`, `-hover`, `-pc2`, `-phone`: events, summaries, `.webm`), the site's `main.css` and `app.js` (downloaded to `out/mcalpine/dl/`), and frame contact sheets (`pc-project-contact.png`, `pc-menu-contact.png`, `seamless-contact.png`, `header-hover-contact.png`, `hover-row5.png`, `phone-menu-500ms.png`).

**Measured** means a declared CSS transition or animation read from `getAnimations()`, so duration, delay, easing and keyframes are exact. The same label covers an inline-style run sampled per frame: ±1 frame, with the easing as a best fit. **Source** means the value was read from the shipped CSS or JS and agrees with the measurement. **Estimated** means it was read from video frames, at 5–20 fps.

**Pseudo-elements.** The recorder logs `::before`/`::after` transitions under their host element:
- the two transforms on `li.c-projects-list_item` are its top and bottom hairlines;
- the transform and clip-path on `ul.c-menu_primary` are its 1 px indicator line;
- the three transforms on `.c-burger_icon` are the icon and its two bars;
- the burger's border, clip-path and opacity transitions are its `::before` and `::after` rings.

**Reverse durations.** Durations such as 281, 111 and 553 ms appear on reversed hovers. Chromium shortens a CSS transition that reverses mid-flight; these values were not authored.

## 0. Motion in one paragraph
Everything is CSS transitions toggled by classes, on two curves. Geometry (slides, scales, rises, line draws) is long, 500–1,200 ms, on strong ease-outs: easeOutQuart `cubic-bezier(.165,.84,.44,1)` and easeOutQuint `cubic-bezier(.23,1,.32,1)`. Each therefore covers about 90% of its travel in the first 40% of its time, then spends the rest settling (computed from the curves). Opacity and colour are short and plain, 150–300 ms on `ease` or `linear`.

The result reads quick at the start and soft at the tail. It is never springy and nothing overshoots.

- **Sequencing:** concurrent elements start in the same frame. They are separated by property-specific durations and by small uniform staggers of 40/50/10 ms, not by choreographed offsets.
- **Exits are curt:** menu items do not animate out and the page leaves with a 250 ms fade.
- **Page change:** a fixed 1 s white hold, then a per-letter title rise.

## 1. Stack
- **swup 4** (from `app.js`): `containers: ["[data-load-container]"]`, `animationSelector: '[class*="u-anim-page"]'`, `animateHistoryBrowsing: true`. It uses the Fragment plugin for press/team modals and the JS-animations plugin with two transitions:
  - `defaultTransition`: `out` and `in` are each `gsap.delayedCall(1, done)`;
  - `seemlessTransition`: for next-project; it scrolls to the bottom for 1 s with the scroll locked, then `delayedCall(1.1)`.
  - Detected through classes on html: `is-changing`, `is-animating`, `is-leaving`, `is-rendering`, `is-popstate` and `to-seemless`.
- **GSAP** is bundled under the alias `se`, sets `window.gsapVersions` and is not on `window.gsap`, so the recorder's GSAP hook saw nothing. Uses found in `app.js`:
  - 3× `delayedCall`, all for swup timing;
  - 1× `se.to`: the project-hero `--anim-progress` tween, 1 s, `power3.out`, delay 0.5 s, with scroll stopped until it completes. Its guard query `(min-width: ${FROM_SM})` has no unit (the breakpoints are bare numbers), so the query is invalid and never matches. The tween therefore runs at every width, which is why it ran at 1440 (source);
  - no `from`, `fromTo`, `set` or `timeline`.
- **Lenis 1.0.45** (`window.lenisVersion`; html carries `lenis lenis-smooth`; `lenis-scrolling` during scroll). It runs inside Locomotive's scroll wrapper (Locomotive Boilerplate with modularjs; the cookie plugin is `locomotive-cookie-consent`).
  - The site passes only `smoothWheel` (gated by a media query).
  - Everything else comes from the Locomotive Scroll wrapper's default `lenisOptions`, which sit just before its class in `app.js`: `lerp: .1`, `duration: .75`, exponential-out easing, `wheelMultiplier: 1`. These are defaults, not site-authored values.
- **No** three.js, canvas, Motion or Barba, and no custom cursor (`body` cursor `auto`; no `[class*=cursor]` element).
- **Inline per-frame styles** are only scroll-linked custom properties and transforms, plus the one GSAP tween:
  - `--progress`, `--scroll-progress`, `--anim-progress`;
  - showreel `clip-path`;
  - parallax `translate3d`.

## 2. Load and intro
Network time varies (7.3 s desktop and 9.0 s phone in headless before `is-loaded`), so offsets are given from `html.is-loaded`. Until then a full-screen `.c-loader` shows a spinner.

| +ms from is-loaded | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| before | `.c-loader_spinner` | rotate | 300 loop | 0 | linear | measured |
| before | sound-toggle bars ×3 | `soundTogglerLines` | 1,200 loop | 0 / 200 / 400 | linear | measured |
| on load of each | every lazy `img` | opacity 0→1 | 250 | 0 | linear | measured |
| 0 | `.c-loader` overlay | opacity 1→0 | 300 | 0 | ease | measured |
| +300 | html `is-ready` | class | – | – | – | measured |
| +300 | hero wordmark, 8 SVG letter paths | opacity 0→1, translateY 40%→0 (about 80 px at 1440) | 1,000 | 100–300, see §7 | easeOutQuart | measured |
| ≈ +1,600 | quiet | | | | | computed |

The hero video simply plays; no transition was recorded on it. The 25-word index has no load animation.

## 3. Page change
**Type and total.** It is an SPA: swup replaces `[data-load-container]`. The header (monogram, burger) is fixed outside the container and persists. The page goes blank for most of the first second, then the new title rises. The scroll position resets to 0, measured on forward and on back navigation.

**Totals (click to settled), measured:**
- content swap at about +1,000–1,070 ms;
- swup visit end, when `is-changing` is removed, at +2,083 ms;
- motion quiet at about +2,430 ms (Philosophy, the last title character) or about +2,550 ms (project page, the hero tween).

**Hold versus fetch.** The 1 s is a floor: the leave ends at the later of the 1 s hold and the fetch. In these runs the hold, not the fetch, set the leave:
- **Hold:** the `out` hold is a GSAP `delayedCall(1)` (source).
- **Fetch:** runs in parallel with the hold. One measured `fetch` of a target page (Boundless, a separate run) took 932 ms and ended at +935 ms, 65 ms before the hold ended. The Portal swap came at +1,070 ms.
- **Cached back navigation:** also swapped at +988 ms.

**Corrects the earlier record.** It said about 2,000 ms of `is-leaving` and about 2.3 s in total, both estimated. Measured, the leave is about 1,000–1,070 ms. The `in` side adds a second fixed 1 s hold before the visit ends, while the new content is already visible and animating.

Index row → project page (Portal), measured:

| +ms | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| +4 | html | `is-changing is-animating is-leaving` | – | – | – | measured |
| +16 | `.u-anim-page` (all page content) | opacity 1→0 | 250 | 0 | ease | measured |
| +16 | hero wordmark letters (if on screen) | opacity 1→0, translateY 0→40% | 1,000 | 100–300 | easeOutQuart | measured; hidden by the 250 ms wrapper fade |
| +250 to +1,070 | screen | white, with only the monogram and burger | – | – | – | estimated (frames) |
| +1,070 | html | `is-rendering`; content swapped; Lenis rebuilt | – | – | – | measured |
| +1,084 | project-menu list (top pill) | height, transform | 500 | 0 | easeOutQuart | measured |
| +1,116 | new `.u-anim-page` | opacity 0→1 | 300 | 0 | ease | measured |
| +1,183 | `.c-projects-menu` pill ("‹ Previous · II Portal · Next ›") | transform (enters from above) | 750 | 0 | easeOutQuart | measured |
| +1,183 | numeral "II", side labels | opacity 0→1 | 300 | 0 | ease | measured |
| +1,183 | title "Portal", per character ×6 | opacity 0→1, translateY 0.5em→0, rotateX 20°→0 | 1,200 | char × 10 ms | easeOutQuint | measured |
| +1,583 | `.c-hero_scaling` `--anim-progress` 0→1 (hero image grows up from the bottom) | custom property | 1,000 (966 sampled) | 500 | GSAP power3.out, i.e. quartic out (source; sampled fit power3.out (quart), rms 0.004) | measured |
| +2,083 | html | `is-changing` removed; `is-ready` | – | – | – | measured |

Menu → Philosophy, measured. The differences from the index-row path:

| +ms | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| +6 | `.c-menu` panel | translateX 0→−100% | 750 | 0 | `cubic-bezier(.38,.005,.215,1)` | measured |
| +6 | `.c-menu` | visibility | 750 | 0 | – | measured |
| +6 | burger × → ≡ | rotate, bars | 300 | 0 | easeOutQuart | measured |
| +6 | menu items | transform snaps back to −100% (no visible motion) | 0 | 500 | – | measured |
| +6 | `.u-anim-page` | opacity 1→0 | 250 | 0 | ease | measured |
| +300 | panel almost off-screen; page white | – | – | – | – | estimated (frames) |
| +1,058 | new `.u-anim-page` | opacity 0→1 | 300 | 0 | ease | measured |
| +1,125 | "Philosophy", 10 characters | as above | 1,200 | char × 10 ms (last 90 ms) | easeOutQuint | measured |

**Next project ("seemless").** This path was partly captured: the End key jumped to the bottom, so the run-up scroll was not natural.

At the foot of a project, a full-screen block reads "Next Project / — Manse — / Keep Scrolling", with two progress rules; `--progress` is scrubbed. Class timeline after the End key (measured, full html class strings):
- +113 ms: `is-next-project-visible`.
- +148 ms: `to-seemless is-changing is-animating is-leaving` plus `lenis-locked`. The visit starts and the source `scrollTo` bottom (1 s, locked) and `delayedCall(1.1)` begin.
- +1,245 ms: `is-next-project-visible` is removed, as the source does inside the 1.1 s callback (about 1,100 ms after the visit start).
- +1,770 ms: swap (`is-rendering`), about 525 ms after the hold ended, presumably waiting on the fetch (not timed in this run).
- +1,795 ms: visit end.
- +1,879 ms: `is-ready`.

What moves:
- The labels and rules fade with opacity 300 ms `ease` (measured).
- The word "Manse" stays centred in place (frames).
- There is no wrapper fade and no per-character title animation, because both are gated on `:not(.to-seemless)` (source).
- The new page starts at scroll 0 with the same word in the same place.
- The pill (750 ms easeOutQuart) and numeral (300 ms) fade or slide in, and the hero tween runs (measured).

The handoff is continuous, built on one word that does not move.

## 4. Navigation and menu
**Monogram hover (desktop).** The dark 41 px square hollows from its centre out to a 1 px frame, uncovering white; the letters turn dark (frames confirm).
- `#background-idle` clip-path: a degenerate centre hole grows to a 1 px inset frame, 500 ms easeOutQuart.
- `#type` fill: 150 ms linear.
- Unhover reverses with the same values (measured).

**Burger hover.** The pale ring is replaced by a dark ring that wipes in along a diagonal.
- `::before` border `#ebebeb` → transparent, 500 ms easeOutQuart.
- `::after` dark ring: clip-path from a collapsed diagonal `polygon(100% 0,100% 0,0 100%,0 100%)` to the full square, 500 ms easeOutQuart.
- Ring opacity 0→1, 500 ms easeOutQuad `cubic-bezier(.25,.46,.45,.94)` (measured; source).

**Menu open, desktop (click burger).** All elements start in the same frame (+26 ms after the click). The earlier record's "panel starts at about 160 ms" is not confirmed.

| +ms | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| 0 | `nav.c-menu` panel (801 px glass, blur 50 px) | translateX −100%→0 | 1,000 | 0 | easeOutQuint | measured |
| 0 | 6 items (Projects…Contact) | translateX −100%→0 (they slide out from behind the list container's shared clip, `.c-menu_primary-container { clip-path: inset(-1rem 0 0 0) }`) | 1,000 | 0 / 50 / 100 / 150 / 200 / 250 | easeOutQuart | measured |
| 0 | burger icon and bars (≡ → ×) | rotate 135°, bars ±2 px plus 90° | 300 | 0 | easeOutQuart | measured |
| 0 | burger rings | colour vars → white / 20% white | 500 | 0 | easeOutQuart | measured |
| 0 | monogram letters | fill (inverts to a white square) | 150 | 0 | linear | measured |
| ≈ +1,250 | quiet | | | | | computed |

The panel shape comes from the source: `clip-path: inset(.5rem 0 .5rem .5rem round .75rem)`, an 8 px inset with a 12 px radius. This replaces the earlier estimate of about 16 px. Opacity is not animated on desktop: the items are revealed only by sliding.

**Hover inside the menu (desktop).** "The other words" answer differently here than on the index.

| trigger | element | property | duration | easing | |
|---|---|---|---|---|---|
| enter list | other 5 links | opacity 1→0.4 | 300 | ease | measured |
| enter list | indicator, a 1 px vertical rule at the list's left edge, one item tall | clip-path `inset(50% 0)`→`inset(0)` (draws from its centre) | 750 | easeOutQuint | measured |
| move to another item | indicator | translateY to the item (`--item-offset` 62→187→312 px) | 750 | easeOutQuint | measured |
| move to another item | old and new link | opacity 0.4↔1 crossfade, same frame | 300 | ease | measured |
| leave list | indicator | clip-path back to the centre | 750 | easeOutQuint | measured |
| leave list | links | opacity back to 1 | 300 | ease | measured |

**Menu close, desktop (click ×).**

| +ms | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| 0 | panel | translateX 0→−100% | 750 | 0 | `cubic-bezier(.38,.005,.215,1)` (slow start, fast middle, long settle) | measured |
| 0 | panel | visibility | 750 | 0 | – | measured |
| 0 | burger × → ≡ | rotate, bars | 300 | 0 | easeOutQuart | measured |
| 0 | items | no motion; snap back to −100% | 0 | 500 | – | measured |
| 0 | monogram letters | fill | 150 | 0 | linear | measured |

**Asymmetry.** The menu opens in 1,000 ms on an ease-out with a staggered item cascade. It closes in 750 ms on an in-out curve, with no item motion; the items travel with the panel.

## 5. Hover and micro-interactions
**Index row hover (1440; requires `hover: hover`, ≥1,000 px for the hairlines, ≥1,200 px for the thumbnails).**

The whole row is the link: a full-width `<a>` overlays each 93 px row. In the same frame:

| element | property | duration | delay | easing | |
|---|---|---|---|---|---|
| top and bottom hairlines (`::before`/`::after`, `#ebebeb`, 1 px, full row width) | scaleX 0→1 from the centre | 1,000 | 0 | easeOutQuart | measured; transform origin is the centre (computed style) |
| 3 thumbnails, left gutter (up to 115×77 at full size, narrower on some rows; three per project) | scale 0.8→1 | 500 | 0 / 40 / 80 | easeOutQuart | measured |
| 3 thumbnails | opacity 0→1 | 300 | 0 / 40 / 80 | ease | measured |
| "View Radiance" label, right edge (italic text serif, rests at 50% opacity) | translateY −20 px→0 | 750 | 0 | easeOutQuart | measured |
| "View Radiance" label | opacity 0→0.5, visibility | 250 | 0 | ease | measured |

**What happens to the other words.** Nothing. Title opacity and colour of the neighbouring rows were probed at 500 ms and 1,700 ms into the hover and stayed at `1` and `rgb(36,28,24)`. No title moves, scales or dims, and the hovered title itself does not change. Only its frame (the hairlines), the images and the label appear.

**Leave.** The same transitions run in reverse with the same durations: thumbnails 300/500 ms with 0/40/80 ms delays, label 250/750 ms back up to −20 px, hairlines 1,000 ms. They were measured on a leave after a completed hover.

**Moving to the adjacent row.** The leave of row N and the enter of row N+1 fire in the same frame (+30 ms), a straight crossfade with no hand-off sequencing. The rows share a hairline (`margin-top: -1px`), so the two lines visually overlap.

**Quick pass (150 ms in, then out).** The reverse durations were shortened by the browser (hairlines 554, label 231/492, thumbnails 256/399 ms). These are not authored values.

**While scrolling with the pointer parked.** Rows highlight one after another as they pass under the cursor, at about 80 ms per row in this run (measured). There is no scroll-time hover suppression.

**Other hovers (source, plus the one measured instance):**
- Link underline (`.c-link_label::before`): scaleX 0→1, origin flips right→left, 300 ms easeOutQuint.
- Showreel Play button (measured once while scrolling):
  - clip-path to a circle, 500 ms easeOutQuint;
  - label up −100%, 500 ms;
  - icon in, 500 ms with a 100 ms delay.
- Showreel close: the two crossed lines rotate with a 0/200 ms stagger.
- Team and publication tiles: image `clip-path: inset(5px)` (source).

## 6. Scroll
- **Lenis** smooth wheel. A run of 27 × 100 px wheel steps kept `lenis-scrolling` on for about 3.2 s (measured).
- **Showreel card (scrubbed with scroll, measured inline per frame):**
  - section `clip-path: inset(-1px 2%)` → `inset(-1px 0%)`: the side margins close to full-bleed;
  - inner window `clip-path: inset(360px 576px)` → `inset(180px 288px)`: at 1425×900, the video window grows about 3× in each dimension, from about 273×180 to about 849×540, by the end of a three-screen scroll. The end state was not captured.
  - Both follow the Lenis-smoothed position. They show no authored easing: the window run fits linear (rms 0.015), so it tracks scroll position directly.
  - The thumbnail is set to `scale(0.64)` at load.
- **Index list:** no scroll reveal for the 25 words. They are static, and hover is their only motion.
- **Header:** no change on scroll; no transitions were recorded on `.c-header`. It hides only when the showreel opens: translateY −100%, 750 ms easeOutQuart (source, not exercised).
- **Reveals:** the utility `u-anim-inview` (opacity plus translateY 5 rem, 500 ms easeOutQuart, 50 ms × `--index` stagger) exists (source). No instance fired on the home page.
- **Project page (measured):**
  - hero image parallax: `translate3d` per frame, `--parallax-scale` about 1.1–1.17;
  - `.c-hero_scaling` uses `--scroll-progress` (scrubbed) after its intro tween;
  - the top pill's `--progress` acts as a reading-progress bar.

## 7. Type in motion
- **Page titles (project, Philosophy):** per character, `opacity` 0→1 and `transform: translateY(.5em) rotateX(20°)` → none, with `transform-origin: 0% 30%`. Each character runs 1,200 ms easeOutQuint with a 10 ms stagger (measured). The CSS default is 6 ms, so this page sets `--stagger` to 10 ms. They are split into line, word and char wrappers (`--line-index`, `--word-index`, `--char-index`). They are skipped on the seamless transition.
- **Hero wordmark (an SVG, 8 letter paths):** each letter rises 40% of its height and fades in, 1,000 ms easeOutQuart. The delays are not left to right (measured):

  | letter | M | c | A | L | P | I | N | E |
  |---|---|---|---|---|---|---|---|---|
  | delay (ms) | 180 | 140 | 300 | 220 | 140 | 220 | 100 | 260 |

  The effect is a scattered, irregular rise. The same values run in reverse when leaving a page.
- **The 25 index words:** no motion, on load, on scroll or on hover.
- **Menu items:** move as whole lines. On desktop they slide in from the left inside their own clip, with no fade. On phone they rise one line-height and fade.

## 8. Phone differences (390×844, `hover: none`)
**Index.** Thumbnails, the "View X" label and the hairlines are not rendered (`display:none`, or pseudo-elements only under `hover: hover` at ≥1,000 px). The index has no interaction motion on phone. This is the CSS's intent, not a capture gap.

**Menu open (tap).**

| +ms | element | property | duration | delay | easing | |
|---|---|---|---|---|---|---|
| 0 | sheet (`clip-path: inset(.5rem round 2.5rem)`: 8 px inset, 40 px radius, source) | translateY 100 px (6.25 rem)→0 | 500 | 0 | easeOutQuart | measured |
| 0 | sheet | opacity 0→1 | 150 | 0 | ease | measured |
| 0 | 6 items | translateY 100%→0 and opacity 0→1 | 1,000 | 0 / 50 / 100 / 150 / 200 / 250 | easeOutQuart | measured |
| 0 | burger icon and bars | rotate | 300 | 0 | easeOutQuart | measured |
| 0 | monogram letters | fill | 150 | 0 | linear | measured |

The centred monogram and × at the top of the sheet are separate copies inside the sheet (`.c-menu_logo` at 173,141 and `.c-menu .c-burger` at 220,141). They travel with the sheet and have no motion of their own; the header's own pair sits under it.

**Menu close (tap ×).**
- Sheet: translateY back to 100 px, 250 ms `cubic-bezier(.77,0,.175,1)` (easeInOutQuart), with opacity 250 ms `ease` and visibility 250 ms.
- Items: no motion; they reset after 500 ms. All measured.
- Timing: the sheet takes 500 ms; the items finish at 1,250 ms; close takes 250 ms.

**Load:** the same wordmark sequence and the same letter delays (measured).

**Scroll:** Lenis classes are present. No showreel clip-path scrubbing was recorded in the phone scroll run.

## 9. Vocabulary
Easing curves, by distinct uses (element and property):

| curve | uses | where |
|---|---|---|
| easeOutQuart `cubic-bezier(.165,.84,.44,1)` | 14 | menu items 1,000 (both widths); burger morph 300; button ring 500; monogram clip 500; row hairlines 1,000; row thumbnail scale 500; row label slide 750; wordmark letters 1,000; project pill 750; project-menu list 500; phone sheet 500; `u-anim-inview`/`ready` 500; header hide 500/750; poem controls 500 |
| easeOutQuint `cubic-bezier(.23,1,.32,1)` | 5 | desktop menu panel 1,000; menu indicator 750 (transform plus clip); title characters 1,200; showreel Play button 500; link underline 300 |
| `ease` (CSS default) | 7 | page wrapper out 250 / in 300; loader 300; menu link dim 300; row label opacity 250; thumbnail opacity 300; phone sheet opacity 150/250 |
| `linear` | 4 | image load fade 250; monogram fill 150; spinner 300 loop; sound bars 1,200 loop |
| `cubic-bezier(.38,.005,.215,1)` | 1 | desktop menu close 750 |
| easeInOutQuart `cubic-bezier(.77,0,.175,1)` | 1 | phone menu close 250 |
| easeOutQuad `cubic-bezier(.25,.46,.45,.94)` | 1 | button hover ring opacity 500 |
| GSAP `power3.out` (quartic out, the same family as easeOutQuart) | 1 | project hero intro 1,000, delay 500 |
| GSAP `delayedCall` | 2 (+1) | page out hold 1,000 and in hold 1,000; next-project hold 1,100 |

**Durations:** 150, 250, 300, 500, 750, 1,000, 1,200 ms. **Staggers:** 10 ms per character, 40 ms per thumbnail, 50 ms per menu item (and per `u-anim-inview` index), and scattered 100–300 ms delays for the wordmark letters.

**By property class:**
- **Opacity and colour:** 150–300 ms on `ease` or `linear`. The exception is staggered items that fade with their transform, at 1,000 ms easeOutQuart on phone.
- **Transform and clip-path (position, size, shape):** 300–1,200 ms, always easeOutQuart or easeOutQuint on entry; in-out curves appear only on the menu close.

## 10. Sequencing
- **One interaction, many elements, one start frame.** The row hover, menu open, menu close and page swap each start every element in the same frame. Separation comes from:
  - **Property-specific timing:** in one row hover, the label fades in 250 ms, the thumbnails fade in 300 ms, the thumbnails scale in 500 ms, the label slides in 750 ms and the hairlines draw in 1,000 ms. These are five distinct timings on two easings.
  - **Uniform small staggers inside a group:** 40 ms for thumbnails, 50 ms for menu items, 10 ms for characters.
  - **Different curves for container and contents:** the menu panel uses easeOutQuint and its items use easeOutQuart, at the same 1,000 ms.
- **Snappy versus subdued, by property, against the owner's Osklen reading.** Here, size and shape changes are not short:
  - the hairline scaleX takes 1,000 ms; the thumbnail scale and monogram clip take 500 ms;
  - only the burger morph is 300 ms.

  Their snap comes from the curve, not the duration: easeOutQuart is about 90% complete at 40% of its time (computed). Position changes (menu slide 1,000 ms, label slide 750 ms, letter rises 1,000–1,200 ms) are the longest and softest-tailed. Opacity and colour are the genuinely short layer.
- **Entries are rich and exits are curt.**
  - The menu cascades in over 1,250 ms; its items do not animate out, and it closes in 750 ms (250 ms on phone) on an in-out curve.
  - The page leaves with a single 250 ms wrapper fade. It then holds white for a fixed 1 s and enters with a 1,200 ms per-letter rise.
  - Hover is the exception: in and out are symmetric.
- **Hold as a beat.** The two `delayedCall(1)` holds are fixed, not content-driven, so every page change has the same rhythm whatever the network does (as long as the fetch finishes within 1 s).
- **Scroll motion is all scrubbed** (showreel window, parallax, progress) and follows Lenis's smoothing. Nothing on the home page is triggered by scroll.

## 11. Gaps
- **No consent banner appeared** in any headless run (`#cc-main` was absent), so none was dismissed. The banner's own motion was not seen.
- **Next-project transition:** partly captured. The End key jumped to the bottom, so the natural run-up (`--progress` 0→1 on the next-project block, `scrollTo` bottom for 1 s with a lock) was not observed scroll by scroll. The visual hand-off is estimated from frames at 5 fps.
- **Not exercised:**
  - showreel open and close: a modal plus the header hiding;
  - press, team and publication modal transitions: swup fragment visits, `#modal` opacity 100 ms and `#listing` opacity 0.2 (source only);
  - team and publication tile hovers;
  - the audio toggle.
- **Phone scroll:** the showreel scrubbing was not recorded on phone. It may be gated off or out of range in this run; this is unconfirmed.
- **Load timings** depend on the network. Offsets are anchored to `is-loaded`, and the absolute 7–9 s headless load is not a design value.
