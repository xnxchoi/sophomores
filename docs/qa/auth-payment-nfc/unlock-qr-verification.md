# How Unlock's emailed guest QR works, and how our door verifies it

Research from 2026-11-15, read-only against the Unlock source. Permalinks are pinned to commit `fd86ed9d` of `unlock-protocol/unlock`; paths below are relative to `https://github.com/unlock-protocol/unlock/blob/fd86ed9d85b976c93d673aefcbf4f0540950cfc7/`. Decisions this serves: ADR-0002 and ADR-0007.

## What we found

- **The QR exists only for event locks.**
  - It is printed on a `ticket.pdf` attachment, not in the email body (`locksmith/src/operations/wedlocksOperations.ts#L222-L234`).
  - The PDF is only built when one of the lock's metadata attributes has a `trait_type` starting with `event` (`packages/core/src/utils/index.ts#L10-L24`).
  - So **our guest lock must carry event metadata**, or guests get no QR.
- **What the QR encodes.**
  - A URL: `{unlockApp}/verification?data=<payload>&sig=<signature>` (`locksmith/src/utils/qrcode.ts#L12-L17`).
  - The payload is `JSON.stringify({network, account, lockAddress, tokenId, timestamp})` (`locksmith/src/fulfillment/dispatcher.ts#L307-L313`).
  - It is signed with an EIP-191 message by Locksmith's own wallet, not by the guest (`dispatcher.ts#L315-L317`).
- **No public endpoint to verify it.** Unlock's app recovers the signer and accepts:
  - its hardcoded signers (`unlock-app/src/config/app.ts#L86-L90`);
  - the key owner;
  - the live key-granter address from `GET /purchase` (`locksmith/src/controllers/purchaseController.ts#L50-L55`).

  On 2026-11-15 that endpoint returned `0x22c095c69c38b66afAad4eFd4280D94Ec9D12f4C` for Base (8453), among other networks.
- **No expiry and no replay protection.**
  - The timestamp is displayed but never checked, and every earlier QR stays valid while the key does.
  - Unlock's own check-in (stored in Locksmith, not on chain) accepts repeats.
  - With KeyManager-managed walletless keys, the owner check is skipped, so the QR is not tied to a person (`unlock-app/src/components/interface/verification/invalidMembership.ts#L50-L58`).

## How our door verifies it (ADR-0007)

1. Staff scan the QR in our door app; door staff sign in through `isCmsStaff`.
2. The server URL-decodes `data` and `sig` and runs `verifyMessage` on the exact `data` string. Never re-serialise it, or the signature won't match. Ignore the URL's host; the signature does not cover it.
3. Accept only a pinned set of Locksmith signer addresses, kept in our configuration. Include the earlier signers, so QRs signed before a rotation still pass.
4. Look up `network + lockAddress + tokenId` in **our admissions list**. The admission row is used up atomically, once. That is our replay protection, because Unlock provides none.
5. Fallback: staff find the guest by name, and the check-in is logged (ADR-0007).

The signature check works offline once the signer set is pinned. Token validity comes from our database, which the key-grant worker keeps in step with the chain.

## Unverified

- Whether the hardcoded signer list is complete for every network and for older keys.
- The exact `account` value for a walletless airdrop: `key.owner` as Locksmith records it. Check on the Base Sepolia test lock.
