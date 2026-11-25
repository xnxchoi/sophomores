# Polygon key grants: go-live, schedule and refund cancels

Owner direction (24 Nov): paid orders get their key on the Polygon Signet lock `0xcc95180d590365d88f8aad870c264d127b221506` (chain 137), granted by signer `0x2CDb060E373F0EFE93BefFD1478cdE739cBc5336`, behind a go-live switch that stays **off** until the owner turns it on. Owed keys are caught up automatically ("automatic catchup it is"). Event tickets on Polygon go only to event locks pinned in config (`KEY_GRANT_POLYGON_EVENT_LOCKS`), never to a lock a CMS record names.

The code is `src/lib/commerce/keys/` (worker passes, `grant-catch-up.ts`, `unlock/polygon.ts`) and `scripts/key-grant-tick.ts`. Recovery of a stuck signer nonce is in [SIGNER-RECOVERY.md](SIGNER-RECOVERY.md).

## What runs where
- **The tick** (`scripts/key-grant-tick.ts`, about once a minute) runs five passes:
  1. reconcile what is on chain;
  2. replace stuck grants at their own nonce;
  3. grant owed keys;
  4. mark refunded keys cancelled once the owner's wallet has cancelled them;
  5. release the seats of refunded Unlock event tickets whose keys are all invalid now, before Part I starts
     (`src/lib/commerce/seat-release.ts`; owner, 24 Nov: "yes, cancel. release seat."). Each seat is released once, in
     its own transaction, through a durable cursor so no refund waits behind others. A failure here never fails the
     tick; the next tick retries it.
- **One tick at a time:** a PostgreSQL advisory lock enforces it. A second tick sees `busy` and exits.
- **Output:** one JSON line per run, such as `{"outcome":"off"}`, `{"outcome":"busy"}`, `{"outcome":"ran","reconciled":0,"replaced":0,"dispatched":1,"cancelled":0,"seatsReleased":0,"seatSweepFailures":0}` or `{"outcome":"failure","reason":"..."}`. It never prints a key or an error's details.
- **Parks are loud:** every grant parked for a person writes one stderr line, `{"event":"key_grant_parked","intent":"<id>","code":"<code>"}` (no address, order or customer data). Point an alert at it.
  Parked owner cancels write the same line with a `cancel_` code.
- **Seat sweep failures are loud too:** the tick's Payload logger is silent, so pass 5 reports failures as
  `seatSweepFailures` (orders skipped plus a cursor not saved) and writes one stderr line,
  `{"event":"seat_sweep_failed","count":<n>}`. The tick still exits 0. A count that repeats tick after tick needs a person.
- **Role hook (PublicLock v15):** the Signet lock is v15 and Edition I is v14. On a v15 lock, a lock manager can set
  `onHasRoleHook`, which then decides who holds the key-granter and lock-manager roles. Every Polygon grant and cancel
  first reads `publicLockVersion()` and, on v15, `onHasRoleHook()`. A non-zero hook parks the operation with
  `role_hook_set`. A replacement logs `replacement_role_hook_set`, while the pending send stays reconciled. Nothing
  is signed until a person clears the hook or confirms it. A failed read retries; it does not park.
  A re-send of recorded bytes re-reads the hook first: a set hook stops it (`rebroadcast_refused`, logged as
  `rebroadcast_role_hook_set`); an unreadable hook sends nothing and tries again next tick.
- **Canonical receipts:** a receipt settles a grant or cancel, or counts as a revert, only once it is settled by the chain's
  rule (Polygon: at or below the node's `finalized` block; Base Sepolia: 10 blocks deep) *and* its block hash equals the canonical block at that height. A reorged-out or stale-fork receipt stays
  pending until the chain shows the transaction in a canonical block.
- **RPC trust (Review-A, 25 Nov):** on Polygon the `finalized` block must also be the block the node numbers at that
  height, the receipt's block is read in that same view, and the finalized block is re-read unchanged afterwards. Any
  disagreement leaves the grant or cancel pending (never a revert, so never a retry). A key counts as already invalid
  only if, at that block, it exists, is the recipient's and is not valid (a key minted after a lagging checkpoint is
  not "cancelled"). This catches an **inconsistent** RPC (a load balancer mixing nodes, a node on a stale fork), not a
  **consistently dishonest** one. Live use therefore needs a finality source the owner trusts (his own node or a paid
  provider he chooses), or a second, independent RPC to corroborate; the code reads one RPC.
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
| `KEY_GRANT_POLYGON_RPC_URL` | tick host | none. Required when on | A Polygon mainnet RPC, https only. It must answer `eth_getBlockByNumber("finalized")`; without that, nothing ever settles (fail closed). Check before go-live (below). |
| `KEY_GRANT_POLYGON_EVENT_LOCKS` | tick host (and wherever the export runs) | empty = no event locks | A comma list of event-ticket lock addresses on Polygon, one per event. Tonight it is the Edition I lock `0xef6414927acb08f4d5a35cc9e5de07b9f3255060`. Any entry that is not an address stops the tick (`bad_event_locks`). A ticket whose lock is not listed (nor Signet) parks with `lock_not_enabled`. That lock's `maxKeysPerAddress` is 1 on chain: a member plus two guests on one wallet fails until the owner sets it to 3. |
| `UNLOCK_LIVE_GRANTER_PRIVATE_KEY`, `UNLOCK_LIVE_GRANTER_ADDRESS` | `~/.config/sphmrs/polygon-key-granter.env` on the tick host, mode 0600, owned by the tick's user | none | The grant signer. These are **not** app env and **not** in the VPS env allowlist. The address must be `0x2CDb…5336`; any other is refused. |
| `MEMBER_WALLET_LOCK_ADDRESS` (existing) | app and tick | | It must be the Signet lock above on Polygon. |

There is **no lock-manager key on any of our hosts** (ADR-0008, ADR-0011). The owner's own wallet is the lock manager.

## Go-live (the owner)
1. **Signer file.** Put the grant signer's file in place on the tick host, `~/.config/sphmrs/polygon-key-granter.env`. Use the same file and names as the one-grant test. Set it to mode 0600, owned by the tick's user.
2. **Budget.** Approve the fee budget (ADR-0026: USD 0.10 per transaction, converted to POL at approval time).
   - Take the POL/USD spot price, for example from `https://api.coinbase.com/v2/prices/POL-USD/spot`.
   - Compute `0.10 / price` POL, then convert to wei (× 10^18, rounded down). At POL USD 0.076 that is about `1315789473684210526`.
   - Set `KEY_GRANT_POLYGON_MAX_COST_WEI` to that value. Recheck it if POL moves far.
   - The per-gas ceiling (3,000 gwei) also applies. The budget checks the gas *limit*, not the gas used. The 20 Nov estimate for `grantKeys` was about 261,000 gas: at 3,000 gwei that is about 0.78 POL, about USD 0.06, so the ceiling alone stays under the cap at today's price, and the budget is the real check.
3. **RPC.** Set `KEY_GRANT_POLYGON_RPC_URL`. Check it reports finality: `curl -s -H 'content-type: application/json' --data '{"jsonrpc":"2.0","id":1,"method":"eth_getBlockByNumber","params":["finalized",false]}' "$KEY_GRANT_POLYGON_RPC_URL"` must return a block a few blocks behind `latest`, not null or an error.
4. **Event locks.** Set `KEY_GRANT_POLYGON_EVENT_LOCKS` to the event locks to grant on, comma-separated.
5. **Switch.** Set `KEY_GRANT_POLYGON_LIVE=1`.
6. **Schedule.** Schedule the tick, from a release checkout with dependencies installed and the app's database env. For example, a systemd timer every minute running `node --import tsx scripts/key-grant-tick.ts`, or the cron line `* * * * * cd <release> && node --import tsx scripts/key-grant-tick.ts >> <log> 2>&1`. Only one runs at a time anyway.
7. **Watch.** Watch the first runs: `dispatched` counts sends, and each grant settles once its block is finalized, usually seconds (25 Nov read: `finalized` trailed the head by 2 blocks, about 3 s, on a public node).

To stop: unset `KEY_GRANT_POLYGON_LIVE`, or set it to anything but `1`. The next tick does nothing. Grants already sent keep being reconciled once the switch is back on.

## Refund cancels (the owner, from his wallet)
A refund marks the order's key `cancelRequested`. Nothing on our hosts can cancel it: the owner does, from the wallet that manages the Signet lock.
1. **Export.** Run `node --import tsx scripts/key-cancel-export.ts` on a host with the app's database env.
   - It prints one line per key to cancel, `{"order","chainID","lock","lockKind","tokenID","owner"}`, then `{"outcome":"exported","cancel":N,"skipped":M}`.
   - **Scope:** only keys on Polygon (137) and on a pinned lock, either Signet (`lockKind: "signet"`) or a configured event lock (`"event"`). Token IDs are unique only per lock, so always cancel on the `lock` in that line. Any other refunded key appears only as `{"order","skipped":"not_a_pinned_polygon_lock"}`, with no token or address. A person looks at those; do not cancel anything for them.
   - It is read-only by construction: every transaction on its connection is read only, and schema push, migrations and database creation are off. It writes nothing.
   - The `owner` value is a member's wallet address. It is personal data: keep it in your own terminal and never paste it into chat or tickets.
2. **Cancel each key.** Use your lock-manager wallet, never a key on our hosts. Either:
   - in the Unlock dashboard (app.unlock-protocol.com), open that line's lock on Polygon, find the key by token ID, and choose cancel/expire; or
   - in your wallet (MetaMask), call `expireAndRefundFor(tokenId, 0)` on the lock, with a refund of 0. The payment refund is done separately.
3. **Let the tick reconcile.** The tick checks each one and marks it `cancelled` (evidence `key_not_valid`) once the key is no longer valid at the finalized block. Until then, the request stays recorded.

## Checks
- `{"outcome":"failure","reason":...}`:
  - `no_rpc`: `KEY_GRANT_POLYGON_RPC_URL` is missing or not https.
  - `no_budget`: `KEY_GRANT_POLYGON_MAX_COST_WEI` is missing or invalid.
  - `bad_event_locks`: an entry in `KEY_GRANT_POLYGON_EVENT_LOCKS` is not an address.
  - `signer_refused`: the signer file is missing, has the wrong mode, or holds the wrong key.
  - `unexpected`: anything else, including the database.
  Fix the cause. The run changed nothing it could not resume.
- A grant with `fee_above_ceiling`: its worst case (gas limit × max fee) is over the budget, so it was **not sent**. It is retried after a backoff and only ever sent within budget: it resumes by itself once fees fall (ADR-0026, "until it passes"), or after the owner approves a new budget (step 2). It is not parked, so it does not log a park.
- A re-send stopped with `replacement_rebroadcast_refused`: the recorded bytes failed a check (chain, signer, lock, operation or budget). Nothing was sent. A person decides.
