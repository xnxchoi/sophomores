# SPH-WALLET-ACTIVATION-20261116-01: handback

**State: candidate.** It meets acceptance criteria 1–4, with the limits stated below. It merges into `codex/auth-payment-nfc`, not `main`.

- Branch `codex/wallet-activation-20261116`. Orca created it as `xnxchoi/…`; I renamed it as my first action, as the coordinator asked.
- Base `4657dbb`. The candidate commit follows this file.
- Worktree `orca/workspaces/sphmrs/wallet-activation-20261116`.
- `src/lib/commerce/keys/contracts.ts` is **untouched** (`keyGrantChains` is unchanged, per the coordinator's 2026-11-16 note).

## What was built

| Scope item | Where |
| --- | --- |
| Collections | `src/payload/collections/member-wallets/` and `member-wallet-challenges/`, registered in `commerceDomainPlugin` next to the key-grant intents. Settlement reads wallets, so every config that settles has them; this includes the DB-proof fixture. |
| Migration | One additive migration: `src/payload/migrations/20261115_180919_member_wallets.{ts,json}`, plus its index entry. It was generated offline by `payload migrate:create` against the snapshot. I hand-normalised only the `down` order (`IF EXISTS`, constraints before tables, as in the key-grant migration) and the whitespace (`git diff --check`). |
| Types | `src/payload-types.ts` regenerated, with additions in the two new collections only. `payload-generated-schema.ts` (root and `src/`) is **byte-identical**. |
| WebAuthn | `src/lib/member-auth/wallet/credentials.ts` (via `@simplewebauthn/server`). ES256 only, with user verification required. Keys are decoded with the library's COSE helpers and checked on-curve with `node:crypto`. |
| Safe prediction | `src/lib/member-auth/wallet/safe.ts` (via `@safe-global/protocol-kit`). Read-only RPC. The SDK's two derivations must agree. A config hash covers chain, version, salt, verifier, proxy factory, singleton, coordinates, owner and address. No deploy, sign or send path exists; a static test guards this. |
| Activation service | `src/lib/member-auth/wallet/activation.ts`: register options/verify, bind options/verify. Challenges are single-use and bound to purpose, member and session. Identity comes from the fresh canonical session on every call. Eligibility (verified email, not suspended, a live member intent whose payment succeeded) is rechecked at completion. |
| Attach | `src/lib/commerce/keys/activation.ts`, called from `recordKeyGrantIntents`. Details below. |
| Routes | `src/app/api/member/wallet/{status,register/options,register/verify,bind/options,bind/verify}/route.ts` through `wallet/http.ts`. Same-origin only; 16 KiB JSON bodies; per-member rate limit; private, no-store responses. GET status never activates. |
| Page | `src/app/(site)/account/activate/page.tsx` and `src/components/commerce/wallet-activation.tsx`. |
| Links | Account page: `wallet-activation-link.tsx`. Ticket payment confirmation: `portone-payment-result.tsx`, paid state. Shop order confirmation: `payment.tsx`. |
| Copy | `messages/en.json`: `Customer.components_commerce_wallet_activation`, two keys in `components_tickets_portone_payment_result`, and `PageMetadata.activateMembership`. `messages/ko.json` mirrors these with `""` in the same positions. No existing Korean text changed. |

### Attach and the lost-wakeup rule

Both sides take the same lock first, `member-wallet:<member>:<chain>`; per-intent `key-grant:<operationKey>` locks come after it. Activation then writes the wallet and scans; settlement records its intents and attaches them if a wallet is active. Whichever transaction commits first, the other sees its rows.

- **Activation.** Under that lock it writes the active wallet, then attaches each eligible `awaiting_wallet` intent. Each attach sets the write-once target `{chainID, lock, recipient: Safe}` and moves the intent to `pending`, through `withCommerceWrite` and the existing intent hook.
- **Settlement.** It takes the lock before recording intents, then attaches to an already-active wallet.
- **Lock order.** No path takes reservation or admission locks after the wallet lock.
- **Untouched rows.** Held intents (admission under review, revoked or returned; payment review hold; cancellation requested) and cancelled intents are not touched.
- **No recovery path.** Nothing retires a wallet or replaces a target; the wallet hook refuses both.
- **Config can't fail a payment.** Invalid wallet configuration is logged and read as unconfigured, so it can never fail a settlement (tested).

### Route choice: `/account/activate`

The page sits under the account it belongs to, and the path names the one thing the page does. That matches ADR-0005's call to action ("Activate your membership"). It is short, needs no IDs, and is unrelated to how the wallet works, so it survives future recovery or NFC changes.

### Owner decisions applied during the slice

- **Chain (coordinator, 2026-11-16: live chain is Polygon).** The chain comes from `MEMBER_WALLET_CHAIN_ID` and defaults to the test network (84532). A chain is accepted only if `WALLET_RPC_BY_CHAIN` lists a read-only RPC for it, and today only 84532 → `https://sepolia.base.org` is listed. Nothing is named after Base.
- **New environment variables:**
  - `MEMBER_WALLET_LOCK_ADDRESS` (required; without it activation is unavailable);
  - `MEMBER_WALLET_CHAIN_ID` (optional);
  - `MEMBER_WALLET_RPC_URL` (optional; must equal the listed RPC).

## Acceptance

| # | Criterion | Evidence |
| --- | --- | --- |
| 1 | Registration and bind | `tests/member-auth/wallet/activation.test.ts`, using real ES256/RS256 signatures from a software authenticator (`webauthn-fixture.ts`). An ES256 wallet passkey registers, binds once and attaches; replaying the assertion is rejected. A reused ES256 sign-in passkey binds. Registration and bind challenges can't stand in for each other, and an unknown challenge is rejected. RS256 is rejected both for registration and for reuse, with the sign-in passkey left intact. Another member, or another session of the same member, is rejected. |
| 2 | One wallet | Same test file: the same wallet replays to `{replay: true}` with no new prediction. While a wallet is active, register is refused (`WALLET_ACTIVE`); a different credential is refused at options and at verify (`WALLET_CONFLICT`). The PostgreSQL proof shows the database refusing a second active wallet. |
| 3 | Attach | `tests/commerce/keys/activation.test.ts` (fake storage) and `tests/commerce/keys/wallet-activation.db.test.ts` (**disposable PostgreSQL**, real settle path). Activation attaches the eligible intent. A settlement started while activation holds the lock waits on it, and attaches immediately after activation commits. Held (admission review) and cancelled intents are untouched. Catch-up attaches once the hold clears. A wallet can't be retired, retargeted or written without the capability. |
| 4 | Page and links | `tests/commerce/ui/wallet-activation-dom.test.tsx`: every state renders with its next step; approve and create flows; cancelled, incompatible and unsupported prompts; conflict and expired sign-in; account link (including the sign-in-again return); ticket payment confirmation link; shop confirmation link. |

### Test-first evidence

**Genuinely red first:**
- the settlement attach: `activation.test.ts` before the `intents.ts` change gave 3 tests, 1 pass, 2 fail (`state` undefined, expected `pending` / `awaiting_wallet`);
- the invalid-config tolerance fix.

**Written before their tests:** the wallet modules, collections, page and DB proof. Mutation runs stand in for red. Each mutation below was restored afterwards.

| Mutation | Result |
| --- | --- |
| Challenge never consumed | 2 fail |
| Member and session check removed | 1 fail |
| Purpose check removed | 1 fail |
| Conflict guards removed | 1 fail |
| Settlement-side attach disabled (DB proof) | 3 fail; the Sunday proof still passes |
| Activation links removed | 1 fail |
| Config tolerance removed | 1 fail |
| ES256 algorithm checks removed | Survived. The COSE EC2 type and curve checks still reject RSA, so this is defence in depth, not a gap. |

## Gates (final revision)

All gates ran guarded, one workload at a time.

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `tsc --noEmit`; 4 GiB, `--node-old-space-mib 2048` | exit 0, **0 errors** (peak 2.4 GB) |
| Default suite | `node tests/run-unit.mjs`, no flags; 4 GiB, 2048 MiB | 2916 tests: **2871 pass, 2 fail, 43 skipped, 0 cancelled**. The 2 failures are the known deferred-styling suites: `deferred-article-grid` and `deferred-clock-delegation`. |
| DB proof | `node tests/support/database-proof.mjs`; 3 GiB | exit 0. Sunday membership proof **5/5**; wallet activation proof **6/6**, on PostgreSQL 16 in disposable loopback containers that were removed afterwards. |
| Diff check | `git diff --check` against the base, with new files included via `git add -N` | **clean** |

Two earlier runs did not count:
- One suite run was stopped by the guard for *system* headroom (exit 137; its own peak was 0.96 GB; 27 tests cancelled). After waiting for headroom, it was rerun with the same limits.
- An earlier final-revision suite run failed the `member-public-capabilities-boundary` tests. My server-rendered account link loaded session code on the account page; the client-only link fixed it. After that fix, all gates above ran on the final code.

## Live render

- **Setup.** A guarded `next dev` on port 3417 with `PREVIEW_AUTH_MODE=public` and no database or member session. It used an unreachable loopback `DATABASE_URI` and dummy secrets; no `.env` was read.
- **What rendered.** Only the `unavailable` state can render without a database and session. The other states are covered by the DOM tests, not rendered live.
- **Desktop (1402 px)** (`evidence/desktop-1402-unavailable.png`):
  - the card shows "Membership" / "Activation isn't available", the body, a full-width "Check again" and "Back to your account";
  - monochrome neutral palette;
  - laid out in the same 960 px left-aligned column as the payment-result page.
  - This shot predates the reserved status slot (below).
- **Phone (390 px iframe)** (`evidence/phone-390-unavailable-check-again.png`):
  - 16 px gutter, no horizontal scroll (`scrollWidth` 390), 48 px button.
  - "Check again" against the unavailable API shows "We still couldn't load your activation…" in place.
  - Device emulation did not change the viewport, so I used a 390 px iframe instead.
- **Fix found by the render.** The status line grew the vertically centred card, so I added a compact `min-h-12` status slot where actions exist. Re-measured, the card top stays at 116 px before and after the result.
- **Dev overlay.** It showed 3–4 issues. The ones I could open were the site layout's business-footer load failing against the offline database (`Business information is unavailable.`); the `unhandledRejection` in the server log comes from the same load. I could not page through every overlay entry.
- **Server stops.**
  - The dev server was stopped twice by the guard for *system* headroom (peaks 2.9 GB and 5.3 GB, against a 6 GiB limit).
  - Its first start was refused for headroom.
  - I quit Docker, which I had started, to recover headroom, and waited for headroom between attempts. I never raised a limit.
  - The server is stopped, with no PIDs remaining.

## Shared changes outside the new modules (reviewers please check)

- `src/lib/commerce/access.ts`: `rateCommerceCustomer` is exported. It is reused, keyed `member-wallet:<id>`.
- `src/lib/member-auth/http.ts`: `accept` is exported as `acceptMemberRequest`. `readMemberBody` takes an optional `maxBytes`; the default stays 2048.
- `src/lib/commerce/keys/intents.ts`: takes the wallet lock first, creates intents with an explicit `state: "awaiting_wallet"`, and attaches to an active wallet.
- `src/lib/commerce/domain.ts`: registers the two collections.
- `src/app/(site)/account/page.tsx`: adds `<WalletActivationLink />`. That component is client-only and reads `/api/member/wallet/status`, so the account page still loads no session or database code (`member-public-capabilities-boundary.test.ts`). My first, server-rendered version broke that test; the final revision passes it.
- `tests/commerce/core/payment-postgres-fixture.ts`: `seedAttempt` takes an optional existing customer. `tests/support/database-proof.mjs`: new proof entry on its own container and port (55493).
- `withWalletWrite` (`src/lib/member-auth/wallet/access.ts`) copies the `withCommerceWrite` pattern on purpose. It is a separate least-privilege scope, so commerce code can't write wallets and wallet code can't write commerce rows except through `withCommerceWrite` for the intent attach.

## Not built / follow-ups

- **Spec follow-ups.** The activation link in the payment email, and the card's first tap.
- **Catch-up scheduling.** `catchUpKeyGrantTargets` exists and is DB-proven, but nothing schedules it yet. Same-wallet replay re-attaches for one member. Running it from the worker is left for integration, so the Unlock slice's `dispatchKeyGrants` proof is untouched.
- **Lock address.** It comes from `MEMBER_WALLET_LOCK_ADDRESS` until the Unlock slice's committed lock file lands.
- **Live-chain RPC.** Add the Polygon (137) read-only RPC to `WALLET_RPC_BY_CHAIN` at integration.
- **Provisional Safe values.** Safe `1.4.1` and salt `"0"` are provisional and need owner approval (plan, open questions). Changing either changes every address.
- **Challenge rows.** They are kept after expiry, as evidence; there is no cleanup job.
- **First credential only.** The page offers only the first compatible credential. If that passkey lives on another device, the member sees "cancelled or timed out". A picker, or a clearer message, is a follow-up.
- **Sign-in again.** It signs out and returns to `/account`. A session flag makes the account link re-check after the in-place sign-in, and the member then follows the link back. A direct return to `/account/activate` would need the account page to support a return path; I recorded this rather than built it.
- **Hold copy.** "Your order is being reviewed…" also covers a requested cancellation of an already-dispatched key. That slot has no defined refund wording yet.
- **No support channel.** The hold state has no support contact to point to.
- **Browser support.** The browser side uses the native WebAuthn JSON APIs (`parseCreationOptionsFromJSON` / `toJSON`), because `@simplewebauthn/browser` is not a direct dependency and installs were frozen. Older browsers see the "unsupported" message.
- **Lost-passkey recovery.** None built, per the spec.

## Process notes

- **Install.** The spec's literal install command was rejected by the guard, which requires an absolute `--log`. The one real install was the same command with an absolute log path. Nothing was symlinked or written into the shared `node_modules`.
- **Network.** One read-only prediction against `https://sepolia.base.org` during design confirmed that the SDK path works and that both derivations agree. Every test mocks the predictor; there is no RPC in the suite or the DB proof.
- **Docker.** I started Docker Desktop for my first DB proof, quit it to recover headroom for the render, started it again for the final proof and quit it afterwards. No proof containers of mine remain.
  - **Possible interference with another worker.** After the final proof, the container list showed `sphmrs-guest-invite-20261116`, the parallel guest-invite slice's proof container. Docker was therefore also in use by that worker, and I stopped Docker Desktop twice without knowing.
  - The first final-proof attempt found Docker half-up ("already running", with engine 500 errors). This may have been that worker's start, or my earlier stop.
  - If that worker's DB proof failed around these times, my Docker stops are the likely cause. It should simply rerun.
- **Evidence.** Only sanitized evidence is committed (this file and two screenshots). Raw logs stayed in an untracked local `.tmp/`.
- **Remaining processes.** None that I own.
