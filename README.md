# sophomores.co

Private-social-club teaser, built with Next.js 16, React 19, Motion, Lenis, and an interactive flame backdrop. **Draft, not a deployed release.**

Last updated: 2026-10-03 (Asia/Seoul).

## Local development

Use the pnpm version declared in `package.json`.

```sh
rtk pnpm install --frozen-lockfile
rtk pnpm dev --hostname 127.0.0.1 --port 3210
```

Preview: <http://127.0.0.1:3210/>. Next.js uses Turbopack by default. Do not run development and production builds concurrently against the same `.next` directory; stop the preview first.

## Motion and scroll ownership

- **Motion (`motion/react`)** owns scroll measurement (`useScroll`), interpolation (`useTransform`), timed step playback (`animate`), story reading timers, and isolated layout transitions. Scroll selects a discrete destination; the current adjacent transition finishes even when scrolling stops, then catches up to the latest destination. No custom animation clock. Origin advances automatically after a five-second reading hold, using Lenis to move to the next pinned scroll pose; manual scrolling remains reversible. The last story stops and offers Replay rather than scrolling into the next chapter.
- **Story playback** pauses outside the visible stage, in hidden tabs, on mouse hover, while a menu/dialog is open, and for motion opt-outs. Focusing story selection stops autoplay until explicit Play. The story-level Pause preserves elapsed reading time; the global Pause motion reveals the static layout.
- **CSS sticky positioning** pins each stage. Section height supplies the scroll distance; pinning does not capture or block scrolling.
- **Lenis (`lenis/react`)** owns wheel smoothing and anchor navigation. Its own `autoRaf` drives smoothing; Motion observes the resulting native scroll position. Native CSS smooth scrolling is disabled to avoid competing smoothing engines. Touch scrolling remains native (`syncTouch: false`).
- **Reduced motion / Pause motion** disables the animated presentation and removes Lenis smoothing. The invitation dialog stops Lenis and locks native scrolling while open.
- **Flame renderer** owns WebGL rendering, independently of Motion's page choreography.

### Tune reading time without changing animation code

Edit [`lib/teaser/step-motion.ts`](lib/teaser/step-motion.ts):

- `sectionHeightScale`: scales the entire outer section, including its pinned viewport. Currently **1.2**, adding 20% height without slowing any internal animation.
- `stepMotionTokens`: per-chapter animation durations and easing, independent of scroll distance.

Baseline distances remain in `scrollChapters` in [`lib/teaser/choreography.ts`](lib/teaser/choreography.ts). Outer height is `(100 + steps × holdVh + (steps − 1) × transitionVh) × sectionHeightScale` in `svh`. Scroll travel is divided into discrete step buckets; the old keyframe plateaus no longer scrub the animation. Invitation is 120svh. Tablet/mobile People stays an unpinned vertical stack with card heights and spacing increased approximately 20%. Reduced-motion mode keeps its natural reading layout rather than adding empty pinned travel.

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

The main backdrop uses the approved [`components/flame-backdrop/FlameBackdrop.tsx`](components/flame-backdrop/FlameBackdrop.tsx); see its [integration guide](components/flame-backdrop/README.md). It receives visibility, pause, and reduced-motion settings from the teaser.

The footer still uses the **temporary existing orb** in [`components/teaser/footer-orb.tsx`](components/teaser/footer-orb.tsx). The separate `FlameFooterBackdrop` experiment is **not wired into this page**; footer design remains unfinished.

## Checks

```sh
rtk pnpm test
rtk pnpm test:coverage
rtk pnpm typecheck
rtk pnpm build
```

Coverage thresholds apply only to **`lib/teaser/**`**, not the whole feature, React components, or WebGL renderer. Passing source/unit checks does not prove browser usability or visual fidelity. Recheck fresh-load entrance, forward/reverse chapter scrolling, mobile navigation, invitation focus/Escape, footer clipping, and reduced motion in a browser after choreography changes.

## Standalone production package

`next.config.ts` enables `output: "standalone"`. After stopping the development server, build and include assets that Next.js does not copy automatically:

```sh
rtk pnpm build
rtk proxy cp -r public .next/standalone/
rtk proxy cp -r .next/static .next/standalone/.next/
rtk proxy env HOSTNAME=127.0.0.1 PORT=3210 node .next/standalone/server.js
```

The standalone directory is the deployment package; use its `server.js`, not `next start`. For a low-spec VPS, build elsewhere for the target OS/architecture and run behind a TLS reverse proxy with a process supervisor. These are packaging instructions, **not evidence of VPS deployment, capacity, DNS, or TLS verification**.

## Release boundaries

- The ticket-sale opening is approximately ten days away; exact date/time is **TBD**. This is not the event date. Set a confirmed timezone-aware ISO timestamp in `teaser.launchAt` and update the provisional hint before release.
- The invitation is local preview UI only: no email is collected, no reservation is made, and no tickets are sold. PostgreSQL/Supabase and Brevo are not connected to this teaser flow.
- Metadata in `app/layout.tsx` remains `noindex`/`nofollow` for the draft.
- Reference-derived fonts and images under `public/fonts` and `public/teaser` require clearance or replacement before public release.
- Publishing, external email, payment, and production infrastructure changes require separate approval.
