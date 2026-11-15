# SPH-UNLOCK-ADAPTER-20261116-01 — Unlock chain adapter and a Base Sepolia test lock

Slug `unlock-adapter-20261116`, branch `codex/unlock-adapter-20261116`, based on
`codex/auth-payment-nfc` at the commit that adds this file (your identity base). This is
mechanism work: it merges back into `codex/auth-payment-nfc`, never into `main`.

Read first: `AGENTS.md`, `docs/qa/batch-20261112/shared-rules.md` (the overrides below win),
`docs/adr/0004`, `0006`, `0008`, `0009`, `docs/qa/auth-payment-nfc/unlock-capability.md`,
`docs/qa/unlock-integrator-20261114/report.md`, and `src/lib/commerce/keys/{contracts,worker}.ts`.

## Goal

Implement the `KeyGrantAdapter` the existing ADR-0004 worker calls. It grants keys on an Unlock
PublicLock v14 with `viem` and reconciles them from receipts. Then prove it on Base Sepolia
against a throwaway test lock.

## Scope

1. **Adapter** under `src/lib/commerce/keys/unlock/`:
   - `submit`: call `grantKeys` for the target and return the outcomes the contract defines.
     Map "definitely not sent" honestly: only a failure before broadcast counts.
   - `reconcile`: read the receipt and the `Transfer` log to get the token ID, and distinguish
     pending, reverted and unknown.
   - Use the ABI from `@unlock-protocol/contracts`; don't hand-write ABIs.
   - Code to the existing `KeyGrantTarget` / `parseKeyGrantTarget` / `SubmitOutcome` /
     `ReconcileOutcome`. Any change to `src/lib/commerce/keys/contracts.ts` goes through `ask`
     first, because a parallel slice codes to it.
   - **Refuse chain 8453 in code** (Base mainnet) until a later, owner-approved slice lifts it.
2. **Signer loading.** Load from `~/.config/sphmrs/base-sepolia-key-granter.env` at runtime.
   Never print, log, copy or commit key material. Don't read any other `.env`.
3. **Test lock fixture** (a script under `scripts/`, explicitly invoked, never on import or on a
   schedule). Follow ADR-0008's split, so the grant signer holds only KEY_GRANTER:
   - generate a second throwaway testnet key as the lock manager, and store it beside the first
     at mode 0600 (`base-sepolia-lock-manager.env`);
   - fund it with a minimal transfer from the grant signer;
   - deploy a PublicLock v14 through Unlock's Base Sepolia factory, with the manager as deployer
     and manager;
   - add the grant signer as key granter;
   - record the lock address in a committed, non-secret file.

   Give the lock a neutral test name such as "Sophomores test lock". The product name and token
   model are unset, so the fixture decides neither. One lock only: the guest event lock comes
   with the guest invite slice.
4. **Live proof** (opt-in, never in the default suite): grant one key to a throwaway recipient
   address through the real worker functions `dispatchKeyGrants` and `reconcileKeyGrants` with
   this adapter. Then show the token on chain.

## Spending cap

The grant signer holds 0.0001 test ETH (checked 2026-11-16, gas about 0.006 gwei).
- Send at most 8 transactions in total.
- Before each one, stop and report if the balance would fall below 0.00002 ETH.
- Never use a faucet or bridge, and never ask for funds.

## Overrides of the shared rules

- **Dependencies.** Run exactly one install, in your own worktree, before anything else:
  `python3 scripts/resource-guard.py --max-gib 3 --timeout 900 --log .tmp/install.log -- pnpm install --frozen-lockfile`.
  Never symlink or write into `/Users/seanschoi/Projects/sphmrs/node_modules`.
- **Network.** JSON-RPC to Base Sepolia (`https://sepolia.base.org`, chain 84532) only, and
  writes only by the two throwaway keys above, within the spending cap. No mainnet, no other
  providers, no email.
- **Database.** None needed; use the existing worker tests' in-memory or fake Payload patterns.
- **Resources.** Two other workers may run at the same time. Keep 10 GiB of headroom. Use 4 GiB
  and `--node-old-space-mib 2048` for the typecheck and the suite. Run one workload at a time.

## Acceptance

Each behaviour change needs a test that fails first. Tests live under `tests/commerce/keys/`.

1. With a mocked viem transport, each `submit` and `reconcile` path maps to the right outcome,
   including a failure before broadcast, a broadcast with an unknown result, a revert and a
   success with a token ID. Chain 8453 is refused.
2. Key material never reaches logs or thrown messages; test this with a sentinel key.
3. Live proof: the lock and role transactions, then one grant and one reconcile, are recorded in
   the handback with their transaction hashes (public data), with the balance before and after.

## Gates (once, on the final revision)

- the typecheck;
- the default suite, showing only the 2 known styling failures;
- `git diff --check`, which must be clean.

Persist the handback as `docs/qa/unlock-adapter-20261116/handback.md`. Commit sanitized evidence
only: no raw logs, no home paths, no key material. Then send one `worker_done`. Report any unmet
criterion plainly.
