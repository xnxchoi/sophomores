# Consolidated Next.js preview authentication

**Deployed to the private team preview on 2026-10-18 UTC.** This replaces the standalone preview-auth
service with the existing Next.js application. It does not enable membership,
OTP, registration or provider integration. The accepted live release and rollback
evidence remain in [TEAM-PREVIEW.md](TEAM-PREVIEW.md).

## Pending local stylesheet policy (2026-10-21; not deployed)

The local source now gives authentication its own compiled Tailwind root stylesheet,
`app/(auth)/index.css`, imported only by the auth root layout. Explicit Tailwind
source includes/excludes keep auth classes out of the main stylesheet and teaser
classes out of auth CSS. Source scanning controls generated selectors, while the
separate root-layout imports control which pages load each stylesheet.

The scoped anonymous exception permits only `GET`/`HEAD` requests to
`/_next/static/chunks/<safe-name>.css` or `/_next/static/css/<safe-name>.css`,
where the single filename contains ASCII letters, digits, underscores or hyphens.
This intentionally permits **all compiled CSS**, including site CSS: styles are
not secrets. It does not make JS, fonts, images, source maps, arbitrary public CSS,
APIs, or RSC requests public. Configuration validation still happens first and
fails closed; write methods and RSC headers/`_rsc` requests are not CSS exceptions.
No generated manifest, copied public stylesheet, or separate asset service is used.

Auth CSP now permits same-origin external styles (`style-src 'self'`) but not
inline styles or scripts; `default-src 'none'` continues to block scripts, fonts,
and other dependencies. Native login/logout and strict same-origin form CSRF
validation are unchanged. Verify this with a **production build**: development
Fast Refresh needs JavaScript and is not a reason to weaken the auth CSP.

The historical deployment evidence below predates this policy. A future separately
authorized preview refresh must use the updated runtime acceptance contract:
anonymous compiled CSS succeeds with CSS MIME, auth/site graphs are separate,
other asset classes remain private, and native forms work without JavaScript.
Do not replay historical activation scripts or interpret this local change as an
already deployed asset-policy change.

## Source and runtime ownership

- `app/(auth)/login/page.tsx` and `logout/page.tsx`: real App Router pages.
  The `(auth)` route group adds no URL prefix. Its own root layout is isolated
  from the teaser's client providers.
- `app/(auth)/api/session/route.ts` and `session/logout/route.ts`: native form
  POST handlers; no Server Action or browser JavaScript required.
- `lib/preview-auth/`: configuration, password verification, signed sessions and
  bounded attempt handling. No authentication implementation lives in deployment.
- Root `proxy.ts`: gate for **every** URL with no matcher exclusions. After
  validating configuration, only safe compiled CSS GET/HEAD requests receive the
  scoped anonymous asset exception described above.
  `skipProxyUrlNormalize` keeps Flight/data requests visible to that gate;
  removing it can make Next normalize them into public login-page requests.
- `deployment/ops/sophomores-preview.conf`: Nginx deployment template using one Next app
  upstream. Next guards its own routes; the existing `/ar` service uses an
  internal-only `/api/session/verify` subrequest. The old sidecar is retained
  for rollback only, not used by the active ingress.

Build the normal application with `pnpm build`; the standard standalone Next
artifact is the only service artifact. Runtime needs no TypeScript loader or
separate authentication build. Do not distribute `.deployment` or configuration
secrets with the image. The release snapshot explicitly requires `proxy.ts` and
copies only the exact ingress fixtures needed by build-time tests, not all of
`deployment/`.

## Compiled stylesheets and no-JavaScript login

Unauthenticated users can request the exact native login/logout documents and form
POST endpoints, plus the narrow compiled CSS paths documented above. The auth root
layout imports its separate Tailwind stylesheet and uses system fonts, a
script-blocking CSP and no shared teaser providers. Next may emit framework script
tags in its HTML; those assets remain private and cannot execute under the login
CSP. Login must work with JavaScript disabled. No compiled JS/font/image exemptions
are needed to bootstrap authentication.
Login/logout documents use `Referrer-Policy: same-origin`: native browser form
POSTs must retain their same-origin `Origin` header. Do not replace this with
`no-referrer` or permit `Origin: null`; the latter would weaken the CSRF check.
The teaser and studies live under `app/(site)` with their original URLs and
layout. Cache Components is disabled so native auth responses do not depend on
JavaScript to reveal streamed page content.

Unauthenticated application documents redirect to login; non-CSS asset/API/RSC
requests are denied rather than returning private content. Nginx also blocks external
`/api/session/verify` requests. A direct app port must never be published: the
trusted proxy overwrites the client IP and forwarded host/protocol, strips Basic
credentials and known internal routing/bypass headers, and keeps legitimate RSC
navigation headers intact. Next is the gate even when requested directly on its
isolated network; the private network still contains trusted infrastructure only.

## Runtime configuration and fail-closed mode

Run the normal standalone server (`node server.js`, port 3000), with:

- `PREVIEW_AUTH_MODE=protected` (also the default when omitted).
- `PREVIEW_AUTH_CONFIG=/run/secrets/preview-auth.json`, mounted **read-only** into
  the app container, readable by its non-root runtime user.
- The existing config and signing key unchanged during migration.

Missing, malformed or invalid configuration must deny access, not quietly turn
protection off. `PREVIEW_AUTH_MODE=public` is an explicit opt-out for a deliberately
public release/local packaging probe, not a preview fallback. The preview hostname
remains protected even when that flag is accidentally set. Never bake a public
mode into the private-preview image or production container specification.

The existing strict configuration schema is unchanged:

| Field           | Required value                                                   |
| --------------- | ---------------------------------------------------------------- |
| `origin`        | `https://preview.sophomores.co`                                  |
| `username`      | `team`                                                           |
| `passwordSalt`  | 16 random bytes, 32 lowercase hexadecimal characters             |
| `passwordHash`  | 64-byte scrypt output, 128 lowercase hexadecimal characters      |
| `signingSecret` | 32 independent random bytes, 64 lowercase hexadecimal characters |

Password derivation remains scrypt `N=16384`, `r=8`, `p=1`, using the decoded salt.
Never commit, print or put the password, signing key, config or cookies in argv.

## Routes and controls

| Route                            | Contract                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `GET /login`           | Native username/current-password form                                                                 |
| `POST /api/session`        | Exact HTTPS Origin, URL-encoded bounded body, trusted overwritten X-Real-IP; success redirects to `/` |
| `GET /logout`          | Explicit confirmation form                                                                            |
| `POST /api/session/logout` | Exact Origin; clears cookie and redirects to login                                                    |
| `GET`/`HEAD /api/session/verify`   | Internal-only diagnostic; Nginx returns 404 externally                                                |

Retain strict form field/duplicate/UTF-8 validation, the 4 KiB request limit,
five attempts per 15 minutes per IP, 1,024-client memory bound and two concurrent
hashes. Successful authentication clears that IP's budget. Nginx adds a separate
POST limit for both session endpoints. In-memory limits reset on restart and are
per process; this setup assumes one app instance, not an uncoordinated fleet.

`__Host-sophomores-preview` remains Secure, HttpOnly, SameSite=Lax, host-only and
scoped to `/`. Checked remember-me uses a fixed 30-day persistent session;
unchecked uses a browser-session cookie with a 12-hour server-side maximum.
Native autocomplete supports password managers but cannot force their save UI.
Sign-out clears this browser cookie; copied tokens remain valid until expiry.
Rotate the signing key and restart the app to revoke all sessions. A password
change alone does not revoke existing tokens. Individual revocation is not offered.

## Local checks and future activation

For ordinary UI development without shared-preview credentials, explicitly use
public mode **on loopback only**:

```sh
PREVIEW_AUTH_MODE=public pnpm dev --hostname 127.0.0.1
```

Do not tunnel or share that process. For protected-session testing, use the
synthetic runtime suite below; real browser login requires the configured HTTPS
origin. A plain `pnpm dev` remains protected and returns 503 without valid runtime
configuration, rather than silently opening a private preview.

```sh
pnpm test:preview-auth
pnpm test:preview-auth:coverage
pnpm typecheck
pnpm build
pnpm test:preview-runtime
pnpm test:deployment
```

Runtime integration checks use synthetic configuration and no real team password.
Local verification on 2026-10-17 passed the application test suite, auth coverage
thresholds, typecheck, lint, production build and isolated standalone checks on
Node 24. JS-disabled Chromium completed native login/error/reload/logout through
a loopback-only CONNECT/TLS test proxy at desktop and mobile viewport sizes.
Evidence and the earlier discarded browser-interception limitation are recorded
in `.deployment/runs/auth-next-20261017/preview-runtime-browser-summary.md`.
These checks do not establish physical-iPhone, password-manager, live Nginx or
VPS acceptance.

The generic Docker packaging smoke uses `PREVIEW_AUTH_MODE=public` **only** inside
its disposable `--network none`, no-published-port container to verify packaged
page/assets. That smoke is not private-auth, Nginx, browser or deployment proof.
Private-auth acceptance must separately cover anonymous compiled CSS delivery and
source isolation, unauthenticated JS/font/image/arbitrary-public-CSS and RSC denial,
native login with JavaScript disabled, cookie reuse, logout,
invalid config, and failed/bypassed proxy requests against the built Next server.

Future separately authorized deployments must:

1. Capture current app, auth sidecar, proxy identities/hashes and rollback bytes.
2. Build and verify the consolidated Linux image without secrets.
3. Start an isolated candidate app with the existing secret mounted read-only,
   protected mode, no published port, non-root/read-only runtime and bounded resources.
4. Test candidate Nginx syntax and trusted HTTPS, compiled CSS delivery and all
   remaining private assets, form/CSRF,
   session compatibility, restart persistence, failure denial and existing sites.
5. Switch only the owned preview app/proxy setup; retain the old sidecar for rollback.
6. Remove the exact old sidecar only after acceptance and authorized retirement.

The local config is not an activation script. Do not blindly copy it over a live
mounted inode, reload the shared proxy, rotate keys or retire the existing sidecar.
The accepted deployment changed only the preview application and its vhost.
DNS, certificates, credentials, provider state and existing app/database containers
were unchanged. See TEAM-PREVIEW.md for the accepted release and rollback record.

## Historical accepted runtime details (before the pending CSS change)

Release `preview-next-20261017-r3` was accepted in the historical run below.
Consult TEAM-PREVIEW.md for the latest deployment record. Login is `/login`, sign-out is
`/logout`, and native form handlers are under `/api/session`. Existing team
credentials and signed sessions are unchanged.

Existing WebP images use `images.unoptimized=true`: the browser sends its cookie
when requesting the original protected image. Next's optimizer omits upstream
authentication headers and was rejected during candidate testing. No asset
exemption was added.

The Next ingress location defines its own security headers, avoiding the shared
proxy's duplicate referrer policy and broad CSP. Native auth documents retain
Next's restrictive script-blocking CSP; authenticated teaser pages do not inherit
that shared broad CSP. `/ar` retains its existing response policy.

Candidate and live trusted-HTTPS suites each passed 281 checks. They cover native
login, CSRF, session compatibility, private assets, RSC/prefetch, invalid/expired
cookies, logout, and protected AR. Candidate outage denial and same-session
restart recovery also passed. These are HTTP/runtime checks, not new physical
iPhone or password-manager certification.
