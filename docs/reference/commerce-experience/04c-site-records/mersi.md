# mersi (mersi-architecture.com) — captured 2026-11-14, viewports 1440×900 and 390×844

Browser: Orca built-in browser. Desktop at 1440×900. Phone at 390×844 with mobile emulation, DPR 1 (`--scale 3` screenshots tile in this browser, so scale 1 was used; `innerWidth` was checked at 390).
Stack (measured): Webflow (`window.Webflow`, `website-files.com` assets), GSAP 3.13.0 (`window.gsap`), Lenis smooth scroll. No three, barba or swup globals. 0 canvas, 0 video. Motion is GSAP-driven inline styles, so `document.getAnimations()` returned **0** CSS/WAAPI animations throughout (measured). All motion timings below are therefore **estimated** from frames.
Cookie banner: none appeared.
Automation note: Orca's scroll command did not move the Lenis-driven page, so scrolling used synthetic `WheelEvent`s from JS. The page change used JS `element.click()`.

## 0. In one paragraph
A Paris interior-architecture studio's site. The home page is an endless, looping project carousel driven by scroll. The screen is split down the middle into two full-height photographs, and a small coloured project card sits at the centre with an embossed "MS" monogram. Scrolling slides the two halves past each other, swapping both photographs and the card's colour per project. A film-grain texture covers everything. Strongest impression: the home page *is* the portfolio, as a continuous split-screen reel with no sections, no headline and no end.

## 1. Strategy (inferred)
- It presents residential, hospitality and retail interior-architecture work in Paris to prospective clients. French-language SEO title, English display headings on inner pages.
- The first viewport asks nothing explicit. It shows the first project (Hamelin) and invites scrolling, or clicking the card (arrow ↗ in its corner).

## 2. Scope (inferred)
- Projets, Agence, Process, Shop, Contact and an Instagram link.
- 10 projects on the home loop: Hamelin, Naya, Maurice Cafe St-Honoré, Berri, Cook, Segur, Tonnenami, Aurelien Cohen, Atokym, Paix.
- A Shop exists (not followed).

## 3. Structure
- IA: 5 items plus Instagram, inline on desktop. Depth is 1 from home (each card links to its project).
- Home order: a single fixed-viewport reel cycling the 10 projects in order and then repeating. The only other home content is a visually hidden-looking h1, a 10.8 px uppercase line placed at the bottom (measured y 899,728 of the document).
- Document height **900,425 px** at 1440 and 900,494 at 390 (measured). On load scrollY sits mid-document: it was about 450,875 after the first input and 450,000 after a return (measured), consistent with an infinite loop centred in a very tall document.
- Interaction model: a scroll-driven slideshow (an "index as reel"). You progress by wheel or swipe, or click the card to enter a project.

## 4. Skeleton
- **Navigation (1440):**
  - Fixed, top: the logo at the top left (a stacked "MER / SI" wordmark, about 70×32, estimated).
  - Top right: 5 text links plus a hairline dash and INSTAGRAM. They are set in Doner 7.2 px weight 700, uppercase, 0.72 px tracking (measured), `#EDE7DE` over photography (measured). On the Agence page they turn dark, with the active item in black and the others in grey (screenshot).
  - The links render each label twice (accessibility tree reads "PROJETS PROJETS"), consistent with a text-roll hover (not observed).
- **Navigation (390):** the logo, plus a single "MENU" text link at the right (29×10 at x 341, measured).
  - The menu panel (`.menu_w`, `.nav-menu`) exists at `display: none`.
  - It did **not** open after three attempts: a trusted Orca click, JS `.click()`, and synthetic pointer and touch events. The menu open state is **not captured**.
- **Layout and grid:**
  - **1440:** two equal full-height halves, each 720×900 image (measured), with no gutter.
  - Centred project card: 540×108 at x 450, y 396 (measured), radius 0 and no shadow (measured).
    - Card fill per project (Hamelin `rgb(187,126,74)` copper, measured). Others observed: rust for Naya and sage green for Maurice Cafe (estimated from screenshot).
    - Inside the card: name at the top left, location at the bottom left, type and year at the bottom right, an embossed "MS" monogram centred, and a small ↗ at the top right.
  - **390:** the split rotates to top and bottom halves of 390×422 each (measured). The card is 350×116 at x 20, y 364 (measured), straddling the seam. The year is dropped from the visible card (accessibility tree shows only location and type).
  - Density: one object per screen, otherwise full-bleed imagery. The empty beige ground appears only during transitions.
- **Information design:**
  - Card metadata in Switzer at about 9–10.8 px weight 600 (measured sizes in census: 7.2, 9 and 10.8 px).
  - Project name in Doner 20.88 px weight 700 (measured).
  - No rules. Metadata sits on the card corners like a label or ticket.
- **Phone (390):** the vertical split becomes a horizontal split, the inline nav collapses to MENU, the card spans almost the full width, and the type size holds (h2 20 px, measured).

## 5. Surface
- **Typography (measured):**
  - **Doner** 600/700 (wide, heavy grotesque or display; estimated classification, as the font is unfamiliar): nav 7.2 px uppercase, project names 20.88 px, small labels 7.2–10.8 px.
  - **Switzer Variable** 100–900 (neo-grotesque): body 14.4 px weight 500, line-height 15.84 px; metadata 7.2–10.8 px.
  - On Agence a heavy uppercase display headline is set very large, about 56 px with tight leading (estimated; the element was not matched by the h1/h2 probe).
  - Very small UI type against very large imagery.
- **Colour:**
  - ground `#EDE7DE` warm beige (measured);
  - text `#1A1A1A` (measured);
  - project card colours vary (copper `#BB7E4A` measured; rust and sage estimated);
  - a dark gradient overlay `rgba(26,26,26,0.4)` (measured), likely under the nav for legibility.
  - Shares on home: about 90% photography, 5% card, 5% chrome (estimated).
- **Surfaces and depth:**
  - Flat: radius 0 and no shadows on the card (measured).
  - The "depth" comes from texture: a full-screen fixed grain image with `mix-blend-mode: color-dodge`, `pointer-events: none` (measured), and an embossed or debossed monogram on the card (an image, estimated).
  - On Agence, small framed images sit in a cream bevelled mount (screenshot).
- **Imagery:** warm, desaturated interior photography (stairs, curved plaster, sofas, café façade, marble floors), with no people. Crops are tight details paired with wider rooms across the split. The imagery is the subject.
- **Controls:** no buttons on the home page. The card is the link, and the nav is tiny text. Hover not observed.

## 6. Motion and interaction
- **Load:** the first frame is a blank beige screen (screenshot at about 6 s after `goto`). The reel appears a few seconds later (estimated; not timed precisely).
- **Scroll (estimated from frames):**
  - Wheel input drives a continuous, smoothed slide.
  - The left half's images travel in one vertical direction and the right half's in the other, so mid-transition each half shows two projects stacked.
  - The card's colour fill wipes horizontally from one project colour to the next, while its text rolls vertically.
  - About 12 wheel steps of 100 px each moved scrollY by about 880 px over 3 s (measured), so roughly one viewport height of scroll per project change (estimated).
- **Page change (Home → Agence):**
  - The URL changed about 1,080 ms after the click with the window state kept (measured), so it is a client-side transition.
  - At about 350 ms the two image columns are retracting, the left upward and the right downward, revealing the grain-textured beige ground (screenshot). By about 850 ms the screen is empty beige and the nav has switched to dark with AGENCE active (screenshot).
  - The Agence page then fades or builds in (not timed). The logo and nav persist throughout.
- **Back:** returned to `/` at scrollY 450,000, not to the pre-click 452,315 (measured), so the reel restarts at its loop origin (Hamelin).
- **Hover:** not observed (hover does not register in this browser). The duplicated nav and card labels suggest roll-over text swaps.

## 7. Voice
- Near-silent on the home page: project name, district, type, year. Inner pages use English display slogans with French supporting lines in small caps.
- Quote: "Quiet luxury interiors shaped by true stories".

## 8. Commerce conventions
- None on the home page. A "Shop" nav item exists (not followed).

## 9. Distinctive details
1. A looped, effectively infinite scroll document (900,425 px, measured) that turns the home page into a continuous project reel.
2. A split-screen of two 720×900 photographs moving in opposite directions, rotated to a top/bottom split on phone (measured sizes).
3. A small flat project card (540×108, radius 0) as a coloured "label". Each project has its own fill, and there is an embossed MS monogram.
4. A film-grain overlay with `mix-blend-mode: color-dodge` over the whole UI (measured).
5. Navigation set at 7.2 px uppercase (measured), deliberately tiny against full-bleed imagery.

## 10. Philosophy (inferred, one or two sentences)
- Inference: the site seems to treat the portfolio as a tactile, printed object (grain, embossing, labels) and to believe that work should be met first as a continuous stream of rooms, not as an index to read.

## 11. Evidence
Saved to `captures/mersi/`:
- `1440-home-top.png`: 1440, the Hamelin split-screen with the copper card and nav.
- `1440-home-scroll-transition.png`: 1440, mid-scroll, with halves showing two projects each and the card wiping from rust to green.
- `1440-pagechange-columns-closing-350ms.png`: 1440, about 350 ms into Home → Agence, columns retracting to beige.
- `1440-agence-landed.png`: 1440, the Agence page landed, with a dark nav and AGENCE active.
- `390-home-top.png`: 390, the top/bottom split before the card appears.
- `390-home-card.png`: 390, the split with the Hamelin card at the seam.

Not captured:
- The phone menu open state (three methods failed; the panel stays `display: none`).
- Exact motion timings (no CSS/WAAPI animations exposed; GSAP inline).
- Hover states.
- The intro sequence timing.
- The project-detail page.
