# SPH-KEY-GRANT-HARDENING-20261116-01 — signer serialisation across processes, stuck-grant replacement, on-chain cancel

Slug `key-grant-hardening-20261116`, branch `codex/key-grant-hardening-20261116`, based on
`codex/auth-payment-nfc` at the commit that adds this file (your identity base). This is
mechanism work: it merges back into `codex/auth-payment-nfc`, never into `main`.

Read first: `AGENTS.md`, `docs/qa/batch-20261112/shared-rules.md` (the overrides below win),
`docs/adr/0004`, `0008`, `0009`, `0010`, `docs/qa/unlock-adapter-20261116/handback.md` and
`dispatch.md`, and `src/lib/commerce/keys/*`. The owner called these three gaps important
(2026-11-16).

## Scope

1. **Serialise the grant signer across processes.** Today the nonce lanes hold within one
   process only, so two app instances or an overlapping run can collide.
   - Hold a database-level lock per signer and chain around nonce choice, write-ahead record
     and broadcast, using the existing advisory-lock helper in
     `src/lib/commerce/_shared/transaction.ts`, not a new mechanism.
   - Persist the nonce on the intent. The next nonce is the maximum of the chain's `pending`
     count and one past the highest nonce of this signer's in-flight intents.
   - Prove it with two concurrent dispatchers against disposable PostgreSQL: no shared nonces,
     no lost grants.
2. **Replace a stuck grant.** A grant unconfirmed past its deadline is replaced, not abandoned:
   - Re-sign the same nonce with a higher fee, within a set ceiling.
   - Record each replacement hash write-ahead, beside the earlier ones.
   - Reconcile against every recorded hash for that intent. Exactly one can mine, so whichever
     does settles the intent.
   - Cap the attempts. After the last one, the intent goes to `ambiguous` with a clear code for
     a person to look at.
   - Never re-sign with a new nonce while an older one for the same intent could still mine.
3. **Cancel on chain (ADR-0009).** When an intent is `granted` and `cancelRequested` is set,
   for example after a manual refund, a durable cancel operation cancels the key on chain with
   the separate lock-manager authority, never the grant signer.
   - It is explicitly invoked, with no scheduler, and idempotent.
   - It records its transaction write-ahead, like grants.
   - It is reconciled from the receipt.
   - It ends in a recorded cancelled state.
   - Pick the PublicLock v14 function from the contract source in `@unlock-protocol/contracts`,
     and say why.
   - A grant that lands after the refund is reconciled, then cancelled.

Schema changes go on the key-grant intent collection (`src/payload/collections/commerce-key-grant-intents/`),
with one additive migration and regenerated `src/payload-types.ts`. Do not regenerate
`src/payload-generated-schema.ts`. Keep `KeyGrantTarget` and `parseKeyGrantTarget` unchanged:
the activation slice codes to them.

## Live proof on Base Sepolia (opt-in, never in the default suite)

Use the existing test lock and keys from `tests/commerce/keys/fixtures/base-sepolia-test-lock.json`
and `~/.config/sphmrs`.
- **A replacement.** A grant sent with a deliberately low fee is replaced by a higher-fee
  re-sign of the same nonce. Show which hash mined.
- **A cancel.** One of the existing test keys is cancelled by the manager key, and that is
  reconciled.

Spending cap: at most 14 transactions in total across both keys. The manager may be topped up
from the grant signer. Before each transaction, stop and report if a balance would fall below
0.00001 ETH. Never use a faucet or bridge.

## Overrides of the shared rules

- **Dependencies.** Run exactly one install, in your own worktree, before anything else:
  `python3 scripts/resource-guard.py --max-gib 3 --timeout 900 --log <absolute path>/.tmp/install.log -- pnpm install --frozen-lockfile`.
  Never symlink or write into `/Users/seanschoi/Projects/sphmrs/node_modules`.
- **Network.** JSON-RPC to Base Sepolia (`https://sepolia.base.org`, chain 84532) only, and
  writes only by the two throwaway keys, within the cap. The adapter keeps refusing every other chain.
- **Database.** For the proof, the disposable-PostgreSQL launcher `tests/support/database-proof.mjs`
  is allowed. If Docker Desktop isn't running, you may start it, and you must quit it afterwards.
- **Resources.** Other workers may run at the same time. Keep 10 GiB of headroom, and use an
  absolute `--log` path. Use 4 GiB and `--node-old-space-mib 2048` for the typecheck and the
  suite, and 3 GiB for the DB proof. Run one workload at a time; if the guard stops a run for
  headroom, wait and retry later, and never raise a limit.

## Acceptance

Each behaviour change needs a test that fails first. Tests live under `tests/commerce/keys/`.

1. Two concurrent dispatchers on one signer never share a nonce and lose no grant. Prove this
   against disposable PostgreSQL.
2. A stuck grant is replaced at the same nonce with a higher fee. Reconcile settles on whichever
   hash mined. The attempt cap ends in `ambiguous` with a code.
3. A cancel requested on a granted key is cancelled on chain by the manager authority, exactly
   once, and a late grant is reconciled then cancelled. The grant signer is never used to cancel.
4. Live proof: the replacement and the cancel are recorded with public transaction hashes and
   balances before and after.

## Gates (once, on the final revision)

- the typecheck;
- the default suite, showing only the 2 known styling failures;
- the DB proof;
- `git diff --check`, which must be clean.

Persist the handback as `docs/qa/key-grant-hardening-20261116/handback.md`. Commit sanitized
evidence only: no raw logs, no home paths, no key material. Then send one `worker_done`. Report
any unmet criterion plainly.
