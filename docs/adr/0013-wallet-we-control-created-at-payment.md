# ADR-0013: Sign-up is social; we control each member's wallet, created when payment is confirmed

**Date**: 2026-11-16
**Status**: accepted (owner, 2026-11-16, in chat); the owner-key scheme is the custodian's call, recorded here for the owner to correct
**Deciders**: owner
**Supersedes**: ADR-0001 (passkey-owned Safe); ADR-0005 (activation on the website after payment)

## Context

The owner re-laid the membership flow from zero on 2026-11-16. This is the first deployment, so no earlier users exist; everyone, staff included, starts as a guest. Members without wallets must still hold their Signet, and the wallet must be bound to the account by its social sign-in or verified email, never by a device. Passkeys are recommended, not required.

## Decision

- **Sign-up is social only:** Apple, Google or Kakao. The provider's email becomes the primary email and can't be changed. A secondary email can be added. After registration, members sign in socially or with an email code. Passkeys can be added and removed in settings and are never required.
- **Phone verification** follows sign-up, before ordering.
- **We control the wallet.** When payment is confirmed, the member gets a Safe whose owner is a key we hold. The Safe is bound to the account, and Signet is granted to it at once. There is no activation step.
- **A passkey only signs in.** It is not an owner of the wallet. (Custodian's reading of "we hold control"; the owner may correct it.)
- **One owner key** signs for every member's Safe. Each member's Safe address comes from a salt derived from their account. This key is a third secret, separate from the grant signer and the lock manager (ADR-0008). It is kept in `~/.config/sphmrs`, mode 0600, and never printed or committed.
- **The Safe is created on chain only when it first has to act.** Its address is computed at payment, which costs nothing.

## Alternatives Considered

### Passkey-owned Safe with an activation page (ADR-0001, ADR-0005)
- **Why not**: the owner made passkeys optional and the wallet bound to the account.

### A wallet vendor such as Privy or Web3Auth
- **Why not**: a new vendor and dependency, for control the owner wants to keep.

### Unlock's email airdrop, with Unlock holding the key until it is claimed
- **Why not**: the owner chose to hold control.

### One owner key per member
- **Pros**: one key compromise affects only one wallet.
- **Cons**: one secret per member to derive, store and rotate.
- **Why not, for now**: Signet and Tickets can't be transferred, so a stolen owner key can't move them out of the wallet.

## Consequences

### Positive
- No activation step: Signet is granted at payment.
- Losing a passkey loses nothing; signing in recovers the account.

### Negative
- We hold custody of member wallets. The owner chose this; a legal check is advisable.
- The owner key, the Safe version and the salt rule must be fixed before the first live Signet. The wallet address is computed from them, so changing any of them later strands Signets already granted.
- Apple and Kakao sign-in need the owner's developer credentials, and Kakao shares an email only after its business review.

## Kept from the activation build (`codex/wallet-activation-20261116`, paused at `a0bd38f`)
- Kept: the Safe address prediction and the member wallet record.
- Dropped: the WebAuthn binding, its challenge record and the activation page.
