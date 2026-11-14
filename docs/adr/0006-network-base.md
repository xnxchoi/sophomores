# ADR-0006: Keys live on Base, tested on Base Sepolia

**Date**: 2026-11-15
**Status**: proposed (Control Room decision d02)
**Deciders**: owner (pending)

## Context

The lock, the Safe contracts, the P-256 verifier and the grant signer all live on one chain. `main` assumed Polygon, while an older, stale decision said Base. Unlock has no Polygon testnet (Amoy), so Polygon can't be tested end to end before mainnet.

## Decision

Production uses Base (chain 8453); testing uses Base Sepolia (84532), with Unlock PublicLock v14 and Safe's passkey contracts. Before mainnet, every contract address is checked against the official deployment lists.

## Alternatives Considered

### Polygon (137)
- **Pros**: matches the current assumptions.
- **Cons**: no Unlock testnet; a local fork tests contracts, not Unlock's hosted services such as email keys.
- **Why not**: we can't test the real path before going live.

## Consequences

### Positive
- The full path can be tested end to end on a public testnet.
- RIP-7212 P-256 verification is available, so passkey checks are cheap.

### Negative
- Gas is paid in ETH on Base, funded through the owner's Bithumb route. The ~$0.002-per-grant estimate is not yet a validated budget.

### Risks
- Deployment addresses may differ from the research notes. Mitigation: verify them at the testnet step.
