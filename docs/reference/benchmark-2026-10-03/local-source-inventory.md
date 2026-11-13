# Local source inventory — 2026-10-03

> Archived development evidence. Relocated 2026-10-22; dated observations, source line numbers, review decisions, and test counts below are historical, not current release acceptance. Generated local screenshots and downloaded benchmark bundles are not retained here; reproduce QA against the current app before relying on them.

Scope: read-only inspection of the current `<home>/Projects/soph-co` teaser implementation. No browser observations, reference-site measurements, production edits, or runtime tests are asserted here. Values below describe source intent, not visual fidelity. This file is the only artifact owned by this inventory task.

## Shared execution contract

- Entry: `<home>/Projects/soph-co/app/page.tsx:1` mounts `TeaserExperience`; `<home>/Projects/soph-co/components/teaser/experience.tsx:31` composes Hero → Story → Orbit → Conversation → People → Invitation.
- Pinned progress is section start meeting viewport start through section end meeting viewport end. Motion maps progress onto piecewise flat holds and linear transitions, then `Math.round(position)` produces the integer step. Height is `100 + travelVh` in **svh**, not a duration. `<home>/Projects/soph-co/components/teaser/use-chapter-scroll.ts:10`; `<home>/Projects/soph-co/lib/teaser/choreography.ts:21`.
- Most scroll transforms have no explicit easing or duration; the time experienced depends on user scrolling plus Lenis. Lenis uses `lerp: 0.1`, smooth wheel, native touch (`syncTouch: false`), and anchor support. `<home>/Projects/soph-co/lib/motion-tokens.ts:14`.
- Active chapter detection is a separate threshold: section start/end crossing **40% viewport height**. This drives navigation and scene activation, not the pinned position thresholds. `<home>/Projects/soph-co/components/teaser/use-chapter-activity.ts:6`.
- Normal stages are sticky, top 0, height 100svh, overflow hidden. People differs at 100svh − 88px. `<home>/Projects/soph-co/app/teaser.css:81`, `:400`.

### Scroll budget (distance after section reaches viewport top)

| Chapter | Section height | Holds | Transitions | Integer-step thresholds |
|---|---:|---|---|---|
| Hero | 260svh | 0–40, 60–100, 120–160svh | 40–60, 100–120svh | 50, 110svh |
| Stories / origin | 380svh | 0–55, 75–130, 150–205, 225–280svh | 55–75, 130–150, 205–225svh | 65, 140, 215svh |
| Orbit / how | 380svh | 0–70, 105–175, 210–280svh | 70–105, 175–210svh | 87.5, 192.5svh |
| Conversation / strategy | 380svh | 0–70, 105–175, 210–280svh | 70–105, 175–210svh | 87.5, 192.5svh |
| People | 296svh | 0–50, 73–123, 146–196svh | 50–73, 123–146svh | 61.5, 134.5svh |

Derived from `<home>/Projects/soph-co/lib/teaser/choreography.ts:9–35`. These budgets do not apply to People below 1024px or the global still layout. Browser dynamic viewport/scrollbar differences can affect measured pixel equivalents.

## Per-element contracts

### 1. Entry wordmark and hero backdrop

- **Trigger/order:** mount, not image/WebGL readiness. Glyph opacity begins immediately with 0.4→0.4→1→0.4→1 over 1.5s, key times 0/.2/.35/.5/1. Backdrop fades 1–2s. Wordmark docks and nav enters 1.5–3s. Backdrop scales .77→1 from 2–5s. Notifications enter 3–3.5s. All channels use cubic Bézier (.37,0,.63,1). `<home>/Projects/soph-co/lib/teaser/entry-tokens.ts:2`; `<home>/Projects/soph-co/components/teaser/use-entry.ts:20`.
- **Wordmark style:** all glyphs share opacity; no stagger/randomized glyph flicker. Vertical displacement is `(50svh − .425em − 12px) * (1 − dock)`. Each glyph subsequently shifts left by its proportional share of notification width+24px during notification fade. `<home>/Projects/soph-co/components/teaser/hero.tsx:21–40`, `:64–89`.
- **Hold/exit/reverse:** entry is one-shot per mount, with hidden-document pause/resume and no scroll replay. Header stays opaque until hero position 1, fades to zero by 1.65 (100–113svh). Scroll reverse restores header; does not replay entry. `<home>/Projects/soph-co/components/teaser/use-entry.ts:45–68`; `<home>/Projects/soph-co/components/teaser/hero.tsx:53`.
- **Scene:** hero FlameBackdrop uses gilded-flame, no palette transition, base scale 1.6 multiplied by entry scale and `(1 + .58 * heroProgress)`, y 0→12%. Hero progress is position/2. Scene opacity fades position 1→2 (100–120svh). `<home>/Projects/soph-co/components/teaser/scene.tsx:11–43`; `<home>/Projects/soph-co/lib/teaser/backdrop-tokens.ts:1`; `<home>/Projects/soph-co/components/teaser/experience.tsx:48–49`, `:94–108`.
- **Shared flame behavior:** 12s procedural loop, 30fps cap, DPR≤1.5, render size≤1440; ignition is disabled and fire intensity 0 in the imported default config. Pointer uses fine-hover devices only (touch excluded), angular follow rate 3.8, radial 10, attack 5, release 9; this is exponential following, not a fixed-length tween. `<home>/Projects/soph-co/components/flame-backdrop/config.ts:23–38`; `<home>/Projects/soph-co/components/flame-backdrop/renderer.ts:135–142`, `:175–176`, `:196–245`.
- **Pause/fallback:** renderer suspends when document hidden or chapter inactive, pauses for global still/low-end mode, respects live reduced motion, logs rendering failure and exposes radial CSS fallback. No focus-driven scene pause; window blur releases pointer rather than stopping the loop. `<home>/Projects/soph-co/components/flame-backdrop/FlameBackdrop.tsx:74–98`; `<home>/Projects/soph-co/components/flame-backdrop/renderer.ts:244–252`; `<home>/Projects/soph-co/app/teaser.css:617`.
- **Responsive:** wordmark 64px desktop, 44px ≤1023px, clamp(28px,8.2vw,48px) ≤767px, 80px ≥1728px. Mobile notification-space=0 removes lateral wordmark compression. `<home>/Projects/soph-co/app/teaser.css:97`; `<home>/Projects/soph-co/app/teaser-responsive.css:1–68`.

### 2. Notification cards and text

- **Trigger:** first card and entire notification container fade 0→1 at 3–3.5s; text has no separate animation. Second card opacity 0→1 and scale .85→1 follow hero position 0→1 (40–60svh). `<home>/Projects/soph-co/components/teaser/hero.tsx:54–59`, `:93–117`; `<home>/Projects/soph-co/lib/motion-tokens.ts:5`.
- **Hold/exit:** both are inside the shared header exit (position 1→1.65). Reverse restores scroll transforms. No independent first-card dismissal, text typing, blur, pointer, or focus behavior.
- **Style/responsive:** purple #690de2, 8px radius, 24px padding, 4px stack gap; width 408px desktop, 360px tablet, left/right 12px below wordmark on mobile. `<home>/Projects/soph-co/app/teaser.css:103–132`; `<home>/Projects/soph-co/app/teaser-responsive.css:22–72`.

### 3. Hero statement / shared heading resolution

- **Trigger:** explicit boolean activates at hero position ≥1.5 (110svh), then starts wall-clock word resolution. Hidden state opacity 0, blur12px, y20; visible opacity1, blur0, y0. All words start together; duration grows by .2s per word index, capped 2.2s, easing (.42,0,.58,1), **zero delay**. First word duration=0. `<home>/Projects/soph-co/components/teaser/hero.tsx:60`, `:119–125`; `<home>/Projects/soph-co/lib/teaser/blur-tokens.ts:2–16`; `<home>/Projects/soph-co/components/teaser/blur-text.tsx:39–53`.
- **Hold/exit/reverse:** held visible once threshold crossed; reverse below threshold immediately resets hidden with duration0, permitting another reveal when recrossed. No distinct forward outro before sticky stage leaves. Heading timer has no explicit hidden-tab/focus pause unlike entry and stories.
- **Responsive:** centered 64px serif, 80px wide, 40px mobile; mobile top moves to 50%−100px. `<home>/Projects/soph-co/app/teaser.css:133`; `<home>/Projects/soph-co/app/teaser-responsive.css:1`, `:73`.

### 4. Stories and progress

- **Scroll contract:** track moves left `position * (story width+8px)`. Each incoming card scales .85→1 and opacity0→1 over the preceding position interval; past cards remain fully visible and move offscreen rather than fading/scaling out. `<home>/Projects/soph-co/components/teaser/story.tsx:51–61`, `:116–120`.
- **Autoplay:** 5s linear progress fill; once complete, advances scroll to the midpoint of the next hold with .6s Lenis duration. Browser-native smooth scroll is fallback and does not guarantee .6s. Final story stays complete until Replay. `<home>/Projects/soph-co/lib/teaser/story-playback.ts:4–19`; `<home>/Projects/soph-co/components/teaser/story.tsx:121–149`, `:194–224`.
- **Eligibility/pause:** ≥85% stage in view, document visible, exact integer scroll position, not still/menu/dialog suspended, not mouse-hovering track, not keyboard-focused into stage, not user-paused. Leaving these conditions preserves progress; step change or explicit restart resets to0. Focus pause persists until Play/toggle, not merely blur. Number buttons restart but do not clear that focused pause. `<home>/Projects/soph-co/components/teaser/use-story-playback.ts:31–103`; `<home>/Projects/soph-co/components/teaser/story.tsx:160–179`, `:189–191`; `<home>/Projects/soph-co/components/teaser/experience.tsx:120–124`.
- **Progress semantics:** earlier segments=1, current=timer, later=0; every card carries the same global step/progress. Scroll changes step at half-transition, before target card is fully resolved. Manual number navigation is immediate, not the autoplay transition. `<home>/Projects/soph-co/components/teaser/story.tsx:14–31`, `:128–138`.
- **Responsive:** base 328×585px, ≥1728 width408 and height≤728; mobile width min(328px,100vw−36px), height≤100svh−130px; short-height media queries reduce typography/artwork. `<home>/Projects/soph-co/app/teaser.css:177–197`; `<home>/Projects/soph-co/app/teaser-responsive.css:1–18`, `:82–96`, `:190–231`.

### 5. Orbit

- **Trigger/hold:** scroll-only, no autoplay. Rotation 0→−180° over positions0→2, with −90° per transition and chapter holds. Ring is 164vw circle, left−32vw/top50%; heading/marker geometry rotates with it. `<home>/Projects/soph-co/components/teaser/orbit.tsx:38–70`; `<home>/Projects/soph-co/app/teaser.css:280–329`.
- **Text orchestration:** description opacity and blur are scroll-interpolated at index offsets −.6/−.5/−.4/.4/.5/.6; sharp/full opacity from index−.4 through index+.4, 4px blur outside, both descriptions zero at midpoint handoff. This is not the heading BlurText component. Wheel titles have no separate text reveal. `<home>/Projects/soph-co/components/teaser/orbit.tsx:18–27`; `<home>/Projects/soph-co/lib/teaser/text-tokens.ts:2–25`.
- **Exit/reverse:** entirely reversible with scroll; final pose holds before stage unpins. No special forward exit or focus pause.
- **Responsive:** same angular choreography; title/description width85vw mobile, description left7.5vw; short-height mobile title distance and description offset shrink. `<home>/Projects/soph-co/app/teaser-responsive.css:96–102`, `:232–240`.

### 6. Conversation, typing, alligator

- **Trigger/hold:** three scroll poses; per-card x/y, scale and opacity interpolate across0/1/2. First scales1→.85→.7225 and fades1→1→.35; second .3→1→.85 and0→1→.55; third .3→.3→1 and0→0→1. Desktop cards travel diagonally up/left; mobile centers x at−50% for all poses. `<home>/Projects/soph-co/lib/teaser/choreography.ts:39`; `<home>/Projects/soph-co/components/teaser/conversation.tsx:23–36`.
- **Style orchestration:** active card selection is rounded step and changes CSS color immediately at transition midpoint; no background-color transition is declared. First active card stays grey; second/third active orange. `<home>/Projects/soph-co/components/teaser/conversation.tsx:31`; `<home>/Projects/soph-co/app/teaser.css:370–382`.
- **Typing:** static text and literal `...`; only opacity follows position1→2. No dot looping, typewriter, or typing-to-message event clock. `<home>/Projects/soph-co/components/teaser/conversation.tsx:68`, `:84–86`; `<home>/Projects/soph-co/app/teaser.css:389`.
- **Alligator:** static WebP in third card, revealed only through parent pose. No independent image reveal, crop tween, animation/video, or click behavior. `<home>/Projects/soph-co/components/teaser/conversation.tsx:44–53`.
- **Exit/reverse/responsive:** pose transformations reverse on scroll; final card holds until unpin. Width396 desktop, mobile100vw−36/max396; short-height mobile image max150px and object-fit cover. `<home>/Projects/soph-co/app/teaser-responsive.css:103–116`, `:241–248`.

### 7. People expansion and heading

- **Heading trigger:** shared BlurText when ≥25% of its span is in view, once=true. Unlike hero, it stays revealed on exit/reverse; no hero-style active threshold. `<home>/Projects/soph-co/components/teaser/narrative.tsx:33–36`; `<home>/Projects/soph-co/components/teaser/blur-text.tsx:15–27`.
- **Expansion trigger:** rounded step swaps `spread-0/1/2` classes at61.5/134.5svh. Cards flex-basis91.6667%→half width→third width. Motion layout animates each discrete layout change with spring stiffness120,damping24; image and text get position-only layout. This is **discrete spring expansion, not continuously scrubbed expansion**. `<home>/Projects/soph-co/components/teaser/narrative.tsx:23–50`; `<home>/Projects/soph-co/lib/motion-tokens.ts:8–11`; `<home>/Projects/soph-co/app/teaser.css:415–438`.
- **Hold/exit/reverse:** pose stays until next rounded step, reverses through another spring when scrolling back; no separate card intro/outro. Stage height100svh−88, overflow hidden; source section progress still uses full viewport end/end measurement, worth checking exit hold geometry.
- **Responsive:** at ≤1023px removes pin and specified section height, puts all cards in a vertical static column with auto flex-basis; thus tablet/mobile do not have the desktop expansion narrative. Mobile heading44px, cards min350px. `<home>/Projects/soph-co/app/teaser-responsive.css:32–48`, `:117–122`.

### 8. Invitation and footer

- **Trigger:** natural document flow min100svh, heading shared BlurText once at25% in-view; invitation sign, link, footer metadata do not have separate entry animation. `<home>/Projects/soph-co/components/teaser/narrative.tsx:59–95`; `<home>/Projects/soph-co/app/teaser.css:448–498`.
- **Backdrop boundary:** active contacts chapter swaps hero FlameBackdrop for dynamically imported legacy FooterOrb and sets container opacity.65 directly. No crossfade, shared shader morph, or footer ignition is wired. Imported shared `FlameFooterBackdrop` is **not** used by teaser Scene. `<home>/Projects/soph-co/components/teaser/scene.tsx:8–23`; `<home>/Projects/soph-co/components/teaser/experience.tsx:94–108`.
- **Orb motion:** custom R3F shader time + slight wave/rotation; fine pointer rotations damp at rate3, no touch; footer center y=−.85*viewportHeight, radius max(.57*height,.39*width). Active+visible governs frame loop; reduced/global still freezes it; context loss falls back to artwork. No scroll-driven footer growth/ignition. `<home>/Projects/soph-co/components/teaser/footer-orb.tsx:128–231`, `:251–289`.
- **Interaction/focus:** button opens native modal, stops Lenis, suspends story timer, close returns focus to opener and restarts Lenis. Backdrop click closes. No explicit modal entrance/exit tween. Preview only; no collection/registration. `<home>/Projects/soph-co/components/teaser/experience.tsx:76–84`, `:208–252`.
- **Responsive:** desktop sign and content side by side; mobile stacks them, reduces sign/heading, footer wraps with back-to-top link on own row. `<home>/Projects/soph-co/app/teaser-responsive.css:123–147`.

### 9. Navigation and mobile menu

- **Trigger:** dock channel fades nav0→1 and y48→0 over1.5–3s. Active chapter uses40%-viewport intersection logic. Desktop item hover/current background/color transitions .2s (CSS default easing). `<home>/Projects/soph-co/components/teaser/experience.tsx:50`, `:135–150`; `<home>/Projects/soph-co/app/teaser.css:499–527`.
- **Mobile:** at≤767px desktop dock replaced with160px menu; open/close panel opacity transition .18s, no explicit easing/height/translation/stagger. Button is minimum40px high. First anchor focused on open; Escape closes and returns focus; choosing anchor closes/returns focus. Menu is not a modal and does not stop Lenis. `<home>/Projects/soph-co/components/teaser/experience.tsx:58–74`, `:151–194`; `<home>/Projects/soph-co/app/teaser-responsive.css:148–178`.
- **Exit:** contacts adds at-footer class with visibility:hidden; there is no exit tween. Skip shown only currentIndex1–3, not People; mobile menu and invitation suspend stories but do not suspend other backdrop clocks. `<home>/Projects/soph-co/components/teaser/experience.tsx:195–198`; `<home>/Projects/soph-co/app/teaser.css:528–531`.

## Global accessibility / alternate contracts

- Global Pause motion is a mode switch, not an exact-pose freeze: it removes Lenis, completes entry, makes scroll chapters natural flow, exposes all cards/descriptions, hides typing/orbit geometry and story controls, and disables animation/transition. Resuming does not replay completed entry. `<home>/Projects/soph-co/components/teaser/experience.tsx:44–47`, `:90`, `:200–207`; `<home>/Projects/soph-co/app/teaser-accessibility.css:1–150`.
- Live OS reduced motion produces the same still layout. HardwareConcurrency≤4 reduces backdrop motion but leaves essential DOM choreography enabled. `<home>/Projects/soph-co/components/teaser/use-device-flags.ts:24–46`; `<home>/Projects/soph-co/components/teaser/experience.tsx:104`; `<home>/Projects/soph-co/lib/motion-tokens.ts:24–30`.

## Source-level suspects to verify visually (not findings)

1. Timed hero word resolution versus scrubbing and instant reverse reset may not match reference continuity; first word appears immediately, later words resolve concurrently rather than stagger.
2. Notification text is unanimated beyond the container; typing dots/alligator are static. If Blink treats these as unique animated subcomponents, parity is absent by construction.
3. People uses midpoint-triggered layout springs; compare reference continuous expansion and the absence of that behavior below1024px. Check stage-exit timing because People sticky height differs from chapter measurement height.
4. Orbit descriptions intentionally pass through a zero-opacity midpoint; verify whether reference blanks, crossfades, blurs, or staggers title and body independently.
5. Story progress resets at rounded step midpoint and playback pauses until an exact integer hold; inspect whether the visible progress handoff occurs too early during movement. Cursor resting on track prevents autoplay; focus pause needs explicit resume.
6. Footer uses an abrupt renderer replacement rather than the shared flame system. Async loading may expose a blank interval; source alone does not establish its visible duration.
7. Entry timers do not await dynamic scene readiness. A late-loaded WebGL scene can miss part of the intended entry choreography; source-only timing cannot prove load fidelity.
8. Scene and entry pause on document visibility, not arbitrary focus loss; BlurText lacks an explicit visibility clock. These are distinct pause policies, not one universal animation state machine.

## Dependencies and reuse boundaries

External: Motion/React owns DOM interpolation, layout spring, viewport checks and timers; Lenis owns smooth root scrolling; direct WebGL owns hero flame; React Three Fiber/Three owns legacy footer orb; Next Image owns raster assets. Internal contracts are centralized in `../../../src/lib` and `../../../src/lib`. Reuse those distinct clocks rather than assigning one generic transition preset to every benchmark component.
