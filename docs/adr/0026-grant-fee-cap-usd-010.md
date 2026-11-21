# ADR-0026: Each on-chain grant or recovery transaction is capped at USD 0.10 in fees, paid by us

**Date**: 2026-11-22 (decided 20–21 Nov)
**Status**: accepted (owner)
**Deciders**: owner; Auth lane implements; written by Maintenance on coordinator dispatch

## Context

Live keys run on Polygon (ADR-0010), granted by our server signer (ADR-0008). Every grant, and every recovery self-send (ADR-0028), costs gas. The owner first proposed a fee cap of "like 0.5 dollars", then measured Polygon and lowered it: "Polygon seems to charge about 0.02. So let's bring that, fee cap down. What's the reasonable amount". The coordinator proposed USD 0.10, about five times the typical fee. The owner answered: "Yes, 0.1".

## Decision

The fee for each grant, test grant or recovery self-send is capped at **USD 0.10**. The cap is converted to POL at approval time, and a transaction whose worst-case fee is over the cap is not sent: it is parked and escalated. The gas is ours and is never charged to a customer (the coordinator's and the runbook's wording; the owner did not dispute it).

## Alternatives Considered

### USD 0.50
- **Why not**: the owner's first figure, withdrawn once Polygon's measured fee (about USD 0.02) was known.

### No cap
- **Why not**: a fee spike or a bug could spend real funds with nobody approving it.

## Consequences

### Positive
- The owner-run Polygon one-grant test ([owner commands](../qa/auth-payment-nfc/polygon-owner-commands.md)) enforces the same cap: its 21 Nov dry run quoted about USD 0.007.

### Negative
- A sustained fee spike above the cap parks grants until it passes or the owner raises the cap.

### Risks
- The cap is in USD and gas is in POL; a stale price quote could misjudge it. The test script refuses a quote older than 30 seconds.
