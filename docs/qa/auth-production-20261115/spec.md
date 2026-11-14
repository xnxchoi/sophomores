# SPH-AUTH-PRODUCTION-20261115-01 — enable registration and login on the production origin

Slug `auth-production-20261115`, branch `codex/auth-production-20261115`. Follow the
[batch shared rules](../batch-20261112/shared-rules.md) and AGENTS.md.

- No pnpm, npm or yarn scripts.
- Provider-free: no `.env` reads, no mail, SMS or Zoho calls.

Your identity base is **the main commit that adds this file**. Persist your handback as `docs/qa/auth-production-20261115/handback.md`.

## Context

The owner deploys to **https://sophomores.co** on Sunday, 2026-11-15. Member registration and login already work locally:
- email codes go through Zoho ZeptoMail SMTP;
- phone verification goes through Zoho;
- Google sign-in and Better Auth are in place.

Both configs are deliberately pinned to loopback:
- `src/lib/member-auth/config.ts` allows only `mode: "local"`, `http://localhost`, and `rpId: "localhost"`;
- `src/lib/phone-verification/server/config.ts` allows only loopback origins and databases;
- `src/lib/member-auth/http.ts:70` and `identifier.ts:48` repeat the localhost origin checks.

Nothing is lost. This assignment only adds a production mode.

## Scope

1. **Production mode.** Add `MEMBER_AUTH_MODE=production` and the matching phone-verification production mode, alongside the existing `local` mode. In production mode:
   - **Origin:** must be `https:`, with no port, path, credentials, query or hash. `rpId` is the origin hostname, e.g. `sophomores.co`.
   - **Databases:** may be non-loopback PostgreSQL URLs that require TLS or a private network. Keep the existing rules on secret format and secret separation.
   - **Cross-checks:** the member-auth and phone-verification origins must match.
   - **Validation:** missing or invalid values fail fast at boot, as `local` mode does today.
2. **Origin checks.** Replace the hard-coded localhost checks in `http.ts` and `identifier.ts` with the configured origin. Keep `local` mode behaviour exactly as it is.
3. **Cookies.** In production mode, auth cookies are `Secure`. Confirm the Better Auth base URL and trusted origins come from the configured origin.
4. **No other changes.** Leave the UI, copy and flow as they are. Don't relax the `local` mode rules.

## Acceptance

All behaviour must be RED before it is GREEN.

1. **Production config.** It accepts `https://sophomores.co` with valid secrets and databases, and produces `rpId` `sophomores.co`. It rejects `http:`, ports, paths, mismatched origins and missing secrets. `local` mode tests pass unchanged.
2. **Request origins.** Requests from the configured production origin pass the origin checks. Requests from any other origin, including localhost while in production mode, are rejected.
3. **Secure cookies.** Production mode sets `Secure` cookies and uses the configured base URL, proven by test.

## Gates

Run each once on the final revision:
- the full typecheck;
- the default suite, using the repo's standard invocation and showing only the 2 known failures;
- `git diff --check`, which must be clean.

Commit sanitized evidence only: no raw logs, no home paths. Then send one `worker_done`.

**Time:** this is on the critical path for Sunday. Keep it minimal.
