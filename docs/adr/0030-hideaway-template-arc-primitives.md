# ADR-0030: The Hideaway is the template for look and interaction; Arc supplies primitives and forms only

**Date**: 2026-11-22 (decided 18–19 Nov)
**Status**: accepted (owner); the working rules are in `AGENTS.md`
**Deciders**: owner; UI lanes implement; written by Maintenance on coordinator dispatch

## Context

Two UI sources were in play: The Hideaway (our earlier site, its source in `src/hideaway`) and Arc UI. On 18 Nov the owner made Arc first-class: "arc-ui is now first-class for our ui components." Agents read that as Arc replacing Hideaway designs, and the owner corrected it on 19 Nov: "I want to use it in primitives, but not replace The Hideaway page-level designs." and "I'd like to use arc-ui mainly for primitive components, and functional components like forms. A uniquely designed layout or component should not be replaced by arc-ui." The owner also set the standard: "For visual design and interaction UX : The Hideaway is the default standard; however code implementation is always NextJS + other technical doc/official sources etc that wins if it collides."

## Decision

- The Hideaway is the default for visual design and interaction. Where it collides with Next.js or other official documentation on how to implement something, the official source wins.
- Arc supplies primitives and functional components such as forms. It never replaces a uniquely designed layout or component, or a Hideaway page design.
- Anything used only by The Hideaway's `/lostinseoul` route is excluded.

## Alternatives Considered

### Arc first everywhere
- **Why not**: the owner's 19 Nov correction.

## Consequences

### Positive
- Pages are ported from The Hideaway; Arc fills in controls and forms.

### Negative
- Porting Hideaway pages is slower than dropping in Arc blocks.

### Risks
- Agents defaulting to Arc for whole pages again. `AGENTS.md` carries the owner's words for every session.
