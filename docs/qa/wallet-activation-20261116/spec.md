# SPH-WALLET-ACTIVATION-20261116-01 — member wallet activation (backend and its own page)

Slug `wallet-activation-20261116`, branch `codex/wallet-activation-20261116`, based on
`codex/auth-payment-nfc` at the commit that adds this file (your identity base). This is
mechanism work: it merges back into `codex/auth-payment-nfc`, never into `main`.

Read first: `AGENTS.md`, `docs/qa/batch-20261112/shared-rules.md` (the overrides below win),
`docs/adr/0001`, `0004`, `0005`, `0008`, and the Codex plan
`docs/qa/auth-payment-nfc/member-wallet-activation-plan.md`, which is your design. Where the
plan and this spec differ, this spec wins.

## Owner decisions this builds on

- Members activate on the website after payment, on **its own page** (ADR-0005, 2026-11-16).
  Paying never waits on activation; the key-grant intent stays `awaiting_wallet` until then.
- A social sign-in (Google or email) always stays available alongside passkeys. Never remove,
  hide or downgrade it.
- Sign-in passkeys stay unrestricted. Activation reuses a compatible P-256 (ES256) passkey or
  registers a separate ES256 wallet passkey.
- **Lost-passkey recovery is under discussion. Build none of it.** Concretely:
  - one active wallet per member and chain;
  - binding a different wallet when one is active is rejected;
  - no code path retires an active wallet or retargets an intent.

## Scope

1. **Collection** `src/payload/collections/member-wallets/` per the plan, with one additive
   migration under `src/payload/migrations/` and regenerated `src/payload-types.ts`. Do not
   regenerate `src/payload-generated-schema.ts`: the tracked root copy must stay identical.
2. **Domain** under `src/lib/member-auth/wallet/`: WebAuthn registration and the bind assertion
   via `@simplewebauthn/server` (purpose-bound, single-use challenge; fresh canonical identity;
   paid entitlement rechecked at completion), and Safe address prediction via
   `@safe-global/protocol-kit` (read-only RPC; no deployment or send methods, ever).
3. **Attach on activation.** Under the member+chain lock, set the target and move each eligible
   `awaiting_wallet` intent to `pending`. Do this through the existing `withCommerceWrite` and
   collection hook rules, and close the lost-wakeup race the plan describes: settlement that
   lands just after activation must also attach. Code to the existing `KeyGrantTarget` /
   `parseKeyGrantTarget` in `src/lib/commerce/keys/contracts.ts`. Any change to `contracts.ts`
   goes through `ask` first, because a parallel slice codes to it.
4. **Routes** under `src/app/api/member/wallet/`, as in the plan.
5. **The activation page**, its own route under `src/app/(site)/account/` (choose a short,
   plain path and say why), showing the plan's states. Link to it from the account page and the
   order confirmation. The payment email and the card's first tap are follow-ups: record them in
   the handback, don't build them.
   - Load the `ux-writing` skill before drafting copy. Copy goes in `messages/en.json`, with
     `messages/ko.json` mirrored using `""` for every new key.
   - Tailwind only. Neutral monochrome palette, as for verification and login.
   - Do one live local render: a guarded dev server on a free port, at a phone and a desktop
     width. Summarize the screenshots in the handback, then stop the server.

## Overrides of the shared rules

- **Dependencies.** Your worktree has no `node_modules`. Run exactly one install, in your own
  worktree, before anything else:
  `python3 scripts/resource-guard.py --max-gib 3 --timeout 900 --log .tmp/install.log -- pnpm install --frozen-lockfile`.
  Never symlink or write into `/Users/seanschoi/Projects/sphmrs/node_modules`. After that,
  invoke `node` or `node_modules/.bin/<tool>` directly, as the shared rules say.
- **Network.** Read-only JSON-RPC to Base Sepolia (`https://sepolia.base.org`, chain 84532) is
  allowed for Safe address prediction. Nothing else: no mainnet, no writes, no other providers.
- **Database.** For the proof, the disposable-PostgreSQL launcher `tests/support/database-proof.mjs`
  is allowed. If Docker Desktop isn't running, you may start it, and you must quit it afterwards.
- **Resources.** Two other workers may run at the same time. Keep 10 GiB of headroom. Use
  4 GiB and `--node-old-space-mib 2048` for the typecheck and the suite, 6 GiB for the dev
  server, and 3 GiB for the DB proof. Run one workload at a time; never raise a limit after a stop.

## Acceptance

Each behaviour change needs a test that fails first. Tests live under `tests/`.

1. Registration and bind: a valid ES256 credential binds once. A replayed or cross-purpose
   challenge, an RS256 credential or a different member's session is rejected.
2. One wallet: the same wallet replays to the existing state, and a different wallet is rejected
   while one is active.
3. Attach: activation attaches every eligible `awaiting_wallet` intent. A settlement that lands
   after activation attaches immediately. Held and cancelled intents are untouched. Prove this
   against disposable PostgreSQL.
4. The page renders each state, and links appear on the account page and order confirmation.

## Gates (once, on the final revision)

- the typecheck;
- the default suite, showing only the 2 known styling failures;
- the DB proof;
- `git diff --check`, which must be clean.

Then the custodian runs specialist review and two independent Santa reviews on the UI.

Persist the handback as `docs/qa/wallet-activation-20261116/handback.md`. Commit sanitized
evidence only: no raw logs, no home paths, no secrets. Then send one `worker_done`. A slice that
cannot meet a criterion reports it plainly as unmet.
