# Phone verification UI — 2026-10-12

> Archived development evidence. Relocated 2026-10-22; dated observations, source line numbers, review decisions, and test counts below are historical, not current release acceptance. Generated local screenshots and downloaded benchmark bundles are not retained here; reproduce QA against the current app before relying on them.

## Current direction

The first decorative/split-layout draft was rejected. Current design follows the
single-field xAI email-login reference: white background, compact modal form,
plain heading, finely divided phone input and black primary button. No editorial panel,
illustration, promotional copy or progress rail.

Preview: http://127.0.0.1:3240/studies/verification

The user confirmed that no receiving address is configured. The route is an
explicit disconnected preview. No phone data is sent or persisted, no composer
is launched, and no authentication grant is issued. Result controls are labeled
as screen simulations. All work is isolated from the concurrent teaser edits.

## Checks

### Multi-step modal and localization (current)

- `components/phone-verification/phone-verification-modal.tsx` exports
  `PhoneVerificationModal({open, onOpenChange, locale?, onLocaleChange?,
  initialLocale?, returnFocusRef?})`. Import `verification.css` at the integration
  boundary. Default language is Korean; controlled language should be paired with
  `onLocaleChange`. The provider otherwise keeps language locally.
- The study route opens the modal initially and leaves a reopening button behind
  it. Landing trigger integration is intentionally owned by the other session;
  none of the teaser, root-layout, or shared shadcn files were changed here.
- One Base UI/shadcn dialog shell, local step state, no step URLs or router calls.
  Number and challenge survive language changes. Editing the number preserves
  the input but invalidates the previous preview challenge. Dismissal deliberately
  discards the whole preview session, including its phone number and countdown;
  reopening starts fresh. Language stays selected while the provider is mounted.
- Countdown ticks are confined to their child; expiry is the only timer-driven
  update to the flow controller. No global store or form-wide subscription.
- The dialog provides focus trapping and document scroll lock. Escape/close
  dismiss; backdrop presses do not accidentally discard input. Pass a trigger ref
  for explicit focus restoration. The landing owner must pause/resume Lenis and
  story progression using the same controlled `open` state.
- English/Korean JSON catalogs use a local `next-intl` provider, without changing
  app routing or the landing page's locale architecture. Korean numbers only;
  English language does not imply international-number support.
- Reference: The Hideaway `src/components/UX/Tour/RegistrationTour.tsx:697–718`
  and `:912–959` retain the shell and change local steps. We did not copy its broad
  form subscriptions (`:720–750`), keyed pane remounts (`:959`), or routing.
- This is still a disconnected preview: result buttons simulate screens and
  never grant authentication or launch Messages/Mail.

Validation for this checkpoint:
- 28 focused phone tests; entire app suite 217/217; scoped ESLint, project
  TypeScript, and whitespace checks pass. Library-only coverage: 99.17% lines,
  97.56% branches, 100% functions. These are not component coverage claims.
- Countdown lifecycle tests exercise immediate synchronization, absolute-time
  ticks, pageshow/visibility resume, once-only expiry, listener/timer cleanup,
  queued-callback suppression, and localized timer semantics.
- Executed [`tests/browser/phone-verification.mjs`](../../tests/browser/phone-verification.mjs) through CUA: error and notice translation,
  locale changes retaining an active countdown, disabled composer, local Back,
  retained nonempty number, nine-Tab focus cycle, Escape and close-button focus
  restoration, clear-on-dismiss, and unchanged URL. Telephone values are redacted
  by browser tooling; the check deliberately does not inspect raw private input.
- Also exercised simulated mismatch, expiry/retry and success screens. Checked
  English at 320×568, Korean at 390×600, tablet 834×900 and desktop: no settled
  horizontal overflow; long message content scrolls inside the bounded modal.
- Current screenshots: `modal-mobile-en.png`, `modal-mobile-ko.png`,
  `modal-desktop.png`. Prior screenshots below are superseded.
- React, TypeScript and general-code reviews completed. The timer's accessible
  label finding was fixed with `role="timer"` and `aria-live="off"`.
- No production build/deployment, live provider integration, physical-device
  keyboard/carrier testing, screen-reader speech audit, or measured React Profiler
  benchmark is claimed. Timer isolation is established by component boundaries
  and lifecycle tests, not an end-to-end performance benchmark.

Earlier check counts and screenshots below are historical, not modal QA.

### shadcn input refinement

- Reuses existing Field / InputGroup / Base UI Input primitives; no new dependencies
  and no shared-component changes. Fixed Korea +82 inset, single editable number,
  tabular digits, scoped focus and invalid styles. No fake country dropdown.
- 14 focused tests pass; scoped ESLint and TypeScript pass.
- Browser checks: invalid submit focuses the input with red group border; entering
  a formatted +82 number and pressing Enter advances correctly; returning to edit
  preserves the number; prefix click focuses the input; Tab reaches Next.
- No horizontal overflow at 320×568 or 390×600. Mobile screenshot visually checked.
- Latest screenshots: shadcn-mobile.png and shadcn-desktop.png.

- RED: missing component/model; later minimal-layout assertion failed against
  the decorative draft. GREEN: 11 focused tests.
- Model coverage: 98.57% lines, 98% branches, 100% functions. Not UI coverage.
- Scoped ESLint, TypeScript and diff whitespace checks passed.
- Browser: invalid number focus/error, formatted phone input, disabled composer,
  waiting/disconnected status, explicit simulated completion, mismatch retry,
  simulated expiry retry and number editing exercised.
- 390×600 and 834×900: no horizontal overflow; short-mobile initial form inspected.
- Current screenshots: minimal-desktop.png and minimal-mobile.png. Earlier
  desktop.png and mobile-message.png show the rejected direction, not final QA.
- Real elapsed/background expiration and full keyboard journey were not tested
  end-to-end; countdown arithmetic is unit-tested.

## Transport boundary

The link helper is a compatibility candidate, not connected to the UI. Opening
Messages is not proof of sending, MMS selection, delivery or phone possession.
The web cannot silently send or force MMS instead of iMessage/RCS. Green bubbles
alone do not establish MMS. Email recipients/body prefilling are not guaranteed
by Apple's archived SMS-link contract. Physical iPhone/Android and Korean carrier
tests are required, including dual-SIM selection and unsupported plans.

Before live integration: configure the receiving address, implement server-issued
unique expiring one-use challenges bound to the normalized number/session, validate
trusted gateway origin and sender identity (not merely From/body), rate-limit,
and confirm verified state only through the server. Brevo inbound capability and
carrier email gateway behavior have not been verified here.

References inspected:
- https://accounts.x.ai/sign-in?redirect=grok-com&theme=light&email=true
- https://obtuse.kr/dev/free-phone-verification/
- https://developer.apple.com/library/archive/featuredarticles/iPhoneURLScheme_Reference/SMSLinks/SMSLinks.html
- https://support.apple.com/en-us/105087

Preexisting local-config caution: .env.template contains plausible SMTP values;
ignored/untracked with no available local Git history. Do not share it. Replace
with placeholders before distribution and rotate if exposed. No credentials were
printed, changed or externally tested during this task.
