# ADR-0004: Payment settlement records a key-grant intent; a separate worker grants the key

**Date**: 2026-11-15
**Status**: accepted (owner, 2026-11-15)
**Deciders**: owner; analysis by custodian and Codex

## Context

When a paid order settles, the settle step already does three things in one transaction: it settles the reservation, creates the admission and approves membership (`src/lib/commerce/ecommerce.ts:128`, `src/lib/commerce/membership.ts:11`). A key can't always be granted at that moment: a member may have no wallet yet (ADR-0005), and the chain may be slow or down. The settle step may also run more than once.

## Decision

Inside the settle transaction we write one key-grant intent per paid entitlement. It goes in a Payload collection with a unique operation key and fixed order, payment and beneficiary identity. A worker outside the transaction moves each intent through `awaiting_wallet → pending → submitted → granted`. It also handles retryable failure, ambiguous outcome (possibly broadcast) and cancellation. The key status shown to pages counts as "issued" only once the grant is confirmed.

## Alternatives Considered

### Grant the key directly inside the settle hook
- **Pros**: fewest parts.
- **Cons**: a chain call inside a payment transaction; a chain outage blocks or rolls back payment; a repeated settle can grant twice.
- **Why not**: payment must stay paid whatever the chain is doing.

### Grant from a scheduled scan of paid orders, with no intent record
- **Pros**: no new collection.
- **Cons**: no durable record of an attempt, so "possibly broadcast" can't be told apart from "never sent", and duplicates are likely.
- **Why not**: unsafe retries.

## Consequences

### Positive
- This works whatever the owner decides on activation, network and door (decisions 1 to 5), so it can be built first.
- Payment, admission and key are separate facts, and each can be checked on its own.

### Negative
- It adds a collection, a migration and a worker.

### Risks
- **Duplicate grants.** Mitigation: a unique intent, serialised dispatch, and a stored transaction hash reconciled against receipts. Never blindly retry an unknown outcome.
- **Buyer limit.** Checkout allows one unit per purchase, but the cumulative allowance is still 3 (`src/lib/commerce/reservations.ts:68`), against the ledger's "one unit per buyer". Fix it before issuing keys.
