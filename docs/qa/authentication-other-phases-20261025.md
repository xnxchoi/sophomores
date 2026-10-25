# Authentication study: downstream phases

Date: 2026-10-25

## Scope

Refined the downstream views at `/studies/authentication-compositions/`: email entry, email code, passkey, phone entry, message waiting, carrier review, phone confirmed, completion, expired, already used, and error. The accepted chooser is unchanged. This is an isolated presentation study, not the real member-auth client or backend.

Direction: retain the accepted monochrome surface, restrained depth, 22px headings, 24px content rhythm, one clear primary action, and quieter recovery actions. Preserve generous top chrome rather than crowding the heading against the edge. Phase changes ease the existing surface geometry; overflow stays scrollable without scrollbar-induced width shifts.

## Validation

- 44 focused tests passed. Scoped `.tsx` coverage: lines 98.54%, branches 91.19%, functions 99.22%. This is not repository-wide coverage.
- Scoped TypeScript and ESLint passed.
- Guarded execution: test peak RSS 358 MiB; TypeScript 345 MiB; ESLint 346 MiB. No full build, full suite, package install, or backend restart.
- Live browser: signup email → code → phone → waiting; login email/code; phase fixtures; Back; Cancel; Escape; reopen; focus restoration; copy success; waiting check; simulated Messages notice.
- English/Korean narrow checks at 320×700, desktop at 1000×900. OTP input no longer internally scrolls horizontally. Korean waiting actions remain reachable; slight vertical padding overflow retains native scrolling. Scrollbar gutter is zero. Temporary viewport override reset.
- Network audit: only local document, CSS, JS, and font GETs; no auth/provider requests. No browser console errors observed.
- Synthetic code `12345678`; synthetic message and `.invalid` recipient only. Check status never invents verification. Phone confirmation remains distinct from completed registration. Completion explicitly says no account was created or signed in.

## Evidence

Directory: `artifacts/qa/verification-20261025/other-phases/`

- `entry-desktop.jpg`, `email-code-desktop.jpg`, `phone-desktop.jpg`, `waiting-desktop.jpg`: primary phase hierarchy and spacing.
- `passkey-desktop.jpg`, `review-desktop.jpg`, `phone-confirmed-desktop.jpg`, `complete-desktop.jpg`, `expired-desktop.jpg`, `used-desktop.jpg`, `error-desktop.jpg`: alternate/outcome/recovery states.
- `email-code-320.jpg`, `email-code-320-ko.jpg`, `waiting-320-ko.jpg`: narrow field and action fit.
- `final-waiting.jpg`: final bundle at restored browser viewport, copied feedback and honest no-send notice.
- `network-summary.json`: bounded request audit after final reload/interactions.
- `.output/phases-final-coverage.log`, `.output/phases-typecheck.log`, `.output/phases-lint.log`: scoped deterministic checks.

## One dual-independent Santa review

Both independent reviewers inspected all 13 supplied desktop/narrow captures using the same spacing, hierarchy, monochrome depth, narrow-fit, truthful-outcome and recovery rubric. Both returned PASS with no blockers. Shared nonblocking suggestion: the synthetic recipient address wraps awkwardly on narrow Korean; a dedicated address line could improve scanning. No claim of Apple-level aesthetic quality or production authentication acceptance.

## Limits

No physical iPhone/Android, real passkey, Google, email/SMS/MMS, backend integration, or production deployment was tested. The static local preview bundles the exact study components with existing CSS/fonts; it is not proof of Next runtime integration. There is no phase-specific approved visual mock, so this is rendered design/interaction QA, not a pixel-fidelity pass against an Apple screenshot.

## Follow-up: rejected visual treatment

The user rejected the initial visual result despite its previous review pass. That pass established no blocking defect, not aesthetic acceptance.

This follow-up changes the treatment rather than repeating padding tweaks:

- Inspected the live Apple Account sign-in form for type hierarchy, calm field contours and progressive disclosure; did not copy its branding, colors or large logo.
- Focused phases now use native system UI typography with real weights. The accepted chooser and brand marks remain untouched. During verification, the host resolved `Helvetica Neue` medium to `HelveticaNeue-CondensedMedium`; native system UI avoids that unintended condensed face.
- Removed the heavy focused-field outline; retained a one-pixel inset focus contour. Added restrained inset depth to input/message surfaces.
- Compact, right-aligned form/recovery CTAs replace the repetitive full-width white-button stack. Email entry aligns its quiet Google alternative with the primary action where width permits; narrow layout preserves DOM reading order.
- Focused Back is now a plain chevron with a 44px target, not a tiny gray disc. Top chrome remains generous.
- Recipient occupies its own readable line; abbreviated Korean sender label prevents unnecessary narrow wrapping.

Final evidence is in `artifacts/qa/verification-20261025/other-phases/material-refinement/`: `login.jpg`, `email-code.jpg`, `phone.jpg`, `waiting.jpg`, `expired.jpg`, `code-320-ko.jpg`, `waiting-320-ko.jpg`, `final-login.jpg`. Narrow OTP client/scroll width both 214px. Narrow waiting gutter and document horizontal overflow both zero; 8px padding overflow remains natively scrollable and keyboard-reachable.

45 focused tests pass, with scoped lines 98.29%, branches 91.41%, functions 99.23%; test peak RSS 367 MiB. Scoped TypeScript and ESLint pass at 371/330 MiB. Logs: `.output/phase-material-{coverage,ts,lint}.log`. No full builds or backend changes. The temporary viewport was reset and the final login preview remains open.

## Latest correction: OTP hierarchy and focused close control

This supersedes earlier descriptions of the code format, centered OTP composition and compact OTP primary action.

- Focused dismissal uses an X glyph with a 44px target and accessible name “Cancel”; Back remains separate. Chooser styling is unchanged.
- OTP heading, recipient, six slots and full-width Verify share one left-aligned, maximum-352px column.
- A single padded “Didn’t get a code?” action sits beneath Verify. It directly simulates resend, without another surface; the same footprint displays the 30-second cooldown. The synchronous deadline prevents rapid repeat requests and survives Back.
- Email codes contain six ASCII alphanumeric characters, case-insensitive on entry; demo `A1B2C3`. Completion still requires Verify. Subsequent user-authorized backend alignment is recorded in `member-auth-local-20261024.md`; this composition remains an isolated presentation study.

Validation: 53 focused tests pass; scoped lines 98.35%, branches 91.11%, functions 98.58%. TypeScript and ESLint pass. Guarded peak RSS: tests 415 MiB, TypeScript 424 MiB, ESLint 363 MiB. Logs: `.output/marked-details-{coverage,lint}.log`. No full build or backend operation.

Live review at the actual 780×890 viewport: focused X, email → code, lowercase-to-uppercase entry, ready recovery link, direct resend, immediate cooldown and input-focus restoration. Evidence: `artifacts/qa/verification-20261025/inline-six-character/marked-details-{empty,filled,ready,resent}.jpg`. No new mobile or physical-device acceptance is claimed.

Reference boundary: the locally retained 2021 Apple email-verification screenshot supports keeping code entry onscreen with quiet resend assistance. It is not evidence of current authenticated Apple behavior or an approved pixel target. This is correction-based live QA, not a design-qa fidelity pass against an approved mock.

One fresh dual-independent Santa round passed all six bounded criteria: X semantics/target, left alignment, recovery hierarchy/cooldown, primary width, screenshot clipping/spacing, and alphanumeric/local-only behavior. No blockers. Reviewers inspected current source and empty/filled captures; this does not establish overall Apple-level aesthetic acceptance.

## Automatic OTP verification and terminal completion — 2026-10-25

The user replaced the earlier explicit-Verify requirement: typing, paste or autofill
that completes six characters now starts verification automatically. The installed
`input-otp@1.5.0` native `onComplete` handles partial-to-full entry; a local change
handler additionally supports replacing a rejected full code, which native
completion does not cover. Both pass the completed value explicitly. Partial input
does not auto-submit; unchanged values, locale changes and rerenders do not retry.
Manual Verify remains a deliberate fallback. Busy guards prevent duplicate work;
Back, Cancel and unmount invalidate pending completion.

Both valid and invalid full study codes show “Verifying code…” and disabled input /
primary action before resolving. Rejection preserves the code, announces the inline
error and restores selected input for correction. This does not implement the broader
provider-specific failure taxonomy identified separately.

Completion now has a dedicated centered Check32 / 28px heading composition. The
redundant subtitle is removed; the external presentation-only boundary remains.
There is no terminal Back control, and programmatic Back cannot replay verification.
“Start again” remains an explicit study reset. Other phase and chooser layouts are
unchanged.

Validation: 58 study tests pass, scoped coverage 97.80% lines / 91.80% branches /
98.61% functions. Connected account DOM coverage passes separately (19 tests,
98.22% lines / 93.40% branches / 100% functions). Scoped TypeScript and ESLint pass.
Test guards peaked at 447 MiB (study) and 341 MiB (account); no full build/suite or
provider/database operation. Logs: `.output/otp-auto-{coverage,member-coverage,
study-types,member-types,lint}.log`.

Actual 780×890 browser review confirmed five characters remain idle; the sixth
shows pending; a wrong code produces inline rejection; correction automatically
advances without clicking Verify. Final completion has no Back or subtitle.
Evidence in `artifacts/qa/verification-20261025/inline-six-character/`:
`auto-pending.jpg`, `auto-error.jpg`, `auto-complete-refined.jpg`.
One fresh dual-independent Santa round passed all eight interaction/composition
criteria, with no blockers; a separate TypeScript source review also passed.
This is live presentation-study acceptance, not real-provider/device/backend
integration acceptance or Apple-level aesthetic certification.

## Failure/recovery matrix and OTP error-frame correction — 2026-10-25

This supersedes the earlier generic-error-only description. The study exposes ten
localized failure fixtures under “Preview another state”: invalid/expired code,
attempt exhaustion, throttling, delivery failure, network failure, timeout,
passkey cancellation, provider denial and unavailable service. Cancellation is
neutral status feedback, not an alarming error. Sending and verifying have distinct
pending labels. Completion remains terminal, without Back or redundant subtitle.

Removed the enclosing red OTP rectangle: it came from the shared InputOTPGroup's
invalid-descendant ring, not the invisible native input. The local group disables
that default ring in both themes. Individual slots retain restrained neutral error
contours; feedback is now 13px/20px, high-contrast neutral text in a compact reserved
two-line area. Shorter recipient copy and one left-aligned column keep the message,
slots and full-width action coherent. No chooser or wordmark changes.

The real account client now consumes these same credential views. Connected-path
evidence and recovery invariants are documented in `member-auth-local-20261024.md`.

Fresh final validation: 90 study tests, 19 existing account DOM tests, 12 connected
failure DOM tests and 13 SSR tests pass; 40 client/controller tests passed earlier
in this bounded task (174 total). Study coverage: 98.05% lines / 92.79% branches /
97.33% functions; client/controller coverage: 98.14% / 94.68% / 96.39%. Scoped
TypeScript, ESLint and whitespace checks pass. Final guarded peaks: TypeScript
617 MiB, study tests 457 MiB, account DOM 359 MiB, failure DOM 318 MiB, SSR 115 MiB.
Logs: `.output/auth-failure-final-{types,study,ui,failures,render,lint}.log` and
`.output/auth-failure-core-coverage.log`. No full build/suite or package install.

Live 780×890 inspection confirmed automatic wrong-code submission, readable inline
rejection and no red group frame. Current capture:
`artifacts/qa/verification-20261025/inline-six-character/failure-refined-invalid.jpg`.
Two independent Santa reviewers passed the identical eight-point final rubric,
including supplied renders. Earlier rounds caught persistent recovery-state loss
and missing connected email validation; both were fixed before final approval.
No overall Apple-level quality certification or new physical-device acceptance.
