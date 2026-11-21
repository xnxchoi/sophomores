# ADR-0035: One coin per account applies to the membership token only

**Date**: 2026-11-22 (decided 20–21 Nov)
**Status**: accepted (owner) for the scope; account-scoped enforcement is with the Auth lane and under review
**Deciders**: owner; Auth lane implements; written by Maintenance on coordinator dispatch

## Context

The shop offered up to three coins per account, while cart and checkout capped it at one. The owner, 20 Nov: "The shop offer should change. It should be one." The Auth lane set the offer's maximum quantity to one (commit `a0c81e69`). The owner then scoped the limit, as relayed by the coordinator: "...only applies to the membership token because we are also going to be giving them... the invitation tokens, like the event". This matches ADR-0011 (one Signet key per member) and ADR-0014 (holders may buy extra Tickets).

## Decision

An account can hold at most one membership token (the Signet coin). The limit does not apply to invitation or event tokens.

## Alternatives Considered

### One token of any kind per account
- **Why not**: the owner's scope; members also receive invitation and event tokens.

### Up to three coins per account
- **Why not**: the owner, "It should be one."

## Consequences

### Positive
- Offer copy, cart and checkout agree on one.

### Negative
- The cap must be enforced per account across releases, not per order.

### Risks
- Codex found on 22 Nov that the membership cap was not yet account-scoped across releases. The Auth lane is fixing it; until then the server-side enforcement is not proven.
