# SPH-AUTH-PRODUCTION-20261115-01 — handback

**State: candidate.** All three acceptance criteria and the three gates pass.

- Branch: `codex/auth-production-20261115` (renamed from the Orca-created branch as the first action).
- Identity base: `73e20c2` (main commit that adds the spec). Worktree: `auth-production-20261115`, clean at start.
- Code diff hash (`git diff 73e20c2 -- src tests | sha256`, first 16 hex): `3d4bdd2731efd675`.
- Provider-free. No `.env` read, no mail/SMS/Zoho call, no database, no pnpm/npm/yarn script, no package/lockfile/schema change.

## What changed

Production mode is `MEMBER_AUTH_MODE=production` plus `PHONE_VERIFICATION_MODE=production`. `local` stays as is.

- **Origin rule** (`productionOrigin`, `phone-verification/server/config.ts`): `https:`, exact dotted DNS hostname, no port, path, credentials, query or hash; not an IP or `localhost`. `rpId` is the hostname (`sophomores.co`).
- **Database rule** (`productionDatabaseUrl`): `postgres(ql):`, a plain database name, no hash. The only permitted parameter is `sslmode` of `require`, `verify-ca` or `verify-full`. Without `sslmode`, the host must be private: loopback, an RFC1918 IPv4 literal, or a single-label container-network name such as `postgres`.
- **Cross-checks, secret rules and error messages** are unchanged. Secrets stay 64 hex and separate. The member-auth and phone-verification origin and database must match. Each production mode requires the other. Invalid or missing values throw at load, with the same private error text as `local`.
- **Request authority:** new `hasConfiguredRequestAuthority`. For `http:` it delegates to the existing local helper. For `https:` it requires an exact `request.url` origin and, when a Host header is present, `host === origin.host`. This is the precedent in `tickets/portone/http.ts`. Forwarded headers are ignored. Switched callers: `member-auth/http.ts`, `identifier-http.ts`, `email-entry.ts`, `phone-verification/server/http.ts`.
- **Local-only helper unchanged:** `hasLocalRequestAuthority` itself is untouched. `commerce/access.ts`, `commerce/domain.ts`, `commerce/portone/endpoints.ts` and `tickets/portone/http.ts` still call it and are unaffected.
- **Explicit `production` opt-in** on `createMemberHandlers`, `PgPhoneIdentifier` and `createMemberMailer`. Existing local tests require these to reject an `https` origin by default, so the default stays loopback-only. Callers pass `production` from the validated config.
- **Secure cookies:** `member-auth/server.ts` now sets `useSecureCookies: config.mode === "production"`. It was hard-coded `false`.
- **App-set cookies:** the phone-verification session cookie and the phone identifier cookie are hand-built `Set-Cookie` strings. They now get `; Secure` when the handler origin is `https:`. Local strings are byte-identical, and the production test asserts both cases.
- **Live stack** (`lib/auth/options.ts`): sets `advanced.useSecureCookies: true` only when the resolved site URL is `https://`, and leaves local `http` defaults alone.
- **Base URL and trusted origins:** the live Better Auth stack takes them from `NEXT_PUBLIC_SERVER_URL`, then `BETTER_AUTH_URL`, then `NEXT_PUBLIC_BETTER_AUTH_URL`, not from `MEMBER_AUTH_ORIGIN`. In production mode, `loadPayloadMemberConfig` fails fast unless `MEMBER_AUTH_ORIGIN` equals that resolved URL. The standalone `member-auth/server.ts` stack uses `config.origin` directly.

### Changes beyond the named files (needed for production login to work)

- `payload-config.ts`: the live `/api/member/status` and `/bind` path goes through it, and it was loopback-only.
- `mail.ts` `localOrigin`: with an `https` app URL it threw, `getAuthMailer` swallowed it and returned `null`, so every email code and magic link would have failed.
- `identifier.ts`, `member-auth/runtime.ts`, `payload-runtime.ts`, the two member routes (`api/member/status`, `api/phone-verification/bind`) and `auth/options.ts`: they pass the `production` opt-in.

## Acceptance

All new behaviour is in `tests/member-auth/member-auth-production.test.ts`, 16 tests.

1. **Production config:** accepts `https://sophomores.co` with valid secrets and databases and yields `rpId` `sophomores.co`. Rejects `http:`, ports, paths, query, hash, credentials, `www`, localhost, mismatched origins and databases, missing or shared secrets, and mode crossing. Existing `local` tests pass unchanged.
2. **Request origins:** the production origin passes the member status and bind routes, phone identify and phone-verification issue. Requests with a foreign origin or Host, a localhost URL or Origin, or `cross-site` are rejected with 403.
3. **Secure cookies:** `getCookies()` on the real `createMemberAuth` and `betterAuthOptions` yields `__Secure-` cookies with `secure: true`. `baseURL` and `trustedOrigins` equal the configured origin. Local mode keeps `secure: false`.

**RED before GREEN.** The first run of the new file, against a stub `hasConfiguredRequestAuthority` and no other implementation, gave 15 tests, 3 pass and 12 fail. The app-set cookie test, added after review, was RED separately (1 fail) before its fix. The 3 passes are negative-only tests that any loopback-only code satisfies. Failing tests: phone production config; production databases; production member auth accepts; canonical membership; configured authority; member status; member HTTP construction; phone identifier and phone-verification routes; identifier and mailer; production Secure cookies; local cookies; canonical options. Raw logs are not committed.

## Gates (final revision)

- **Typecheck:** `tsc --noEmit` exit 0, 0 errors.
- **Default suite:** `node tests/run-unit.mjs` gives 2959 tests, 2916 pass, 2 fail, 41 skipped. The 2 failures are the known deferred-styling tests (article grid; CSS clocks).
- **Whitespace check:** `git diff --check` is clean.

An earlier suite run had a third failure, `member-auth-binding.test.ts` "HTTP preserves rate retry advice". It asserts that `createMemberHandlers({ origin: "https://public.example" })` throws. This was fixed by making production an explicit opt-in and re-run, and it now passes.

## Deviations and things to know

- **Typecheck guard limit:** `tsc --noEmit` hit a V8 heap out-of-memory crash (exit 134) under the shared-rules guard of 1.5 GiB and 1024 MiB. That was not a guard stop. I ran it with the repo's documented `typecheck:guarded` values (4 GiB, 2048 MiB, 10 GiB headroom). Peak was about 2.3 GiB. The default suite ran at 4 GiB. Focused test runs used 1.5 GiB / 1024 MiB.
- **Proxy assumption (deployment check, not a blocker):** the production authority check assumes Next sees `https://sophomores.co` in `request.url` behind the proxy. If TLS terminates upstream and Next sees `http://sophomores.co`, auth requests return 403. Verify on the first deploy.
- **Database host shape:** the deployment docs do not show the production `DATABASE_URI`. A compose service name (`postgres`) with no `sslmode` passes the private-network rule. A public hostname needs `?sslmode=require|verify-ca|verify-full`. Any other query parameter fails boot.
- **Recovery intake (out of scope, still local-only):** `recovery/runtime.ts` and `recovery/http.ts` still require `MEMBER_AUTH_MODE=local`. Their routes catch the load error and return the recovery failure response rather than crashing. Production recovery intake is unavailable until separately enabled.
- **Phone verification transport:** `fixture` and `zoho-poll` are both still accepted in production, unchanged. Zoho receiver config still requires recipient `verify@sophomores.co`.
- **Launch risk (out of scope):** `email-entry.ts` pins every caller to `127.0.0.1`, so all users share one discovery rate bucket of about ten requests a minute. Email lookup may return 429 under launch load.
- **Session cookie names:** no source file hard-codes a Better Auth cookie name. With Secure cookies Better Auth renames them to `__Secure-<prefix>…`, and everything reads sessions through `auth.api.getSession` or payload-auth.
- **Not changed:** UI, copy, flow, `messages/*.json`, commerce and ticket PortOne configs.

## Files

Changed: `src/app/api/member/status/route.ts`, `src/app/api/phone-verification/bind/route.ts`, `src/lib/auth/options.ts`, `src/lib/member-auth/{config,email-entry,http,identifier-http,identifier,mail,payload-config,payload-runtime,runtime,server}.ts`, `src/lib/phone-verification/server/{config,http,local-request}.ts` and `identifier-http.ts`. Added: `tests/member-auth/member-auth-production.test.ts`, this file.

Remaining processes: none. The worktree `node_modules` symlink to the main checkout's `node_modules` is untracked and ignored.

## Follow-up: commerce checkout on the production origin (base `2510284`)

Shop checkout still used the loopback-only helper and rejected every request on `https://sophomores.co`.

- `src/lib/commerce/access.ts` (`assertCommerceBrowserAuthority`) and `src/lib/commerce/domain.ts` (guest-operations gate) now call `hasConfiguredRequestAuthority`. Every other origin, `sec-fetch-site`, `rsc`, query and method check is unchanged.
- Not touched: `commerce/portone/{adapter,proof}.ts`, `tickets/portone/config.ts`, checkout quantity and settle code. `commerce/portone/endpoints.ts` and `tickets/portone/http.ts` already branch on protocol and were left alone.
- New `tests/commerce/core/access-production.test.ts` (3 tests). RED first: 2 of 3 failed, the https-accept cases. GREEN after the switch. It covers:
  - the configured https origin passes for reads and mutations;
  - a foreign origin, localhost while the configured origin is https, a wrong Host, `cross-site`, a query string and an `http:` URL are rejected;
  - local `http` behaviour is unchanged, and the production host is rejected under a local origin;
  - the guest-operations gate rejects the same foreign cases with its 403 and lets the configured origin past the gate.
- Existing `access.test.ts` and `claim-bundled-transaction.test.ts` still pass.
- Gates on this revision: `tsc --noEmit` exit 0 (4 GiB / 2048 MiB); default suite 2962 tests, 2919 pass, 2 fail (the same 2 known deferred-styling tests), 41 skipped; `git diff --check` clean.
- Cumulative code diff hash (`git diff 73e20c2 -- src tests | sha256`, first 16 hex): `3a43e2c6f9d41741`. The exact HEAD is in the `worker_done` message.
