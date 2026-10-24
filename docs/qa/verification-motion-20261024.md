# Visual rework after user rejection — 2026-10-24

The user rejected the first white-modal pass as visually unchanged and poor. **Its visual scorecard and acceptance claim below are withdrawn**, not evidence of user design approval. Historical implementation/verification notes remain below for traceability.

## Current direction

- Off-black `teaser-card` sheet, 12px corners, white left-aligned 34/40px heading, lime `teaser-green` primary action. No new palette or decorative gradient.
- Removed the entry arrow tile and centered language/heading stack. Language controls share a compact context row; the sticky wordmark/close bar remains.
- Local-trial entry now uses a human prompt and Continue rather than exposing challenge-creation terminology. Local-only/no-registration/privacy/carrier disclosures remain truthful and available.
- Exact-copy card uses a dark inset with a restrained green code section. Successful feedback stays on the button; the duplicate visible Copied line is gone, while its live region remains. Waiting uses three indeterminate signal segments, not a percentage.
- The actual in-app browser was refreshed and inspected at 319px wide, not just a separate large test browser.

## Current visual audit (provisional, not user acceptance)

| Dimension | Score | Evidence / remaining limit |
|---|---:|---|
| Color consistency | 9 | Existing teaser-card/green/white roles; `verification-ui.tsx:11-18,66-82`. |
| Typography hierarchy | 8 | Left-aligned semibold title; no decorative entry tile; `verification-ui.tsx:15,27`. |
| Spacing rhythm | 8 | Compact context row and restrained insets; short-mobile primary visible above fold. |
| Component consistency | 9 | Shared shell/card/field across disconnected and local-trial views. |
| Responsive behavior | 9 | 319×560, 360×560, tablet and desktop checked; pending screen scrolls internally. |
| Dark-mode coherence | 9 | Fully dark task surface with readable input/copy/error states; no half-converted white inset. |
| Animation | 8 | Purposeful waiting segments, copy/press and state transitions; native tactile output still untested. |
| Accessibility | 8 | Labels, live status, focus/return and close retained; no general WCAG claim, full-motion policy unchanged. |
| Information density | 8 | Human entry prompt, quieter technical detail; local-only boundary still visible in document flow. |
| Polish | 8 | The real narrow-panel input now overrides legacy global typography rather than merely declaring ineffective utilities. |

These scores describe this bounded audit, not whether the user likes the direction. The user's taste acceptance is still open.

## Verification and review

- Four new visual-contract tests were RED before rework and GREEN after: dark scrollable shell, left bold hierarchy/lime action, no entry ornament, dark accessible exact-copy card.
- Full source suite: **489 passed, 14 skipped, 0 failed** (503 total). Typecheck, scoped ESLint and whitespace checks pass.
- Seven fixture-only browser runs pass: three desktop repetitions, 360×560, **319×560**, tablet, and iPhone-UA/Chromium bridge smoke. No real verification/provider/carrier requests.
- A stale browser-test selector was updated for the new waiting segments. The touch-scroll test now swipes toward available content instead of into a scroll boundary after keyboard traversal; the assertion still requires actual scrolling from the copy target.
- The harsh Santa round found one real defect: unlayered `styles/globals.css:239-251` overrode ordinary Tailwind input classes, clipping the final placeholder digit at 319px. Fixed **locally to this field**, without changing global CSS, using effective important typography/color/margin utilities (`phone-number-field.tsx:36`).
- Independent recheck: complete placeholder measures **121.12px within 149px available**, 16px font, white entered text, 0.32px tracking. Continue bottom is **450.72px**, above the 560px fold. The browser regression now measures computed placeholder width and verifies native input typography and CTA position at both narrow widths.
- One dual-review Santa round, including that targeted in-round correction: final **PASS / PASS**, no remaining blockers. Separate code review: no actionable correctness/security blockers. This is not user aesthetic approval.
- Actual-user-tab evidence: `artifacts/qa/verification-20261024/actual-inapp-rework.png`. Fresh multi-viewport evidence/report archived under `artifacts/qa/verification-20261024/rework/`; executable checks remain in `tests/browser/verification-feedback.spec.mjs`.
- Haptics/backend/motion policy unchanged from the prior slice. Physical Safari/Android tactile feel, carrier delivery, deployment and a fresh production build are not claimed by this visual rework.

---

## Archived first pass (rejected visually)

# Verification UI, full motion and tactile feedback — 2026-10-24

## Scope and design direction

Updated both the disconnected preview and the local-trial modal; backend transport, policy, mailbox access, registration and deployment are unchanged. Existing unrelated dirty work is retained.

Used the design-system skill in **visual audit** mode, not a new token-system generation. Existing `styles/teaser-theme.css` stays canonical: teaser-card for actions, teaser-blue for activity/focus, teaser-green for confirmed copy/success. The white utility surface deliberately contrasts with the cinematic front page. Manrope/message typography and the serif wordmark connect the two without bringing the full hero into a small task.

Browser reference inspection: xAI accounts sign-in entry, Cash App home and Toss home. The gated xAI OTP screen was **not** accessed; no account or email was submitted. Borrowed principles are compact task hierarchy, quiet secondary information and restrained high-signal color, not copied product screens. Apple's and Uber's native interaction quality are aspirations, not tested implementations here.

## Visual audit (0–10)

| Dimension | Score | Evidence / remaining limitation |
|---|---:|---|
| Color consistency | 9 | Existing teaser action/activity/success roles in `components/phone-verification/verification-ui.tsx:11-19,26-35`; neutral surfaces rather than unrelated gradients. |
| Typography hierarchy | 9 | Wordmark, one heading, body, code, supporting copy; `verification-ui.tsx:15-17,77-83`. |
| Spacing rhythm | 8 | Shared utilities and inset card; short-mobile entry requires internal scrolling to its CTA. Further whitespace reduction is optional. |
| Component consistency | 9 | Both flows share shell, copy card, mark, countdown and phone field. |
| Responsive behavior | 9 | 360×560, 820×1180 and 1440×900 browser checks; sticky close remains reachable in the scrollable dialog. |
| Dark-mode coherence | 8 | Intentional light utility surface in either ambient theme, not a partially converted dark form; no separate dark variant claimed. |
| Animation | 9 | Brief step/icon transitions, press response, animated color feedback and indeterminate waiting mark. No invented completion percentage. |
| Accessibility | 8 | Focus trap, focus return, native labels/status/error feedback and 44px actions retained; system motion preferences deliberately not honored per current user policy. Not a WCAG compliance claim. |
| Information density | 8 | Privacy/MMS detail remains available in disclosures; no-account boundary stays visible in document flow. Pending mobile is deliberately scrollable. |
| Polish | 9 | Copy waits for permission outcome; failure offers manual selection, recovery works, old completion cannot update a dismissed session. |

Slop check: no decorative gradient stack, fake progress bar, generic glass cards or unrelated palette. The rotating rounded mark is a small activity signal, not a claim that delivery or verification succeeded.

## Haptics exploration

- `lib/haptics.ts` provides a React 19 ref/cleanup attachment for primary actions and exact-copy controls. Visual feedback remains authoritative.
- Non-iOS browsers with `navigator.vibrate` get a short 8ms pulse on trusted user activation; unsupported/denied haptics never block the action. Intentional keyboard activation is allowed.
- iOS uses pinned `ios-haptics@3.2.0`, which relies on Safari's native checkbox `switch` feedback (introduced in Safari 17.4). This is not general-purpose Core Haptics control.
- The npm package currently ships a full-size input overlay, whereas upstream GitHub main uses a label with an off-finger switch. The adapter reconciles the published overlay to that upstream structure, excludes the switch from keyboard focus, prevents disabled toggles, stops duplicate forwarded clicks and cleans up asynchronous attachment.
- The minimal imperative hit-target styles are the native bridge mechanics; visible UI styling is Tailwind-only.
- No haptic timers, polling pulses or asynchronous-success patterns. No guarantee of equal amplitude, waveform or availability across operating systems. Actual Safari/iPhone and Android hardware evaluation is still required.

## Validation

- RED → GREEN for exact clipboard copy and missing/unavailable/rejected clipboard, localized copy markup, trial copy/status/disclosure markup, haptic attachment/cleanup and absence of runtime preference gates.
- Full source suite: **485 passed, 14 skipped, 0 failed** (499 total). Skipped integration cases are not counted as proven.
- Additional focused motion suite: 306 passed (overlaps the full suite; not additive). Teaser helper coverage: 99.22% lines / 96.23% branches / 99.36% functions. Haptics adapter: 95.33% lines / 88.68% branches / 88.46% functions. These are scoped figures, not whole-application coverage.
- Typecheck, changed-surface ESLint and whitespace checks passed.
- `tests/browser/verification-feedback.spec.mjs`: six passing Chromium fixture runs, including three desktop repetitions, short mobile, tablet and iPhone-UA bridge smoke. Full detail in `verification-browser-results.json`. All verification API calls intercepted; no real challenge, carrier message or account grant.
- Tested exact body/recipient copy, rejection/recovery, rapid clicks, completion after dismissal, locale/session retention, focus trap/return, clean reopen, pending/review/verified/expired/status error, no horizontal overflow, internal scrolling and full motion under reduced-motion emulation.
- The bridge smoke covers one click → one copy, rerender, hidden-switch focus exclusion, disabled guard and scrolling starting over its hit target. Chromium with an iPhone UA is **not Safari or hardware evidence**.
- Parent inspected actual browser renders and screenshots, including the homepage with motion preference emulated to reduce. A runtime spring/keyframe error found during that inspection was fixed before the final successful browser run.
- Source `pnpm build` is blocked by pre-existing, unchanged `fonts.ts` references to three missing `public/assets/fonts` paths; isolated preview repairs the copied font paths. No unrelated source-font repair is included.
- Production compilation also passed in separate `.deployment/phone-verification-local/build-Gb7a1B` using webpack with repaired copied font paths: TypeScript and 11/11 static pages passed. No `.env` was copied, no live preview cache was rebuilt, and no service was interrupted. This is not an unmodified-root build pass.

## Completion gate

One Santa Method round: **PASS / PASS**, two independent reviewers using the same five-point rubric, plus a focused code review with no actionable blockers.

Harsh summary: no lying clipboard success, no fake verification progress, no hidden-switch double action, no lost close button. The short-mobile entry has more decorative breathing room than necessary, but its action is reachable by scrolling. Emulation is not proof of tactile parity. Those are the limits; do not sell this as hardware-accepted.

No deployment, push, live messaging or physical-haptics acceptance is implied.


## Superseding local acceptance: reference-backed Vaul tray — 2026-10-24

This section supersedes the earlier fixed-height disclosure treatment. A folded accordion must reclaim its space; preserving its expanded height as blank space is rejected. Stability means eased intentional reflow, not immobilizing the layout.

### Reference and scope
- Interaction reference: https://emilkowal.ski/ui/family-tray-system
- Public implementation reference: https://www.cult-ui.com/docs/components/family-drawer
- Vaul was already installed and remains the required drawer foundation. The verification-specific shell does not replace the generic Base UI dialog elsewhere.
- Changed the two verification entrypoints, shared UI helpers, focused contracts/browser fixtures, and the repo interaction rule. No auth, provider, transport, credential, deployment, or unrelated dirty-work changes in this slice.

### Behavior
- Content-sized, bottom-anchored tray with measured natural content and eased height updates. No fixed 760px shell, fixed heading/description slots, empty trial-error reservation, or expanded-height folded disclosure.
- Details and copy/status-error feedback genuinely grow/collapse. Copy labels retain only compact width reservations; exact recipient/body values and stale-session guards remain intact.
- Vaul owns entrance/drag transforms. Explicit visualViewport sizing owns keyboard bottom/max-height; Vaul repositionInputs is disabled to avoid its persistent inline height freezing later content changes.
- Dismissal immediately disposes session content while the exiting shell holds its last height. Focus trap/return, locale/session retention, and clean reopen are preserved.
- Helvetica mark and achromatic verification palette retained. Floating shell uses restrained depth; ordinary content remains quiet.

### Evidence and limits
- Final full source suite: 500 passed, 14 environment-gated integration tests skipped, zero failures. Typecheck, scoped ESLint, and diff checks passed.
- Final browser report: `docs/qa/verification-browser-results.json`, nine fixture-only Chromium runs, including three consecutive desktop workflows. Includes real collapse/growth intermediate frames, copy-error and 503/recovery height animation, visualViewport-only keyboard shrink/restore, narrow/mobile/tablet controls, focus/Escape return, locale retention, and clipboard races. No real messaging or verification calls.
- Parent inspected the live in-app-browser entry and actual disclosure opening/closing. Screenshots: `artifacts/qa/verification-20261024/vaul-tray/`.
- One dual-independent Santa cycle: both reviewers PASS for local preview acceptance; final targeted status-error refinement was checked by both, conditional on the subsequent successful final browser rerun. No aesthetic approval is inferred from unit tests alone.
- Coverage is NOT an all-green gate: the configured broad phone-verification coverage command reports 82.45% lines, 90.49% branches, and 75.47% functions, below the required 80% function threshold. Trial-only SSR coverage likewise remains below the function threshold (61.90%, with 95.95% lines); SSR does not exercise interactive handlers. Browser coverage of behavior is not being substituted for those measured function percentages.
- No physical iOS/Safari keyboard, Android/iOS haptic feel, carrier/provider transport, or deployment acceptance. Prior root-build font-path caveat remains; no new unmodified-root production build success is claimed.


## Authentication entry and focus morph — 2026-10-24

### Updated interaction contract
- Only the compact Log in / Sign up chooser is dismissible. Selection keeps the same Vaul root, portal and surface, animating its width, content height and position into the visible viewport center. Handle and Close fade and become inert immediately; swipe, backdrop and Escape cannot dismiss a focused flow.
- Explicit Back returns to the chooser and restores focus to the selected action. Standalone OTP modal entrypoints likewise provide explicit Back, not passive dismissal. Focused tray props require that Back contract.
- Natural target content height, not in-flight animation height, determines centered geometry. VisualViewport resize/scroll and keyboard insets share one geometry owner. Unique visit keys/heading IDs prevent outgoing flow reuse or duplicate IDs during rapid Back/reentry.
- Exiting signup live content unmounts promptly without modifying OTP procedure code. Login disposes pending lookup/passkey operations on presence loss in a layout effect, before paint. Late eligible results cannot start a passkey prompt after Back.

### Passwordless login boundary
- Apple Account public email-entry screen inspected at https://account.apple.com/sign-in; no account details submitted and no gated Apple authentication behavior claimed inspected.
- Separate English/Korean email-first login view, no password field. Valid email and a validated opaque client lookup result precede one automatic enrolled-passkey attempt. Cancellation offers explicit retry and method-gated OTP; Google is separate.
- `PasswordlessLoginClient` is an injection seam: begin(email, signal), passkey(flowId, signal), requestOtp(flowId, signal), google(signal). Provider implementation must verify credentials and authorize sessions server-side. Beginning a Google redirect is not authentication success.
- The default adapter is deliberately unavailable, with a visible preview notice and disabled Google action. No new customer-auth endpoint, account database, Google credential/configuration, real passkey, OTP delivery or authentication grant is introduced here. `renderLoginOtp` is the separate OTP owner's integration slot, not a fabricated completed OTP flow.
- Parallel member-auth backend work is in progress in this shared checkout and was not changed by this slice. Its current contracts cannot silently be treated as the requested email-first account lookup. Backend ownership/integration remains unconfirmed; the real login flow is NOT wired end to end.
- Future public enrollment-dependent method availability can reveal account information even without an explicit account-exists boolean; the backend owner must address that privacy tradeoff.

### Validation
- Focused new model/controller suites: 19 passed; combined measured coverage 98.58% lines, 92.68% branches, 97.50% functions. Wider affected frontend/source-render suites: 34 passed. Scoped ESLint, diff checks and frontend TypeScript check passed using `.output/authentication-ui-tsconfig.json`; canonical repository typecheck is not claimed green because concurrent member-auth/backend work is changing.
- `docs/qa/authentication-entry-browser-results.json`: final five passing local Chromium fixture runs, including three consecutive desktop workflows, 390x844 and 319x560. Covers all chooser dismissal paths; same DOM identity across morphs; eased intermediate geometry; focused centering/locking; inert faded chrome; Back and focus; synthetic visualViewport keyboard geometry; existing signup fixture copy/disposal; rapid Back/login reentry without duplicate IDs. No real auth/provider actions.
- Parent personally inspected the live chooser, centered signup and email-first login. Screenshots: `artifacts/qa/verification-20261024/authentication-entry/`.
- Physical Safari/keyboard/haptics, real passkey/WebAuthn, Google OAuth, customer-account lookup, OTP transport, customer session issuance and deployment remain separate unproven gates.

- Authentication UI Santa gate: two fresh, isolated reviewers using the same rubric independently PASS for local prototype acceptance. Both explicitly reject any claim of completed backend authentication. Their concise assessment: a deliberate account flow, not a disposable popup; a polished frontend is not a working authentication system.
