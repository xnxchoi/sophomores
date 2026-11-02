# Canonical member authentication — local development

Last updated: 2026-11-02

## Scope and temporary database policy

Use the **existing local development database**, currently `sopho` on
`localhost:4141`, and create real Payload migrations. A separate test database is
not required for this phase. The owner has confirmed that this database has no
important pre-existing data. If a migration fails because of local schema drift,
**reset/fresh migration is the preferred temporary fallback**, rather than adding
data-preservation workarounds.

This policy ends before deployment. It does not authorize production resets,
provider calls, live OTP delivery, payments, or deployment. Replace it with a
data-preserving migration and recovery policy before real data is introduced.

## Current architecture

- `/api/auth` is the only active authentication issuer: Payload Better Auth.
- `/api/member/status`, `/api/member/identify`, and
  `/api/phone-verification/bind` resolve the same canonical session.
- Member activation requires verified canonical email **and** an accepted
  canonical phone binding. Editable profile/status flags are not proof.
- Phone selection identifies an account; phone is not authentication or recovery.
- Exact `@sophomores.co` addresses auto-enroll for CMS access only after email
  ownership is verified. New enrollment receives `staff`, not super-admin;
  existing legitimate higher roles are preserved. CMS enrollment and customer
  membership/ticket entitlement are separate.
- Canonical bindings use Payload UUID user IDs in `canonical_member`. Old
  `member_auth` pilot identities are not automatically merged, copied, or promoted
  by matching email.

Binding rechecks and locks the canonical user/session and phone proof, records
ownership, and consumes the proof in one database transaction. Payload users and
phone proofs therefore must use the same explicitly configured local database.

Key implementation owners:

- `lib/auth/options.ts`, `lib/auth/access.ts`: authentication policy and access.
- `lib/member-auth/payload-runtime.ts`, `payload-repository.ts`,
  `payload-policy.ts`: canonical member session, binding, and identity constraints.
- `migrations/`: Payload migration history, including verifier and canonical
  binding namespaces.

## Private local configuration

Keep actual values in ignored `.env.local`; never commit or paste secrets.
`PAYLOAD_SECRET` and `DATABASE_URI` are required: Payload no longer supplies fixed
development secret/database fallbacks. Configure `BETTER_AUTH_SECRET` separately
as well. Generate each private secret independently with:

```sh
rtk proxy openssl rand -hex 32
```

For canonical local enrollment, configure these names:

| Variable | Local requirement |
| --- | --- |
| `DATABASE_URI` | Existing loopback PostgreSQL database URI |
| `PAYLOAD_SECRET`, `BETTER_AUTH_SECRET` | Private random secrets, at least 32 characters |
| `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` | Same local app origin, normally `http://localhost:3000` |
| `MEMBER_AUTH_MODE` | `local` to enable canonical enrollment; otherwise disabled |
| `MEMBER_AUTH_ORIGIN` | Same `http://localhost:<port>` origin |
| `MEMBER_AUTH_MAIL_MODE` | `disabled` for provider-free local work |
| `PHONE_VERIFICATION_MODE` | `local` |
| `PHONE_VERIFICATION_TRANSPORT` | `fixture` for provider-free work |
| `PHONE_VERIFICATION_ORIGIN` | Same member/app origin |
| `PHONE_VERIFICATION_DATABASE_URL` | Same connection URI as `DATABASE_URI` |
| `PHONE_VERIFICATION_STATE_SECRET` | Independent 64-character lowercase hex secret |
| `PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET` | Private fixture authentication secret, at least 32 characters |
| `PHONE_VERIFICATION_RECIPIENT` | Synthetic fixture address, e.g. `verify@example.invalid` |
| `PHONE_VERIFICATION_ZOHO_ACCOUNT_ID`, `PHONE_VERIFICATION_ZOHO_USER_ID`, `PHONE_VERIFICATION_ZOHO_INTEGRATION_ID` | Synthetic positive numeric fixture IDs |

The state secret must differ from the authentication secret. Canonical enrollment
fails closed for public origins, remote databases, or mismatched database/origin
settings. The old verifier's dedicated-name configuration remains compatible.

Disabled mail means the live app must not claim OTP delivery. Integration tests
inject an in-memory mailer; this does not activate a real provider or install a
production test bypass.

## Migrations and local reset

The project commands use a single global `tsx` loader and Payload's
`--disable-transpile` option to avoid the conflicting scoped CLI loader.

```sh
rtk pnpm micreate migration_name
rtk pnpm migrate
rtk pnpm generate:schema
```

Review generated SQL, including custom migration/index ownership, before running
it. Schema generation alone does not apply a migration.

If migration fails on this disposable **local** database, prefer reset and replay:

```sh
rtk pnpm migrate:fresh
```

If stale custom namespaces or migration metadata prevent that command from
restoring a clean database, reset the existing local `sopho` database itself and
replay the migration chain (this deletes all its data):

```sh
rtk proxy docker exec postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'DROP DATABASE sopho WITH (FORCE)' -c 'CREATE DATABASE sopho'
rtk pnpm migrate
```

These commands are for the existing local `postgres` container only, not a remote
or deployment target. Do not manufacture a new database merely to run this phase.

## Explicit verification commands

Ordinary discovery excludes the three CMS database/provider suites and runtime
acceptance:

```sh
rtk pnpm test
rtk proxy node tests/run-unit.mjs --list
rtk proxy node tests/run-unit.mjs --database --list
rtk pnpm typecheck
rtk pnpm lint
```

Legacy PostgreSQL suites still use their own opt-in environment variables. Do
not inherit unrelated test database URLs into a provider-free unit run.

Run canonical binding integration against the configured existing local database
without printing its URI or copying credentials into a shell command:

```sh
rtk proxy node -e 'require("@next/env").loadEnvConfig(process.cwd()); const r=require("node:child_process").spawnSync(process.execPath,["--import","tsx","--test","tests/member-auth/member-auth-payload-postgres.test.ts"],{stdio:"inherit",env:{...process.env,CANONICAL_MEMBER_TEST_DATABASE_URL:process.env.DATABASE_URI}}); process.exitCode=r.status??1'
```

Run the real Payload authorization integration with explicit opt-in:

```sh
rtk proxy env PAYLOAD_DATABASE_TESTS=1 node --import tsx --test tests/payload/authorization.integration.ts
```

Run canonical OTP/session integrity with explicit opt-in and in-memory delivery:

```sh
rtk proxy env PAYLOAD_DATABASE_TESTS=1 node --import tsx --test tests/payload/auth-integrity.test.ts
```

Run the broader database group with `rtk proxy node tests/run-unit.mjs --database`.
This loads the local environment, validates a loopback PostgreSQL target, and
explicitly enables the database suites. OTP acceptance injects an in-memory
mailer; reset permission is not consent to contact a real provider. Do not use
forced process exits to hide open pools.

Coverage, complete canonical OTP/session/account-flow acceptance, and browser
review are independent release gates; migration success alone does not establish
that they pass. Current work remains local-only.

The provider-free browser regression is `tests/browser/canonical-auth-smoke.spec.mjs`;
its invocation is documented at the top of that file. Use an existing Playwright
installation (and `CHROMIUM_EXECUTABLE` when using system Chrome). The script
does not install dependencies, mock status responses, or submit delivery actions.

### Validated local scope — 2026-11-01

- The existing local database was reset after schema drift; the complete migration
  chain then applied successfully. No additional database was required.
- Native persisted OTP verification, canonical session lookup, phone-proof
  consumption, idempotent binding, and active membership are exercised by
  `tests/payload/auth-integrity.test.ts` using memory delivery and synthetic proof.
- The same suite verifies actual verified-domain staff enrollment, the registered
  CMS strategy, least-privilege staff role, and loss of access after email
  verification is revoked. Staff status does not activate customer membership.
- Scoped new auth, staff UI, and quote coverage exceeds 80%. Independent live
  reviews checked desktop/mobile account and staff-login surfaces, disabled
  delivery states, and anonymous status without protected data.
- This does **not** establish real email/carrier delivery, physical-device passkey
  acceptance, Google-provider completion, interactive browser OTP completion, or
  production readiness. Those remain separate acceptance steps.

Stop the local dev server before running a production build; simultaneous builds
can invalidate Turbopack's live development graph. Restart the preview afterward.

## Ticket quotes: not checkout

`lib/tickets/quotes.ts` is a local/test quote service with an injected server-owned
catalogue. Commercial fixtures live only under `tests/`. It validates selected
IDs, version, quantities, eligibility, integer pricing, and expiry; the response
reserves nothing and reports `checkoutAvailable: false`.

There is no public quote API route, approved commercial catalogue, order creation,
payment handoff, inventory hold, or ticket issuance in this slice. Production
quoting fails closed. Provider, prices, fees/taxes, availability, admission,
refund/cancellation, and commercial terms remain separate decisions. See
[the integration contract](../reference/integration-specification.md).

### Ticket selection and account return — 2026-11-02

`/tickets` is the active, non-indexed selection preview. Its actual route supplies
neither an approved catalogue nor a quote adapter: prices remain unknown and
tickets are not on sale. The old `TicketStudy` component is still unrouted; this
work does not revive `/studies/tickets` or turn its demo bounds into booking rules.
The new UI and local test adapters are owned by
`components/tickets/ticket-selection.tsx`. A test quote is advisory only; checkout
stays natively disabled in every state.

`lib/tickets/selection-draft.ts` validates the localStorage handoff record. It
contains only schema version, selected ticket IDs/quantities, save/expiry times,
and an explicit ticket-return intent. Its 24-hour retention is a UI continuity
limit, not a sale window, quote lifetime or reservation. No price, quote, user
identity, email, session token or entitlement is persisted. Malformed, expired or
inaccessible storage cannot establish a saved selection or membership.

The ticket account CTA opens the controlled `MemberAccountDialog` from
`components/Authentication/member-auth/account-study.tsx` over the retained ticket
page. It does not change the URL/history or replace the ticket tree. Cancel
reverses a focused flow to its chooser; dismissing the chooser reveals the caller.
**Done** also closes locally. Every final close rechecks authoritative server
membership; closing a dialog or reading a draft never grants eligibility. Focus
returns to the actual opener, or the existing selection heading if the opener
was removed or disabled by the status refresh. Blocked storage offers the same
local dialog without discarding the in-memory selection.

`components/tickets/ticket-account-entry.tsx` remains the standalone account and
provider-return composition. Only a valid intent plus confirmed authoritative
membership exposes its fixed **Return to tickets** completion link. Choosers
have no ticket-return link and dismissal never performs synthetic navigation.
External Google/magic-link callbacks remain pinned to `/account/continue`; an
external redirect does not retain the original React tree. On that return, only
the validated selection is restored; server account status is checked again and
no prior quote is restored. No auth policy, provider configuration, database or
staff-access rule changes are required by this composition.

For isolated visual states, run from the repository root:

```sh
rtk proxy node --import tsx tests/support/ticket-selection-preview.mjs
```

Open [the loopback ticket fixture](http://127.0.0.1:3078/tickets). Its visible
controls select synthetic membership, quote failure/expiry and latency. The
actual React components use a test-only catalogue and the existing local quote
service; all APIs stay on the isolated loopback server, with no upstream proxy,
real mail, account session, cookie, hold, order or payment. This is not the actual
site's quote endpoint or an end-to-end provider acceptance result. Stop the
fixture after review. Real email/carrier delivery and production readiness remain
separate acceptance steps.

The visible **Synthetic phone proof** control also selects pending (default),
verified-after-status-check, expired or receiver-unavailable outcomes. Select
**Anonymous** and **Verified after status check**, then apply and reload **before**
opening the account dialog to exercise the full local presentation flow:

1. Keep a ticket selection, choose Sign up, and use the synthetic email
   `preview@example.invalid` and synthetic code `ABC123`. No email is sent.
2. Enter a synthetic Korean mobile number, for example `01012345678`, and create
   the phone challenge. **Do not open Messages or send SMS/MMS**; no carrier or
   mailbox transport exists. The synthetic status poll supplies the selected
   outcome using the real client response schemas.
3. With the verified outcome, finish registration, inspect **Account ready**, then
   choose **Done**. The retained ticket page rechecks the fixture server's member
   state; request a test quote there. Checkout remains disabled.

Binding requires synthetic authenticated email, the current challenge ID, the
same normalized phone, and a verified unexpired proof. It consumes that proof
once. Missing, pending, expired, cancelled, replaced or mismatched proofs cannot
grant membership. Applying fixture controls, signing out or authenticating again
clears prior proof authority. The verified-member control remains an explicit
presentation fixture, not evidence that authentication completed.

Pending keeps the phone waiting state; expired exposes retry; receiver-unavailable
returns an explicit synthetic receiver error and grants no verification. These
are test outcomes, not a bypass in any production route. Challenge IDs and expiry
are in-memory, per fixture process; no account, auth session or cookie is created.
The server rejects foreign hosts/origins, query flags, unsupported challenge/bind
methods and invalid/oversized bodies. Its CSP remains self-only for connections;
unknown APIs fail closed rather than proxying upstream.

The HTTP regression starts and cleans up its own loopback child server on a
random available port, leaving an existing visual fixture untouched:

```sh
rtk proxy node --import tsx --test tests/tickets/ticket-selection-preview-http.test.ts
```

This checks fixture contracts and failure boundaries, not live browser acceptance,
real OTP/carrier delivery, canonical database persistence or production readiness.

## Lost-email recovery: local intake and restricted staff review only

`POST /api/member/recovery` accepts exactly `{phone, contactEmail}` and returns
generic `202 {success:true,data:{status:'pending_staff_review'}}` only after durable
insertion. Both claims are explicitly **unverified**; the fixed reason is
`lost_email`. There is no user/account lookup, association, ownership assertion,
email change, phone binding, membership grant, session/cookie, or provider call.
Anonymous phone enrollment is never recovery proof. Canonical Better Auth email
changes and existing identity ACLs remain unchanged.

Intake requires `MEMBER_AUTH_MODE=local`, a configured HTTP loopback
`MEMBER_AUTH_ORIGIN` including its port, the existing private loopback
`DATABASE_URI`, and a canonical `BETTER_AUTH_SECRET` (or `PAYLOAD_SECRET`) of at
least 32 characters. Phone-verifier enablement/configuration is not required.
The guarded native `pg` pool uses the SAME canonical `DATABASE_URI`, never retired
`member_auth` storage. Installed Payload exposes `db.pool`, but the existing CMS
pool has no acquisition/query deadlines and native pg offers no per-acquire
override. The recovery-only pool (maximum two connections) instead uses native
2-second acquisition, 5-second statement, 1-second lock and 6-second query
deadlines without mutating global CMS behavior or adding a custom timeout wrapper.
Intake, review and cleanup also set transaction-local DB deadlines.
Requests require exact configured Origin/Host authority; forwarded
headers grant nothing. Cross-site, RSC, query selectors, unknown JSON fields,
oversized streams and stalled bodies fail closed. Responses are private/no-store,
noindex, nosniff and no-referrer, with generic errors and no PII/match result.

Apply the additive `20261102_000000_recovery_intake` migration deliberately before
using intake. It adds only recovery storage, limits, an immutable-claim / append-only
review guard, and the CMS locked-document relation. Never schema-push or rewrite
the prior canonical-auth migrations. A single transaction locks global capacity,
bounded expiry cleanup, HMAC-scoped global/phone/email hourly limits (100/3/3),
and insertion. Total queue capacity is 1000 requests; failed intake creates no
receipt. The queue is visible only to `isCmsSuperAdmin`: the `admins` collection,
trusted `staff-better-auth` strategy and `admin` role are all mandatory. Generic
staff/editor auto-enrollment is not review authority. Public Payload REST CRUD
is denied; even superadmins cannot create/update/delete through generic CRUD.

The native CMS queue offers only submitted / needs_proof / rejected / closed
metadata and a required internal note. Its authenticated same-origin
`POST /api/member/recovery/[id]/review` endpoint requires `expectedRevision`,
`status`, and `internalNote`. Server reviewer ID/time and append-only audit entries
are updated atomically using revision CAS; stale or expired requests return 409.
Review is capped at 100 revisions per request. Claims and expiry never change.
Review acquires the request row lock before sampling PostgreSQL wall time, so
expiry advances while waiting for a connection or another review. The same
database timestamp drives the expiry cutoff and recorded review/audit time.
“Needs proof” does **not** send a message. There is no approved/granted/recovered
state or identity-changing action; independent staff proof and any future recovery
grant are separate, unimplemented policy/work.

Retention target is 30 days from intake, including closed/rejected requests.
Successful intake deletes at most 50 expired requests and 100 expired limit rows
in its transaction. A quiet or saturated service does not prove automatic expiry
deletion. The explicit local operator command removes at most 100 expired
requests, including their embedded review notes/logs, per invocation:

```sh
rtk proxy node --import tsx scripts/recovery-cleanup.ts --confirm-local-retention-cleanup
```

This command mutates only local recovery retention data; repeat deliberately when
the batch is full. It is not a scheduled job. Production remains disabled and
requires an approved scheduler, access/privacy/retention review, real deployment
configuration and independent acceptance before any production intake or grant.

### Explicit recovery database checks

After applying the migration, run these sequentially against the configured
existing loopback database. The PostgreSQL suite opts in separately from ordinary
unit discovery; the Payload suite checks real Local API ACLs using explicit test
principals, not browser-authenticated staff sessions. Neither sends mail or
creates credentials. Both clean up their own synthetic records.

```sh
rtk proxy node -e 'require("@next/env").loadEnvConfig(process.cwd()); const r=require("node:child_process").spawnSync(process.execPath,["--max-old-space-size=768","--import","tsx","--test","--test-concurrency=1","tests/member-auth/recovery/postgres.test.ts"],{stdio:"inherit",env:{...process.env,RECOVERY_TEST_DATABASE_URL:process.env.DATABASE_URI}}); process.exitCode=r.status??1'
rtk proxy env PAYLOAD_DATABASE_TESTS=1 GOMAXPROCS=1 node --max-old-space-size=1024 --import tsx --test tests/member-auth/recovery/payload.integration.ts
```

The PostgreSQL suite covers durable generic receipt/no identity writes,
concurrent claim limits, review CAS, immutable claims/append-only audit,
expiry/cleanup, and expiry while waiting for a row lock. Its down/up check runs
the actual exported migration inside a transaction that is always rolled back;
it does not reset the database or leave the live migration unapplied. The Payload
suite permits only trusted superadmin reads and rejects anonymous/customer/
ordinary staff/forged-strategy access and generic writes, including superadmin
writes. Browser CMS usability and real staff-session acceptance remain separate.

### Isolated native CMS review preview

```sh
rtk proxy node --max-old-space-size=768 --import tsx tests/support/recovery-review-preview.mjs
```

Open [the synthetic review preview](http://127.0.0.1:3079/). It renders the actual
`RecoveryReview` with installed native Payload controls and vendor CSS. Only its
document context and HTTP responses are test doubles; no staff session, database,
mail, account change, or production auth bypass exists. Visible controls select
success, revision conflict, service failure, malformed receipt, and bounded delay.
Applying controls resets the in-memory revision. Stop it after reviewing.

The native selector has an explicit visible-label/input association. A saved
metadata receipt advances the revision and clears the note; conflicts and failed
receipts retain the note and never claim an account change. Regression commands:

```sh
rtk proxy node --max-old-space-size=768 --import tsx --test tests/member-auth/recovery/review-controls-dom.test.tsx
rtk proxy node --max-old-space-size=512 --import tsx --test tests/member-auth/recovery/review-preview-http.test.ts
```

Fixture browser acceptance is not authenticated CMS navigation acceptance. Real
staff sign-in still needs configured email delivery and an authorized session.

<!-- AUTO-GENERATED: canonical-runtime-reference BEGIN -->
## Source-backed environment and API reference

Generated **2026-11-02** from `.env.template`, `lib/payload/configuration.ts`,
`lib/member-auth/{payload-config,mail-config}.ts`,
`lib/phone-verification/server/config.ts`, the recovery contracts/runtime, and
the route modules below. These are source contracts, not proof of delivery or
production acceptance. Examples are placeholders; never copy private values
into documentation. `.env.template` is a local input, not a publishable secret
inventory or a complete canonical-auth configuration.

### Required and conditional configuration

| Variable | Required when | Format / valid values | Safe example or boundary |
| --- | --- | --- | --- |
| `DATABASE_URI` | Payload startup; enabled recovery/membership | PostgreSQL URL | `postgresql://postgres:REPLACE_LOCALLY@localhost:4141/sopho`; local auth rejects remote hosts and URL query/hash overrides |
| `PAYLOAD_SECRET` | Payload startup | String, at least 32 characters | Independently generated private value; no built-in fallback |
| `BETTER_AUTH_SECRET` | Recommended for canonical auth; optional in Payload schema | If set, at least 32 characters | Canonical local/recovery loaders fall back to `PAYLOAD_SECRET` only when unset |
| `MEMBER_AUTH_MODE` | Opt in to canonical membership or recovery | Unset / `disabled`, or `local` | Template defaults to `disabled`; no production recovery mode |
| `MEMBER_AUTH_ORIGIN` | `MEMBER_AUTH_MODE=local` | Exact HTTP origin with explicit non-default port | Membership requires `http://localhost:<port>` matching verifier origin (`3000` is an example); recovery independently accepts HTTP loopback hosts with a port |
| `NEXT_PUBLIC_SERVER_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` | Application/auth URL configuration | Application origin | Use the same `http://localhost:3000` origin for this workflow; `BETTER_AUTH_URL` is another auth URL fallback |
| `MEMBER_AUTH_MAIL_MODE` | Optional outbound sign-in mail | Unset / `disabled`, or `smtp` | Template defaults to `disabled`; disabled mail must not claim OTP/link delivery |
| `MEMBER_AUTH_SMTP_HOST` | Mail mode `smtp` | Exactly `smtp.zeptomail.com` | Other providers/hosts are not accepted by the current mail loader |
| `MEMBER_AUTH_SMTP_PORT` | Mail mode `smtp` | `465` or `587` | TLS is required; no certificate-validation bypass |
| `MEMBER_AUTH_SMTP_USERNAME` | Mail mode `smtp` | 1–254 allowed username characters; not a `REPLACE_` placeholder | Private agent-authorized SMTP username |
| `MEMBER_AUTH_SMTP_PASSWORD` | Mail mode `smtp` | 1–4096 non-whitespace printable ASCII characters; not a `REPLACE_` placeholder | Private SMTP password, not a mailbox OAuth token |
| `MEMBER_AUTH_SMTP_FROM` | Mail mode `smtp` | One valid ASCII mailbox, maximum 254 characters | An explicitly approved sender; no display name or address list |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google capability | Both configured | Optional fallback pair: `MEMBER_AUTH_GOOGLE_CLIENT_ID`, `MEMBER_AUTH_GOOGLE_CLIENT_SECRET`; provider setup/consent remains separate |
| `PHONE_VERIFICATION_MODE` | Canonical phone enrollment | Unset / `disabled`, or `local` | Canonical membership requires a configured local verifier; recovery intake does not |
| `PHONE_VERIFICATION_TRANSPORT` | Enabled verifier | `fixture` (default) or `zoho-poll` | Keep `fixture` for provider-free local checks |
| `PHONE_VERIFICATION_ORIGIN` | Enabled verifier | HTTP loopback origin without credentials/query/hash | Must match the membership origin for canonical enrollment |
| `PHONE_VERIFICATION_DATABASE_URL` | Enabled verifier | Loopback PostgreSQL URL without query/hash | Must equal `DATABASE_URI` for canonical enrollment; no second database required |
| `PHONE_VERIFICATION_STATE_SECRET` | Enabled verifier | Exactly 64 lowercase hexadecimal characters | Must differ from the canonical authentication secret |
| `PHONE_VERIFICATION_RECIPIENT` | Enabled verifier | Valid single mailbox | `verify@example.invalid` for fixtures; live receiving address requires separate approval |
| `PHONE_VERIFICATION_ZOHO_ACCOUNT_ID` | Enabled verifier | Positive decimal ID, at most 30 digits | `1` only as a synthetic fixture identifier |
| `PHONE_VERIFICATION_ZOHO_WEBHOOK_SECRET` | Transport `fixture` | 32–1024 non-whitespace characters | Private fixture authentication value |
| `PHONE_VERIFICATION_ZOHO_USER_ID`, `PHONE_VERIFICATION_ZOHO_INTEGRATION_ID` | Transport `fixture` | Positive decimal IDs, at most 30 digits | Synthetic values for the provider-free fixture |

The template's `POSTGRES_USER`, `POSTGRES_DB`, and `POSTGRES_PASSWORD` describe
PostgreSQL/container/operator inputs; the application connection comes from
`DATABASE_URI`. The dev script starts an existing container and does not consume
these names to provision it. `MAPBOX_API_KEY`, `COOKIE_DOMAIN`,
`NEXT_PUBLIC_IMAGE_MAX_FILE_SIZE`, `NEXT_PUBLIC_VIDEO_MAX_FILE_SIZE`, and `TZ`
remain template settings, not canonical-auth/recovery enablement or proof.
`BREVO_SMTP_USER` / `BREVO_SMTP_PASS` **do not configure the current member mail
loader**; use the conditional `MEMBER_AUTH_SMTP_*` contract above.

### Active routes and ownership

| Route | Methods | Source / meaning |
| --- | --- | --- |
| `/api/auth/[...all]` | `GET`, `POST` | `app/api/auth/[...all]/route.ts` delegates to Payload Better Auth, the only active auth issuer; unavailable initialization returns `503` |
| `/api/member/status` | `GET` | Canonical session, membership and capability projection; membership is verified email plus accepted phone binding, not a UI flag |
| `/api/member/identify` | `POST`, `DELETE` | Existing non-authenticating phone selector / clear operation; preserved backend, not ordinary login UI or recovery proof |
| `/api/phone-verification/challenges` | `POST` | Explicit challenge creation; does not send a handset message automatically |
| `/api/phone-verification/challenges/[id]` | `GET`, `DELETE` | Check server proof state / cancel the selected challenge |
| `/api/phone-verification/bind` | `POST` | Canonical authenticated phone binding using a matching accepted one-use proof |
| `/api/phone-verification/webhook` | `POST` | Guarded verifier ingestion; not an anonymous recovery-proof endpoint |
| `/api/member/recovery` | `POST` | Durable, unverified lost-email intake with generic receipt; no identity lookup, session, email change or outbound message |
| `/api/member/recovery/[id]/review` | `POST` | Trusted CMS superadmin metadata review; revision CAS and post-row-lock database expiry check |
| `/admin/login` | Page | Staff email-code/link sign-in; verified domain enrollment grants generic staff, not superadmin recovery-review authority |
| `/admin/collections/account-recovery-requests` | CMS view | Restricted queue; anonymous navigation returns to staff login |
| `/account`, `/account/continue` | Pages | Customer entry and provider return; direct navigation never establishes identity |
| `/tickets` | Page | Selection preview with contextual auth; checkout remains unavailable |

Authentication routes follow Better Auth's own response protocol. Recovery uses
the strict envelopes below; do not describe every API as sharing one envelope.

| Operation | Strict request | Successful response |
| --- | --- | --- |
| Public intake | `{phone, contactEmail}`; phone 1–32 permitted phone-format characters, normalized to a Korean 010 mobile; valid email at most 254 characters | `202 {success:true,data:{status:"pending_staff_review"}}` |
| Staff metadata review | `{expectedRevision, status, internalNote}`; integer revision 0–100, status `submitted` / `needs_proof` / `rejected` / `closed`, trimmed note 1–2000 characters | `200 {success:true,data:{revision}}`, revision 1–100 |

Unknown JSON fields are rejected. Recovery requests require exact configured
Origin/Host authority, no query/RSC selectors, JSON content, at most 4096 bytes,
and a bounded read deadline. Failure statuses include `400`, `403`, `408`, `409`,
`413`, `415`, `429`, and `503`; response messages are generic and contain no
match/identity/PII result. Rate-limit responses include `Retry-After: 3600`.
Recovery responses are private/no-store, nosniff, no-referrer and noindex.

### Export and storage contract

`lib/member-auth/recovery/contracts.ts` exports the browser-safe strict request,
receipt and review schemas. `RecoveryService` validates/normalizes unverified
claims; `PgRecoveryRepository` owns parameterized transactions, atomic limits,
revision CAS, immutable claims, and bounded cleanup. Neither is an account
recovery grant. `AccountRecoveryRequests` permits only trusted superadmin reads
and denies generic Payload create/update/delete, including for superadmins.

The migration `20261102_000000_recovery_intake` adds recovery request storage,
HMAC limits and an additive CMS lock relation; it changes no identity tables.
Claim immutability and append-only review audit are enforced in PostgreSQL.
The 30-day retention target still requires an operator cleanup/scheduler policy;
an idle service does not prove timely deletion.

`createLocalTicketQuote(input, context)` in `lib/tickets/quotes.ts` is an exported
local/test service, **not a public API endpoint**. It requires an injected
server-owned catalogue and eligible principal, fails closed in production, and
returns advisory quotes with `reservation: "none"` and
`checkoutAvailable: false`. No hold, order, payment or ticket issuance is added.
<!-- AUTO-GENERATED: canonical-runtime-reference END -->
