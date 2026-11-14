# ADR-0008: A grant-only server signer, a separate cancel authority, and the Safe SDK with viem

**Date**: 2026-11-15
**Status**: proposed (Control Room decision d05; the cancel authority relates to d04)
**Deciders**: owner (pending)

## Context

The worker (ADR-0004) needs a server key that can grant keys. A key stored on a server is the most exposed secret in the system. No chain libraries are installed yet (`package.json`).

## Decision

- **Grant signer.** The grant signer holds only the lock's KEY_GRANTER role and a small gas balance. Cancelling or refunding keys uses a separate lock-manager authority that is not on the web server.
- **Libraries.** Use viem and Safe's official SDK (the passkey and relay-kit packages), with exact versions approved by the owner before install.
- **Testnet first.** Testnet uses a throwaway signer funded from a faucet.

## Alternatives Considered

### One server key with full lock-manager rights
- **Pros**: one key to manage.
- **Cons**: a leak lets an attacker cancel or redirect every key.
- **Why not**: least privilege.

### viem plus raw Safe contract ABIs, no SDK
- **Pros**: fewer dependencies.
- **Cons**: we would own the signature encoding and the deployment logic.
- **Why not**: library-first rule (AGENTS.md).

## Consequences

### Positive
- A leaked grant key can only grant extra keys, which is detectable and reversible.

### Negative
- Two authorities to manage, and gas balance and nonce monitoring.

### Risks
- **Unlock's walletless email keys.** They use Unlock's own key manager (`docs/qa/unlock-integrator-20261114/report.md:225`). Overwriting it may break email delivery. Verify on testnet first.
