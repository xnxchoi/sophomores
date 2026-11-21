# ADR-0035: Single membership token per account

**Date**: 2026-11-22 (decided 20–22 Nov)
**Status**: accepted (owner) for the scope; account-scoped enforcement is with the Auth lane and under review
**Deciders**: owner; Auth lane implements; written by Maintenance on coordinator dispatch

## Context

The shop offered up to three per account, while cart and checkout capped it at one. The owner, 20 Nov: "The shop offer should change. It should be one." The Auth lane set the offer's maximum quantity to one (commit `a0c81e69`). The owner then scoped the limit, as relayed by the coordinator: "...only applies to the membership token because we are also going to be giving them... the invitation tokens, like the event". On 22 Nov the owner named it: "It is a single token rule. Membership token rule. That's what it is. Single membership token per account." and, as relayed by the coordinator: "other tokens may come in later, and those may not have the same rule." The owner also asked not to call the products or the rule "coins": customers buy one of three named products, and copy shows the product's own name. This matches ADR-0011 (one Signet key per member) and ADR-0014 (holders may buy extra Tickets).

## Decision

An account holds at most one membership token (Signet). The rule covers the membership token only. Invitation and event tokens, and any token added later, are not bound by it unless a later decision says so.

## Alternatives Considered

### One token of any kind per account
- **Why not**: the owner's scope; members also receive invitation and event tokens, and later tokens may follow other rules.

### Up to three per account
- **Why not**: the owner, "It should be one."

## Consequences

### Positive
- Offer, cart and checkout agree on one membership token per account.

### Negative
- The rule must be enforced per account across releases, not per order.

### Risks
- Codex found on 22 Nov that the membership limit was not yet account-scoped across releases. The Auth lane is fixing it; until then the server-side enforcement is not proven.
- Customer copy in `messages/en.json` still says "coin" in nine strings; each should show the product's name.
