# ADR-0045: Amber means refuse at the door

**Date**: 2026-11-25
**Status**: accepted (door procedure; live verification pending)
**Deciders**: Cordy, coordinator, under the owner's 25 Nov delegation

## Context

[ADR-0012](0012-check-in-on-events-by-unlock.md) puts ticket check-in in Unlock's EVENTS app. Staff need an unambiguous response when a scan shows amber. A warning shown in the app is not proof that the service prevents the same ticket being admitted twice.

## Decision

If a ticket scan shows amber, staff refuse entry on that scan. A Member or Guest label provides context only and never overrides amber.

## Alternatives Considered

### Treat amber as advisory and let staff admit
- **Pros**: Lets staff act on other information in front of them.
- **Cons**: Makes the same scan result mean different things at different doors.
- **Why not**: The coordinator decided that amber is a refusal, not a discretionary admission.

## Consequences

### Positive
- Staff have one instruction for amber, regardless of ticket tier or event lock.

### Negative
- Staff cannot admit on an amber result, even if the label matches what they expect.

### Risks
- This procedure does not establish provider-side single use. Before relying on the live door flow, verify first scan, repeat scan and simultaneous scans of the same unused ticket on two authorized staff phones.
