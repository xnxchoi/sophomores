# ADR-0001: Member wallet is a Safe with a passkey owner

**Date**: 2026-11-14 (recorded 2026-11-15)
**Status**: accepted
**Deciders**: owner

## Context

Each member needs an on-chain address to hold their Unlock key. Members are not crypto users: they sign in with an email code or Google, and must never handle a seed phrase. Earlier documents disagreed. The owner's original plan said "Safe or Kernel", the 13 Nov to-do list said an address derived from the email, and the 14 Nov reconciliation said Safe with a passkey owner.

## Decision

Each member's key lives in a Safe smart account whose owner is a WebAuthn passkey on the member's device. The passkey is verified on chain through the RIP-7212 P-256 precompile.

## Alternatives Considered

### Kernel (ZeroDev) account with a passkey validator
- **Pros**: modular, with a mature passkey validator.
- **Cons**: a second vendor stack and a smaller audit footprint than Safe.
- **Why not**: the owner chose Safe on 2026-11-14.

### Address derived from the email, held by the platform
- **Pros**: no prompt for the member.
- **Cons**: custodial, so the platform effectively owns every key.
- **Why not**: it defeats member ownership of the key.

## Consequences

### Positive
- The member owns the key with no seed phrase and recovers it through their passkey provider (iCloud or Google).
- Safe contracts are widely audited.

### Negative
- The member must create a passkey at some point; the timing is ADR-0005.
- Safe's passkey kit and viem must be installed (owner approval, decision d05).

### Risks
- A lost passkey means the platform reissues the key, using its key-manager rights on the lock.
