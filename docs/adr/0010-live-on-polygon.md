# ADR-0010: Live keys run on Polygon; testing stays on Base Sepolia

**Date**: 2026-11-16
**Status**: accepted (owner, 2026-11-16). Supersedes the live half of ADR-0006
**Deciders**: owner

## Context

ADR-0006 put live keys on Base. Funding Base is impractical from Korea: Bithumb withdraws ETH only on Ethereum, Arbitrum and Optimism, not Base. The owner's cofounder holds POL, and the owner can fund members' Safes with POL from MetaMask.

Checked by the custodian on 2026-11-16:
- Unlock's network list includes Polygon (`packages/networks/src/networks/polygon.ts`). Its only test networks are Base Sepolia and Ethereum Sepolia; Polygon Amoy is not supported.
- Safe's passkey module v0.2.1 has its WebAuthn signer factory at the same address (`0x1d31F259eE307358a26dFb23EB365939E8641195`) on Polygon (137), Base (8453) and Base Sepolia (84532).
- Polygon PoS verifies P-256 natively: an `eth_call` to the precompile at `0x…0100` with a valid test vector returned 1 on two public RPCs.
- Creating one member's Safe on Polygon costs about one to two US cents at recent gas and POL prices.

## Decision

- **Live:** Polygon PoS (chain 137). The live grant signer's gas is the cofounder's POL; members' Safes are paid for with the owner's POL from MetaMask, only when a member first uses theirs.
- **Testing:** Base Sepolia (84532), with the throwaway signer already funded.
- The code allows chains 137 and 84532. Until an owner-approved live slice, the adapter refuses every chain except 84532.

## Alternatives Considered

### Stay on Base (ADR-0006)
- **Pros**: tests and live share one chain family.
- **Cons**: no practical way to fund it from Bithumb.
- **Why not**: funding.

### Test on a local fork of Polygon only
- **Pros**: tests the live chain itself, free.
- **Cons**: Unlock's QR emails need a real network, so it cannot replace a testnet.
- **Why not**: kept as a complement (plan item 10), not a replacement.

## Consequences

### Positive
- Live gas is cheap, and it is funded from what the team already holds.

### Negative
- Tests and live run on different chains. A check against a local fork of Polygon (plan item 10) covers the difference; the owner set it for after the key launch, so until then the first live grants are the first run on Polygon itself.

### Risks
- Polygon reorgs deeper than Base, so reconciling a grant waits for more confirmations on Polygon (a per-chain setting in the adapter).
- `keyGrantChains` in `src/lib/commerce/keys/contracts.ts` still lists 8453; the custodian changes it to `[137, 84532]` when the running adapter and activation slices are merged.
