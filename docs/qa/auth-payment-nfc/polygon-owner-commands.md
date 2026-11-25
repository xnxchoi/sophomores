# Polygon one grant: commands for the owner to run

**Completed 22 Nov** (01:14 KST): tx `0x8dc0c2a66771a57240a01931a359ea08af41a75240e8e0a60a72075abe84301f`, block 97714798, token 1. Kept for the record.

You run these yourself. No agent broadcasts or moves funds.

Script: `polygon-one-grant.ts`, SHA-256 `f42c222925ad07d14213583977cc1f538733bf54f736fccfe99b740dd830433c`. Codex Review-A passed it. These commands replace the old-script commands in HANDOFF.md.

Replace `0xYOUR_POLYGON_ADDRESS` with your own wallet address in every command, the same address each time. Each command is one line, so you can paste it after `!`.

Before you start:
- Make sure nothing else is using the granter signer.
- The signer key stays in `~/.config/sphmrs/polygon-key-granter.env` (mode `-rw-------`, checked 21 Nov). Only the broadcast reads that file, and no command prints it.

## 1. Dry run (reads the chain; signs and sends nothing)

```sh
cd /Users/seanschoi/orca/workspaces/sphmrs/auth-payment-nfc-reconcile-20261121 && rtk proxy env -i PATH="$PATH" HOME="$HOME" python3 scripts/resource-guard.py --max-gib 2 --timeout 45 --log "$PWD/.tmp/unlock-activation-proof/owner-polygon-dry-run.log" -- node --import tsx .tmp/unlock-activation-proof/polygon-one-grant.ts --dry-run --recipient 0xYOUR_POLYGON_ADDRESS
```

**It prints** one JSON line with `"mode":"dry-run"`, then the guard's `command exited; exit=0` line.

**A good result shows all of these:**
- `recipient` is exactly your address.
- `chainID` is `137`.
- `lock` is `0xcc95180d590365d88f8aad870c264d127b221506`.
- `signer` is `0x2cdb060e373f0efe93beffd1478cdE739cBc5336`.
- `worstCaseUsdAtQuote` is at most `0.10`. On 21 Nov it was about 0.007.
- Note `spotPolUsd` and `worstCasePOL`. You need them for step 2.

**Stop if** it prints `Polygon one-grant test stopped…`, or any field above is not what you expect. Nothing was sent. Common causes:
- the address already holds a key;
- a transaction from the signer is still pending;
- the fee is over the cap;
- the balance is low;
- the price service or RPC is down.

Fix the cause, or send the output to the coordinator.

## 2. Broadcast (signs and sends exactly one grant)

First, this must print `No such file or directory`:

```sh
ls -l /Users/seanschoi/orca/workspaces/sphmrs/auth-payment-nfc-reconcile-20261121/.tmp/unlock-activation-proof/polygon-one-grant-attempt.jsonl
```

Then run this, with `SPOT` replaced by the `spotPolUsd` value from your dry run (for example `0.07382`):

```sh
cd /Users/seanschoi/orca/workspaces/sphmrs/auth-payment-nfc-reconcile-20261121 && rtk proxy env -i PATH="$PATH" HOME="$HOME" python3 scripts/resource-guard.py --max-gib 2 --timeout 220 --log "$PWD/.tmp/unlock-activation-proof/owner-polygon-one-grant.log" -- node --import tsx .tmp/unlock-activation-proof/polygon-one-grant.ts --broadcast --recipient 0xYOUR_POLYGON_ADDRESS --confirm-recipient 0xYOUR_POLYGON_ADDRESS --approved-pol-usd SPOT
```

**It prints, in order:**
1. The estimate JSON with `"mode":"owner-broadcast"`.
2. `Attempt hash: 0x…`.
3. After one confirmation (usually seconds, at most 185 s), a JSON line with `"status":"included"`, `"confirmations":1`, `blockNumber`, `blockHash`, `gasUsed`, `actualFeePOL` and `tokenID`.

**How the fee cap holds:** the script takes a fresh quote and uses the higher of it and `SPOT`, so the USD 0.10 cap holds if the price moves. It refuses if the quote is more than 30 seconds old when it signs.

**A good result:** the `included` line appears, and `actualFeePOL` is no more than the dry run's `worstCasePOL`.

**Never run the broadcast a second time.** If it printed `Attempt hash:` but no `included` line, or printed `Polygon one-grant test stopped…` after the hash:
- The ledger file now holds the hash. Do not delete it.
- Go to step 3. It tells you whether the grant landed.

**If it stopped before printing `Attempt hash:`:**
- Nothing was signed or sent.
- An empty ledger file may remain. It blocks a rerun on purpose.
- Send the output to the coordinator before changing anything.

## 3. Finality check (read-only; no signer, no writes)

Run this about 10 minutes after the broadcast. 256 confirmations take about 9 minutes on Polygon.

```sh
cd /Users/seanschoi/orca/workspaces/sphmrs/auth-payment-nfc-reconcile-20261121 && rtk proxy env -i PATH="$PATH" HOME="$HOME" python3 scripts/resource-guard.py --max-gib 2 --timeout 45 --log "$PWD/.tmp/unlock-activation-proof/owner-polygon-finality.log" -- node --import tsx .tmp/unlock-activation-proof/polygon-one-grant.ts --check-finality --recipient 0xYOUR_POLYGON_ADDRESS
```

**It prints** one JSON line with `hash`, `status`, `confirmations`, `requiredConfirmations` (256), `blockNumber`, `blockHash`, `gasUsed`, `actualFeePOL` and `tokenID`. The guard line shows the exit code.

**What each result means:**
- `exit=0`, `"status":"confirmation-threshold-met"`: done. The grant is final, with exactly one key minted from the lock to your address. Send the line to the coordinator.
- `exit=2`, `"status":"awaiting-confirmations"`: the grant landed but is not final yet. Wait a few minutes and run step 3 again. Do not broadcast again.
- `exit=1`, `Read-only finality check could not verify this grant…`: stop. Keep the ledger file, do not broadcast again, and send the output to the coordinator. The cause may be a receipt that cannot be found yet, a reorg, or an RPC error.
