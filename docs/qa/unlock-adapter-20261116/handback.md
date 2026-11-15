# Handback: SPH-UNLOCK-ADAPTER-20261116-01, Unlock chain adapter and a Base Sepolia test lock

**State: candidate, after the custodian's fix round on `f8d3d8d`.** The three acceptance items and the three gates are met on the final revision. One rule is still only partly met: the spending guard and the fixture script have no test that failed first. See *Not met / open points*.

- **Branch:** `codex/unlock-adapter-20261116` (renamed from Orca's `xnxchoi/…` on the coordinator's instruction). Worktree `unlock-adapter-20261116`.
- **Base:** `4657dbb` on `codex/auth-payment-nfc`. This is mechanism work: it merges back into `codex/auth-payment-nfc`, never into `main`.
- **Commits:** three on top of the base:
  - `487bcc3`: the adapter, fixture and first live proof;
  - `f8d3d8d`: the Polygon scope change and the second live proof;
  - this fix round, whose HEAD is in the `worker_done` message.
- **Diff hash for this round:** SHA-256 prefix `51998f4a9399275f`, from `git diff --cached f8d3d8d -- . ':!docs/qa/unlock-adapter-20261116/handback.md'`. It excludes this file and covers 11 files: 534 lines added, 116 removed.
- **Housekeeping:** I discarded, unchanged, the uncommitted formatter-only rewrites of 9 files by checking them out again from `f8d3d8d`. No file was reformatted, and every edit in this round is a targeted change.

## Fix round: custodian review of `f8d3d8d`

All test-first. The new and changed key tests ran against the `f8d3d8d` implementation first and failed 28 of 51. All of them pass on the new implementation, 51 of 51.

### 1. HIGH: nonce collisions; age limit

**Per-signer serialisation** (`adapter.ts`): there is one nonce lane per signer and chain in the process, shared by every adapter instance.
- **The lane is held.** A grant that `prepare` signs holds the lane until `broadcast` or `release`. After `holdMs` (default 60 s) it can no longer be broadcast, and it returns `not_prepared`.
- **How the nonce is chosen.** The nonce is `max(eth_getTransactionCount(pending), lane.next)`. `lane.next` advances only when a grant is actually handed to the node. So back-to-back grants take consecutive nonces even when `pending` equals `latest`.
- **Abandoned grants.** A released or expired prepare never advances `lane.next`, so its nonce is reused with no gap.
- **Unclear broadcasts.** When a broadcast's answer was unclear, the next prepare asks the node for that transaction. If the node does not hold it, its nonce is reused rather than leaving a gap behind it.
- **Why not viem's `nonceManager`.** I checked `createNonceManager` / `jsonRpc` in the installed `viem/utils/nonceManager.ts`. It advances when a nonce is *consumed*, that is at prepare time, so an abandoned prepare leaves a gap. Its `reset` drops all history, so after a reset a lagging `pending` would hand out a nonce that was already broadcast.

**Tests:**
- two and three sequential grants with a lagging `pending` take nonces `[0, 1]` and `[0, 1, 2]`, both through the adapter directly and through one `dispatchKeyGrants` pass;
- a concurrent prepare waits and takes the next nonce;
- a released or expired prepare is never broadcast and its nonce is reused;
- after an unclear broadcast, the next nonce depends on whether the node holds it: `[0, 1]` if it does, `[0, 0]` if it does not.

**Age limits** (`worker.ts`). There is no new state and no schema change.
- **`GRANT_OVERDUE_MS` = 30 min.**
  - Applies to a `submitted` or `ambiguous` grant whose hash is still unconfirmed 30 minutes after `submittedAt`.
  - The grant is surfaced as `ambiguous` with `lastErrorCode: "confirmation_overdue"`.
  - It keeps being reconciled, so it can still become `granted`.
  - 30 minutes is well above Polygon's planned 256-block depth of about 9 minutes.
- **`CLAIM_STALE_MS` = 10 min.**
  - Applies to a `submitted` claim that still has no hash 10 minutes after `dispatchStartedAt`.
  - Such a claim was interrupted before broadcast, because the hash always commits first. It is therefore proven unsent and goes to `failed_retryable` with `dispatch_interrupted`.
- **Follow-up, not built:** no fee bump or rebroadcast exists. An overdue grant waits for a person.

### 2. MEDIUM: hash written ahead of broadcast

- **The order.** The adapter step is now split: `prepare` signs, the worker commits `txHash` and `submittedAt` on the intent (fenced by `attemptID`), and only then `broadcast` sends.
- **If the commit fails.** If the intent moved on, or the write throws, the worker calls `release` and nothing is sent.
- **Throws from prepare.** `prepare` never sends anything, so a throw there now means proven non-execution: `failed_retryable` with `adapter_threw`. Before this change it was `ambiguous`. A throw from `broadcast` stays `ambiguous`.
- **Tests:**
  - the hash is on the intent before broadcast;
  - when the process dies after broadcast and the outcome write is lost, the intent keeps its hash and reconcile settles it as `granted`;
  - a prepared grant whose intent moved on is released and never broadcast.

**Exactly what changed in `contracts.ts`:**
- **Removed** `SubmitOutcome`, the type with `submitted`, `confirmed`, `definitelyNotSent` and `unknown`.
- **Added** `PrepareOutcome`: `{ kind: "prepared"; txHash }` or `{ kind: "definitelyNotSent"; code }`.
- **Added** `BroadcastOutcome`: `{ kind: "submitted" }`, `{ kind: "definitelyNotSent"; code }` or `{ kind: "unknown" }`.
- **Added** `parkedGrantCodes = ["chain_not_enabled", "invalid_target", "recipient_has_key"]`.
- **Changed** `KeyGrantAdapter`. `submit(...)` is replaced by three methods:
  - `prepare({ intentID, attemptID, target })`;
  - `broadcast({ intentID, txHash })`;
  - `release({ txHash })`.

  `reconcile(...)` is unchanged.
- **Unchanged:**
  - `KeyGrantTarget`, `parseKeyGrantTarget`, `keyGrantChains`, `ReconcileOutcome`;
  - the states, transitions, `isTxHash`, `keyGrantOperationKey` and `keyStatusOf`.

Nothing outside `src/lib/commerce/keys/` used `submit` or `SubmitOutcome`.

### 3. MEDIUM: grant to an existing key holder (verified in source)

**What the source shows.** In `@unlock-protocol/contracts/dist/PublicLock/PublicLockV14.sol`:
- `MixinGrantKeys.grantKeys` always calls `_createNewKey`, which mints a new token and emits `Transfer(0, recipient, tokenId)`. It never extends.
- Extension is a separate function, `grantKeyExtension`.
- `_createOwnershipRecord` reverts with `MAX_KEYS_REACHED` when `totalKeys(recipient) >= maxKeysPerAddress`. `totalKeys` counts expired keys too, and the default limit is 1.

So reconcile never meets an extension. The real risk is different: a recipient who already holds a key, valid or expired, either reverts (and used to loop through retries), or on a lock allowing more keys per address receives a *second* key.

**Chosen: refuse before signing.** `prepare` reads `totalKeys(recipient)` and returns `definitelyNotSent` with `recipient_has_key` when it is above zero. The worker parks the intent (item 4).

**Why:** one paid entitlement gets at most one key, and a second key or an extension of a key from elsewhere is a decision for a person, not the worker. Reconciling an extension event would accept something v14 `grantKeys` never emits.

**Tests:** the refusal in the adapter, and parking in the worker.

### 4. LOW: refused chains no longer loop

- **Parking.** `chain_not_enabled`, `invalid_target` and `recipient_has_key` are recorded as `failed_retryable` with that code and no `nextAttemptAt`. `requeueRetryable` excludes them, both in its query and again under the lock, so they are attempted once and never retried.
- **No schema change.** Parking reuses the existing state, so no migration is needed.
- **What staff can do.** They can cancel a parked intent (`failed_retryable → cancelled` is allowed). If a chain is later enabled, removing its code from `parkedGrantCodes` releases its intents.
- **Test:** each of the three codes, over three daily passes, is prepared once and stays parked. It failed first: it was retried.

### 5. LOW: hardening

- **Chain lookup.** It now uses `Object.hasOwn(networks, chainID)`.
- **Transport chain check.** The adapter checks `eth_chainId` against its chain before any lock read, and caches a match.
  - On a mismatch, `prepare` returns `chain_mismatch`, which is retryable once the transport is fixed, and reconcile returns `unknown`.
  - Test: only `eth_chainId` reaches the wrong chain.
- **Signer loader.**
  - It refuses a symbolic link (`lstat`) and opens the file with `O_NOFOLLOW`.
  - It requires a regular file owned by the running user (`uid`) at mode 0600.
  - Test: a symlink is refused, and so is another owner (simulated through the loader's `uid` option, because tests cannot `chown`). Neither leaks the sentinel key.

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

This section is current as of the fix round.

- **`prepare` never sends anything, so every failure there is `definitelyNotSent`.**
  - **Steps covered:** target and chain checks; the transport's chain ID; the `totalKeys` check; reading `expirationDuration`; simulating `grantKeys`; choosing the nonce; preparing and signing locally.
  - **Codes:** `invalid_target`, `chain_not_enabled`, `recipient_has_key`, `chain_mismatch`, `simulation_reverted` and `rpc_unavailable`. The first three are parked; see fix-round item 4.
  - **On success** it returns the `keccak256` hash of the signed bytes.
- **`broadcast`, called only after the worker has recorded that hash.**
  - It returns `submitted` when the node echoes the hash.
  - It returns `unknown` for any send error or a different echoed hash.
  - It returns `definitelyNotSent` with `not_prepared` for a hash it does not hold: released, expired or prepared elsewhere.
- **`reconcile`** checks the transport's chain, then reads the receipt and the head block.
  - It returns `confirmed` only when all of these hold:
    - the receipt is at the chain's depth;
    - it succeeded;
    - its `to` is the lock;
    - there is exactly one `Transfer` log from the lock, and it is a mint from zero to the target recipient.
  - A reverted receipt to the lock, at depth, is `definitelyReverted` with code `tx_reverted`.
  - Everything else is `unknown`, so it is never regranted.
  - `inspect(txHash)` tells `pending`, `not_found`, `unavailable`, `mined` and `reverted` apart.
- **Grant parameters:**
  - Expiry follows the lock's own `expirationDuration`.
  - The key manager is the zero address, so the holder manages the key.
  - The adapter decides no token model.
- **Chains:** only 84532 is enabled. Confirmation depth is 10 blocks on 84532 and 256 on 137, which is set ahead of enablement.

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

**Transactions** (7 of 8 allowed; each passed the guard before signing):

| # | Step | From | Hash | Fee (wei) |
| --- | --- | --- | --- | --- |
| 1 | Fund the manager with 0.000028641450325561 ETH | grant signer | `0xcf651a655b8c4eafb9cb5b7fab5590effaaa921a6a9cdd7528691fa9f2846847` | 126014094575 |
| 2 | Deploy PublicLock v14 through the factory | manager | `0x2a121a4712e270e7c72d6e7b2afc53c762dccc09409b2d4f6a393daa674b842f` | 5637488053889 |
| 3 | `grantRole(KEY_GRANTER, grant signer)` | manager | `0x4e3ca044305d7b300610c72089500bab79a4810348e6a89d6b229f9d65c01017` | 352784536416 |
| 4 | Live grant, run 1 (adapter at `487bcc3`) | grant signer | `0x641cde5ab44f9db61db68a433eb60576bf5f8fb122d934f82f0e8fd1d6d23f92` | 1218695931668 |
| 5 | Live grant, run 2 (adapter at `f8d3d8d`, depth 10) | grant signer | `0xe22b2106f2f1f4be2b80bbb0ded6890011543d6798805dedb7f5ec0387eab9fb` | 1013498060277 |
| 6 | Live grant, run 3, first of two in one dispatch pass (fix-round adapter), nonce 3 | grant signer | `0x91f038a629c4c6a02ebb7e53938960a58da398d2eb0d61e40055eb83eca0539c` | 1013413644918 |
| 7 | Live grant, run 3, second of two in the same pass, nonce 4 | grant signer | `0x218bff873df3bd87de363cda8493404f8e257a332c1f0546165a0325402cd14a` | 1013485644918 |

**Balances**

| Point | Grant signer | Manager |
| --- | --- | --- |
| Start | 0.0001 ETH | 0 ETH |
| After the fixture | 0.000071232535579864 ETH | 0.000022651177735256 ETH |
| After run 1 | 0.000070013839648196 ETH | unchanged |
| After run 2 | 0.000069000341587919 ETH | unchanged |
| After run 3 (two grants) | 0.000066973442298083 ETH (spent 0.000002026899289836) | unchanged |

The grant signer's lowest balance, about 0.0000670 ETH, stayed well above the 0.00002 ETH floor. Before run 3, the guard checked the cap and the floor for both grants together.

**Worker runs.** Each run used one in-memory intent and a fresh throwaway recipient; the recipient's key was discarded.
1. `dispatchKeyGrants` left the intent `submitted` with its hash.
2. The run waited for the receipt; run 2 waited for 10 confirmations.
3. One `reconcileKeyGrants` pass set it to `granted`.
4. On chain, each recipient now holds one valid key:
   - Run 1: token `1`, owned by `0x64C517468eB06BCcD8d485517068053c2AfF1AFA`, expires 2027-11-15T18:03:32Z.
   - Run 2: token `2`, owned by `0xB6C207DBB03556560bB7b26B940479ad84dC7a0E`, expires 2027-11-15T18:13:49Z.

   Each was checked with `ownerOf`, `isValidKey` (true) and `balanceOf` (1).

**Run 3: two sequential grants in one dispatch, with the fix-round adapter.**
1. One `dispatchKeyGrants` pass dispatched two intents to two fresh throwaway recipients, from one signer, back to back.
2. The chain's `pending` nonce before the run was 3. The two transactions mined with nonces **3 and 4**.
3. After 10 confirmations each, one `reconcileKeyGrants` pass settled both as `granted`:
   - token `3`, owned by `0x4E6da5717ddCaf87Ab491Fea97c700E8Ba13c087`, valid, expires 2027-11-15T18:31:31Z;
   - token `4`, owned by `0x3758c22D12c87190491775F010c6d63ee622dba5`, valid, expires 2027-11-15T18:31:33Z.

**Aborted first `--send` of the fixture.** It stopped before any broadcast: the ledger directory did not exist, so the ledger write that precedes broadcast failed. Nothing was sent. The directory is now created on write.

## Gates

All three ran once, on the fix round's final source revision. Only this handback changed afterwards.

- **Typecheck** (`node_modules/.bin/tsc --noEmit`, guarded at 4 GiB with `--node-old-space-mib 2048`): exit 0, no `error TS`, no remaining PIDs. `tsconfig` covers `scripts/` and `tests/`.
- **Default suite** (`node tests/run-unit.mjs`, same guard):
  - tests 2924, pass 2880, fail 2, skipped 42, cancelled 0;
  - the only failures are the 2 known deferred styling suites: "article grid preserves its columns and readable type" and "verification loops, account indicators and toast avoid CSS clocks";
  - no remaining PIDs.
- **`git diff --cached --check`:** clean.

## Process notes

- **Install:** one only. `pnpm install --frozen-lockfile` ran under the guard at 3 GiB, exit 0, no PIDs left. The brief's literal command was first refused by the guard's own argument check, because it needs an absolute `--log`; nothing ran.
- **Repository and secrets:** no package, lockfile or project configuration was changed, and no other `.env` was read. The only traffic was JSON-RPC to `https://sepolia.base.org`.
- **Shared exclude file:** during the run I appended `.tmp/` to the repository's shared `info/exclude`, which every worktree and the owner's checkout use. It has been removed, and the file is back as it was. The run logs were moved out of the worktree; none are committed.
- **`/verify`:** not run before the source commit. The brief's gates (typecheck, suite, diff check) cover the same ground.
- **Library-first:** viem is used directly for clients, simulation, signing, `parseEventLogs`, the OP-stack L1 fee and waiting for confirmations. The ABIs come from `@unlock-protocol/contracts`: PublicLockV14, and UnlockV13 for the factory, matching its on-chain version. Env parsing uses `node:util` `parseEnv`. No library covers the adapter's outcome mapping or the spending guard.
- **Library-first, fix round:** viem's `nonceManager` was checked and not used; the reason is under fix-round item 1. The lane's mutex is a small promise chain, because no async-mutex package is installed and none may be added without approval.
- **Processes:** none remain from this slice. Every guard receipt showed `remaining_pids: []`.

## Not met / open points

- **No test failed first for the guard or the fixture.**
  - The spending guard (`assertCanSpend`) has only a characterisation test, written after the live run.
  - `sendGuarded`, the fixture script and the directory-on-write fix are proven only by the live runs.
- **Polygon (137) is not enabled.** At integration it needs an RPC endpoint, a lock and a signer, and owner approval; only its depth is set.
- **Serialisation covers one process only.** Nonce lanes serialise grants within a single process. Two worker *processes* sharing one signer are still unsafe; run one dispatcher per signer, or add a database-level lock in a later slice.
- **No fee bump or rebroadcast (follow-up).** A grant evicted from the mempool, or one with an underpriced fee, goes overdue (`confirmation_overdue`) and waits for a person. A reused nonce after an unclear broadcast can replace an earlier grant the node held but had not yet shown; that grant then also goes overdue. Either way it is never double-granted.
- **Parked intents remain `failed_retryable`.** They carry a code but no dedicated state, so pages see them as "key pending". A dedicated state would need a migration and was out of scope.
- **Walletless email keys are not covered.** Guest keys through Unlock's KeyManager, and the cancel authority (risks in ADR-0008 and ADR-0009), come with the guest invite and refund slices.
- **Nothing calls the adapter yet.** No production code constructs it; wiring it to a runner or scheduler is outside this slice.
- **Remaining test funds:** the manager holds about 0.0000227 ETH and the grant signer about 0.0000670 ETH. This slice's cap leaves 1 of 8 transactions.
