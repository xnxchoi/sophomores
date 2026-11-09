# Sophomores × Blink: motion fidelity reassessment

**Date:** 2026-10-03 · **Scope:** assessment only; no implementation edits, rebuild, deployment, or narrative rewrite.

**final result: blocked**

The settled compositions are substantially closer than the choreography. The largest remaining difference is **scroll
position directly driving intermediate poses**, where Blink usually converts scroll into a discrete target and lets an
independently timed transition finish. Longer reading holds are intentional; incomplete transitions are not a necessary
consequence of those holds.

This is a fidelity gate, not a claim that the preview is unusable. Current blockers are P1/P2 findings below. Report
verification is tracked separately from implementation acceptance.

## Evidence and provenance

- Reference: [blink.capital](https://blink.capital), live rendered page plus its observed public source dependencies.
  Downloaded scripts were inspected as text, not executed.
- Implementation: [local production preview](http://127.0.0.1:3210/). Existing public team link and running
  server/tunnel were left untouched. This report does not independently certify public-tunnel network performance.
- Artifact root **E**: `/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/`.
- [Reference source contract](/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/reference-source-inventory.md):
  section-by-section triggers, easing, durations, navigation, reverse behavior, responsive rules, exact source lines.
- [Implementation source contract](/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/local-source-inventory.md):
  corresponding local behavior and line references.
- Source shorthand below: **P** = `E/reference-page.formatted.js`; **C** = `E/reference-rendered.formatted.css`; **B** =
  `E/reference-bundle.formatted.js`; **N** = `E/reference-layout.formatted.js`; **L** = `E/reference-lock.formatted.js`.
  These are audit snapshots, not files to change.
- Numeric timings are **declared source values**, not frame-accurate browser timing measurements. Live DOM observations
  substantiate selected behavioral differences; screenshots substantiate composition, not elapsed timing.

### Capture normalization and limitations

Compared source first and implementation second together in each comparison input. Focused sheets explicitly place
source left / implementation right.

| Capture prefix in E          | CSS viewport, both pages | Saved pixels, both pages | State / admissible use                                                                                                                                  |
|------------------------------|--------------------------|--------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------|
| `desktop-hero-settled`       | 1440×900, DPR 1          | 1440×900                 | Settled hero, first notification. Composition, not cold-load timing.                                                                                    |
| `desktop-story-settled`      | 1440×900, DPR 2          | 2880×1800                | First card: reference at origin anchor, implementation manually selected/paused in first hold. Card geometry only; progress states deliberately differ. |
| `desktop-orbit-first`        | 1440×900, DPR 2          | 2880×1800                | First orbit pose, after anchor navigation settled.                                                                                                      |
| `desktop-conversation-first` | 1440×900, DPR 2          | 1440×900                 | First message pose; typing visibility comparison.                                                                                                       |
| `desktop-people-first`       | 1440×900, DPR 2          | 1440×900                 | First expanded-width card pose.                                                                                                                         |
| `desktop-footer`             | 1440×900, DPR 2          | 1440×900                 | Settled contact text/layout; **not reliable for fixed-canvas visibility**.                                                                              |
| `tablet-people`              | 768×1024, DPR 2          | 768×1024                 | Natural vertical card stack, section start.                                                                                                             |
| `mobile-orbit`               | 375×812, DPR 2           | 375×812                  | First orbit pose, section start.                                                                                                                        |
| `mobile-people`              | 375×812, DPR 2           | 375×812                  | Natural vertical card stack, section start.                                                                                                             |
| `mobile-footer`              | 375×812, DPR 2           | 375×812                  | Settled contact text/layout; **not reliable for fixed-canvas visibility**.                                                                              |

Each prefix has `-reference.png`, `-implementation.png`, and `.json` with scroll position, CSS viewport, density,
element geometry, computed styles, and font readiness. DPR-2 captures at CSS pixel dimensions used clip scale 0.5; the
two larger pairs retain 2× pixels. The focused story sheet downsamples both 2:1 before cropping. No comparison treats a
2× image as CSS size.

Capture tooling proved imperfect: native capture and CDP emulation disagreed about backing dimensions; some CDP scroll
captures disturbed subsequent scroll position or omitted fixed composited layers. Consequently:

- **Excluded**: `capture-test-*`, `direct-*`, `desktop-story-entry-*`, `mobile-story-final-*`. The last pair is blank
  capture output, not evidence of blank website content.
- Do not infer missing navigation or missing footer artwork from CDP captures. A separate native screenshot plus live
  DOM inspection confirmed the implementation footer canvas exists, is visible, and renders an orb. Footer
  clipping/entry continuity is **not cleared** by this audit.
- Timing observations were made **without intervening screenshots**. Later navigation restored target states before
  subsequent composition captures.
- Mobile/tablet here are CSS viewport tests, not physical-device or touch emulation. No claim of complete touch QA.

## Findings — prioritized fixes

### F1 · P1 · Orbit stops between its designed positions

**Evidence:** Blink selects three discrete steps, rotates −90° per step over **1.2 s**, easing `(.33,1,.68,1)`, and
throttles displayed-step changes to **1.3 s** (P:720–724; C:431–445). Local rotation directly follows the fractional
scroll position in [orbit.tsx](/Users/seanschoi/Projects/soph-co/components/teaser/orbit.tsx:38).

In [orbit-observation.json](/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/orbit-observation.json),
after one 760px wheel input from each first-pose anchor and no further input, reference settles at −90° while local
remains approximately −60.6° with its **second description fully visible**. This is not a speed benchmark: the section
distances deliberately differ. It demonstrates that local can hold an incomplete geometric pose indefinitely. Initial
layouts are close in `desktop-orbit-first` and `mobile-orbit`.

**Impact:** the new copy can describe a marker/title that has not reached the reading position; the transition feels
dragged rather than directed.

**Fix:** retain longer scroll holds, but derive a discrete target index and animate the ring to the completed pose using
Motion. Separate target index, displayed index, and transition completion. Fast scroll should advance/cancel predictably
rather than strand the ring mid-turn. Do not add autoplay here—Blink has none.

### F2 · P1 · Orbit copy uses the wrong transition family

**Evidence:** reference description is keyed **out-then-in**: old text exits upward 60px over 600ms after a 200ms delay,
then new text enters upward from +40px over 1200ms; easing `(.5,0,0,1)` (P:748–759; C:1225–1238). It is **not blur
text**. Local [orbit.tsx](/Users/seanschoi/Projects/soph-co/components/teaser/orbit.tsx:18)
and [text-tokens.ts](/Users/seanschoi/Projects/soph-co/lib/teaser/text-tokens.ts:2) use scroll-scrubbed opacity/4px blur
and a shared zero-opacity midpoint. Live orbit observation records reference `filter:none` and local blur channels.

**Impact:** circle, title and body have different pacing and handoff relationships from the benchmark, even when
endpoint screenshots look close.

**Fix:** use a keyed Motion presence sequence with exit-before-enter and dedicated orbit-copy tokens. Coordinate its
roughly 2-second full handoff independently of the ring's 1.2-second rotation; test interruptions in both directions. Do
not apply the heading blur preset everywhere.

### F3 · P1 · Stories autoplay, but the card transition is still a different mechanism

**Evidence:** Blink accumulates cards, entering at **scale 0→1 from the top-right**, 500ms plus 50ms delay, easing
`(.5,0,.5,1)`; reverse removes later cards with scale-out and negative margin adjustment (P:613–639; C:1296–1369).
Local [story.tsx](/Users/seanschoi/Projects/soph-co/components/teaser/story.tsx:48) scales .85→1 and fades during
fractional scroll; the track translates by card width+8px
([line 111](/Users/seanschoi/Projects/soph-co/components/teaser/story.tsx:111)). No independent completed entrance
tween.

**What is now correct:** both advance autonomously and stay on the last card rather than automatically leave the
section. [story-observation.json](/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/story-observation.json)
records reference one→four mounted cards after a small activation scroll, and local ending at Replay. It does not
measure exact cycle durations.

**Timing distinction:** reference timer/fill 3s, automatic scroll .8s, manual half-stage tap .6s. Local timer/fill 5s,
automatic scroll .6s, numbered selection immediate. The longer reading duration is consistent with the user's requested
holds; **5s is not itself filed as a bug**. Local hover/focus/pause controls are intentional accessibility additions,
not missing autoplay.

**Impact:** local feels like a continuously translated strip, not cards arriving as separate beats. Progress switches
with the rounded step before the incoming card has completely settled.

**Fix:** use Motion-driven discrete card entrances/removals and derive progress ownership from the displayed card, not
the half-transition scroll index. Keep 5s configurable, retain Pause/Replay and reversible manual control. Restore
source-like left/right tap areas only alongside—not instead of—semantic controls. Recheck final-state and fast-reverse
behavior with video/frame evidence before acceptance.

### F4 · P2 · Two story illustrations have lost their internal motion

**Evidence level: source-confirmed; later-card visual phase comparison remains open.** Reference second/third cards use
looping circle/line Lottie animations (P:521–562; animation component defaults documented in reference inventory). Local
second card is [story-orbit.webp](/Users/seanschoi/Projects/soph-co/components/teaser/story.tsx:83); third uses a static
`story-lines.webp` background in [teaser.css](/Users/seanschoi/Projects/soph-co/app/teaser.css:234).

**Impact:** the pinned reading time becomes visually static where the source has continuing internal motion. A still
image cannot reproduce that behavior.

**Fix:** reproduce the measured internal animation using legitimate existing assets or Motion-driven equivalents after
visually inspecting the reference loops. Preserve static reduced-motion alternatives. Do not assume the alligator also
needs animation: the reference conversation image is itself static.

### F5 · P1 · Conversation lacks the staged bounce, word reveal, and correct typing state

**Evidence:** `desktop-conversation-first` shows local typing beneath the **first** message; reference first message has
none. Reference typing belongs only to the active **middle** card (P:850–868,887–891). Dots cycle at 800ms with
0/200/400ms offsets (C:761–817).
Local [conversation.tsx](/Users/seanschoi/Projects/soph-co/components/teaser/conversation.tsx:68) shows a static
ellipsis through poses 0–1 and fades it toward pose 2.

Reference card mounts bounce scale 0→1.1→1 over 800ms; positions separately transition over 800ms with `(.5,0,0,1)`.
Message words have 50ms start offsets and 200ms vertical fades; active/away colors interpolate over 350ms (C:
579–817,1262–1294). Local [conversation.tsx](/Users/seanschoi/Projects/soph-co/components/teaser/conversation.tsx:23)
scrubs pose/scale/opacity; text is static and the active CSS class changes at the rounded midpoint.

**Impact:** it reads as three scroll-transformed boxes rather than a timed exchange. Typing suggests the wrong beat and
has no living cadence.

**Fix:** separate card arrival, stack relocation, word reveal, typing lifetime, and color transition into coordinated
Motion channels. Keep step advancement scroll-driven; Blink does not run a conversation autoplay timer. Animate only the
intended active typing state. Keep the image static unless a new art decision is made.

### F6 · P1 · Entry sequence order still differs materially

**Evidence level: source-confirmed sequence difference; matched cold-load filmstrip still required.** Reference glyphs
activate individually every 150ms, logo docks across a 3s sequence, navigation is requested at 2s and finishes its 3s
entry near 5s; notifications mount at **5s** (P:45–99,210–221,320–338; C:137–199,1371–1392).
Local [entry-tokens.ts](/Users/seanschoi/Projects/soph-co/lib/teaser/entry-tokens.ts:2) applies one shared glyph
flicker, finishes dock/nav near **3s**, and introduces notifications at **3–3.5s** while backdrop scaling continues
until 5s.

**Impact:** major events overlap in a different order; identical total intro duration would not make these sequences
equivalent. `desktop-hero-settled` confirms a close final notification shell, not entry parity.

**Fix:** author a Motion sequence with independent glyph, logo, navigation, backdrop, and notification tracks. Match
relative cues rather than freezing input for five seconds by default. Preserve reduced-motion and hidden-tab handling.
Verify slow WebGL readiness separately; do not let loading races determine the intro timing.

### F7 · P2 · Notifications omit their own entrance and text choreography

**Evidence:** source card entrance is 400ms scale bounce 0→1.1→1; title has a 300ms bounce after 100ms; body words
fade/translate for 200ms with 50ms staggering (P:111–150; C:1256–1281,1747–1760).
Local [hero.tsx](/Users/seanschoi/Projects/soph-co/components/teaser/hero.tsx:93) only fades the first container and
scrubs the second from .85→1. Text is present without an individual reveal. The focused hero sheet verifies that size,
padding, radius and type treatment are already close.

**Fix:** implement a reusable **message reveal**, separate from `BlurText`: word start delays, not growing durations;
nested title/card motion, not a paragraph blur. Trigger once on notification arrival and explicitly define
reverse/remount behavior.

### F8 · P2 · Heading blur primitive is close; hero handoff is not

**Evidence:** source heading words start together from blur12px/y20px/opacity0, with later spans taking progressively
longer in .2s increments—not staggered delays (C:101–124,1419–1429).
Local [blur-tokens.ts](/Users/seanschoi/Projects/soph-co/lib/teaser/blur-tokens.ts:2) now follows that family, capped
at2.2s. This is meaningful progress and should not be replaced with a generic word stagger.

Reference hero hides the header, waits350ms, then reveals its statement (P:309–318). Local activates `BlurText` at
position1.5 while header fading continues until1.65
([hero.tsx](/Users/seanschoi/Projects/soph-co/components/teaser/hero.tsx:53)); reversing below the threshold instantly
hides it. People/footer use one-shot viewport triggers with different thresholds from the source.

**Impact:** the blur can be tasteful in isolation but still overlap the preceding content or vanish abruptly during a
reversal.

**Fix:** sequence outgoing header completion → heading reveal; define interruption/reset behavior explicitly. Preserve
the source's three distinct text families: heading blur resolution, message word stagger, orbit slide-fade. Match
perceived total duration to Sophomores' word count rather than copying source span counts blindly. Needs paired
transition frames, not only settled heading screenshots.

### F9 · P2 · People uses a different easing envelope, but its responsive structure is correct

**Evidence:** reference narrows cards in three discrete width states with **1.4s cubic-bezier (.5,0,0,1)** plus a
separate one-second horizontal entrance (C:898–939,1175–1187). Local changes layout at rounded steps using spring
stiffness120/damping24 and no separate card entrance
([narrative.tsx](/Users/seanschoi/Projects/soph-co/components/teaser/narrative.tsx:23)). Initial desktop/card geometry
is close in `desktop-people-first`.

Both switch to a natural vertical stack below1024px: `tablet-people` and `mobile-people` visibly confirm it. **Do not
add pinned mobile expansion as a fidelity fix.** Differences in heading height from changed copy are expected.

**Fix:** use an explicit eased width/layout progression and separate entrance timing if source fidelity is the goal;
retain the current responsive stack. Verify end-of-pin release at short heights. Source says discrete transitions, not a
continuously scrubbed accordion.

### F10 · P2 · Navigation bypass and footer exit are not coordinated like the source

**Evidence level: source-backed; some live navigation/focus checks, not complete lifecycle parity.** Source nav
selection teleports immediately and suppresses intermediate transition effects for150ms (N:385–400); Skip travels1.2s.
Local anchors use smooth Lenis traversal without the same bypass contract. Source menu fades away over750ms; local
footer class uses `visibility:hidden` ([teaser.css](/Users/seanschoi/Projects/soph-co/app/teaser.css:528)). Local intro
nav finishes earlier (F6).

**Impact:** selecting a distant chapter can run through intermediate effects instead of presenting the selected scene
cleanly; footer navigation can disappear abruptly.

**Fix:** distinguish normal scroll, menu jump, Skip, and story advance. Use an explicit navigation intent/bypass flag
with Motion-controlled visibility. Preserve the local mobile menu's semantic button, Escape dismissal, and focus return,
which were verified.

## Footer status: still open, not falsely cleared

The source independently mounts the same looping video at the footer, top60%/height180%, plus a black-to-transparent
gradient (P:1169; C:1150–1156). It is not the hero object merely returning.
Local [scene.tsx](/Users/seanschoi/Projects/soph-co/components/teaser/scene.tsx:8) switches from shared `FlameBackdrop`
to legacy `FooterOrb`, without a crossfade; the experimental `FlameFooterBackdrop` is not wired into this teaser.

The approved 3D substitution does **not** require copying source video pixels. The source/current renderer discontinuity
is real at code level; its exact visible pop or clipping is **unverified** because fixed-canvas emulated captures were
unreliable. `desktop-footer` / `mobile-footer` remain valid for text/layout but must not be used to claim the orb is
absent. A separate native screenshot confirmed an orb is present.

**Next acceptance check:** use a reliable viewport capture/video to follow entry from People into the footer,
at1440×900,375×812 and short-height phone landscape. Confirm intended silhouette, no rectangular clipping seam, stable
canvas readiness, readable CTA, and reverse exit. Then choose whether the shared footer renderer or a corrected legacy
composition is the intended Sophomores art direction. Do not replace shared flame work during an audit.

## Per-element coverage ledger

| Element                    | Current assessment                                                   | Remaining proof                                         |
|----------------------------|----------------------------------------------------------------------|---------------------------------------------------------|
| Logo/flicker/docking       | Final shell close; sequence mismatch F6                              | Matched cold-load and late-WebGL filmstrips             |
| Hero 3D/video choreography | Intentional asset change; both scale/fade, different source curves   | Scroll fade timing + pointer on actual desktop hardware |
| Notification1/2            | Shell close; card/body reveal absent F7                              | Second-card transition frames                           |
| Hero statement             | Correct blur family; overlap/reset mismatch F8                       | Forward/reverse threshold video                         |
| Story cards / timer        | Autoplay exists; final hold exists; card entrance mismatch F3        | Every card forward/reverse frame sequence               |
| Story internal artwork     | Static substitutions F4                                              | Loop appearance and reduced fallback comparison         |
| Orbit ring/title/body      | Endpoint layout close; wrong transition model F1/F2                  | Rapid reversal and queued-step interruption             |
| Conversation stack         | First shell close; orchestration mismatch F5                         | Middle/final bounce, relocation and word frames         |
| Typing                     | Wrong active lifetime + static dots F5                               | Correct middle-state timing after future fix            |
| Conversation image         | Reference is static; no video needed                                 | Final-card crop/asset close-up not completed            |
| People heading/cards       | Desktop endpoint close, easing mismatch F9; responsive stack matches | Full desktop expansion/reverse/short-height release     |
| Footer text/CTA/art        | Text family close; functional preview dialog; artwork remains open   | Reliable canvas clipping and entry/exit capture         |
| Desktop/mobile nav/Skip    | Basic destinations work; bypass/exit mismatch F10                    | Full keyboard journey and exact767px boundary           |

## Five required fidelity surfaces

1. **Fonts/typography:** visible serif display + narrow uppercase mono hierarchy closely match in paired hero
   notification/story crops and orbit screens. Loaded-font readiness and computed sizes are recorded in JSON. Source
   names Nib Pro/Guida Mono Pro; local uses generated font aliases. This is not a font-binary/licensing audit. Story
   title metrics retain small rhythm differences (local32px/1.35 versus reference's source sizing), but changed line
   counts largely follow approved copy. No antialiasing defect is claimed from differently composited captures.
   Typography during animation remains blocked by F2/F5/F7/F8.
2. **Spacing/layout:** first story outer size328×585,24px padding,8px radius and orbit164vw geometry are close. People
   stack and footer column collapse behave coherently in inspected phone/tablet states. Longer section scroll distance
   is intentional. Not a blanket no-clipping pass: final cards, short-height and fixed-footer seam remain unverified.
3. **Colors/tokens:** purple notification/blue story/black canvas/orange message palette is recognizably retained.
   Computed palette samples are in JSON; dynamic active/away color orchestration differs (F5). No full WCAG contrast
   pass performed.
4. **Imagery/assets:** hero shared flame is intentional. First two People orb assets visually track the source in
   desktop/tablet/phone captures. Story animation reduced to raster images is F4. Footer is legacy renderer, not shared
   footer flame. Conversation image is static in reference too; final crop not signed off. No new invented assets or
   image generation in this pass.
5. **Copy/content:** Sophomores content and longer lowercase wordmark are intentional substitutions, not fidelity bugs.
   Ticket opening remains provisional “~10 days,” not event date. The user's real founder story has not been applied in
   this pass. The dialog clearly says no email collected/no reservation made. Copy lengths must be accommodated in
   timing/wrapping, not used to justify missing effects.

### Focused visual evidence

- [Notification detail pair — reference left](/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/desktop-hero-settled-detail-pair.png):
  shell/type/padding, exact crop430×170px per side.
- [Story detail pair — reference left](/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/desktop-story-settled-detail-pair.png):
  normalized2:1 then340×250px crop per side. Header/title metrics; **not** a progress synchronization test because local
  is paused.

Full-view evidence is indexed above. Remaining fine details (later story illustration phases and final conversation
image) are explicitly not cleared by a full-page screenshot.

## Browser QA / safety checks

- Local console query: no warning/error entries returned for the inspected tab. Bounded reload smoke:25 responses, no
  recorded4xx/5xx, no loading-failure events, no event
  truncation. [smoke.json](/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/smoke.json). This reload
  was under reduced-motion emulation; it does not establish every normal-mode lazy WebGL asset or public network path is
  error-free.
- Desktop nav destinations exercised: Origin, The idea, The first night, The people, The invitation. Direct hashes used
  for responsive comparisons. Not all navigation permutations tested.
- Mobile menu opens and focuses first link; Escape closes and returns focus to toggle. Invitation preview opens, focuses
  Close; Escape closes and restores focus to CTA. No data submitted or
  stored. [Interaction record](/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/interaction-checks.json).
- Live reduced motion: all4 story cards become opacity1/transform none; stage becomes relative; no document horizontal
  overflow in that
  observation. [reduced-motion.json](/Users/seanschoi/Projects/soph-co/artifacts/qa/benchmark-2026-10-03/reduced-motion.json).
  This is a targeted check, not screen-reader certification.
- **Unmeasured:** LCP, CLS, INP; axe-core; full keyboard traversal; screen reader; text zoom; no-JS; physical touch;
  short-height/landscape;767px edge; all animation cancellation cases. No invented scores or 80% visual-coverage claims.
- Forms/auth/payment: not applicable to this preview; CTA is explicitly a non-submitting dialog.
- **Browser-QA verdict: DO NOT SHIP as a benchmark-fidelity-complete build.** Existing team preview can remain
  available; no production release assessment is implied.

## Ordered implementation checklist

1. Separate **scroll target → displayed step → Motion transition completion**. Preserve longer hold distances. Keep
   Lenis for scrolling, Motion for animation; no bespoke RAF tween engine needed.
2. Fix orbit ring and out-in description together (F1/F2). Acceptance: stop scrolling mid-threshold; ring settles into
   the reading pose and text handoff completes; reverse remains coherent.
3. Fix story card arrival/removal and progress ownership (F3), then internal loops (F4). Preserve5s reading option,
   pause/replay, final hold and keyboard controls.
4. Add shared message-reveal tokens for notifications/chat; correct typing, bounce, colors (F5/F7). Do not reuse heading
   blur here.
5. Re-orchestrate entry and hero heading handoff (F6/F8), with cold-load and slow-renderer checks.
6. Match People easing/entrance without pinning mobile (F9); then nav jump/bypass/exit (F10).
7. Resolve footer composition with reliable canvas evidence, not the flawed capture artifacts. No automatic
   art-direction switch.
8. Re-capture matching transition states and run keyboard/touch/reduced-motion/short-height validation. Only clear
   fidelity after all actionable P1/P2 findings have post-fix evidence.

## Comparison history and review gate

This is the **first reassessment iteration**, not a repair iteration. Invalid capture methods were corrected/excluded;
that is evidence repair, not a website fix. No implementation finding was repaired in this pass, so no post-fix pass is
claimed.

Two independent fresh-context reviewers checked this report against the same rubric: claims traceable to source/live
evidence; timing declarations distinguished from measurements; valid paired states/density; intentional deviations
preserved; coverage gaps explicit; concrete prioritized fixes; no application mutation. Their verdict concerns **report
trustworthiness only**, not implementation acceptance.

**Report review: PASS / PASS, round 1 of maximum 3.** Reviewers `audit_santa_b` and `audit_santa_c` found no blocking
inaccuracies or unsupported claims. Both were read-only and isolated from each other's review. One optional suggestion
remains: archive the transient native footer screenshot; its visual observation is currently preserved in the
conversation and interaction record, not a standalone image artifact. No assertion of complete footer fidelity depends
on it.

**Cleanup:** temporary audit tabs closed; viewport and reduced-motion emulation reset. Team preview tab, server and
tunnel preserved. Only the report and evidence artifacts were created/updated.

**final result: blocked** — F1–F10 remain actionable; footer capture/continuity and listed lifecycle coverage remain
open.

## Follow-up repair — internal motion and 20% section extension (2026-10-03)

This is a bounded implementation follow-up, not clearance of the full F1–F10 audit.

- Sticky stages remain. Scroll now selects a discrete destination; Motion completes the active adjacent tween, then
  follows the latest pending destination. Reverse/rapid seeks no longer cancel midway. Explicit settlement gates story
  reading timers.
- Outer chapter heights are multiplied by 1.2: hero 312svh; origin/idea/chat 456svh; desktop People 355.2svh; invitation
  minimum 120svh. Responsive People remains a natural stack with 408px tablet / 420px mobile cards and increased
  spacing.
- Orbit body uses sequential exit/enter sliding. Chat restores per-word entrance and the middle-step typing loop. Story
  circle/lines now render the benchmark's source Lottie data with a Motion frame clock; static fallbacks and the
  draft/reference asset restrictions still apply. No new backend or copy work.
- Browser evidence: desktop orbit reaches -90 and -180 degrees after wheel input ends; chat typing has independently
  changing opacity at fixed scroll; circle and lines SVGs both changed between samples at identical scroll positions.
  Story autoplay advanced through cards without wheel input; explicit Play/Pause and manual selection were exercised.
- Production candidate checked at 390x600 (no horizontal overflow, 72px circle), and exact 834x900 tablet metrics (408px
  People cards, no overflow). Global pause and system reduced motion expose all three orbit descriptions; invitation
  opens and Escape dismisses. Temporary emulation cleared. These are browser checks, not real-device touch or a full
  lifecycle suite.
- Evidence screenshots: `artifacts/qa/unfreeze-2026-10-03/story-circle-desktop.png`, `story-lines-desktop.png`,
  `story-mobile.png`. Stationary SVG sampling is logged in this chat; screenshots alone do not establish animation
  timing.
- Validation: 89 tests passed; scoped lib/teaser coverage 99.32% lines, 96.83% branches, 99.15% functions. Typecheck,
  focused lint, isolated production build passed. Broad lint still includes downloaded reference bundles and is not a
  clean app-source signal. React queue reviewer approved; artwork review's error fallback race fixed. This does not
  establish 80% mounted-component lifecycle coverage.
- Existing shared tunnel now serves verified standalone build `/tmp/soph-co-motion.f9PsFG/.next/standalone` on 3210.
  Source checkout `.next` was not overwritten during the running preview. Temporary 3211 server stopped; original
  standalone build remains available for rollback. Keep the snapshot until preview is no longer needed.

Remaining: complete entry/footer benchmark fidelity, full lifecycle/touch and visual timing comparison, and
non-production reference asset replacement/licensing. The earlier audit remains blocked overall.

## Follow-up — main teaser Tailwind migration (2026-10-17)

This is a styling migration, not completion of the earlier benchmark-fidelity audit.

- Migrated eight main-teaser TSX files plus shared `styles.ts` to Tailwind utilities. `../../src/styles` shrank from
  1,003 to 243 lines (75.8%): 79 lines of base/reset, root variables, progress-hover and flame-fallback rules;
  17 lines of responsive Motion variables; 147 lines of accessibility rules.
- Motion timing/hooks, scene/flame rendering, OTP, studies and preview authentication were not changed in this slice.
- Browser comparison sampled 186 elements across 1440×900, 768×1024, 390×844, 1024×600, 390×600 and 1920×1080,
  in animated and reduced-motion modes. Visible reduced-motion computed-style parity was exact. Sampled animated
  differences were confined to unchanged lazy-image intrinsic sizing; desktop-hidden mobile-menu child styles differ
  intentionally without a visible effect. This is not a pixel-perfect animated screenshot comparison.
- Review caught a short-height/width breakpoint cascade intersection. Four `[&&]` specificity fixes passed a
  RED/GREEN compiled-CSS regression and browser checks at 1920×600, 900×600, 1728×650 and 1920×651.
- Exercised mobile-menu navigation/Escape, story autoplay/replay/pause, and dialog bounds/Escape/focus restoration.
  Standalone production on local port 3211 passed CSS parity and a no-JavaScript fallback smoke check: opaque story
  cards, no transforms, relative stage positioning, hidden controls and no horizontal overflow. No production-console
  errors were observed in the sampled checks.
- Validation: 236 tests passed; scoped `../../src/lib` coverage was 98.64% lines, 96.10% branches and 99.37% functions.
  Typecheck, lint and production Next.js build passed. These coverage figures are not mounted-component coverage.
- Evidence is retained locally in ignored `.deployment/runs/tailwind-20261017/`. No deployment or commit was made.

Physical-mobile validation, complete accessibility/lifecycle coverage and full animated visual comparison remain
unclaimed. The earlier benchmark-fidelity audit remains open; this migration does not clear its remaining findings.
