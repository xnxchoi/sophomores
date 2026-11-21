# ADR-0032: Backend first; the frontend just needs to exist and stay modular (amends ADR-0015)

**Date**: 2026-11-22 (decided 19 Nov)
**Status**: accepted (owner). Replaces the UI-first priority order of 17–18 Nov; amends ADR-0015's ordering only
**Deciders**: owner; written by Maintenance on coordinator dispatch

## Context

On 17 Nov the owner directed: "continue working on UI and UX, visual · animations… production-level structure; security and edge case handling is to come after we upload to server." The plan recorded that as the 18 Nov UI-first order, alongside ADR-0015's delivery policy. On 19 Nov the owner reversed the priority: "I'll do my part later. UI can be styled as needed, modified- prioritize backend work" and "Let me be clear: - backend is what's important - frontend just needs to exist, prioritize being modular so that my edits don't cause cascading failure; in the same vein, make ui-related tests narrow in scope: 'does it work?' is all that matters".

## Decision

- Backend work comes first.
- The frontend has to exist and work, and stays modular, so that the owner's own edits don't cascade into failures.
- UI tests are narrow: "does it work?" only.
- ADR-0015's other delivery rules stand: deliver whole pages and journeys, tests never halt progress, no blanket approval holds. Only its UI-first ordering is replaced.
- UI corrections the owner asks for directly still go ahead alongside the backend work.

## Alternatives Considered

### Keep UI first
- **Why not**: superseded by the owner on 19 Nov.

## Consequences

### Positive
- Purchase, keys and admin work get the lanes' attention ahead of styling.

### Negative
- Pages may look unfinished for longer.

### Risks
- Old handoffs and headers that still say UI first. Read the latest dated owner words before resuming.
