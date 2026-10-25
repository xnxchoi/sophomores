# Password-protected team preview

## Scope

The user approved `https://preview.sophomores.co` on the existing Hideaway VPS.
This is a separate, always-on **private team preview**, not the public launch
and not a relaxation of the SSH-only contract in `STAGING.md`. Apex, mail,
existing application services and databases are outside this change.

## Current release — shared flame field, 2026-10-22 KST

Release **`preview-field-20261022`** is active at `https://preview.sophomores.co/`,
built from pushed `main` commit `daefb7f51fa88ef8bd212ab717731ef51aaeee59`.
The footer now uses the accepted image-backed flame/aurora field shared with the
preserved mask editor. The release also deploys the separate Tailwind auth root
stylesheet and its narrow anonymous compiled-CSS exception. JavaScript, fonts,
images, masks, source maps, APIs and other application content remain private;
see [PREVIEW-AUTH.md](PREVIEW-AUTH.md) for the precise method/path restrictions.
Existing credentials, signing key, remembered sessions and protected AR remain
unchanged. No DNS, TLS, provider or production-service changes were made.

- App: `sophomores-preview-field-20261022`, ID
  `d2407f8b895c882153e667acd24b21222ea7facc390a966a16ad9bcd0a65dd4a`.
- Linux AMD64 image config:
  `sha256:135b40dc710e352f409390103177055d16cac4635e739f3984886712db40cb7b`.
- Archive SHA256:
  `56e441d5058f3b6e94a8869b20a527dee4074d70f29751ddd828f9135db1874e`.
  Packaging `identity-mapping.json` records the OCI-index/platform-config distinction.
- Evidence: local `.deployment/operations/preview-field-20261022/`, packaging
  `.deployment/runs/preview-field-20261022/`, remote
  `/var/lib/sophomores-ops/preview-field-20261022/`.
- Frozen release manifest SHA256:
  `6756a4fd4ad9d26df0ff3304bff0851730b123ec722bdeeac3989de26a5891e8`.
- Activation unit `sophomores-preview-field-20261022`: successful exit (0),
  activation state `complete`. Candidate and live trusted-HTTPS suites each passed
  **406 checks**. Candidate outage denial and same-session restart recovery passed.
- Independent workstation public HTTPS acceptance passed **303 checks across 26
  referenced assets**, including the updated CSS/private-asset boundary and
  authenticated release/mask checks. This is HTTP acceptance, not visual QA.
- Post-acceptance `cleanup.json` confirms removal of the exact candidate proxy
  and temporary plaintext login input, with all nine retained service identities
  unchanged.
- Live Chromium browser QA passed at desktop/mobile viewport sizes: styled no-JS
  native login, persistent secure session reuse in fresh contexts, footer rendering
  and pause/resume, editor defaults and keyboard file selection, and initial reduced
  motion. `browser-report.md` records the evidence and unchanged desktop
  backlink/fixed-navigation overlap. No page/console errors or genuine request
  failures were observed; route-aborted requests were recorded separately.
  Physical iPhone/Safari, password-manager/autofill, real browser restarts and
  prolonged sessions remain unverified; technical checks are not aesthetic approval.

Only the preview vhost upstream changed in place; its mounted inode remains
`3539537`. Active configuration SHA256:
`df213fb718cf9c6153c87c594a94cd950c8f668d0600bd97cf352e785350ac2e`.
The app retains the non-root, read-only, resource-capped runtime, existing internal
preview network, no published ports and read-only secret mount. Existing-site
checks preserve Hideaway apex/www 200 and LOST apex/www's pre-existing final 404.

### Current rollback boundary

Immediate rollback is **`preview-refresh-20261019-r2`**, retained app
`sophomores-preview-refresh-20261019-r2`, ID
`59cc7765944072b9508bb9a7d9c74486bd6977bcc00d02ba69ea1aec5460d5dc`.
This operation's `original.conf` freezes its ingress with SHA256
`82910668461919ba6ed00beece8300745efcbeae672cd8577f52d02e39c7b51b`.
Hold preview-operation then shared TLS locks; verify current hashes/inode,
baseline files and retained identities before restoring those exact bytes **in
place**, testing/reloading Nginx and verifying remembered login, private assets
and AR. The rollback release predates the compiled-CSS exception. Never rename
over the bind-mounted file, replay completed activation, or retire retained
app/auth resources without separate authorization.

## Historical release — login refresh, 2026-10-19 KST

Release **`preview-refresh-20261019-r2`** was activated at `https://preview.sophomores.co/`.
It includes the user's simplified staff login: `sphmrs` title, User/Passcode labels,
Remember control, Preview button and FOR STAFF ONLY footer. Login styling remains
inline and controls native so the page works with JavaScript blocked and every
compiled/public asset private. The teaser, flame, typography and wordmark remain
unchanged. Credentials, signing key, remembered sessions and protected AR are
preserved; no DNS, TLS, provider or production changes were made.

- App: `sophomores-preview-refresh-20261019-r2`, ID
  `59cc7765944072b9508bb9a7d9c74486bd6977bcc00d02ba69ea1aec5460d5dc`.
- Linux AMD64 image config:
  `sha256:9d45defa423886079afd3e3787a3214645694331cc18a3506378ac10130a0a72`.
- Archive SHA256:
  `62b48c67109989b1e6f4a9357ec81ff81df879496e0b83aaadf73315f135c8b8`.
- Evidence: local `.deployment/operations/preview-refresh-20261019-r2/`, packaging
  `.deployment/runs/preview-refresh-20261019-r2/`, remote
  `/var/lib/sophomores-ops/preview-refresh-20261019-r2/`.
- Frozen release manifest SHA256:
  `08ed7687e9a726ef8f471e3c12b3e25ddd456d3055bef3a24fad2ed27d69c48a`.
- Linux build passed 316 tests, type generation, typecheck, build and isolated
  no-network smoke. Local lint/coverage and independent source/security reviews passed.
- Activation unit `sophomores-preview-refresh-20261019-r2`: success, state `complete`.
  Candidate and live trusted-HTTPS suites each passed 314 checks. Candidate outage
  denial and same-session restart recovery passed.
- Independent public HTTPS acceptance passed 212 checks across 25 referenced assets.
  Browser QA verified the styled login, changed copy and native Remember toggle
  with scripts blocked. No new physical-iPhone or password-manager certification.
- Exact candidate proxy and temporary plaintext login input removed after public
  acceptance; `cleanup.json` confirms all eight retained service identities unchanged.

Only the preview vhost upstream changed, in place. Its mounted inode remains
`3539537`; active SHA256 is
`82910668461919ba6ed00beece8300745efcbeae672cd8577f52d02e39c7b51b`.
The new app retains the non-root, read-only, capped runtime, existing internal
preview network, no published ports and read-only existing secret mount.
Hideaway apex/www remain 200; LOST apex/www retain their pre-existing final 404.

### Historical login-refresh rollback boundary

Immediate rollback is **`preview-ui-20261018`**, app
`sophomores-preview-ui-20261018`, ID
`d5eae7bee5f6ad4c6ba8af8b2d4d78601b7c6d61cc7797867e55585c347ed2fa`.
It remains running. This release's `original.conf` captures its ingress with SHA256
`f0bcd8363d6cb4c31b9fe4100ccf85c076089fb9287b8a4e06840fa52aa7baf6`.
Hold preview-operation then shared TLS locks; verify current hashes/inode, baseline
files and retained identities before restoring those exact bytes **in place**,
testing/reloading Nginx and verifying remembered login, private assets and AR.
Never rename over the bind-mounted file, replay completed activation, or retire a
retained app/auth resource without separate authorization.

## Historical release — UI refinement, 2026-10-18 UTC

Release **`preview-ui-20261018`** was activated at `https://preview.sophomores.co/`.
It includes the approved Tailwind cleanup, Helvetica Neue/Manrope typography,
uppercase wordmark, and independent glyph scaling from 0.8 at entry to 0.64
when docked. The wordmark's container and letter slots remain unchanged. Reduced
motion and no-JavaScript fallback use the final docked size. Authentication,
existing credentials, signing key, remembered sessions and protected AR remain
unchanged; all application assets remain private.

- App: `sophomores-preview-ui-20261018`, ID
  `d5eae7bee5f6ad4c6ba8af8b2d4d78601b7c6d61cc7797867e55585c347ed2fa`.
- Linux AMD64 image config:
  `sha256:232b77912425bb7e5b52f9a1b140630019284b5c5da33f78b619df4b919e7f15`.
- Archive SHA256:
  `c7c71e7693d6d798f5b4161e534272cd40fb5c7bc8ebc2fc650c295e471f807a`.
- Evidence: local `.deployment/operations/preview-ui-20261018/`, packaging run
  `.deployment/runs/preview-ui-20261018/`, remote
  `/var/lib/sophomores-ops/preview-ui-20261018/`.
- Frozen release manifest SHA256:
  `c78c42ac1a5fb21a89e99249273838a7385b2b6b3403108f0d5e01d89bd7915f`.
- Activation unit `sophomores-preview-ui-20261018`: success, state `complete`.
  Candidate and live trusted-HTTPS suites each passed 304 checks, including actual
  docked glyph styling and the authenticated/anonymous Manrope font boundary.
  Candidate outage denial and same-session restart recovery passed.
- Independent workstation public-HTTPS verification passed 202 checks across all
  25 referenced assets: remembered native login, cookie reuse, private assets,
  actual docked styling, exact Manrope font, AR, hidden verifier and logout.
- Exact isolated candidate proxy and temporary root-only plaintext login input
  were removed after public acceptance; `cleanup.json` records retained-service
  checks. No existing secret, session key or rollback container was removed.

Only the preview vhost upstream changed, in place. Its mounted inode remains
`3539537`; active SHA256 is
`f0bcd8363d6cb4c31b9fe4100ccf85c076089fb9287b8a4e06840fa52aa7baf6`.
The app has no published ports, joins only the existing internal preview network,
and retains the non-root, read-only, capped runtime and read-only secret mount.
Shared Nginx, Payload, Postgres, AR and all retained prior preview containers keep
their original identities. Hideaway apex/www remain 200; LOST apex/www retain
pre-existing final 404. DNS, TLS, production configuration and Compose are untouched.

### Historical UI rollback boundary

The immediate rollback target is **R3**, not the older auth sidecar. Its app
`sophomores-preview-next-20261017` remains running. `original.conf` in the new
operation root contains the R3 ingress (SHA256 `e2055dcaec49b333fa62eb15ad8045887121cc1eb297e40176d66d560ba77d96`).
Hold the preview-operation then shared TLS locks; verify current hashes/inode,
retained container identities and baseline files before restoring those exact
bytes **in place**, testing/reloading Nginx and verifying remembered login, private
assets and AR. Do not replay the completed activation script or rename over the
bind-mounted file. No old app/auth resource was retired.

## Historical release — consolidated Next.js, 2026-10-18 UTC

Release **`preview-next-20261017-r3`** was activated at `https://preview.sophomores.co/`.
Login: `/login`; sign-out: `/logout`; native POST handlers: `/api/session` and
`/api/session/logout`. Retired `/__preview/*` paths are no longer application routes.
Existing credentials, signing key and remembered sessions were preserved.

The active app container is `sophomores-preview-next-20261017`, ID
`f3cf75a7192e6553534f22df987ae0066c48f229c93d44215c9d3e5eb9ab08d2`.
Linux AMD64 image config ID:
`sha256:b4a2e651e829b90b3fcd1bf21797af080d5a85beffc461fc3b10339ea97f82af`.
Archive SHA256:
`ec0f2f24dbae33cffb54b3c15a68357f425e81035f986e84c8b59a38aa5a3869`.

All assets remain private. Precompressed WebP images are served directly with
session cookies, rather than through the unauthenticated optimizer fetch. The
existing AR service remains protected via Next's internal verifier. Shared
Nginx, Payload, Postgres, old preview app/auth, AR, network identity, credentials,
production configuration and Compose file were checked against the baseline.
Only the existing preview vhost's contents changed; its mounted inode was preserved.

Evidence: local `.deployment/operations/preview-next-20261017/` and remote
`/var/lib/sophomores-ops/preview-next-20261017/`. The release manifest freezes
reviewed scripts/config, accepted candidate checks and exact container identities.
Activation unit `sophomores-preview-next-20261017` exited successfully with state
`complete`. Candidate and live HTTPS suites each passed 281 checks; candidate
outage/restart checks passed. Existing Hideaway apex/www retained 200, and LOST
apex/www retained their pre-existing final 404.

Public HTTPS verification from the workstation also passed: native remembered
login, all 25 referenced assets denied anonymously and available with a session,
AR protection, cookie reuse, hidden verifier and logout (178 checks). Evidence:
`acceptance-public.json`. Temporary server-side plaintext login material and the
exact isolated candidate proxy were removed; `cleanup.json` records cleanup.
No new physical-device/password-manager behavior was certified.

### Historical R3 rollback boundary

The old preview app and auth sidecar remain available; do not retire them without
separate authorization. `original.conf` in this operation root is the previous
**remembered-login plus AR** vhost, not the initial Basic Auth configuration.
The active vhost remains at
`/var/lib/sophomores-ops/preview-vps-20261015/sophomores-preview.conf`, SHA256
`e2055dcaec49b333fa62eb15ad8045887121cc1eb297e40176d66d560ba77d96`.

For a later rollback, hold preview-operation then shared TLS locks; validate the
current hash/inode and retained container identities, restore these captured
original bytes in place, test/reload Nginx, then verify remembered login and AR.
Do not replay the completed one-shot activation script or replace the bind-mounted
file by rename. The older recovery section below describes historical setup only.

## Historical release — remembered login, 2026-10-17

The team preview now uses a normal login form and a secure remembered session,
not the browser's HTTP Basic Auth prompt. Existing team credentials are unchanged.
Leave **Keep me signed in for 30 days** checked on a personal device. Unchecked
uses a browser-session cookie with a 12-hour server-side maximum. Private browsing,
cleared website data, expiry and another browser/profile require another login.
Password managers can recognize the native username/current-password fields;
their save/autofill prompts remain controlled by each browser and user.

- Login: `https://preview.sophomores.co/__preview/login`
- Sign out: `https://preview.sophomores.co/__preview/logout` (confirmation + POST).
- `__Host-sophomores-preview`: signed, fixed expiry, Secure, HttpOnly,
  SameSite=Lax, host-only; no password in the cookie and no localStorage secrets.
- Every application path remains gated, including assets, studies and APIs.
  An unavailable auth service fails closed rather than exposing the application.
- Sidecar: `sophomores-preview-auth`, recorded immutable ID in
  `/var/lib/sophomores-ops/preview-session-20261017/auth-id`.
- Read-only source and secret mounts, UID/GID 1000, 128 MiB, 0.25 CPU,
  64 PIDs, dropped capabilities, no-new-privileges, bounded logs,
  `unless-stopped`; only the internal preview network, no published port.
- Uses the already-loaded pinned Node 24 image; no app rebuild or dependency added.
  Runtime inspection is saved as root-only `auth-runtime.json` in that operation root.
  Preserve this standalone container during unrelated Compose deployments.
- Configuration: operation-root `auth-config.json`, mounted as
  `/run/secrets/preview-auth.json`. Contains a salted scrypt verifier and a separate
  signing key; never commit or print it. Historical sidecar contract; the replacement contract is [PREVIEW-AUTH.md](PREVIEW-AUTH.md).

Sign-out clears this browser's cookie only. To revoke **all** sessions, rotate the
signing key and restart only the recorded auth container. A password change alone
does not revoke issued tokens: rotate the key too. Individual session revocation
is not supported by this stateless gateway.

The existing preview vhost was updated **in-place**, syntax-checked and gracefully
reloaded. Nginx, preview app, Payload and Postgres retained their original container
IDs and start times. DNS, certificate hooks, production configuration and OTP were
not changed. The active vhost mount path and Compose ownership below still apply.

### Consolidation history

The local App Router candidate was subsequently deployed as the current R3 release
above. Its clean routes replace the historical `/__preview/*` paths. The source
ingress file remains a template: deploy only a verified, frozen candidate with
the intended app upstream. See [PREVIEW-AUTH.md](PREVIEW-AUTH.md) for the current
runtime and private-asset contract.

### Historical sidecar verification and recovery

- `pnpm test:preview-auth`: 34 tests passed; auth coverage 100% lines,
  96.79% branches, 97.30% functions. Separate auth suite passed on target Linux Node 24.
- Isolated candidate: trusted TLS, protected route variants, native form, wrong
  credentials, CSRF, valid/expired cookies, all 14 referenced assets, logout,
  restart persistence, auth-outage denial/recovery and existing-site baselines passed.
- Public HTTPS: login, persistent cookie, cookie reuse, assets, logout and denial
  without authentication checked separately. Native password-manager saving and
  physical iPhone behavior have not been verified; browser UI testing was blocked
  by an open Chrome extension panel. The owned candidate proxy and temporary
  server-side plaintext login body/cookie jar were removed after acceptance.
- Activation evidence: `activation-state`, `frozen.sha256`, `active-config.sha256`
  in `/var/lib/sophomores-ops/preview-session-20261017`; successful unit
  `sophomores-preview-session-activate-20261017-retry1`. The first dispatch was
  cancelled before any config write because its caller retained the operation lock.
  Dispatch future units with `--no-block`; let the unit acquire its own locks.
- Rollback bytes: operation-root `original.conf` (previous Basic Auth vhost).
  The reviewed one-shot `activate.sh` rolls back ordinary failed acceptance.
  Do not rerun it after an activation marker or overwrite an unexpected live hash.
- An interrupted partial in-place write requires manual reconciliation: hold both
  existing locks, compare identities and owned hashes, restore the reviewed bytes
  into the existing mounted inode, run `nginx -t`, then graceful reload. Never
  replace the mounted file by rename or recreate production containers. Existing
  workers retain their previous configuration until a successful reload.

## Historical release 2026-10-15

Activation status: **live and password-protected**. The supervised activation
completed successfully; external HTTPS authentication and static-asset checks passed.
The original Payload/Postgres container IDs and start times remained unchanged.

- Local source: `/Users/seanschoi/Projects/sphmrs`; build performed locally for Linux AMD64.
- Evidence: `.deployment/runs/preview-vps-20261015/` (ignored).
- VPS operation root: `/var/lib/sophomores-ops/preview-vps-20261015` (root-only).
- Application: `sophomores-preview-app`, immutable ID in `app-id`.
- Network: `sophomores-preview`, internal; immutable ID in `network-id`.
- No published application port. Only the existing Nginx proxy exposes 80/443.
- Runtime UID/GID 1000, read-only root, two bounded cache/temp tmpfs mounts,
  512 MiB memory, 0.5 CPU, 128 PIDs, dropped capabilities and no-new-privileges.
- Restart policy `unless-stopped`; a stopped laptop cannot terminate this preview.
- No production secrets, database mounts, Docker socket or production network on the app.
- Direct probes to production app/database and public egress were blocked.
  Host bridge SSH remains reachable: an internal Docker network is **not** a
  complete host sandbox. Do not deploy untrusted server code under this model.

The verified archive is 94,680,576 bytes, SHA256
`ecbf07a7d2a8262d51a63fa76462c92425d2726b72fb30ca01a876a5d5d69c0b`.
Docker Desktop reported an OCI index ID; classic Linux Docker loaded its
platform config ID. `identity-mapping.json` records this verified distinction.
The initial preparation stopped safely on that mismatch before creating a
network or container; a separately guarded continuation reconciled it.

## Access and updates

Application documents, studies, APIs and non-CSS assets require the remembered
session described above (HTTP Basic Auth was used initially). Only native auth
documents/form endpoints and narrowly matched compiled CSS GET/HEAD paths are
anonymous; see [PREVIEW-AUTH.md](PREVIEW-AUTH.md).
HTTP redirects to HTTPS; only the narrow ACME challenge directory is exempt.
Responses are private/no-store and noindex. Auth headers are stripped before
requests reach Next.js. Never send the password over plain HTTP.

Credentials are outside Git in the operator's protected local file:
`/Users/seanschoi/.local/share/sophomores-preview/access-20261015.txt`.
Share separately through an approved private channel. Never put credentials
in URLs, command arguments, logs or this runbook. The server retains only the
password verifier and session-signing key after acceptance; temporary authenticated curl configuration
must be removed after verification.

This is a **deployed snapshot**, not a development tunnel. Local edits need a
new verified Linux build and a scoped deployment to appear for teammates.
No CI auto-deploy, registration backend, SMS delivery or email service was enabled.

## Proxy and renewal ownership

The original Nginx image and all existing settings are retained. The only
proxy additions are the preview network, its separate vhost, password hash,
and narrowly mounted certificate lineage live/archive directories.
`production.conf` and the existing certificate renewal hook remain unchanged.

The active proxy model is the operation root's `candidate-nginx-only.json`.
The shared project's `compose.prod.yaml` receives only the same Nginx mount
and network additions so ordinary future deployments do not silently erase
the preview. Preserve those local changes when updating the Hideaway checkout.
Never use `compose down` or recreate Payload/Postgres for this preview.

Preview renewal source is `deployment/ops/certbot-reload-sophomores-preview.sh`.
Installed at `/etc/letsencrypt/renewal-hooks/deploy/30-sophomores-preview`.
The Certbot timer is enabled. A direct scoped hook execution successfully reloaded
Nginx and verified the trusted served certificate; this is not a simulated renewal.
It uses the same proxy TLS lock as the existing hook, validates the lineage,
mounted certificate and trusted served certificate, and fails closed. Its
installation and live execution are recorded in the operation root.

## Historical 2026-10-15 recovery

Before changes, capture the exact running proxy/app/network IDs, existing-site
responses and hashes. Hold both the preview-operation and shared TLS locks.
Activate only a pre-tested proxy candidate with correct and incorrect
authentication checks. The root-owned one-shot activation script automatically
restores the frozen original proxy model if its acceptance checks fail.

Do not blindly rerun a partially executed script. Inspect `state`,
`activation-state`, immutable IDs, the systemd journal and configuration hashes.
The original proxy model is `original-nginx-only.json`; the original shared
Compose bytes are `original-compose.yaml`. Compare current identities and owned
hashes before rollback; never overwrite foreign changes or remove by name alone.
Rollback affects only Nginx and the exact owned Compose patch, not app/database
containers. Keep the isolated preview app for diagnosis unless removal is
explicitly requested and its recorded ID matches.

## Historical 2026-10-15 verification boundaries

- Linux build: 230 tests, typecheck, Next build and standalone runtime smoke passed.
- Preview/existing renewal-hook tests: 31 passed.
- Candidate Nginx: syntax, trusted TLS, no/wrong-auth 401, authenticated HTML,
  referenced CSS and favicon 200, private/no-store, noindex, HTTP redirect passed.
- Existing candidate routes: Hideaway apex/www 200; LOST apex/www retain their
  pre-existing final 404 after redirects. This deployment does not fix LOST.
- External public acceptance: no/wrong-auth 401 on all probed paths; correct-auth
  HTML and all 14 referenced static assets plus favicon returned 200. Headers and
  HTTP-to-HTTPS redirect passed. Local evidence: `public-acceptance.json`.
- Application restart was tested without restarting the server or other apps.
- The temporary candidate proxy and exact owned ACME preflight file were removed.
  The live preview network now contains only its application and shared Nginx.
  Temporary server-side plaintext curl credentials were removed.
- Six dependency advisories remain in source dependencies; Nodemailer/braces
  were verified absent from the standalone runtime. This is runtime exclusion,
  **not** a clean dependency audit.
- Physical iPhone flame quality, full disaster recovery and provider-console
  recovery remain separate unverified boundaries.
