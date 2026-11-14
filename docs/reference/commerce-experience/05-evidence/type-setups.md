# Type setups: The Hideaway and this site (read 2026-11-15)

Evidence for batch 3 of [05 — Design requirements](../05-design-requirements.md). Read-only; nothing built or
run. The Hideaway = `~/WebstormProjects/thehideaway`; this site = this repo. "Inferred" marks anything not
read directly.

## The Hideaway

Fonts (`fonts.ts`): Instrument Serif 400/italic (2-16), Caveat variable (18-27), Raleway Dots (28-36), Doto
(37-40), Mrs Saint Delafield (41-49), Siegfried 300/400/700/900 + italics (50-96), SUIT variable (97-104),
Blase 300/400/500/700 (105-129), Narcissian Nectare 400/500/600/700 + italics, no light file, fallback
"blase" (130-175). Geist Sans/Mono from the `geist` package (`src/app/(frontend)/layout.tsx:25-26`).

Tokens (`src/styles/globals.css:1035-1044`, `@theme inline`): `--font-sans` SUIT, `--font-serif` Narcissian
Nectare, `--font-mono` Geist Mono, `--font-wide` Blase.

Default face: SUIT. `hideaway.scss:37-38` sets `body { font-family: var(--font-sans) }`; `Suit.variable` is on
`<html>` (`layout.tsx:74`); `globals.css:194` sets `html` to sans too.
Inferred gaps: `GeistMono.variable` not applied, so `font-mono` likely falls back; h1–h6/p rules
(`globals.css:124-150`) reference `--font-*--line-height` while tokens are `--text-*--line-height`.

Root `font-size: 62.5%` (`globals.css:195`), so 1rem = 10px. Scale (`globals.css:60-86`), px / line-height:
xs 10/1.333, sm 12/1.429, base 14/1.75, lg 16/1.556, xl 18/1.5, 2xl 20/1.5, 3xl 24/1.5, 4xl 32/1.5,
5xl 36/1, 6xl 40/1, 7xl 48/1, 8xl 40, 9xl 48.

Usage (src/components + src/app): `font-sans` 502, `font-serif` 62 (28 with `font-bold`, 15 italic),
`font-wide` 7, `font-mono` 7. Sizes: `text-sm` 245, `text-xs` 177, `text-base` 99, `text-[10px]` 203,
`text-[11px]` 180, `text-[1.4em]` 63. `uppercase` 364 (277 `font-sans`; sizes 10px 161, 11px 92, xs 36,
9px 15). Tracking: `tracking-tight` 134, `tracking-widest` 114, `[0.2em]` 76, `[0.18em]` 35, `[0.32em]` 27.
Weights: medium 197, light 162, bold 59.

Header (`src/components/Shells/Header/HeaderClient.tsx`): no own type classes; logo is SVG. "MENU" in
`MenuButton.tsx:147-148` (`.rp_btn`, weight 350, line-height 2, tracking -0.01em, SUIT, `hideaway.scss:72-100`);
search label `text-[11px] font-medium tracking-widest uppercase` (`SearchBar.tsx:264`).

## This site

Fonts (`fonts.ts`): Manrope Regular latin 400 (3-8); `serif` = nib-reference.woff2, Nib Pro Regular (9-13);
`Hyd` = H-A Regular, Korean (14-20); SUIT variable (21-28); Narcissian Nectare 400/500/600/700 + italics,
fallback "blase" not loaded (29-72). No light Narcissian file. The essays layout loads SUIT as
`--font-port-sans` and Narcissian Nectare Regular as `--font-port-serif` (`src/app/(site)/essays/layout.tsx:5-16`).
Unused files in `public/fonts`: Pretendard, Siegfried, Guida Mono.

Tokens (`src/styles/globals.css:17-19`): `--font-sans` "Helvetica Neue", Helvetica, Arial; `--font-mono:
var(--font-mono)` (self-reference, dead); `--font-heading: var(--font-mono)`; no `--font-serif`; no `--text-*`
overrides, so Tailwind default sizes on a 16px root.
Inferred: `font-teaser-serif`, `text-teaser-heading`, `text-teaser-copy` are used but defined nowhere.

Default face: not determinable statically. `src/app/(site)/layout.tsx:31-38` applies only `.className`
(no `.variable`), so `--font-suit` and `--font-narcissianNectare` are unset; `html { @apply font-sans }` is in
`@layer base` (`globals.css:257-259`) and loses to unlayered next/font rules; body rules set no family. Body
text inherits whichever next/font class rule the bundler emits last. Inferred: declaration order would make
Narcissian Nectare the default. A live computed-style check settles it.

Usage: `font-mono` 56, `font-sans` 44, `font-serif` 8; `text-xs` 264, `text-sm` 163, `text-[11px]` 46,
`text-base` 43, `text-[13px]` 33; `uppercase` 56; `tracking-[0.18em]` 12.
