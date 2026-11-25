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
- **Output:** one JSON line per run, such as `{"outcome":"off"}`, `{"outcome":"busy"}`, `{"outcome":"ran","reconciled":0,"replaced":0,"dispatched":1,"cancelled":0,"seatsReleased":0,"seatSweepFailures":0,"overCap":[]}` or `{"outcome":"failure","reason":"..."}`. It never prints a key or an error's details.
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
  height. The receipt's block must be that block or its ancestor, found by walking `parentHash` links down from it,
  at most 256 blocks (`ANCESTRY_CAP`). Afterwards the numbered block at the finalized height is re-read and must be
  unchanged. Any disagreement, a broken link or a longer gap leaves the grant or cancel pending: never settled, never
  a revert, so never a retry. A key counts as already invalid only if, at that block, it exists, is the recipient's
  and is not valid (a key minted after a lagging checkpoint is not "cancelled").
  - **What this does and does not catch:** these checks detect an RPC whose answers contradict each other. They do not
    detect every way a pool of backends can mix answers, and nothing in one RPC's answers can expose a consistently
    dishonest RPC.
  - **Live RPC: Alchemy (owner decision, 25 Nov, verbatim: "Sure, we use alchemy").** The RPC is the owner's Alchemy
    app for Polygon mainnet. Its URL carries the provider key, so it lives only in an owner-only file on the tick host,
    `~/.config/sphmrs/polygon-rpc.env` (regular file, mode 0600, owned by the user the tick runs as, not a symlink),
    as `KEY_GRANT_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/<key>`. The tick, the recovery command and
    the checker each read it **themselves**, through one checked loader (`rpc-check.ts`). It accepts only that exact
    host and `/v2/<key>` shape (no userinfo, port, query or fragment); redirects are errors; failures are fixed codes.
    Never put the URL in the environment, a shell profile, a systemd unit or `EnvironmentFile=`, and never source
    the file as shell code: a tick that finds `KEY_GRANT_POLYGON_RPC_URL` in its environment refuses
    (`rpc_url_in_env`). Never paste it in chat, commit it or print it. The owner accepts Alchemy as the trusted
    single-view provider; the code reads one RPC and does not corroborate against a second.
  - **Why not Unlock's hosted RPC** (`https://rpc.unlock-protocol.com/137`, proposed for launch, then dropped): its
    published source rate-limits reads such as `eth_getBlockByHash`, receipts and `eth_blockNumber` per IP (10 per 10 s
    and 1,000 per hour per method, exempting only calls to Unlock contracts). That makes the 256-block ancestry walk
    take minutes and the recovery walk impossible. It also falls back to other public endpoints on errors, and its
    README asks production apps to use their own RPC. A free public pool does not qualify either.
  - **The cap applies on both chains.** Base Sepolia settles at 10 blocks deep, so its receipts are tied to the
    settled block by the same walk and the same 256-block cap.
- **Over-cap alert and recovery:** at one tick a minute a receipt is checked within a few blocks of finality. If the
  tick stops for more than about 8.5 minutes (256 blocks), a receipt can end up more than 256 blocks below the
  finalized block. The tick then never settles it. It alerts twice, both written synchronously before the tick exits:
  the intent IDs in its result line (`"overCap":["<id>"]`), and one stderr line per intent,
  `{"event":"key_grant_over_cap","intent":"<id>"}`. An unanswered reconcile is pushed back 2 minutes, so the alert
  repeats each time the row comes due (about every 2 minutes), not on every tick. On the server the tick also
  writes each alert into a durable spool, and `key-grant-alert-mail` (its own user, once a minute) emails it to the
  owner, at most once per kind per hour (deployment/ops/; `scripts/key-grant-alert.ts`). A person
  recovers each one:
  1. **Turn live dispatch off first:** unset `KEY_GRANT_POLYGON_LIVE` for the scheduled tick. The command holds the
     tick's global run lock for its whole run, up to 20,000 sequential RPC calls, so no tick runs meanwhile; with the
     switch off, a skipped tick costs nothing.
  2. Note the intent ID and one of its recorded hashes (`txHash`, or one in `sends`) from the admin.
  3. Check the hash on a block explorer: mined, which block, and how far below the finalized block. Use a `--walk` a
     little above that gap. **If the gap is over 20,000 blocks, stop and escalate**: the command cannot reach it, and
     nothing else may settle it.
  4. On the tick host, with the tick's env, run it under a wall-clock limit:
     `timeout 30m node --import tsx scripts/key-grant-reconcile-one.ts --intent <id> --tx <hash> --walk <blocks>`.
     A timeout or abort does **not** prove nothing was written: the fenced write can commit just before the process
     is stopped, losing only its output line. The lock is released when the process's database connection closes.
     After a timeout, an abort or any unclear result: keep live dispatch off, read the named intent in the admin
     (its `state`, `txHash`/`sends` and `settledTxHash`) to see whether it moved, and escalate anything unclear before
     running it again or turning the switch back on.
  5. Read its one line:
     - `{"outcome":"settled","state":"granted"}`: it **wrote the database** (the same fenced write as the tick). It
       made no chain writes.
     - `{"outcome":"settled","state":"failed_retryable"}`: a proven revert. The grant did not happen, and the next
       **live** tick may requeue it as a fresh attempt at a new nonce (unless its order was refunded or its code
       parks), exactly as the tick would.
     - `{"outcome":"unknown"}`: the evidence did not hold (fork, missing receipt, broken link, or
       `"code":"beyond_ancestry_cap"` for too small a walk). Change nothing by hand and escalate.
     - `{"outcome":"refused","reason":"tick_running"}`: a tick holds the lock. Wait a minute and run it again.
  6. Turn the switch back on when every over-cap intent is settled or escalated.
  The command uses an account that cannot sign, and never builds, signs, sends or replaces a transaction.
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
| `~/.config/sphmrs/polygon-rpc.env` (a file, not an env key) | tick host | none. Required when on | `KEY_GRANT_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/<key>`, 0600, read by the tick's checked loader (RPC trust, above). The env key itself must be unset. |
| `KEY_GRANT_POLYGON_EVENT_LOCKS` | tick host (and wherever the export runs) | empty = no event locks | A comma list of event-ticket lock addresses on Polygon, one per event. Tonight it is the Edition I lock `0xef6414927acb08f4d5a35cc9e5de07b9f3255060`. Any entry that is not an address stops the tick (`bad_event_locks`). A ticket whose lock is not listed (nor Signet) parks with `lock_not_enabled`. That lock's `maxKeysPerAddress` is 1 on chain: a member plus two guests on one wallet fails until the owner sets it to 3. |
| `UNLOCK_LIVE_GRANTER_PRIVATE_KEY`, `UNLOCK_LIVE_GRANTER_ADDRESS` | `~/.config/sphmrs/polygon-key-granter.env` on the tick host, mode 0600, owned by the tick's user | none | The grant signer. These are **not** app env and **not** in the VPS env allowlist. The address must be `0x2CDb…5336`; any other is refused. |
| `MEMBER_WALLET_LOCK_ADDRESS` (existing) | app and tick | | It must be the Signet lock above on Polygon. |
| `KEY_GRANT_TICK_MODE` | the unit (`-e`, set by kj-guard) | `scheduled` | `scheduled` (the timer) or `first-run` (the one supervised run). Anything else stops the tick (`mode_invalid`). |
| `KEY_GRANT_POLYGON_ALLOWED_INTENTS` | `KJ/config/live.env` only, first run only | none | The first run's exact intent UUIDs, comma-separated, from the queue receipt. Unset, empty or malformed refuses (`allowlist_invalid`); in scheduled mode its presence refuses (`allowlist_in_scheduled`). |

There is **no lock-manager key on any of our hosts** (ADR-0008, ADR-0011). The owner's own wallet is the lock manager.

## Go-live (the owner)
**Live gates still open (25 Nov), each recorded here before the switch goes on:**
1. **RPC:** the owner creates the Alchemy app and the file `~/.config/sphmrs/polygon-rpc.env` (above). Then a
   read-only validation: `node --import tsx scripts/key-grant-rpc-check.ts` must print `"outcome":"pass"`. It checks
   chain 137; the `latest`, `safe` and `finalized` tags; `finalized` a few blocks behind `latest` (at most 128); the
   block numbered at the finalized height carrying the finalized hash; a 10-block `parentHash` walk by hash; and
   latency. It prints the URL's host, never its path, and uses no account. Record the result line here.
   - **25 Nov, 14:1x KST: pass.** File `-rw-------`, 94 bytes. `{"host":"polygon-mainnet.g.alchemy.com","outcome":"pass",
     "chainId":137,"safe":"unsupported","latest":"97918787","finalized":"97918785","finalizedLagBlocks":2,"walked":10,
     "latencyMs":{"calls":15,"median":165,"max":584}}` (on the owner's Mac). Rerun on the tick server once the
     file is placed there; gate 1 closes with a pass on the server.
2. **Over-cap alert through the real scheduler:** the tick runs on a server, not the owner's Mac (owner, 25 Nov: he is often on the move and loses connection). On that server, under the actual scheduler (a systemd timer, running as the user who owns the two private files),
   run a synthetic over-cap tick and confirm both the result line's `overCap` and the
   `{"event":"key_grant_over_cap",...}` line reach the scheduler's log and the alert. The unit test proved it only
   under a cron-style redirect and pipes on macOS.

1. **Signer file.** Put the grant signer's file in place on the tick host, `~/.config/sphmrs/polygon-key-granter.env`. Use the same file and names as the one-grant test. Set it to mode 0600, owned by the tick's user.
2. **Budget.** Approve the fee budget (ADR-0026: USD 0.10 per transaction, converted to POL at approval time).
   - Take the POL/USD spot price, for example from `https://api.coinbase.com/v2/prices/POL-USD/spot`.
   - Compute `0.10 / price` POL, then convert to wei (× 10^18, rounded down). At POL USD 0.076 that is about `1315789473684210526`.
   - Set `KEY_GRANT_POLYGON_MAX_COST_WEI` to that value. Recheck it if POL moves far.
   - The per-gas ceiling (3,000 gwei) also applies. The budget checks the gas *limit*, not the gas used. The 20 Nov estimate for `grantKeys` was about 261,000 gas: at 3,000 gwei that is about 0.78 POL, about USD 0.06, so the ceiling alone stays under the cap at today's price, and the budget is the real check.
3. **RPC.** The file `~/.config/sphmrs/polygon-rpc.env` is in place (RPC trust, above). Check it with `node --import tsx scripts/key-grant-rpc-check.ts`, which must print `"outcome":"pass"`. Never pass the URL to `curl` or any command line.
4. **Event locks.** Set `KEY_GRANT_POLYGON_EVENT_LOCKS` to the event locks to grant on, comma-separated.
5. **Switch.** Set `KEY_GRANT_POLYGON_LIVE=1`.
6. **Schedule.** Schedule the tick, from a release checkout with dependencies installed and the app's database env. For example, a systemd timer every minute running `node --import tsx scripts/key-grant-tick.ts`, or the cron line `* * * * * cd <release> && node --import tsx scripts/key-grant-tick.ts >> <log> 2>&1`. Only one runs at a time anyway.
7. **Watch.** Watch the first runs: `dispatched` counts sends, and each grant settles once its block is finalized, usually seconds (25 Nov read: `finalized` trailed the head by 2 blocks, about 3 s, on a public node).

To stop: unset `KEY_GRANT_POLYGON_LIVE`, or set it to anything but `1`. The next tick does nothing. Grants already sent keep being reconciled once the switch is back on.

## On the preview VPS: guarded units (VPS plans v3-v6)
Everything on the VPS is Docker, so the tick runs as a container from the pinned runner image, started only through the
host guard `deployment/ops/kj-guard.sh` (installed as `/usr/local/sbin/kj-guard`). The units in `deployment/ops/` call
it; its settings are `KJ/config/guard.conf` (root 0600, no secrets; `key-grant-guard.conf.example`).
`KJ=/var/lib/sophomores-key-grant` (root 0700): `rpc/` and `signer/` hold the two owner files (1000:1000 0600, separate
mounts); `config/key-job.env` (DATABASE_URI with the key job's own role, its secrets, the budget and event locks);
`config/queue-read.env` (the receipt's read role); `mail/alert-mail.env` (2002:2002 0400); `alerts/spool`, `alerts/mailer`; `fence/` (one marker per fence generation).
Env files are mounted read-only and loaded in-process with `node --env-file`, never `docker --env-file`.

- **Run modes.** `key-grant-tick.service` (the timer's) runs in scheduled mode. Its `KEY_GRANT_POLYGON_LIVE` comes only
  from `KJ/config/scheduled.env`, which exists only after K6g and its own owner go. `key-grant-first-run.service` is
  the one supervised first run: it reads `KJ/config/live.env` (LIVE plus the allowlist), is started by hand with the
  timer disabled, and its ExecStopPost deletes `live.env` whatever happened.
- **Queue receipt, before every supervised run:** `kj-guard receipt <the grant signer's address from gate 1>`. It runs
  `scripts/key-grant-queue-read.ts` in a container on the DB network only, with no signer or RPC mount, from
  `KJ/config/queue-read.env` (1000:1000 0400: `DATABASE_URI` with the read-only role `sophomores_key_grant_read`, plus
  the Payload secrets and `KEY_GRANT_POLYGON_EVENT_LOCKS`). One line per intent the tick could act on (UUID, state,
  attempts, nonce, hash flags, target check), then `{"receipt":"complete",...}`. `receipt_incomplete` (exit 1) means
  it proves nothing: stop. The allowlist must equal exactly the owner-approved intents on this receipt.
- **Admission.** `kj-guard run` refuses a chain-capable start (tick, first run) while any fence marker or
  `key_grant_fence_*` table exists, or if it can't tell. It re-checks between `docker create` and `docker start`. The
  mailer and the failed-run unit are not chain-capable and keep running while fenced, so a fence alert is delivered.
- **Fence alerts** arrive as "Key job fenced: its network is cut", with a fixed reason. A journal line at `crit`
  priority (`KJ_FENCE <reason>`) is written too.
- **`fence_marker_failed` / `fence_unpublished` is an operator escalation, not a durable fence.** The guard couldn't
  write the generation's marker, so its table went in unpublished: admission refuses while that table exists, but a
  reboot or an nft flush would not bring it back. A person acts at once: fix the disk, then run `kj-guard fence
  fence_unknown_quiescence` for a published generation before anything else.

### Emergency stop and the egress fence
Each command runs as root in one shell. Never reset pending or submitted intents, never run a second tick or a one-grant
script with this signer anywhere else, and never use this signer from another host.
1. `systemctl disable --now key-grant-tick.timer`
2. `rm -f /var/lib/sophomores-key-grant/config/live.env /var/lib/sophomores-key-grant/config/scheduled.env`
3. `systemctl stop key-grant-tick.service key-grant-first-run.service`
4. `kj-guard prove-dead tick` and `kj-guard prove-dead first-run`: each must print `"event":"dead"`.
5. If either can't be shown, cut the key job's network: `kj-guard fence fence_unknown_quiescence`. It writes a new
   generation's marker, installs its own nftables table (`inet key_grant_fence_<N>`, dropping traffic from the key
   job's bridge only), verifies it with packets, and alerts. It never waits on anything else, and it holds through a
   Docker restart and a reboot.
6. **Release is a separate, approved act (coordinator's go):** `kj-guard unfence <N>` for each generation. It keeps
   admission locked, stops and restarts Docker (with `live-restore` off this interrupts the preview and needs the
   owner's approval), then requires both units inactive with empty cgroups, the timer disabled, a successful listing
   with no tick or first-run container, and every run record proven absent. Before changing anything it also needs a
   successful nft listing and a table that is ours; a marker whose table isn't installed yet waits for the sweep. Only
   then does it delete that generation's table; its marker stays (admission refused, restore would reinstall) until a
   fresh listing shows the table gone, and only then is the marker removed and "released" said. Any other generation stays in force.
7. Resume only after a complete queue receipt.

**Measured residual (VM acceptance, 26 Nov; accepted by the coordinator).** If `unfence` dies after deleting the table
but before removing the marker, and that was the only generation, the bridge has no drop until the next sweep: a
deleted table doesn't trigger the path unit, so the backstop timer puts it back. With the 30 s timer, 19.8 s with no
drop and 172 packets from a test container that wasn't a key job were observed. The new 5 s backstop is intended to
shorten that gap; recovery with it has not been measured and has no guaranteed 5 s bound. No key job can use the gap:
`unfence` had already proved that no tick or first-run container exists, and admission refuses the whole time because the marker is still there.

**Operator notes.**
- After a refused run, the tick unit sits in `failed`, and `unfence` refuses with `unit_active`. Run
  `systemctl reset-failed key-grant-tick.service key-grant-first-run.service` first.
- Starting a key-job unit during a release can fence again, by design. In the observed case, run and reap both timed
  out on the release's lock and reap's exit trap wrote a new generation; release that one too. A start that doesn't
  reach the lock timeout may end differently, so after any start during a release list
  `/var/lib/sophomores-key-grant/fence/` and `nft list tables inet` before going on.
- A fencer killed after its table went in skips its packet check (the sweep treats an installed table as done). The
  next `kj-guard probe-all`, or the next boot, checks it with packets.
- The VM run's guest, for K1 to compare against the VPS (arm64): kernel 6.8.0-147-generic, Docker 29.1.3 (containerd
  snapshotter, cgroup driver systemd, live-restore off), iptables 1.8.10 on nf_tables, nftables 1.0.9,
  `FENCE_LIST_SHA` d0a28a0101f71cf5fe2c2755ce6e4f506f08dbdefb8d6b17e5cc5f050a28820d. A different nft version can change
  the listing, so record the VPS's own value rather than copying this one.

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

## Moving a member's Signet to their own wallet ("ask us", the owner)
Owner decision, 25 Nov, verbatim: "ask us is fine". A member's Signet key sits in their member Safe, which we manage.
The Signet lock has **transfers turned off** (`transferFeeBasisPoints` 10000, read 25 Nov) and allows **one key per
address** (`maxKeysPerAddress` 1). The member-wallet owner is not a lock manager. So a move is a cancel and a reissue,
done by the owner from the wallet that manages the Signet lock. Nothing on our hosts does it.
1. **Request.** The member asks from their signed-in account (or the support address on file for it) and gives the
   address they want. Note their member ID and the key's token ID (admin, the order's grant intent).
2. **Prove they control the address.** Send them this exact message to sign with that wallet (a plain message
   signature, `personal_sign`; it costs nothing and moves nothing):
   `Sophomores: move my Signet membership key to <address>. Request <member ID short ref>, <date>.`
   Check the signature recovers to `<address>` (Etherscan's "Verify Signature" page, or `cast wallet verify`). Any
   mismatch: stop.
3. **Check the destination.** On Polygon, `balanceOf(<address>)` on the Signet lock must be 0 (one key per
   address). The address should be a wallet they hold, not an exchange deposit address.
4. **Move, from the lock-manager wallet (Unlock dashboard or a block explorer's write tab):**
   - read the current key's `keyExpirationTimestampFor(<token ID>)`;
   - `grantKeys([<address>], [<that same expiry>], [0x0000000000000000000000000000000000000000])` (same expiry, so the
     member neither gains nor loses time);
   - once that is final, `expireAndRefundFor(<token ID>, 0)` on the old key in their member Safe.
   Grant first, then cancel, so the member is never without a key.
5. **Record it.** Our records still point at the old token in the member Safe; there is no admin action for a move
   yet (open item). Until there is, note the new token ID and address on the order in the admin, and tell the
   coordinator so the record can be updated properly. A refund later must cancel the **new** token.

- `{"outcome":"failure","reason":...}`:
  - `rpc_url_in_env`: `KEY_GRANT_POLYGON_RPC_URL` is set in the environment; remove it (the file is the only source).
  - `rpc_file_missing`, `rpc_file_symlink`, `rpc_file_not_regular`, `rpc_file_not_owner_only`, `rpc_file_unparsable`, `rpc_url_not_allowed`: the RPC file is absent, unsafe or not the Alchemy shape; `scripts/key-grant-rpc-check.ts` gives the same code.
  - `no_budget`: `KEY_GRANT_POLYGON_MAX_COST_WEI` is missing or invalid.
  - `bad_event_locks`: an entry in `KEY_GRANT_POLYGON_EVENT_LOCKS` is not an address.
  - `signer_refused`: the signer file is missing, has the wrong mode, or holds the wrong key.
  - `unexpected`: anything else, including the database.
  Fix the cause. The run changed nothing it could not resume.
- A grant with `fee_above_ceiling`: its worst case (gas limit × max fee) is over the budget, so it was **not sent**. It is retried after a backoff and only ever sent within budget: it resumes by itself once fees fall (ADR-0026, "until it passes"), or after the owner approves a new budget (step 2). It is not parked, so it does not log a park.
- A re-send stopped with `replacement_rebroadcast_refused`: the recorded bytes failed a check (chain, signer, lock, operation or budget). Nothing was sent. A person decides.
