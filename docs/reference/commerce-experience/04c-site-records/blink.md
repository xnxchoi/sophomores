# blink — captured 2026-11-14, viewports 1440×900 and 390×844

Captured in Orca's built-in browser (Chromium), tab owned by this capture. URL `https://blink.capital/`. No cookie banner appeared. The page has an empty `<title>` (**measured**). Phone captures used `--mobile` at scale 1.

**Timing caveat:** the capture tab was a background tab (`requestAnimationFrame` about 2 fps, measured on this tab). Blink's section motion is mostly **CSS transitions and keyframe animations**, so the durations and easings below are declared values read from computed styles and `getAnimations()`, and count as measured. Sequencing across the cold load (which is JS-timed) is estimated.

## 0. In one paragraph
Blink is a one-page site for a capital-management "system" (algorithmic, fast decision-making) presented by a small team of market professionals. The page is a single long scroll of pinned chapters — Hero, Origin, How Blink works, Strategy, The people behind it, Contacts — navigated by a small bottom-centre tab bar. The strongest impression is an interface metaphor of phone notifications and messages: content arrives as violet notification cards, story cards with progress bars, and chat bubbles, all in uppercase mono, over a black ground with a glowing iridescent orb in the hero.

## 1. Strategy (inferred)
- Says what Blink is (a system built to act before a decision is visible) and who runs it; audience appears to be prospective investors/partners.
- First viewport asks the visitor to read one notification and scroll; the nav offers chapter jumps. No form or CTA in the first screen.

## 2. Scope (inferred)
- Six chapters on one page: Home, Origin (story cards), How Blink works (orbit diagram), Strategy (message cards), The people behind it (expanding cards), Contacts. A "Skip" link bottom right skips the current chapter. A "design by charmer" credit is present (DOM).

## 3. Structure
- IA: a single page; nav items are hash links (`/#hero`, `/#origin`, `/#how`, `/#strategy`, `/#people`, `/#contacts`; **measured**). Depth: one level.
- Order and lengths at 1440 (document 12,962 px; **measured**): hero 0–1,800 · origin 1,800–4,500 · how 4,500–7,200 · strategy 7,200–9,900 · people 9,900–12,062 · contacts 12,062–12,962. Chapters are 2,700 px tall pinned scroll stages (three screens each).
- Interaction model: scroll story with pinned stages; scroll position selects discrete steps (per the prior audit) and CSS transitions finish each step. Also tap/skip controls.

## 4. Skeleton
- Navigation:
  - Desktop: a fixed tab bar bottom-centre, 532 × 33 px at x 454, y 856, `rgba(242,242,242,0.1)` with `backdrop-filter: blur(16px)`, radius 0 (**measured**). Items 13 px mono uppercase, padding 8 px; the active item is a white block with black text; transition `0.2s ease-in-out` (**measured**). Active item follows the scroll chapter.
  - "Page change" here is a chapter jump: clicking "Origin" set `scrollY` to 1,800 within the first 12 ms sample (**measured**) — an instant jump, not a smooth scroll — and the hash became `#origin`. The tab bar persists.
  - Phone: the bar collapses to a 160 × 33 "MENU ═" button bottom-centre (x 115, y 800; **measured**); tapping it expands a list of the five other chapters upward from the button, same width, with "MENU —" turning white (screenshot).
  - "Skip" text link bottom right (13 px mono) on chapter stages.
- Layout and grid: no column grid; centred single compositions per stage. Outer margin 12 px (logo x 12, notification right edge at 1,428, people card x 12; **measured**). Hero logo letters are justified across the width. Origin story card 328 × 585 px centred (**measured** from screenshot bounds 556–884). People cards 1,298 × 393 at step 0 with 24 px padding, next card peeking at the right edge (**measured**). Very sparse; most of each screen is black (**estimated** 70–85% empty).
- Information design: everything metadata-like is mono uppercase — "FROM:BLINK TEAM · NOW" notification header (12 px), story-card tag "OUR STORY" in a 10% white chip (13 px, padding 8 px), four-segment progress bar on story cards. No prices, dates or rules beyond these.
- Phone (390): logo scales from 64 to 48 px (**measured**) and still spans the width; notification card goes full width (366 px; **estimated**); nav becomes the MENU button; the hero orb is mostly off-screen, leaving a violet glow at the bottom.

## 5. Surface
- Typography (computed):
  - **Guida Mono Pro** (monospace, 400). Logo glyphs 64 / 48 px at 1440, 48 / 36 px at 390 (**measured**). Notification and card body 18 / 19.8 px uppercase (**measured**). Labels and nav 12–13 px uppercase (**measured**). 49 text nodes (**measured**).
  - **Nib Pro** (text serif, 400, sentence/title case via `text-transform: capitalize`). Story-card title 32 px (**measured**); people heading 64 px (**measured**); orbit title ~26 px (**estimated** from screenshot). 32 text nodes (**measured**).
  - Only these two families load (`document.fonts`; **measured**). No tracking adjustments (`letter-spacing: normal`). Mono paragraphs run ≈ 30–36 characters per line (**estimated**).
- Colour: ground `#000000` (≈ 85% of the page; **estimated**); text white; notification violet `#690de2` (**measured**); story card royal blue ≈ `#3036c4` (**estimated** from screenshot); people card `#161616` (**measured**); orbit marker orange-red ≈ `#e8572f` (**estimated**); people avatars are gradient orbs (blue, orange/pink). Hero background is a video of an iridescent ring (purple/pink/orange rim). Interface colours ≈ 5–6.
- Surfaces and depth: radius 8 px on notification and people cards (**measured**), ~8 px on story card (**estimated**), 0 on nav and chips. Glass only on the nav (16 px blur). No shadows. Flat cards on black; the only light is the hero video and gradient avatars.
- Imagery: no photography; 2 `<video>` (hero orb), 3 `<img>` (**measured**). Abstract: glowing orb, line-drawn orbit arc with dotted axis, gradient avatar circles. Imagery decorates/sets mood; text carries the content.
- Controls: rectangular, sharp, mono; active state is inversion (white block). Tap areas on story cards (per prior audit). Native cursor.

## 6. Motion and interaction
- Libraries: **Lenis** (`html.lenis`), Vue (`[data-v-app]`, `router-link-*` classes; a `#__nuxt` root but no `window.__NUXT__`); no gsap/three/canvas (**measured**).
- Load / intro: immediately after `load`, the six logo glyphs B L / * N K sit spread edge to edge in grey; ~7 s later (**estimated**, throttled) the logo has docked into the left ~1,000 px at full white, the violet notification has arrived top right, and the tab bar is visible. Glyph opacity transition `0.3s ease-in-out` (**measured**). Notification title `bounce-in-text` 300 ms with 100 ms delay; body words `text-animation-alt` 200 ms each, staggered 50 ms (50, 100 … 700 ms) (**measured**).
- Chapter transitions (declared CSS, **measured**):
  - How: `how__circle` `transform 1.2s cubic-bezier(0.33, 1, 0.68, 1)`.
  - Strategy: `strategy-card-wrapper` `transform 0.8s cubic-bezier(0.5, 0, 0, 1)`; card, heading, time and message colours `0.35s ease-in-out`.
  - People: `people__card` `1.4s cubic-bezier(0.5, 0, 0, 1)` (width steps `--step0…`).
  - Notification and nav: `0.2s ease-in-out`.
- Scroll: Lenis smooth scroll over pinned 2,700 px stages; chapter jump via nav is instant (**measured**).
- Cross-check against `docs/qa/blink-motion-fidelity-20261003.md` (audit's values are declared source values): orbit 1.2 s `(.33,1,.68,1)` — **matches**; strategy positions 0.8 s `(.5,0,0,1)` and 350 ms colour interpolation — **match**; people 1.4 s `(.5,0,0,1)` — **matches**; notification title 300 ms after 100 ms and 200 ms words with 50 ms offsets — **match**. Not re-measured here (rAF throttled / JS-timed): orbit step throttle 1.3 s, orbit copy out-then-in 600 + 1,200 ms, story timer 3 s and card scale-in 500 ms, entry sequence (glyphs every 150 ms, nav at 2 s, notifications at 5 s). The audit's artifact folder (`/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/`) no longer exists, so its JSON observations could not be checked.

## 7. Voice
- Terse, declarative, institutional, "we/our"; set in uppercase mono like system messages. Quote: "Blink is a system built to act before you even realize…" (cut to stay under 15 words).

## 8. Commerce conventions
- None.

## 9. Distinctive details
1. Notification metaphor: content arrives as a violet card with "FROM:BLINK TEAM · NOW" header and word-by-word reveal (**measured** 50 ms stagger).
2. Six-glyph mono logo "B L / * N K" justified across the full width, docking during the intro.
3. Bottom-centre glass tab bar with inverted active tab, collapsing to a "MENU" button that opens upward on phone.
4. Pinned chapters of exactly 2,700 px each, each with its own motion family (orbit rotation, message stack, expanding people cards) (**measured** offsets and transitions).
5. Serif headings in capitalised title case (Nib Pro via `text-transform: capitalize`) against all-caps mono body.

## 10. Philosophy (inferred, one or two sentences)
- Inference: present a financial system as a calm, precise device interface — messages, steps, timers — where motion is deliberately metered rather than decorative.

## 11. Evidence
- `blink/1440-intro-early.png` — 1440×900, just after load: logo glyphs spread across the width, grey.
- `blink/1440-home-top.png` — 1440×900, settled hero: docked logo, notification, orb video, tab bar.
- `blink/1440-origin-after-nav.png` — 1440×900, after clicking "Origin" in the tab bar: story card 1 of 4.
- `blink/1440-scroll-5000.png` — 1440×900, How Blink works: orbit arc with marker.
- `blink/1440-scroll-10300.png` — 1440×900, The people behind it: heading and first card.
- `blink/390-home-top.png` — 390×844 mobile, hero with MENU button.
- `blink/390-menu-open.png` — 390×844 mobile, menu list opened upward.
- Not captured: Strategy and Contacts stages (outside the minimum scope); exact cold-load sequence timings and story/orbit step timings (JS-timed, tab throttled); hover states.
