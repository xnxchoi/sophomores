# What Unlock itself recommends (custodian research, 2026-11-13)

The owner asked: "This should be simpler. What does Unlock Protocol suggest?" This page answers from current official Unlock docs, the blog and the source. All links are as fetched.

## Unlock's own pattern for off-chain payment plus walletless buyers

1. **Grant keys from your backend after payment clears.** A dedicated hot wallet that holds **only the KeyGranter role** calls `grantKeys`.
   - Unlock: "we recommend using a dedicated `key granter`". If that wallet is compromised, the attacker can "only" grant keys, and a lock manager can cancel them. See https://unlock-protocol.com/blog/airdrop-nft-memberships and https://docs.unlock-protocol.com/core-protocol/public-lock/minting-keys
   - Unlock's own credit-card checkout works the same way: pay off-chain, then Unlock's key granter grants. See https://unlock-protocol.com/guides/enabling-credit-cards/
2. **Key manager.** For off-chain payments, the key manager should be an address controlled by the entity that took the payment, so that a reversed payment can cancel the key (minting-keys page).
3. **Walletless buyers.** Unlock's dashboard "airdrop to email" grants the key to a **keyless address derived from email and lock**. That address is the first 20 bytes of `keccak256(JSON{email, lock})`. The buyer claims it later with an emailed code. See https://unlock-protocol.com/guides/airdrop-nft-email/, https://unlock-protocol.com/blog/email-recipient and `packages/unlock-js/src/KeyManager.ts`.
   - Per-user custodial wallets are not needed.
4. **Moving a key to a real wallet.** At a 10,000 bps transfer fee (soulbound), the claim reverts for everyone except a lock manager. The docs say a lock manager "can always bypass" the restriction. See https://docs.unlock-protocol.com/core-protocol/public-lock/transfers and `KeyManager.sol` / `MixinTransfer.sol`.
   - This matches the owner policy: "no transfer after activation; recovery only through Sophomores".
5. **Membership checks.** Check from the server with `balanceOf` or `getHasValidKey` over RPC; results can be cached. Sign-In with Ethereum (SIWE) matters only for buyers who bring their own wallet. See https://docs.unlock-protocol.com/tutorials/building-token-gated-applications
6. **Unlock Accounts.** These are Privy-powered, tied to Unlock's Stripe card checkout, and not available in the embedded paywall. They do not fit PortOne. See https://docs.unlock-protocol.com/tools/sign-in-with-ethereum/unlock-accounts
7. **What Unlock does not document.**
   - There is no "grant from your backend" guide beyond the role recommendation. The Locksmith `/v2/grantKeys` route exists in source only and is unsuitable.
   - There is no hook for off-chain payment.
   - No network is recommended. Base is supported.

## What we still own under this pattern

- PortOne verification, idempotent issuance and retry, and cancelling on refund or chargeback. These already exist in the ledger and T004 design.
- Custody and gas for the key-granter and lock-manager keys.
- The mapping from email or account to address.
- Moves performed by the lock manager.

**Privacy (custodian inference, not an Unlock warning).** The email-derived address can be computed by anyone who knows a member's email, which makes membership public on-chain. This needs a PIPA assessment. The alternative is to derive the address from an opaque account ID with a server secret. This keeps the same "keyless address" model, but gives up Unlock's own email-claim UI. That UI cannot complete under soulbound settings anyway.

## Implication

The two candidates (auth `113bd30`, shape `ae483f9`) assume per-user custodial wallets: Privy, a quorum, a separate attestation service and the Scale plan. That is more than Unlock recommends, and it is where every remaining MEDIUM originates. Under Unlock's pattern:
- the trust root is Sophomores, holding the key granter;
- the blast radius is "grant keys, which the lock manager cancels", bounded by a cap and a monitor.
