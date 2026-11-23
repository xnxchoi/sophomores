# osklen (osklen.com.br) — captured 2026-11-14, viewports 1440×900 and 390×844

Browser: Orca built-in browser. Desktop at 1440×900. Phone at 390×844 with mobile emulation, DPR 1 (`--scale 3` screenshots tile in this browser, so scale 1 was used; `innerWidth` was checked at 390).
Stack (measured): a React app with Next.js markers (`window.next` present, no `__NEXT_DATA__`) and Tailwind utility classes (`absolute inset-x-0`, `h-[13.2px]`, `animate-pulse`). No VTEX runtime global was detected, although PDP URLs end in `/p` VTEX-style. No gsap, lenis or three. 1 canvas, 2 videos. A third-party chat widget ("weni") is present.
Cookie banner: none appeared during capture. Nothing was added to the bag.
Automation note: Orca's trusted click opened the phone Menu. Desktop navigation to the PLP and PDP used JS `element.click()`, and both were full document loads.

## 0. In one paragraph
A Brazilian fashion brand's shop. The home page is a sequence of large rounded image modules on a pale grey ground, beneath a floating row of small frosted-glass controls. Each module is a hero carousel, a two-up category pair, a product rail, a sustainability story or a campaign video. It still behaves as a conventional shop: category nav, search, account, wishlist, bag, and product rails with name and price. Strongest impression: an e-commerce skeleton dressed in soft glass and rounded photography, with the hero image floating over a blurred, darkened enlargement of itself.

## 1. Strategy (inferred)
- It sells apparel, shoes and bags (the SS Rio 26/27 collection, plus a Black Friday sale) to Brazilian shoppers, with copy mostly in Portuguese and category labels in English.
- The first viewport asks the visitor to "Shop Now" on the current campaign slide. A small pinned notice advertises 5% off for PIX payment.

## 2. Scope (inferred)
- Shop categories: New In, Men, Women, Shoes and Black Friday, plus "Ecosystem" (brand and sustainability content).
- Search, account (Entrar), wishlist, bag.
- Sustainability material stories (ASAP: recycled cotton, jute, pirarucu leather).
- Footer: stores, franchises, careers, Instituto-e.
- Help widget ("Ajuda") and an AI or sparkle assistant button (floating).

## 3. Structure
- IA: 6 top-level items. Men, Women, New In, Shoes and Black Friday carry `aria-expanded` (mega-menu triggers); clicking Men navigates to `/colecao/masculino`. Depth: category, then sub-category chips, then product.
- Home order (measured y positions at 1440; document height 6,242 px):
  1. hero carousel, 2 slides with a 7.5 s progress (0–1,060);
  2. two-up category pair, Standards and Women (1,024–1,842);
  3. "new arrivals" product rail with heading (1,898–2,750);
  4. ASAP sustainability statement with 3 material cards (2,783–5,186);
  5. campaign video module, "SS Rio 26/27 — Bags" (5,186–6,040);
  6. footer.
- Interaction model: a modular, scrolling shop home page. You progress by scrolling, with horizontal scrolling inside the rail and carousel.

## 4. Skeleton
- **Navigation (1440):**
  - Floating and fixed, with no bar. Separate frosted capsules float over the content:
    - category group: 487×28 at x 30, y 20;
    - search field: 180×28;
    - three 32×28 icon buttons (account, wishlist, and an unlabelled third);
    - Bag: 67×28.
  - All are `rgba(255,255,255,0.5)` with `backdrop-filter: blur(12px)` (search `blur(24px)`), radius 8 px (measured).
  - A centred "OSKLEN" wordmark. A "Shop Online / 5% Off PIX" capsule sits below the left group.
  - Persistent on scroll (observed).
- **Navigation (390):**
  - A circular logo button (39 px logo) and one wide capsule holding "Menu", "Buscar" and "Bag" (screenshot).
  - **Menu open:** the capsule expands; `width`, `padding-left` and `padding-right` transition over 300 ms `cubic-bezier(0.4,0,0.2,1)`, starting at about 210 ms after the tap (measured).
  - The menu becomes a glass sheet of 379×520 at x 5, y 20, `oklab(… / 0.7)` near-white, `blur(24px)`, radius 24 px, no shadow (measured).
  - It lists the 6 categories with chevrons, then a muted "Mais" group (account, orders, wishlist). "Menu" becomes "Fechar". The page behind dims to grey (screenshot).
  - Desktop mega menus were **not opened**: hover does not register in this browser.
- **Layout and grid (1440):**
  - Side margin 30 px (measured: nav x 30; category pair x 30 to 1395).
  - Hero media is contained and rounded: about 1,002×561 at x 250 (estimated from screenshot). Behind it, a 1,781×1,125 enlarged copy has `filter: blur(56px) brightness(0.75)` (measured).
  - Category pair: two cards of about 670 px each with a gap of about 25 px, radius about 32 px (estimated; 32 px radius values were measured on the page).
  - Product rail: 408×567 image cards, pitch 429 px so gap 21 px, image radius 14 px; 71 cards in the rail (measured). A grey scroll-progress bar sits under the rail.
  - PLP: a 4-column grid, edge to edge with **no gutter**: 356 px columns starting at x 0 (measured). The image area has rounded top corners (estimated). A grid-density toggle offers 2 / 4 / 8.
  - Density: medium, with generous vertical air between modules (about 30–60 px estimated).
- **Information design:**
  - Product card: name on the left, 14 px weight 500, black, capitalised; price on the right on the same line, 14 px weight 400 `#222` (measured).
  - Swatch dots (12–16 px circles, measured) with "+N" below on the PLP.
  - A small round quick-add bag icon at the bottom centre of the image.
  - Breadcrumb "Home › Coleção › Masculino" and category chips (pill buttons; the active chip is black-filled).
- **Phone (390):**
  - The nav collapses to logo plus a single capsule.
  - Rail cards go 2-up at about 195 px; long names wrap to 2 lines, with the price still right-aligned (screenshot).
  - The ASAP heading drops from 62 to 24 px (measured).
  - Document height 5,270 px (measured).

## 5. Surface
- **Typography (measured):**
  - **Suisse Intl** (neo-grotesque), 400/500. UI and body 16/24 px. Card text 14 px. Labels 10–13 px. Hero slide title 20 px weight 500 (390); about 20 px on desktop (screenshot similar).
  - **Neue Haas Grotesk Display Pro** 500 (grotesque display):
    - ASAP heading 62/58.9 px, −1.24 px (1440); 24/24 px, −0.48 px (390);
    - section heading "Novidades…" 22/20 px (1440), 17 px (390).
  - The ASAP paragraph is 26/28.6 px grey (1440).
  - Category link labels are 20 px (measured on the link); the visible "Standards / Women" pill labels look about 32 px (estimated from screenshot).
  - Sentence case throughout. Tight negative tracking on display sizes.
- **Colour (measured):**
  - ground `#F8F8F8`;
  - body text `#333333`;
  - names black;
  - price `#222`;
  - CTA button `#343434` with white text;
  - footer `#8F8F8F`;
  - glass `rgba(255,255,255,0.5)`.
  - Shares: about 55% grey-white ground, 40% photography, 5% UI (estimated). Achromatic apart from photography.
- **Surfaces and depth:**
  - Rounded everywhere. Measured radii include 2, 4, 6, 8, 12, 14, 15, 16, 17, 24, 32 and 36 px, and pills (radius about 1.67e7 px).
  - Shadows: soft `0 0 12px rgba(0,0,0,0.12)` (14 instances) and one `0 8px 16px rgba(26,52,112,0.1)` (measured).
  - Frosted glass on every nav control and on the PDP purchase panels.
  - Layered: glass over imagery over a blurred image backdrop.
- **Imagery:** studio product-on-model photography on pale grey (PLP, rail), plus location editorial for campaigns (a rowing boathouse) and black-and-white material macro shots (ASAP). People are present and full-length, and the imagery carries the subject.
- **Controls:**
  - 28 px tall glass capsules (desktop nav).
  - "Shop Now" as a small glass pill over the image.
  - Circular 44 px icon buttons (sparkle assistant; estimated).
  - Product links without underline.
  - PDP "Adicionar à Sacola": 374×42, radius 6, `#343434` (measured). Sizes P/M/G/GG as 46 px circles (estimated).

## 6. Motion and interaction
- **Load:** skeleton loaders (`osk-pulse`, 2,000 ms linear) on product data (measured). A newsletter prompt enters after a 2,000 ms delay (`newsletter-enter`, 500 ms, measured; the prompt itself was not seen open).
- **Hero carousel:** `hero-banner-progress` 7,500 ms linear (measured), so slides auto-advance about every 7.5 s. A pill pager sits at the bottom centre.
- **Recurring transitions (measured):** `opacity` 520 ms `ease` and `transform` 520 ms `cubic-bezier(0.215,0.61,0.355,1)` on carousel tracks; `background-color` and `border-radius` 400 ms `ease` on button spans.
- **Page change:** full document navigations (measured `navigation.type = navigate`). The new page reported duration 1,182 ms, DCL 90 ms and FCP 108 ms. The PLP grid paints empty, and the chips and filters appear first, with products about 1 s later (screenshot at about 300 ms). There is no transition choreography. The glass nav re-renders in place.
- **Scroll:** native, with no smooth-scroll library and no scrubbed effects observed.
- **Hover:** each product card has a second image at opacity 0 (2 images per card, measured), consistent with a hover image swap. The swap was not observed because hover does not register here.

## 7. Voice
- Brief, commercial and bilingual: English nav and campaign labels ("New In", "Shop Now"), Portuguese descriptions and sustainability copy. Calm and declarative, with no humour. Sentence case.
- Quote: "ASAP — As Sustainable as Possible, as Soon as Possible".

## 8. Commerce conventions
- **Home rail card:** image (radius 14), name left and price right on one line, e.g. `R$ 1.597` (Brazilian thousand separator, no cents shown). A quick-add bag icon sits on the image.
- **PLP card:** the same name and price row, swatch dots plus "+N" beneath, and a second hover image. Chips for sub-categories, "Filtrar", "Ordenar", and a 2/4/8 grid-density toggle.
- **PDP:**
  - Full-bleed horizontal image gallery with expand and next controls.
  - Floating glass panels on the right: name and price (17 px weight 500), a short description, colour name plus swatches, a "Descubra seu tamanho" size-guide link, round size buttons, and the black "Adicionar à Sacola" button.
  - Instalment line "Em até 7x de R$ 113,85 sem juros" at 11 px grey (measured), with cents in the instalment.
  - A wishlist bookmark icon.
- **Cart affordance:** "Bag" capsule with a bag icon (aria label "Bag, 0 itens"). PIX discount noted in a pinned capsule. Checkout entry not observed.
- **Prior note cross-check (04b-references):** the earlier note said floating controls over large imagery, then a plain rail with name and price on one line. It **still holds** (measured: separate glass capsules floating over the hero; rail cards with name and price on one row).

## 9. Distinctive details
1. A hero that floats a rounded image over a blurred (56 px), darkened (0.75) enlargement of itself (measured filter).
2. Nav as separate small frosted capsules, 28 px tall with 8 px radius at `blur(12px)` (measured), rather than a header bar.
3. A PLP grid density switch (2 / 4 / 8) and a gutterless 4-up grid (measured).
4. A PDP buy box built as stacked glass cards over full-bleed photography.
5. The ASAP sustainability manifesto as a 62 px display statement inside a shop home page.

## 10. Philosophy (inferred, one or two sentences)
- Inference: the site seems to want a standard, efficient shop that feels softer and more editorial through glass, rounding and large imagery, without giving up conventional commerce patterns.

## 11. Evidence
Saved to `captures/osklen/`:
- `1440-home-top.png`: 1440, the hero (SS Rio 26/27 slide) over its blurred backdrop, with the glass nav capsules.
- `1440-home-mid-categories.png`: 1440, the Standards / Women category pair and the rail heading.
- `1440-home-product-rail.png`: 1440, the product rail with name and price on one line, a scroll bar, and the ASAP heading.
- `1440-plp-men.png`: 1440, the Men PLP with breadcrumb, chips, filter, grid toggle and the gutterless 4-up grid.
- `1440-pdp-product.png`: 1440, the product page with gallery and glass buy-box panels (nothing added).
- `390-home-top.png`: 390, the hero (Black Friday slide) with logo button and the single nav capsule.
- `390-menu-open.png`: 390, the glass menu sheet open.
- `390-home-product-rail.png`: 390, 2-up rail cards and the ASAP heading.

Not captured:
- Desktop mega-menu open state (hover not registered).
- Card hover image swap (inferred from the DOM only).
- The ASAP material-card "Ler mais" interaction.
- The newsletter prompt.
- Checkout.
- Back-navigation scroll restoration (navigation went home → PLP → PDP, and then directly to home via `goto`).
