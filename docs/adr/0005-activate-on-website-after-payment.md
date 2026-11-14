# ADR-0005: Members activate on the website after payment; the card's first tap links the card

**Date**: 2026-11-15
**Status**: proposed (Control Room decision d01). If accepted, it supersedes the activation part of ADR-0003.
**Deciders**: owner (pending)

## Context

The key is granted to the member's Safe (ADR-0001), and the Safe's address comes from a passkey. Under ADR-0003, activation is the first NFC tap, but cards arrive only after launch, so no member would hold a key at launch. The owner's original plan said a member already holds the key before the first tap.

Codex checked the claim that the sign-in passkey can be reused, and it holds only in part:
- passkeys are stored as COSE public keys (`src/payload-generated-schema.ts:452`);
- registration does not restrict passkeys to P-256 (ES256), and Safe can use only P-256;
- buyers who signed up with email or Google may have no passkey at all.

## Decision

After payment, the member page shows "Activate your membership". Activation:
- reuses a compatible passkey (P-256, same site), or registers one;
- asks the member to approve once more specifically for the wallet, since a sign-in approval is never reused as a wallet signature;
- fixes the Safe address from that passkey.

The waiting key-grant intent (ADR-0004) is then granted. Later, the card's first tap links the card to that key. New passkey registrations are restricted to ES256 from now on.

## Alternatives Considered

### First NFC tap activates (ADR-0003 as written)
- **Pros**: no extra step after payment.
- **Cons**: no member holds a key until cards exist, after launch.
- **Why not**: it leaves launch members without a key.

### Grant to a platform-held address and transfer at activation
- **Pros**: a key exists immediately.
- **Cons**: custodial in the meantime, and the transfer costs a second transaction.
- **Why not**: it conflicts with member ownership (ADR-0001).

## Consequences

### Positive
- Members hold keys from launch; NFC becomes an add-on, not a prerequisite.

### Negative
- One passkey prompt after payment. Activation can be resumed if the member leaves.

### Risks
- **Members who never activate.** Their intent stays `awaiting_wallet`, admission still exists in our database, and the member page keeps the prompt visible.
- **Lost passkey.** Email sign-in does not recover the Safe, so a lost-passkey reissue flow is needed (open).
