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
  the boot script paints the next page in its own theme. A `notFound()` thrown inside a `(site)` page (an unknown
  essay) still renders `(site)/not-found.tsx` on the client after Next's error shell, with the hold applied by an
  inline script (`holdThemeBoot`). Both hold dark through the store once mounted (`useHoldPageTheme`), whose
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
