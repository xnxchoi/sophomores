# ADR-0027: The owner alone approves signer recovery (override mode) until a second approver is added

**Date**: 2026-11-22 (decided 20–21 Nov)
**Status**: accepted (owner)
**Deciders**: owner; Auth lane implements; written by Maintenance on coordinator dispatch

## Context

Signer recovery (ADR-0028) needs an approval before anything is sent. The owner's design on 20 Nov was two-person approval, with alerts going to "Me and maybe someone that I can designate via payload admin. Only I can set. Two-person approval." The second approver does not exist yet. The owner then said: "we're going to put in the second approver later. So for now, we do it override mode. Just me." and later "the override mode is good to go".

## Decision

Approval is designed for two distinct approvers: the owner plus one staff account that only the owner can designate in Payload admin. Until that second approver exists, the system runs in **override mode**: the owner alone approves. Only the owner can turn override mode on or off, every toggle and every override approval is audited, and override mode is switched off when the second approver is added. Approver and super-admin account addresses are set by the owner in Payload admin and are never written into the repository.

## Alternatives Considered

### Two approvers from the start
- **Why not**: there is no second approver yet; requiring one would block every recovery.

### Any staff member may approve
- **Why not**: the owner said "Only I can set."

## Consequences

### Positive
- Recovery can run before launch with one person available.

### Negative
- Until the second approver exists, one account can approve a recovery on its own.

### Risks
- Override mode left on after the second approver is added. The audit log of toggles is the check.
