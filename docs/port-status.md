# Hideaway port status

## Type and CSS

Hideaway sets `html { font-size: 62.5% }`, so `1rem` is 10px there. Sophomores leaves the root at the browser default, so `1rem` is 16px.

Port the rest of the Hideaway visual system: color, border radius, borders, and motion. Do not port the 62.5% root. Ported type uses `font-size: 1rem` on Sophomores’ root. A Hideaway `font-size: 10px`, or a `1rem` that only meant 10px because of that root, becomes `1rem` here. Do not rescale the Sophomores root down to 10px to preserve the old rem math.

Updated: 2026-11-03. Hideaway `main` is unchanged after `f5b5b9ae`.

| Step | State | Where |
|---|---|---|
| 1. Snapshot and push Hideaway | Done | `origin/main` `f5b5b9ae` |
| 2. Slot types and fixtures | Done | `lib/content/*`, `/reading` |
| 3. Slim collections | Migration generated, not applied | `migrations/20261103_070710_content_collections.ts` |
| 4. Shared canvas | Mounted from the public site root | `components/gl/site-frame.tsx` |
| 5. Header and article layouts | Header scrub and article grid on `/reading` | `components/shell/site-header.tsx`, `components/reading/article-hero.tsx` |
| 6. Bookmark, radio, notices | Bookmark, notice list, MorphSVG play/pause, tick rail, ±10s seek, counter, and SVG reels. The 3D tape model stays in Hideaway. | `components/radio/` |
| 7. Auth screens | Sign-in, sign-up, reset, six-digit two-factor, and a passkey button. None call Better Auth. | `components/auth/` |
| 8. Highlighter and membership 3D | Reader marks quotes. A static badge `View` uses the 363KB compressed model. Rope physics and the plaque set are not copied. | `components/reading/reader.tsx`, `components/membership/member-badge.tsx` |
| 9. Credits, parallax, Starliner, ticker | On `/reading`. Credits rail and Starliner lines are the timelines, not the full original scenes. Ticker crown is the shader `View`. | `components/sections/*`, `components/shell/ticker/*` |
| 10. Payload list components | Post archive plus previous/next. Next changes the article among the posts passed in. | `components/reading/post-archive.tsx`, `components/reading/page-links.tsx` |

## Review these

- **Schema migration is generated and not applied.** `migrations/20261103_070710_content_collections.ts` adds tags, categories, media, posts, bookmarks, citations, albums, tracks, playlists, and notifications. The down function drops those tables. It has not been run against the local database or production.
- **Post body is a textarea**, not Lexical. The article grid is the Hideaway layout with `PostCard` props. Metadata that was `10px` in Hideaway is `1rem` here. `rounded-3xl` and the border treatment are copied. The 62.5% root is not.
- **The full Hideaway header is not copied.** Scroll compaction uses the same 350px scrub. Search, radio, check-in, and the cursor store stay behind.
- **GSAP 3.15.0 and `@gsap/react` 2.1.2 are installed, including MorphSVG.** The play control morphs the Hideaway 15×15 play and pause paths. `package.json` already had an uncommitted removal of `pnpm.onlyBuiltDependencies`; that removal is still there.
- **Credits are the name rail only.** Confetti, the portrait focus, and the Lenis lock stay in Hideaway.
- **Starliner keeps the line timeline and `rounded-[10px]`.** The large star-field SVG backdrop stays in Hideaway.
- **Parallax title is `text-5xl`.** The original `6.4rem` assumed a 10px root. It is not copied as `6.4rem`.
- **Ticker crown is copied and claims the canvas while in view.** It is not yet proven against the shared `<View.Port />` in a browser. Sophomores does not gate it on reduced motion.
- Howler was already present and drives the play button. The fixture audio file does not exist, so Play will not make sound until a file is added.
- **Shared canvas is mounted from the public site root** (`SiteFrame` in `app/(site)/layout.tsx`), the same place Hideaway mounts `Main`. Scenes join it with drei `<View>`. Auth's staff login document and the Payload admin root do not mount it. Layer scale is `siteLayer.canvas = 1` and `siteLayer.header = 2`, under the existing overlay band at 50. DPR is capped at 1.5. Flame, warp, the teaser orb, and the invitation study keep their own canvases.
- **Auth forms do not call Better Auth.** Two-factor only checks that the code is six digits, then calls `onSubmit`. The passkey button calls `onPasskey`.
- **Existing sophomores edits were not touched:** `lib/payload/collections/Admins.ts`, `tests/payload/auth-integrity.test.ts`, `tests/payload/staff-logout.test.ts`. `package.json` gained GSAP only, on top of the earlier `pnpm.onlyBuiltDependencies` removal.
- **Highlighter is selection plus marks, not Rangy.** The floating palette, private notes, and Citations REST routes stay in Hideaway. Save builds a `HighlightRange` and does not write to a collection yet.
- **Membership 3D is one compressed badge** (`public/assets/badge/badge_compressed.glb`, 363KB) centered in its `<View>` with a perspective camera. Rope physics, the plaque textures, and the ticket scene stay in Hideaway.

## Still out

Commerce, Lost, locker roles, surf, Day N Night, profile slider, Payload footer global, the Rangy highlighter, lanyard physics, the plaque set, the ticket scene, the full Hideaway header chrome, the 3D tape model, credits confetti, and the Starliner SVG backdrop.
