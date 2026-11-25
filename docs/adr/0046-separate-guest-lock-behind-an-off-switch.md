# ADR-0046: A separate Guest lock, built behind an off switch

**Date**: 2026-11-25
**Status**: accepted (build only; activation off)
**Deciders**: Cordy, coordinator, under the owner's 25 Nov delegation

## Context

The owner's 24 Nov ruling, recorded in [ADR-0012](0012-check-in-on-events-by-unlock.md), is "One lock + guest label at door": Member and Guest tickets have distinct keys on the same event lock. A separate Guest lock gives the Guest ticket its own contract without creating a second EVENTS event. The coordinator approved building that option, not activating it.

## Decision

Build an optional separate Guest lock per event behind `UNLOCK_SEPARATE_GUEST_LOCK_ENABLED`, off by default; the owner's one-lock ruling governs while it is off. When enabled and configured, only new Guest sales use the separate lock; Member tickets stay on the original event lock, and prepared or paid tickets keep their original targets.

## Alternatives Considered

### Keep only the one-lock implementation
- **Pros**: Fewer contracts and settings to operate.
- **Cons**: A separate Guest contract would require another application change.
- **Why not**: The coordinator approved building the option while retaining the current one-lock behavior.

## Consequences

### Positive
- The two-ticket cap per sponsor per event still covers both Guest lock paths; both ticket tiers draw from the same CMS event seat and transport capacity.
- Staff can look up either frozen ticket identity by chain, lock and token ID. The lookup is not an admission decision.

### Negative
- Activation requires the owner to attach and qualify the Guest lock under the same EVENTS event. Both event locks must be in `KEY_GRANT_POLYGON_EVENT_LOCKS`; Signet is neither ticket lock.

### Risks
- Turning the switch off returns new Guest sales to the original event lock. Keep the pinned Guest lock and its allowlist entry for tickets already prepared or paid. Verify live issuance, pass delivery and staff scans before activation; the landed code (`448e845f`) does not establish those outcomes.
