# osklen: motion, captured 2026-11-15 (1440×900, 390×844)

Sources:
- Runs, all under `MC/out/osklen/`:
  - `osklen-header`, `-header2` and `-header3`: header;
  - `osklen-home`: shop home;
  - `osklen-plp`: home → PLP, then PLP;
  - `osklen-pdp` and `-pdp2`: PLP → PDP, PDP, back;
  - `osklen-mobile`: phone.
- Each run has `.events.json` (recorder), `.samples.json` (per-frame sampler) and `*.summary.txt`.
- The per-frame sampler is `MC/sites/osklen-sampler.mjs`. It records the rect, opacity, translate, backdrop and colour of every fixed or sticky element, plus chosen cards, on each frame. It exists because many Osklen state changes are **instant class swaps** that no transition or animation API reports.

How measured numbers are labelled:
- **Declared** (CSS transition or animation, or WAAPI): exact.
- **Sampled**: from the per-frame sampler.
  - The main runs sampled hundreds of elements at a median gap of 33–77 ms (about 15–30 fps). Spans sampled there are coarse, ±1 sample, and are used mainly to tell instant from animated.
  - The header open and close timings were re-measured in `osklen-fps`: the GPU-flag recorder, a light sampler, rAF at 61 fps and a median gap of 17 ms. Those 60 fps figures are the ones quoted for the panel.
  - The analyzer was re-run after both coordinator fixes. The only fitted easing quoted here is the zoom × pointer-follow (linear).
- **Estimated**: from video frames. The video timeline is offset from the marks, so it is used for order only.

## 0. Motion in one paragraph
Fast and mostly CSS-driven: Tailwind transitions, no JS animation library.

One header interaction is a set of separate, per-element changes:
- some elements **snap** with no transition: the capsules merge into one glass bar, the scrim appears, the search field jumps wide;
- the panel's size opens on a front-loaded expo-out curve over 300 ms, so it is visually full in about 65 ms;
- content fades in after it, delayed and on its own curve;
- the logo fades on a third curve.

The other property classes follow different rules:
- **Size and shape:** 300–400 ms, and usually front-loaded.
- **Opacity:** 150–300 ms, often delayed or offset.
- **Position:** longer and symmetric:
  - 450 ms ease-in-out cubic for the header sliding to the bottom;
  - 500 ms for the content block lifting over the hero;
  - 400 ms for 16 px reveals;
  - 1000 ms after a 500 ms delay for the 18 px rise of PLP cards.
- **Snaps:** several position changes that the code intends to animate actually snap. The cause is a Tailwind v4 `translate`/`transform` mismatch, described in §5.

Sequencing comes from delays and from opening and closing in reverse order, not from staggers. No list stagger was found anywhere.

## 1. Stack
- **No animation libraries.** No `gsap`, Motion, Lenis, Barba or Three were found: there are no globals and no GSAP tweens were recorded.
- **Tailwind v4 classes.** Arbitrary values such as `duration-[520ms]`, `ease-[cubic-bezier(...)]`, `group-hover/card:`, `data-[visible=true]:` and `motion-reduce:`. Utilities such as `translate-y-4` set the separate CSS `translate` property, which matters in §5.
- **Splide** for the home product rail (`splide__list` and `splide__slide` classes).
- **One WAAPI animation:** the Ecosystem media "nudge". It was found as a plain `Animation` object, not as a CSSAnimation.
- **Scroll-linked effects** use inline `style.transform` written from a scroll handler.
- **deco.cx / React**, from the footer "deco" link and the React IDs (`_R_…`).
- **Native scroll.** No smooth-scroll library; `scroll-behavior: auto`.
- **Third-party:** the "weni" Personal Shopper widget (`weni-slide-in` 250 ms).
- **Bag drawer timing curve:** `cubic-bezier(0.32,0.72,0,1)`. This is the curve Vaul uses, but it appears here as a Tailwind class, not the library.

## 2. Load and intro

**Home** (offsets from navigation start):

| +offset | element | property | duration | delay | easing | how measured |
|---|---|---|---|---|---|---|
| ~300 ms | hero slide progress fill | width 0→100% | 7,500 ms | 0 | linear | declared |
| ~300 ms | product skeletons (48 blocks) | `osk-pulse` | 2,000 ms, infinite | 0 | linear | declared |
| ~1,100 ms | hero blurred-backdrop canvas | opacity 0→1 | 520 ms | 0 | ease | declared |
| ~450 ms | newsletter prompt (bottom right) | `newsletter-enter`: opacity 0→1, translateY(−100%)→0, visibility | 500 ms | 2,000 ms | `cubic-bezier(0,0,0.2,1)` (keyframes) | declared |
| after loading, scroll-triggered | rail quick-add icons | opacity (resting state) | 300 ms | 0 | `cubic-bezier(0,0,0.2,1)` | declared |

- No headline, hero or type entrance was found; the hero is simply there.
- The rail products load lazily when scrolled near.

**PLP and PDP load:** see §3.

## 3. Page change
- **Every move is a full document reload.** This holds for home → PLP ("Ver Todos" in the Men panel), PLP → PDP (card click) and back. `navigation.type` was `navigate`, then `back_forward` on Back.
  - home → PLP: the new document started +53 ms after the click; DCL 41 ms; load 716 ms after navigation start.
  - PLP → PDP: DCL 47 ms; load 820 ms.
- **No exit animation and no cover.** The old page stays until the new one paints.
- **The header persists only visually:** it re-renders in the same place.
- **PLP entrance:**

| +offset from click | element | property | duration | delay | easing | how measured |
|---|---|---|---|---|---|---|
| ~0–300 ms | header, breadcrumb, title, filter bar | appear, no motion | — | — | — | estimated |
| ~300 ms | category chips | appear, no motion | — | — | — | estimated |
| +85 ms | every product card `li` (24) | `plp-slide-up`: opacity 0→1, translateY 18 px→0 | 1,000 ms | 500 ms, **identical for all cards (no stagger)** | `cubic-bezier(0.4,0,0.2,1)` in keyframes | declared |
| ~+1.4 s and later | grid density 8 and appended items | the same `plp-slide-up`, after a spinner (`spin` 1,000 ms linear) | 1,000 ms | 500 ms | same | declared |

- **PDP entrance:** no entrance animation of any kind. The gallery and buy-box panels paint as they load (screenshot at about 1 s).
- **Back to the PLP:** a full reload (`back_forward`) that lands at the top of the page (`scrollY` 0). The cards play `plp-slide-up` again.
- **Total settle time:** about 1.5 s on the PLP (delay plus animation) and about 0.8 s on the PDP.

## 4. Navigation and menu (1440)

All header easings below are declared. Durations are declared, and the actual visible spans are sampled. Pointer arrival to class flip took 20–160 ms. That figure includes automation latency, and no deliberate hover-intent delay could be isolated.

The header is fixed: the separate capsules are New In, Men, Women, Shoes and Black Friday, Ecosystem, the search capsule (180×28), Entrar, Lista de desejos, Bag, the centred logo, and the promo capsule. The logo is `mix-blend-difference`, white, `scale-[1.2]`.

### 4.1 Hover a category (New In, Men, Women, Shoes, Black Friday): open
The sequence is the same for all five; only the submenu content differs. Times are from the class flip (t = 0).

| t | element | property | duration | delay | easing | how measured |
|---|---|---|---|---|---|---|
| 0 | the hovered link | background → `rgba(255,255,255,0.7)` | instant | — | none | sampled |
| 0 | the category capsule and the Bag capsule | glass removed (background transparent, `backdrop-filter` none) | instant | — | none | sampled |
| 0 | the full-width bar behind the header (`z-[51]`) | glass on (`rgba(255,255,255,0.5)`); height 28→30 px, which shifts the page 2 px | instant | — | none | sampled |
| 0 | the search capsule | x 1051→737, width 180→**496** | **instant** (no transition on open) | — | none | sampled |
| 0 | Entrar, Lista and Bag | shift by 1–2 px | instant | — | none | sampled |
| 0 | the page dim layer (`bg-[#555555]/40`) | opacity 0→1 | **instant** | — | none | sampled |
| 0 | the mega panel (1380×422, `bg-white/70`) | opacity 0→1 | instant (0 s in its open state) | — | — | declared |
| 0 | mega panel | max-height 0→461–499 px | 300 ms; **visible height 0→422 in 64–66 ms** (60 fps re-run; the panel's own height is fixed at 422 px, so the expo-out curve clears it early) | 0 | `cubic-bezier(0.16,1,0.3,1)` | declared; visible span sampled |
| 0 | mega panel | backdrop-filter none→`blur(20px)` | 300 ms | 0 | `cubic-bezier(0.16,1,0.3,1)` | declared |
| 0 | the logo | opacity 1→0 | 150 ms | 0 | `cubic-bezier(0.4,0,0.2,1)` | declared |
| 200 ms | the submenu content (`#submenu-<Category>`) | opacity 0→1 | 200 ms | 200 ms | **ease-in** | declared |

### 4.2 Category: close (pointer leaves)

| t | element | property | duration | delay | easing | how measured |
|---|---|---|---|---|---|---|
| 0 | the capsules' glass back, the bar's glass off, the 2 px shift back, the dim layer off | as in 4.1, reversed | instant | — | none | sampled |
| 0 | search capsule | width 496→180, height 26→28, margin-right | **300 ms** | 0 | `cubic-bezier(0.4,0,0.2,1)` | declared |
| 0 | mega panel | max-height →0 (visible 422→0 in about 234 ms at 60 fps); backdrop-filter →none | 300 ms | 0 | `cubic-bezier(0.16,1,0.3,1)` | declared; span sampled |
| 0 | submenu content | opacity 1→0 | 200 ms | 0 | ease | declared |
| 0 | logo | opacity 0→1 | 150 ms | 0 | `cubic-bezier(0.4,0,0.2,1)` | declared |
| 270 ms | mega panel | opacity 1→0 | 30 ms | 270 ms | ease | declared |

The search field is asymmetric: it **jumps open and eases closed**.

### 4.3 Moving straight from one category to the next
- **The panel morphs, it does not re-open.** Panel, bar, glass and dim layer stay as they are. The panel's max-height re-targets (for example 461→499 px, 300 ms, same curve), but its height is fixed at 422 px, so nothing visibly moves.
- **The content is swapped with a sequential crossfade:**
  - the old submenu fades out over 200 ms with `ease` and no delay;
  - the new one fades in over 200 ms with `ease-in` after a 200 ms delay.
  - The fades do not overlap, so there is about a 200 ms gap at low opacity. Sampled fade-out was 185–197 ms and fade-in 187–202 ms.
- **Fast diagonal moves** (Black Friday → Men, passing over Shoes) run the crossfade once per category passed: Shoes, then Men.
- **Moving onto Ecosystem closes the panel** with the full close sequence of 4.2. Ecosystem has no hover panel.

### 4.4 Ecosystem (click; full-screen takeover)

| t from click | element | property | duration | delay | easing | how measured |
|---|---|---|---|---|---|---|
| 110–664 ms, after a lazy load (110 ms on the second visit) | the whole header | translateY 0→855 px and scaleX 1→0.97: it **slides to the bottom edge** | 450 ms | 0 | `cubic-bezier(0.645,0.045,0.355,1)` (in-out cubic) | declared; span sampled at 384–457 ms |
| same | logo | top 17→863 px, moving with the header | 450 ms | 0 | same | declared |
| same | the header container | glass `rgba(255,255,255,0.18)`, `blur(12px)`, top radius 21.856 px | instant | — | none | sampled |
| same | the Ecosystem overlay (`bg-[#111]`, full screen) | opacity 0→1 | 500 ms | 0 | `cubic-bezier(0.4,0,0.2,1)` | declared |
| same | the first text plate | `plate-swap-in`: opacity 0→1, translateY 10 px→0 | 460 ms | 0 | `cubic-bezier(0.22,1,0.36,1)` in keyframes | declared |
| +350 ms after mount | 48 media cards | WAAPI translateX 0→−22→0 px (a "swipe me" nudge) | 2,400 ms ×3 | 350 ms | `cubic-bezier(0.45,0,0.55,1)` | declared |

**Close** ("Voltar à Loja", bottom right):
- the header and logo return over 450 ms on the same in-out cubic (declared);
- the glass is removed instantly at the end, about +544 ms (sampled).

### 4.5 Search (click the search capsule)
**Open:**
1. **0:** the "Buscar" label button snaps to opacity 0 (sampled). The logo fades out over 150 ms on `cubic-bezier(0.4,0,0.2,1)`.
2. **About +50–120 ms:** the input bar `#menuSearchInput` mounts at 180 px. Its width (to 1380), padding-left and padding-right, margin-right and line-height animate over 300 ms on `cubic-bezier(0.4,0,0.2,1)` (declared).
3. **About +410 ms, after stage 2 finishes:**
   - the bar's height grows 28→42 over 300 ms on the same curve;
   - the dropdown `#searchContent` (`bg-white/70`, `blur(24px)`, radius 12) animates max-height 0→446, opacity and visibility over 300 ms **after a 180 ms delay**, on the same curve.
   - Sampled: the dropdown is visible from about +580 to +850–940 ms.

**Close** (the "Fechar busca" ×, or clicking away; **Escape does not close it**). It runs in reverse, faster at the start:
1. **0:** the dropdown max-height, opacity and visibility close over **150 ms** with no delay. The bar's height eases 42→28 over 300 ms.
2. **About +290–380 ms:** width, padding, margin and line-height collapse over 300 ms.
3. **About +610–650 ms:** the "Buscar" label snaps back.
4. **About +640–770 ms:** the logo fades in over 150 ms.

Hovering the search capsule (without clicking) widens it 180→220 px, growing leftward, over 300 ms on `cubic-bezier(0.4,0,0.2,1)` (declared). Unhovering reverses it.

### 4.6 Account, wishlist and bag hover
**No change at all** in computed colour, fill, background, opacity or transform on the element or its descendants, including SVG (measured by diffing styles before and after hover). The logo hover also does nothing.

The promo capsule ("Shop Online 5% Off PIX") reveals a close × on hover: opacity over 150 ms on `cubic-bezier(0.4,0,0.2,1)` (declared).

### 4.7 Bag (click; empty bag)

| t from click | element | property | duration | easing | how measured |
|---|---|---|---|---|---|
| 0 | body | `no-scroll` (the page locks) | — | — | declared |
| about 330–470 ms (cart fetch) | scrim (`bg-[#555555]/40`, `backdrop-blur-xl`) | opacity 0→1 | 300 ms | `cubic-bezier(0.32,0.72,0,1)` | declared |
| same | drawer card: 423×469 at top right, radius 21, `bg-[#F6F6F6]/80`, `blur(24px)` | opacity 0→1; **translate jumps from off-screen to 0 in one frame** | 300 ms (opacity only) | same | declared plus sampled |

**Close** (the ×, Escape or the scrim all work):
- the drawer's translate jumps to `calc(100%+8px)` (off-screen) on the first frame;
- its 300 ms opacity fade then runs off-screen;
- the scrim fades out over 300 ms.
- Visually: **the bag fades in in place and disappears at once.**

### 4.8 Scroll (header)
- The header does **not** hide, shrink or restyle on scroll, in either direction.
- After scrolling starts, the promo capsule collapses instantly (sampled, one frame) into a small "1 Notificações" chip.
- The chip stayed collapsed after scrolling back to the top in the same session.
- Hovering Men while scrolled gives the identical sequence to 4.1.

## 5. Hover and micro-interactions
- **Hero:**
  - Pager dots: opacity 0.7→0.9 over 400 ms `ease` on hover (declared).
  - On a slide change, the active dot pill's width changes 8↔22 px, along with its background-color and border-radius: 400 ms `ease` (declared).
  - Hovering the hero image does nothing.
- **Category pair (Standards and Women):** hovering a card reveals the word "Shop" in the pill label: the span width goes 0→72 px and the pill 159→236 px. The change is **instant** (sampled, one frame), from `group-hover:w-[4.5rem]` with no transition.
- **Product card (home rail and PLP, identical):**
  - **Image swap:** the second image goes opacity 0→1 and the first 1→0, **instantly** (sampled; no transition).
  - **Wishlist bookmark** (top right): opacity 0→1 over 200 ms on `cubic-bezier(0.4,0,0.2,1)`, with no delay.
  - **Quick-add bag button** (bottom centre):
    - opacity 0→1 over 300 ms on `cubic-bezier(0,0,0.2,1)`, **after a 200 ms delay on hover-in**;
    - on hover-out it fades with **no delay**;
    - its `translate-y-4`→0 (16 px) **snaps in one frame**. The class lists `transition-[opacity,transform]`, but Tailwind v4's `translate-y-*` sets `translate`, which that list does not include.
    - Result: the bookmark appears first and the bag 200 ms later.
  - **Quick-add tooltip** ("Adicionar à sacola"): opacity over 200 ms on `cubic-bezier(0,0,0.2,1)`; its 6 px translate also snaps. Measured: declared, plus sampled translate.
  - **Pointer passing during scroll:** hover states fire on cards that scroll under a still pointer.
- **PLP:**
  - Chips: border colour over 300 ms on `cubic-bezier(0.4,0,0.2,1)`.
  - Swatch "+N": background hover, instant.
  - **Sort (Ordenar)** is a native `<select>`, with no custom motion.
  - **Filtrar:**
    - **Open:** a panel of stacked glass cards slides in from the **left** (translate, 300 ms, `cubic-bezier(0,0,0.2,1)`). The grey scrim fades in over 300 ms on `cubic-bezier(0.4,0,0.2,1)`. Both are declared and start about 350 ms after the click.
    - **Stagger:** none; the cards move as one.
    - **Close (Fechar):** no transition was recorded, and the video shows it vanishing within one frame (estimated).
  - **Grid density 2 / 4 / 8:** an instant reflow (card widths 360→720 and so on in one frame). Density 8 fetches more items: a spinner, then new cards with `plp-slide-up`.
- **PDP:**
  - **Gallery:** a horizontal `overflow-x:auto` strip of 675×900 images (13,500 px wide), native scroll with no snap. A vertical wheel over it scrolls the page.
  - **Expand (zoom):**
    - a full-screen `#ececec` viewer appears instantly;
    - thumbnails change slides with a track transform of 200 ms on `cubic-bezier(0,0,0.2,1)` (declared);
    - **the "Fechar zoom" × button follows the pointer.** Its inline top and left are rewritten on every mousemove; the left fit is linear with rms 0.035, so it moves 1:1 with the pointer and has no lag.
  - **Size buttons** (46 px circles):
    - hover adds a 1 px black border, **instant**;
    - selection fills `#3A3A3A` with white text, **instant**. Both were measured by computed-style diff.
  - **"Adicionar à Sacola" hover:** no visible change (not clicked).
  - **Expand and scroll-down buttons:** background over 200 ms on `cubic-bezier(0.4,0,0.2,1)`.
  - **Accordions** (Informação, Composição and others):
    - height over **350 ms `ease`** (declared);
    - inner content opacity over 200 ms on `cubic-bezier(0.4,0,0.2,1)`, simultaneous;
    - the same timing for open and close.
  - **CEP accordion:** grid-template-rows, padding-top, transform, opacity and background over 300 ms on `cubic-bezier(0.4,0,0.2,1)`.
  - **Editorial image lower on the page:** `scale` 1→1.05 on hover over 500 ms on `cubic-bezier(0,0,0.2,1)`.
- **No custom cursor**, except the zoom viewer's pointer-following ×.

## 6. Scroll
- **Native scroll**, with no smoothing library.
- **The content lifts over the hero.** After the first scroll, the block below the hero (`div.block`, 5,025 px tall) gets `-translate-y-36`: translateY 0→−144 px over 500 ms on `cubic-bezier(0.4,0,0.2,1)`. This is triggered, not scrubbed (declared). It reverses over 500 ms on return to the top. The same happens on the phone.
- **ASAP heading and paragraph:** a triggered reveal through `data-visible`, translate 16 px→0 plus opacity 0→1 over 400 ms on `cubic-bezier(0.4,0,0.2,1)` (declared; sampled at 381–403 ms). The paragraph fires about 370 ms later because it reaches its own threshold; there is no timed stagger.
- **ASAP material cards (3):** a sticky stack.
  - Each card is offset by translateY(0/32/64 px).
  - As the next card covers it, its inline `transform: scale()` is **scrubbed** from scroll position, 1→0.77 for the first card. The step is about −0.00996 per 100 px of wheel, and there is no smoothing: the value changes only on scroll events.
- **Rail:** Splide, scrolled horizontally by wheel or drag.
- **No parallax** was observed apart from the stacked scale.
- **No pinned sections** other than the sticky ASAP stack.

## 7. Type in motion
- **No per-letter, per-word, per-line or mask animation** anywhere.
- Text either appears with its block or fades and rises with it: ASAP 16 px over 400 ms; PLP cards 18 px over 1,000 ms; the Ecosystem plate 10 px over 460 ms.
- Label swaps are instant: "Menu" to "Fechar", and "Buscar" hidden and shown.

## 8. Phone differences (390×844, touch)
- **Menu, tap "Menu":**
  - the logo pill widens 43→73 px (the logo SVG 38→55 px) while the nav capsule narrows 332→302 px: width over 300 ms on `cubic-bezier(0.4,0,0.2,1)`, both at once (declared);
  - "Menu" becomes "Fechar";
  - the glass sheet (379×520, `#mobile-menu-drawer`) **mounts at full size in one frame** with no transition (sampled), and the page dims.
- **Submenu (tap Men):** the list is replaced **in place, instantly**, with a "‹ Men" back control at the bottom of the sheet (sampled plus screenshot).
- **Search:**
  - the capsule width changes over 300 ms;
  - "Buscar" fades out over 150 ms;
  - the overlay sheet (379×583) mounts instantly.
- **Bag:** the same Vaul-curve 300 ms fade as desktop, with a 374×635 card. Close snaps the translate as on desktop.
- **Filter (PLP):** the panel slides **up from the bottom** (translate over 300 ms on `cubic-bezier(0,0,0.2,1)`), with the scrim over 300 ms. Desktop slides from the left.
- **Listing:** 2-up cards. There is no hover, so the image swap, bookmark and quick-add never show in the touch flow.
- **PDP:**
  - full-width image;
  - stacked glass panels below;
  - a sticky bottom bar, "Selecione um tamanho" (it reads "Adicionar à Sacola" on desktop);
  - no motion on scroll except the promo-chip collapse.
- **Scroll:** the same content lift (500 ms) and ASAP reveal (400 ms) as desktop.

## 9. Vocabulary (declared curves; count = distinct element/property uses found)

| curve | uses | durations | property classes |
|---|---|---|---|
| `cubic-bezier(0.4,0,0.2,1)` (Tailwind default and `ease-in-out`) | about 20 | 150, 200, 300, 400, 500 ms | sizes (search width/height/padding, phone capsules, CEP rows), opacity (logo, scrims, ASAP, Ecosystem overlay, accordion content), position (content lift 500, ASAP translate 400), colour (chips, buttons) |
| `cubic-bezier(0.16,1,0.3,1)` (expo-out-like) | 2 | 300 ms | mega panel max-height and backdrop-filter (size, surface) |
| `cubic-bezier(0,0,0.2,1)` (`ease-out`) | 7 | 200, 300, 500 ms | opacity (quick-add, tooltip), position (filter drawer 300, zoom track 200, newsletter 500), scale (image hover 500) |
| `ease` | 5 | 30, 200, 350, 400, 520 ms | opacity (submenu out, panel 30 ms, hero backdrop 520), height (accordion 350), dot width/colour 400 |
| `ease-in` | 1 | 200 ms (+200 delay) | submenu fade-in |
| `cubic-bezier(0.215,0.61,0.355,1)` (ease-out cubic) | 1 | 520 ms | hero slide track (position) |
| `cubic-bezier(0.645,0.045,0.355,1)` (ease-in-out cubic) | 2 | 450 ms | Ecosystem header slide and logo top (position) |
| `cubic-bezier(0.32,0.72,0,1)` (Vaul curve) | 2 | 300 ms | bag card and scrim opacity |
| `cubic-bezier(0.22,1,0.36,1)` (ease-out quint) | 1 | 460 ms | Ecosystem plate (opacity plus 10 px) |
| `cubic-bezier(0.45,0,0.55,1)` (ease-in-out sine) | 1 | 2,400 ms ×3 | media nudge, −22 px |
| linear | 4 | 1,000 / 2,000 / 7,500 ms | spinner, skeleton pulse, hero progress, scroll-linked scale |
| **none: instant class swap** | about 15 | 0 | glass on/off, dim layers, search jump-open, link hover background, image swap, "Shop" reveal, size states, grid reflow, menu and search sheets on phone, zoom viewer, filter close, bag translate, quick-add and tooltip translate |

**Durations by count:**

| duration | approximate uses |
|---|---|
| 300 ms | about 18 |
| 200 ms | about 9 |
| 150 ms | 4 |
| 400 ms | 4 |
| 500 ms | 4 |
| 450 and 520 ms | 2 each |
| 350, 460 and 1,000 ms | 1 each |

**Delays used:** 200 ms (submenu in, quick-add in), 180 ms (search dropdown), 270 ms (panel opacity out), 350 ms (nudge), 500 ms (PLP cards), 2,000 ms (newsletter).

## 10. Sequencing, and the owner's reading
**How concurrent animations are offset:**
- **Choreography comes from delays and from reverse ordering**, never from list staggers. All 24 PLP cards share the same 500 ms delay; filter cards move as one block; the menu items do not stagger.
- **Header open:**
  1. at 0, structural snaps (glass, dim layer, search jump);
  2. at 0, the panel size runs (expo-out, so it is visually done by about 65 ms) together with the logo fading out (150 ms, standard curve);
  3. at 200 ms, the content fades in on `ease-in`. Content therefore arrives only after the shape has settled.
- **Header close:**
  1. at 0, content out (200 ms `ease`), panel size (expo-out), search width (300 ms standard) and logo in (150 ms);
  2. at 270 ms, the panel's opacity is cut over 30 ms. That is a cleanup, not a visible fade.
- **Search:** two stages. Width first, then height and dropdown (a further 180 ms delay). Close is the mirror image, faster at the start (150 ms dropdown).
- **Quick-add:** the bookmark at 0, the bag at +200 ms, on different curves (standard vs ease-out).

**"Snappy for size and shape, subdued for position": what the measurements show**
- **Size and shape: supported.**
  - The mega panel's size uses an expo-out curve; its visible 0→422 px takes about 65 ms of a 300 ms transition (60 fps re-run).
  - Other size changes are 300 ms on the front-loaded standard curve: search width, phone capsules, the CEP rows. The accordion is 350 ms `ease`.
  - Several shape or size states are **instant**: the capsule merge, the search jumping open, the "Shop" pill width, size-button states, grid reflow.
- **Position: largely supported.** Intended position moves are longer, gentler and shorter in distance:
  - the header slides to the bottom over 450 ms, ease-in-out cubic;
  - the content lift is 144 px over 500 ms, ease-in-out;
  - the ASAP reveal is 16 px over 400 ms;
  - the PLP cards rise 18 px over 1,000 ms after a 500 ms delay;
  - the Ecosystem plate rises 10 px over 460 ms;
  - the hero track takes 520 ms vs 300 ms for sizes.
- **Exceptions to the position rule:**
  - the filter drawer (300 ms ease-out) and the zoom track (200 ms ease-out) are as quick as the size changes;
  - three intended position moves **snap instantly**: the bag drawer translate, the quick-add 16 px and the tooltip 6 px. Their opacity fades still run, so the jump reads as a fade, not as motion.
- **Opacity:**
  - short and staggered: 150–300 ms, with 180–270 ms delays;
  - the exceptions are the slow full-screen fades: the Ecosystem overlay (500 ms) and the hero backdrop (520 ms).
- **"Distinct easings and timing per concurrent element": supported.** A single category hover runs four curves at once: expo-out for size, standard for the logo and search, ease-in or `ease` for content, and none for the glass and dim layer. Each has its own duration and delay.

## 11. Gaps
- **Phone menu close:**
  - the "Fechar" tap target was not hit; the tap landed on the logo pill;
  - the open sequence is measured, the close sequence is not.
- **"Carregar mais" (PLP load more):**
  - not reached in the capture runs, so append-on-click was not observed;
  - no infinite load fired in about 4,500 px of scrolling;
  - appended items after grid density 8 do use `plp-slide-up`.
- **Hero "Shop Now" pill hover:** the pointer target was off-screen (wrong slide), so it was not measured.
- **Add-to-bag pressed and loading states:** not measured, because the button was not clicked, per the rules. Hover shows no change.
- **Cookie banner:** never shown (it sits off-screen at `translate-y-[200%]`), so no reject was needed.
- **Video frames:** offset from the marks, so they were used only for the filter-close and PLP-paint order (estimated). Every timing in this record comes from declared or sampled data.
- **Hover-intent delay:** not separable from automation latency (20–160 ms).
- **Bag latency:** 330–470 ms in this environment; the bag's first paint depends on the network.
- **PDP on phone:** size selection and gallery swipe were not exercised.
