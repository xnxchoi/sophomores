# Motion + Lenis migration

> Archived development evidence. Relocated 2026-10-22; dated observations, source line numbers, review decisions, and test counts below are historical, not current release acceptance. Generated local screenshots and downloaded benchmark bundles are not retained here; reproduce QA against the current app before relying on them.

## Follow-up: 2026-10-03
- Text-treatment correction: inspected the live reference DOM/CSS rather than approximating a whole-block blur. Its large hero, People, and closing statements use separate word spans, blur 12px, opacity 0, and translateY 20px; words start together with progressively longer durations in 0.2-second increments. `BlurText` implements that resolve in Motion, capped at 2.2 seconds for longer copy. Hero is scroll-triggered; People/footer reveal on viewport entry. Narrative copy is unchanged.
- Added five focused blur tests (31 teaser tests total). Browser checks distinguish hidden initial words, the first word resolving ahead of later ones, and all words settling sharp; desktop/mobile wrapping, live reduced motion, and no-JS readability checked. One complete accessible text copy is retained; visual word spans are hidden from assistive technology.
- Supersedes the no-autoplay behavior below: user confirmed that the reference stories advance on their own. Motion now times five-second reading holds; Lenis advances between the existing pinned poses. Manual/reverse scrolling is preserved. Final card stops with explicit Replay.
- Text holds are sharp. A browser midpoint check rejected overlapping crossfades (double-image paragraphs). The final principle transition uses a brief fade-through within the central 20% of the handoff: no superimposed paragraphs, no former 0.4-pose blank interval, only a single blank midpoint. Hero text settles from a restrained 4px blur. Reduced-motion and no-JS styles clear filters.
- 26 tests, scoped helper coverage (99.62% lines, 96.43% branches), TypeScript, ESLint, and production build pass. These tests do not cover the React playback lifecycle; browser checks below are separate evidence, not a full automated E2E suite.
- Production candidate browser: autonomous advance through all four stories and end-stop; Replay returns to story one; Pause/Play and focus/manual-selection stop; offscreen progress remains unchanged; live reduced motion and JavaScript-disabled reload show static content with all text filters set to none. Mobile 390×844: story and controls fit without horizontal overflow. Emulation overrides restored.
- Editorial content remains provisional and unchanged. The founder supplied the real origin in chat; narrative revision is being discussed before replacing public preview copy.

## Scope
- Native Motion `useScroll`, `useTransform`, `useMotionValueEvent`, `animate`, and isolated layout transitions replace bespoke scroll/entry RAF, measurements, CSS animation engines, and story autoplay.
- CSS sticky owns pinning. Immutable timing data owns reading holds: origin/idea/conversation scroll travel is 280svh instead of 200svh; desktop people is 196svh instead of 140svh. Hero is 160svh instead of 100svh. Every first and last step has a hold too.
- Lenis 1.3.26 owns smoothing through its React root and automatic clock. No extra custom RAF, no native smooth-scroll competition, no touch smoothing. Pause/reduced mode removes Lenis without remounting narrative content.
- Approved main `../../components/gl/flame-backdrop` is integrated unchanged. The work-in-progress flame footer is deliberately not integrated; `footer-orb.tsx` preserves the existing footer temporarily.

## Evidence
- Production build, TypeScript, scoped ESLint, 19 teaser tests, and the scoped helper coverage gate pass. The existing shared flame package's 64 tests also pass. Coverage is not claimed for the entire feature.
- Production browser at 1280×720: story-two midpoint y=2610; +100px stayed at pose 1; another +180px interpolated to pose 1.56944; reversing 180px returned exactly to pose 1. No timer advanced the held story during inspection.
- Principle wheel moved through -34.2857 degrees, then held at -90 degrees. Conversation held its second-message composition. Chapter activation, anchor jumps, restored scroll, and desktop/mobile navigation were checked.
- Mobile 390×844: approved main flame renders, story-three card/controls fit, no horizontal overflow. Touch smoothing remains disabled; this was browser viewport testing, not physical-device proof.
- Live reduced-motion changes now reveal all story/message cards with opacity 1 and no transforms; Lenis detaches. A compatibility subscription supplements Motion 12's initial preference snapshot.
- JavaScript-disabled reload: all narrative cards readable; fallback chapter navigation has computed opacity 1 and no transform. Emulation overrides were restored afterward.
- Review identified and fixed width-relative IntersectionObserver margins (replaced by Motion axis offsets), no-JS inline opacity overrides, and new Lenis instances inheriting an open-dialog lock.

## Tuning / limitations
See README and `lib/teaser/choreography.ts`; adjust `holdVh` without changing transition speed or rewriting animation code. Entry, smoothing, and visual geometry have separate named configuration.

No deployment, provider operations, date confirmation, asset licensing clearance, exhaustive accessibility certification, or physical mobile performance claim is implied. The standalone local preview is a build snapshot; rebuild to include later changes to shared flame code.
