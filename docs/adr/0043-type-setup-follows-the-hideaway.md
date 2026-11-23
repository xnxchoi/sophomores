# ADR-0043: The type setup follows The Hideaway, on a 16px root

**Date**: 2026-11-15
**Status**: accepted
**Deciders**: the owner (batch 3 of the design requirements)

## Context

This site's font tokens point at nothing: the sans token says Helvetica, the mono token points at itself, and
the five font classes on the page root set no variables, so which face body text gets depends on build order.
The Hideaway (`~/WebstormProjects/thehideaway`, read 2026-11-15) sets SUIT as the body face, Narcissian Nectare
as its serif, Geist Mono as its mono and Blase as a wide face, on a 10px root. The owner said at the start that
the type setup matches The Hideaway's. Of the eight reference sites, only MetaLab fixes its root at 10px
(computed root size read 2026-11-15); Mersi and McAlpine scale theirs with window width; five keep 16px.

## Decision

We use The Hideaway's faces: SUIT for body, Narcissian Nectare at its normal weight for display, Geist Mono for
mono, Blase and the rest of The Hideaway's faces brought over, and H-A kept as the Korean face. The root stays
16px, with The Hideaway's sizes copied as pixel values and the gap in its scale filled.

## Alternatives considered

### A 10px root, as The Hideaway and MetaLab
- **Pros**: sizes read as pixels in rem.
- **Cons**: 167 files here size and space themselves on a 16px root; every one would shift.
- **Why not**: the owner chose 16px unless the other references moved theirs, and five of seven do not.

### Guida Mono for mono
- **Why not**: the owner chose The Hideaway's mono. Its files stay registered, unused.

### Sourcing a light Narcissian Nectare
- **Why not**: the owner is content with the normal weight; no light file exists in either repo.

## Consequences

### Positive
- One setup across the two sites; font tokens point at real faces.

### Negative
- More faces to ship. Each needs a stated role before use, to keep the page weight in check.

### Risks
- None from the root: the owner fixed it at 16px, not scaling with the window (2026-11-15). Font roles
  (which face falls back to which, and where H-A is used) are proposed in the design requirements, batch 3.
- Answered (owner, 2026-11-16): Pretendard is the default for Korean syllables the main faces don't cover; the
  H-A serif token is named `serif-ha`. Whether H-A has a use beyond display text is open; until then, display only.
