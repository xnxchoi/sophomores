# Handback: SPH-UNLOCK-ADAPTER-20261116-01, Unlock chain adapter and a Base Sepolia test lock

**State: candidate.** Every acceptance criterion and gate is met. The open points are listed at the end.

- Branch `codex/unlock-adapter-20261116`, renamed from Orca's `xnxchoi/…` on the coordinator's instruction. Worktree `unlock-adapter-20261116`.
- Base: `4657dbb`, on `codex/auth-payment-nfc`. This is mechanism work, so it merges back into `codex/auth-payment-nfc`, never into `main`.
- Diff hash: SHA-256 of `git diff --cached 4657dbb`, staged before this file was added, prefix `44aa5b6306930fd3`. It covers 11 files: 873 lines added, 37 removed.
- `src/lib/commerce/keys/contracts.ts` is unchanged, so no `ask` was needed.

## What changed

| File | Purpose |
| --- | --- |
| `src/lib/commerce/keys/unlock/adapter.ts` | `createUnlockKeyGrantAdapter`: the ADR-0004 `KeyGrantAdapter` for PublicLock v14 (viem plus the `@unlock-protocol/contracts` ABI). It refuses Base mainnet (8453). |
| `src/lib/commerce/keys/unlock/signer.ts` | Loads a throwaway signer from its env file at runtime: mode 0600 only, the key format is checked before derivation, the derived address must match, and refusals use fixed messages with no cause attached. |
| `scripts/unlock-test-lock.ts` | The test-lock fixture. Explicitly invoked; it does a dry run unless given `--send`, and it can resume. |
| `scripts/unlock-test-lock-budget.ts` | Shared spending guard and public ledger: at most 8 transactions; the grant signer stays at or above 0.00002 ETH. |
| `tests/commerce/keys/fixtures/base-sepolia-test-lock.json` | Committed, non-secret record of the lock address, its test-only settings, the signer addresses and every transaction hash. |
| `tests/commerce/keys/unlock-adapter.test.ts`, `unlock-signer.test.ts` | Mocked-transport outcome tests and sentinel-key leak tests (15 tests). |
| `tests/commerce/keys/support/mock-chain.ts` | Scripted EIP-1193 transport that records every request. |
| `tests/commerce/keys/support/fake-payload.ts`, `worker.test.ts` | The worker test's in-memory Payload moved out unchanged so the live proof can reuse it. No behaviour change: the worker tests still pass. |
| `tests/commerce/keys/live/unlock-grant.live.ts` | Opt-in live proof. It is not a `*.test.ts` file; `node tests/run-unit.mjs --list` does not include it. |

## Adapter behaviour

- **Before broadcast, every failure is `definitelyNotSent`.**
  - Covered steps: reading the lock's `expirationDuration`, simulating `grantKeys` from the signer, preparing the transaction (nonce, gas, fees), and signing it locally.
  - Codes: `simulation_reverted` (the contract reverted), `rpc_unavailable` (anything else), `invalid_target`, `chain_not_enabled`.
- **From broadcast on, the outcome is never "not sent".** The hash is `keccak256` of the signed bytes, computed before broadcast.
  - Any error from `eth_sendRawTransaction` returns `unknown` with that hash.
  - A node answering with a different hash also returns `unknown`.
  - Otherwise the result is `submitted`.
- **Reconcile** reads the receipt.
  - It returns `confirmed` only when all of these hold:
    - the receipt succeeded;
    - its `to` is the lock;
    - there is exactly one `Transfer` log from the lock;
    - that log is a mint from zero to the target recipient. The token ID comes from this log.
  - A reverted receipt to the lock is `definitelyReverted` (`tx_reverted`).
  - Everything else is `unknown`, so it is never regranted. That covers pending, not found, an RPC failure and any anomalous receipt.
  - `inspect(txHash)` tells `pending`, `not_found`, `unavailable`, `mined` and `reverted` apart. The contract type has only `unknown` for the first three, so `contracts.ts` was left alone.
- **Grant parameters.**
  - Expiry follows the lock's own `expirationDuration`: a lock with the maximum value gives a non-expiring key, otherwise the key expires at now plus the duration.
  - Key manager is the zero address, so the holder manages their own key.
  - The adapter decides no token model.
- **Chain 8453.**
  - The factory throws for chain 8453, and only 84532 is enabled.
  - An 8453 target passed to `submit` or `reconcile` is refused, and the mock records zero requests.

## Acceptance

1. **Mocked outcome paths.** These tests in `unlock-adapter.test.ts` pass:
   - failure before broadcast: a simulation revert and an RPC failure, both with no `eth_sendRawTransaction`;
   - broadcast with an unknown result: a send error, and a different hash from the node;
   - revert: `definitelyReverted`;
   - success with a token ID: `confirmed`, token `42`;
   - pending versus not found, and an unreachable chain;
   - six anomalous receipts, all `unknown`;
   - decoding of the broadcast raw transaction: `grantKeys` on the target lock, to the recipient, with the lock-derived expiry;
   - 8453 refused, at construction and per target.
2. **No key in logs or errors.** These tests in `unlock-signer.test.ts` pass:
   - a sentinel key, loaded from a 0600 file, never appears in any `console.*` output, stdout or stderr write, in `inspect` of the account, or in the JSON of the outcomes from six adapter paths;
   - six refused files (group-readable, overlong, non-hex, address mismatch, missing variable, missing file) are rejected, and the sentinel appears nowhere in their message, stack or cause chain.

   A separate scan checked the slice diff and all local run logs against both real signer keys: no match.
3. **Live proof.** Recorded below.

**Red before green.** Both new suites were written before the modules existed. The first run failed with `Cannot find module '@/lib/commerce/keys/unlock/adapter'` (`✖ tests/commerce/keys/unlock-signer.test.ts`, `'test failed'`). After implementation: `tests 15, pass 15, fail 0`.

## Live proof on Base Sepolia (84532)

All the data below is public.

**Signers and factory**
- Grant signer: `0x546804508bA4848A571E300a6BF440d72FBb67b8`.
- New throwaway lock manager: `0xA35B24dF2D8aDcc2e181fc659BDDD7F7abddF595`. Its key is stored beside the grant signer's as `base-sepolia-lock-manager.env`, at mode 0600.
- Unlock factory: `0x259813B665C8f6074391028ef782e27B65840d89`.
  - Provenance: not in the repo. Taken from Unlock's networks list; no web fetch was made, because the network override allows Base Sepolia RPC only.
  - Verified on chain: it reports `unlockVersion` 13, and `publicLockImpls(14)` is `0x70B3c9Dd9788570FAAb24B92c3a57d99f8186Cc7`, which reports v14. The deployed lock also reports v14.
  - ADR-0006 still requires a check against the official list before mainnet.

**Lock**
- Address: `0xA1b38504fd4D8Fa696e9e4DEfFA8c0d484403A8c`, named "Sophomores test lock".
- Test-only settings: price 0 in ETH, duration 365 days, `maxNumberOfKeys` 0, so there is no self-purchase. A grant still mints, which was simulated before the role was granted.
- Roles:
  - the manager holds `LOCK_MANAGER`, the admin role of `KEY_GRANTER`;
  - the grant signer holds `KEY_GRANTER` and is **not** a lock manager (ADR-0008).

**Transactions** (4 of the 8 allowed; each passed the guard before signing):

| # | Step | From | Hash | Fee (wei) |
| --- | --- | --- | --- | --- |
| 1 | Fund the manager (0.000028641450325561 ETH) | grant signer | `0xcf651a655b8c4eafb9cb5b7fab5590effaaa921a6a9cdd7528691fa9f2846847` | 126014094575 |
| 2 | Deploy PublicLock v14 through the factory | manager | `0x2a121a4712e270e7c72d6e7b2afc53c762dccc09409b2d4f6a393daa674b842f` | 5637488053889 |
| 3 | `grantRole(KEY_GRANTER, grant signer)` | manager | `0x4e3ca044305d7b300610c72089500bab79a4810348e6a89d6b229f9d65c01017` | 352784536416 |
| 4 | Grant through `dispatchKeyGrants` | grant signer | `0x641cde5ab44f9db61db68a433eb60576bf5f8fb122d934f82f0e8fd1d6d23f92` | 1218695931668 |

**Balances**

| Point | Grant signer | Manager |
| --- | --- | --- |
| Start | 0.0001 ETH | 0 ETH |
| After the fixture | 0.000071232535579864 ETH | 0.000022651177735256 ETH |
| After the grant | 0.000070013839648196 ETH (spent 0.000001218695931668) | unchanged |

The grant signer's lowest balance, 0.0000700 ETH, stays well above the 0.00002 ETH floor.

**Worker run**
- One in-memory intent targeted a fresh throwaway recipient, `0x64C517468eB06BCcD8d485517068053c2AfF1AFA`; its key was discarded at once.
- `dispatchKeyGrants` left the intent `submitted` with hash #4.
- After waiting for the receipt, `reconcileKeyGrants` moved it to `granted` with token ID `1`.
- On chain:
  - `ownerOf(1)` is the recipient;
  - `isValidKey(1)` is true;
  - expiry is 2027-11-15T18:03:32Z;
  - `balanceOf(recipient)` is 1.

**An aborted first `--send`.** It stopped before any broadcast: the ledger directory did not exist, so the ledger write that comes before broadcast failed. Nothing was sent. The fix creates the directory on write.

## Gates

All three ran once, on the final source revision.

- **Typecheck** (`node_modules/.bin/tsc --noEmit`, guarded at 4 GiB, `--node-old-space-mib 2048`): exit 0, no `error TS`. The peak was 2.43 GB and no PIDs remained. `tsconfig` includes `scripts/` and `tests/`.
- **Default suite** (`node tests/run-unit.mjs`, guarded at 4 GiB, `--node-old-space-mib 2048`):
  - totals: tests 2905, pass 2861, fail 2, skipped 42, cancelled 0;
  - the only failures are the 2 known deferred styling suites, "article grid preserves its columns and readable type" and "verification loops, account indicators and toast avoid CSS clocks";
  - no PIDs remained.
- **`git diff --cached --check`**: clean.

## Process notes

- **Install.** There was exactly one install: `pnpm install --frozen-lockfile` under the guard at 3 GiB, exit 0, no PIDs left. The brief's literal command was refused first by the guard's own argument check, because it needs an absolute `--log`; that refusal ran nothing.
- **No other changes.** No package, lockfile or configuration was changed, and no other `.env` was read.
- **Network.** The only traffic was JSON-RPC to `https://sepolia.base.org`.
- **Shared rules.** They forbid script changes and pnpm use; the brief overrides both for this slice.
- **Library-first check.** viem is used directly for clients, simulation, signing, `parseEventLogs` and the OP-stack L1 fee. The ABIs come from `@unlock-protocol/contracts`: PublicLockV14, and UnlockV13 for the factory, matching its on-chain version. Env parsing uses `node:util` `parseEnv`. No library provides the adapter's outcome mapping or the spending guard.
- **Processes.** None remain from this slice. Every guard receipt showed `remaining_pids: []`.

## Open points

- **Confirmation depth.** Reconcile counts one receipt in the L2 head as confirmed. It applies no finality or safe-block depth; consider adding one before mainnet.
- **No nonce manager.** The adapter takes the pending nonce from the RPC. That is safe for the worker's serialised dispatch, but not for several dispatchers sharing one signer.
- **Walletless email keys are not covered.** Guest keys through Unlock's KeyManager, and the cancel authority (ADR-0008 and ADR-0009 risks), come with the guest invite and refund slices.
- **The adapter is not wired to a runner.** Nothing in production code constructs it yet. Wiring it in, and the scheduler, are outside this slice.
- **Remaining test ETH.** The manager keeps about 0.0000227 ETH and the grant signer about 0.0000700 ETH. 4 of the 8 transactions in this slice's cap remain unused.
