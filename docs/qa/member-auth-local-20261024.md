# Local member authentication acceptance — 2026-10-24

## Scope

Better Auth 1.7.12 with required real email and phone binding. Email code, magic
link or Google establishes a pending principal; only the server-owned atomic
phone-binding transaction activates the local account. Optional passkeys are the
preferred returning credential. A phone number selects an account but is never
an authentication or recovery factor on its own.

Shared preview-admin login and user-owned verification/shell files were not
replaced. Public deployment, Payload, real provider setup and production carrier
approval were not performed.

## Validated

- Member suite: 110 tests passed, zero skipped, in a newly created disposable
  PostgreSQL database. The database was removed afterward, preserving working
  verification/member data. Coverage: 96.09% lines, 93.18% branches, 88.05% functions.
- Actual Better Auth migration smoke passed in a disposable database; the same
  migration then created the local `member_auth` schema without creating users.
- Canonical TypeScript and scoped lint passed. Backend, security and React
  reviewers cleared the final scoped implementation.
- Virtual WebAuthn: three runs, 21 checks, using actual signing/verification,
  memory mail and a separate disposable database. Includes pending-account
  enrollment denial, server UV enforcement, selected-phone mismatch, successful
  enrollment/login and assertion replay rejection. No live SMTP/Google calls.
- Browser UI: desktop 1280×900 and short-mobile 390×650, three runs each. Chooser,
  focused Cancel, focus containment/return, blocked dismissal, provider states,
  proof-to-binding distinction and reachable mobile actions passed.
- Full motion remained enabled. Settled proof text contrast measured 7.07:1.
- Santa Method: two independent reviewers passed the final render. The first
  round identified redundant phone headings/chrome; owned wrappers were fixed.
  A dark-text screenshot was an intermediate child-animation capture, not a
  production color defect; screenshot settlement was corrected without removing
  motion or altering the shared verification component.

## Runtime integration repairs

- The task-owned PostgreSQL container had a changed loopback port after restart;
  only private local connection addresses were refreshed, not credentials.
- Next's hostname now matches `localhost` so strict request-origin checks and
  WebAuthn agree. DNS preflight rejects any non-loopback localhost resolution.
- The identifier reset accepts bounded empty Next.js DELETE streams while still
  rejecting bytes, invalid lengths, excessive chunks and hung reads. Live status
  and reset endpoints returned successful responses.

## Evidence and limits

Final reports/screenshots are retained under ignored
`.deployment/member-auth-local/qa/`; the member suite log is
`.deployment/member-auth-local/test-coverage.log`. Disposable browser database
and its temporary credential file were removed after acceptance.

The broader combined OTP/member run exposed an existing OTP modal test expecting
an older trigger caption in `tests/phone-verification-modal.test.tsx:28` while
concurrent shell work changed it. That unrelated source/test was not modified by
this slice; a whole-repository test-suite pass is not claimed.

Real Google callback, inbox delivery, physical biometric/password-manager and
iPhone/Safari/cross-device acceptance remain unproven. Google and outbound email
are disabled until the operator supplies private credentials. Local passkeys use
RP ID `localhost` and do not migrate to the hosted domain. Existing dependency
audit findings and stronger production carrier assurance remain release gates.

See [member setup](../../deployment/MEMBER-AUTH.md) for private configuration,
local launch and safe test instructions.

## 2026-10-25 — Google setup and continuation repair

Google's local OAuth client is configured privately with the owner's sole test
account, basic identity scopes and unpublished testing status. Credentials are
not included here. The original acceptance record above predates that setup.

Successful Google and magic-link returns now use a fixed continuation page,
instead of resetting the UI to Welcome. Server session status still determines
the next step; anonymous visits cannot claim success. Error callbacks retain the
ordinary chooser. Cancel, including a late status-response race, stays at Welcome.

- Fail-first callback/client/mail and DOM regressions passed after repair.
- Full member suite: 116/116 passed, zero skipped, using a fresh disposable
  PostgreSQL database removed afterward. Coverage: 97.51% lines, 93.34% branches,
  95.36% functions. No working account/verifier data was changed by tests.
- Browser callback regression: desktop 1280×900 and short-mobile 390×650 passed
  simulated Google redirect, pending phone view, active/anonymous continuation,
  Cancel, focus containment and viewport checks. All API replies were fixtures;
  no external provider requests or working-database writes occurred.
- The actual in-app browser session resumed directly to the email-confirmed
  phone step. A fresh real Google OAuth round-trip after the fix was not repeated.
- React, code, TypeScript and security reviews cleared the scoped fix. Harsh
  Santa live-render review passed actual plus desktop/mobile screenshots. Full
  motion and shared wordmark/styling were not changed.
- Canonical typecheck is blocked by unrelated TS7022 at
  `tests/authentication-chooser-layout.test.tsx:171`; an isolated check excluding
  only that concurrent test passed. ESLint passed; no whole-repo test pass claimed.

Regression harness: `tests/browser/member-auth-continuation.spec.mjs`, using the
same explicit Playwright/browser environment variables as the existing harness.
The report and fixture captures are in the ignored
`.deployment/member-auth-local/qa/continuation-20261025/` directory.

### Zoho outbound SMTP configuration

The operator-provided private agent SMTP configuration validated successfully.
The sender is `verify@sophomores.co`; the documented ZeptoMail SMTP host and a
secure port are enforced. A no-send verification established a certificate-checked
TLS connection and authenticated successfully. No email was sent by that check.
Only the private mail mode was changed from disabled to SMTP; other private
settings were preserved. The task-owned member preview was restarted, and its
status endpoint returned HTTP 200 with email OTP, magic link, Google and passkey
capabilities enabled. After explicit user approval, one plain delivery-test email
from `verify@sophomores.co` was submitted to the owner's approved Gmail address;
SMTP accepted it with zero rejected recipients. No login code or sign-in link was
included, and no retry was made. The recipient confirmed that this test arrived
in the inbox, not spam. This confirms that single delivery, not general inbox
placement.

### Live email authentication checks

The operator authorized one email-code and one magic-link test using the owner's
approved Gmail account. The local Google session was explicitly signed out before
the email-code test. The user entered the code privately in the app; the real
server-confirmed UI reached the email-verified, pending phone-verification step.
No OTP was copied into chat or stored in the acceptance record. This proves the
live email-code sign-in, not completed membership or phone binding. The session
was signed out again for the separate magic-link test. The app acknowledged one
real magic-link send, and the user confirmed that opening the link worked. That
result is user-confirmed: the original in-app tab's subsequent snapshot still
showed the anonymous sign-up form, so this record does not claim independent
inspection of the browser/session where the link was completed. No magic-link
token was copied into chat or retained in QA artifacts. After refreshing the
anonymous in-app session, a fresh real Google sign-in also returned directly to
the email-confirmed phone step at the fixed continuation route. A separate
five-minute, receive-only Zoho watch was started for the user-requested live
phone-binding test; its initial scans succeeded. Phone binding and physical
passkey enrollment remain separate acceptance steps until completed.

### Phone attempt diagnosis and registration presentation cleanup

The user reported sending the MMS from an iPhone with a green bubble. The bounded
receiver completed its five-minute watch without queuing a delivery; the real
challenge expired without a phone binding. Separate bounded, read-only metadata
checks using the original provider date prefilter returned no recent candidates.
That was initially misinterpreted as upstream non-arrival; the correction below
shows that the messages did arrive. Original messages/bodies were not fetched in
those diagnostics, and no carrier trust or matching rule was relaxed. A green
bubble alone does not prove carrier-MMS delivery.

Registration now omits trial/language chrome, duplicate email instructions,
pending boilerplate and redundant outer status/footer copy. One user-clicked
Messages compose action is primary; exact-copy recovery and local/MMS limitations
remain genuinely collapsed. SMS URI candidates include the validated recipient
and encoded body, with macOS recognition and an opt-in unknown-handler candidate.
Opening never sends or verifies anything; iPhone/macOS prefilling and carrier
delivery still require physical acceptance.

Automatic status polls no longer toggle foreground busy/button text. Reset,
expiry and disposal abort and fence in-flight status work, including late errors.
Manual refresh feedback remains deliberate, and failures still pause polling.

- 64 focused unit/DOM/render/controller tests passed with zero skips; measured
  scoped coverage was 97.08% lines, 94.48% branches and 94.34% functions.
- Final browser regressions passed desktop 1280×900 and iPhone-sized 390×650:
  five background status reads per run, zero status-button state mutations,
  collapsed/reachable recovery, exact candidate hrefs and no false activation.
  All API replies were fixtures; no native handler or provider was invoked.
- Canonical TypeScript and ESLint passed; the earlier unrelated TS7022 was no
  longer reproduced. Code, TS, React and security reviews cleared the scoped
  change; a fresh harsh Santa review passed both final renders.

Harness: `tests/browser/member-phone-compose.spec.mjs`. Final fixture report and
captures are retained under ignored
`.deployment/member-auth-local/qa/phone-compose-20261025/`. This UI/poll fix is not
evidence that the previously missing carrier message was delivered.

### Receiver lookup correction and explicit checking feedback

The user confirmed the Zoho receiving mailbox contained the MMS attempts. A
bounded, read-only query comparison then proved that the exact-alias search
returned two recent carrier messages when the provider `fromDate` clause was
omitted, while either exact-alias or short-alias queries with that clause excluded
both. Their provider sent-date metadata differed substantially from receipt time.
This corrects the earlier non-arrival interpretation: the MMS messages arrived;
the coarse provider date prefilter hid them from the receiver.

The receiver now searches only the exact alias with the explicit `receivedTime`
upper bound and preserves the precise local receipt-time lower/upper bounds,
recognized sender, exact sole recipient, bounded pagination and downstream MIME,
challenge/phone matching and expiry rules. No historical original-message crawl
or proof-expiry extension was introduced. A read-only smoke test of the corrected
source returned both recent eligible references without fetching originals,
queuing work, or granting phone proof. Expired messages cannot be reused.

The registration screen now restores a stable monochrome status indicator with
the compact countdown alongside it. Explicit checks show Checking for at least
600 ms and until the request completes, even for immediate pending/error replies.
A click during background polling joins that request rather than issuing another
GET. Pending says Still waiting, not failed or absent from the inbox. Reset,
expiry and disposal fence both request and presentation-hold work.

- 95 scoped tests passed, zero skipped; coverage 94.62% lines, 93.72% branches,
  93.68% functions. Canonical TypeScript and scoped ESLint passed.
- Desktop/mobile fixture browser runs passed compact status/timer placement,
  minimum visible manual feedback before instant pending/failure, truthful
  outcomes and zero background button-state mutations. No native handler or
  provider was invoked by these browser fixtures.
- Code, TypeScript, React and security reviews cleared the changes. Harsh Santa
  review passed the final Still waiting desktop/mobile captures.

Final status captures/report are retained in ignored
`.deployment/member-auth-local/qa/phone-status-20261025/`; the scoped test log is
`../phone-compose-20261025/status-receiver-tests.log`. Fresh real MMS matching and
phone binding are still required; old expired proof was not retroactively granted.

### Fresh live MMS acceptance after the search correction

The user sent a fresh carrier message and reported success. The actual in-app
browser then showed Phone verified and exposed Finish registration. This confirms
the real receiver/policy challenge match after the search fix, not merely inbox
arrival or a fixture. The bounded receiver was stopped when no further scans were
needed. Account binding is not yet confirmed: Finish registration remains the
explicit next step, and physical passkey enrollment has not been attempted.

### Retry stall: receiver lifecycle, not measured carrier latency

The user retried and reported roughly four minutes of waiting. Process inspection
confirmed no receive worker was running; the web client was polling challenge
state without a process fetching Zoho. A new bounded five-minute watch processed
one message on its first scan, and the actual in-app page changed from Waiting
for message to Phone verified. This confirms that attempt's challenge match; it
does not establish a four-minute carrier delay, final phone binding or passkeys.
The proof subsequently expired unbound. No expiry or carrier rule was relaxed.

Added signed, recipient/origin/mailbox/database-scoped private readiness leases
after successful watch polls. Issuance and session-owned pending/review status
now return RECEIVER_UNAVAILABLE when the receiver is offline; verified status
and cancellation are unaffected. Graceful abort invalidates its own lease
immediately; crash staleness is bounded to 30 seconds. The client pauses polling,
removes native composition, and retains the outage throughout a retry until a
successful status result. Watch duration/request budgets remain unchanged.

A separate real ten-second watch confirmed readiness true after a successful
scan and false after shutdown. The restarted localhost member preview then
rejected an offline synthetic issue request with 503 RECEIVER_UNAVAILABLE and
no session cookie; no synthetic challenge was issued. No receiver is left
running after these bounded windows.

Registration recovery now appears only after an explicit compose tap followed
by three uninterrupted foreground seconds. Blur/hidden, challenge changes,
outages and unmount suppress stale recovery without moving keyboard focus.
Registration's technical privacy disclosure was removed; the standalone trial
retains it. Switch account is a quiet 44px action with unchanged real sign-out
and locking. Expired verified proofs now present an expired heading/status,
not a contradictory verified badge beside an expired binding warning.

Validation so far: 118 scoped tests passed with zero skipped; full TypeScript
and scoped ESLint passed. Focused client/recovery/health coverage is 98.91%
lines, 92.52% branches and 100% functions. Code/security reviews cleared the
changes, including recipient-scope and delayed-retry regressions. Browser
fixtures remain separate from physical iPhone Messages-prefill acceptance.

Final rendered browser acceptance passed at 1280×900 and 390×650: delayed
foreground-only recovery, blur/hidden suppression, repeated taps, reset,
receiver outages, paused polling, delayed-retry compose lock, no stale-help
resurrection, no registration privacy disclosure and touch-sized Switch account.
Both profiles recorded zero background check-button mutations and perceptible
manual pending/failure feedback. All API responses were intercepted fixtures;
there were zero external requests and no native Messages launch. Settled PNGs,
traces, report and scoped test/coverage logs are retained in ignored
`.deployment/member-auth-local/qa/phone-recovery-20261025/`.

Final React/accessibility review cleared the changes (36 independently rerun
tests). Two independent harsh Santa reviewers inspected all eight settled
desktop/mobile captures and the behavioral evidence; both passed with no
blockers. Neither review claims physical-device/native-prefill or production
acceptance. No commit, push, deployment or automatic registration was performed.


### Preview-owned continuous receiver (local only)

Authorized follow-up replaces manual five-minute receive windows for the member
preview with one connected `serve` child. The preview owns the worker lifetime;
configuration/duplicate-owner failures are not restarted, and other exits get
at most three bounded restarts. Only opaque budget grants cross parent IPC.
A parent-owned rolling 600-request/hour cap survives child restarts and counts
OAuth, metadata and originals. Every request/body has a 15-second deadline.
Operational readiness rotates before its fixed five-minute lease deadline and
expires within 30 seconds; phone proofs and carrier policy are unchanged.

A dedicated connection holds a parameterized PostgreSQL advisory lock for this
local database/runtime. A duplicate manual watch was rejected with exit 78 before
any scan. An intentionally terminated owned receiver was replaced by a new PID
and readiness recovered. Stopping the owned preview then stopped its receiver
and readiness became false. The final preview was restarted for acceptance
across the former five-minute boundary. No phone-binding or native-prefill
success is inferred from these lifecycle checks.

Resource controls were added following the reported desktop-client memory
incident: sequential capped test runs (384 MiB V8 heap and external wall-clock
kill guard), receiver child heap 256 MiB, web child heap 1024 MiB. Heap caps are
not total RSS or a limit on the ChatGPT desktop client. Client-process-tree RSS
was sampled locally with a 12 GiB stop flag; one early spike blocked a test from
starting. The source of the reported 100 GB client peak remains unproven. No
further browser suites or parallel implementation agents were started during
this final continuation; one bounded source-only review approved the code.

Validation: 62 scoped tests passed, zero skipped. New supervision/budget/service/
lock modules: 97.93% lines, 83.88% branches, 90.57% functions. Full TypeScript and
scoped lint passed. Tests used fixtures, except the explicitly described
read-only live receiver/lifecycle acceptance. No commit, push, deployment,
credential change or automatic registration was performed.


Final live acceptance: the same supervised preview stayed healthy across all
31 ten-second observations through 312 seconds, passing the old five-minute
cutoff and operational-lease rotation. The loopback member status endpoint
returned HTTP 200. Client-process-tree RSS during this acceptance peaked at
10451 MiB, below the 12288 MiB guard; this includes descendant tools/dev servers
and is not equivalent to Activity Monitor's app memory figure. The supervised
preview and receiver are left running for a fresh user-initiated verification.
Live evidence is retained in ignored
`.deployment/member-auth-local/qa/receiver-supervision-20261025/live.json`.


### Login no longer silently resumes phone registration

Login now distinguishes an authenticated incomplete account from completed
membership. It presents Finish setting up your account with explicit Continue
registration and Switch account actions; no phone component/challenge mounts
until continuation is chosen. Explicit Sign up still opens the phone step.
Google/magic-link continuation now defaults to the conservative login/setup
gate, rather than assuming signup. No redirect allowlist, server membership,
phone-binding policy or authentication capability was changed. Cancel/flow
unmount and confirmed sign-out reset the local continuation choice.

Test-first login/callback regressions were RED then GREEN. The scoped DOM,
render and phone-presentation suite passed 38 tests; full TypeScript and scoped
lint passed. Changed account components measured 98.30% line /94.56% branch /
100% function coverage. Unrelated shared Arc CSS-module imports currently need
a test-only Node CSS loader; the loader used for these functional tests is
retained with this QA evidence, not installed into runtime or package scripts.
One fixture-browser attempt ended before its first navigation with a closed
browser target; it is not counted as passing and was not repeatedly relaunched.

Actual existing in-app browser acceptance passed: Cancel -> Welcome -> Log in
showed the setup gate and zero phone inputs. Keyboard Enter on Continue
registration mounted phone entry and focused member-phone-heading. Cancel then
Log in restored the gate. No phone number/code was entered, no native composer
opened, and no registration/passkey enrollment was performed. At 390x650 the
settled dialog was 366x415 at x12/y117, with no horizontal overflow; the temporary
viewport override was reset. A harsh independent Santa screenshot review passed
both normal and mobile captures. Source review found no blocking React/state or
security issue. Captures are retained in ignored
`.deployment/member-auth-local/qa/login-setup-gate-20261025/`.

Checks remained sequential and heap/time bounded. Client-process-tree RSS was
monitored; near the guard limit, additional external browser runs were avoided
and the existing in-app browser was reused. This does not establish or repair
the source of the previously reported desktop-client memory spike.

### Email OTP format alignment — 2026-10-25

User authorized aligning the account backend with the six-character study format.
Better Auth 1.7.12 now uses its native `generateRandomString` through `generateOTP`
to issue six uppercase ASCII letters/digits. Raw HTTP and browser-client verification
require exactly six ASCII alphanumeric characters before uppercase canonicalization;
whitespace, trailing newlines and Unicode lookalikes/expansion are rejected. Mail
accepts only canonical uppercase codes. The connected account field and notice were
updated for compatibility, without changing layout or authentication capabilities.

Hashing at rest, five-minute expiry, three attempts, one-time redemption and existing
endpoint throttles are unchanged. No new package, custom RNG, OTP verifier, schema
migration, credential/config change, service restart, provider delivery or deployment.
Previously issued eight-digit challenges no longer meet the new format; request a
new code after activating this version.

Validation: 38 backend/client/controller tests, 17 account DOM tests and seven SSR
tests pass. New native-handler integration uses Better Auth's installed memory
adapter, not a custom verifier: covers lowercase redemption, hashed storage, expiry,
replay, attempt exhaustion and resend throttling. Scoped backend coverage is 94.68%
lines / 87.95% branches / 90% functions. Scoped TypeScript and ESLint pass. Guarded
peak RSS: tests 275 MiB, DOM 293 MiB, TypeScript 612 MiB, ESLint 309 MiB. Logs are
`.output/otp-backend-{coverage,ui-dom,ui-render,types,lint}.log`. DOM/SSR functional
runs used an ephemeral Node CSS-module stub, not a runtime/package-script change.

PostgreSQL and browser/passkey regression expectations were updated, but those
infrastructure-dependent suites were not executed. The native memory adapter does
not enforce unique verification identifiers; resend coverage does not establish
latest-code-only invalidation. That pre-existing behavior was not changed or claimed
as accepted. No real email, device authenticator, production ingress or database
acceptance is claimed.

Independent security, TypeScript, React and final code reviews found no scoped
blockers. These were source reviews, not substitutes for the unexecuted
PostgreSQL, live-provider or browser acceptance layers above.

### Automatic email-code completion — 2026-10-25

The connected account UI now verifies a completed six-character code from the
input event, passing its normalized value directly rather than reading stale state.
The button shows “Verifying…” during verification; partial submits are blocked.
Explicit Verify remains a fallback. Failed values do not loop on rerender; edited
full values may retry. Existing session serialization and disposal still suppress
duplicate or late results. Pending state resets through the existing session
subscription, not a synchronous effect setter or deferred timer workaround.

Nineteen account DOM tests pass, including deferred pending/failure, correction,
manual retry, authoritative success and cancellation. Scoped account coverage is
98.22% lines / 93.40% branches / 100% functions; guarded peak 341 MiB. Logs:
`.output/otp-auto-member-coverage.log`, `.output/otp-auto-member-types.log`,
`.output/otp-auto-lint.log`. The functional DOM run uses the same ephemeral CSS
stub as the prior compatibility checks. No real account/provider/browser acceptance
is claimed for this connected path; live browser review was of the isolated
composition study. No backend policy or provider configuration changed here.

### Structured failure states and shared credential presentation — 2026-10-25

The actual client/session now classifies ten bounded failure categories with static,
localized UI text. Per-call SDK error hooks capture retry headers without shared
mutable state. Unknown failures remain generic; provider details are never rendered.
Passkey cancellation requires an actual NotAllowedError cause; technical wrappers
without that cause are not silently treated as cancellation. Google denial and
confirmed cancellation use neutral status feedback.

Anonymous credentials, including after phone identification, now use the same email
and six-character OTP views as the composition study. Local email validation runs
before email-code or magic-link calls. Partial codes cannot submit; complete values
auto-verify once, with explicit values and serialized pending actions. Only server
status can establish authentication, phone binding or membership.

Recovery is persistent state, not just the latest error message: expired/exhausted
codes remain locked through failed refresh/resend; verification retry and resend
cooldown have independent absolute deadlines. Only acknowledged fresh delivery
clears replacement requirements and stale OTP input. Alternate credential methods
leave stale OTP entry while preserving identity/status. Failed initialization no
longer masquerades as an indefinitely busy operation.

Live browser checks used the actual client adapter, session and account component
with an injected fake SDK/fetch, not live providers. The tracked fixture
`tests/fixtures/member-auth-failure-preview.tsx` visibly discloses simulation and
contains requests. Verified wrong-code feedback, full-code correction/automatic
retry, expired → failed resend → successful resend, input reset, neutral passkey/
Google outcomes and invalid-email feedback. Successful simulated verification ends
at pending registration, not invented membership. Temporary connected QA tabs closed.

Captures under `artifacts/qa/verification-20261025/inline-six-character/`:
`connected-invalid-email.jpg`, `connected-invalid.jpg`,
`connected-expired-network.jpg`, `connected-recovery-restored.jpg`,
`connected-passkey-cancel.jpg`, `connected-google-denied.jpg`.

Final test counts, scoped coverage, resource limits and dual-independent Santa
approval are recorded in `authentication-other-phases-20261025.md`. Functional DOM/
SSR tests retain the ephemeral test-only CSS-module stub, with no runtime change.
No real email, Google, WebAuthn, phone, database, ingress or deployment acceptance.
Better Auth's initial passkey-options call omits per-call hooks and may strip native
causes; physical-device cancellation classification remains unproven.
