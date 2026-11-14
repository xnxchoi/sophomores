# ADR-0002: Guest keys are delivered by email through Unlock, without a wallet

**Date**: 2026-11-14 (recorded 2026-11-15)
**Status**: accepted
**Deciders**: owner

## Context

A member can buy a paid guest invite, which is a separate product that skips the membership gate. Guests are one-off visitors, so asking them to create an account or a wallet would be friction for a single entry.

## Decision

Guests receive their Unlock key by email (Unlock's email-airdrop pattern). Guests have no Safe and no account. Unused invites are refunded, and offline corrections are made by hand.

## Alternatives Considered

### Guest creates an account and a Safe
- **Pros**: one model for everyone.
- **Cons**: a heavy sign-up for a single visit.
- **Why not**: the owner chose email-only on 2026-11-14.

### No key; a name on a list only
- **Pros**: simplest.
- **Cons**: no transferable, verifiable proof of entry.
- **Why not**: guests should go through Unlock like everyone else.

## Consequences

### Positive
- Guests do nothing more than open an email.

### Negative
- How a guest is admitted at the door is still open (decision d03, ADR-0007).

### Risks
- A forwarded email can be used by someone else. Staff mark each key used on first entry.
