# Batch 4 evidence: space, surfaces, imagery, icons (read 2026-11-16)

Evidence for batch 4 of [05 — Design requirements](../05-design-requirements.md): F6, F7, F8, F13 and D7.
Read-only. Nothing was built, run or rendered. The Hideaway = `~/WebstormProjects/thehideaway`. This site =
this repo. References = [04c-site-records/](../04c-site-records/).

**Count scope.** Grep counts of class tokens in `.ts`/`.tsx`, approximate. The Hideaway: `src/components` +
`src/app` without `(payload)` (730 files). This site: `src` without `src/hideaway` and `src/payload` (498 files).
`src/hideaway/` exists here: 626 files of Hideaway originals kept as reference only, excluded by
`tsconfig.json:52` and imported by nothing (`docs/qa/src-stabilization-20261109.md:357,372`).

**Root size.** The Hideaway sets `html { font-size: 62.5% }` (`src/styles/globals.css:195`), so 1rem = 10px;
this site keeps 16px (batch 3). Tailwind's rem defaults (`node_modules/tailwindcss/theme.css`, the same in both
repos) therefore come out smaller there: spacing, container widths, radius. Blur and shadow defaults are px.

## F6 · Layout and margins

### The Hideaway

- **Spacing step.** `--spacing` is not overridden: `/*--spacing:0.4rem;*/` is commented out (`globals.css:92`).
  One step is 0.25rem = **2.5px**.
- **Outer margin.** `--gutter: 2rem` = 20px, and 16px at ≤768px (`globals.css:298,306`). It is used about 99
  times in non-admin stylesheets and 3 times in TSX; `--halfGutter` about 56.
- **Widths** (`globals.css:279-288`): site 99vw; `--maxContainerWidth` min(99vw, 1440px); wide 1022px;
  content 840px.
- **Container utility** (`globals.css:1067-1088`): padding 10px, 20px from 840px, 16px below 640px; max-width
  1400px from 1400px. About 15 class uses.
- **Extra container sizes** (`:91-97`): 8xl to 11xl = 880 / 1000 / 1120 / 1480px at the 10px root.
- **Breakpoints** (`:101-109`), in px: xs 480, sm 640, md 768, lg 1024, xl 1280, **2xl 1440**, 3xl 1920.
- **Most used spacing** (px at the 10px root): `px-6` 82 (15px), `px-4` 77 (10px), `px-10` 51 (25px),
  `px-5` 45, `p-0` 50; `gap-2` 118 (5px), `gap-3` 113 (7.5px), `gap-4` 106 (10px), `gap-6` 53.
- **Max widths.** `max-w-7xl` (33) is the usual page cap. At the 10px root it is **800px**, though
  `next.config.ts:31-33` comments it as 1280px.
- **Grid.** About 233 `grid` uses in 79 files and 139 `grid-cols-*`, mostly 1–3 columns. `grid-cols-12`
  appears 4 times, `repeat(6,1fr)` 5.
- **Header** (`components/Shells/Header/HeaderClient.tsx:529,584`): full width, inner padding 36px across and
  24px on top.

### This site

- **No layout tokens.** `globals.css`, `sophomores-tailwind-v4.css` and `teaser-theme.css` set no `--spacing`,
  container sizes or gutter. The step is Tailwind's 4px.
- **Breakpoints:** Tailwind defaults (sm 640 … **2xl 1536**). `teaser-theme.css` adds `teaser-wide` (108rem,
  1728px) and `short`/`tall` height variants.
- **Most used spacing** (px at 16px): `px-3` 56 (12px), `px-4` 51, `px-2` 50, `px-6` 33, `p-0` 41, `p-6` 24;
  `gap-2` 132 (8px), `gap-3` 60, `gap-1` 56, `gap-4` 49.
- **Shop and policy pages use narrow centred frames** (`mx-auto max-w-*`, `px-6`, `sm:px-10`): 2xl in
  `components/commerce/page-frame.tsx` and `shop/orders/[id]`; 3xl/6xl in `components/commerce/offer.tsx`; 3xl in
  `_commerce/policy-page.tsx`; xl in `shop/payment` and `shop/invitations/claim`; 6xl in `me/settings/layout.tsx`.
- **Grid:** `grid` 55 uses in 28 files; `grid-cols-*` 36, mostly `grid-cols-2` (14). No 12-column grid.
- **Header** (`components/shell/site-header.tsx:88`): `top-3`, width `calc(100%-40px)`, so 20px side margins.

### References (04c records)

| Site | Outer margin (1440) | Phone | Grid | Record |
| --- | --- | --- | --- | --- |
| Metalab | 24px | 16px | No visible column grid; absolute, asymmetric placement | metalab.md:29,32 |
| lamalama | 40px | 16px | 12 cols, gap 24px; phone 6 cols, gap 10px | lamalama.md:30-31 |
| TUX | 15px | 15px | News 4 × 338px, ~15px gaps; cases full-bleed | tux.md:27-28 |
| Blink | 12px | not captured | No column grid; centred compositions | blink.md:28 |
| Analogue | 20px | not captured | Index 4 × 224px tiles, ~110px gaps; asymmetric split | analogue.md:40-43 |
| McAlpine | 20px (monogram x) | not captured | Single centred column; hero full-bleed | mcalpine.md:31,44-47 |
| Osklen | 30px | not captured | Rail gap 21px; PLP 4-up with **no gutter**; 2/4/8 toggle | osklen.md:50-54 |
| Mersi | 0 | 0 | Two 720px halves, no gutter; phone splits top/bottom | mersi.md:35,39 |

Spacing steps at the references: not captured.

## F7 · Surfaces and depth

### Radius

| Token | The Hideaway (10px root) | This site: `globals.css` | This site: `teaser-theme.css` |
| --- | --- | --- | --- |
| Base `--radius` | 0.8rem = 8px (`:291`) | 0.625rem = 10px (`:99`) | — |
| sm / md / lg / xl | base −4 / −2 / 0 / +4 = 4 / 6 / 8 / 12px (`:1045-1048`) | ×0.6 / 0.8 / 1 / 1.4 = 6 / 8 / 10 / 14px (`:57-60`) | — |
| 2xl / 3xl / 4xl | Tailwind defaults 1 / 1.5 / 2rem = **10 / 15 / 20px** | ×1.8 / 2.2 / 2.6 = 18 / 22 / 26px (`:61-63`) | — |
| pill | 999px in `@theme inline` (`:1049`) | 999px in plain `:root` (`:121`) | — |
| own | — | — | `teaser-card` 8px, `teaser-inset` 4px |

**Most used radius classes.**
- The Hideaway: `rounded-full` 118, `md` 62, `sm` 58, `lg` 42, `2xl` 36, `xl` 26, `[4px]` 16. Its
  non-admin stylesheets most often set 4px (33), 6px (16), 8px (14) and 50% (10).
- This site: `rounded-none` 101 (all in `components/ui` primitives), `xl` 82, `full` 51, `lg` 50, `md` 43.

### Blur and glass

- **The Hideaway header** (`HeaderClient.tsx:529-568`): a fixed `rounded-[100rem]` bar, `shadow-none`; a 35%
  tint layer and a `backdrop-blur-[20px]` layer, both starting at opacity 0.00001 and fading in; top strips
  (`:752-763`) with blur 5px, contrast 500% and saturate 1500% under a gradient mask.
- **This site's header** (`site-header.tsx:88-94`): `rounded-full`, a 72% `--off-bg` tint and
  `backdrop-blur-[20px]`, always on. The same strips are driven by `--header-fx-*` (`:26-28`).
- **Where it renders.** `SiteHeader`'s only importer is `components/reading/reading-stage.tsx:64`, used only by
  `app/(site)/essays/reading-view.tsx`. Shop routes get the ported menu (`RP_Menu`, `client-layout.tsx:65`),
  whose button is a `rounded-full` tinted chip (`UX/Menu/MenuButton.tsx:149`). No header bar was found on shop
  routes. Not checked live.
- **Blur in use.** The Hideaway: `backdrop-blur-md` 17 (12px), `xl` 14 (24px), `sm` 13 (8px), `[2.4rem]` 4
  (24px); about 58 `backdrop-filter` declarations in non-admin stylesheets, most often 8, 4 and 10px. This site:
  `md` 10, `xs` 6, `[24px]` 6, `[2.4rem]` 3 (that last is **38.4px here**).

### Shadows and borders

- **Shadows**, mostly inherited from shadcn primitives in both. The Hideaway: 143 classes in 65 files (`shadow`
  17, `xs` 15, `sm` 10, `lg` 10) plus about 64 `box-shadow` declarations in non-admin stylesheets. This site: 94
  in 43 files (`shadow-none` 17, `xs` 14, `lg` 9) plus 7 in stylesheets.
- **Borders.** Both default every element to the theme border colour (Hideaway `globals.css:1054`; here
  `globals.css:250`). The Hideaway: `border` 205, `border-b` 107, `border-t` 42, `border-[1px]` 14. This site:
  `border` 218, `border-t`/`border-b` 24/23, `border-[1.5px]` 3. Here `--border` is oklch 0.922 in light and
  white at 10% in dark (`globals.css:91,216`). `sophomores-tailwind-v4.css` defines `--color-border-hairline`
  and `surface-*`; no TSX file uses them.

### References (04c records)

| Site | Radius | Glass / blur | Shadows | Record |
| --- | --- | --- | --- | --- |
| Metalab | Pills 50px; cards 8px | Pills only, 14px | None found | metalab.md:39-40 |
| lamalama | 4px bar, cards, menu; 0 chips, images | 4px controls; 16px menu overlay; 24px and 64px layers | None | lamalama.md:42 |
| TUX | 10px bar; 15px sheet top; 0 cards, media | Bar 30px; overlay 15px | None | tux.md:40 |
| Blink | 8px cards; 0 nav, chips | Nav only, 16px | None | blink.md:38 |
| Analogue | Nav pill 20px; case pill 40px; tiles and cards 15, 13, 10px | Pill 10px; button 20px; cursor 5px | 0 found | analogue.md:79-82 |
| McAlpine | Menu ~16px (visual only); monogram 0 | Menu 50px over `rgba(62,62,67,.65)` | None noted | mcalpine.md:38-39,71-73 |
| Osklen | 2–36px plus pills; rail images 14px | Nav 12px; search and menu 24px; hero backdrop 56px | `0 0 12px rgba(0,0,0,.12)` ×14; one `0 8px 16px` | osklen.md:40,46,51,86-88 |
| Mersi | 0 | None; flat | None | mersi.md:60 |

Line weights: hairlines between rows at lamalama (lamalama.md:32,42); a 1px vertical rule at Analogue
(analogue.md:42).

## F8 · Imagery and texture

### The Hideaway

- **next/image** in 15 files; `<img>` in 4. Aspect ratios: `aspect-square` 19, `aspect-video` 4, `aspect-[4/3]` 4.
- **Image config** (`next.config.ts:18-41`): AVIF then WebP; device sizes 640–2560; qualities 50 / 75 / 100;
  unoptimized in dev only.
- **Blurhash.** The `blurhash` package turns Unsplash's `blur_hash` into a PNG data URL
  (`payload/collections/Media/hooks/blurHashToDataUrl.ts`; `getFallbackFromUnsplash.ts:221-234`). The ImageBlock
  reads it as `blurDataUrl`. No `placeholder="blur"` on next/image was found.
- **Noise.** `public/assets/noise.png` (12.5 KB): the `.noiseFilter` class, 45px tile, overlay blend, opacity
  0.3 (`styles/hideaway.scss:1876-1885`; no TSX uses it); the settings page background, overlay, opacity 0.03
  light / 0.05 dark (`app/(frontend)/(site)/(auth)/me/settings/layout.tsx:47`); a saturation-blend mask
  (`app/(frontend)/estate.scss:160-169`); admin backgrounds.
- **SVG grain.** An `feTurbulence` grain (overlay, opacity 0.85) on the event teaser
  (`components/sections/Pricing/EventTeaser.module.scss:35-43`).
- **3D textures.** `public/assets/textures/lp` and `textures/photograph` (Polaroid cards), and `seamless.png`.

### This site

- **next/image** in 10 files, none on shop pages; `<img>` in 1. `aspect-square` 12, `aspect-video` 6.
- **`images: { unoptimized: true }`** in every environment (`next.config.ts:11`).
- **Blurhash.** `blurhash` is in `package.json` and is referenced nowhere outside `src/hideaway`.
- **Texture.** No noise or grain asset or CSS in the shop UI. `public/assets/seamless.png` (512 × 512) loads as
  `u_noiseTexture` for the menu gradient (`components/shell/menu-gradient.tsx:43-51`), but the fragment shader
  never samples it (`:10`). `public/masks/flame-envelope.png` feeds the flame backdrop.
- **The book's 3D render:** none exists; the only GLTF model is the radio tape (`components/radio/tape-model.tsx`).
  **Product photography:** no product image component yet.

### References (04c records)

- **Mersi** (mersi.md:60-63, §9): warm, desaturated interiors with no people, tight details beside wide rooms,
  about 90% photography. A fixed full-screen grain image with `mix-blend-mode: color-dodge` and
  `pointer-events: none` (measured); it stands still (04c-direction.md, Motion). An embossed "MS" monogram on
  flat cards; cream bevelled mounts on Agence.
- **Osklen** (osklen.md:90): studio product-on-model on pale grey, location editorial, black-and-white macros.
- **lamalama** (lamalama.md:43): grainy, desaturated hero video; a halftone dot texture on canvas.
- **TUX** (tux.md:41) saturated video close-ups. **Analogue** (analogue.md:84-86) generative light hero,
  object-led product photographs. **McAlpine** (mcalpine.md:75) ambient wall video, grainy showreel card.
  **Metalab** (metalab.md:41) renders on a grey gradient. **Blink** (blink.md:39) no photography.
- Image handling at the references (formats, placeholders, ratios): not captured.

## F13 / D7 · Icons and cursor

### Icons

| Library | The Hideaway (files, all `src`) | This site (files, without `src/hideaway`) |
| --- | --- | --- |
| lucide-react | 73 | 28 |
| @phosphor-icons/react | 17 | 21 |
| @radix-ui/react-icons | 12 | 0 |
| react-icons | 1 | 0 |

- **This site's 28 Lucide files:** 6 shadcn primitives in `components/ui` (calendar, dropdown-menu, input-otp,
  radio-group, select, sheet); 9 in `components/Authentication`; 3 in `components/settings`; 4 settings pages;
  2 in `arc/`; one each in tickets, music, Warp and `payload/admin/staff-login-form.tsx`. 6 import both libraries.
- `components.json:13` already says `"iconLibrary": "phosphor"` (The Hideaway's: `"lucide"`). Phosphor is
  imported from the package root; 11 uses set `weight="fill"`.

### Cursor: The Hideaway

- **Component:** `components/UX/Cursor/index.tsx` (504 lines, motion/react). The native pointer is hidden on
  fine pointers (`globals.css:207-238`); the cursor is hidden on coarse pointers (`hideaway.scss:408-412`).
- **States:** default, a 1px ring and a filled dot, radius 6 in a 100-unit SVG on a 9.6rem = **96px** box;
  FOCUS and DRAG, the ring springs to radius 17 and turns rouge; text, an 8px-radius chip with
  `backdrop-blur-xs` and a 10% tint, set in Doto, marqueeing when long.
- **Motion:** position tracks the pointer with no lag; only the radius springs (stiffness 500, damping 30).
  Colours follow a light or dark `cursorTheme`.

### Cursor: this site (read from code, not rendered)

- **The live cursor is the Hideaway port**, mounted on every `(site)` page through this chain:
  - `app/(site)/layout.tsx:47` `<Providers>`;
  - `providers/index.tsx:31` `<MobileProvider>`;
  - `providers/MiddleMan.tsx:22,117` dynamic import of `components/UX/Cursor`, rendered when the pointer
    isn't touch.
  - The file (506 lines) differs from the original only by `useInteractiveCursorHover`.
- **`components/shell/cursor.tsx` (`SiteCursor`, 170 lines) is not mounted:** 0 importers, and 0 elements carry
  the `data-cursor=` it reads. It is a simplified rewrite (same ring, dot and chip), styled by `.rp-cursor` in
  `sphmrs.scss:315-341`.
- **The native pointer is hidden** for every element on fine pointers (`sphmrs.scss:217-221`).
- **The live cursor is bigger here.** Its box is 9.6rem (`sphmrs.scss:226-229`): 153.6px, against 96px in The
  Hideaway, so the ring and dot scale to a radius of about 9.2px against 5.8px.
- **Its classes have no token here:** `bg-nav-button/10`, `font-dots`, `text-nav-*` (`UX/Cursor/index.tsx:343,354`),
  `stroke-rouge-400` and `ease-out-power3` (`:394`) match nothing in `src/styles`. The unmounted one's
  `font-doto` is defined (`sphmrs.scss:195-204`).

### Cursor: references

| Site | Native pointer | Custom cursor | Record |
| --- | --- | --- | --- |
| Metalab | Hidden | 96 × 96: violet `#584dff` ring (r 17) and a dot; text labels in some states | metalab.md:39,42,60 |
| Analogue | Hidden; returns over the header | 20px frosted dot, blur 5px, no lag; white glass over images; "SEE CASE" pill 100 × 40 | cursors.md; analogue.md:88 |
| lamalama | Kept | Dot-matrix trail in the WebGL backdrop; a lagging black label with scrambling text | cursors.md; lamalama.md:44 |
| Blink | Kept | None | blink.md:40 |
| TUX, McAlpine, Osklen, Mersi | not captured | not captured | — |

Metalab's ring, dot and label is the same family as The Hideaway's cursor.

## Contradictions and traps

1. **F13 cites the wrong cursor file.** The 05 row names `src/components/shell/cursor.tsx`, which is unmounted;
   the cursor on screen is `components/UX/Cursor/index.tsx`, through `MiddleMan.tsx:117`. Two implementations
   exist, with two CSS sets in `sphmrs.scss` (`.rp__cursor`, `.rp-cursor`).
2. **rem values copied from a 10px root** come out 1.6 times larger here: about 50 in `sphmrs.scss` (the
   cursor's 9.6rem among them), and `backdrop-blur-[2.4rem]`, `px-[1.2rem]`, `px-[1.4rem]` in TSX. The Hideaway's
   `px-4` is 10px, here 16px. Its own `next.config.ts:33` takes `max-w-7xl` as 1280px; at its root it is 800px.
3. **Three radius systems.** The Hideaway: subtractive steps on 8px, with a fold (`rounded-2xl` 10px is smaller
   than `xl` 12px). This site: multiplicative steps on 10px, so the same class names give other px. The teaser:
   fixed 8px and 4px. Here `--radius-pill` sits in plain `:root`, not `@theme`, so `rounded-pill` generates nothing.
4. **`--gutter` is used and never defined.** `sphmrs.scss` uses it 13 times in the menu and notification rules
   (`:925-1470`). Only The Hideaway defines it (`globals.css:298`).
5. **The 2xl breakpoint differs:** 1440px in The Hideaway, Tailwind's 1536px here.
6. **Images and placeholders.** `images.unoptimized: true` applies in every environment here; The Hideaway
   skips the optimiser in dev only. `blurhash` is installed and unused.
7. **`seamless.png` is loaded but never sampled** by the menu shader.
8. **Icon config and code disagree.** `components.json` is on Phosphor, while 28 files still import Lucide
   (6 in `components/ui`; 6 import both).
9. **Unused tokens.** The semantic `surface-*` and `border-hairline` tokens are unused; borders come from
   shadcn's `--border`.
10. **Header placement, from code.** `SiteHeader` (the blurred, rounded bar) renders only in the essays reading
    view; on shop routes only the ported menu's button chip was found. Not checked live. F7's "header blurs"
    may have no bar to apply to on shop routes today.

## Candidate proposals (for the owner; not decided)

1. **F6.** One outer-margin token per breakpoint, within the references' 12–40px band (The Hideaway: 20/16px);
   the 4px step kept on the 16px root; shop pages edge to edge with that margin instead of narrow `max-w-*`
   frames; a 12-column grid (lamalama) or a gutterless product grid (Osklen), chosen per page.
2. **F7.** One radius scale: The Hideaway's 4/6/8/12px plus pill, in px, fold removed, `--radius-pill` in
   `@theme`. Glass on the floating layer only, at 12–24px blur. No drop shadows outside Osklen-derived shop parts.
3. **F8.** A fixed grain overlay after Mersi (`pointer-events: none`, overlay or color-dodge blend); The
   Hideaway's `noise.png` could come over. Image optimisation on outside dev. Blurhash decided per image source.
4. **F13.** Retire one of the two cursor implementations and size the survivor in px, then choose its style:
   Analogue's glass dot, lamalama's label and trail, or Metalab's ring.
5. **D7.** Move the 28 Lucide files to Phosphor, starting with the 6 `components/ui` primitives.
