# ADR-0002: The colour mode is set the way The Hideaway sets it

**Date**: 2026-11-15
**Status**: accepted
**Deciders**: the owner (D2 in the design requirements)

## Context

The site has a dark and a light mode, dark by default (owner, Q2). Two ways to set the mode were on the
table: the `data-theme` attribute with a boot script, already built here (`src/lib/content/theme.ts`), or a
theme library (none installed). The owner chose to follow The Hideaway (`~/WebstormProjects/thehideaway`, read 2026-11-15). It sets `data-theme` from a boot script
(`src/providers/Theme/InitTheme`); its default is dark, but when nothing is saved the device setting
overrides that default.

## Decision

We set the mode with the `data-theme` attribute, written by a boot script before first paint, as The
Hideaway does. The existing script here stays. One difference from The Hideaway (owner, 2026-11-15): the
device setting doesn't count. The site is dark until the visitor picks a mode, and their pick is saved.

## Alternatives considered

### A theme library (next-themes)
- **Pros**: maintained, handles system preference and storage.
- **Cons**: one more dependency; The Hideaway doesn't use it.
- **Why not**: the owner chose to follow The Hideaway, and the built script already does the job.

## Consequences

### Positive
- No new dependency; the same mechanism as The Hideaway.

### Negative
- The boot script is hand-written code to maintain.

### Risks
- A visitor on a light-mode device sees a dark site first. Accepted: dark is the default by the owner's choice,
  and the mode switch (S5) is how they change it.
