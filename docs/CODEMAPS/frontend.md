<!-- Generated: 2026-11-04 | Files scanned: 81 port files plus the app route listing; 332 app/components/lib TS files counted | Token estimate: ~370 -->

# Frontend

## Public site

```
app/(site)/layout.tsx -> SiteFrame -> SharedCanvas
app/(site)/reading/layout.tsx -> .port-shade + SUIT + Narcissian variables
app/(site)/reading/page.tsx -> ReadingStage(fixtures)
```

## Reading stage

| Piece | File | Notes |
|---|---|---|
| Header | `components/shell/site-header.tsx` | 350px scrub. `port-rule`, `bg-off-black/90` |
| Hero | `components/reading/article-hero.tsx` | Lead `text-4xl font-serif`. Secondary grid `lg:grid-cols-6` |
| Reader | `components/reading/reader.tsx` | String offsets via `sliceBody`. Local React state |
| Archive / pager | `post-archive.tsx`, `page-links.tsx` | Pager swaps the article in the posts array |
| Bookmark | `bookmark-button.tsx` | Local toggle. Kinds: post, track, album, playlist |
| Player | `components/radio/track-player.tsx` | Howler, MorphSVG, ±10s, counter, reels, `TapeModel` |
| Notices | `components/notices/notice-list.tsx` | Slot list |
| Badge | `components/membership/member-badge.tsx` | `MEMBER_BADGE_URL`, one `<View>` |
| Credits | `components/sections/credits-rail.tsx` | `CreditSlot[]`. Focus locks scroll. Patronage runs confetti |
| Parallax | `components/sections/parallax-grid.tsx` | Title `text-5xl` |
| Starliner | `components/sections/starliner.tsx` | 17 origins, backdrop SVG |
| Ticker | `components/shell/ticker/TickerCrown.tsx` | Shader view, claims the shared canvas |

## Shade and fields

Declared in `styles/globals.css` after the global input rule. The global rule still sets brown underlines and wide tracking on ordinary inputs. `.drawn-field-input` overrides that.

```
.port-shade     sets --port-shade, default --faded-white
.port-wash      one shade, three alphas
.port-rule      same shade at alpha 0.16
DrawnField      components/auth/drawn-field.tsx
                placeholder " ", line scaleX, label lift
```

`.font-serif` inside `.port-shade` uses `--font-port-serif`. The site root `--font-sans` stays Helvetica Neue.

## Canvas exceptions

`FieldCanvas`, warp field, teaser footer orb, and invitation study light keep their own canvases. They do not join `SiteFrame`.
