# SPH-WALLET-ACTIVATION-20261116-02: the wallet we control, created at payment, and the first-tap welcome page

Continue on `codex/wallet-activation-20261116` (HEAD `a0bd38f`) in its worktree. This is mechanism
work: it merges into `codex/auth-payment-nfc`, never into `main`. Do not merge it yourself.

Read first:
- `AGENTS.md`;
- `docs/qa/auth-payment-nfc/consolidation.md`, section "The flow from zero (16 Nov)";
- `docs/adr/0013`, `0003`, `0004`, `0008`, `0011`;
- your own `docs/qa/wallet-activation-20261116/handback.md`.

## Owner decisions (2026-11-16)

- We control each member's wallet. It is a Safe whose owner is a key we hold. It is created when
  payment is confirmed, bound to the account, and the Signet is granted to it at once. There is
  no activation step before the Signet.
- Passkeys are optional and only sign in. A passkey is never an owner of the wallet.
- The activation page stays, usable on its own. The NFC card's first tap opens it (the tap handler
  is a later slice). It offers:
  1. a welcome;
  2. adding a passkey on that phone, justified as "tap it with your phone": the device the member
     carries everywhere.

## Scope

0. **Bring the branch up to date.** Merge `codex/auth-payment-nfc` into your branch; don't
   rebase. Then regenerate the member-wallet migration so it follows the key-grant hardening
   migration. `codex/integration-wallet-activation` (`90ed287`) shows how. One additive migration
   only. Do not regenerate `src/payload-generated-schema.ts`.
1. **Wallet at payment.** When a membership payment settles, inside the settle transaction and
   idempotently:
   - create the member's active wallet record;
   - point it at a Safe whose owner set is the one configured custody owner address
     (`MEMBER_WALLET_OWNER_ADDRESS`), with a salt derived from the member's id;
   - attach the member's Signet intent to it, so the intent moves from `awaiting_wallet` to
   `pending` (the existing attach and lock rules apply).
   - Make no network call inside the settle transaction. Compute the address offline, and keep
     a test that pins it to the Safe SDK's own prediction for fixed inputs.
   - If the owner address isn't configured, settle still succeeds and the intent stays
     `awaiting_wallet`.
   - Record in the handback the exact scheme: owner set, threshold, salt rule, Safe version,
     factory and singleton. It must be fixed before the first live Signet, because changing it
     later strands granted keys.
2. **Drop the passkey-as-owner path.** Remove binding a passkey as the wallet's owner: the bind
   routes, the wallet-passkey registration, and the challenge collection, unless something kept
   still needs them. Remove them from the migration too; it was never deployed.
3. **The welcome page.**
   - Rework the page into the welcome page. Choose its route. Gemini's NFC proposal named
     `/welcome`; say what you chose and why, and redirect the old `/account/activate` if it is
     linked anywhere.
   - The passkey step registers an ordinary sign-in passkey through the existing better-auth
     passkey plugin.
   - It is usable on its own: reachable from the account page, and not gated on anything but a
     signed-in member.
   - Keep the states that still mean something, such as the Signet pending or issued. Remove
     those that don't.
   - Copy: load the `ux-writing` skill; copy goes in `messages/en.json`, with `messages/ko.json`
     mirrored using `""`. The welcome's own wording and look are placeholders until the design
     reset reaches this page: keep them plain and say so.
   - Tailwind only; 44 px hit targets.

## Overrides of the shared rules
- **Providers:** none. No RPC, email or `.env`. The custody owner address in tests is a
  throwaway address.
- **Database:** the disposable-PostgreSQL launcher `tests/support/database-proof.mjs`, port 55498.
- **Resources:** `scripts/resource-guard.py` with an absolute `--log` path. 4 GiB and
  `--node-old-space-mib 2048` for checks, 6 GiB for the dev server, 3 GiB for the DB proof. One
  workload at a time, at least 10 GiB headroom. Another worker runs in parallel; pick a free
  dev-server port.

## Acceptance

Each behaviour change needs a test that fails first. Tests live under `tests/`.

1. A settled membership payment creates exactly one active wallet and moves the Signet intent to
   `pending` with that Safe as the recipient. Replaying the settle changes nothing. Without a
   configured owner, the intent stays `awaiting_wallet`. Prove settlement and replay against
   disposable PostgreSQL.
2. No path registers a passkey as a wallet owner. The welcome page adds a sign-in passkey, and
   works for a signed-in member with or without passkeys.
3. Live render: a guarded dev server against disposable PostgreSQL, seeded through Payload's Local
   API. Capture every state at 390 px and 1280 px under `docs/qa/wallet-activation-20261116/render-r4/`.
   The custodian then runs a two-reviewer Santa pass.

## Gates (once, on the final revision)

- the typecheck;
- the default suite, showing only the 2 known styling failures;
- the wallet DB proof;
- `git diff --check`, which must be clean.

Run the slice through `/ecc:orch-change-feature`. The owner's decisions above are Gate 1. Commits
and pushes to this branch are authorized.

Update `handback.md` with a round-4 section, push, and send one `worker_done`. Report any unmet
criterion plainly.
