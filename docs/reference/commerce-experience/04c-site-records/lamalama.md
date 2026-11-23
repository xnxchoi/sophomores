# lamalama — captured 2026-11-14, viewports 1440×900 and 390×844

Captured in Orca's built-in browser (Chromium), tab owned by this capture. URL `https://lamalama.com/` (English). No cookie banner appeared (none found in the DOM). Phone captures used `--mobile` at scale 1 (scale 3 gave tiled screenshots on the first site).

**Timing caveat:** the capture tab was a background tab, so `requestAnimationFrame` ran at about **2 fps (measured on this tab)**. JS-driven motion (scramble, wipe, menu) is reported as estimated upper bounds from sample timestamps. Declared CSS values count as measured.

## 0. In one paragraph
Lama Lama is an Amsterdam creative digital agency (branding, websites, e-commerce, marketing). The home page is a long, dark scroll story with a full-bleed video hero, huge uppercase grotesque statements, and a monospace layer of bracketed labels. The strongest impression is a site that keeps talking back: a centred glass command bar at the top whose label is a different wisecrack per section, re-scrambled each time, plus a pixel-grid wipe between pages.

## 1. Strategy (inferred)
- Sells branding, digital and marketing services to brands; tone aimed at ambitious marketing and brand leads.
- First viewport asks the visitor to read the positioning statement and either scroll, open the menu, or click "Get in touch" (a contact card with a team member's photo, top right).

## 2. Scope (inferred)
- Work (case studies, e.g. `/cases/moov/`), What we do (Branding / Websites / E-commerce / Marketing sub-items), About us, Careers, Contact, a pitch deck viewer ("Our pitchdeck"), "Schedule a call", "Start a project", an inline brief form on home ("Brief us something."), an Awwwards talk video, EN/NL language switch.

## 3. Structure
- IA: Work · What we do (expandable, 4 children) · About us · Careers · Contact. Depth: home → case. Two levels observed.
- Home order (scroll positions inside the custom scroller, **measured**): intro/loader → hero h1 "A creative digital agency that goes all in or not at all." (y 617) → "We partner with brands that dare to lead…" statement (1220) → featured work rows, 7 cases at 168 px intervals (Moov 1516 … Ajax 2524) → "What we do." with discipline chips, paragraph and three service lists (2988) → client logo strip and studio photos ("Based in the beating heart of Amsterdam", ~4300) → crew statement (5231) → "Brief us something." form (5889) → footer. Scroller height 6,370 px (**measured**).
- Interaction model: scroll story inside a fixed-height custom scroller (`div.ll-scroller`; `html`/`body` overflow hidden; **measured**). Progress by scrolling; persistent floating controls on top.

## 4. Skeleton
- Navigation:
  - A fixed, centred command bar 438 × 50 px at y 16, radius 4 px, `backdrop-filter: blur(4px)` over a translucent dark fill (**measured** size/blur/radius; fill read from screenshot). Contents: pixel logo (left), section remark (centre, mono 10 px uppercase), hamburger (right).
  - Opening the menu unfolds the bar downward into a 438 × 436 panel (**measured**): five rows (Work, What we do, About us, Careers, Contact) each ~50 px with hairline separators, then an outlined "Our pitchdeck" button and two cream buttons ("Schedule a call", "Start a project"). Behind it a full-screen overlay `rgba(0,0,0,0.4)` with `backdrop-filter: blur(16px)` (**measured**). Hamburger becomes a single bar (minus).
  - Prior note "0.45 s `expo.out`, 90% open at 160 ms, rows 50 ms apart": **prior note, not re-measured** (rAF throttled).
  - Right column (1440 only): a stack of 160 px wide glass cards (blur 4 px, radius 4 px; **measured**) — "Get in touch" (with avatar), "This is us ( − )" (expanded with a portrait video), later "Pitchdeck ( + )" and "Our Awwwards talk ( − )". They expand/collapse per section.
  - Case pages add a "Back to work" black button top left (148 × 50 approx; **estimated**).
- Layout and grid:
  - 1440: 12-column grid, 40 px outer padding, column ≈ 91.3 px, gap 24 px (**derived** from measured start positions: x 40, 271, 617, 732 match column starts 1, 3, 6, 7).
  - 390: 6 columns × 51.3 px, gap 10 px, padding 16 px (**measured**, `grid-template-columns`).
  - Mostly contained within the 40 px margins; hero video and some backgrounds full-bleed. Work rows are full-width bands separated by 1 px hairlines; row height 168 px (**measured** intervals). Asymmetric: statements left (cols 1–6), imagery and lists right (cols 7–12). Density medium; large empty fields between statements (**estimated** 40–50% empty).
- Information design: metadata in **Sometype** mono, 10 px, uppercase, −0.2 px tracking (**measured**), often wrapped in brackets ("[ WE ARE LAMA LAMA ]", "( VIEW + )", "[ FEATURED WORK ]"). Case tags as black chips with 0 8 px padding, 22 px tall (**measured**). Hero foot row: hairline then mono labels ("20+ digital freaks", "Amsterdam based", a live clock "[ • 12 : 58 : 24 ]", socials, EN/NL toggle).
- Phone (390): command bar stretches to 358 × 50 (**measured**); the right card stack is removed; hero h1 drops to 40/32 px (**measured**) and reflows to four lines; paragraph moves under the headline; hero foot row keeps two labels only. Menu panel is the same structure at 358 wide.

## 5. Surface
- Typography (computed):
  - **SuisseBPIntl** (neo-grotesque sans, 400 and 700 loaded). Hero h1 72 px / 57.6 px (0.8), weight 700, uppercase, −1.44 px (−0.02 em) at 1440 (**measured**); 40 / 32 px at 390 (**measured**). Section display "WHAT WE DO." 80 / 64 px, 700, uppercase, −1.6 px (**measured**). Statement h2 48.05 / 43.24 px weight 400 sentence case (**measured**). Hero paragraph 20.04 / 24.05 px (**measured**). Work row names 20 / 24 px (**measured**). Menu items 16 / 22.4 px, −0.32 px (**measured**).
  - **Sometype** (monospace; 400–700 variable loaded). All labels 10 px / 15–18 px, weight 500, uppercase, −0.2 px (**measured**). Body default on `body` is Sometype 16 px (**measured**).
  - Text-node counts: SuisseBPIntl 675, Sometype 296 (**measured**). Hero paragraph measure ≈ 38 characters per line (**estimated**). Statement h2 ≈ 30 characters per line (**estimated**).
- Colour: ground `#1a1c1c` (≈ 80% of scroll length; **estimated**), text cream `#f9f4eb` (**measured**), chips/bar fills black `#000000`/near-black, buttons cream `#f9f4eb` with dark text `#1a1c1c` (**measured** on contact card text). Photography and case imagery supply all saturated colour. Interface colours ≈ 3–4.
- Surfaces and depth: radius 4 px on bar, cards and menu panel; 0 px on chips and image tiles (**measured**). 1 px hairlines between rows and above the hero foot. Glass blur at 4 px (controls), 16 px (menu overlay), 24 px (pitch-deck thumbnail), 64 px over `rgba(0,0,0,0.8)` (a full-screen layer, likely the pitch-deck viewer) (**measured**). No box-shadows. Layered but restrained; depth comes from blur not shadow.
- Imagery: full-bleed hero video (grainy blue-grey particle/snow texture, desaturated); the loader is a halftone/ASCII-like dot texture of organic blobs on canvas (3 canvases, two at 1440×900; **measured**); case rows show horizontal strips of 3–4 thumbnails; studio photos with natural colour; portrait video of team members in the cards (black and white). 24 `<video>` and 131 `<img>` elements on the home DOM (**measured**). Imagery mostly carries the subject (work, people); the halftone texture decorates.
- Controls: rectangular, 50 px tall, radius 4 px; cream solid primary buttons, outlined secondary, mono uppercase labels; text in buttons is duplicated in the DOM (three copies for "Our pitchdeck"), used for a rolling/scramble hover (**inferred** from DOM). Bracketed "( + )" / "( − )" toggles. Cursor native.

## 6. Motion and interaction
- Libraries: **swup** page transitions (`html.swup-enabled`; `is-changing is-animating is-rendering` classes during navigation; **measured**), WordPress theme (`wp-singular` body class), Tailwind-style utility classes; no global gsap/three/lenis exposed (**measured**); 3 canvases.
- Load / intro: a halftone canvas texture with scrambling mono characters ("[_", "#@%_") and a percentage counter ("100%") before the hero video appears. Desktop hero visible ~7 s after load, phone ~13 s (**estimated**, throttled tab — likely much shorter in a foreground tab).
- Section remarks: the bar label changes as sections enter view, scrambling through symbols (e.g. "($0@0_#*_") before resolving. Observed remarks: "Nice entrance" (hero), "Cases with teeth" and on a later pass "Proof we weren't on holiday" (same work section, so the pick is random from a pool), "Our party tricks" (What we do), "Blame these people" (studio), "You made it" (phone load). Scramble resolved within ≤ 1,039 ms of the scroll (**estimated upper bound**; prior note says ~0.45 s — not re-measured). The pixel logo also changes shape between sections (seen in screenshots).
- Page change (home → `/cases/moov/`): URL changed by 101 ms; swup transition classes present at the 801 ms sample and cleared by 2,401 ms (**measured** sample bounds, so ≈ 0.7–2.3 s; **estimated** ~2 s overall, consistent with the prior note). Visual: the old page is overlaid by a black-and-white pixel checkerboard that eats the content (screenshot `1440-pagechange-wipe.png`); bar and contact card persist. The case page shows a 72 px-class uppercase title, chips, body and credits.
- Scroll: native overflow on a custom scroller element (scroll-behavior auto; **measured**); text reveals (`ll-text-reveal`, `opacity-0` containers) trigger on entry. No smooth-scroll library detected.
- Hover: not timed (rAF throttled).

## 7. Voice
- Cheeky, punchy, first person plural, wisecracks in mono labels, big declaratives in uppercase. Quote: "A creative digital agency that goes all in or not at all."

## 8. Commerce conventions
- None (service sales; contact form and call booking).

## 9. Distinctive details
1. Section-aware remark in the command bar, picked at random and scrambled in (two different remarks recorded for the same section).
2. Pixel/checkerboard page wipe between pages (screenshot evidence) driven by swup.
3. Two-font system: heavy uppercase SuisseBPIntl against 10 px bracketed Sometype mono labels (**measured**).
4. Floating glass stack of contact/people cards on the right that opens and closes per section, with portrait videos.
5. Halftone/ASCII blob texture on canvas as the loader and section backgrounds.

## 10. Philosophy (inferred, one or two sentences)
- Inference: personality is the product; every persistent control is used as a channel for humour and motion, on top of a disciplined grid.

## 11. Evidence
- `lamalama/1440-loader.png` — 1440×900, loader halftone texture before hero.
- `lamalama/1440-home-top.png` — 1440×900, hero settled (video, h1, command bar, right card stack).
- `lamalama/1440-menu-open.png` — 1440×900, menu panel open with blurred page behind.
- `lamalama/1440-mid-scroll-1100.png` — 1440×900, featured-work rows ("Cases with teeth").
- `lamalama/1440-mid-scroll-2900.png` — 1440×900, "What we do." section ("Our party tricks").
- `lamalama/1440-mid-scroll-4300.png` — 1440×900, studio photos ("Blame these people").
- `lamalama/1440-pagechange-wipe.png` — 1440×900, mid page change, pixel wipe.
- `lamalama/1440-case-moov-top.png` — 1440×900, case page settled.
- `lamalama/390-intro.png` — 390×844 mobile, loader.
- `lamalama/390-home-top.png` — 390×844 mobile, hero.
- `lamalama/390-menu-open.png` — 390×844 mobile, menu open.
- Not captured: exact menu and scramble easing/durations (throttled rAF); hover timing; form not touched (rule).
- Prior notes in `04b-references.md`: 438 × 50 glass bar — confirmed (**measured**); unfolds downward — confirmed (panel 438 × 436), timing not re-measured; random remark per section with scramble — confirmed (two remarks for one section), 0.45 s not re-measured; pixel-grid wipe ~2 s — confirmed visually, ≈ 0.7–2.3 s sample bounds.
