# Canonical member authentication — local development

Last updated: 2026-11-06

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
- **Purchase eligibility (owner-confirmed 2026-11-06):** an email-and-phone-verified
  account may buy tickets; club membership approval is separate and is not a
  prerequisite. The current canonical `member` flag represents this verification
  boundary, not club approval or paid admission. A verified payment and an issued
  ticket must establish admission separately. This policy does not enable checkout
  or approve any catalogue, prices, provider calls, or deployment.
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

- `../../src/lib`, `../../src/lib`: authentication policy and access.
- `../../src/lib`, `payload-repository.ts`,
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

## PortOne checkout — current source scope (2026-11-06)

This source slice supersedes checkout-absence statements in the historical ticket
sections below, not their validation records. It is **not live-ready** and does
not authorize provider calls, database writes, payments, migrations or deployment.
The owner-confirmed verified-account purchase policy above remains unchanged.

- APIs: `POST /api/payments/portone/prepare`, `POST
  /api/payments/portone/complete`, `POST /api/payments/portone/webhook`; redirect/result
  UI: `/tickets/payment`. Browser/redirect success is not authoritative payment.
- Owners: `../../src/lib`,
  `../../src/components`, existing
  `../../src/lib`, plus the feature-private shared intent schema
  in `../../src/components`. No new generic framework.
  Migration `20261106_000000_payment_safety` is registered and was subsequently
  applied to the existing local database with separate owner approval; generated
  schema/types were updated through isolated offline Payload generation.
- Official SDK pins in `package.json`: `@portone/browser-sdk` **0.1.13** and
  `@portone/server-sdk` **0.19.0**. Signed webhooks and authenticated completion
  reconcile the same stored order against provider facts; neither issues a ticket.

Configuration names below come from `../../src/lib`; keep private
values in ignored local configuration, never docs or logs. They are not activation:

| Variable | Loader contract |
| --- | --- |
| `PORTONE_PAYMENT_MODE` | Unset/`disabled` is off; only `sandbox` is accepted |
| `PORTONE_ORIGIN` | Exact origin; HTTPS or HTTP loopback; must match canonical member runtime |
| `PORTONE_STORE_ID`, `PORTONE_CHANNEL_KEY` | Valid store/channel identifiers; not proof of TEST mode |
| `PORTONE_API_SECRET`, `PORTONE_WEBHOOK_SECRET` | Separate private API and webhook secrets |
| `PORTONE_TICKET_CATALOGUE_JSON` | Server-owned `orderName`, `unitAmount`, `currency` (`KRW`/`USD`), `maximumQuantity` (1–6), `saleStartsAt`, `saleEndsAt`; no default offer/price |

`reviewedTestChannel` remains `null`. Only explicit owner approval plus console
TEST-channel evidence can populate its exact store/channel pair; a sandbox env
label cannot. `commerceDisclosure` in `../../src/lib` supplies the
shared public seller/policy content; `publishedCommerceDisclosureSchema` gates
checkout readiness and prepare, not rendering of those public pages. Seller fields:
`name`, `registrationNumber`, `representative`, `address`, non-mobile business
`phone`, optional `mailOrderRegistrationNumber`; terms/privacy/refund each require
an effective `effectiveDate` and nonempty `sections` (`heading`, `paragraphs`).
Seller data now uses the owner-approved shared Hideaway business entity and supplied
public mobile contact. Policies remain `null`, and the mobile number does not pass
the current non-mobile publication gate. This is an implementation constraint,
not a verified selected-PG or legal requirement: no supporting selected-PG
requirement is cited here. Check the selected PG's actual requirement before
requesting another number or proposing a gate change. Structural validity is not
legal approval.
Completion/webhooks deliberately do not require published disclosures, so existing
orders remain recoverable if publication is disabled later, subject to runtime/config availability.

Prepare now accepts `{ quantity, attemptId }` (UUID). A global hashed attempt key
has a unique Orders index; canonical owner and charge-context fingerprint must
match on replay. Concurrent requests and lost create/bind responses recover the
same persisted payment ID with `recovered: true`, never a fresh SDK launch.
The browser persists intent before prepare and the reference before opening the
SDK. Known-reference recovery retains original quantity/amount/currency and is
independent of new-sale limits, while confirmation still enforces server auth.

Partial cancellation or unsafe dispute evidence now moves validated orders into
sticky `held`; signed dispute events trigger authoritative lookup. A fresh
post-provider order read prevents delayed PAID responses masking an existing hold.
Automatic notifications, including full cancellation, never clear an existing hold.
Only matching, strictly validated terminal intent records may be cleared in the UI.

Local unique-index/CAS behavior and hold races have passed against the approved
existing database, using synthetic provider facts. Explicit same-ID resume now
has bounded local source/UI acceptance; see the current receipt below. Still
pending: selected-provider resume acceptance; real phone/public auth; approved
commercial offer and adapted policies; PG review,
verification of the selected PG’s contact requirement, public TLS and independent provider/device
acceptance. Do not bypass canonical authentication or clear an unresolved intent
to make checkout appear ready. Hold release and admission/issuance are not built.

Available synthetic fixture commands, **not executed by this documentation update**:

```sh
rtk proxy node tests/support/composition-preview.mjs --checkout --check
rtk proxy node tests/support/composition-preview.mjs --checkout
```

The second serves actual checkout/result/policy components at
`http://127.0.0.1:3082/tickets` with synthetic data and no provider/database actions;
stop it after review. Compilation is not a full-project compiler pass, and this
fixture is not real phone, provider, physical-device or public-runtime acceptance.
See [the checkout backend map](../CODEMAPS/backend.md#portone-checkout-slice--updated-2026-11-06).

<!-- AUTO-GENERATED: portone-handoff BEGIN -->
### PortOne handoff snapshot — 2026-11-06

Source of truth: `package.json`, `../../src/lib`,
`../../src/lib`, the three payment routes, and the existing Orders
collection. The initial documentation-only snapshot is superseded by the local
payment-safety batch described above. The source-only phase made no database or
provider calls. Its separately approved database acceptance loaded private local
configuration without printing credentials, applied only the payment migration,
and used synthetic provider facts; no external provider calls were made.

| Configuration | Required when | Format / boundary |
| --- | --- | --- |
| `PORTONE_PAYMENT_MODE` | Optional; disabled when absent | Only `disabled` or `sandbox`; live mode is not implemented |
| `PORTONE_ORIGIN` | Sandbox runtime enabled | Exact origin matching canonical member runtime; its current local-only configuration restricts practical use to `http://localhost:<port>` |
| `PORTONE_STORE_ID` | Sandbox runtime enabled | `store-` identifier validated by `config.ts`; not evidence of TEST mode |
| `PORTONE_CHANNEL_KEY` | Sandbox runtime enabled | Validated channel identifier; must match the separately reviewed TEST pair |
| `PORTONE_API_SECRET` | Sandbox runtime enabled | Private API credential; never commit, paste into documentation, or expose to the browser |
| `PORTONE_WEBHOOK_SECRET` | Sandbox runtime enabled | Separate private signature secret; loader accepts base64 material with optional `whsec_` prefix and requires at least 32 decoded bytes |
| `PORTONE_TICKET_CATALOGUE_JSON` | Preparing a new payment | JSON with `orderName`, positive integer `unitAmount`, `currency` (`KRW`/`USD`), `maximumQuantity` (1–6), and ordered ISO `saleStartsAt`/`saleEndsAt`; currency-specific minor units |

These variables are currently absent from `.env.template`; the loader, not that
template, defines this opt-in contract. Configuration alone cannot enable prepare:
`reviewedTestChannel` is still `null`, and seller/policy publication is incomplete.
No credentials, default offer, or fabricated policy should be added to bypass them.

**Recorded previous implementation-session evidence:** 92 scoped tests passed;
loaded-source coverage was 94.40% lines / 87.19% branches / 91.87% functions;
the runtime module itself had 51.61% line coverage. Scoped lint and whitespace
checks passed. Full-project TypeScript reported 419 diagnostics outside the
changed checkout/disclosure scope. Desktop, phone, and short-height synthetic
actual-component previews were inspected, including interrupted-payment keyboard
focus and retained quantity/amount. These are historical session-reported results,
not checks rerun by this documentation update. Their `/tmp` receipts are no longer
available in the resumed environment; regenerate bounded receipts before relying
on them for release. Provider/Payload adapter execution, real phone, public auth,
physical-device payments, ticket issuance and production remain unaccepted.

**Current payment-safety acceptance (2026-11-06):** supersedes the historical
source-only receipts above. The bounded provider-free regression passed 127 tests;
loaded-source coverage was 96.38% lines / 90.28% branches / 93.65% functions
(runtime module 51.61% lines; this aggregate does not establish provider behavior).
Scoped ESLint passed. Canonical TypeScript still reports 419 unrelated diagnostics,
with none in the changed payment/schema/test scope. RED/GREEN regressions cover
retry races, lost create/bind responses, cross-account conflicts, storage failures,
strict intent cleanup, stale PAID/held races, and changed catalogue recovery.

After separate owner approval, only `20261106_000000_payment_safety` was applied
through Payload's migration API after verifying the prior ledger. The dedicated
real-adapter suite passed seven subtests plus its parent test (8 total), using
synthetic provider facts and blocking all non-database network transports. Real
PostgreSQL proved the unique index, concurrent retry convergence, committed-create
loss recovery, ownership/payload conflicts, guarded CAS and sticky holds. Fixture
cleanup was checked: the original 6 users and 0 orders remained, with 0 fixture
users afterward. This is local database acceptance, not PortOne/PG acceptance.
Migration rollback refusal was source-reviewed, not executed against the database.

Explicit replay of the **database-mutating** suite requires a verified local
target and its dedicated approval/gate; ordinary discovery and generic
`--database` do not include it (discovery regression: 8 tests passed):

```sh
rtk proxy env PORTONE_PAYLOAD_DATABASE_TESTS=1 DISABLE_PAYLOAD_HMR=true TSX_TSCONFIG_PATH=tsconfig.json node --import tsx --import ./tests/support/css-modules.mjs --test --test-concurrency=1 tests/payload/portone-payment-safety.test.ts
```

Use explicit process-tree RSS/time limits around heavy checks. The local run used
a 2 GiB RSS / 120-second watchdog; the highest final compiler peak was 1793 MiB,
the covered regression 570 MiB, and actual adapter acceptance 379 MiB. The stricter
15 GiB aggregate task cap and at least 10 GB physical headroom remain in force.

The owner separately approved restricting the existing PostgreSQL container to
`127.0.0.1:4141`. The exact image, environment/credentials and existing database
volume were preserved. `postgres` is running; the original stopped configuration
is retained as `postgres-before-loopback-<timestamp>`. Both reference the **same
volume**, not independent data snapshots: never start both, and do not mistake
the old container for a database backup or a schema rollback. No other containers
were started. Ephemeral operation receipts are under `/tmp/sphmrs-payment-*` and
`/tmp/sphmrs-postgres-loopback-*`; they are not durable release artifacts.

Live synthetic review inspected desktop 1024×768, phone 390×844 and short-height
390×568. Retained quantity/amount survived reload, focus returned to status
recovery after interruption, and held results did not claim payment/admission.
Two independent harsh visual reviews passed the displayed desktop state; root
inspected the phone states. Fixture font/network CSP remains intentionally strict.
Agent-owned preview/Incognito windows were closed after review; no main app server
or provider runtime was started. No deployment, commit or push was performed.
<!-- AUTO-GENERATED: portone-handoff END -->

### PortOne next steps — short execution plan

#### Active local build/session batch — 2026-11-08

Status: review checkpoint for the bounded corrections; the full build and global
typecheck remain blocked. No dependency upgrades, database/provider operations or
public authentication/payment activation in this batch.

| Step | Progress / evidence |
| --- | --- |
| Establish current compiler baseline | Completed: 419 diagnostics; peak 1904.4 MiB / 12.5 s, no resource cutoff. Receipt: `/tmp/sphmrs-typecheck-baseline-20261108.log`. This is a failed baseline, not a green build. |
| Trace actual account/session ownership | Completed source trace: account and ticket flows already use the canonical member client. The shell's anonymous legacy context feeds a Hideaway registration trigger; replacing it with a real session would awaken incompatible onboarding behavior. |
| Separate legacy registration activation | Completed locally: detached the legacy trigger and unnecessary wrapper, preserved interface tours and canonical account/ticket ownership. Replaced effect-driven client mounting with React hydration snapshots. Boundary tests failed before implementation and passed afterward. |
| Correct demonstrated active compiler blockers | Completed bounded fixes: disambiguated auth component/constant modules, corrected the numeric Motion generic and undefined React references, added truthful Howler/GLSL declarations, and regenerated Payload types from the existing configuration without initializing the database. No exclusions, fake profile fields, diagnostic suppression or dependency changes. |
| Focused acceptance | Final regression **197/197**, no skips; 459.9 MiB / 13.9 s. Scoped ESLint passed fourteen selected files, including the tour module with ignores disabled. Final explicit test-type annotation was followed by another 5/5 boundary run and the compiler check below. |
| Global compiler and full build | Still failed: **419 → 326** diagnostics; final check has zero diagnostics in the owned files, 1953.8 MiB / 12.0 s. Isolated Next webpack build failed on missing font paths in the concurrently edited `../../src/app`; 2544.4 MiB / 16.8 s. That other session's route work was preserved. Neither check is globally green. |
| Live browser / review | Actual isolated account route returned 200. Desktop chooser → login → explicit unavailable state → Cancel → chooser was inspected with member/payment services disabled. Touch emulation verified 390 × 844, coarse pointer, scroll width 390 and a fitting sheet. Two independent Astra Santa reviews passed the bounded source/visual rubric; TypeScript specialist certification remains withheld because the global baseline is red. This is not successful sign-in, gesture, provider or PG acceptance. |

Final receipts: `/tmp/sphmrs-active-auth-final-regression-20261108.log`,
`/tmp/sphmrs-active-auth-final-typecheck-20261108.log`,
`/tmp/sphmrs-content-typegen-20261108.log`, `/tmp/sphmrs-build-20261108.log`.
Live captures: `/tmp/sphmrs-shell-account-final-20261108.jpg`,
`/tmp/sphmrs-shell-login-final-20261108.jpg`,
`/tmp/sphmrs-shell-mobile-final-20261108.jpg`.

The build used an isolated source copy, no environment files and synthetic
compile-only settings. The final preview likewise used no environment files and
kept member/payment runtimes disabled. The initial low-heap preview restarted
under Next's memory protection and was stopped; the final bounded preview was
stopped after inspection (peak 4213.5 MiB / 171.9 s), with browser emulation reset
and its review tab closed. No agent-owned server or bundler remains. No commit,
push or deployment was performed in this correction batch.

Priority review points: keep staff and canonical customer authentication intact;
do not activate Hideaway onboarding for Sophomores accounts; preserve existing
dirty work; do not relax localhost, provider, seller/policy or checkout gates to
make a demonstration appear functional. Public runtime activation remains a
separate security-sensitive scope.

**Local checkpoint verification — 2026-11-08:** the explicitly staged payment
recovery, test-harness and merchant-draft files were exported with their committed
source dependencies into an isolated source snapshot. Existing installed packages
were linked; package/lockfile changes and unrelated site/auth work were excluded.
Nine provider-free payment/browser/selection suites passed **136/136**, with no
skips, peak 486.6 MiB and 9.0 s elapsed. Scoped ESLint passed all eleven selected
code/test files. Receipt: `/tmp/sphmrs-checkpoint-tests-20261108.log`.
The test command uses `--import tsx --import ./tests/support/css-modules.mjs`,
`--test-concurrency=1`, and `TSX_TSCONFIG_PATH` pointing to the snapshot's
`tests/tsconfig.json`; resolve the snapshot path to its physical path on macOS.
The initial validation commands omitted the CSS hook and then encountered a
temporary-path alias mismatch; the corrected command above passed without
application changes. Static general-code, React and security reviewers accepted
the local scope. The specialized TypeScript review withheld certification because
of the recorded globally failing baseline; no new full typecheck or build was run.

The production-dependency audit of the unchanged staged package/lockfile reported
**3 high, 1 moderate, 1 low, 0 critical** advisories. High findings:
`happy-dom` GHSA-834v-8h66-3h79 and GHSA-c8p4-j97h-3vg8; `joi`
GHSA-4528-x5fx-h6hg. Security review found no newly introduced affected path in
this diff, but did not establish full application exploit reachability or waive
these existing findings. Receipt: `/tmp/sphmrs-checkpoint-audit-20261108.json`.
Dependency remediation requires a separately approved scope before release.
An attempted package-manager lint command stopped on a missing snapshot patch
before running lint; validation then used the installed ESLint executable directly.
No dependency upgrade, runtime service, provider/database call, publication,
deployment or push was performed. This checkpoint is not release/security-clean
acceptance and does not replace the earlier live-review scope below.

**Current checkpoint — 2026-11-06: local-only same-ID resume implemented; final dual Astra Santa review PASS.**
The user approved this implementation batch, not policy publication, the proposed
manual workflow/effective date or prior Hideaway refund schedule, provider
operations or activation. The user-specific personal-cancellation direction is
now supplied in the current policy draft. The
research-only receipt below is historical; the following receipt supersedes its
implementation proposal.

- `POST /api/payments/portone/resume` is a read-only eligibility check. Strict
  payment/attempt UUID input, authenticated owner, stored attempt hash and current
  catalogue fingerprint, unchanged amount/currency, open sale, publication and
  reviewed TEST-channel gates are required. It neither creates/updates orders nor
  clears or rotates the retained identity. Row and sale-time checks run again
  after provider I/O; this is not an atomic provider/server launch mutex.
- Only an exact typed HTTP 404 `PAYMENT_NOT_FOUND`, or identity/quote-verified
  `FAILED` with zero paid/cancelled amounts, permits an explicit same-ID CARD
  request. A 200 not-found sentinel, generic 404, malformed/unknown response or
  mismatch fails closed. READY/PENDING/paid/reversal states stay status-only.
  Official `FailedPayment` has no `disputes` field: absence is allowed only for
  this FAILED classifier; a supplied field must be an empty array. This does not
  weaken paid/reversal reconciliation or establish permanent absence of charge.
- Fresh and resume launches share a native Web Locks payment-ID key, using
  `ifAvailable` without a deferred launch. Unsupported locking fails closed.
  This is same-origin browser-context arbitration, not cross-device or server
  serialization and not proof that an external payment window has ended.
- Final provider-free regression: **142/142** in
  `/tmp/sphmrs-resume-anchor-regression.log`, peak 509.6 MiB / 11.6 s.
  Coverage (same final regression receipt): aggregate 92.53% lines / 89.67%
  branches / 89.17% functions; runtime-module line coverage remains **48.84%**.
  Scope lint is clean (`/tmp/sphmrs-resume-final-lint.log`, 247.5 MiB / 1.1 s).
  Final actual-source typecheck reports 419 unrelated diagnostics, zero in scope
  (`/tmp/sphmrs-resume-anchor-typecheck.log`, 1696.6 MiB / 13.7 s), not global
  typecheck success.
- Corrected actual-source synthetic live refresh at 1024×768 and 390×568 kept
  card heights stable (desktop 446→446→446 px; mobile 450→450→450 px), retained
  the same Resume node disabled while checking, and had no horizontal overflow.
  Evidence: `/tmp/sphmrs-resume-anchor-desktop.png` and
  `/tmp/sphmrs-resume-anchor-mobile.png`. Both round-1 reviewers failed only the
  unmounted-button layout shift; the fix has 39/39 deferred UI tests. Fresh
  independent Astra round-2 reviewers both passed all six static/visual criteria
  with no blockers. This is bounded local acceptance, not global TypeScript,
  full-site, provider, physical-device or deployment acceptance. The specialized
  TypeScript reviewer could not certify the globally failing baseline; that
  boundary is not superseded by the independent bounded Santa passes.
- The synthetic preview stopped normally (PID 75240), its isolated browser page
  closed, and no agent-owned test/preview processes remain. Preview peak was
  684.6 MiB / 151.2 s. No provider was called.
- A failing DOM object-equality diagnostic peaked at 4685.8 MiB and was stopped
  by the watchdog; boolean identity assertions avoid that giant dump. Targeted
  RED/GREEN peaked at 262.9/242.2 MiB. No agent-owned process from that run remains.

**Policy follow-through — 2026-11-06:** the unpublished
[policy draft](../reference/commerce-policy-drafts.md#data-inventory-resolved-from-source)
now records actual data mapping/write paths and cleanup boundaries, reviewed by
Astra for source provenance. Code-verifiable fields no longer require owner
rediscovery; operational/legal/provider facts and publication remain unapproved.
The owner rejected fillable ticket-offer records and supplied the offer directly.
The [same policy draft](../reference/commerce-policy-drafts.md#current-offer-direction--user-supplied-unpublished)
now holds the current commercial direction and Korean/English ticket-copy drafts;
no additional form is required. It supersedes the earlier Hideaway tiered-refund
proposal for buyer cancellations, not historical source evidence.

**Merchant draft progress — executing, 2026-11-06:**
- **Completed:** recorded December 18 two-part schedule, KRW 88,000 advance /
  KRW 100,000 onsite inclusions, advance registration song requests, November 13
  sales opening and user-specific full-refund cutoff direction; retained source
  privacy inventory and separate statutory/organizer-change review.
- **Current review:** copy remains unpublished. Working year/timezone are
  2026 / Asia/Seoul. The accepted calendar cutoff is December 3 at 23:59 inclusive,
  then no buyer-convenience refunds from December 4. Only year/timezone and
  receipt-timestamp handling remain pending for that cutoff before runtime
  configuration; do not infer transport mode or guarantee songs.
- **Remaining:** opening hour/online close, registration eligibility/mechanism,
  location and admission/delivery details; support/privacy operations and complete
  legal policies. Organizer-cancellation full refund remains an unapproved proposal.
- **Catalogue boundary:** `../../src/lib` requires
  `orderName`, `unitAmount`, `currency`, `maximumQuantity`, `saleStartsAt` and
  `saleEndsAt`. Advance amount/currency are 88000/KRW; order name, approved
  purchase maximum and exact timestamp boundaries remain unresolved. The
  schema’s 1–6 quantity range is not an approved purchase policy.
- **Fragile final pass:** preserve statutory/material-change exceptions; no
  retroactive repricing of paid orders; no unconfirmed timestamp or provider claim.
  Policies stay null and checkout disabled. Selected PG/TEST-channel inspection,
  provider operations, policy publication and deployment retain separate approval.

No console, credentials, provider API, database or runtime was accessed in this
documentation-only update. Historical receipts below are not current offer terms.

**Historical research/draft receipt (before implementation approval):**

**Follow-through drafts (2026-11-06, after local commit `a1dfb22`; dual Astra review PASS):**
- [Same-ID checkout resume assessment](../reference/portone-uncharged-recovery.md):
  official V2 evidence supports repeated attempts under one payment ID with only
  one success. This is a proposed explicit resume contract, not a runtime change
  or evidence that provider-not-found proves no charge. Selected-PG acceptance,
  concurrency behavior and changed-offer policy remain unresolved.
- [Unpublished policy adaptation](../reference/commerce-policy-drafts.md):
  proposed Korean sections, exact Hideaway source provenance and owner decisions.
  The date, manual support workflow and refund schedule remain proposals; the
  public policy values remain null. These partial drafts are not publication-ready.

This batch only researched public documentation and local source and wrote draft
documentation. No tests, services, database operations, payment API calls,
credentials, publication, activation, deployment or push were performed.
Two independent Astra reviewers checked both documents against official PortOne
and local Hideaway/application sources; both passed all five criteria with no
blocking findings. This accepts the bounded research/draft deliverables only,
not implementation, policy publication, legal completeness or provider behavior.
Whitespace validation passed; no runtime tests were needed or rerun for that
documentation-only batch. The subsequently approved local-only implementation is
recorded above; selected-channel acceptance and offer/policy decisions remain
separate gates.

Last updated: 2026-11-06. **Review checkpoint: REVIEW COMPLETE for bounded local recovery correction.**
This documentation refresh did not rerun tests or change payment behavior. The
recorded acceptance above remains local/synthetic, not PortOne/PG acceptance.

**Fresh narrow source check (root session, 2026-11-06):** seven explicit
provider-free suites passed **71/71**, peak 270.1 MiB / 2.6 s; receipt
`/tmp/sphmrs-santa-payment-regression.log`. This does not rerun the full 127-test
batch or the database suite; no database/provider/runtime was started.

| Batch | Current state / bounded work | Acceptance / gate |
| --- | --- | --- |
| **1. Completed local payment safety** | Durable owner-context retry identity, concurrent/lost-response convergence, sticky reversal/dispute holds, payment migration and actual Payload adapter acceptance are completed. | Recorded 127 source tests and 8 actual database tests passed; migration applied under its separate approval. Do not schedule them as unimplemented or infer provider acceptance. |
| **2. Explicit same-ID resume — local implementation** | Approved read-only eligibility route and explicit same-ID browser launch are implemented; see the current receipt above. Retained identity survives ambiguous outcomes. | Final corrected UI and both independent Astra Santa reviews passed within local scope. Provider/selected-PG acceptance is separate; no fresh-ID restart, automatic reopening, hold release or claim that not-found proves no possible charge. |
| **3. Draft merchant policies in parallel** | Adapt the owner-approved same-entity Hideaway source; proposed effective date **2026-11-13**. Keep terms/privacy/refund publication values null until owner review. Use the directly supplied offer in the policy draft; resolve remaining boundaries and selected-PG feedback; verify its contact requirement before requesting another number or proposing a gate change. | Source provenance and Sophomores deltas remain explicit; manual refund handling and effective date await review. Placeholders and TEST offers do not satisfy the existing publication gates; the mobile contact fails the implementation’s non-mobile check, not a verified PG requirement. |
| **4. Separately gated sandbox acceptance** | After approved recovery, policies/offer, selected TEST store/channel, canonical public auth/phone and valid TLS/reviewer/webhook access, agree one bounded provider/device acceptance batch. | No blanket authorization: credentials, console/provider changes, calls, externally exposed URLs and cancellation/refund initiation each retain specific approval. Local migration/adapter work is already accepted; any further database action requires a new explicit scope. |
| **5. Future issuance and production** | Specify ticket issuance/retrieval, redemption and reversal invalidation after authoritative payment plus hold checks; production/live-mode work is a separate phase. | No admission from payment verification alone; no sale/issuance activation until the complete journey is accepted. Dependency/readiness assessment, deployment and real-money acceptance require separate confirmation. |

**Recovery correction receipt — 2026-11-06:** the retained-attempt button and
fresh-sale warning suppression are fixed within the inspected local scope.
Initial RED evidence captured four button failures and one display failure; Sol's
final focused run passed **71/71** (`/tmp/sphmrs-retained-display-final.log`,
458 MiB / 6.8 s). Fresh scoped ESLint passed all five changed TS/TSX files
without warnings/errors (`/tmp/sphmrs-santa-recovery-lint.log`, 319 MiB / 2.1 s).
No full typecheck rerun is claimed; the prior 419-diagnostic baseline was not
rerun this turn. Only five code/test files changed in this correction:
`../../src/components`,
`tests/tickets/{portone-browser,ticket-selection-dom}.test.tsx`, and
`tests/fixtures/checkout-preview.tsx`.

Root inspected the actual synthetic fixture at desktop 1024×768 and touch
390×568 (DevTools emulation; innerWidth 390 verified). With a closed sale and
unchanged catalogue, the retained attempt showed enabled Recover checkout,
quantity 2 and Total pending confirmation, without invalid-field/sale messages.
Recovery reused the same synthetic reference, displayed ₩24,690 and kept focus
on Check payment status; no SDK/payment launched. Root's harsh visual review
passed **only these synthetic states**. This is not physical-device, provider or
full-site acceptance; no real database/provider calls occurred this round.
**At this earlier receipt: fresh dual independent Astra Santa review was IN PROGRESS.**

**Round 3 correction receipt — 2026-11-06:** round 2 was blocked by retained
known-reference recovery when an expired/anonymous session met quantity 2 above
new maximum 1, and when the current catalogue was absent. Sol corrected the
account handoff gates, catalogue-independent status control and no-offer copy.
RED evidence: `/tmp/sphmrs-retained-auth-red.log`,
`/tmp/sphmrs-retained-nooffer-red.log`, and
`/tmp/sphmrs-retained-nooffer-copy-red.log`. Final focused tests passed **74/74**
(`/tmp/sphmrs-retained-nooffer-copy-green.log`, 489.1 MiB / 6.8 s);
five-file ESLint passed without warnings/errors
(`/tmp/sphmrs-santa-recovery-final-lint.log`, 434.4 MiB / 2.1 s).
The same five code/test files above remain the correction scope; no styling or
backend changes. Supplemental general code review approved the mechanics;
root reviewed final copy. No full TypeScript rerun or provider acceptance claimed.

Root rebuilt and inspected the actual synthetic touch fixture at 390×568:
expired-session retained quantity 2/current maximum 1 enabled Continue with
account, opened the actual Vaul chooser, and closing preserved the exact stored
intent; no authentication/provider request was sent. With no catalogue, recovery
retained quantity 2 and ₩24,690, showed neutral Previous checkout / Checkout
recovery / Payment status only copy, and made no fake-offer/range/no-payment
assertion. Enabled Check payment status navigated to the same-reference synthetic
result. Screenshots: `/tmp/sphmrs-santa-expired-auth.png` and
`/tmp/sphmrs-santa-no-offer-final.png`. Root harsh visual PASS covers only these
synthetic states; the earlier desktop 1024×768 inspection is separate. The prior
owned preview (PID 31582) was stopped after bounded use, peak 687.6 MiB / 291 s.
No real database/provider calls occurred. **At this earlier receipt: fresh dual independent Astra Santa
round 3 was IN PROGRESS**; round 2 was not a pass. Provider-not-found safe restart,
unknown-reference changed-catalogue conflicts and external gates remain open.

**Final verdict receipt — 2026-11-06: REVIEW COMPLETE for the bounded local
recovery correction.** Independent `gpt-6-astra` reviewers `santa_round3_a`
(TypeScript) and `santa_round3_b` (React) both passed all seven identical rubric
criteria, with zero critical issues or suggestions, and independently inspected
the saved touch screenshots. Supplemental general Astra code review: APPROVE.
Earlier blocked/not-pass rounds remain historical; this verdict covers bounded
local source/UI only, not full TypeScript, provider, full-site, physical-device
or production acceptance. Final owned preview PID 54515 was stopped, isolated
browser page 2 closed, and no port 3082 server remains. Preview peak was
588.1 MiB / 139 s, without watchdog cutoff. Existing PostgreSQL was left unchanged
this turn; no commit, push, provider or database calls. Next bounded steps and all
safe-restart, policy, provider, activation and deployment gates remain unchanged.

**Retained boundary:** unknown-reference recovery (attempt ID without payment ID)
supports sale closure with an unchanged catalogue, but still intentionally rejects
changed price/currency/fingerprint or quantity above the new limit
(`../../src/lib`, `../../src/lib`).
Known-reference status recovery is independent of the new catalogue. Mocks do not
establish changed-catalogue end-to-end success. Provider-not-found safe restart
remains unresolved; never automatically clear an unresolved intent or rotate its
key to create another charge.

**Fragile final pass (priority order):** unresolved intents must not create a new
charge; holds must survive stale paid evidence; merchant drafts must not become
published policy; synthetic/local results must not be presented as provider or
production acceptance. Preserve Vaul, caller/account context and the distinction
between verified purchase eligibility, club approval and paid admission.

<!-- AUTO-GENERATED: portone-merchant-inputs BEGIN -->
#### Merchant inputs — approved reuse and remaining deltas (2026-11-06)

The owner approved reusing the public seller/policy material in
`~/WebstormProjects/thehideaway`, confirming the registered business entity is
the same. Use it as the adaptation baseline rather than asking for all documents
again. `../../src/lib` now contains that approved seller identity
and the owner's approved public mobile contact; all policies remain `null`.
The mobile number does not satisfy the existing non-mobile publication gate;
that implementation check does not establish the selected PG’s actual requirement.
This source mapping is not a claim that every operational promise already fits Sophomores.

| Input group | Reusable source / remaining decision |
| --- | --- |
| Seller | `src/constants/business.ts:58,77–87` identifies 리스토어드프로젝트 / Restored Projects, registration `753-32-01007`, representative 최성윤 / Sungyoon Choi, and the full Olympic-ro 4-gil 15, Bldg 7 Unit 705 registered address. Public footer locale values at `messages/{ko,en}.json:717–720` use the shorter street address. The actual seller data preserves the full registered-entity facts, not the Sophomores brand as legal name. The owner supplied `+82 10 4637 9289` for public contact; it is rendered but fails the unchanged implementation’s non-mobile publication check. This is not evidence of a selected-PG requirement; verify that requirement before requesting another number or proposing a gate change. Mail-order registration is commented out in the source (`business.ts:59`), so its applicability/value remains unconfirmed. |
| Policies | Adapt the root `/terms`, `/privacy`, and `/refund` policy sources identified below. The planned effective date is **2026-11-13**, one week after the owner's instruction; it is not yet effective and the proposed implementation still requires review before publication. All public policy content stays `null`. The source's April 15 “last updated” date is provenance, not the Sophomores effective date. Proposed manual refund contact/handling still needs confirmation; structural validation is not legal approval. Existing shared-entity public contact emails may remain unless the owner changes them; a staff-login address is not automatically the legal/refund contact. |
| Ticket offer | Earlier all-inputs-pending wording is superseded for this event by the [directly supplied offer](../reference/commerce-policy-drafts.md#current-offer-direction--user-supplied-unpublished). Schedule, prices, benefits and personal-cancellation calendar cutoff are supplied. Remaining: order name, approved quantity limit, year/timezone and exact sale hours, receipt-timestamp handling, location and delivery/admission details, and registration eligibility/mechanism. Catalogue fields remain `orderName`, `unitAmount`, `currency`, `maximumQuantity`, `saleStartsAt` and `saleEndsAt`; the schema’s 1–6 range is not an approved purchase limit. |
| PG and review access | Confirm selected PG, existing application/review feedback, intended review URL and requested reviewer access. The Hideaway public source names PortOne/Toss, but `src/lib/lost-commerce/portone.ts:73–90,218–223` loads channel settings at runtime; it does not prove the actual selected PG or a console-reviewed TEST store/channel. |

**Policy adaptation deltas** (policy paths below are relative to
`src/app/(frontend)/(site)/(pages)/` in the approved Hideaway checkout):

- `refund/page.tsx:139–163` supplies the existing
  event baseline: 100% at least 10 days before; 90% at 7–<10 days; 70% at 3–<7;
  50% at 1–<3; none on/after the event day; full refund for organizer cancellation.
  This is historical source provenance: its tiered buyer-refund baseline is
  superseded for this event by the [current user-specific direction](../reference/commerce-policy-drafts.md#current-offer-direction--user-supplied-unpublished).
  Organizer-cancellation full refund remains an unapproved proposal, separate
  from statutory rights and material-change handling.
- `privacy/privacy.ko.tsx:53–63,149–174` lists passwords, Naver/Kakao and
  Brevo. A brand-name substitution alone would misdescribe the current
  passwordless/phone flow and its processors; adapt to the actual enabled
  authentication, mail and phone services before publishing.
- `terms/terms.ko.tsx:157–159` promises account deletion in settings;
  `refund/page.tsx:173–177` promises a payment-history refund interface and
  processing within three business days. Sophomores has no such customer refund
  interface yet. Confirm a workable manual contact/process and capacity for the
  stated deadline; do not imply the payment reconciliation endpoints initiate refunds.

Do not include API/webhook secrets or reviewer passwords in chat or this document;
credential entry and third-party configuration stay separate, private steps.
<!-- AUTO-GENERATED: portone-merchant-inputs END -->

Official references: [merchant requirements](https://help.portone.io/content/requirements),
[PG contract/review process](https://help.portone.io/category/procedure/pg-application/contract),
[V2 integration](https://developers.portone.io/opi/ko/integration/start/v2/readme),
and [signed webhooks](https://developers.portone.io/opi/ko/integration/webhook/readme-v2).
Current developer guidance was checked through Context7 during this docs pass;
installed SDK types remain authoritative for the pinned versions. No PG approval
or current public-host acceptance is inferred from these references.

## Ticket quotes: not checkout

`../../src/lib` is a local/test quote service with an injected server-owned
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
`../../src/components`. A test quote is advisory only; checkout
stays natively disabled in every state.

`../../src/lib` validates the localStorage handoff record. It
contains only schema version, selected ticket IDs/quantities, save/expiry times,
and an explicit ticket-return intent. Its 24-hour retention is a UI continuity
limit, not a sale window, quote lifetime or reservation. No price, quote, user
identity, email, session token or entitlement is persisted. Malformed, expired or
inaccessible storage cannot establish a saved selection or membership.

The ticket account CTA opens the controlled `MemberAccountDialog` from
`../../src/components` over the retained ticket
page. It does not change the URL/history or replace the ticket tree. Cancel
reverses a focused flow to its chooser; dismissing the chooser reveals the caller.
**Done** also closes locally. Every final close rechecks authoritative server
membership; closing a dialog or reading a draft never grants eligibility. Focus
returns to the actual opener, or the existing selection heading if the opener
was removed or disabled by the status refresh. Blocked storage offers the same
local dialog without discarding the in-memory selection.

`../../src/components` remains the standalone account and
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

Generated **2026-11-02** from `.env.template`, `../../src/lib`,
`../../src/lib`,
`../../src/lib`, the recovery contracts/runtime, and
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
| `/api/auth/[...all]` | `GET`, `POST` | `../../src/app` delegates to Payload Better Auth, the only active auth issuer; unavailable initialization returns `503` |
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

`../../src/lib` exports the browser-safe strict request,
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

`createLocalTicketQuote(input, context)` in `../../src/lib` is an exported
local/test service, **not a public API endpoint**. It requires an injected
server-owned catalogue and eligible principal, fails closed in production, and
returns advisory quotes with `reservation: "none"` and
`checkoutAvailable: false`. No hold, order, payment or ticket issuance is added.
<!-- AUTO-GENERATED: canonical-runtime-reference END -->
