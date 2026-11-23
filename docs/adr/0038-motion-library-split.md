# ADR-0038: Motion leads; Lenis scrolls; Tailwind handles colour and opacity

**Date**: 2026-11-15
**Status**: accepted
**Deciders**: the owner (D3 in the design requirements)

## Context

Motion, GSAP and Lenis are all installed. The owner chose to follow The Hideaway (`~/WebstormProjects/thehideaway`, read 2026-11-15), with Tailwind CSS for colour and
opacity, and prefers Motion over GSAP: GSAP timelines are being converted to Motion's `animate()`, which is
harder to write but performs better. The Hideaway imports Motion in about 170 files, Lenis in about 46 and
GSAP in about 32.

## Decision

We use Motion for choreographed sequences (the header, the page change, via `animate()`) and for component
state and presence; Lenis for scroll; Tailwind transitions for colour and opacity. GSAP is not used for new
work, and existing GSAP code is converted to Motion when it is touched.

## Alternatives considered

### GSAP for sequences
- **Pros**: timelines make long choreography easier to write.
- **Cons**: heavier at runtime; a second animation model beside Motion.
- **Why not**: the owner prefers Motion for performance, and The Hideaway is moving that way.

## Consequences

### Positive
- One animation model for components and sequences.

### Negative
- Multi-element sequences take more code than a GSAP timeline.

### Risks
- Mixed GSAP and Motion during conversion. Mitigation: convert on touch; no new GSAP.
