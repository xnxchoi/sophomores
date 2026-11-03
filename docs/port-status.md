# Hideaway port status

## Type and CSS

Hideaway sets `html { font-size: 62.5% }`, so `1rem` is 10px there. Sophomores leaves the root at the browser default, so `1rem` is 16px.

Port the rest of the Hideaway visual system: color, border radius, borders, and motion. Do not port the 62.5% root. Do not rescale the Sophomores root down to 10px to preserve the old rem math. A Hideaway `text-6xl` under that root is about 37.5px; the reading lead uses `text-4xl`. The parallax title uses `text-5xl`.

Updated: 2026-11-04. Hideaway `main` is unchanged after `f5b5b9ae`. Sophomores port commits: `449dc70`, `a8c75fd`.

| Step | State | Where |
|---|---|---|
| 1. Snapshot and push Hideaway | Done | `origin/main` `f5b5b9ae` |
| 2. Slot types and fixtures | Done | `lib/content/*`, `/reading` |
| 3. Slim collections | Migration generated, not applied | `migrations/20261103_070710_content_collections.ts` |
| 4. Shared canvas | Mounted from the public site root | `components/gl/site-frame.tsx` |
| 5. Header and article layouts | Header scrub and article grid on `/reading` | `components/shell/site-header.tsx`, `components/reading/article-hero.tsx` |
| 6. Bookmark, radio, notices | Bookmark, notice list, MorphSVG play/pause, tick rail, ±10s seek, counter, SVG reels, cassette glTF, song-line render, alley HDR. Display video stays out. | `components/radio/` |
| 7. Auth screens | Sign-in, sign-up, reset, six-digit two-factor, and a passkey button. Fields draw a baseline. None call Better Auth. | `components/auth/` |
| 8. Highlighter and membership 3D | Reader marks quotes. A static badge `View` uses the 363KB compressed model. Rope physics and the plaque set are not copied. | `components/reading/reader.tsx`, `components/membership/member-badge.tsx` |
| 9. Credits, parallax, Starliner, ticker | On `/reading`. Credits are a slot stack with portrait focus and patronage confetti. Starliner is 17 timed lines over the backdrop. Ticker crown is the shader `View`. | `components/sections/*`, `components/shell/ticker/*` |
| 10. Payload list components | Post archive plus previous/next. Next changes the article among the posts passed in. | `components/reading/post-archive.tsx`, `components/reading/page-links.tsx` |

<!-- AUTO-GENERATED: port-surface BEGIN -->
## Surface contract

Generated from `styles/globals.css` and `app/(site)/reading/layout.tsx`. Verified: **2026-11-04**.

| Token or class | Source | Behavior |
|---|---|---|
| `--port-shade` | `.port-shade` | Defaults to `--faded-white`. Replace this one custom property to recolor the family. |
| `.port-wash` | same file | `165deg` gradient of that shade at alpha 0.2, 0.07, and 0. |
| `.port-rule` | same file | Border color is `oklch(from var(--port-shade) l c h / 0.16)`. |
| `.drawn-field*` | same file | Faint bottom rule. On focus, or when the input is not placeholder-shown, the stronger line runs `scaleX(0)` to `1` from the left and the label translates `-115%` and scales `0.8`. |
| `--font-port-sans` | reading layout | SUIT Variable, weights 100–900. Applied only under `/reading`. |
| `--font-port-serif` | reading layout | Narcissian Nectare Regular, weight 400. Used by `.font-serif` inside `.port-shade`. |
| Workbench | `public/assets/fonts/Workbench.ttf` | Cassette song-line face only. Not a page font. |

Site colors used by the reading stage: `--off-black`, `--faded-black`, `--faded-white`, `--faded-l-gray`. Tailwind names are `bg-off-black`, `bg-faded-black`, `text-faded-white`.
<!-- AUTO-GENERATED: port-surface END -->

## Review these

- **Schema migration is generated and not applied.** `migrations/20261103_070710_content_collections.ts` adds tags, categories, media, posts, bookmarks, citations, albums, tracks, playlists, and notifications. The down function drops those tables. It has not been run against the local database or production.
- **Post body is a textarea**, not Lexical. The article grid uses `PostCard` props. Lead titles are `text-4xl`. The 62.5% root is not copied.
- **The full Hideaway header is not copied.** Scroll compaction uses the same 350px scrub. Search, radio, check-in, and the cursor store stay behind.
- **GSAP 3.15.0 and `@gsap/react` 2.1.2 are installed, including MorphSVG.** The play control morphs the Hideaway 15×15 play and pause paths. `package.json` has no `pnpm.onlyBuiltDependencies` entry.
- **Credits are a stack of `CreditSlot`s.** Each has `name`, `role`, optional `bio` and `href`, `patronage`, and `profilePic` (`src`, `alt`, `width`, `height` from `next/image`). Clicking a name focuses the portrait at `siteLayer.focus` and locks scroll. Clicking the dim layer releases it. Patronage launches confetti.
- **Starliner uses 17 line origins and the 21KB backdrop.** The warm-tint filter stays in Hideaway.
- **Parallax title is `text-5xl`.** The original `6.4rem` assumed a 10px root.
- **Ticker crown claims the canvas while in view.** Sophomores does not gate it on reduced motion.
- Howler drives the play button. The fixture audio file does not exist, so Play will not make sound until a file is added.
- **Shared canvas is mounted from the public site root** (`SiteFrame` in `app/(site)/layout.tsx`). Scenes join it with drei `<View>`. Auth's staff login document and the Payload admin root do not mount it. Layers: canvas `1`, header `2`, portrait focus `3`, under the overlay band at 50. DPR is capped at 1.5. Flame, warp, the teaser orb, and the invitation study keep their own canvases.
- **Reading fonts are SUIT Variable and Narcissian Nectare Regular**, declared on `app/(site)/reading/layout.tsx` only. Blase, Caveat, Siegfried, Saint, Dots, and the other Narcissian weights were not copied.
- **Auth forms do not call Better Auth.** `DrawnField` draws the baseline. Two-factor only checks that the code is six digits, then calls `onSubmit`. The passkey button calls `onPasskey`.
- **The port commits do not include** `lib/payload/collections/Admins.ts`, the member-auth and ticket edits, or `tests/payload/auth-integrity.test.ts` and `tests/payload/staff-logout.test.ts`.
- **Highlighter is selection plus marks, not Rangy.** Save builds a `HighlightRange` and does not write to a collection yet.
- **Membership 3D is one compressed badge** (`public/assets/badge/badge_compressed.glb`, 363KB). Rope physics, the plaque textures, and the ticket scene stay in Hideaway.

## Still out

Commerce, Lost, locker roles, surf, Day N Night, profile slider, Payload footer global, the Rangy highlighter, lanyard physics, the plaque set, the ticket scene, and the full Hideaway header chrome.
