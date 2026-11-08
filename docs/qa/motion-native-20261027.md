# Native Motion refactor — 2026-10-27

Local implementation and bounded verification, not a deployment or whole-app
pixel-equivalence certificate. Unrelated pre-existing working-tree changes were
preserved; nothing was staged or committed.

## Where to change things

| Behavior                                                                           | Owner / tuning location                                                       |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Chapter distances, geometry, transition durations and easing                       | `../../src/lib`                                                  |
| Scroll-to-step selection and adjacent/latest destination policy                    | `../../src/hooks`                                                 |
| Opening sequence                                                                   | `../../src/hooks`; shared cue values in `../../src/lib`       |
| Story reading hold (3.5 seconds), visibility threshold (85%) and pause eligibility | `../../src/hooks`                                                |
| Story scroll targets, progress segments and card presentation                      | `../../src/components`                                                 |
| Word blur, word-duration cap and reverse transition                                | `../../src/components`                                                    |
| Conversation colors, word stagger and typing loop                                  | `../../src/components`                                          |
| Orbit description presence                                                         | `../../src/components`                                                 |
| Invitation step variants and pending-navigation policy                             | `../../src/components`                                   |
| Film entrance/exit and ticket-number changes                                       | `../../src/components`, `../../src/components` |
| Shared loader and OTP caret                                                        | `../../src/components`, `../../src/components`                    |

Motion owns interpolation, elapsed time, sequences, repeat and playback controls.
Small local policies remain where Motion has no equivalent product behavior:
finish an adjacent chapter reveal before reversing, immediately retarget Story,
pause while hidden/unsettled, deliver an eligible completed hold once, and avoid
replaying the opening after a meaningful scroll excursion. Comments explain
these decisions rather than introducing another controller abstraction.

## Removed implementations

- Teaser: `step-queue`, `step-motion`, `story-playback`, `story-artwork`,
  `entry-controller`, `blur-tokens`, `conversation-motion`, `text-tokens`.
- Invitation: `step-motion` and `motion` factories; tickets: `motion` factory.
- Custom spinner/caret CSS engines and unused phone-verification pulse rules.

Editorial `content.ts`, date-formatting `motion.ts`, shared tuning and backdrop
geometry remain: these are not alternative animation engines. R3F/Three renders
the existing shaders; Motion already drives Lottie artwork frames. Lenis retains
scroll smoothing. Countdown/network timers, third-party widget animations and
ordinary CSS hover/border transitions were not replaced or redesigned.

## Verification

- **94/94 focused tests pass**, including real Motion playback with deterministic
  drivers. Opening sequence samples match the former independent animations at
  26 timestamps through six seconds; chapter interruption, endpoints, visibility,
  Story eligibility/restart and directional transitions are characterized.
- **150/150 broader motion/authentication tests pass**. Native `useAnimate`
  required adding `NodeList` to six existing JSDOM fixtures. The old phone test
  now checks the same ring geometry instead of the removed CSS animation class.
- Canonical TypeScript check and migration-source ESLint pass. The existing Warp
  chapter state was corrected from a boolean to `ChapterId` (`"hero"`) to repair
  its callback typing without changing the initial suspension behavior.
- Live browser, desktop 1280×800: settled Conversation and People screenshots
  are pixel-identical to captured pre-migration frames. Origin differs at four
  progress-bar pixels and Orbit at 31 pixels between independent captures.
  Animated hero/footer shader frames are time-dependent, not pixel-comparable.
- Story Pause retains the exact progress transform across 700ms; Play advances,
  the final card offers Replay, and Replay returns to story one. Manual reverse
  navigation passes. At 390×844, all five later chapters have no horizontal
  overflow. This is not physical-device or exhaustive mobile-animation proof.
- Account spinner retains the exact transform across a 300ms pause, then
  advances on resume. Caret opacity remains unchanged while paused.
- The legacy entry composition was also mounted locally: a fresh top visit
  moves navigation opacity from 0 to 1, and restored/return visits stay settled.
  Temporary QA routes were removed after inspection.
- Two independent Santa reviews pass the scoped correctness, readability,
  annotation and lifecycle rubric; no actionable migration issues remain.

Focused command (does not discover database-backed tests):

```sh
rtk proxy node --import tsx --import ./tests/support/css-modules.mjs --test \
  tests/teaser-step-queue.test.ts tests/teaser-step-motion.test.ts \
  tests/teaser-scroll.test.ts tests/teaser-playback.test.ts \
  tests/teaser-story-artwork.test.ts tests/teaser-blur.test.tsx \
  tests/teaser-conversation-motion.test.ts tests/teaser-text.test.ts \
  tests/teaser-entry.test.ts tests/teaser-entry-hook.test.ts \
  tests/teaser-entry-reset.test.ts tests/invitation-step-motion.test.ts \
  tests/invitation-film.test.tsx tests/ticket-study.test.ts \
  tests/motion/*.test.*
```

`tests/browser/motion-native.mjs` exports `runMotionChecks(page, baseURL)` for an
existing Playwright page. It checks pause, autoplay, replay, reversal, browser
errors and mobile overflow without submitting forms or writing provider data.

## Remaining independent gates

The broader teaser discovery run has three stale render-test failures:
`tests/teaser-render.test.tsx` expects retired notification selectors, mounts the
CMS provider without an App Router, and retains old static-fallback expectations.
Repository-wide lint has 26 errors in unrelated current Payload/settings work.
These were not hidden by weakening assertions or changing unrelated features.
The full database-mutating test runner and production build were not run, and no
whole-feature coverage percentage, deployment, provider or physical-device
acceptance is claimed.
