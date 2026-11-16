# ADR-0002: The colour mode is set the way The Hideaway sets it

**Date**: 2026-11-15, revised 2026-11-16
**Status**: accepted
**Deciders**: the owner (D2 in the design requirements)

## Context

The site has a dark and a light mode. Two ways to set the mode were on the table: the `data-theme` attribute
with a boot script, already built here (`src/lib/content/theme.ts`), or a theme library (none installed). The
owner chose to follow The Hideaway (`~/WebstormProjects/thehideaway`, read 2026-11-15). It sets `data-theme`
from a boot script and keeps two themes: a global theme, and a page theme that a page can hold while it is
open. On 2026-11-15 this site briefly dropped the device setting and made every page dark until the visitor
picked; on 2026-11-16 the owner replaced that with The Hideaway's two layers.

## Decision

We set the mode with the `data-theme` attribute, written by a boot script before first paint, and keep two
layers, as The Hideaway does (owner, 2026-11-16):

- **Global theme.** The visitor's pick, saved under one key (`sophomores-theme`); until they pick, their device
  setting, followed live. Only a pick is saved.
- **Page theme.** A page can hold a theme while it is open. It wins over the global theme and is never saved.
  Leaving the page releases it, and the global theme returns, changing the page if it differs. Pages that
  hold dark, traced from The Hideaway (owner, 2026-11-16): the home page (owner) and `/team` (The Hideaway's
  `/the-team`) in `pageThemes` (`src/lib/content/theme.ts`); and the 404, which the boot script can't know by
  its path. A URL that matches no route is served by `src/app/global-not-found.tsx` (Next's
  `experimental.globalNotFound`; the site has three root layouts and no root not-found, so a thrown `notFound()`
  is otherwise served as Next's bare error shell with no theme). It renders the whole document with
  `data-theme="dark"` on the served `<html>` and no boot script, so it paints dark from the first frame and never
  shows or saves the pick; it is its own root layout, so leaving it is a full page load (no fade), after which
  the boot script paints the next page in its own theme. No 404 may paint unstyled (owner, 2026-11-16), and a
  `notFound()` thrown while a page renders always gets Next's bare error shell (Next's not-found boundary renders
  only on the client), so every site 404 reaches an unmatched route before a page renders (`next.config.ts`
  rewrites to `/not-found`): order ids the order pages reject go there directly; a missing essay or setlist
  redirects to its own URL with `?not-found=1`, which goes there. A test fails on any new `notFound()` in
  `(site)` pages or components; `(site)/not-found.tsx` with its inline hold (`holdThemeBoot`) stays only as the
  fallback for the two order pages' own check. Payload keeps its own 404s: `/admin/*` is always Payload's admin
  (its Not Found view, then its sign-in for a visitor), and `/api`, like `/api/*`, answers with Payload's JSON.
  The 404 holds dark through the store once mounted (`useHoldPageTheme`), whose
  release waits a microtask so a remount never shows the pick; a page that takes its own hold uses that hook. The
  Hideaway's other dark pages (`/me/onboarding`, `/plans`, the immersive `/day-n-night`) don't exist here yet and
  take the same hold when they do; its lostinseoul pages belong to that project.
- **On a page that holds its theme, the mode switch is hidden** (the header button and the search panel's
  quick action); ⌘H does nothing there.
- The boot script reads `pageThemes`, so a held page paints in its own theme from the first frame. After boot,
  only the theme provider (`src/providers/Theme`) writes `data-theme`; every switch goes through its store.
- What makes it work comes along with it (owner, 2026-11-16): the colour fade (The Hideaway's
  `html.theme-animating [data-themed]` rule, in the theme layer of `globals.css`, with `data-themed` on `<body>`),
  armed by the provider for the fade's length; and the home page's black ground kept to the home page
  (`html:has(.teaser)`, `body:has(.teaser)` in `teaser.css`), so other pages take the theme's ground.

## Alternatives considered

### A theme library (next-themes)
- **Pros**: maintained, handles system preference and storage.
- **Cons**: one more dependency; no page-theme layer; The Hideaway doesn't use it.
- **Why not**: the owner chose to follow The Hideaway, and the built script already does the job.

### Dark everywhere until the visitor picks (2026-11-15)
- **Pros**: one look for every first visit.
- **Cons**: overrides the device setting site-wide to serve pages that only need dark for themselves.
- **Why not**: replaced by the owner on 2026-11-16 with the page theme, which holds dark only where a page needs it.

### The Hideaway's 404 shape: plain `notFound()` under a public root layout with `not-found.tsx` (tested 2026-11-16)
- **What it is**: The Hideaway has two root layouts (the public site and Payload), `not-found.tsx` beside the
  public one, a `[...not_found]` catch-all and plain `notFound()` in its pages; no `global-not-found`, no rewrites.
- **Tested here** (owner's request) with `(site)` and its `not-found.tsx` as the public root, plain `notFound()`,
  the catch-all back and no `global-not-found` or rewrites; once with `(auth)` left out (two roots, as in The
  Hideaway) and once with `(auth)` kept as its own root. Both served every page 404 (`/essays/<unknown>`,
  `/setlists/<unknown>`, malformed order ids, unmatched URLs) as `<html id="__next_error__">` with no stylesheet
  and no theme, in dev and production. Production wrote dark only 8–20 ms before first paint; dev painted the
  blank white shell ~400 ms before the dark 404 (captured).
- **Why not**: Next's not-found boundary is a client error boundary, and the server renderer runs none, so a
  `notFound()` thrown before streaming always gets the error shell; the number of root layouts doesn't change
  that. The Hideaway's Next (16.3.4) has the same code, so it serves the same shell and wins the same race.
  `(auth)` stays its own root (the preview-auth gate, with its own stylesheet and a no-script CSP).
- **Not this site, and not the canary** (minimal repro, 2026-11-16): a bare app with one root layout (one
  stylesheet), `not-found.tsx` beside it and a page that only calls `notFound()` (static, and dynamic) serves
  that page as `<html id="__next_error__">` 404 with no stylesheet and no not-found UI in the HTML (the UI is only
  in the Flight data, rendered by the browser), on Next 15.5.4, 16.3.4 and 16.5.0-canary.27, with webpack and
  Turbopack, in dev and production; only an unmatched URL gets the server-rendered document. So plain
  `notFound()` can't give a styled first frame on any of these versions; the rewrites and the `?not-found=1`
  redirect above stay until the owner chooses otherwise (the proxy check is the one way without a redirect).

## Consequences

### Positive
- No new dependency; the same model as The Hideaway.
- A page's own look can't leak into the visitor's saved setting.

### Negative
- The boot script is hand-written code to maintain, and it mirrors `pageThemes`, so a page that holds its
  theme must be listed there to paint correctly from the first frame.

### Risks
- The fade's length lives in two places, `--theme-transition-duration` and `THEME_TRANSITION_SECONDS`; a test
  keeps them equal. The value is The Hideaway's, to be tuned with the rest of the motion.
- `global-not-found` is experimental in Next 16.5, and because it bypasses every layout it repeats the site
  layout's document (stylesheets, fonts, providers, `ClientLayout`); a change to `(site)/layout.tsx` must be made
  there too.
- A value saved by an earlier build under `sophomores-theme` counts as a pick. Nothing is live, so only test
  browsers can hold one.
