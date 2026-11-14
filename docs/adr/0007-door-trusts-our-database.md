# ADR-0007: The door checks our admissions list; guests show their email key, with an audited staff fallback

**Date**: 2026-11-15
**Status**: proposed (Control Room decision d03)
**Deciders**: owner (pending)

## Context

Reading the chain live at the door is slow and fails offline. Guests have no card and no wallet (ADR-0002). Today's check-in is admin-only and name-based (`src/lib/commerce/guests.ts:165`), and today's guest code still requires an account (`src/lib/commerce/guests.ts:116`). That contradicts ADR-0002.

## Decision

The door works from our database's admissions list. The chain is the ownership record behind it, kept in step through ADR-0004.
- **Members** check in by card tap, after launch, or by their member page.
- **Guests** show their email key. If that fails, staff find the guest by name and mark them admitted, and the action is logged.
- Both paths use up the same admission row once, atomically.
- Door staff are identified as CMS staff (`isCmsStaff`, `src/lib/auth/access.ts:5`), not by a customer field.

## Alternatives Considered

### Read the chain live at the door
- **Pros**: no copy to keep in step.
- **Cons**: slow, needs a network connection, and leaks wallet lookups.
- **Why not**: door reliability.

### Names only for guests
- **Pros**: simplest.
- **Cons**: weak identity; names collide and can be impersonated.
- **Why not**: the email key is stronger at almost no cost.

## Consequences

### Positive
- The door is fast and works the same for members and guests.

### Negative
- A paid guest product and beneficiary path must be built, because the current guest code doesn't match ADR-0002.

### Risks
- **Database or network loss at the door.** It needs an explicit fallback, such as a printed or offline list (open).
