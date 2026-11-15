# ADR-0011: The members token is Signet: one non-expiring, non-transferable key per member

**Date**: 2026-11-16
**Status**: accepted (owner, 2026-11-16)
**Deciders**: owner

## Context

Members get an Unlock key (ADR-0001, ADR-0004), and live keys run on Polygon (ADR-0010). The members lock needed a name and settings before it can be deployed. The door checks our database, not the chain (ADR-0007), and membership belongs to the account that paid. A transferable key would let the on-chain holder and the member diverge.

## Decision

The members lock, named **Signet**, has:
- one key per member, granted by our grant-only signer (ADR-0008);
- no expiry;
- a price of 0, because members pay through PortOne and Unlock only issues the key;
- a supply cap of 0, so the public can't buy; granting skips the cap, and our database enforces the limit;
- **transfers disabled**.

The owner deploys it from their own wallet, which makes them the lock manager and the separate cancel authority. They then add the live grant signer as key granter.

Guests get their own event lock, which is also non-transferable.

The live grant signer is `0x2CDb060E373F0EFE93BefFD1478cdE739cBc5336`, created 2026-11-16. Its private key exists only in the custodian's local config, at mode 0600, and is never printed or committed. It is a grant-only key, so if it is lost, a new signer is created and added as key granter in its place. Moving it to the server is part of the deployment and needs its own approval.

## Alternatives Considered

### Transferable Signet
- **Pros**: holders can give or sell membership.
- **Cons**: the door and accounts would follow the payer while the token follows the holder, unless the door reads the chain and accounts are linked to holders.
- **Why not now**: the owner chose non-transferable for launch. Transferable tiers may come later as separate locks (one lock per token type).

## Consequences

### Positive
- The on-chain holder and the member stay the same person, and the door logic is unchanged.

### Negative
- A member can't move their Signet to another wallet themselves. A lost passkey is handled by the recovery policy still under discussion.

### Risks
- The lock manager can turn transfers on later. Doing so needs the follow-the-holder work first, or the door and the chain disagree.
