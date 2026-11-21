# ADR-0033: Nothing blocks on a missing fact: assume it works and note what changes when it is real

**Date**: 2026-11-22
**Status**: accepted (owner)
**Deciders**: owner; all lanes apply it; written by Maintenance on coordinator dispatch

## Context

Work kept stopping on things that were not ready: a business fact, a provider account, a credential, an approval. The owner, 22 Nov: "Taking payment, look, we need to test everything. So I need everything to work. You know, whatever is blocked should be like, just assume stuff works and just make note of what would change if we actually do make everything work."

## Decision

When work is blocked on a missing fact, provider, credential or decision, it goes ahead as if the missing piece works, using a clearly labelled stub or fixture. The lane's notes list what would change once it is real. There is no sale gate: the earlier one (Auth R1) becomes a note, not a guard.

These do not change: no real funds are moved and nothing is broadcast by agents; no secrets are printed or committed; pushes and server deployments still need the owner's approval of an exact version.

## Alternatives Considered

### Block until each fact arrives
- **Why not**: the owner needs the whole purchase flow working end to end to test it.

## Consequences

### Positive
- The full flow can be exercised before every fact is in.

### Negative
- Stubs can be mistaken for the real thing. Each one is labelled, and the list of what changes is kept with the lane's notes.

### Risks
- A stub that reaches launch. Those lists are the checklist for going live.
