# analogue (analogueagency.com) — captured 2026-11-14, viewports 1440×900 and 390×844

Browser: Orca built-in browser. Desktop at 1440×900 DPR 1. Phone at 390×844 with mobile emulation and `pointer: coarse`. At `--scale 3` the phone screenshots came out tiled (a capture artefact), so the phone screenshots were taken at scale 1. CSS-pixel measurements are not affected.
Stack (measured): Framer site (`data-framer-name`, `framer-*` classes), Lenis smooth scroll (`lenis` class on html, Lenis WAAPI animations). No gsap, three, barba or swup globals. One WebGL canvas on desktop; hero video on phone.

## 0. In one paragraph
An Amsterdam brand and digital design studio's home page. It is built as a scroll story. It opens on a full-screen field of blue-white light rays that radiate from a point, with one line of white text at the centre. The field contracts into a rounded, inset frame on an off-white ground. A very large grey-and-black positioning statement follows, then a "Jump to" card strip, then full-width case images. One floating, frosted pill nav sits at the top centre. As you scroll it changes into a coloured "case" pill per project, and at the foot of the page it grows into a blue newsletter card. Strongest impression: one persistent object (the pill) and one persistent light field carry the whole page.

## 1. Strategy (inferred)
- It sells brand-identity and digital-design services to design-led product companies and names well-known clients in the statement.
- The first viewport asks for nothing. There is no button. It sets a mood and invites you to scroll.
- The conversion asks appear later: "Book call" at the foot, Calendly "Plan a Call", a phone number in the hidden About menu, and a newsletter email field.

## 2. Scope (inferred)
- Work (case-studies index at `/cases-overview`) and About, with sub-pages for Expertise & Capabilities, Process & Pricing, Team, Outcomes and Careers, plus Analogue Store.
- "Jump to" cards: an award announcement, a book-club RSVP, the team and contact.
- Newsletter sign-up and booking a call.

## 3. Structure
- IA: two top-level items (WORK, ABOUT) and a central logo link home. ABOUT holds 6 sub-links plus phone and "Plan a Call" in a hidden panel (opacity 0, measured), so the depth is 2.
- Home order (y positions measured at 1440 where given as numbers; `~` values estimated from screenshots; document height 9,770 px, measured):
  1. full-screen light hero with "Emotion is the heart / of every decision" (0–~900);
  2. a supporting line about people choosing with feeling as well as reason, 40 px, over the light (~1,045);
  3. the light contracts into an inset rounded frame, and the two halves of the hero line part to the left and right edges (~1,200–2,240);
  4. the h1 positioning statement, 60 px, black with grey client names (2,720);
  5. "Jump to" label with a vertical rule, then a 2×2 card grid (3,140–~3,550);
  6. "Our work / See all", 60 px, centred (3,620);
  7. full-width case images stacked one after another (~3,800–~9,000);
  8. the newsletter card (the pill grown);
  9. a two-line closing invitation ending in a "Book call" link, 60 px, bottom left (9,550).
- Interaction model: a vertical scroll story that ends in an index. You progress by scrolling only. Nothing is pinned behind a click.

## 4. Skeleton
- **Navigation:** a fixed pill, top centre, 470×53 px at y 19 (measured). It holds WORK on the left, the "analogue" logo in the centre and ABOUT on the right. It never hides. It is a morphing element:
  - At load it starts as a small empty pill of about 55×35 px and widens to full size (estimated from the first frame; a 500 ms WAAPI animation, `cubic-bezier(0.44,0,0.56,1)`, 500 ms delay, was measured on `framer-16xfupv`).
  - Over each case image it becomes a solid coloured pill: 302×48, radius 40 px, orange `rgb(253,114,0)` for Vitra (measured). It shows a client logo disc, the project name and "SEE CASE". The colour changes per case (Equip is a grey pill).
  - At the page end it grows into a 460×392 px blue card holding the newsletter form (estimated from screenshot), with WORK / logo / ABOUT kept on its top edge.
  - The About panel (6 links, phone, "Plan a Call") sits inside the pill area at opacity 0 (measured). Mouse hover, mouse down/up, synthetic pointer events and a touch tap on ABOUT did **not** open it under automation, so the panel's open state and timing were **not captured**.
- **Layout and grid (1440):**
  - Content runs nearly full-bleed with a 20 px side margin (measured: h1 x=20, w=1365; case images x=20 to 1405).
  - The hero frame insets to 1140×720 (measured, mid-transition).
  - "Jump to" uses an asymmetric split: label column about 380 px, a 1 px vertical rule, then two 487 px card columns, each with a 170 px square thumbnail and text beside it (estimated from screenshot).
  - Cases index: a 4-column grid of 224 px square tiles, first at x=100, pitch 334 px, so the gap is about 110 px (measured). That gives a lot of air.
  - Density: sparse in the hero and statement, medium in the cards.
- **Information design:**
  - Card title in black 18 px, with a description in grey `#7A7A7A` 18 px directly under it (measured). No rules between them.
  - The small action label ("See announcement", "RSVP") is set at about 11 px (measured in the type census), bottom-aligned to the thumbnail.
  - Case tiles: centred name, then a grey one-line descriptor.
  - Nav labels are set in an LCD dot-matrix face, uppercase.
- **Phone (390):**
  - The pill is about 376 px wide (estimated from screenshot), nearly full width (WORK / logo / ABOUT kept).
  - The hero is a 390×844 `<video>`, not the canvas (measured).
  - The h1 drops to 31 px (measured) over 10 lines (counted from screenshot).
  - "Jump to" becomes a horizontal card carousel (145 px thumbnails, measured videos at 145×145) with a scroll indicator line.
  - Case media are 362×591 portrait (measured).
  - Document height 6,468 px (measured).

## 5. Surface
- **Typography (measured):**
  - **Graphik Medium** (grotesque), weight 500, the only text face for content:
    - display/statement: 60/60 px, −3 px tracking (1440); 31/31 px, −1.55 px (390);
    - hero lines: 40/42 px, −2 px (1440); 21/22 px, −1.7 px (390);
    - card text: 18 px;
    - small labels: 11–14 px (census values).
  - **LCDDot TR Regular** (dot-matrix display face), used only for nav labels and "SEE CASE": 20 px, 0.5 px tracking, uppercase (1440); 18 px (390).
  - Measure: the statement runs about 55 characters per line at 1440 (estimated).
  - Character splitting: the accessibility tree reads headings as spaced letters ("E m o t i o n…"), and 215 text nodes are set at 60 px (measured), so headings are split per character for animation.
- **Colour (hex values measured; coverage shares estimated):**
  - ground `#EDEDED` (about 60% of page, estimated);
  - text `#1C1C1C`;
  - secondary grey `#7A7A7A` (client names, descriptors);
  - light field navy-black to blue-white (about 25%, estimated: hero and frame);
  - pill glass `rgba(224,224,224,0.45)`;
  - per-case accents, e.g. `#FD7200`;
  - newsletter blue, about `#1638F5` (estimated from pixels);
  - a cyan `rgb(153,238,255)` link background (measured, small).
  - Neutral system: 3 colours, plus imagery and per-case colour.
- **Surfaces and depth (measured):**
  - Radii: 20 px (nav pill), 40 px (case pill), 15 px (case tiles), 13 px and 10 px (cards and thumbnails), 1000 px (round button).
  - No box-shadows anywhere (0 found).
  - Blur: `backdrop-filter: blur(10px)` on the pill; `blur(20px)` on a 60 px round "•••" button floating over the contact card; `blur(5px)` on the custom cursor.
  - Mostly flat, with a single layer of frosted glass for the nav.
- **Imagery:**
  - Hero: generative light (WebGL on desktop, video on phone). The rays bend toward the pointer (observed curved rays after mouse movement; estimated).
  - Cases: full-bleed product and brand photography (a Panton chair, packaging), saturated, object-led, with few people on the home page. People appear in the index tiles.
  - Imagery carries the subject: it is the casework.
- **Controls:**
  - Custom cursor: body `cursor: none` with a 20 px blurred dark dot (measured).
  - No conventional buttons above the newsletter. Its "Submit" is a white rounded rectangle inside a translucent field (observed).
  - Links are plain text with no underline. "See all" and "Book call" are set in grey 60 px type as giant text links.

## 6. Motion and interaction
- **Load:** the pill grows from a small blob to full width over about 500 ms after a 500 ms delay (measured WAAPI timing). The light field animates continuously.
- **Scroll:**
  - Lenis smooth scroll (measured: WAAPI animations named on `lenis`, 250 ms and 600 ms linear).
  - Scrubbed: the hero contracts into an inset rounded frame and its two text halves slide apart toward the edges (observed at scroll 1,200). The pill changes per section (observed).
  - Reverse scroll was not re-tested here.
- **Page change (Home to /cases-overview):**
  - Client-side route change (the `window` state persisted, measured).
  - About 400 ms after the click (estimated: timed by sleep before the screenshot), the old page is washed out to near-white with the pill unchanged (screenshot).
  - On the new page about 60 animations of 1,400 ms each run, `cubic-bezier(0,0,1,1)`, starting about 170 ms after the click (tile entrances). A second set of 2,000–2,600 ms `cubic-bezier(0,0,0,1)` animations follows at about 3 s (measured).
  - The pill persists, unchanged.
- **Back:** the click was made from scrollY 0, so scroll restoration was not tested. The return landed on home at scrollY 0 (measured).
- **Hover:** the pointer bends the light rays (estimated). The book-club thumbnail's 3D object rotates (observed between frames). Hover timings were not measured.

## 7. Voice
- Short and declarative: third person when describing itself, second person in the closing ask.
- Emotional thesis first, then a plain factual positioning sentence with name-dropping. Sentence case.
- Quote: "Emotion is the heart of every decision".

## 8. Commerce conventions
- There is no shop on the home page. An "Analogue Store" link sits in the hidden About menu (not followed). The newsletter pitch mentions store discounts.

## 9. Distinctive details
1. One morphing pill does four jobs:
   - nav (470×53, frosted, measured);
   - case label (coloured, 302×48, r 40, measured);
   - newsletter card (grown at the page end, screenshot);
   - the intro blob at load.
2. A generative light field that becomes a contained, rounded frame on scroll, with the hero sentence split and pushed to the frame edges.
3. A dot-matrix LCD face used only for nav labels, against Graphik Medium for everything else.
4. App-icon styling on the cases index: 224 px rounded squares, radius 15 (both measured), and a red notification badge "1" on the first tile (screenshot).
5. The black/grey two-tone statement: client names and "See all" / "Book call" set in grey `#7A7A7A` / `rgba(94,94,94,0.5)` (measured) inside the black display text.

## 10. Philosophy (inferred, one or two sentences)
- Inference: the site seems to treat the interface as a single living object that changes state, rather than a set of pages. Mood is established before any information is offered.

## 11. Evidence
Saved to `captures/analogue/`:
- `1440-home-intro-pill.png`: 1440, load frame with the small empty pill over the light field.
- `1440-home-top.png`: 1440, settled hero with the full frosted pill.
- `1440-home-scroll1200-frame.png`: 1440, the light contracted into an inset rounded frame, text halves at the edges.
- `1440-home-mid-statement.png`: 1440, the statement and "Jump to" cards.
- `1440-work-pill-morph.png`: 1440, the pill as an orange Vitra case label over the first case image.
- `1440-footer-pill-expanded.png`: 1440, the pill grown into the blue newsletter card, with the closing "Book call" invitation.
- `1440-pagechange-fade-400ms.png`: 1440, about 400 ms into the Home → Work change, page washed to white, pill persisting.
- `1440-cases-overview.png`: 1440, the Work index with 4-column rounded tiles.
- `390-home-top.png`: 390 (DPR 1), hero video with the full-width pill.
- `390-home-mid-statement.png`: 390, the 31 px statement and the "Jump to" horizontal carousel.

Not captured:
- The ABOUT panel open state and its timing: no automation method opened it (hover, mouse click, synthetic pointer events, touch tap).
- Reverse-scroll behaviour.
- Exact hover timings.
- Phone screenshots at DPR 3: the capture was tiled.

Cross-check with the prior capture (integration spec §3.1):
- Confirmed: the compact centred copy over blue/white radiating light; the light contracting into a contained rounded frame with off-white margins; explanatory material and casework after it.
- Refinements: on desktop the light is a WebGL canvas, not video (measured: 1 canvas with a webgl context, and the 2 videos are elsewhere). On phone it is a full-screen `<video>`.
- New here: the persistent nav pill's state changes, which the prior capture does not mention.
- Reverse scroll was not re-verified.
