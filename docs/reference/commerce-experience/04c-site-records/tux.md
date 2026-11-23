# tux — captured 2026-11-14, viewports 1440×900 and 390×844

Captured in Orca's built-in browser (Chromium), tab owned by this capture. `https://tux.co` redirects to `https://tux.co/en/` (**measured**). No cookie banner appeared. A dismissible "News" toast (Adweek award) sits bottom right on every page; left in place (it is content, not consent). Phone captures used `--mobile` at scale 1. A native scrollbar takes 15 px at 1440 (content width 1425; **measured**).

**Timing caveat:** the capture tab was a background tab (`requestAnimationFrame` about 2 fps, measured on this tab). Tux's menu and page transitions are **CSS transitions**, so their durations and easings read from `getAnimations()` are declared values and count as measured.

## 0. In one paragraph
TUX Creative House is an independent creative agency (Montreal origin, LA address in the menu) doing strategy, branding, advertising, production and 3D for consumer brands. The home page is a long dark-and-white scroll: a full-bleed video reel with one line of monospace tagline, then a news grid, then six full-bleed case films each a screen-plus tall, a giant condensed-type values statement, and a neon-green contact block. The strongest impression is the switch between near-silent mono UI and enormous condensed display type, most visible in the neon-green menu sheet.

## 1. Strategy (inferred)
- Sells creative and production services ("Plan / Make / Launch" in the title) to large consumer brands; addresses brand and marketing leads.
- First viewport asks nothing explicit: it plays a video reel with the tagline and offers Work / Culture / Contact in a floating bar; the news toast is the only call to click.

## 2. Scope (inferred)
- Work (case films), Culture (news/journal grid), Team (people credits roll at `/en/people`), Contact, Jobs; Karma Foundation, Privacy policy, "Brouillon" (external), FR/EN.

## 3. Structure
- IA: Work · Culture · Contact in the bar; the menu adds Team and Jobs. Depth: home → section page → article/case.
- Home order at 1440 (document 11,682 px; **measured**): video hero 0–900 with centred mono tagline → "Latest News" four-card grid (from y 920) → six case films, each a 1,100 px band (W Hotels 2175, Levi's 3275, Polo 67 4375, Polo Red 5475, Quip 6575, Nike Swim 7675; **measured**) with a mono client label bottom left and category words → values statement block ("Independent / 2SLGBTQI+ / B-Corp / 4-Day Week") in giant condensed type on white → green "Contact us" block (#17e013, 1,936 px tall; **measured**) → footer. Phone document 6,564 px (**measured**).
- Interaction model: native-scroll story; cases are big moving-image bands that the visitor scrolls past; menu is the main navigation.

## 4. Skeleton
- Navigation:
  - Floating bar, home 1440: 676 × 59 px at x 713, y 15 (right-aligned in the right half), padding 15 px, radius 10 px, `rgba(61,61,61,0.4)` with `backdrop-filter: blur(30px)` (**measured**). Contents: "TUX CREATIVE HOUSE" (home link), WORK, CULTURE, CONTACT, and a four-dot menu icon. On `/en/people` the same bar is centred (x 374; **measured** from screenshot) — position varies by page. Phone: 360 × 59 at x 15 (**measured**), links removed, brand + icon only.
  - Menu: a full-screen sheet that rises from the bottom with 15 px top-corner radius (`.inner`, `border-radius: 15px 15px 0 0`; **measured**), `transform` over **1,000 ms `cubic-bezier(0.9, 0, 0.1, 1)`** (**measured**, CSS transition). Bar links fade out over 200 ms `cubic-bezier(0.645, 0.045, 0.355, 1)` (**measured**). The page behind blurs (`overlay` with `blur(15px)`; **measured**). Sheet ground computed `#17e013` (renders as a lighter yellow-green in screenshots — likely a layered overlay; **observed**). Content: WORK / CULTURE / TEAM / CONTACT (/ JOBS on phone) in condensed display, LA address top left, "House of diverse thinkers and fierce makers" bottom left, FR/EN bottom right.
- Layout and grid:
  - 1440: 15 px outer margin; news grid 4 columns × 338 px with ~15 px gaps (x 15, 368, 720, 1073; **measured**). Case bands full-bleed 1425 wide. Culture page grid uses ~29 px margins and 4 × 331 px columns (**estimated** from screenshot).
  - 390: 15 px margins (**measured** bar x), single column.
  - Mix of full-bleed media bands and a tight, dense card grid. Very little empty space except in the hero and the values block (**estimated**).
- Information design: labels in NB Akademie Mono uppercase 14 px with tight −1.12 px tracking (**measured**): client name, categories ("STRATEGY ADVERTISING PRODUCTION 3D"), address. News cards: 18 px NeueMontreal title, grey excerpt clamped with ellipsis, underlined "Read more" link.
- Phone (390): bar shrinks to brand + icon; tagline wraps to two centred lines; news toast spans width (358 px; **estimated**); menu items drop to 60 px (**measured**) and Jobs is added, plus footer links.

## 5. Surface
- Typography (computed):
  - **TuxPlaza** (custom condensed grotesque display, 400). Menu items 223.2 px / 200.88 px at 1440, 60 px at 390 (**measured**); values statement 207 px / 186.3 px uppercase (**measured**); a 75 / 78.75 px line ("One process. Zero si…") elsewhere (**measured**).
  - **NB Akademie Mono** (monospace, 400). UI and labels 14 / 18.9 px, uppercase, −1.12 px (−0.08 em) (**measured**). 819 text nodes use it (**measured**) — it is the majority face by count.
  - **NeueMontreal** (grotesque, 500). Body 17.136 / 24.85 px, −0.343 px (**measured**); h2 "Latest News" 26 / 37.7 px; card titles 18 / 21.6 px; toast text 18.85 / 20.73 px (**measured**).
  - Display words are split into per-letter spans (class `l r`; **measured**), so letters animate individually (seen as a reveal mechanism; not timed).
- Colour: hero/cases near-black `#121212` and `#000000`; text white; news and values sections white `#ffffff` with text `#121212`; excerpt grey; green `#17e013` for contact and menu; toast caption `#c5c5c5` (**measured**). Proportion over the scroll ≈ 60% dark media, 25% white, 15% green (**estimated**).
- Surfaces and depth: radius 10 px (bar), 15 px (menu sheet top, toast), 0 px on cards and media (**measured**/observed). Glass on the bar (30 px blur) and overlay (15 px). No shadows. Flat apart from the glass bar.
- Imagery: video everywhere — the hero is a rotating reel (three different clips seen across visits: product screens on easels, a tunnel shot, a zipper close-up), cases are full-bleed films; 9 `<video>` and 52 `<img>` on home (**measured**). Commercial, saturated, people-and-product close-ups. Imagery carries the subject.
- Controls: text links in mono uppercase; round white close button on the toast; underlined "Read more" links; four-dot menu icon. No filled buttons observed on home.

## 6. Motion and interaction
- Libraries: Nuxt (`window.__NUXT__`, `nuxt-link` classes) with Vue page transitions (`page-leave-active` / `page-enter` classes); no gsap/lenis/three detected; no canvas (**measured**). `html` classes `-animations-enabled -ui-dark -ui-lightHaut` switch UI theme by section.
- Marquees: five `defiler` CSS animations, 5,000 ms linear, paused at rest (**measured**) — likely run on hover of case bands (not observed running).
- Load: hero video starts directly; no loader observed.
- Menu: see Skeleton — 1,000 ms `cubic-bezier(0.9, 0, 0.1, 1)` sheet rise (**measured**). Screenshot mid-open shows the green sheet's top edge entering from the bottom while the page blurs (`1440-menu-opening.png`).
- Page change (menu → Culture): old page `transform` **1,300 ms `cubic-bezier(0.645, 0.045, 0.355, 1)`** (`page-leave-active`), then new page `transform` **1,000 ms** same easing (`culture-page page-enter…`), and the menu sheet retreats with its 1,000 ms `(0.9, 0, 0.1, 1)` transition (**measured** declared values). Sampled sequence: leave active by ≤ 701 ms, enter from ~1,652 ms, sheet moving 1,702–2,451 ms, settled by ~2,800 ms (**measured** sample bounds; overall ≈ 2.8 s). Floating bar persists.
- People page roll (`/en/people`, cross-check): `.equipe` with `.fondFlou` present; the `.credits` column moved 250 px in 3.0 s = **83.3 px/s** (**measured**, transform delta over wall-clock time).
- Hover: hero has a full-screen `hover-zone` element (**measured**); its effect was not exercised.

## 7. Voice
- Brief, uppercase mono statements; values said as single words; confident, inclusive. Quote: "Creating brand desire for the world's most ambitious brands."

## 8. Commerce conventions
- None.

## 9. Distinctive details
1. Neon-green full-screen menu sheet rising on a sharp `cubic-bezier(0.9, 0, 0.1, 1)` with 200-px-class condensed words (**measured**).
2. Mono-first UI: NB Akademie Mono at 14 px, −0.08 em, is the majority face (819 text nodes; **measured**).
3. Values billboard in giant condensed type ("Independent / 2SLGBTQI+ / B-Corp / 4-Day Week").
4. Home case list as six 1,100 px full-bleed film bands with tiny mono captions (**measured** heights).
5. Floating 30 px-blur glass bar that changes alignment by page (right half on home, centred on People).

## 10. Philosophy (inferred, one or two sentences)
- Inference: let the moving image dominate and keep the interface to small mono type, then make the few loud moments (menu, values) very loud.

## 11. Evidence
- `tux/1440-home-top.png` — 1440×900, hero reel with tagline, glass bar, news toast.
- `tux/1440-scroll-900.png` — 1440×900, Latest News grid.
- `tux/1440-scroll-2400.png` — 1440×900, first case film band (W Hotels) and its caption.
- `tux/1440-scroll-9000.png` — 1440×900, values billboard and start of green contact block.
- `tux/1440-menu-opening.png` — 1440×900, menu sheet mid-rise, page blurred.
- `tux/1440-menu-open.png` — 1440×900, menu open.
- `tux/1440-pagechange-culture.png` — 1440×900, right after clicking Culture (menu still covering).
- `tux/1440-culture-top.png` — 1440×900, Culture page settled.
- `tux/1440-people-roll.png` — 1440×900, `/en/people` credits roll (cross-check of prior note).
- `tux/390-home-top.png` — 390×844 mobile, hero.
- `tux/390-menu-open.png` — 390×844 mobile, menu open.
- Not captured: hero hover-zone effect and marquee running state; people-page hover stop and phone carousel (outside home scope; only the roll speed was re-checked).
- Prior notes (`04b-references.md`, TUX People): self-scrolling roll ≈ 83 px/s — confirmed (83.3 px/s, **measured**); `.equipe` and `.fondFlou` present — confirmed; two columns — confirmed in screenshot (role column right-aligned, names left-aligned); hover stop 0.8 s, wheel speed-up, phone carousel — not re-measured.
