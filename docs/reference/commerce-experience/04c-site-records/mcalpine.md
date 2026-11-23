# mcalpine (mcalpinehouse.com) — captured 2026-11-14, viewports 1440×900 and 390×844

Browser: Orca built-in browser. Desktop at 1440×900. Phone at 390×844 with mobile emulation, DPR 1 (`--scale 3` screenshots tile in this browser, so scale 1 was used; `innerWidth` was checked at 390).
Stack (measured): WordPress (`wp-singular` body class), swup page transitions (`swup-enabled` and `is-changing/is-leaving/is-rendering` classes on html), Lenis smooth scroll (`lenis lenis-smooth`). No gsap or three; 0 canvas; 3 videos.
Cookie banner: dismissed with **Accept necessary**.
Automation note: Orca's trusted clicks and mouse events did not trigger the site's handlers, so the menu and page change were driven with JS `element.click()`.

## 0. In one paragraph
The site of an architecture and interiors practice. It opens on a full-screen ambient video of a whitewashed brick wall with moving tree shadows. A huge, thin white serif wordmark sits across it. After a white showreel card, the whole home page is one centred stack of 25 single-word project names in a light display serif, each with a small Roman numeral (I–XXV). The menu is a frosted smoked-glass panel that slides in from the left. Strongest impression: the home page is an index of words, not images. Projects are named like virtues or moods, and type does nearly all the work.

## 1. Strategy (inferred)
- It presents a residential architecture and interiors studio, with books, press and furniture lines. It addresses prospective clients and the design press.
- The first viewport asks nothing. It shows the brand name over a place and invites scrolling. A "Play audio" toggle suggests an intended sound layer (it was disabled at the time of capture).

## 2. Scope (inferred)
- Projects (the home index anchors at `#projects`), Philosophy, Team, Books & Press, Furniture Lines and Contact.
- A showreel video.
- Social links (6), plus email and phone in the menu and footer.

## 3. Structure
- IA: 6 top-level items inside the menu, no visible inline nav. Projects are one level deep from the home list.
- Home order (measured y positions at 1440; document height 5,277 px):
  1. hero video with the wordmark, 1425×900 (0–900);
  2. showreel card, white, 900 tall, starting at y 810 and overlapping the hero by about 90 px. It holds a centred 475×306 video thumbnail, with "McAlpine" and "Showreel" set left and right like a title split across the card (screenshot);
  3. project list of 25 titles (1,710–4,394);
  4. footer, `#3D3C44`, 788 tall (4,489).
- Interaction model: a short scroll story that ends in a typographic index. You progress by scrolling and choosing a word.

## 4. Skeleton
- **Navigation:**
  - Fixed top-left: a 41×41 dark square monogram "Mc" at x 20, y 20, and a 36 px circular outlined burger beside it (measured burger width 36; phone 38×43).
  - Persistent. There is no inline nav at either width.
  - **Menu open (measured with `getAnimations`):**
    - The panel `.c-menu` slides in with `transform` 1,000 ms `cubic-bezier(0.23,1,0.32,1)`, starting at about 160 ms.
    - The six items each slide with `transform` 1,000 ms `cubic-bezier(0.165,0.84,0.44,1)`, staggered 0/50/100/150/200/250 ms.
    - The burger morphs to × with `transform` 300 ms and border colour 500 ms on the same curve.
    - Total about 1.28 s until quiet.
  - **Panel at 1440:** 801×900 from x 0 (measured), `rgba(62,62,67,0.65)` with `backdrop-filter: blur(50px)` (measured).
    - It appears inset about 8 px with rounded corners of about 16 px (estimated from screenshot; the computed radius on the container is 0, so the shape is likely on a child or clip).
    - A thin vertical rule at about x 297 separates an empty left column from the items (estimated).
    - Items are 64 px; socials and contacts are 15.6 px in two columns at the bottom.
  - **Panel at 390:** full width, 390×844 (measured), visually inset about 7 px with large rounded corners of about 30 px (estimated). The logo and × move to the centre top. Items are 40 px and centred (measured).
  - **Close (leaving via link):** panel `transform` 750 ms `cubic-bezier(0.38,0.005,0.215,1)` plus a `visibility` 750 ms change (measured).
- **Layout and grid (1440):**
  - The hero is full-bleed.
  - The showreel card is inset: x 28 at rest (estimated from screenshot). Its white panel widens toward full-bleed as you scroll (x about 6 in a later frame, screenshot), so the edge appears scrubbed.
  - The project list is a single centred column. Words are 96 px with an 86.4 px line-height (measured), so lines overlap slightly in leading. Each numeral sits superscript to the right of its word.
  - Very sparse: no images in the list at rest (the 92×61 thumbnails exist in the DOM but are hidden; measured 80 img/video nodes).
- **Information design:** small Roman numerals (I–XXV) as superscript indices beside each title. There are no dates, locations or categories on the home page.
- **Phone (390):**
  - The wordmark scales to the width.
  - The chapter words drop to 40/36 px (measured). Body text is 14 px (measured).
  - Document height 3,055 px (measured).
  - The menu becomes a full-screen rounded sheet.

## 5. Surface
- **Typography (measured):**
  - **Canela** (high-contrast display serif), weight 250 (light), used at 96 px for project titles (1440), 64 px for menu items and 40 px for both on phone. Line-height 0.9, no tracking, sentence case.
  - **Canela Text** (text serif), weights 400 and 400 italic: body 16/24 px at 1440 and 14 px at 390; 15.6 px menu footer links; 19.2 px some labels.
  - The cookie UI uses the system sans (third-party).
  - The hero wordmark is an outlined, high-contrast serif with a raised small "c" (a logotype, estimated as an image or SVG).
  - Measure is not applicable on the home page: there are no paragraphs.
- **Colour (measured):**
  - text `#241C18` (warm near-black);
  - ground white `#FFFFFF`;
  - footer `#3D3C44`;
  - menu glass `rgba(62,62,67,0.65)`.
  - The hero video is grey-white brick and olive foliage.
  - Shares: about 60% white, 25% video, 15% footer (estimated). Effectively 2 colours plus photography.
- **Surfaces and depth:**
  - Flat white page.
  - One strongly layered element: the blurred smoked-glass menu (50 px blur, measured).
  - The monogram square has no radius. The burger is circular with a hairline outline.
  - The showreel card overlaps the hero, giving one layered edge.
- **Imagery:** ambient real-time video (wall, shadow, plants). It is atmospheric, not documentary: no people and no building overview. The showreel thumbnail is a grainy black title card.
- **Controls:**
  - Circular outline burger.
  - "Play" as a small text pill over the showreel.
  - Project titles are full-width link overlays (an `<a>` sibling of each `<p>` title, measured).
  - Hover image reveals were **not observable**: mouse hover did not trigger in this browser.

## 6. Motion and interaction
- **Load:** a spinner loader (`spin`, 300 ms linear, infinite) and an animated audio-toggle line icon (`soundTogglerLines`, 1,200 ms linear, infinite), both measured. The full intro sequence was not timed.
- **Scroll:** Lenis smooth scroll. The showreel card edge widens with scroll (observed across two frames, so scrubbed). Content enters on `is-inview` classes (measured on the showreel container).
- **Page change (Home → Philosophy, measured via swup classes and `getAnimations`):**
  - 0–~2,000 ms: html is `is-changing is-animating is-leaving`. The menu closes (750 ms) and the content leaves to plain white; a frame at 500 ms shows only the monogram and burger.
  - ~2,020 ms: `is-rendering`.
  - ~2,040 ms: `.u-anim-page` opacity 300 ms `ease` fades the new page in. Images fade with opacity 250 ms linear at about 2.8 s.
  - The monogram and burger persist throughout.
  - The landed page is a centred single word "Philosophy" set large on white, then a full-bleed image (screenshot).
- **Back:** a swup-handled return (window state kept). Leaving from scrollY 400 returned to scrollY 0 (measured), so the scroll position was not restored.
- **Hover:** not captured. Measured transitions: header tool buttons `transform 0.5s cubic-bezier(0.165,0.84,0.44,1)`.

## 7. Voice
- Almost wordless. Projects are single abstract nouns in title case (virtues, moods, places). Navigation uses plain nouns. No taglines on the home page.
- Quote: "Wellness I / Portal II / Idyll III".

## 8. Commerce conventions
- None on the home page. "Furniture Lines" is listed in the menu (not followed).

## 9. Distinctive details
1. A home page index of 25 one-word project names at 96 px Canela Light, with Roman-numeral superscripts (measured). There are no images at rest.
2. Ambient wall-and-shadow video under a giant thin serif wordmark: place and light as the brand.
3. A smoked-glass menu panel with 50 px blur and 0.65 alpha (measured). Its items stagger in at 50 ms steps with 1 s ease-out (measured).
4. The tiny fixed monogram square and circular burger are the only persistent chrome.
5. A slow page change: about 2 s leave to white, then a 300 ms fade-in (measured).

## 10. Philosophy (inferred, one or two sentences)
- Inference: the site seems to believe that naming and restraint are enough. Each project is offered as a feeling-word, and the visitor is expected to slow down and choose.

## 11. Evidence
Saved to `captures/mcalpine/`:
- `1440-home-top.png`: 1440, hero video with the wordmark (cookie banner dismissed).
- `1440-home-showreel.png`: 1440, the white showreel card with "McAlpine" and "Showreel" flanking the thumbnail.
- `1440-home-showreel-card-growing.png`: 1440, the card edge widening over the hero during scroll.
- `1440-home-mid-chapters.png`: 1440, the project word list I–X.
- `1440-menu-opening-350ms.png`: 1440, the menu mid-slide, items still travelling.
- `1440-menu-open.png`: 1440, the menu settled.
- `1440-pagechange-white-500ms.png`: 1440, 500 ms into Home → Philosophy, white with chrome only.
- `1440-philosophy-landed.png`: 1440, the Philosophy page landed.
- `390-home-top.png`: 390, hero with the wordmark.
- `390-home-chapters.png`: 390, the project words at 40 px.
- `390-menu-open.png`: 390, the full-screen rounded glass menu sheet.

Not captured:
- The project-title hover state (no hover in this browser).
- The audio layer (toggle disabled).
- The precise intro/loader sequence.
- The menu panel's corner radius: it is visual only (estimated), not found in computed style.
