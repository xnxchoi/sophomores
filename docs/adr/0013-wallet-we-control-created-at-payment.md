# ADR-0013: Sign-up is social; we control each member's wallet, created when payment is confirmed

**Date**: 2026-11-16
**Status**: accepted (owner, 2026-11-16, in chat); the owner-key scheme is the custodian's call, recorded here for the owner to correct
**Deciders**: owner
**Supersedes**: ADR-0001 (passkey-owned Safe); ADR-0005 in part (activation no longer gates the Signet; the page stays as the first-tap welcome page)

## Context

The owner re-laid the membership flow from zero on 2026-11-16. This is the first deployment, so no earlier users exist; everyone, staff included, starts as a guest. Members without wallets must still hold their Signet, and the wallet must be bound to the account by its social sign-in or verified email, never by a device. Passkeys are recommended, not required.

## Decision

- **Sign-up is social only:** Apple, Google or Kakao. The provider's email becomes the primary email and can't be changed. After registration, members sign in socially or with an email code to the primary email. (A secondary email was decided, then put out of scope on 2026-11-16.) Passkeys can be added and removed in settings and are never required.
- **Provider details (owner, item 17):** an Apple relay address is accepted as the primary email. Kakao is built behind a switch and stays off until Kakao's review passes; nothing else depends on it.
- **Refunds:** Signet is a free perk with the book and is never refunded on its own. Refunding the book cancels its Signet (ADR-0009).
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
- Apple and Kakao sign-in need the owner's developer credentials. Kakao shares an email only after its business review, so it ships switched off.

## The activation page becomes the welcome page (owner, 2026-11-16)

The page stays, usable on its own. The NFC card's first tap opens it (ADR-0003). It offers:
1. the welcome experience;
2. adding a passkey on that phone, which is the device the member is most likely to carry everywhere.

The passkey it adds is a sign-in passkey. Signet doesn't wait for it, because the wallet and Signet already exist from payment.

## The activation build (`codex/wallet-activation-20261116`, paused at `a0bd38f`)
- Kept: the page and its states, the Safe address prediction, and the member wallet record.
- Changed: the passkey step registers a sign-in passkey.
- Dropped: binding a passkey as the wallet's owner, and its challenge record, unless the rework still needs it.
