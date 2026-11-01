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
