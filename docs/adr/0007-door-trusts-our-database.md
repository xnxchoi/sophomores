# ADR-0007: The door checks our admissions list; guests show the QR key Unlock emails them, with an audited staff fallback

**Date**: 2026-11-15
**Status**: accepted (owner, 2026-11-15)
**Deciders**: owner

## Context

Reading the chain live at the door is slow and fails offline. Guests have no card and no wallet (ADR-0002). Today's check-in is admin-only and name-based (`src/lib/commerce/guests.ts:165`), and today's guest code still requires an account (`src/lib/commerce/guests.ts:116`). That contradicts ADR-0002.

## Decision

The door works from our database's admissions list. The chain is the ownership record behind it, kept in step through ADR-0004.
- **Members** check in by card tap, after launch, or by their member page.
- **Guests** receive their key from Unlock as an emailed QR code, so we send no guest email ourselves. Staff scan the QR at the door and it is checked against our admissions list. If that fails, staff find the guest by name and mark them admitted, and the action is logged.
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
- **Why not**: the QR key is stronger at almost no cost.

### We email guests their key ourselves
- **Pros**: full control of the email's wording and look.
- **Cons**: one more email path to build and keep working.
- **Why not**: the owner chose to let Unlock send the QR (2026-11-15).

## Consequences

### Positive
- The door is fast and works the same for members and guests.

### Negative
- A paid guest product and beneficiary path must be built, because the current guest code doesn't match ADR-0002.

### Implementation notes (2026-11-15)
- Unlock only attaches the QR (in a `ticket.pdf`) for **event locks**, so the guest lock needs event metadata.
- The QR is a Locksmith-signed payload with no expiry and no replay protection. Our door verifies the signature against pinned signer addresses, and our admissions row is used once. Details: `docs/qa/auth-payment-nfc/unlock-qr-verification.md`.

### Risks
- **Database or network loss at the door.** It needs an explicit fallback, such as a printed or offline list (open).
