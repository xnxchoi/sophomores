# ADR-0009: A manual refund puts the admission on hold at once and cancels the key on chain afterwards

**Date**: 2026-11-15
**Status**: proposed (Control Room decision d04)
**Deciders**: owner (pending)

## Context

Refunds are by hand (customised product). After a refund, the key should no longer admit anyone. The KRW refund itself is a PortOne operation, separate from the token. A KEY_GRANTER signer cannot cancel keys (ADR-0008).

## Decision

1. When the owner records a verified refund, the admission is put on hold immediately, so the door refuses it.
2. A durable cancel operation then cancels the key on chain, using the separate cancel authority.
3. A grant that lands after the refund is reconciled and cancelled.

This extends the existing benefit-revocation code (`src/lib/commerce/benefit-review.ts:23`).

## Alternatives Considered

### Hold at the door only; leave the key on chain
- **Pros**: simple and immediate.
- **Cons**: the key still looks valid anywhere else.
- **Why not**: the key should match the payment.

### Cancel on chain only
- **Pros**: one source of truth.
- **Cons**: slow, and fails during outages.
- **Why not**: the door must react immediately.

## Consequences

### Positive
- The door is correct immediately, and the chain catches up.

### Negative
- One more durable operation type.

### Risks
- Cancel authority for guest email keys is unverified (see the risk in ADR-0008).
