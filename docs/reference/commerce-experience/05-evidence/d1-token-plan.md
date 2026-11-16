# D1 · One token layer: implementation plan (Gate 1)

*For the owner's approval, 2026-11-16.* Pipeline: `orch-change-feature`, four slices, tests first in each, guarded
runs, a live check in both modes and one harsh review before each commit. Sources: ADR 0009 (three colour layers),
ADR 0008 (type), ADR 0002 (modes), 05 batches 2–4, and the evidence files in this folder. Nothing is built until the
plan is approved.

**Status labels.** **A** approved hex and job. **S** a colour from the approved Mersi set, its job proposed here.
**P** placeholder (usually The Hideaway's current value for the same slot), not decided.

**Two constraints the plan keeps.** Every shadcn alias stays neutral: green and the accent are reached only through
their own named classes, because sign-in and verification use no green (AGENTS.md). And the cursor sets its own
`data-theme` on nested elements, so dark values go on `:root, [data-theme="dark"], .dark` and light values on
`[data-theme="light"]` (not limited to `:root`).

## 0. Where each layer lives

| File | Holds | Change |
| --- | --- | --- |
| `src/styles/tokens/colour.css` (new) | Primitives in `@theme`; semantic values per mode; shadcn aliases | Takes the palette from `sophomores-tailwind-v4.css`, which is then deleted, with its unused light-first block (checked by grep) and its `prefers-color-scheme` block (conflicts with ADR 0002) |
| `src/styles/tokens/type.css` (new) | Font roles; named sizes | — |
| `src/styles/tokens/space.css` (new) | Radius scale; gutter; the cursor's easing curve | — |
| `src/styles/globals.css` | Imports the three files | Keeps `@source`, `@custom-variant dark`, the base layer and the `theme-animating` rule (two tests read them there) |
| `src/styles/teaser-theme.css` | The home page's set | Unchanged except one font line (slice 2) |
| `fonts.ts` | Font loaders | Slice 2 |

## 1. Primitives (one value in both modes, no meaning)

| Group | Tokens | Values | Status |
| --- | --- | --- | --- |
| Greens | `green-deep`, `green-middle`, `green-maurice`, `green-light` | #213627, #405646, #657B69, #8AA791 | A |
| Mersi interface | `mersi-ground`, `mersi-sand`, `mersi-stone`, `mersi-ink` | #EDE7DE, #DCD4C8, #BEB4A7, #1A1A1A | A (set accepted) |
| Mersi project colours | berri, tonnemani, segur, paix, hamelin, aurelien, naya, cook, slate, teal-slate, atokym | As in batch 2 | S, no job |
| The Hideaway neutrals | the white, grey and black scales | Today's values (`globals.css:108–139`) | P |
| Rouge, bleu, extras | `rouge-50…950`, `bleu-50…950` and the named extras | Today's values | Registered, no job |
| Sophomores palette | vellum, cypress, ink, brass, oxblood, porphyry, terracotta, verdigris, archival, their scales, the 7 green candidates | Today's values | Registered, no job |

## 2. Semantic tokens (The Hideaway's names)

Each is a variable with a value per mode, exposed as `--color-<name>`. Contrast against that mode's ground.

| Token | Dark | Light | Status |
| --- | --- | --- | --- |
| `bg` | #1A1A1A | #EDE7DE | Light A; dark P (owner question 2) |
| `fg` | #EDE7DE (14.2:1) | #1A1A1A (14.2:1) | Dark P (question 2); light A |
| `muted-fg` | ≈#B2B8BD (8.7:1) | ≈#3B4044 (8.5:1) | P |
| `muted-bg` | ≈#3B4044 | sand #DCD4C8 | P / S |
| `off-*`, `faded-*`, `opaque-*`, `muted-off-*`, `muted-faded-*` | The Hideaway's dark mapping | The Hideaway's light mapping (sand for light `off-bg`) | P |
| `button-background`, `-inverted` | neutral-white / neutral-black at 25% | transparent-white / -black | P |
| `border` | oklch(27.4% 0.006 286) | stone #BEB4A7 (dividers only) | P / S |
| `border-strong` (inputs, control edges) | ≥3:1, e.g. #6A655E | ≥3:1, e.g. #858077 | P; a test enforces 3:1 |
| `signature` (block, hero) | #213627 | #213627 | A |
| `signature-fg` | #8AA791 (6.6:1; 4.9:1 on a signature block) | #213627 (10.5:1) | A |
| `signature-quiet` (rules, hover) | #657B69 (3.8:1, non-text) | #405646 (6.5:1) | A |
| `site-accent` | today's cursor rouge (4.3:1, graphics only) | same (3.3:1, graphics only) | P (question 1) |
| `error` | ≈#FA584A (5.4:1) | ≈#A9050A (6.3:1) | P |
| Nav slots `n-s-*` | The Hideaway's dark values | The Hideaway's light values | P, slice 4 |

## 3. shadcn aliases (all neutral)

Each exists as the plain variable (about 40 raw `var(--…)` uses) and as the `--color-*` entry.

| shadcn name | Points at | Note |
| --- | --- | --- |
| background / foreground | bg / fg | |
| card / card-foreground | faded-bg / faded-fg | As The Hideaway |
| popover / popover-foreground | off-bg / fg | Opaque on purpose |
| primary / primary-foreground | fg / bg | Inverse fill |
| secondary / secondary-foreground | muted-bg / fg | |
| muted / muted-foreground | muted-bg / muted-fg | |
| accent / accent-foreground | muted-faded-bg / fg | A hover surface in shadcn; no rouge until the accent is chosen |
| destructive (+ foreground) | error / bg | |
| border / input / ring | border / border-strong / muted-fg | Ring 8.7:1 |
| chart-1…5 | signature-fg, hamelin, atokym, paix, naya | S / P; no users today |
| sidebar-* | off-bg, fg, fg, bg, muted-faded-bg, fg, border, muted-fg | No users today |

## 4. Fonts per role (slice 2)

| Role | Stack | Notes |
| --- | --- | --- |
| `font-sans` (on `<html>`) | SUIT, then Pretendard (Hangul only), sans-serif | SUIT preloaded; Pretendard not |
| `font-serif` | Narcissian Nectare, then Blase | Drops the `"blase"` literal that matched nothing |
| `font-serif-ha` | Narcissian Nectare, H-A, Blase | Display only, never italic |
| `font-wide` | Blase | Files copied from The Hideaway |
| `font-mono` (+ `font-heading`) | Geist Mono (`geist` package) | Fixes the token that points at itself |
| `font-dots` | Doto (file already here) | Replaces the hand-written `@font-face` in `sphmrs.scss` |
| No role yet | Siegfried, Caveat, Instrument Serif, Mrs Saint Delafield, Raleway Dots, Manrope, Guida Mono | Registered, never preloaded |
| `font-teaser-serif` | Nib | Variable renamed so it doesn't reference itself |

Every loader's `.variable` goes on `<html>`, no `.className`. The home page keeps the face it renders today
(recorded live before the change).

## 5. Sizes, radius, margins (slice 3)

| Token | The Hideaway (10px root) | Here | Line height |
| --- | --- | --- | --- |
| `text-h1` | 3.2rem | 32px | 1.5 |
| `text-h2` | 2.4rem | 24px | 1.5 |
| `text-h3` | 2rem | 20px | 1.5 |
| `text-h4` | 1.8rem | 18px | 1.5 |
| `text-h5` | 1.4rem | 16px (question 3) | 1.5 |
| `text-h6` | 15.75px, larger than h5 | 14px (question 3) | 1.75 |
| `text-body`, `text-p` | 1.4rem | 14px | 1.75 |
| `text-small` | 1rem | 10px | 1.333 |

- **Radius.** 4/6/8/12px for sm/md/lg/xl; `--radius-pill` moves into `@theme` so `rounded-pill` works; 2xl and up
  fall back to Tailwind's 16/24/32px. Existing corners get about 2px tighter.
- **Margins.** `--gutter` 20px, 16px at 768px and below; `px-gutter`, `gap-gutter`. The 12-column grid uses
  Tailwind's own `grid-cols-12`.
- **Easing.** One curve, `ease-out-power3`, for the cursor. The rest waits for batch 5.

## 6. Slices

| Slice | Change | Tests (in `tests/tokens/`, `tests/cursor/`) | Live check, both modes, 1440 and 390 |
| --- | --- | --- | --- |
| 1 Colour | `tokens/colour.css`; delete `sophomores-tailwind-v4.css`; trim `globals.css` | Every token present; dark and light values match; every shadcn name aliased; no stock values left; no `prefers-color-scheme` block; contrast computed (text ≥4.5:1, edges ≥3:1); no alias resolves to green or rouge | `/shop`, `/help`, `/me/settings/account`, `/terms`, an essay, `/team`, the 404, home unchanged, the sign-in tray monochrome |
| 2 Fonts | Loaders, files, `tokens/type.css`, `<html>` classes | `.variable` only; stacks as the table; nothing references itself; no-role faces not preloaded; files exist | Computed faces per role; Korean in Pretendard; serif Korean in Blase; home unchanged; only preloaded faces fetched |
| 3 Scale | `tokens/space.css`, sizes | Sizes rise with no fold; radius rises; `rounded-pill` exists; gutter 20/16px; no `rem` in token files | Card and button corners; menu and notifications now that `--gutter` resolves |
| 4 Cursor | Wire the five missing classes; accent from `site-accent`; sizes in px (96px box, 12px text); delete `shell/cursor.tsx` and its rules | The five classes compile; no `rem` and no accent literal in the cursor; the old file is gone and unimported; existing cursor tests pass | Dot and ring at the right size; hover ring in the accent; the label pill in Doto; over light and dark, menu open |

## 7. What will visibly change

- **Every page's ground and text** (slice 1): dark from #0A0A0A to #1A1A1A, light from white to the warm #EDE7DE.
- **Classes that start painting** because their tokens now exist: `faded-*`, `button-background-inverted`, the
  `nav-*` classes in the button, dropdown, badge and tick components, `var(--border-strong)` in two arc modules, and
  `--gutter` in 13 menu and notification rules. Each is a target in that slice's live check.
- **Fonts** (slice 2): body text settles on SUIT (today it depends on build order); 56 `font-mono` and 7
  `font-heading` uses move to Geist Mono; 9 `font-serif` uses move to Narcissian Nectare. BrandMark is unaffected.
- **Inputs** get stronger edges (stock 1.2:1 to 3:1). **Corners** get about 2px tighter.
- **Not in D1:** about 50 rem values copied from the 10px root remain in `sphmrs.scss` and a few components, mostly
  the header and menu. Their sweep follows the shell batch.

| Contrast pair | Ratio | Use |
| --- | --- | --- |
| #1A1A1A on #EDE7DE, and the reverse | 14.2:1 | Body |
| Muted text, dark / light | 8.7 / 8.5:1 | Body |
| #8AA791 on #1A1A1A / on #213627 | 6.6 / 4.9:1 | Body |
| #EDE7DE on #213627 | 10.5:1 | Body |
| #405646 on #EDE7DE | 6.5:1 | Body |
| #657B69 on #1A1A1A | 3.8:1 | Large text and graphics only |
| Accent placeholder on dark / light | 4.3 / 3.3:1 | Graphics only |
| Stone #BEB4A7 on #EDE7DE | 1.66:1 | Dividers only |

## 8. Overlap with the work in flight

The grain, interface assets and header agent also touches `globals.css`, `sphmrs.scss` and the site layout. D1 runs
after it lands and rebases on it. D1 defines the nav slots, `--gutter` and `site-accent`; the header uses them.

## 9. Questions for the owner

1. **The accent colour** (cursor hover and other accents). Today's rouge holds the place; not deep green.
2. **Dark mode's ground and text.** #1A1A1A ground (Mersi's ink) with #EDE7DE text (Mersi's ground), 14.2:1? Neither
   was stated outright; the measured 6.6:1 for the light green assumed this ground.
3. **h5 16px and h6 14px.** This removes The Hideaway's fold, where h6 came out larger than h5.

Every other placeholder stays as listed until it is revisited.

**Colour on hold (owner, 2026-11-16).** "Keep the colors that we have right now. I like them." Questions 1 and 2
wait, and so do slice 1 (colour) and slice 4 (cursor, which reads the accent): no page's colours change until the
owner comes back to it. The owner has a warm accent in mind for later, between orange, yellow and red (80s-sunset
red or blood orange), possibly in a two-cool, two-warm set. Slices 2 and 3 change no colour, and their live checks
confirm that the grounds and text colours are unchanged.
