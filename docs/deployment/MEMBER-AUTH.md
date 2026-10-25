# Local member accounts — Better Auth

## Boundary

This is a **local-only** account implementation, separate from the shared preview
login. It does not deploy anything, enable public registration, send mail without
outbound configuration, or upgrade the SKT pilot's legacy-key approval to
production approval. Payload is not installed or given ownership of these tables.

Flow: verified email (Google, email code or magic link) → pending account →
verified phone binding → active member → optional passkey. Returning members
prefer passkeys, with Google and email alternatives. There are no passwords and
no MMS-only login or account recovery.

Phone entry on the sign-in screen is only an account selector. It discloses no
account or email address and cannot authenticate anyone. The selected phone must
match the owner of the subsequently authenticated credential. Email fallback
still asks the user for their email; no private email is revealed from a phone.

## Private setup

Use Node and pnpm from the project. Keep all credentials out of chat and Git.
Do not reuse another project's database, Google client or mail credentials.

```sh
rtk proxy node --import tsx scripts/member-auth-local.ts prepare
```

This refuses to overwrite an existing file and creates:
`.deployment/member-auth-local/runtime.env` (mode `0600`). It preserves the
task-owned local verifier's database/state secret, uses a distinct member session
secret, and selects `http://localhost:3240`. It does not copy mailbox OAuth
credentials or the verifier's test database URL. Both providers start disabled.

### Google OAuth

In an approved Google Cloud project, create an OAuth **Web application** client:

- Authorized JavaScript origin: `http://localhost:3240`
- Authorized redirect URI: `http://localhost:3240/api/auth/callback/google`
- Request only identity scopes: `openid`, `email`, `profile`.
- If the consent app is in testing, add the intended tester accounts.

Put the client ID and client secret in the private file's commented
`MEMBER_AUTH_GOOGLE_CLIENT_ID` and `MEMBER_AUTH_GOOGLE_CLIENT_SECRET` fields,
uncommenting them. Do not paste values into this document or chat. No Google
Cloud resource or consent configuration is changed by the local scripts.
Matching email addresses never silently merge separate Google accounts; linking
another credential requires an authenticated, explicit action.

Successful Google and magic-link sign-ins return to
`/studies/account/continue`, which opens the focused account flow and checks the
server session before showing phone verification or the active account. Direct
visits never establish authentication. The ordinary `/studies/account` entry and
failed authentication remain at the Welcome chooser; Cancel returns there without
automatically reopening the focused flow. Google's registered redirect URI stays
`/api/auth/callback/google`.

### Zoho CPaaS outbound SMTP

The mailbox receiver's `ZohoMail.messages.READ` grant **cannot send login mail**.
Use the CPaaS agent's outbound SMTP credentials and an agent-approved From address.
The [official SMTP setup](https://www.zoho.com/cpaas/help/smtp-home.html) documents
`smtp.zeptomail.com`, port `465` (SSL) or `587` (required TLS).

In the private file, fill and uncomment:

- `MEMBER_AUTH_SMTP_HOST=smtp.zeptomail.com`
- `MEMBER_AUTH_SMTP_PORT=465` (or `587`)
- `MEMBER_AUTH_SMTP_USERNAME=emailapikey` (or the agent-authorized username)
- `MEMBER_AUTH_SMTP_PASSWORD` — the agent SMTP password, not the Zoho login or OAuth token
- `MEMBER_AUTH_SMTP_FROM` — one explicitly approved sender address
- Change `MEMBER_AUTH_MAIL_MODE` from `disabled` to `smtp` only when complete.

No arbitrary SMTP hosts, insecure ports or disabled certificate checks are
accepted. Delivery is awaited with a bounded, cancellable connection. SMTP
acceptance does not prove inbox arrival. Do not send unsolicited test messages;
use only an explicitly authorized recipient for a live test.

## Migrate and launch

```sh
rtk proxy node --env-file=.deployment/member-auth-local/runtime.env --import tsx scripts/member-auth-local.ts migrate
rtk proxy node --max-old-space-size=256 --env-file=.deployment/member-auth-local/runtime.env --import tsx scripts/member-auth-preview.ts
```

Open `http://localhost:3240/studies/account`, **not** the old `127.0.0.1` origin.
The launcher uses an ignored app/config snapshot, separate Next cache and
loopback-only listener. It does not stop or rebuild the user's existing preview.
Changes to copied app routes need a fresh snapshot. Provider configuration is
loaded at process startup, so restart only this owned preview after editing it.

The migration precreates `member_auth`, runs Better Auth's native PostgreSQL
migrations, then the application binding/identifier migrations. The verifier
schema stays separate. It does not drop verifier data, create a test account,
contact a provider or send mail. Do not schema-push Payload over these tables.

With `PHONE_VERIFICATION_TRANSPORT=zoho-poll`, this launcher now supervises one
receive-only Zoho worker automatically. Do not start a separate watch alongside
it. Wait for its first successful scan before issuing a phone challenge.

The worker stays running while the local preview server is running, rather than
ending at five minutes. Stopping the preview process, Next exiting, or the
receiver losing its parent IPC channel stops owned work and clears readiness.
This is not a login daemon or production service. Only the receiver process
loads inbox OAuth credentials; Next never receives those credentials. Member,
Google and SMTP credentials are not inherited by the receiver child.

Operational limits:
- One parent-owned cap of 600 provider requests per rolling hour per preview
  supervisor, including OAuth, metadata and originals, survives worker restarts.
  Exhaustion pauses scans with readiness unavailable until capacity returns.
- Serialized scans run ten seconds after the previous scan; every network/body
  request has a 15-second deadline after its budget grant.
- Three consecutive scan failures stop a worker after bounded 10/30-second
  backoff. The supervisor allows at most three restarts (1/5/15 seconds) per
  preview run. Configuration and duplicate-owner exit 78 is not restarted.
- A dedicated PostgreSQL advisory lock excludes manual/supervised receivers for
  the same database/runtime scope. It is not an account-global mailbox lock
  across different databases. No schema migration is required.
- The worker V8 heap is capped at 256 MiB; the local web child at 1024 MiB.
  These are heap ceilings, not total RSS or a limit on the ChatGPT desktop app.

Only successful scans publish signed readiness. Operational leases rotate before
five minutes, without extending any phone challenge. Offline/stale readiness
returns `RECEIVER_UNAVAILABLE`, not silent waiting. `once` and the explicit
`watch --seconds 300` command remain diagnostic tools; their existing duration
and request budgets are unchanged. `serve` requires its connected supervisor
and is not an unsupervised CLI command. See [the verifier runbook](PHONE-VERIFICATION.md).

An authenticated pending account is not a member. Only the binding transaction
can activate it: verified email, fresh session, same-browser phone proof, exact
phone, approved local policy and unexpired challenge are checked server-side.
Binding and one-use consumption are atomic; another user's phone cannot be
reassigned through signup.

## Passkeys

Passkeys are optional after activation and preferred on returning sign-in. The
server checks authenticator user verification for both enrollment and login,
not merely the browser's requested preference. Cancellation is not success.

This pilot uses RP ID `localhost`. **These local passkeys will not work on the
hosted Sophomores domain.** Production needs a separate reviewed RP/origin and
fresh enrollment. Virtual-authenticator tests are not physical iPhone/Safari,
biometric, password-manager or cross-device acceptance.

## Validation and remaining release gates

Use a new disposable `sophomores_verification_test_*` database for
`MEMBER_AUTH_TEST_DATABASE_URL`; never run integration tests against the working
receiver/member database. Unit-only runs skip database acceptance. Tests must
not send email or contact Google/Zoho; inject a memory mailer and synthetic
credentials in isolated test processes, never public fixture endpoints.

With that URL in a separate private mode-0600 `test.env`:

```sh
rtk proxy node --env-file=.deployment/member-auth-local/test.env --import tsx --test --test-concurrency=1 --experimental-test-coverage '--test-coverage-include=lib/member-auth/**/*.ts' '--test-coverage-include=components/member-auth/*.tsx' --test-coverage-lines=80 --test-coverage-functions=80 --test-coverage-branches=80 tests/member-auth*.test.ts tests/member-auth*.test.tsx
```

Browser specs are standalone Node scripts. Playwright and a matching Chromium
executable must already be installed; these scripts do not install browsers or
promise portable automatic discovery. Set `PLAYWRIGHT_MODULE` to the absolute
Playwright module entry and `CHROMIUM_EXECUTABLE` to the browser executable.
The UI spec uses intercepted synthetic state and blocks mutations/provider calls.
The WebAuthn spec requires a **fresh disposable** database and refuses an existing
auth schema; it uses memory email and a virtual authenticator, then cleans its
owned schema. Do not point it at the working runtime file.

```sh
rtk proxy env PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=/absolute/path/to/chromium BASE_URL=http://localhost:3240 REPEAT=3 node tests/browser/member-auth.spec.mjs
rtk proxy env PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=/absolute/path/to/chromium REPEAT=3 node --env-file=.deployment/member-auth-local/browser-test.env tests/browser/member-auth-passkey.spec.mjs
```

Current production dependency audit is not clean: existing Next.js and
`body-parser` advisories (the latter through shadcn/MCP tooling) predate this
slice. Resolve them in a separately scoped compatibility pass before public
exposure; local auth checks do not establish production readiness.

Google callback and inbox delivery remain unproven until their private setup and
authorized live tests occur. Public deployment, stronger production carrier
assurance, other carriers, account recovery, data-retention policy, backup/restore
and future Payload ownership are separate gates. No browser success flag, local
fixture, synthetic passkey or shared preview cookie proves active membership.
