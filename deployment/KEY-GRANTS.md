# Polygon key grants: go-live, schedule and refund cancels

Owner direction (24 Nov): paid orders get their key on the Polygon Signet lock `0xcc95180d590365d88f8aad870c264d127b221506` (chain 137), granted by signer `0x2CDb060E373F0EFE93BefFD1478cdE739cBc5336`, behind a go-live switch that stays **off** until the owner turns it on. Owed keys are caught up automatically ("automatic catchup it is").

The code is `src/lib/commerce/keys/` (worker passes, `grant-catch-up.ts`, `unlock/polygon.ts`) and `scripts/key-grant-tick.ts`. Recovery of a stuck signer nonce is in [SIGNER-RECOVERY.md](SIGNER-RECOVERY.md).

## What runs where
- **The tick** (`scripts/key-grant-tick.ts`, about once a minute) runs four passes:
  1. reconcile what is on chain;
  2. replace stuck grants at their own nonce;
  3. grant owed keys;
  4. mark refunded keys cancelled once the owner's wallet has cancelled them.
- **One tick at a time:** a PostgreSQL advisory lock enforces it. A second tick sees `busy` and exits.
- **Output:** one JSON line per run, such as `{"outcome":"off"}`, `{"outcome":"busy"}`, `{"outcome":"ran","reconciled":0,"replaced":0,"dispatched":1,"cancelled":0}` or `{"outcome":"failure"}`. It never prints a key or an error's details.
- **Off** (the default): it prints `{"outcome":"off"}` before loading anything.
- **What the tick never does:**
  - It never retries an `ambiguous` grant; that waits for reconcile and a person.
  - It never re-sends a submitted grant.
  - It never signs a cancel.

## Env keys (names only)
| Key | Where | Default | Notes |
|---|---|---|---|
| `KEY_GRANT_POLYGON_LIVE` | tick host | unset = off | Exactly `1` turns Polygon grants on. Anything else keeps them off. |
| `KEY_GRANT_POLYGON_MAX_COST_WEI` | tick host | none. Required when on | The approved worst case for one transaction (gas limit × max fee), in wei. It must be at most 5 POL. Set it from a quote at go-live (below). Without it no Polygon transaction is built. |
| `KEY_GRANT_POLYGON_RPC_URL` | tick host | none. Required when on | A Polygon mainnet RPC, https only. |
| `UNLOCK_LIVE_GRANTER_PRIVATE_KEY`, `UNLOCK_LIVE_GRANTER_ADDRESS` | `~/.config/sphmrs/polygon-key-granter.env` on the tick host, mode 0600, owned by the tick's user | none | The grant signer. These are **not** app env and **not** in the VPS env allowlist. The address must be `0x2CDb…5336`; any other is refused. |
| `MEMBER_WALLET_LOCK_ADDRESS` (existing) | app and tick | | It must be the Signet lock above on Polygon. |

There is **no lock-manager key on any of our hosts** (ADR-0008, ADR-0011). The owner's own wallet is the lock manager.

## Go-live (the owner)
1. **Signer file.** Put the grant signer's file in place on the tick host, `~/.config/sphmrs/polygon-key-granter.env`. Use the same file and names as the one-grant test. Set it to mode 0600, owned by the tick's user.
2. **Budget.** Approve the fee budget (ADR-0026: USD 0.10 per transaction, converted to POL at approval time).
   - Take the POL/USD spot price, for example from `https://api.coinbase.com/v2/prices/POL-USD/spot`.
   - Compute `0.10 / price` POL, then convert to wei (× 10^18, rounded down). At POL USD 0.076 that is about `1315789473684210526`.
   - Set `KEY_GRANT_POLYGON_MAX_COST_WEI` to that value. Recheck it if POL moves far.
   - The per-gas ceiling (3,000 gwei) also applies.
3. **RPC.** Set `KEY_GRANT_POLYGON_RPC_URL`.
4. **Switch.** Set `KEY_GRANT_POLYGON_LIVE=1`.
5. **Schedule.** Schedule the tick, from a release checkout with dependencies installed and the app's database env. For example, a systemd timer every minute running `node --import tsx scripts/key-grant-tick.ts`, or the cron line `* * * * * cd <release> && node --import tsx scripts/key-grant-tick.ts >> <log> 2>&1`. Only one runs at a time anyway.
6. **Watch.** Watch the first runs: `dispatched` counts sends, and each grant settles once it is 256 blocks deep, about 9 minutes.

To stop: unset `KEY_GRANT_POLYGON_LIVE`, or set it to anything but `1`. The next tick does nothing. Grants already sent keep being reconciled once the switch is back on.

## Refund cancels (the owner, from his wallet)
A refund marks the order's key `cancelRequested`. Nothing on our hosts can cancel it: the owner does, from the wallet that manages the Signet lock.
1. **Export.** Run `node --import tsx scripts/key-cancel-export.ts` on a host with the app's database env.
   - It prints one line per key to cancel, `{"order","chainID","lock","tokenID","owner"}`, then `{"outcome":"exported","count":N}`.
   - It writes nothing.
   - The `owner` value is a member's wallet address. It is personal data: keep it in your own terminal and never paste it into chat or tickets.
2. **Cancel each key.** Use your lock-manager wallet, never a key on our hosts. Either:
   - in the Unlock dashboard (app.unlock-protocol.com), open the Signet lock on Polygon, find the key by token ID, and choose cancel/expire; or
   - in your wallet (MetaMask), call `expireAndRefundFor(tokenId, 0)` on the lock, with a refund of 0. The payment refund is done separately.
3. **Let the tick reconcile.** The tick checks each one and marks it `cancelled` (evidence `key_not_valid`) once the key is no longer valid at 256 confirmations. Until then, the request stays recorded.

## Checks
- `{"outcome":"failure"}`: a missing or wrong signer file, a missing RPC URL or budget, or the database is unavailable. Fix the cause. The run changed nothing it could not resume.
- A grant parked with `fee_above_ceiling`: the worst-case fee is over the budget. Wait for fees to fall, or approve a new budget (step 2).
- A re-send stopped with `replacement_rebroadcast_refused`: the recorded bytes failed a check (chain, signer, lock, operation or budget). Nothing was sent. A person decides.
