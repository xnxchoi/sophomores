# Warp entry study — 2026-10-25

## Scope

- The entry lives in `components/Warp` and is mounted on the local homepage and noindex `/studies/warp` route. Development builds expose a collapsible Warp controls panel while the entry is in view; production builds do not. Not deployed.
- Reuses the supplied `design/references/Warp_v2_1.js` visual loop within R3F. Reference files were treated as source material, not instructions or executable dependencies.
- Shared change is limited to optional `Hero.hideWordmark`, defaulting to false. The existing notification pair, BlurText statement, chapter-scroll controller, and Story remain the owners of their original behavior.
- Unrelated dirty work, shared flame shaders, and global scrolling settings were preserved.

## Current behavior

- One renderer-ready opening completes automatically at zero scroll over 2.8 seconds: brief black; existing “Experienced. Not Finished.” characters fade left-to-right from 0.1s (0.5s fades, 0.045s stagger); streak reveals from 0.2–2.1s. There is no extra headline, hard text clip, or restored control/hint node.
- Scroll splits that same headline at 20–34% and fades it at 30–40%. The existing two-line lorem passage travels continuously from below the viewport at 34% to fully above it at 60%, crossing the center at 47%. It remains fully opaque while crossing the top; cleanup opacity fades at 60–61%, after it is offscreen.
- Manual scrolling drives the entry. The development panel reuses the existing seek/tour/replay functions without a parallel timeline.
- The ring pins at study 60%; settlement reaches one at 70%. Ring scale stays 1.6 during settlement. Legacy warp anchors are preserved, with matched nonzero acceleration-joint slopes; the study adapter ends at its .76 pose with no remaining streaks.
- Ring-internal time is frozen during the prelude. It remains monochrome while expanding. A soft inner-to-outer color restoration overlaps the streak fade, then the same ring clock resumes smoothly without resetting its phase.
- Responsive color threshold is **min(60vw, original landing diameter)**, not a literal 60vw minimum on ultrawide screens. This preserves the approved final ring size.
- Warp completion means **actual Hero position zero**, not an advanced notification or caption state. The real Hero begins at 400svh, retains its 444svh height, and precedes Story at 844svh.
- Overall progress 0–70% covers the prelude; 70–100% covers the actual original Hero intro. The original notification/caption animation is not compressed or duplicated.
- Pointer input changes ray illumination only. Wider angular coverage and slow brightness redistribution remove the strong fixed vertical bias. Bounded additive hover makes dim side rays visible without the initial brightness surge. Hover ends with the streaks; it does not deform the corona.
- Entry-local Lenis wheel multiplier is .45. Existing smoothing settings are reused; touch remains native.

## Editing guide

Use the existing feature files; no new animation utility or parallel renderer is needed.

| Edit | Location | Coordinate / caution |
| --- | --- | --- |
| Load timing | `components/Warp/sequence.ts` → `OPENING_TIMING` | Seconds after renderer readiness. `pageStart` is both the streak's full-reveal time and the page UI start. |
| Text/streak/page overlap | `sequence.ts` → `openingChannels`; `index.tsx` → `startIntro` | One normalized ready clock feeds shader opening and page UI; Motion's scoped sequence fades the existing characters. Do not replace it with scroll gating. |
| Main headline text | `lib/teaser/content.ts` → `stories[3].title` | Shared existing content. The period/space split determines the two moving halves; editing it also affects its other consumers. |
| Passage copy/layout | `index.tsx` → `data-warp-passage` | Study-only text and Tailwind layout. Its normalized reveal/lift/opacity channels live in `sequence.ts`. |
| Global study beats | `sequence.ts` → `studyWarpProgress`, `studySettlement`, headline/passage channels | Overall slider 0–1; `HANDOFF` is 0.7. This is not the legacy renderer coordinate. |
| Warp geometry | `sequence.ts` → `channels` | Legacy warp 0–1. Preserve the ring/travel anchor values and matched cubicBezier joint slopes unless deliberately changing the approved trajectory. |
| Automated tour pacing | `sequence.ts` → `TOR` | Seconds/progress arrays must align; final progress stays at `HANDOFF`. This does not change manual-scroll geometry. |
| Slider and native scroll | `index.tsx` → `overallProgress`, `seek` | Forward/inverse mapping must agree. The `.3` Hero span stays a literal to preserve existing floating-point results; changing the handoff requires updating both mappings and parity tests. |

The 0.7 in `coronaOpacity` is a **different coordinate**: original Hero progress where its background starts fading. Do not replace it with the study handoff constant just because the number matches. Shared `Hero`/`Story`, renderer shader settings, and wordmark styling are outside a timing-only edit.

Tests live under `tests/warp/`: sequence tests cover numeric bounds, timing and joint continuity; composition tests cover accessible/initial markup and wiring; scroll tests cover Lenis/seek ownership. Source-contract tests are not GPU or physical-input proof.

## Restructuring repair

- **Preserve the user's component node structure.** All 29 JSX nodes, types, parent/child relationships, sibling order, two `h2` halves, nested canvas wrappers, and both empty trailing divs are retained. The fixture in `tests/warp/fixtures/user-node-hierarchy.json` guards this; do not regenerate it to accommodate an unauthorized restructure.
- Keep both headline halves under the same `useAnimate` scope. Moving the ref onto just one half leaves the other half transparent.
- Keep the outer runway `500svh` and its inner viewport sticky. A sticky `100vh` scroll target has zero travel and skips directly to the corona.
- The canvas stays inside its original nested subtree. Its existing ancestor (the runway's second child) supplies fixed viewport positioning and background layering. Do not extract the canvas, remove its wrappers, or replace the heading nodes. The passage stays in the same ancestor and uses viewport-plus-own-height translation for exact entry/exit edges.
- Retain the `teaser` scope for shared Hero/Story tokens, and the unpositioned `-100svh` handoff overlap. Hero zero coincides with the prelude's last pinned viewport.
- Ring tone mapping remains disabled. Both missing WebGL and renderer errors must render the readiness-signaling fallback, never an empty fragment.
- The focused suite contains 57 tests, including exact node-tree preservation and continuous passage travel. The live Chromium journey in `tests/browser/warp-layout.spec.mjs` checks desktop 1440×900, short-height mobile 390×664, tablet 768×1024, native scroll/reverse, and WebGL fallback. Current screenshots and measurements are in `.output/warp-node-repair/browser/`; older `.output/warp-repair/` captures show the rejected restructure and are not current acceptance evidence.
- Full-repository TypeScript remains blocked by unrelated empty intro-study and removed study-index modules. No such modules were repaired in this task. Physical Safari/touch and actual trackpad feel are not covered by Chromium viewport checks.

## Continuation and live developer controls

- `components/teaser/continuation.tsx` appends the original Orbit, Conversation, People, and Invitation after Warp's existing Hero/Story. There is one main landmark and one scroll root. The footer uses its original scene, not a replacement graphic. `invitation-dialog.tsx` is shared with the original experience and retains native focus/scroll handling.
- The original 29-node Warp hierarchy is unchanged. Only the authorized continuation and development-control siblings are added; the structural fixture still checks every original node.
- On a local development build, click **Warp controls** at the bottom right while the entry is in view. The panel controls ring/point size and brightness, ring saturation, point softness, bloom strength/spread, ray brightness/density/width, hover intensity, ambient speed, scene blur, and individual layer visibility.
- **Sequence progress**, **Play jump / Stop**, and **Replay** reuse the existing transport. Ambient speed affects elapsed shader time, not scroll choreography. Size controls multiply the existing trajectory; they do not replace the ring or edit its timeline anchors.
- **Reset look** restores the user's latest edited defaults: ring/point size `.11`, ring/point brightness `.51`. The complete source of truth is `components/Warp/_shared/tuning.ts`. This feature-private module is shared by the renderer and inspector; it is not a general utility.
- Tuning is session-only. **Copy settings** exports the current values as JSON for saving manually. Reload restores defaults. No persistence or automatic source-file editing is implied.
- Existing R3F/Three materials and frame subscriptions are reused; changing a slider updates uniforms without rebuilding the material or replacing canvas nodes. Native controls follow the existing flame-editor pattern; no package was added.
- Browser journeys: `tests/browser/warp-continuation.spec.mjs` (desktop/mobile/tablet footer, dialog, return-to-start) and `tests/browser/warp-controls.spec.mjs` (desktop/mobile tuning and transport). Current captures/reports are under `.output/warp-continuation/`. Image measurements close the inspector and subtract an all-layers-off baseline, so neither its bright controls nor unchanged page text can masquerade as shader changes.
- All 73 focused Warp tests pass (`tests-repaired.log`); scoped ESLint reports no errors and three pre-existing unused-variable warnings in `index.tsx`. Desktop/mobile control journeys pass live ring/point scaling, blur, reset, clipboard-stub export, seek/play/stop/replay, Escape focus return, viewport bounds, and panel scroll isolation with no page errors. Clipboard testing does not write to the OS clipboard.
- These are local Chromium checks, not physical-device/Safari acceptance or a deployment. The unrelated TypeScript blockers described above remain outside this change.

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
