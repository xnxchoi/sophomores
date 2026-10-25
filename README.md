# sophomores.co

Private-social-club teaser, built with Next.js 16, React 19, Motion, Lenis, and an interactive flame backdrop. **Draft; release approval and live deployment status are separate from local source checks.**

Last updated: 2026-10-22.

## Local development

Use the pnpm version declared in `package.json`.

```sh
rtk pnpm install --frozen-lockfile
rtk pnpm dev --hostname 127.0.0.1 --port 3210
```

Preview: <http://127.0.0.1:3210/>. Next.js uses Turbopack by default. Do not run development and production builds concurrently against the same `.next` directory; stop the preview first.

## Motion and scroll ownership

- **Motion (`motion/react`)** owns scroll measurement (`useScroll`), interpolation (`useTransform`), timed step playback (`animate`), story reading timers, and isolated layout transitions. Origin retargets directly from its current animated pose to the latest scroll destination; other chapters retain adjacent-step playback. Origin advances automatically after a 3.5-second reading hold, using Lenis to move to the next pinned scroll pose; manual scrolling remains reversible. The last story stops and offers Replay rather than scrolling into the next chapter.
- **Story playback** pauses outside the visible stage, in hidden tabs, while a menu/dialog is open, and for motion opt-outs. Focusing story selection stops autoplay until explicit Play. The story-level Pause preserves elapsed reading time. Hover does not pause: all visible progress bars fade together after a 150ms delay, over 180ms. Visible decorative artwork loops independently of the reading timer.
- **CSS sticky positioning** pins each stage. Section height supplies the scroll distance; pinning does not capture or block scrolling.
- **Lenis (`lenis/react`)** owns wheel smoothing and anchor navigation. Its own `autoRaf` drives smoothing; Motion observes the resulting native scroll position. Native CSS smooth scrolling is disabled to avoid competing smoothing engines. Touch scrolling remains native (`syncTouch: false`).
- **Full motion** stays enabled regardless of the system motion preference. Lenis explicitly opts out of its automatic preference handling. Hidden/offscreen rendering, user-triggered study pause controls, and data-saving media guards remain. The invitation dialog stops Lenis and locks native scrolling while open.
- **Flame renderer** owns WebGL rendering, independently of Motion's page choreography.

### Tune reading time without changing animation code

Edit [`lib/teaser/step-motion.ts`](lib/teaser/step-motion.ts):

- `sectionHeightScale`: scales the entire outer section, including its pinned viewport. Currently **1.2**, adding 20% height without slowing any internal animation.
- `stepMotionTokens`: per-chapter animation durations and easing, independent of scroll distance.

Baseline distances remain in `scrollChapters` in [`lib/teaser/choreography.ts`](lib/teaser/choreography.ts). Outer height is `(100 + steps × holdVh + (steps − 1) × transitionVh) × sectionHeightScale + chapterExitHoldVh` in `svh`. Final reveal dwell adds 60svh to Hero and 45svh to pinned People without shifting earlier cues. Scroll travel is divided into discrete step buckets; the old keyframe plateaus no longer scrub the animation. Invitation is 120svh. Tablet/mobile People stays an unpinned vertical stack with card heights and spacing increased approximately 20%. Blur headings reverse smoothly over 550ms. Returning to the top retains the docked hero layout with no notifications; both notifications wait for scrolling and share the same transition.

| Edit | Source |
| --- | --- |
| Opening hold, docking, backdrop reveal, and glyph timing (seconds) | [`lib/teaser/entry-tokens.ts`](lib/teaser/entry-tokens.ts) |
| Shared durations, easing, springs, and Lenis `scrollSmoothing` | [`lib/motion-tokens.ts`](lib/motion-tokens.ts) |
| Story reading time and automatic transition duration | [`lib/teaser/story-playback.ts`](lib/teaser/story-playback.ts) |
| Brief text fade-through and blur (sharp outside the central 20% of each handoff) | [`lib/teaser/text-tokens.ts`](lib/teaser/text-tokens.ts) |
| Reference-style word blur on hero, People, and invitation headings | [`lib/teaser/blur-tokens.ts`](lib/teaser/blur-tokens.ts) |
| Copy, ticket-sale hint, and confirmed ticket-sale timestamp | [`lib/teaser/content.ts`](lib/teaser/content.ts) |
| Hero flame palette and scroll zoom | [`lib/teaser/backdrop-tokens.ts`](lib/teaser/backdrop-tokens.ts) |
| Chapter components and Motion bindings | [`components/teaser/`](components/teaser/) |

## Backdrops

The main backdrop uses the approved [`flame-backdrop/react/FlameBackdrop.tsx`](flame-backdrop/react/FlameBackdrop.tsx); see its [integration guide](flame-backdrop/README.md). It receives chapter visibility from the teaser; document hiding suspends its clock.

The contacts footer uses [`FlameFooterBackdrop`](flame-backdrop/footer.ts), sharing the accepted image-backed flame/aurora renderer with the [shader editor](components/devtools/flame-editor/flame-editor.tsx) at `/studies/flame-envelope`. Replace the `maskSource` prop (default `/masks/flame-envelope.png`) to try another mask without replacing the shader or restarting its clock. Footer visibility, hidden documents, and explicit pause controls pause active elapsed time; the hero keeps its separate approved ring. See the [mask sources](design/flame-envelope/) and [component guide](flame-backdrop/README.md) before editing the mask or material.

## Source and reference organization

- `app/`: App Router pages, layouts, and endpoints; study URLs are development entry points, not component ownership boundaries.
- `components/`: feature-owned UI (`teaser`, `entry-animation`, `invitation`, `tickets`, `phone-verification`), shared primitives, and `devtools/flame-editor`.
- `flame-backdrop/field/`: shared renderer, material, shader, texture loading, parameters, and playback lifecycle.
- `hooks/` and `lib/`: shared lifecycle hooks and domain models/timing tokens.
- `design/`: editable mask sources and retained original visual references, not disposable screenshots.
- `docs/reference/` and `docs/qa/`: dated reference contracts and historical QA evidence.
- `tests/`: durable regression tests; the [phone-verification browser harness](tests/browser/phone-verification.mjs) is retained separately from generated screenshots.
- `deployment/` and `scripts/deployment/`: operational source/runbooks, not generated release packages.

See [repository curation and merge policy](docs/REPOSITORY-CURATION.md) for what belongs on `main`, what stays study-only, and which local deployment state must not be deleted.

## Checks

```sh
rtk pnpm test
rtk pnpm test:coverage
rtk pnpm typecheck
rtk pnpm build
```

Coverage thresholds apply only to **`lib/teaser/**`**, not the whole feature, React components, or WebGL renderer. Passing source/unit checks does not prove browser usability or visual fidelity. Recheck fresh-load entrance, forward/reverse chapter scrolling, mobile navigation, invitation focus/Escape, footer clipping, and full-motion playback with the system motion preference enabled in a browser after choreography changes.

## Standalone production package

`next.config.ts` enables `output: "standalone"`. After stopping the development server, build and include assets that Next.js does not copy automatically:

```sh
rtk pnpm build
rtk proxy cp -r public .next/standalone/
rtk proxy cp -r .next/static .next/standalone/.next/
rtk proxy env HOSTNAME=127.0.0.1 PORT=3210 node .next/standalone/server.js
```

The standalone directory is the deployment package; use its `server.js`, not `next start`. For a low-spec VPS, build elsewhere for the target OS/architecture and run behind a TLS reverse proxy with a process supervisor. These are packaging instructions, **not evidence of VPS deployment, capacity, DNS, or TLS verification**.

## Checkpointed deployment automation

Use `rtk pnpm run deploy plan` to inspect the local snapshot → Linux image → smoke
test → export workflow without executing it. See [the deployment runbook](deployment/README.md)
for individual stages, checkpoints, interrupted-run recovery, safe retries and
the rollback contract. Live VPS/DNS/TLS changes are deliberately not configured.

## Release boundaries

- The ticket-sale opening is approximately ten days away; exact date/time is **TBD**. This is not the event date. Set a confirmed timezone-aware ISO timestamp in `teaser.launchAt` and update the provisional hint before release.
- The invitation is local preview UI only: no email is collected, no reservation is made, and no tickets are sold. PostgreSQL/Supabase and Brevo are not connected to this teaser flow.
- Metadata in `app/(site)/layout.tsx` remains `noindex`/`nofollow` for the draft.
- Reference-derived fonts and images under `public/fonts` and `public/teaser` require clearance or replacement before public release.
- Publishing, external email, payment, and production infrastructure changes require separate approval.
