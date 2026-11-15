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
  Leaving the page releases it, and the global theme returns, changing the page if it differs. The home page
  holds dark (`pageThemes` in `src/lib/content/theme.ts`); the 404 page holds dark through the store. Which other
  pages hold a theme is decided as the site grows.
- **On a page that holds its theme, the mode switch is hidden** (the header button and the search panel's
  quick action); ⌘H does nothing there.
- The boot script reads `pageThemes`, so a held page paints in its own theme from the first frame. After boot,
  only the theme provider (`src/providers/Theme`) writes `data-theme`; every switch goes through its store.

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
- `teaser.css` still paints `html` and `body` black on every page (ADR 0009). With the device setting back as
  the default, more visitors see the light mode, so pages that don't cover the body with their own ground can
  show black behind light content until the token layer (D1) scopes it.
- The theme-change transition (The Hideaway's `html.theme-animating [data-themed]` rule) isn't ported, so the
  change on leaving a held page is instant for now.
- A value saved by an earlier build under `sophomores-theme` counts as a pick. Nothing is live, so only test
  browsers can hold one.
