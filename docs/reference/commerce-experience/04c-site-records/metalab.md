# metalab — captured 2026-11-14, viewports 1440×900 and 390×844

Captured in Orca's built-in browser (Chromium), tab owned by this capture. URL resolves to `https://www.metalab.com/`. Phone captures used `--mobile` at scale 1 (scale 3 produced a tiled, unusable screenshot; layout values are CSS px either way).

**Timing caveat (applies to every JS-driven number below):** the capture tab was a background tab (a parallel agent's tab was active), so `requestAnimationFrame` ran at **2 fps (measured)**. CSS transitions read from `getAnimations()` are declared values and count as measured. JS-driven motion is reported as estimated upper bounds bracketed by sample timestamps.

## 0. In one paragraph
Metalab is a product-design and engineering agency (since 2006) presenting itself to startups and brands that want interfaces built. The home page is a single, non-scrolling black screen: a light-weight serif statement "We make interfaces", a short grotesque paragraph, and a vertical stack of nine client-name pills plus "All Work". The strongest impression is restraint that turns into spectacle on hover: pointing at a client pill replaces the entire screen with that client's case-study preview (full-bleed imagery, big serif client name, discipline tags).

## 1. Strategy (inferred)
- Sells product design and engineering services; addresses founders and brand-side product leaders.
- The first viewport asks the visitor to pick a client name (hover/click a pill) or open "Get in Touch" (mail icon top right). No scroll is offered on the home page.

## 2. Scope (inferred)
- Case studies (nine named on home, "All Work" index), What We Do, About Us, Latest News, Get in Touch.
- Menu also carries a "notifications" rail of news/case items (dated cards: awards, client funding news, a recap), and a light/dark toggle (moon icon) and a world-clock label (city code + local time, e.g. "TST 11:52 PM", changes between visits).

## 3. Structure
- IA: top-level = Case Studies, What We Do, About Us, Latest News, Get in Touch. Depth: home → case study (e.g. `/work/robinhood`). Shallow, two levels observed.
- Home ordering (1440): header (Menu pill · wordmark · mail icon) → intro paragraph (upper right) → client pill list (left, vertically centred) → stepped two-line serif headline (lower centre). That is all; `document.scrollHeight` = 900 at 1440×900 and 844 at 390×844 (**measured**), i.e. the home page does not scroll at either viewport.
- Interaction model: single-screen index. The visitor progresses by hovering (desktop) a pill to preview, clicking to enter the case study, or opening the menu.

## 4. Skeleton
- Navigation:
  - Header 1440 × 54 px, padding 0 24 px (**measured**), persistent across the page change. Left: "Menu" pill (12 px label). Centre: SVG wordmark 80 × 18 px (**measured**). Right: mail icon button; on inner pages and in the menu, a moon (theme) button and the clock label appear.
  - Menu opens as a full-viewport overlay that flips the ground to white. It is built from four white rectangles (top 1440×80, bottom 1440×80, left 504×900, right 504×900; **measured**) that translate in from the edges (closed states: left at translateX(−504), top at translateY(−80); **measured**) to frame a central 432 × 740 media window. Inside: left column of serif nav items, a "Case Studies" label with the same pills, a centre video/image preview (scaled 0.9044; **measured**), and a right rail of notification cards that is itself translated (translateY −317 px; **measured**).
  - Open timing: panels at ~1 px from final position by the first sample at 850 ms after click, settled by 1,867 ms (**estimated upper bound**, 2 fps sampling). Close: panels already at 501/504 px of travel by the first 52 ms sample (**estimated**: close is near-instant compared with open). Easing not observable at this sample rate.
  - "Menu" label becomes "Close ×" when open.
- Layout and grid (1440): no visible column grid; elements are placed absolutely in a full-bleed 1440 canvas with a 24 px outer margin (header padding, pill x = 24, description container padding-left 24; **measured**). Intro paragraph at x 864, width 250 px (**measured**); headline lines offset in steps (line 1 at x 488, line 2 indented ~200 px further; **measured** from spans). Strongly asymmetric, very sparse; estimated 85–90% of the screen is empty black (**estimated**).
- Case-study header (1440): metadata as a three-column `dl` (Project Type / Stage / Deliverables) at x 24, 732, 968 (**measured**), labels 16 px weight 500 white, values 16 px weight 400 grey `#79767a` (**measured**). Then a full-bleed image band from y 450.
- Information design: labels are plain sentence-case grotesque at 12 px (menu section label "Case Studies", grey `#605d62`; **measured**); dates in notification cards set as "Mar 2026", 12 px (**measured**). No mono, no small caps, no rules.
- Phone (390): same single screen. Headline moves to the top-left (x 16, y 167), 44 px (**measured**), both lines flush left; pills remain stacked below it; the intro paragraph is removed from view; a background video plays full-bleed behind everything (on desktop the hero is black until a pill is hovered). Side margin 16 px (**measured**). Menu on phone: media preview becomes a 358-wide rounded block at the top, serif nav list below with inactive items at opacity 0.3 (**measured**) and the active item underlined, notification cards become a horizontal row at the bottom (225 px wide, gap ~2 px; **measured**).

## 5. Surface
- Typography (computed):
  - **PP Eiko** (high-contrast display serif, light weights). Home headline 88 px / 88 px, weight 240, letter-spacing −1.76 px (−0.02 em) (**measured**); phone 44/44, −0.88 px (**measured**). Hover preview client name 88 px / 103.84 px weight 240 (**measured**). Case-study title 140 px / 168 px weight 300, −2.1 px (**measured**). Menu nav items 20/24 px weight 400 at 1440, 22/26.4 px at 390 (**measured**).
  - **Basis Grotesque Pro** (grotesque sans). Body/intro 16 / 22.4 px weight 400, −0.16 px (**measured**); pill labels 16 / 32 px weight 350 (**measured**); small labels 12 / 14.4 px weight 350, −0.12 px (**measured**).
  - Loaded faces: Basis Grotesque Pro 300/400, PP Eiko 300/400 (**measured**, `document.fonts`). All sentence case, no uppercase transforms (**measured**). Intro paragraph measure ≈ 35 characters per line (**estimated** from 250 px width).
- Colour: ground `#000000` (~85–90% of the home screen; **estimated**), text `#ffffff`. Pills `rgba(185,185,185,0.2)` with `backdrop-filter: blur(14px)` (**measured**). Cursor ring stroke `#584dff` violet (**measured**, `rgb(88,77,255)` on the cursor SVG circle). Menu: white ground, black text, grey labels `#605d62`, notification cards `#edf1f5` (**measured**). Imagery supplies all other colour. Interface colours in use ≈ 5 (black, white, translucent grey, card grey-blue, violet).
- Surfaces and depth: pills radius 50 px (full capsule), 32 px tall, padding 0 16 px (**measured**). Notification cards radius 8 px, 1 px border same colour as fill, padding 12 px, no shadow (**measured**). Header has radius 1000 px set but no fill (**measured**). No box-shadows found. Glass only on the pills (blur 14 px). Otherwise flat.
- Imagery: the home is image-free until hover; hover brings a full-bleed client image (e.g. a dark map for Uber) plus an inset product photograph (576 × 360 at 1440; **measured**). Case study hero is a full-bleed product render on a grey gradient. Imagery carries the subject (client work); the home's empty state is pure type.
- Controls: capsule pills; on hover a pill loses its fill and gains a 1 px white outline (seen in screenshot; transition `border-color 0.2s, background-color 0.2s, padding-right 0.2s`, **measured**). Custom cursor: native cursor hidden (`cursor: none` on elements, **measured**); a 96 × 96 cursor element with a violet ring (r = 17) and a small dot; it shows text labels in some states (cursor text containers present; **measured**). Header icons are 24 px circular dark buttons (**estimated** from screenshot).

## 6. Motion and interaction
- Libraries: Next.js (CSS-module class names, `__NEXT_DATA__`/`#__next` present), **Lenis** (`html.lenis.lenis-smooth`), no global gsap, no three.js, no canvas, 3 `<video>` elements, 24 `<img>` (**measured**).
- Load / intro: on phone reload, the first frames were black rounded tiles in a grid (screenshot captured mid-intro) before the hero resolved; settled within ~4 s (**estimated**, throttled tab).
- Page change (home → `/work/robinhood`): client-side navigation (a `setInterval` survived the route change; **measured**). URL changed by the first 100 ms sample; screenshot taken right after the click still showed the home composition; the case study was settled at the next screenshot a few seconds later. Header and wordmark persist. `getAnimations()` count rose to 16–22 during the change but exposed no CSS transition on `main` (**measured**), so the transition is JS-driven; duration not measurable here (**estimated** 1–2 s, throttled).
- Hover on a pill: pill transitions 200 ms `ease` on background and border colours (**measured**); the hero video container fades `opacity` 600 ms `ease` after a 100 ms delay (**measured**); the whole screen swaps to the client preview (confirmed by screenshot). Menu preview images fade `opacity` 300 ms `ease` (**measured**). Wordmark/icons transition `color 0.4s` / `stroke 0.4s` (**measured**) for the light/dark ground flip.
- Scroll: none on home. Lenis active for inner pages (case study is 15,847 px tall; **measured**).

## 7. Voice
- Short, confident, plural first person, no humour on the home page. Headline is three words; the paragraph is one sentence of credentials. Quote: "We make interfaces".

## 8. Commerce conventions
- None.

## 9. Distinctive details
1. Hover-to-replace hero: each client pill swaps the whole screen for that client's preview (screenshot `1440-home-hover-uber.png`).
2. Framed menu: four white edge panels slide in to leave a 432 × 740 media window in the centre (**measured** rectangles).
3. Violet `#584dff` custom cursor ring as the only brand accent on an otherwise black/white site (**measured** stroke).
4. Light-weight display serif (PP Eiko weight 240) set in a stepped, indented two-line headline (**measured**).
5. World-clock label in the header (city code + time), changing between sessions (observed TST, YYZ, FRA).

## 10. Philosophy (inferred, one or two sentences)
- Inference: the work is the content, and the site's own chrome should almost disappear until the visitor points at a client.

## 11. Evidence
- `metalab/1440-home-top.png` — 1440×900, home at rest.
- `metalab/1440-home-hover-uber.png` — 1440×900, "Uber" pill hovered; full-screen client preview and violet cursor ring.
- `metalab/1440-menu-open.png` — 1440×900, menu open (white framed overlay; centre media still loading black).
- `metalab/1440-pagechange-robinhood.png` — 1440×900, screenshot immediately after clicking the Robinhood link (still home composition).
- `metalab/1440-case-robinhood-top.png` — 1440×900, settled case-study top.
- `metalab/390-home-top.png` — 390×844 mobile, home at rest with background video.
- `metalab/390-menu-open.png` — 390×844 mobile, menu open.
- Not captured: mid-scroll (home does not scroll at either viewport); exact easing curves and durations of the menu and page change (tab backgrounded, rAF at 2 fps); phone screenshots at scale 3 (tiled output, replaced by scale 1).
- Prior notes in `04b-references.md` checked: one screen no scroll — confirmed; hover swaps hero — confirmed; custom cursor dot → violet ring — confirmed (`#584dff`); menu panels slide in from edges — confirmed (four rectangles); PP Eiko 88/240 with Basis Grotesque — confirmed; 200 ms hovers — confirmed (pill transitions).
