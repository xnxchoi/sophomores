# ADR-0003: The NFC card's first tap activates; afterwards the card is the check-in credential

**Date**: 2026-11-14 (recorded 2026-11-15)
**Status**: activation part superseded by ADR-0005 (2026-11-15); check-in part superseded by ADR-0012 (2026-11-16): members check in with an event ticket QR. The card's role is open (plan item 14).
**Deciders**: owner

## Context

Members receive a physical NFC card (NTAG 424 DNA). The documents disagreed on the order of events:
- the owner's plan said the member already holds a key before the first tap;
- the 14 Nov reconciliation said the key is minted at activation;
- the to-do list said activation happens on arrival.

The 14 Nov reconciliation settled on "first tap activates".

## Decision

The first tap of a member's card activates the membership. After that, tapping the card is how the member checks in.

## Alternatives Considered

### Activate on the website after payment, and the card's first tap only links the card
- **Pros**: the key exists before launch and before any card is printed.
- **Cons**: an extra passkey prompt after payment.
- **Why not**: not considered when this was decided. It is now proposed in ADR-0005 (decision 1 in the plan's Waiting for you), because the wallet comes from the passkey and no key can be granted before activation.

## Consequences

### Positive
- The tap is a physical, memorable moment.

### Negative
- Cards only arrive after launch, so as written no member holds a key at launch. This is the gap found on 15 Nov.

### Risks
- See ADR-0005.
