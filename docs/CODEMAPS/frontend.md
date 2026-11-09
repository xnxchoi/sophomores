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
| Header | `../../src/components` | 350px scrub. `port-rule`, `bg-off-black/90` |
| Hero | `../../src/components` | Lead `text-4xl font-serif`. Secondary grid `lg:grid-cols-6` |
| Reader | `../../src/components` | String offsets via `sliceBody`. Local React state |
| Archive / pager | `post-archive.tsx`, `page-links.tsx` | Pager swaps the article in the posts array |
| Bookmark | `bookmark-button.tsx` | Local toggle. Kinds: post, track, album, playlist |
| Player | `../../src/components` | Howler, MorphSVG, ±10s, counter, reels, `TapeModel` |
| Notices | `../../src/components` | Slot list |
| Badge | `../../src/components` | `MEMBER_BADGE_URL`, one `<View>` |
| Credits | `../../src/components` | `CreditSlot[]`. Focus locks scroll. Patronage runs confetti |
| Parallax | `../../src/components` | Title `text-5xl` |
| Starliner | `../../src/components` | 17 origins, backdrop SVG |
| Ticker | `../../src/components` | Shader view, claims the shared canvas |

## Shade and fields

Declared in `../../src/styles` after the global input rule. The global rule still sets brown underlines and wide tracking on ordinary inputs. `.drawn-field-input` overrides that.

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

<!-- AUTO-GENERATED: ui-composition BEGIN -->
## UI composition

**Last updated:** 2026-11-05. Generated from the seven UI modules below,
`tests/ui/primitives/{primitive-parity,composition-parity}.test.tsx`, and the
composition fixture. The earlier port map above is preserved.

```text
Badge / FormControl / five Sidebar composition sites
  -> local React child resolution + single-host validation
  -> Base UI useRender -> existing host, props/events and refs

HA_Button / HA_VaultButton / HA_Label -> Base UI useRender
HA_Separator -> Base UI Separator render API
SidebarMenuButton tooltip -> existing Base UI Tooltip wrappers
Authentication shell -> Vaul (intentionally retained; outside this batch)
```

| Entry point | Ownership and retained contract |
| --- | --- |
| `../../src/components` | `Badge` keeps its modern `render` API; `HA_Badge` retains its native span/legacy `asChild`, variants and metadata. |
| `../../src/components` | `FormControl` composes one child without a wrapper; React Hook Form values, validation, label IDs, descriptions and focus refs remain connected. |
| `../../src/components` | `SidebarGroupLabel`, `SidebarGroupAction`, `SidebarMenuButton`, `SidebarMenuAction` and `SidebarMenuSubButton` retain their native hosts and `asChild` contracts. Provider/collapse state, metadata and cursor hooks stay with Sidebar. |
| `../../src/components` | `HA_Button` and `HA_VaultButton` retain native implicit submit, explicit type overrides, disabled behavior and legacy styling; Base UI owns host/ref composition. |
| `../../src/components` | `Label` is native; `HA_Label` retains label association, multi-click selection behavior and legacy `asChild`. |
| `../../src/components` | Base UI Separator supplies rendering; legacy orientation, decorative semantics, dimensions and `asChild` remain. |
| `../../src/components` | Existing Base UI wrappers remain. Nonempty Sidebar tooltip trigger forwarding is not established by this composition migration. |

Object-form nullable/Flight children are normalized with
`React.Children.toArray` before emptiness and single-host validation; pending
content follows React suspension. Empty composition stays empty; nonempty
text/multiple hosts fail rather than silently acquiring a wrapper. This small
local boundary is not a custom Slot implementation: Base UI `useRender` owns
cloning, prop/event merging and composed refs. Child precedence, handler ordering,
callback-ref cleanup and transitions are characterized by the two primitive suites.

### Verification boundary

- Reproducible commands and the dated scoped results are in the
  [README composition reference](../../README.md#ui-composition-current-scope-and-focused-checks).
- `tests/support/composition-preview.mjs` compiles
  `tests/fixtures/composition-preview.tsx` against actual production components;
  `--check` compiles without starting a listener. Live mode binds only
  `127.0.0.1:3081`, serves GET assets, and does not load private environment or
  call auth, database or providers.
- Synthetic desktop and 390×844 live checks cover inline errors, label/focus,
  local actions and clipping, not actual auth/phone/checkout readiness. Mobile
  detection/cursor hooks are stubbed, no Skeleton is mounted (its stub throws),
  and CSP blocks fonts/outbound connections, including DevTools discovery.
- Remaining acceptance gap: the existing nonempty Sidebar tooltip
  `render={() => button}` callback does not forward trigger props/ref. Empty
  tooltip composition is covered; nonempty trigger interaction is not certified.
- Existing sidebar random-width purity and Tooltip unused-`className` lint
  findings remain. Focused coverage and no diagnostics in the composition files
  do not establish repository-wide lint/typecheck success.

See the [dependency boundary](dependencies.md#ui-composition-dependency-boundary)
for the retained Radix and Vaul scope. No new route, environment variable,
dependency or infrastructure change belongs to this composition batch.
<!-- AUTO-GENERATED: ui-composition END -->
