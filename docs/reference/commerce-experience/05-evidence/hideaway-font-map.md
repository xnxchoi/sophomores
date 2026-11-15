# The Hideaway's font setup, mapped for transfer (2026-11-15)

For batch 3 ("Fonts, reorganised from The Hideaway's stylesheet") in [05](../05-design-requirements.md).
Read statically from `~/WebstormProjects/thehideaway` (Next 16.3.4, Tailwind 4.3.3); no build was run. Korean
coverage was counted from each font file's character map.

## Tokens and their stacks

Aliases sit in `@theme inline`, `src/styles/globals.css:1035-1044`; faces in `src/fonts.ts`.

| Token | Face (fonts.ts) | Fallbacks, in order | On the front end |
| --- | --- | --- | --- |
| `font-sans` | SUIT (97-104) | SUIT's metric fallback only; no generic family | Works; body text (hideaway.scss:38-39) |
| `font-serif` | Narcissian Nectare (130-175) | metric fallback, then the literal `blase` (174) | Works; the `blase` literal probably matches nothing, because next/font names the loaded face `__Blase_<hash>` |
| `font-wide` | Blase (105-129) | metric fallback | Works |
| `font-dots` | Doto (37-40) | none | Works |
| `font-mono` | Geist Mono (`geist/font/mono`) | none | Broken: the front-end layout applies only `.className`, never `.variable` |
| `font-siegfried`, `font-caveat`, `font-instrument` | Siegfried, Caveat, Instrument Serif | — | Dead utilities on the front end (variable never set); Instrument Serif is used by class on the invoice and ticket |

No style names (display, heading, label, caption, body) exist as font utilities. Sizes: `text-xs`…`text-9xl` on a
10px root (globals.css:60-87, `html { font-size: 62.5% }` at 195), plus `text-body`, `text-small`,
`text-h1`–`text-h6`, `text-p` (globals.css:710-718). Base `h1`–`p` line heights point at undefined
`--font-*--line-height` variables (the defined ones are `--text-*--line-height`).

## Faces

| Face | Weights | Latin | Hangul syllables (of 11,172) |
| --- | --- | --- | --- |
| Narcissian Nectare | 400–700, normal and italic | yes | 0 |
| Blase (internal name "Blatt") | 300, 400, 500, 700; no italic | yes | 11,172 (Regular checked) |
| SUIT (variable) | no weight range declared | yes | 2,668 |
| H-A ("H-A M") | one file; no italic | yes | 2,368 — files only in The Hideaway, nothing loads them |
| Siegfried | 300–900, normal and italic | yes | 0 |
| Instrument Serif | 400, normal and italic | yes | 0 |
| Doto, Caveat, Mrs Saint Delafield, Raleway Dots | 400 | not checked | not checked |

## Use counts (class uses in src, approximate)

`font-sans` 591 · `font-serif` 68 · `font-wide` 7 · `font-mono` 6 · `font-dots` 6 · `font-siegfried` 1 ·
`font-caveat` 1 · `font-instrument` 1.

## Not verified

The winning `font-family` among the classes on `<html>`; Turbopack's emitted family names (the `blase` literal
under Turbopack); whether SUIT bold is synthesised; Hangul coverage of Blase's other weights.
