# SPH-WALLET-ACTIVATION-20261116-01: handback

**State: in progress (Santa round 2 partial: items 1–3, minor and Codex b–d done; Codex a and the re-shoot remain).** It meets acceptance criteria 1–4, with the limits stated below. The live render covers all seven page states, and the seven security review items are fixed; both are described below. It merges into `codex/auth-payment-nfc`, not `main`.

- Branch `codex/wallet-activation-20261116`. Orca created it as `xnxchoi/…`; I renamed it as my first action, as the coordinator asked.
- Base `4657dbb`. The candidate commit follows this file.
- Worktree `orca/workspaces/sphmrs/wallet-activation-20261116`.
- `src/lib/commerce/keys/contracts.ts` is **untouched** (`keyGrantChains` is unchanged, per the coordinator's 2026-11-16 note).

## What was built

| Scope item | Where |
| --- | --- |
| Collections | `src/payload/collections/member-wallets/` and `member-wallet-challenges/`, registered in `commerceDomainPlugin` next to the key-grant intents. Settlement reads wallets, so every config that settles has them; this includes the DB-proof fixture. |
| Migration | One additive migration: `src/payload/migrations/20261115_201256_member_wallets.{ts,json}`, plus its index entry. It replaces `20261115_180919_member_wallets`, which was never merged. It was regenerated in place, offline, by `payload migrate:create` against the key-grant snapshot. I hand-normalised only the `down` order (`IF EXISTS`, constraints before tables, as in the key-grant migration) and the whitespace (`git diff --check`). |
| Types | `src/payload-types.ts` regenerated, with additions in the two new collections only; generator formatting is kept, not Prettier's. `payload-generated-schema.ts` (root and `src/`) is **byte-identical**. |
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

## Security review fixes (coordinator msg_f47abd9fbd31)

I wrote the tests first. Against the committed `31ddea3` source, the new tests gave 37 tests: 24 pass, **13 fail**. Each new behaviour failed except item 7 (explained below). Every new test passes on the fixed code.

1. **MEDIUM: held intents stranded.**
   - *Release hook.* `commerce-admissions` has an `afterChange` hook. When `benefitReview` goes from true to not-true, it calls `attachForMember`, which takes the member+chain lock and attaches in the same transaction. The DB proof releases the hold through the Local API, and the intent becomes `pending` with its target.
   - *Explicit sweep.* `catchUpKeyGrantTargets` is the explicitly invoked sweep. Each member runs in a short transaction of its own. It returns `{moved, members, more}`, and `more` replaces the silent stop at `MAX_ROWS`.
   - *Combined sweep.* `sweepWalletActivation` runs this catch-up together with the purge (item 5).
   - *No other release path.* Nothing in code clears an admission review hold today, and a payment review hold can't be reset by design. So the hook covers the admission release, and the sweep covers anything else.
2. **MEDIUM: wallet-key collision (raw 503, squatting).**
   - *Uniqueness model.* `walletKey` is no longer unique.
     - `activeWalletKey` is unique and nullable, and is set only on active rows, so a Safe can be active for one member at most.
     - `memberWalletKey` (`<member>:<walletKey>`) is unique and required, so there is one pending row per member per key.
     - The collection hook checks that both values are derived correctly.
   - *Pre-checks.* Register and bind both check before writing and return `WALLET_CONFLICT` (409). A unique-index race is also mapped to `WALLET_CONFLICT`, never a storage error.
   - *Squatting.* A squatter's pending row doesn't block the real owner.
   - *Tests.* Fake storage and PostgreSQL both cover this: a pending duplicate is allowed, and a second active row is refused by the database.
3. **LOW: burn on failure.** Register and bind verify now consume the challenge first, atomically, in their own transaction under the member lock. This happens before any signature check, so a failed verification can't be retried with that challenge.
4. **LOW: fresh session at every step.** `principalOf` checks the fresh-session window in every method, including `registerVerify`, `bindOptions` and `bindVerify`.
   - The page now sends a stale session in `approval_pending` or `activation_required` to "Sign in again".
5. **LOW: bounded growth.**
   - *Caps.* At most 5 open challenges and 3 pending wallets per member; the next request gets `LIMIT_REACHED` (429).
   - *Purge.* `sweepWalletActivation` purges expired challenges and pending wallets older than 7 days, and also reports `more`. Deletes are server-only: for challenges only when expired, for wallets only when pending.
   - *Status rate limit.* The status GET is rate-limited per signed-in member (31st call → 429).
   - *N+1 read.* The reader batches its reads (user, intents, payments `in`, admissions `in`, wallets, passkeys). A test shows the query count is the same for 2 and 20 intents.
6. **LOW: `member_id` NOT NULL with ON DELETE SET NULL. Choice: nullable (anonymised).** `member` is now nullable on both collections.
   - *Wallets.* A wallet record is evidence for keys already issued to its Safe, so deleting a user keeps the row with `member_id` NULL. RESTRICT would have blocked account deletion. The DB proof deletes a user and finds the wallet still `active` with a null member.
   - *Challenges.* They follow the same rule and are purged by the sweep.
   - *New creates.* A new create still requires a member.
7. **INFO: expiry at consume.** The consume step re-reads the challenge under the lock and refuses it if it has expired, in the same transaction that marks it consumed.
   - *Not genuinely red.* The test passed on the old code too, because the old code already checked expiry before verifying. The change is that the check now happens at consume time, under the lock.

**Migration.** Regenerated in place as one additive migration (`20261115_201256_member_wallets`), replacing the unmerged `20261115_180919` one. Its JSON snapshot shows `member_id` nullable, `wallet_key` not unique, and unique `active_wallet_key` and `member_wallet_key`. The `down` order and whitespace are normalised as before. `payload-types.ts` was regenerated, and `payload-generated-schema.ts` is unchanged.

## Santa round 2 (task_fb23f7b54675): partial, stopped at the time box

Each item below has its own commit; the tests for item 1 and for Codex items b–d were red before the fix.

### Done

| Item | Commit | Change |
| --- | --- | --- |
| 1. Accuracy (code) | `2c3e011` | An active wallet with no paid membership left (refunded or cancelled) now reads `not_eligible` ("Nothing to activate"), not `key_pending`. |
| 2. Account view | `e7d1232` | The entry reports whether activation is due (`onDue`). While it is due, "Activate your membership" is the one primary action: "Add a passkey" turns secondary and the "Passkeys are optional…" note is hidden. The page passes `walletActivation`; `TicketAccountEntry` owns the entry. |
| 3. Ticket payment result | `94a5af2` | The result shows the state-driven `WalletActivationLink`, so a member who already activated sees nothing. The now-unused `activateMembership` and `activateMembershipHint` keys are removed from `en` and from `ko` (both were `""` in `ko`). |
| — | `34dc7c1` | The payment-result fetch-count test now excludes the entry's own status read. |
| Minor | `7030985` | Announced once: the focused heading reads the title and the live region gives the outcome (the body). A sibling that is only unavailable shows `cursor-not-allowed`; only the busy button shows `cursor-wait`. |
| Codex b–d | `4298de9` | **b.** "Check again" stays mounted through its own check and after a failed re-check. **c.** A lost verify response that the re-read confirms (`key_pending` / `key_issued`) clears the unknown-result error. **d.** Needing to sign in again counts as a state change, so focus moves to the heading and the live region announces it. |

**Gates on `4298de9`:**

| Gate | Result |
| --- | --- |
| Typecheck | 0 errors |
| Default suite | 3060 tests: **3012 pass, 2 fail** (the known deferred-styling tests), 46 skipped |
| Diff check | clean |
| DB proof | not rerun (the custodian ran all four on `2806a0e`; since then the only server change is the `read.ts` rule, which the unit tests cover) |

### Not done (next session)

- **Codex a.** Only the first credential is offered. Offering every compatible credential, or letting the browser choose, needs `bind/options` to accept more than one credential, or a picker. This is a mechanism change.
- **Item 4, the re-shoot.** Not started. It needs the dev server, and I couldn't start a long workload after 06:45.
  - The existing renders in `render/` are **stale against the final copy** and should be deleted and re-shot together, in one pass from the final commit.
  - The states to shoot are listed in the round-2 brief, with card top and height recorded against activation-required.
  - The handback's states table is still the round-1 version.

## Santa round 1 fixes (task_935046eae45b)

Tests came first where the behaviour was testable. Against `90ed287`, the new tests gave 27 tests: 21 pass, **6 fail**. After the fixes, the focused suites pass 79/79.

1. **Layout jump.**
   - *Card anchored.* The card is anchored to the top (`items-start`; no `items-center`, no `min-h-[70svh]`).
   - *Status slot.* The slot reserves two lines (`min-h-12`) wherever actions exist.
   - *Message length.* I measured every message live at 390 px. Two of the new messages ran to three lines, so I shortened both, and every message now fits two lines.
   - *Live result.* On success at 390 px the heading stays at 173 px before and after.
2. **Announcement.** On every state change, focus moves to the h1 (`tabIndex -1`). The status region always stays mounted, and it announces the new state's title (for example "Membership activated").
3. **Dead end.** "Check again" shows whenever `errorUnknown` shows. A refresh that changes the state clears the stale error; after a failure, the error is kept.
4. **Accurate copy:**
   - a `bind/options` or `register/options` failure says "We couldn't start the passkey request. Nothing has changed…";
   - a cancelled approval adds "If your passkey is on another device, open this page there." (only one credential is offered, so the other-device case is explained rather than built);
   - the persistent three-pending cap has its own server code, `PENDING_LIMIT` (409), and copy; the challenge cap and the rate limit say "Wait a few minutes";
   - `WALLET_ACTIVE` now re-reads the status and shows the real state, never a conflict line;
   - the hold copy is cause-neutral: "Your key can't be issued while this order has an open request or review. You don't need to do anything here."
5. **Account entry.**
   - *Placement.* `WalletActivationLink` now renders inside the signed-in member view, through a new `memberAction` slot (page → `TicketAccountEntry` → `MemberAccountStudy` → dialog → flow → view), instead of being appended below the tray.
   - *Refresh on sign-in.* The entry mounts only once the member is signed in, so it reads the new session's status after an in-place email-code sign-in.
   - *Tests.* A render test shows it appears for a signed-in member and never for an anonymous one.
6. **Two prompts.** The create copy says "You'll be asked to approve with it right after". Before the second prompt opens, the status reads "Passkey created. Approve with it once more to finish." (committed synchronously with `flushSync`, so it is on the page first).
7. **Shop confirmation.** It shows the state-driven `WalletActivationLink`, which renders only while this member has activation to do. A confirmed order with no membership to activate shows nothing.

**Reported auth test** ("chooser closes and reopens while focused account actions preserve real email-code state"): I couldn't reproduce it. On this branch at `90ed287` it passed alone and in its file (37/37), and it passed again in the full suite after these changes.

### Re-render (`render/`)

All captures are against seeded disposable PostgreSQL, signed in through the existing passkey endpoints:

| Capture | What it shows |
| --- | --- |
| `activation-required-{390,1280}` | the activation-required state |
| `approval-pending-{390,1280}` | the approval-pending state |
| `flow-approve-result-390` | success in place: heading still at 173 px, focus on the h1, status "Membership activated" |
| `flow-approve-error-{390,1280}` | cancelled approval |
| `flow-approve-rejected-1280` | a rejected verify; heading stays at 181 px and the card height is unchanged |
| `account-entry-signed-in-{390,1280}` | the entry inside "Account ready" (48 px link, no horizontal scroll) |

**Capture caveats:**
- The `flow-approve-error-*` shots show the earlier three-line wording. I shortened it to two lines afterwards; the new wording was measured live but not re-shot.
- There is no 1280 success shot: the pending-wallet fixture key was rejected by verify. The 1280 success destination looks like `key-pending-1280`.
- The `on-hold-*` captures predate the new hold copy.

**Follow-up.** In the signed-in view, "Activate your membership" and "Add a passkey" are now both primary buttons. Demoting "Add a passkey" needs a change to the auth view's button rule, which I didn't make.

### Gates (round 1)

| Gate | Result |
| --- | --- |
| Typecheck | 0 errors |
| Default suite | 3054 tests: **3006 pass, 2 fail** (the known deferred-styling tests), 46 skipped |
| Diff check | clean |
| DB proof | not rerun. The only server change is the `PENDING_LIMIT` code, which the unit tests cover. |

## Gates (final revision)

All gates ran guarded, one workload at a time.

| Gate | Command | Result |
| --- | --- | --- |
| Focused tests | wallet, keys, wallet UI DOM tests; 4 GiB | 119 tests: **118 pass, 0 fail, 1 skipped** (the DB-gated suite) |
| Typecheck | `tsc --noEmit`; 4 GiB, `--node-old-space-mib 2048` | exit 0, **0 errors** |
| Default suite | `node tests/run-unit.mjs`, no flags; 4 GiB | 2928 tests: **2883 pass, 2 fail, 43 skipped**. The 2 failures are the known deferred-styling suites (`article grid`, `CSS clocks`). |
| DB proof | `node tests/support/database-proof.mjs`; 3 GiB | exit 0. Sunday membership proof **5/5**; wallet activation proof **8/8** (adds the hook release, the pending/active uniqueness check and the anonymised-delete check). PostgreSQL 16, disposable loopback containers, removed afterwards. |
| Formatting / diff check | Prettier on changed TS; `git diff --check` against the base, with new files included via `git add -N` | **clean** |

One DB proof run failed first, on my new uniqueness check only: it assumed rows sort by status text, but the enum sorts `pending` first. The query now orders by `status::text`; the rerun gave 8/8.

## Live render

All seven states were rendered against real data, at 390 px and 1280 px. The captures are in `render/` (PNG, 64 colours, 11–24 KB each).

### Setup

- **Database.** A disposable loopback PostgreSQL 16 container (`sphmrs-wallet-render-20261116`, port 55494), migrated with the branch's migrations. It was removed afterwards with `docker rm -f -v`.
- **Seed.** Payload's Local API, through `withCommerceWrite` and `withWalletWrite`. One member per state, each with an ES256 sign-in passkey from a software key (RS256 for the incompatible member):

  | Member | Seeded as |
  | --- | --- |
  | no entitlement | no paid order |
  | activation required | paid, awaiting wallet |
  | incompatible | RS256 passkey only |
  | approval pending | pending wallet passkey |
  | key pending | active wallet, pending intent |
  | key issued | active wallet, granted intent |
  | on hold | admission `benefitReview` true |

- **Server.** A guarded `next dev` (6 GiB) via `scripts/member-auth-preview.ts --in-place` with `PREVIEW_AUTH_MODE=public`, on port 3417.
- **Sign-in.** The existing passkey sign-in endpoints (`/api/auth/passkey/*`), with an in-page software authenticator signing in the browser. No auth code was edited.
- **One direct SQL insert (recorded per the Payload-native rule).** The passkey sign-in policy also needs a verified phone binding, and `canonical_member.phone_bindings` is not a Payload collection. Without a binding, sign-in returned 403 "This authentication request is unavailable." On the disposable render database only, I inserted one synthetic binding per render member (`policy_version` `local-skt-zoho-arc-v1`, random hash and challenge ID). No Payload table was edited by hand.

### States (`render/<state>-{390,1280}.png`)

Every state rendered, with 48 px controls and no horizontal scroll (`scrollWidth` equals the viewport at both widths).

| State | Captures | What shows |
| --- | --- | --- |
| No entitlement | `no-entitlement-*` | "Nothing to activate", with View tickets and Back to your account |
| Activation required | `activation-required-*` | "Approve with passkey", "Create a new passkey instead" and Back |
| Incompatible credential | `incompatible-*` | "Your saved passkey can't hold a key…", with Create passkey |
| Approval pending | `approval-pending-*` | "Your passkey is ready. Approve with it once more…" |
| Key pending | `key-pending-*` | "Membership activated", "Your key will be issued…" |
| Key issued | `key-issued-*` | "Membership activated" (issued copy) |
| Review/refund hold | `on-hold-*` | "Your key is on hold", "You don't need to do anything yet." |

### Buttons

- **Approve** (activation-required member), with a virtual authenticator in the page that signs the real challenge (`render/flow-approve-result-390.png`). The sequence was:
  1. `bind/options` returned 200, after about 10 s of read-only Base Sepolia prediction;
  2. one WebAuthn `get`;
  3. `bind/verify` returned 200;
  4. the page moved in place to "Membership activated".
  - In the database the wallet was active and the intent was `pending` with its target.
- **Cancelled create** (incompatible member; the authenticator throws `NotAllowedError`) (`render/flow-create-cancelled-390.png`). `register/options` returned 200, then "The passkey request was cancelled or timed out. Try again when you're ready." appeared in the reserved status slot. The button stayed in place.

### Defects the render found (fixed)

1. **Left-aligned card.** At 1280 px the card sat in the left column; `main` now centres it (`justify-center`).
2. **Status line pushed the back link.** The status slot moved into the actions group (`min-h-6` where actions exist, `sr-only` otherwise), so a result line no longer reflows the card.

### Dev-only artifact seen during the button check (not a product defect)

The first Approve attempts failed with 503. A temporary, uncommitted server log showed the cause: the challenge collection refused the write as "Wallet challenges are server owned". In `next dev` (webpack), compiling a route on demand re-evaluates `wallet/access.ts`, but the cached Payload instance keeps collection hooks from the earlier module instance. Payload reloads its config only on a `serverComponentChanges` HMR event. The two WeakMaps then differ.

Evidence that this is dev-only:
- After warming every route and touching one server file (which made Payload reload), the same flow passed (above).
- A plain Node run of `createWalletActivation` (bind options → bind verify) against the same database returned `{status: "active", attached: 1}`.
- `withCommerceWrite` uses the same pattern, so a production build (one module graph) should not see this.
- **Not verified:** I didn't run a production build.

Two other first-compile flakes looked the same (a 401 and a 503 on the first hit of a newly compiled route, from a better-auth session lookup). They also cleared once the routes were warm.

### Notes on the captures

- **Dev overlay.** The "1 Issue" badge comes from the shell's pre-existing `MISSING_MESSAGE Customer.navigation.music`; it's not from this page.
- **Cursor.** The white dot is the site's own SVG cursor.
- **Headroom.** One dev server was stopped by the guard for *system* headroom, after hot-reload recompiles. I didn't raise any limit. I made the source edits first, waited for headroom, and then captured without editing.
- **Servers.** All servers are stopped, and the render container is removed.

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
- **Sweep scheduling.** `sweepWalletActivation` (catch-up plus purge) is explicitly invoked and nothing schedules it yet. Hold releases on admissions attach immediately through the hook. Running the sweep from the worker or a job is left for integration, so the Unlock slice's `dispatchKeyGrants` proof is untouched.
- **Lock address.** It comes from `MEMBER_WALLET_LOCK_ADDRESS` until the Unlock slice's committed lock file lands.
- **Live-chain RPC.** Add the Polygon (137) read-only RPC to `WALLET_RPC_BY_CHAIN` at integration.
- **Provisional Safe values.** Safe `1.4.1` and salt `"0"` are provisional and need owner approval (plan, open questions). Changing either changes every address.
- **Options failure copy.** If `bind/options` fails (for example, the RPC is unavailable), the page says "We couldn't confirm the result. Check again." Nothing has happened at that point, so clearer wording is a copy follow-up.
- **Payment-result alignment.** The payment-result page still uses the same left-aligned column the activation page had; it was not changed here.
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
- **Evidence.** Only sanitized evidence is committed (this file, two earlier screenshots and the `render/` captures). Raw logs stayed in an untracked local `.tmp/`.
- **Docker (render pass).** I ran the render container and the final DB proof on Docker. Before quitting Docker Desktop I checked `docker ps`, and no container was running.
- **Remaining processes.** None that I own: the dev server is stopped, and the render and proof containers are removed.
