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
