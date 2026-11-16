# SPH-SOCIAL-SIGNUP-20261116-01: social-only sign-up, email-code sign-in for registered members, a secondary email

Branch `codex/social-signup-20261116`, based on `codex/auth-payment-nfc` at the commit that adds
this file. This is mechanism work: it merges into `codex/auth-payment-nfc`, never into `main`.

Read first:
- `AGENTS.md`, including the purchase sign-in rule updated on 2026-11-16;
- `docs/qa/batch-20261112/shared-rules.md` (the overrides below win);
- `docs/qa/auth-payment-nfc/consolidation.md`, "The flow from zero (16 Nov)" and item 17;
- `docs/adr/0013`;
- `src/lib/auth/options.ts`, `src/lib/member-auth/server.ts`, `src/lib/auth/login-client.ts`;
- `src/components/Authentication/`.

## Owner decisions (2026-11-16)

- Sign-up is social only: Apple, Google or Kakao. The provider's email becomes the primary email
  and can't be changed. An Apple relay address is accepted as it is.
- Kakao is built behind a switch. It stays off until Kakao's business review passes. Turning it on
  or off changes nothing else.
- Registered members can also sign in with an email code, sent to their primary email or to a
  verified secondary email. An email code never creates an account.
- A member can add one secondary email by verifying it with a code.
- Passkeys are optional, and can be added and removed in settings.
- Phone verification follows sign-up, before ordering. It is already built; keep it.

## Scope

1. **Providers.**
   - Add Apple and Kakao to better-auth's social providers, using the installed better-auth
     (1.7.12). No new packages.
   - Each provider is enabled only when its credentials are configured. Kakao also needs an
     explicit switch (`MEMBER_AUTH_KAKAO_ENABLED`).
   - The sign-in surfaces show only enabled providers.
   - Account linking happens only on a matching verified email.
2. **No sign-up by email code.** Set the email-code plugin so it never creates an account. A code
   for an unregistered email is refused without revealing more than the purchase rule allows.
   Staff magic-link sign-in to the admin keeps its own contract.
3. **The secondary email.**
   - A member adds one secondary email and verifies it by code.
   - Email-code sign-in resolves either address to the same member.
   - It can be removed. It can't duplicate any member's primary or secondary email.
   - The primary email stays unchangeable.
   - Schema goes under `src/payload/`, with one additive migration and regenerated
     `src/payload-types.ts`. Do not regenerate `src/payload-generated-schema.ts`.
4. **Surfaces.** The purchase step and the standalone log in / sign up offer Apple, Google and
   (when on) Kakao for sign-up, and email code for registered members, per `AGENTS.md`.
   - Keep the existing sheet and dismissal contracts.
   - Copy: load the `ux-writing` skill; copy goes in `messages/en.json` with `messages/ko.json`
     mirrored using `""`.
   - Tailwind only; 44 px hit targets.

## Overrides of the shared rules
- **Dependencies:** run exactly one install, in your own worktree, before anything else:
  `python3 scripts/resource-guard.py --max-gib 3 --timeout 900 --log <absolute path>/.tmp/install.log -- pnpm install --frozen-lockfile`.
  Never symlink or write into `/Users/seanschoi/Projects/sphmrs/node_modules`.
- **Providers:** none. No Apple, Google or Kakao calls, no email, no `.env`. Test the providers
  with mocked OAuth responses.
- **Database:** the disposable-PostgreSQL launcher `tests/support/database-proof.mjs`, on port
  55499.
- **Resources:**
  - Use `scripts/resource-guard.py` with an absolute `--log` path.
  - 4 GiB and `--node-old-space-mib 2048` for checks, 6 GiB for the dev server, 3 GiB for the DB
    proof.
  - Run one workload at a time, and keep at least 10 GiB of headroom.
  - Another worker runs in parallel, so pick a free dev-server port.

## Acceptance

Each behaviour change needs a test that fails first. Tests live under `tests/`.

1. Sign-up works through each enabled social provider and records the provider's email as the
   primary email, including an Apple relay address. With Kakao switched off, it appears nowhere
   and its callback refuses.
2. An email code signs in a registered member through the primary or the verified secondary
   email. It never creates an account. An unverified secondary email can't sign in.
3. A secondary email is added, verified, used and removed. A duplicate is refused. Prove
   uniqueness against disposable PostgreSQL.
4. Live render: the purchase sign-in step and the standalone log in / sign up, at 390 px and
   1280 px, in each state, under `docs/qa/social-signup-20261116/render/`. The custodian then
   runs a two-reviewer Santa pass.

## Gates (once, on the final revision)

- the typecheck;
- the default suite, showing only the 2 known styling failures;
- the DB proof;
- `git diff --check`, which must be clean.

Run the slice through `/ecc:orch-add-feature`. The owner's decisions above are Gate 1. Commits
and pushes to this branch are authorized.

Persist the handback as `docs/qa/social-signup-20261116/handback.md`, push, and send one
`worker_done`. Report any unmet criterion plainly.
