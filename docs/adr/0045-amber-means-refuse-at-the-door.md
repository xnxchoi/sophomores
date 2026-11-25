# ADR-0045: Amber means refuse at the door

**Date**: 2026-11-25 (amended 2026-11-26: the desk check)
**Status**: accepted (door procedure and desk check; live verification pending)
**Deciders**: Cordy, coordinator, under the owner's 25 Nov delegation; the desk check by the owner, 26 Nov

## Context

[ADR-0012](0012-check-in-on-events-by-unlock.md) puts ticket check-in in Unlock's EVENTS app. Staff need an unambiguous response when a scan shows amber. A warning shown in the app is not proof that the service prevents the same ticket being admitted twice.

An amber scan can also mean the person in front of staff is the real holder and someone else used their ticket first, for example from a copied QR. Refusing them with no further step would leave the real holder outside. Owner, 26 Nov, verbatim: "Yeah, sure. They can obviously go to desk and ask for a recheck."

## Decision

If a ticket scan shows amber, staff refuse entry on that scan. A Member or Guest label provides context only and never overrides amber.

A refused guest may go to the desk and ask for a recheck:
1. **At the door, nothing changes:** amber is still a refusal. Door staff send the guest to the desk; they never admit on amber.
2. **At the desk:** staff check the guest's name and photo ID against the guest list for that event (the ticket's holder as recorded on the order).
3. **Match:** the real holder is admitted from the desk, and the ticket is marked **disputed** on the guest list with the time and the staff member's name.
4. **No match, or no ID:** refused. Nothing is changed on the ticket.
5. **After the event:** a disputed ticket's key is cancelled and a new one issued to the real holder from the lock manager's wallet (the owner's; no key on our servers can cancel, per ADR-0008 and ADR-0011).

## Alternatives Considered

### Treat amber as advisory and let staff admit
- **Pros**: Lets staff act on other information in front of them.
- **Cons**: Makes the same scan result mean different things at different doors.
- **Why not**: The coordinator decided that amber is a refusal, not a discretionary admission.

### Refuse on amber with no recheck
- **Pros**: The simplest instruction.
- **Cons**: A real holder whose ticket was used first by someone else has no way in.
- **Why not**: The owner chose a desk recheck (26 Nov).

## Consequences

### Positive
- Staff have one instruction for amber at the door, regardless of ticket tier or event lock.
- A real holder can still get in, through one checked path, and the dispute is recorded.

### Negative
- Staff cannot admit on an amber result at the door, even if the label matches what they expect.
- The desk needs the event's guest list with holder names, and someone to check ID.

### Risks
- This procedure does not establish provider-side single use. Before relying on the live door flow, verify first scan, repeat scan and simultaneous scans of the same unused ticket on two authorized staff phones.
- The desk check relies on the order's recorded holder name. A ticket given to a friend under another name fails the check by design.
- Cancelling and reissuing a disputed key is a manual step for the lock manager after the event; until then the copied QR stays valid on chain.
