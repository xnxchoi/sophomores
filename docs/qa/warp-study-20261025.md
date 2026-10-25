# Warp entry study — 2026-10-25

## Scope

- Local, noindex `/studies/warp`; not deployed or installed as the homepage.
- Reuses the supplied `design/references/Warp_v2_1.js` visual loop within R3F. Reference files were treated as source material, not instructions or executable dependencies.
- Shared change is limited to optional `Hero.hideWordmark`, defaulting to false. The existing notification pair, BlurText statement, chapter-scroll controller, and Story remain the owners of their original behavior.
- Unrelated dirty work, shared flame shaders, homepage choreography, and global scrolling settings were preserved.

## Current behavior

- Independent five-second opening: complete black, additional placeholder line with a horizontal clip reveal, then streaks and the existing split headline. Final opening copy is still pending.
- Play jump lasts 7.6 seconds: 5.2 seconds to the original ring size, then 2.4 seconds of pinned settlement. Manual scrolling is not time-locked.
- Landing occurs at study 75%; settlement reaches one at 100%. Ring scale stays 1.6 during settlement. The original warp mapping remains unchanged; the study adapter ends at its .76 pose with no remaining streaks.
- Ring-internal time is frozen during the prelude. It remains monochrome while expanding. A soft inner-to-outer color restoration overlaps the streak fade, then the same ring clock resumes smoothly without resetting its phase.
- Responsive color threshold is **min(60vw, original landing diameter)**, not a literal 60vw minimum on ultrawide screens. This preserves the approved final ring size.
- Warp completion means **actual Hero position zero**, not an advanced notification or caption state. The real Hero begins at 400svh, retains its 444svh height, and precedes Story at 844svh.
- Pointer input changes ray illumination only. Wider angular coverage and slow brightness redistribution remove the strong fixed vertical bias. Bounded additive hover makes dim side rays visible without the initial brightness surge. Hover ends with the streaks; it does not deform the corona.
- Study-only Lenis wheel multiplier is .45. Existing smoothing settings are reused; touch remains native. Slider, Replay, and Play jump synchronize Lenis using immediate programmatic seeks.

## Verification

- 45 focused warp tests passed, including SSR Hero parity, opening/settlement boundaries, pointer/shader source contracts, and scroll integration contracts. Source-contract tests are not GPU or physical input tests.
- Focused ESLint and repository TypeScript checks passed.
- Live desktop render checked: black replay, partial text wipe, lateral illumination, left/right hover, monochrome landing, pinned color return, full-color release, both original notifications, and subsequent original serif statement.
- Complete Play jump with Lenis ended at scroll 2880 in a 720px-high viewport: Hero top 0, both notification opacities 0, one canvas. Keyboard Space stopped playback without restarting it; Replay returned to zero.
- Synthetic CDP wheel delta 1000 from scroll zero settled at 450. This confirms the configured gain, not the exact feel of a physical trackpad gesture or a guaranteed count of chapter steps.
- Frozen-ring comparison sampled 173,127 color channels in a specified inner annulus outside controls: zero changed channels across separated captures. Moving exterior rays were deliberately excluded.
- Two independent, concise Santa reviews passed the supplied desktop evidence and current source. This is bounded study acceptance, not production readiness.

## Evidence and limits

Evidence lives in `artifacts/warp-study-20261025/`: `balanced-field-idle.png`, `balanced-hover-left.png`, `balanced-hover-right.png`, `wheel-gain-proof.json`, `pinned-ring-comparison.json`, `pinned-motion-review.png`, `final-black.png`, `opening-wipe-review.png`, `corona-two-notices.png`, and `warp-balanced-preview.mp4`.

The current preview video records the latest ray balance, pinned landing, and color release; it begins after the independent opening. Older `revised-*` and early motion artifacts are superseded experiments, not current acceptance evidence. Opening captures predate later optical changes, but the opening code was unchanged.

Latest mobile compositor captures were unreliable and are not accepted as visual proof. Physical iPhone/Safari, touch behavior, actual wheel/trackpad feel, and production deployment remain unverified. The final aesthetic judgment and slow-drift pacing remain open to the user's live review.
