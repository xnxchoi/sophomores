# ADR-0034: No compatibility with past orders; new orders record the rule version they were made under

**Date**: 2026-11-22
**Status**: accepted (owner) for the direction; implementation is with the Auth lane and not yet reviewed as done
**Deciders**: owner; Auth lane implements; Codex reviews; written by Maintenance on coordinator dispatch

## Context

A review raised a finding about handling historical receipts from orders paid under an older rule. The owner, 22 Nov: "A past paid order does not exist. I told you that. This is completely new. We don't need to consider, backwards compatibility." The owner followed up: "Yeah, but another thing about it, the system itself should be backwards compatible, so that we, you know, whatever happens later on," (the quote stops there). The coordinator read the follow-up as: orders record the rule version they were made under, and checks use that version.

## Decision

- No code is written to support orders, receipts or data from before this system. There are none.
- From now on, each order records the version of the rules it was created under, and later checks read that version. A future rule change can then leave existing orders valid under their own rules. This is the coordinator's reading of the follow-up, not the owner's words.

## Alternatives Considered

### Migrate or accept legacy orders
- **Why not**: no past paid orders exist.

### No version on orders
- **Why not**: the owner wants the system to cope with whatever changes later.

## Consequences

### Positive
- No legacy branches in the purchase code.

### Negative
- Every order check has to read its order's rule version.

### Risks
- A rule change made without a new version number. The version has to change whenever an order rule changes.
