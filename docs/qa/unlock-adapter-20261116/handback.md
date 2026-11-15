# Handback: SPH-UNLOCK-ADAPTER-20261116-01, Unlock chain adapter and a Base Sepolia test lock

**State: candidate.** The three acceptance items and the three gates are met. This includes the coordinator's scope change of 2026-11-16: the live chain is Polygon. One rule is not fully met: the spending guard and the fixture script have no test that failed first. See *Not met / open points*.

- **Branch:** `codex/unlock-adapter-20261116`, renamed from Orca's `xnxchoi/…` on the coordinator's instruction. Worktree `unlock-adapter-20261116`.
- **Base:** `4657dbb` on `codex/auth-payment-nfc`. This is mechanism work: it merges back into `codex/auth-payment-nfc`, never into `main`.
- **Commits:** two on top of the base. `487bcc3` is the adapter, fixture and first live proof. The follow-up adds the scope change, the second live proof, the guard test and this rewritten handback. The `worker_done` message reports the final HEAD.
- **Diff hash:** SHA-256 of `git diff --cached 4657dbb -- . ':!docs/qa/unlock-adapter-20261116/handback.md'`, prefix `9752cda587f02295`. It excludes this file and covers 12 files: 952 lines added, 37 removed. Hashing all of `4657dbb..HEAD` includes this file and gives a different value.
- **`src/lib/commerce/keys/contracts.ts`:** unchanged, including `keyGrantChains`. The custodian changes it to `[137, 84532]` at integration.

## Scope change from the coordinator (owner decision, 2026-11-16)

Live keys run on Polygon (137), not Base. Testing stays on Base Sepolia (84532).

1. **Every chain except 84532 is refused in code.**
   - Building the adapter for 137, 8453 or any other chain throws.
   - A target on 137 or 8453 is refused with `chain_not_enabled` before any request is made.
   - The adapter checks the target's chain *before* `parseKeyGrantTarget`, so a 137 target gets the same refusal whether or not the shared contract lists 137. Today it does not, and it will after integration.
   - Test-first: the 137 per-target case failed first, because it returned `invalid_target`. Construction already refused 137 before the change.
2. **Confirmation depth is a per-chain setting:** `confirmationDepth` in `adapter.ts`.
   - Reconcile trusts a receipt only once the head is at least `depth` blocks past it, its own block counting as one. This applies to success and revert alike. An unknown head counts as not deep.
   - **84532 (Base Sepolia): 10 blocks, about 20 s.** OP-stack sequencer ordering makes reorgs rare and shallow; 10 blocks costs little.
   - **137 (Polygon PoS): 256 blocks, about 9 minutes at ~2 s blocks.**
     - Polygon has reorged far deeper than Base. The largest publicly reported reorg was 157 blocks, in February 2023. That figure is recalled from public reports; no source was fetched in this session, because the network override allows Base Sepolia RPC only.
     - 256 blocks clears it with margin.
     - The cost is a longer "key pending" after payment; the payment itself is unaffected.
     - If Polygon's milestone finality makes this too slow, a later slice can swap the depth for the `finalized` block tag.
   - The 137 value is set ahead of enablement; 137 stays refused.
   - Test-first: the new depth tests failed first (red: 3 failed, 13 passed), then passed.

## What changed

| File | Purpose |
| --- | --- |
| `src/lib/commerce/keys/unlock/adapter.ts` | `createUnlockKeyGrantAdapter`: the ADR-0004 `KeyGrantAdapter` for PublicLock v14, using viem and the `@unlock-protocol/contracts` ABI. It also holds the per-chain `confirmationDepth`. Only 84532 is enabled. |
| `src/lib/commerce/keys/unlock/signer.ts` | Loads a throwaway signer from its env file at runtime. The file must be mode 0600; the key format is checked before derivation; the derived address must match. Refusals use fixed messages with no cause attached. |
| `scripts/unlock-test-lock.ts` | Test-lock fixture. Run explicitly; a dry run unless `--send` is given; resumable. |
| `scripts/unlock-test-lock-budget.ts` | Shared spending guard and public ledger: at most 8 transactions, and the grant signer stays at or above 0.00002 ETH. |
| `tests/commerce/keys/fixtures/base-sepolia-test-lock.json` | Committed, non-secret record: lock address, test-only settings, signer addresses and every transaction hash. |
| `tests/commerce/keys/unlock-adapter.test.ts`, `unlock-signer.test.ts` | Outcome tests against a mocked transport, chain refusal and depth tests, and sentinel-key leak tests. |
| `tests/commerce/keys/unlock-spend-guard.test.ts` | Characterisation of the guard: the floor, the manager at zero and the 8-transaction cap. Written after the live run, not test-first. |
| `tests/commerce/keys/support/mock-chain.ts` | Scripted EIP-1193 transport that records every request. |
| `tests/commerce/keys/support/fake-payload.ts`, `worker.test.ts` | The worker test's in-memory Payload, moved out unchanged so the live proof can reuse it. The worker tests still pass. |
| `tests/commerce/keys/live/unlock-grant.live.ts` | Opt-in live proof. It is not a `*.test.ts` file, so `node tests/run-unit.mjs --list` does not include it. |

## Adapter behaviour

- **Before broadcast, every failure is `definitelyNotSent`.**
  - This covers reading the lock's `expirationDuration`, simulating `grantKeys` from the signer, preparing the transaction (nonce, gas, fees) and signing it locally.
  - Codes: `simulation_reverted` when the contract reverted, `rpc_unavailable` for anything else, `invalid_target` and `chain_not_enabled`.
- **From broadcast on, nothing is reported as "not sent".**
  - The hash is `keccak256` of the signed bytes, taken before broadcast.
  - Any error from `eth_sendRawTransaction` returns `unknown` with that hash. So does a node that answers with a different hash.
  - Otherwise the result is `submitted`.
- **Reconcile** reads the receipt and the head block.
  - It returns `confirmed` only when all of these hold:
    - the receipt is at depth;
    - it succeeded;
    - its `to` is the lock;
    - there is exactly one `Transfer` log from the lock, and it is a mint from zero to the target recipient. The token ID comes from that log.
  - A reverted receipt to the lock, at depth, is `definitelyReverted` with code `tx_reverted`.
  - Everything else is `unknown`, so it is never regranted. That includes a pending or unseen transaction, a receipt that is too shallow, an RPC failure and an anomalous receipt.
  - `inspect(txHash)` tells `pending`, `not_found`, `unavailable`, `mined` and `reverted` apart. The contract type has only `unknown` for these, so `contracts.ts` was left alone.
- **Grant parameters.** Expiry follows the lock's own `expirationDuration`: the maximum value means a non-expiring key, otherwise the key expires at now plus the duration. The key manager is the zero address, so the holder manages the key. The adapter decides no token model.

## Acceptance

1. **Mocked outcome paths** (`unlock-adapter.test.ts`):
   - failures before broadcast: a simulation revert and an RPC failure, with no `eth_sendRawTransaction`;
   - broadcast with an unknown result: a send error, and a different hash from the node;
   - revert: `definitelyReverted`;
   - success with a token ID: `confirmed`, token `42`;
   - pending versus unseen, and an unreachable chain;
   - six anomalous receipts, all `unknown`;
   - a receipt one block short of depth, and an unknown head, both `unknown`;
   - the decoded raw transaction is `grantKeys` on the target lock, to the recipient, with the expiry the lock implies;
   - 8453, 137 and other chains refused, both at construction and per target, with zero requests.
2. **No key in logs or errors** (`unlock-signer.test.ts`):
   - A sentinel key loaded from a 0600 file never appears in any `console.*` output, stdout or stderr write, in an `inspect` of the account, or in the outcome JSON of six adapter paths.
   - Six refused files never leak it in their message, stack or cause chain: group-readable, too long, non-hex, address mismatch, missing variable and missing file.
   - Separately, both real signer keys were checked against the slice diff and all local run logs: no match. The check printed booleans only and was rerun on the final tree.
3. **Live proof:** below, in two runs.

**Red before green.**
- Both original suites were written before the modules existed. The first run failed with `Cannot find module '@/lib/commerce/keys/unlock/adapter'`, then passed 15 of 15.
- The scope-change tests failed 3 of 16, then passed.

## Live proof on Base Sepolia (84532)

All the data below is public.

**Signers and lock**
- Grant signer: `0x546804508bA4848A571E300a6BF440d72FBb67b8`.
- Throwaway lock manager: `0xA35B24dF2D8aDcc2e181fc659BDDD7F7abddF595`, newly created. Its key sits next to the grant signer's, as `base-sepolia-lock-manager.env` at mode 0600.
- **Unlock factory:** `0x259813B665C8f6074391028ef782e27B65840d89`.
  - *Provenance:* no source was read in this session; the address was recalled.
  - It was verified on chain: `unlockVersion` is 13; `publicLockImpls(14)` is `0x70B3c9Dd9788570FAAb24B92c3a57d99f8186Cc7` and reports v14; the deployed lock reports v14.
  - Before any mainnet use, check it against Unlock's official deployment list (ADR-0006).
- **Lock:** `0xA1b38504fd4D8Fa696e9e4DEfFA8c0d484403A8c`, "Sophomores test lock".
  - Test-only settings: price 0 ETH, 365-day duration, `maxNumberOfKeys` 0, so there is no self-purchase.
  - A grant still mints. This was simulated before the role was granted.
  - The manager holds `LOCK_MANAGER`, which is the admin of `KEY_GRANTER`. The grant signer holds `KEY_GRANTER` and is **not** a lock manager (ADR-0008).

**Transactions** (5 of 8 allowed; each passed the guard before signing):

| # | Step | From | Hash | Fee (wei) |
| --- | --- | --- | --- | --- |
| 1 | Fund the manager with 0.000028641450325561 ETH | grant signer | `0xcf651a655b8c4eafb9cb5b7fab5590effaaa921a6a9cdd7528691fa9f2846847` | 126014094575 |
| 2 | Deploy PublicLock v14 through the factory | manager | `0x2a121a4712e270e7c72d6e7b2afc53c762dccc09409b2d4f6a393daa674b842f` | 5637488053889 |
| 3 | `grantRole(KEY_GRANTER, grant signer)` | manager | `0x4e3ca044305d7b300610c72089500bab79a4810348e6a89d6b229f9d65c01017` | 352784536416 |
| 4 | Live grant, run 1 (adapter at `487bcc3`) | grant signer | `0x641cde5ab44f9db61db68a433eb60576bf5f8fb122d934f82f0e8fd1d6d23f92` | 1218695931668 |
| 5 | Live grant, run 2 (final adapter, depth 10) | grant signer | `0xe22b2106f2f1f4be2b80bbb0ded6890011543d6798805dedb7f5ec0387eab9fb` | 1013498060277 |

**Balances**

| Point | Grant signer | Manager |
| --- | --- | --- |
| Start | 0.0001 ETH | 0 ETH |
| After the fixture | 0.000071232535579864 ETH | 0.000022651177735256 ETH |
| After run 1 | 0.000070013839648196 ETH | unchanged |
| After run 2 | 0.000069000341587919 ETH | unchanged |

The grant signer's lowest balance, about 0.0000690 ETH, stayed well above the 0.00002 ETH floor.

**Worker runs.** Each run used one in-memory intent and a fresh throwaway recipient; the recipient's key was discarded.
1. `dispatchKeyGrants` left the intent `submitted` with its hash.
2. The run waited for the receipt; run 2 waited for 10 confirmations.
3. One `reconcileKeyGrants` pass set it to `granted`.
4. On chain, each recipient now holds one valid key:
   - Run 1: token `1`, owned by `0x64C517468eB06BCcD8d485517068053c2AfF1AFA`, expires 2027-11-15T18:03:32Z.
   - Run 2: token `2`, owned by `0xB6C207DBB03556560bB7b26B940479ad84dC7a0E`, expires 2027-11-15T18:13:49Z.

   Each was checked with `ownerOf`, `isValidKey` (true) and `balanceOf` (1).

**Aborted first `--send` of the fixture.** It stopped before any broadcast: the ledger directory did not exist, so the ledger write that precedes broadcast failed. Nothing was sent. The directory is now created on write.

## Gates

All three ran once, on the final source revision. Only this handback changed afterwards.

- **Typecheck** (`node_modules/.bin/tsc --noEmit`, guarded at 4 GiB with `--node-old-space-mib 2048`): exit 0, no `error TS`, no remaining PIDs. `tsconfig` covers `scripts/` and `tests/`.
- **Default suite** (`node tests/run-unit.mjs`, same guard):
  - tests 2911, pass 2867, fail 2, skipped 42, cancelled 0;
  - the only failures are the 2 known deferred styling suites: "article grid preserves its columns and readable type" and "verification loops, account indicators and toast avoid CSS clocks";
  - no remaining PIDs.
- **`git diff --cached --check`:** clean.

## Process notes

- **Install:** one only. `pnpm install --frozen-lockfile` ran under the guard at 3 GiB, exit 0, no PIDs left. The brief's literal command was first refused by the guard's own argument check, because it needs an absolute `--log`; nothing ran.
- **Repository and secrets:** no package, lockfile or project configuration was changed, and no other `.env` was read. The only traffic was JSON-RPC to `https://sepolia.base.org`.
- **Shared exclude file:** during the run I appended `.tmp/` to the repository's shared `info/exclude`, which every worktree and the owner's checkout use. It has been removed, and the file is back as it was. The run logs were moved out of the worktree; none are committed.
- **`/verify`:** not run before the source commit. The brief's gates (typecheck, suite, diff check) cover the same ground.
- **Library-first:** viem is used directly for clients, simulation, signing, `parseEventLogs`, the OP-stack L1 fee and waiting for confirmations. The ABIs come from `@unlock-protocol/contracts`: PublicLockV14, and UnlockV13 for the factory, matching its on-chain version. Env parsing uses `node:util` `parseEnv`. No library covers the adapter's outcome mapping or the spending guard.
- **Processes:** none remain from this slice. Every guard receipt showed `remaining_pids: []`.

## Not met / open points

- **No test failed first for the guard or the fixture.**
  - The spending guard (`assertCanSpend`) has only a characterisation test, written after the live run.
  - `sendGuarded`, the fixture script and the directory-on-write fix are proven only by the live runs.
- **Polygon (137) is not enabled.** At integration it needs an RPC endpoint, a lock and a signer, and owner approval; only its depth is set.
- **No nonce manager.** The adapter takes the pending nonce from the RPC. That is safe for the worker's serialised dispatch, but not for several dispatchers sharing one signer.
- **Walletless email keys are not covered.** Guest keys through Unlock's KeyManager, and the cancel authority (risks in ADR-0008 and ADR-0009), come with the guest invite and refund slices.
- **Nothing calls the adapter yet.** No production code constructs it; wiring it to a runner or scheduler is outside this slice.
- **Remaining test funds:** the manager holds about 0.0000227 ETH and the grant signer about 0.0000690 ETH. This slice's cap leaves 3 of 8 transactions.
