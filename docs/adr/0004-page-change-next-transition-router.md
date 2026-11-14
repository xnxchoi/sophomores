# ADR-0004: Page changes run through next-transition-router

**Date**: 2026-11-15
**Status**: accepted
**Deciders**: the owner (D4 in the design requirements)

## Context

The page change covers, then uncovers, with the chrome staying (4c); The Hideaway's is the model for its
character (owner, Q4). Candidates: `next-transition-router` (installed), the existing `page-motion.tsx`
and `UX/Transition`, or the browser's View Transitions. The owner chose to follow The Hideaway (`~/WebstormProjects/thehideaway`, read 2026-11-15), which uses
`next-transition-router` (about 25 files).

## Decision

We drive page changes with `next-transition-router`, animating the leave and the arrival with Motion
(ADR-0003). Existing transition code here is reconciled with it when the shell is restyled.

## Alternatives considered

### View Transitions
- **Pros**: native; no library.
- **Cons**: less control over a multi-stage cover and uncover.
- **Why not**: The Hideaway's approach is the chosen model.

### The existing page-motion.tsx and UX/Transition alone
- **Why not**: they are reconciled into the router approach rather than kept as a parallel path.

## Consequences

### Positive
- The same page-change mechanics as The Hideaway, which the owner already likes.

### Negative
- Depends on a small third-party router wrapper.

### Risks
- Next.js canary changes can break it. Mitigation: check it on each Next upgrade.
