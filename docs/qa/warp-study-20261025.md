# Warp entry study — 2026-10-25

## Scope

- The entry now lives in `components/Warp` and is mounted on the local homepage. The noindex `/studies/warp` route opts into study controls; the homepage omits them. Not deployed.
- Reuses the supplied `design/references/Warp_v2_1.js` visual loop within R3F. Reference files were treated as source material, not instructions or executable dependencies.
- Shared change is limited to optional `Hero.hideWordmark`, defaulting to false. The existing notification pair, BlurText statement, chapter-scroll controller, and Story remain the owners of their original behavior.
- Unrelated dirty work, shared flame shaders, and global scrolling settings were preserved.

## Current behavior

- One renderer-ready opening completes automatically at zero scroll over 2.8 seconds: brief black; existing “Experienced. Not Finished.” characters fade left-to-right from 0.1s (0.5s fades, 0.045s stagger); streak reveals from 0.2–2.1s; controls and hint appear from 2.1–2.8s. There is no extra placeholder headline or hard text clip.
- Scroll splits that same headline at 20–34% and fades it at 30–40%. A separate two-line lorem passage rises at 34–42%, holds through 50%, and lifts/fades out by 60%.
- Play jump lasts 9.8 seconds, including 2.4 seconds of pinned settlement, and stops at 70% / original Hero position zero. Starting Play at or after 70% restarts from zero. Replay resets both scroll and the automatic opening; visibility pauses both clocks. Manual scrolling is not time-locked.
- The ring pins at study 60%; settlement reaches one at 70%. Ring scale stays 1.6 during settlement. Legacy warp anchors are preserved, with matched nonzero acceleration-joint slopes; the study adapter ends at its .76 pose with no remaining streaks.
- Ring-internal time is frozen during the prelude. It remains monochrome while expanding. A soft inner-to-outer color restoration overlaps the streak fade, then the same ring clock resumes smoothly without resetting its phase.
- Responsive color threshold is **min(60vw, original landing diameter)**, not a literal 60vw minimum on ultrawide screens. This preserves the approved final ring size.
- Warp completion means **actual Hero position zero**, not an advanced notification or caption state. The real Hero begins at 400svh, retains its 444svh height, and precedes Story at 844svh.
- Slider 0–70% covers the prelude; 70–100% covers the actual original Hero intro. Seeking 100% uses Hero geometry's motion end, before its exit hold. It does not compress or duplicate the original notification/caption animation.
- Pointer input changes ray illumination only. Wider angular coverage and slow brightness redistribution remove the strong fixed vertical bias. Bounded additive hover makes dim side rays visible without the initial brightness surge. Hover ends with the streaks; it does not deform the corona.
- Entry-local Lenis wheel multiplier is .45. Existing smoothing settings are reused; touch remains native. Study-only Slider, Replay, and Play jump synchronize Lenis using immediate programmatic seeks.

## Editing guide

Use the existing feature files; no new animation utility or parallel renderer is needed.

| Edit | Location | Coordinate / caution |
| --- | --- | --- |
| Load timing | `components/Warp/sequence.ts` → `OPENING_TIMING` | Seconds after renderer readiness. `pageStart` is both the streak's full-reveal time and the page UI start. |
| Text/streak/page overlap | `sequence.ts` → `openingChannels`; `warp-study.tsx` → `startIntro` | One normalized ready clock feeds shader opening and page UI; Motion's scoped sequence fades the existing characters. Do not replace it with scroll gating. |
| Main headline text | `lib/teaser/content.ts` → `stories[3].title` | Shared existing content. The period/space split determines the two moving halves; editing it also affects its other consumers. |
| Passage copy/layout | `warp-study.tsx` → `data-warp-passage` | Study-only text and Tailwind layout. Its normalized reveal/lift/opacity channels live in `sequence.ts`. |
| Global study beats | `sequence.ts` → `studyWarpProgress`, `studySettlement`, headline/passage channels | Overall slider 0–1; `STUDY_HANDOFF` is 0.7. This is not the legacy renderer coordinate. |
| Warp geometry | `sequence.ts` → `channels` | Legacy warp 0–1. Preserve the ring/travel anchor values and matched cubicBezier joint slopes unless deliberately changing the approved trajectory. |
| Automated tour pacing | `sequence.ts` → `STUDY_TOUR` | Seconds/progress arrays must align; final progress stays at `STUDY_HANDOFF`. This does not change manual-scroll geometry. |
| Slider and native scroll | `warp-study.tsx` → `overallProgress`, `seek` | Forward/inverse mapping must agree. The `.3` Hero span stays a literal to preserve existing floating-point results; changing the handoff requires updating both mappings and parity tests. |

The 0.7 in `coronaOpacity` is a **different coordinate**: original Hero progress where its background starts fading. Do not replace it with the study handoff constant just because the number matches. Shared `Hero`/`Story`, renderer shader settings, and wordmark styling are outside a timing-only edit.

Tests live under `tests/warp/`: sequence tests cover numeric bounds, timing and joint continuity; composition tests cover accessible/initial markup and wiring; scroll tests cover Lenis/seek ownership. Source-contract tests are not GPU or physical-input proof.

## Restructuring repair

- Keep both headline halves under the same `useAnimate` scope. Moving the ref onto just one half leaves the other half transparent.
- Keep the outer runway `500svh` and its inner viewport sticky. A sticky `100vh` scroll target has zero travel and skips directly to the corona.
- The fixed canvas is a sibling of the runway, behind its transparent text layer. It must remain viewport-sized through the Hero; do not add permanent opacity wrappers or an opaque layer over the headline.
- Retain the `teaser` scope for shared Hero/Story tokens, and the unpositioned `-100svh` handoff overlap. Hero zero coincides with the prelude's last pinned viewport.
- Ring tone mapping remains disabled. Both missing WebGL and renderer errors must render the readiness-signaling fallback, never an empty fragment.
- All 55 focused tests and scoped lint pass. The live Chromium journey in `tests/browser/warp-layout.spec.mjs` checks desktop 1440×900, short-height mobile 390×664, tablet 768×1024, the control-free homepage, and forced no-WebGL readiness. Screenshots and measurements are in `.output/warp-repair/browser/`. Two independent Santa reviews passed the source and all 12 viewport captures. Play/Stop and continuous-motion aesthetics were not newly accepted in this bounded repair.
- Full-repository TypeScript remains blocked by unrelated empty intro-study and removed study-index modules. No such modules were repaired in this task. Physical Safari/touch and actual trackpad feel are not covered by Chromium viewport checks.

## Earlier-revision verification

The checks below were captured before the final 2.8-second unified opening and 70% handoff. Their counts, timing and opening screenshots are historical, not claims about the latest revision.

- 45 focused warp tests passed, including SSR Hero parity, opening/settlement boundaries, pointer/shader source contracts, and scroll integration contracts. Source-contract tests are not GPU or physical input tests.
- Focused ESLint and repository TypeScript checks passed.
- Live desktop render checked: black replay, partial text wipe, lateral illumination, left/right hover, monochrome landing, pinned color return, full-color release, both original notifications, and subsequent original serif statement.
- Complete Play jump with Lenis ended at scroll 2880 in a 720px-high viewport: Hero top 0, both notification opacities 0, one canvas. Keyboard Space stopped playback without restarting it; Replay returned to zero.
- Synthetic CDP wheel delta 1000 from scroll zero settled at 450. This confirms the configured gain, not the exact feel of a physical trackpad gesture or a guaranteed count of chapter steps.
- Frozen-ring comparison sampled 173,127 color channels in a specified inner annulus outside controls: zero changed channels across separated captures. Moving exterior rays were deliberately excluded.
- Two independent, concise Santa reviews passed the supplied desktop evidence and current source. This is bounded study acceptance, not production readiness.

## Evidence and limits

Evidence lives in `artifacts/warp-study-20261025/`: `balanced-field-idle.png`, `balanced-hover-left.png`, `balanced-hover-right.png`, `wheel-gain-proof.json`, `pinned-ring-comparison.json`, `pinned-motion-review.png`, `final-black.png`, `opening-wipe-review.png`, `corona-two-notices.png`, and `warp-balanced-preview.mp4`.

The listed preview video records an earlier ray balance, pinned landing, and color release. It does not document the final unified load timeline. Older `revised-*`, the separate-line opening captures, and early motion artifacts are superseded experiments, not current acceptance evidence.

Earlier mobile compositor captures were unreliable; the restructuring repair above has fresh desktop, mobile-sized, and tablet-sized Chromium captures. Physical iPhone/Safari, touch behavior, actual wheel/trackpad feel, and production deployment remain unverified. The final aesthetic judgment and slow-drift pacing remain open to the user's live review.
