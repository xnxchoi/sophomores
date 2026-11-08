# sophomores.co

Private-social-club teaser, built with Next.js 16, React 19, Motion, Lenis, and an interactive flame backdrop. **Draft; release approval and live deployment status are separate from local source checks.**

Last updated: 2026-10-27.

<!-- AUTO-GENERATED: current-development-reference BEGIN -->
## Current development and contribution reference

Generated from `package.json`, `tests/run-unit.mjs`, installed package engine
metadata, and the referenced source scripts. Verified: **2026-11-06**. The
PortOne SDK installation added no package script. This section
supersedes older setup/test-discovery assumptions retained below.

### Prerequisites and setup

- Use **pnpm 12.16.1**, as pinned by `packageManager` in `package.json`.
- The repository has no root `engines` field or Node version file. The installed
  Payload 3.92.1 packages require Node `^22.23.4 || >=24.22.1`; use **Node
  24.22.1 or newer** for the documented native-glob test workflow.
- Install with `rtk pnpm install --frozen-lockfile`. Review package/lockfile changes
  separately; do not upgrade dependencies as a documentation/setup side effect.
- Keep actual credentials in ignored private environment files. Payload requires
  `PAYLOAD_SECRET` and `DATABASE_URI`; canonical auth uses its separate
  `BETTER_AUTH_SECRET`. Read the [canonical local auth runbook](docs/deployment/member-auth.local.md)
  for current environment formats, migrations, phone proof, mail, and recovery.
- `rtk pnpm dev` starts Docker Desktop and the **existing** `postgres` container,
  waits for TCP **4141**, then binds Next to `127.0.0.1`. It does not provision a
  database/container, apply migrations, or enable outbound mail. Canonical local
  auth requires consistent configured origins; the runbook normally uses
  `http://localhost:3000` rather than mixing hostnames.
- Run expensive validation jobs sequentially with explicit resource/time limits;
  stop the dev server before a production build. No package script currently
  implements a process-group memory/time guard for you.

### Available package scripts

| Command | Source-backed purpose |
| --- | --- |
| `rtk pnpm run build` | Compile the optimized Next.js production/standalone output. Does not apply migrations. |
| `rtk pnpm run ci` | Apply Payload migrations, then build. Database-mutating; not a read-only check. |
| `rtk pnpm run dev` | Start Docker Desktop and the existing postgres container, wait for TCP 4141, then start loopback Next dev with local public preview access. |
| `rtk pnpm run start` | Run next start against a prior build; use the generated server.js for a standalone deployment package. |
| `rtk pnpm run lint` | Run ESLint; accepts explicit file paths for a scoped check. |
| `rtk pnpm run dev:init` | Alias for micreate (create a Payload migration), not database provisioning. |
| `rtk pnpm run test` | Run the ordinary tests/run-unit.mjs discovery; excludes opt-in database/provider suites and runtime acceptance. |
| `rtk pnpm run typecheck` | Run TypeScript with --noEmit. |
| `rtk pnpm run generate:types` | Generate Payload collection/global TypeScript types from payload.config.ts. |
| `rtk pnpm run generate:schema` | Generate the Payload PostgreSQL schema source; does not apply a migration. |
| `rtk pnpm run generate:importmap` | Generate the Payload admin import map. |
| `rtk pnpm run micreate` | Create a reviewed Payload migration; pass its name, e.g. rtk pnpm micreate migration_name. |
| `rtk pnpm run migrate` | Apply pending Payload migrations to the configured database. |
| `rtk pnpm run migrate:fresh` | Destructively reset/replay Payload migrations. Follow the temporary local-only reset policy, never production. |
| `rtk pnpm run deploy` | Run the checkpointed deployment CLI. plan is the default; execution and remote mutations are separate actions. |
| `rtk pnpm run copy:sync` | Regenerate lib/teaser/content.ts from an explicitly selected CSV/Sheets source. Writes copy; a URL source performs a network read. |
| `rtk pnpm run phone-verification:preview` | Start the configured isolated loopback phone-verification preview; does not start the mailbox receiver. |
| `rtk pnpm run test:preview-runtime` | Run the post-build production preview-auth runtime acceptance suite; requires standalone build output. |

For `copy:sync`, provide the source explicitly via `SHEET_URL`, `CSV_PATH`, or the
CLI argument; its legacy default is workstation-specific. Consult the
[brand-voice guide](docs/design/brand-voice.md) before changing public copy.

### Test selection and contribution checks

```sh
rtk proxy node tests/run-unit.mjs --list
rtk pnpm test
rtk pnpm typecheck
rtk pnpm lint
```

Ordinary discovery does **not** automatically load private `.env.local` or opt in
to PostgreSQL/provider integration. Keep unrelated opt-in test database variables
out of an ordinary unit run. `--database` deliberately loads local environment,
validates a loopback PostgreSQL target, enables `PAYLOAD_DATABASE_TESTS=1`, and
runs exactly these three suites:

- `tests/payload/auth-integrity.test.ts`
- `tests/payload/homepage-fallbacks.test.ts`
- `tests/payload/staff-registration.test.ts`

```sh
rtk proxy node tests/run-unit.mjs --database --list
rtk proxy node tests/run-unit.mjs --database
```

Other canonical/recovery PostgreSQL suites and the real Payload authorization
integration retain their explicit opt-ins; see the
[local runbook](docs/deployment/member-auth.local.md). Runtime and browser tests
are separate acceptance layers. A successful unit run is not a provider delivery,
physical-device, authenticated CMS browser, or production acceptance claim.

Before a contribution/PR:

1. Preserve unrelated dirty work; review a scoped diff, not a blanket stage/reset.
2. Keep all new tests/fixtures under root `tests/`; use feature-scoped tests first.
3. Follow `AGENTS.md`: Tailwind-only UI changes, inline complete class names,
   established library APIs, and live browser plus Santa review for visual work.
4. Run relevant tests, typecheck, scoped lint, and `rtk git diff --check`. Record
   commands/results and pending acceptance gates; do not invent a coverage claim.
5. Include schema migrations and matching generated types/schema/import-map changes
   when source requires them. Review destructive operations independently.
6. Keep secrets, generated screenshots, private runtime files and release state out
   of the diff. Document rollback/deployment gates and use a conventional commit.

No repository-wide formatter or pre-commit package script is currently declared;
Prettier and `.prettierrc` exist, but do not imply an installed hook. Follow the
[deployment runbook](deployment/README.md) for release preparation; pushing,
publishing, provider changes, and live deployment require separate approval.
### PortOne checkout: current scope

The official browser/server SDKs are installed; checkout, server reconciliation,
signed webhook and result UI are wired but **disabled, sandbox-only, and not
live-ready**. Prepare now accepts `{ quantity, attemptId: UUID }`, persists a
unique retry identity plus owner/context fingerprint, and returns a required
`recovered` flag so an existing attempt never automatically replays the SDK.
Partial reversals/disputes enter sticky `held` status, including signed dispute
events and a fresh stored-state check after provider lookup. The additive
`20261106_000000_payment_safety` migration was separately approved and applied
to the existing local database. Real-adapter unique-index, retry/CAS and hold-race
checks passed with synthetic provider facts and narrowly cleaned fixture records.

Approved same-entity seller data and the owner's public mobile contact are now
present. Policies remain unpublished; that mobile contact does not satisfy the
unchanged non-mobile checkout gate; its selected-PG requirement remains unverified.
Explicit same-ID resume has bounded local acceptance, not provider acceptance.
Approved offer/policies, reviewed TEST channel and real provider acceptance remain
outstanding. See the [current integration runbook and next steps](docs/deployment/member-auth.local.md#portone-checkout--current-source-scope-2026-11-06)
and [backend map](docs/CODEMAPS/backend.md#portone-checkout-slice--updated-2026-11-06).
Installation alone does not establish payment, provider or deployment acceptance.

The owner supplied the event offer directly. Its current details and unpublished
Korean/English copy are in the [commerce working draft](docs/reference/commerce-policy-drafts.md#current-offer-direction--user-supplied-unpublished).
The fillable ticket briefs are no longer the input workflow; the draft does not
authorize policy publication or payment activation.

The dedicated database suite uses `PORTONE_PAYLOAD_DATABASE_TESTS=1` and is excluded
from ordinary discovery and the generic three-suite `--database` selection; see
the runbook before executing it. Local Postgres now binds only to `127.0.0.1:4141`,
preserving its existing volume and credentials.

### UI composition: current scope and focused checks

The current composition entrypoints are `components/ui/badge.tsx`, `form.tsx`,
`sidebar.tsx`, `button.tsx`, `label.tsx`, and `separator.tsx`. They use installed
Base UI APIs rather than direct Radix Slot/Label imports; this is **not** a
repository-wide Radix replacement. Other Radix wrappers remain, and **Vaul is
intentionally retained** as the authentication surface owner, not queued for
migration. See the [frontend ownership map](docs/CODEMAPS/frontend.md#ui-composition)
and [dependency boundary](docs/CODEMAPS/dependencies.md#ui-composition-dependency-boundary).

Legacy `asChild` and `FormControl` validate a single resolved host locally.
`React.Children.toArray` resolves object-form nullable/Flight children, including
pending content through React suspension, before emptiness/single-host checks.
Base UI `useRender` still owns cloning, prop/event composition and refs; there is
no custom Slot facade. Empty composed children render nothing, invalid nonempty
text/multiple hosts are rejected, and legacy native buttons preserve implicit
form submission unless the caller supplies an explicit `type`.

Run only the explicit primitive suites for this boundary; no private environment
loader, database, provider or build is required. These checks use installed
dependencies: clean-checkout/frozen-install readiness is **not established**.
Existing Form imports already depend on locally installed `react-hook-form`;
its manifest/lockfile restoration is separate, uncommitted dependency work, not
part of this composition batch.

```sh
rtk proxy env TSX_TSCONFIG_PATH=tsconfig.json node --import tsx --import ./tests/support/css-modules.mjs --test --test-concurrency=1 tests/ui/primitives/composition-parity.test.tsx tests/ui/primitives/primitive-parity.test.tsx
rtk proxy node tests/support/composition-preview.mjs --check
```

For live review, `rtk proxy node tests/support/composition-preview.mjs` serves the
synthetic fixture at <http://127.0.0.1:3081/>; stop it with Ctrl-C when finished.
It renders actual Badge/Form/Sidebar components, allows GET only, and blocks
outbound connections, form delivery and external fonts with CSP. Mobile-provider
and cursor behavior are stubbed; Skeleton throws if mounted. A narrow viewport
therefore checks layout, not physical-device/mobile-provider behavior or exact
fonts, cursor rendering or Skeleton acceptance. Recheck inline errors, input
focus/label association, composed local actions and horizontal clipping.

The **2026-11-05 scoped run passed 97 tests**, with aggregate coverage of **93.75%
lines / 94.15% branches / 95.83% functions** for the instrumented scope, not the
repository. Desktop and 390×844 synthetic live checks passed; this is not real
authentication, phone verification, checkout, provider or production acceptance.
The broader auth/ticket selection was **103/104**: its untouched OTP-alignment
assertion at `tests/authentication/authentication-compositions.test.tsx:729`
remains failing. Whole-project TypeScript reported **420 diagnostics**, with none
in the scoped composition files. Existing sidebar `Math.random` purity and
Tooltip unused-`className` lint findings remain; do not report whole-project
lint/typecheck as green. The nonempty sidebar tooltip trigger callback still
ignores supplied trigger props/ref and remains a separate acceptance gap.

Scripts, environment variables, routes and infrastructure did not change in this
composition batch; their documentation was not expanded as a migration task.

### Manual-reference follow-up

The preserved older sections below contain unresolved source links:
`hooks/use-story-playback.tsx`, `flame-backdrop/react/FlameBackdrop.tsx`,
`flame-backdrop/README.md`, `flame-backdrop/footer.ts`, and `design/flame-envelope/`.
Treat those path references as historical pending manual review, not navigation
for current implementation. The present backdrop component entrypoints are
[`components/gl/flame-backdrop/FlameBackdrop.tsx`](components/gl/flame-backdrop/FlameBackdrop.tsx)
and [`components/gl/flame-backdrop/FlameFooterBackdrop.tsx`](components/gl/flame-backdrop/FlameFooterBackdrop.tsx).
No replacement design-source location or missing guide is inferred.

<!-- AUTO-GENERATED: current-development-reference END -->

## Local development

Start the local app with one command (also works from the sibling `Sophomores` planning folder):

```sh
npm run dev
```

Open the URL printed by Next.js (normally <http://127.0.0.1:3000/>). The dev command binds to loopback and enables local access without deployed preview-admin credentials. It does not start verification receivers, contact mail providers, or load private deployment configuration. The protected preview hostname remains protected; `build` and `start` are unchanged. Next.js uses Turbopack by default and keeps development output in `.next/dev`.

For a fresh checkout, install dependencies once with the pnpm version declared in `package.json`: `pnpm install --frozen-lockfile`.

## Motion and scroll ownership

- **Motion (`motion/react`)** owns scroll measurement (`useScroll`), interpolation (`useTransform`), timed step playback (`animate`), story reading timers, and isolated layout transitions. Origin retargets directly from its current animated pose to the latest scroll destination; other chapters retain adjacent-step playback. Origin advances automatically after a 3.5-second reading hold, using Lenis to move to the next pinned scroll pose; manual scrolling remains reversible. The last story stops and offers Replay rather than scrolling into the next chapter.
- **Story playback** pauses outside the visible stage, in hidden tabs, while suspended by its parent, and during keyboard interaction. The story-level Pause preserves elapsed reading time. Hover does not pause. Visible decorative artwork loops independently of the reading timer.
- **CSS sticky positioning** pins each stage. Section height supplies the scroll distance; pinning does not capture or block scrolling.
- **Lenis (`lenis/react`)** owns wheel smoothing and anchor navigation. Its own `autoRaf` drives smoothing; Motion observes the resulting native scroll position. Native CSS smooth scrolling is disabled to avoid competing smoothing engines. Touch scrolling remains native (`syncTouch: false`).
- **Full motion** stays enabled regardless of the system motion preference. Lenis explicitly opts out of its automatic preference handling. Hidden/offscreen rendering, user-triggered study pause controls, and data-saving media guards remain. The invitation dialog stops Lenis and locks native scrolling while open.
- **Flame renderer** owns WebGL rendering, independently of Motion's page choreography.

### Tune reading time without changing animation code

Edit [`lib/teaser/choreography.ts`](lib/teaser/choreography.ts):

- `sectionHeightScale`: scales the entire outer section, including its pinned viewport. Currently **1.2**, adding 20% height without slowing any internal animation.
- `stepMotionTokens`: per-chapter animation durations and easing, independent of scroll distance.

Baseline distances remain in `scrollChapters` in [`lib/teaser/choreography.ts`](lib/teaser/choreography.ts). Outer height is `(100 + steps × holdVh + (steps − 1) × transitionVh) × sectionHeightScale + chapterExitHoldVh` in `svh`. Final reveal dwell adds 60svh to Hero and 45svh to pinned People without shifting earlier cues. Scroll travel is divided into discrete step buckets; the old keyframe plateaus no longer scrub the animation. Invitation is 120svh. Tablet/mobile People stays an unpinned vertical stack with card heights and spacing increased approximately 20%. Blur headings reverse smoothly over 550ms. Returning to the top retains the docked hero layout with no notifications; both notifications wait for scrolling and share the same transition.

| Edit                                                               | Source                                                                     |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Opening hold, docking, backdrop reveal, and glyph timing (seconds) | [`lib/teaser/entry-tokens.ts`](lib/teaser/entry-tokens.ts)                 |
| Shared durations, easing, springs, and Lenis `scrollSmoothing`     | [`lib/motion-tokens.ts`](lib/motion-tokens.ts)                             |
| Story reading hold and visibility threshold                        | [`hooks/use-story-playback.tsx`](hooks/use-story-playback.tsx)             |
| Story scroll targets and automatic scroll duration                 | [`components/teaser/story.tsx`](components/teaser/story.tsx)               |
| Orbit description entrance/exit                                    | [`components/teaser/orbit.tsx`](components/teaser/orbit.tsx)               |
| Word blur, including its per-word duration and reverse timing      | [`components/blur-text.tsx`](components/blur-text.tsx)                     |
| Conversation colors, word stagger, and typing dots                 | [`components/teaser/conversation.tsx`](components/teaser/conversation.tsx) |
| Copy, ticket-sale hint, and confirmed ticket-sale timestamp        | [`lib/teaser/content.ts`](lib/teaser/content.ts)                           |
| Hero flame palette and scroll zoom                                 | [`lib/teaser/backdrop-tokens.ts`](lib/teaser/backdrop-tokens.ts)           |
| Chapter components and Motion bindings                             | [`components/teaser/`](components/teaser/)                                 |

Follow the owner, not a controller chain: `useChapterScroll` measures scroll and
starts native Motion transitions; `useStoryPlayback` owns the reading hold;
`useEntry` declares one native opening sequence. Components own their visual
variants. The small local reversal, focus, visibility, and once-only completion
rules are interaction policy, not replacement animation engines. Shared files
retain only genuinely shared chapter geometry, tuning, and editorial content.
See [the native-motion verification notes](docs/qa/motion-native-20261027.md).

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
rtk proxy node --import tsx --test tests/motion/*.test.*
rtk pnpm typecheck
rtk pnpm build
```

<!-- AUTO-GENERATED: current-test-discovery-notice BEGIN -->
> **Current runner correction (2026-11-02):** the older default-database warning
> retained below is historical. `tests/run-unit.mjs` now excludes the three CMS
> database/provider suites unless `--database` is explicitly supplied. Other
> PostgreSQL suites remain opt-in, and runtime acceptance stays separate. Use the
> current test-selection reference above, not that older discovery assumption.
<!-- AUTO-GENERATED: current-test-discovery-notice END -->

The default test runner also discovers database-backed Payload tests; do not run
it as an isolated motion check. Use the explicit non-database test list in the
[verification notes](docs/qa/motion-native-20261027.md). Passing source/unit checks
does not prove browser usability or visual fidelity. Recheck fresh-load entrance,
forward/reverse chapter scrolling, mobile navigation, invitation focus/Escape,
footer clipping, and full-motion playback after choreography changes. No
whole-feature coverage percentage is implied by the focused motion tests.

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
