# Phone verification — local implementation checkpoint

## Scope

This module implements the **reverse-MMS transport**, not identity/age checks,
membership, account creation, or login. It follows the conceptual flow in the
[reference article](https://obtuse.kr/dev/free-phone-verification/), replacing
Gmail/IMAP and SQLite with Zoho Mail notifications and PostgreSQL. It deliberately
does not copy the article's substring sender parsing or domain-only trust.

Default mode is disabled; the existing disconnected screen study stays unchanged.
`PHONE_VERIFICATION_MODE=local` selects the separate trial. Runtime configuration
rejects public origins and non-loopback PostgreSQL URLs, and requires a database
named `sophomores_verification_*`. **Host/Origin checks are not a network firewall:**
the supplied preview launcher binds `127.0.0.1`; do not expose it through a tunnel,
reverse proxy, wildcard bind, or port forward.

No public callback exception, live Zoho enrollment, production migration, provider
credential, account grant, or production carrier approval is included. The production carrier
policy always returns **not approved**. Successful synthetic receipt reaches
`review`, not verified. Internal service tests exercise approval/proof consumption
through test-only calls. No HTTP field or environment flag alone can approve a
carrier; the separate opt-in local SKT pilot below additionally requires
cryptographically authenticated evidence for every message.

## Storage and future ownership

- Native `pg`, parameterized SQL, one checked-out client per transaction.
- `phone_verification` owns its migrations and challenge, delivery, and rate-limit
  tables. Migrations are explicit, schema-qualified and advisory-lock protected.
- Challenges use keyed phone/session/token digests; no raw phone, MMS body, mail
  headers, IP, OAuth token, or webhook secret is written to these tables.
- Anonymous verification cookies are separate from shared preview-login cookies.
  The intentionally local HTTP cookie is HttpOnly/SameSite=Strict. A future HTTPS
  rollout must use a Secure host-scoped cookie and re-review ingress/proxy trust.
- Five-minute expiry, session/phone/IP issue limits, replacement/cancellation,
  lossless provider IDs, unique delivery references, fenced work leases, bounded
  retry/dead-letter behavior, and atomic one-use proof consumption survive process
  restarts. Expiry advances while waiting on database connections/row locks.
- Original challenge expiry also bounds proof consumption. HTTP status responses
  strip reusable proof tokens; future registration needs a server-side consumer.
- Cleanup removes expired challenge/delivery metadata after 24 hours, caps each
  deletion batch at 1,000 rows/table, and removes expired rate buckets. Schedule
  repeated bounded cleanup before any live rollout. Expiry enforcement does not
  depend on cleanup running on time.

No auth/user tables are created. Better Auth supports a native PostgreSQL pool;
Payload supports PostgreSQL but does not automatically adopt these tables as CMS
collections. Future auth/CMS migrations must have separate ownership/permissions
and must not schema-push across verifier tables. Payload's schema-name option is
currently experimental; validate actual integration/migration behavior later.

## Local setup and launch

Use Node 24+ and the project's pnpm. Do not use any existing Hideaway database,
database volume, credentials, or production network.

1. Create an isolated **local** PostgreSQL 16 database with loopback-only binding
   and its own data volume. A task-owned instance/checkpoint has been prepared
   under ignored `.deployment/phone-verification-local/`; its mode-0600 `runtime.env`
   contains the local URLs and randomly generated local secrets. `state.json`
   identifies the exact owned container/volume. They are not team credentials and
   must never be committed, pasted into chat, or used for production.
2. For a fresh setup, copy `deployment/phone-verification.local.env.example` into
   an ignored private env file, replace every placeholder, and explicitly select
   local mode. Use random 32-byte secrets, not example strings. The test URL must
   identify the same disposable local database; integration tests reset only the
   verifier schema, so **never point them at a database with valuable verifier data**.
3. Run migrations, then launch the isolated preview:

   ```sh
   rtk proxy node --env-file=.deployment/phone-verification-local/runtime.env --import tsx scripts/phone-verification-local.ts migrate
   rtk proxy node --env-file=.deployment/phone-verification-local/runtime.env --import tsx scripts/phone-verification-preview.ts
   ```

   Open `http://127.0.0.1:3217/studies/verification` with the example origin.
   The launcher creates an ignored app/config snapshot with a separate `.next`
   directory; it does not stop or rebuild an existing development server.
   Changes to copied app routes require a new snapshot/restart. No `.env*` files
   from the primary checkout are copied. Ctrl-C stops the owned child process.

4. Use **only the synthetic number `01012345678`** during fixture acceptance. The
   configured local recipient is non-deliverable `verify@example.invalid`.
   Copy the token following `SPHMRS` from the displayed challenge, then run:

   ```sh
   rtk proxy node --env-file=.deployment/phone-verification-local/runtime.env --import tsx scripts/phone-verification-local.ts fixture --token LOCAL_TOKEN_FROM_SCREEN
   ```

   This sends a signed request to the loopback callback, not to Zoho or a carrier.
   A bounded one-shot worker parses a synthetic MMS, and the UI should become
   **Message needs review / Not verified**. It does not send email/MMS, fetch the
   concierge inbox, approve a carrier, or create an account. Retry/stale fixture
   processing exits unsuccessfully rather than claiming completion.

5. Cancel/close, confirm a fresh form on reopening, and run bounded cleanup:

   ```sh
   rtk proxy node --env-file=.deployment/phone-verification-local/runtime.env --import tsx scripts/phone-verification-local.ts cleanup
   ```

When finished, stop only the exact container identified by the local checkpoint.
Its dedicated volume can remain for restart. Remove only positively identified
task-owned resources when discarding the checkpoint; never prune Docker globally.

## Receive a real MMS in the local preview (opt-in)

This transport uses **Zoho Mail**, not CPaaS outbound mail or Brevo. A standalone
local receiver reads the alias with the Mail API; it does not require public
callback ingress, a tunnel, mailbox rules, or a deployed worker. The screen's
existing status polling remains unchanged. Without the separate opt-in SKT policy,
real matching MMS reaches `review`, never a registration grant. The pilot below
can produce a local `verified` result but still creates no account or registration.

### One-time operator setup

1. Sign into the **concierge mailbox owner's** Zoho account. Organization admin
   access alone may not grant mailbox API access. Confirm the mailbox plan permits
   Mail API access and note its regional Mail/Accounts hosts.
2. Obtain the concierge **Mail account ID**, not its ZUID, CPaaS agent ID, email
   address, or folder ID. Do not guess it. If it is not available from your
   existing integration, stop and ask for scoped account discovery: the official
   [account-list API](https://www.zoho.com/mail/help/api/get-all-users-accounts.html)
   needs a separate `ZohoMail.accounts.READ` grant, which this receiver does not
   request or silently add.
3. Create/use a **Self Client** in the regional [Zoho API Console](https://api-console.zoho.com/).
   Follow [Zoho's Self Client flow](https://www.zoho.com/accounts/protocol/oauth/self-client/authorization-code-flow.html).
   Generate a code with **only `ZohoMail.messages.READ`**. Do not select `.ALL`,
   write, admin, or extra scopes. Even this READ grant covers **all concierge
   messages**: the alias filter is application-level minimization, not narrower
   provider authorization. If the scope is omitted in Zoho's token response,
   correct provisioning relies on this operator step; it is not runtime-proven.
4. Generate the local private setup file (safe to do before generating the
   short-lived code):

   ```sh
   rtk proxy node --import tsx scripts/phone-verification-receive.ts prepare
   ```

   Edit `.deployment/phone-verification-local/zoho-receiver.env` locally. Fill in
   the matching regional origins, client ID, client secret and fresh authorization
   code. Keep mode `0600`; never paste these into chat, browser JS, command-line
   arguments, the runtime env file, or tracked examples. Plain unquoted `KEY=value`
   lines are supported; use no duplicate keys or extra variables. The `prepare`
   command refuses to overwrite an existing file.
5. Exchange the code before its expiry (Zoho defaults to three minutes):

   ```sh
   rtk proxy node --import tsx scripts/phone-verification-receive.ts authorize
   ```

   Only this explicit command contacts Zoho to exchange the code. It sends secrets
   in the POST body, saves the refresh token atomically in the same private file,
   removes the one-use code, and never prints credentials. Failed authorization
   must not be reported as an established mailbox connection.
6. In the separate ignored `runtime.env`, set
   `PHONE_VERIFICATION_TRANSPORT=zoho-poll`,
   `PHONE_VERIFICATION_RECIPIENT=verify@sophomores.co`, and
   `PHONE_VERIFICATION_ZOHO_ACCOUNT_ID` to the real concierge account ID. Preserve
   its existing local DB and state secret. The poll transport needs no webhook
   secret, user ID or integration ID; its HTTP callback is disabled, even for a
   correctly signed request. OAuth values stay exclusively in the receiver file.
7. Restart **only the task-owned local preview** using the launcher in the setup
   section. Its configuration is loaded at startup; an old process keeps the old
   mailbox/recipient. The launcher strips receiver OAuth variables even if they
   were accidentally exported. Do not restart a user-owned screen development
   server or touch their UI changes without coordinating.

### If the Mail account ID is missing

Do not guess from a profile/admin ZUID or use the mailbox address as `accountId`.
The numeric ID can be discovered with a **separate** Self Client code scoped only
to `ZohoMail.accounts.READ`. This explicit operator grant is used for account
metadata, never messages. Do not add this scope to the ongoing receiver grant.

The one-time helper uses the existing private client ID/secret, but reads its
authorization code exclusively from a different mode-0600 file:
`.deployment/phone-verification-local/zoho-account-lookup.env`. Prepare it before
generating the short-lived code:

```sh
rtk proxy node --import tsx scripts/phone-verification-account-lookup.ts prepare
```

In the same regional Self Client, generate a fresh code with **only**
`ZohoMail.accounts.READ`, using the longest expiry offered. Put it in the separate
lookup file locally, never in chat or the working receiver file. Then immediately
run the helper, or tell the operator the file is ready:

```sh
rtk proxy node --import tsx scripts/phone-verification-account-lookup.ts lookup
```

The helper consumes the one-use code, exchanges it in a POST body, reads the
authenticated user's accounts once, and prints only the losslessly parsed numeric
ID of the unique exact primary `concierge@sophomores.co` account. It fails on
ambiguous/missing accounts, inconsistent mailbox identity, broader returned scope,
redirects or provider errors. Requests are capped at two and bounded by a
30-second deadline. Tokens and raw account metadata remain in memory only; no
refresh token is saved. This is one-time local use, not an assertion of provider-
side grant revocation. If Zoho omits scope, provisioning relies on the exact scope
selected above. An interrupted/failed lookup requires a fresh code.

The receiver's existing messages.READ file, runtime configuration and preview are
not changed by lookup. Validate the discovered ID with a bounded receiver scan
before changing/restarting the local preview. Do not broaden scopes or retry a
failing provider indefinitely.

### Real-phone test

Start a bounded receiver watch in a second terminal **before** creating a new
challenge. After its first successful scan, create the challenge for your own
phone in the local preview. Send its exact `SPHMRS ...` body to
`verify@sophomores.co` using MMS, not email, RCS or an ordinary SMS to a number.
Your carrier may charge for the outgoing MMS; the site sends nothing.

```sh
rtk proxy node --env-file=.deployment/phone-verification-local/runtime.env --import tsx scripts/phone-verification-receive.ts watch --seconds 300
```

Omit `watch --seconds 300` or use `once` for a diagnostic scan only; a one-shot
scan does not establish ongoing receiver readiness or enable new challenges.
Each scan queries the exact
alias and explicit upper `receivedTime` (avoiding Zoho's default two-minute
exclusion). Do not add a provider `fromDate` clause: a live query comparison
showed that it excluded newly received carrier messages with anomalous sent-date
metadata. Receipt eligibility never depends on that sender-date filter. The
receiver rechecks the precise last-five-
minute window, sole exact To recipient and candidate carrier sender before
fetching any original. Each original is limited to message IDs from that scan;
queue claiming also restricts the mailbox and eligible IDs, so old fixture jobs
cannot block a real message. Durable dedupe prevents repeated MIME reads.

Each scan is capped at three pages of 20 metadata rows and 10 queued jobs. A full
third page fails closed rather than pretending the scan is complete. No broad
mailbox-list fallback or silent historical crawl is performed. The watch is
serialized at ten-second intervals, capped at five minutes and 150 total provider
requests including OAuth, and stops on provider, storage or stale-work errors.
Strictly rejected MMS bodies never authenticate or match a challenge: their
fenced failure/backoff remains durable, and the scan counts/skips that invalid
message within the same ten-job ceiling so it cannot stop later valid work.
Only the parser's explicitly classified rejection gets this treatment; provider
errors are not ignored or retried as malformed messages. SQL locks and
statements have one-/five-second timeouts; shutdown or an in-flight DB operation
can add a few seconds beyond the watch deadline. Counts only are printed: no
phone, message ID, subject, body, provider errors or tokens. It neither marks mail
read nor sends, deletes, moves or archives mail.

Successful receiver scans publish a signed private readiness lease, scoped to the
origin, database, mailbox and exact recipient. The shared absolute health
directory is passed to isolated previews without mailbox OAuth credentials.
Leases last at most 30 seconds and never outlive the watch deadline; graceful
abort invalidates the owner's lease even while a poll unwinds. A crash may leave
readiness stale for up to 30 seconds. Missing, invalid or stale readiness makes
new challenge issuance and authenticated pending/review status fail with
`503 RECEIVER_UNAVAILABLE`, rather than pretending to wait for mail. Verified
results and cancellation remain readable; readiness never grants phone proof.
The client pauses automatic checks and removes the compose link until an explicit
status retry succeeds. The standalone watch remains bounded. The member preview can supervise a
continuous local receiver as documented in [MEMBER-AUTH.md](MEMBER-AUTH.md), with
parent-owned rate limits, bounded restarts and paired shutdown. Continuous
operation rotates operational leases, never phone-proof expiry. This remains a
local SKT pilot, not production activation or a carrier-delivery latency guarantee.

If the message reaches the mailbox but not the preview, check the receiver and
challenge expiry first. Unsupported recipient/MIME/carrier packaging is not
silently relaxed; attachments, forwards, ambiguous recipients and unexpected
sender shapes remain rejected. CC/BCC are rejected by the MIME parser after
original retrieval, not by the metadata filter. This is transport testing, not proof that a
carrier bound the number to the originating SIM. A successful test should show
**Message needs review / Not verified**, with no account, login or reusable proof.

Live authorization, plan entitlement, exact provider response shape and physical
carrier delivery remain **unvalidated until this operator setup and test occur**.
No public deployment or Zoho webhook enrollment is implied.

## Opt-in SKT-only local authenticity pilot

The default carrier policy and production policy remain non-granting. The local
receiver can separately opt into `PHONE_VERIFICATION_CARRIER_POLICY=local-skt-zoho-arc-v1`
in its private `runtime.env`. This is only accepted with the existing local-mode,
loopback origin/database, exact verify alias, and `zoho-poll` guards. A setting
alone cannot approve a message: every original must pass the cryptographic gate.
Do not put OAuth credentials in that file or enable this through an HTTP field.

The pilot verifies a single complete ARC set (`i=1`) using pinned `mailauth`
8.0.2, exact Zoho signing domain `zohomail.com`, and Zoho's sealed receiver
authentication results from `mx.zohomail.com`. It requires SPF and DMARC pass,
exact number-bearing envelope/From equality, exact SKT `emms.nate.com` or
`vmms.nate.com` domain, and protected From/To/MIME interpretation headers and
the complete body. The same original must pass the strict MMS/challenge parser.
Copied authentication headers, altered bodies, incomplete or multi-hop ARC,
unsigned interpretation headers, ambiguous evidence and other carriers never
approve. DNS key lookups have an independent bounded, cancellable TXT-only budget
restricted to Zoho's selector namespace. Failures leave matching messages in
`review`; only a fresh, session/phone-bound unexpired challenge can become
`verified`. Existing review records are not promoted by replaying old deliveries.

RSA verification defaults to a 2048-bit minimum. The observed Zoho `zohoarc`
key is 1024-bit. **Only after explicit operator approval**, the local receiver
may additionally set `PHONE_VERIFICATION_ALLOW_LEGACY_ZOHO_ARC=1`. That exception
is restricted to RSA-SHA256 and the exact pinned Zoho selector and public-key
fingerprint in the verifier; it is not a general 1024-bit downgrade. A changed key
fails closed until separately reviewed. RSA below 1024 bits and SHA-1 never pass.
1024-bit verification is legacy compatibility, not modern production assurance.

Carrier entries belong in Zoho's **Allowed List**, which retains normal checks,
not its **Trusted List**, which bypasses them. No provider settings are changed by
the pilot. This policy explicitly relies on SKT reporting the actual originating
number; ARC authenticates Zoho's assertion, not independent SIM/identity proof.
KT/LG U+, production, registration, login, account recovery, identity and age
verification remain excluded. HTTP responses never expose a reusable proof.

After enabling an approved local policy, restart only the receiver watch (not the
user's screen development server), create a fresh challenge, and perform a bounded
own-phone test. Record cryptographic acceptance separately from an actual
pending-to-verified transition. Synthetic spoof/tamper/replay tests are not
physical wrong-SIM or multi-carrier evidence.

## HTTP and Zoho boundaries

- `POST /api/phone-verification/challenges`: same-origin JSON, bounded body,
  anonymous cookie, normalized phone, persistent issue limits.
- `GET /api/phone-verification/challenges/:id`: cookie ownership, no-store,
  status only; no raw phone or reusable registration proof is returned.
- `DELETE /api/phone-verification/challenges/:id`: same-origin cancellation.
- `POST /api/phone-verification/webhook`: raw-byte signature verification, bounded
  body/read deadline, expected Zoho user/integration identity, durable metadata
  receipt before HTTP 200. Duplicates do not duplicate work. It is still behind
  the existing preview proxy outside the loopback/public-mode test launcher.

[Zoho Mail webhooks](https://www.zoho.com/mail/help/dev-platform/webhook.html) use
base64 HMAC-SHA256 over the full raw request bytes. Their first registration
request supplies `x-hook-secret`. **Normal processing rejects that header.** No
first-caller-wins enrollment is exposed. Controlled operator enrollment and secret
pinning must be designed/approved before saving a real Zoho webhook; this callback
is deliberately not ready to paste into the live console.

The [original-message API](https://www.zoho.com/mail/help/api/get-original-message.html)
adapter supports pinned regional HTTPS hosts, fixed account IDs, read-only OAuth,
lossless identifiers, redirect rejection, and bounded time/size. The local fixture
runner injects synthetic originals instead; it never invokes this remote adapter.
The standalone worker is explicit, not an unawaited Next background task. Provider
failure leaves recoverable leased metadata; retry attempts/backoff are bounded.
No retry count or timing is assumed from undocumented Zoho behavior.

`verify@sophomores.co` is an alias on **concierge@sophomores.co**. OAuth
`ZohoMail.messages.READ` reaches the concierge mailbox, not merely that alias.
Both notification filters and backend recipient checks must target the exact
verification address; don't forward the whole concierge inbox. Do not supply
write/admin/full-mailbox scopes when read-only messages scope is sufficient.

Candidate carrier domains (exact match; no suffix/wildcard acceptance):

| Carrier | Domains |
| --- | --- |
| SKT | `emms.nate.com`, `vmms.nate.com` |
| KT | `ktfmms.magicn.com` |
| LG U+ | `lguplus.com` |

The supplied live sample is not a test fixture and was not copied into source.
An email received through an authenticated provider is still not necessarily a
verified phone number. Allowlisted domains, visible From, spoofable raw headers,
or unverified ARC do not establish carrier-to-SIM binding. Production policy must
remain non-granting until trusted ingress identification, sender-number assurance,
and forged/wrong-SIM negative cases are demonstrated per carrier.

## Validation

```sh
rtk proxy node --env-file=.deployment/phone-verification-local/test.env --import tsx --test --test-concurrency=1 tests/phone-verification*.test.ts tests/phone-verification*.test.tsx
rtk proxy node --env-file=.deployment/phone-verification-local/test.env --enable-source-maps --import tsx --test --test-concurrency=1 --experimental-test-coverage '--test-coverage-include=lib/phone-verification/**/*.ts' '--test-coverage-include=components/phone-verification/*trial*.tsx' --test-coverage-lines=80 --test-coverage-functions=80 --test-coverage-branches=80 tests/phone-verification*.test.ts tests/phone-verification*.test.tsx
```

First provision a separate disposable `sophomores_verification_test_*` database
and a private mode-0600 `test.env` setting `PHONE_VERIFICATION_TEST_DATABASE_URL`
to that database. Never point integration tests at the live local receiver's
database once it contains real challenges or deliveries. The database acceptance
tests exercise synthetic ARC authentication, worker matching, replay prevention,
and proof stripping without contacting Zoho or a carrier.

Pass `--env-file` to the test process directly. In the current Node runtime,
`node --env-file=... --run ...` does not carry these file-loaded variables into
the script subprocess: integration tests silently skip and the coverage gate
fails. Require zero skipped database tests and line/branch/function coverage above
80%; a passing unit-only run is not a database acceptance result.

Without the explicit test URL, PostgreSQL integration tests are skipped; a unit-only
run is not database proof. The dedicated coverage gate is 80% lines/functions/branches
across verifier/client/trial modules. No screenshots or source tests establish real
carrier reliability, physical touch/keyboard behavior, or live ingress acceptance.

Interactive browser acceptance uses only synthetic data: desktop, short-height
mobile and tablet layouts; validation, language continuity, polling, signed fixture
to review, cancellation persisted in PostgreSQL, unauthenticated status denial,
focus trap/return and close/reopen reset. Do not click actual SMS links in automation.
If a creation request times out before its ID reaches the browser, its pending row
may remain until expiry; it cannot grant anything merely because the modal closed.

## Live-release gates (not approved or completed)

1. Choose/provision separate Sophomores database hosting, least-privilege runtime
   and migration roles, backup/restore, scheduling, and key custody.
2. Resolve existing framework dependency audit findings before public exposure.
   Audit currently lists Next.js advisories fixed in 16.4.1 and an existing braces
   toolchain advisory. These pre-date this feature. Existing image optimization
   disablement/Sharp mitigation and absence of Cache Components/Server Actions
   limit demonstrated local exposure; **audit is not clean**. Upgrade Next and
   matching ESLint configuration in a separately scoped compatibility pass.
3. Resolve unrelated existing teaser TypeScript errors before claiming a full
   repository typecheck/build. OTP-scoped checks do not prove the whole app builds.
4. Operator-approved Zoho OAuth/secret enrollment, confirmed exact notification
   payloads and trusted ingress evidence; no secrets in logs or URL parameters.
5. Narrow authenticated callback ingress plus allowlisted Zoho egress. Current
   preview Nginx has a 4 KiB body limit and private-network restrictions; do not
   loosen the whole server or bypass team login broadly.
6. SKT/KT/LG U+, MVNO where applicable, iOS/Android, dual-SIM, delayed/duplicate,
   forged-sender/header, expiry and wrong-session/device trials. Mobile `sms:`
   recipients/body prefilling are compatibility candidates, not transport proof.
7. Only then approve carrier policies and integrate server-only proof consumption
   with real registration/Better Auth. Never authorize from a browser success flag.
