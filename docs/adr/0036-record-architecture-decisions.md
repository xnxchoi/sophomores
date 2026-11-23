# ADR-0036: Record architecture decisions

**Date**: 2026-11-15
**Status**: accepted
**Deciders**: the owner

## Context

The design requirements (05) list technical choices that every page will rest on: the token layer, how
the colour mode is set, which motion library owns what, the page change, component primitives, the form
library and the icon set. Several of these have two or three installed candidates already, so the reason
for a choice is easily lost and the losing option creeps back in.

## Decision

We record each such choice as a short decision record in `docs/adr/`, numbered in order, once the owner
has decided it in its review batch. Design decisions (look, colour, type) stay in the design documents;
these records cover how the design is built.

## Alternatives considered

### Keep decisions only in the planning documents
- **Pros**: one place to read.
- **Cons**: the reasoning and the rejected options get edited away as the documents change.
- **Why not**: the plan documents are revised batch by batch; a decision needs a fixed record.

## Consequences

### Positive
- Each choice keeps its reason and its rejected alternatives.

### Negative
- One more file per decision.

### Risks
- Records go stale. Mitigation: a superseding record always links its replacement.
