# Warp entry study — 2026-10-25

## Scope

- The entry lives in `../../src/components` and is mounted on the local homepage and noindex `/studies/warp` route. Development builds expose a collapsible Warp controls panel while the entry is in view; production builds do not. Not deployed.
- Reuses the supplied `design/references/Warp_v2_1.js` visual loop within R3F. Reference files were treated as source material, not instructions or executable dependencies.
- Shared change is limited to optional `Hero.hideWordmark`, defaulting to false. The existing notification pair, BlurText statement, chapter-scroll controller, and Story remain the owners of their original behavior.
- Unrelated dirty work, shared flame shaders, and global scrolling settings were preserved.

## Current behavior

- One renderer-ready opening completes automatically at zero scroll over 2.8 seconds: brief black; existing “Experienced. Not Finished.” characters fade left-to-right from 0.1s (0.5s fades, 0.045s stagger); streak reveals from 0.2–2.1s. There is no extra headline, hard text clip, or restored control/hint node.
- Scroll splits that same headline at 20–34% and fades it at 30–40%. The existing two-line lorem passage travels continuously from below the viewport at 34% to fully above it at 60%, crossing the center at 47%. It remains fully opaque while crossing the top; cleanup opacity fades at 60–61%, after it is offscreen.
- Manual scrolling drives the entry. The development panel reuses the existing seek/tour/replay functions without a parallel timeline.
- The ring's base trajectory reaches its pinned pose at study 60%; settlement reaches one at 70%. Its base scale stays 1.6, while the small prelude tuning multiplier restores to 1 during the first part of settlement (see the October 26 handoff refinement below). Legacy warp anchors are preserved; the study adapter ends at its .76 pose with no remaining streaks.
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
| Load timing | `../../src/components` → `OPENING_TIMING` | Seconds after renderer readiness. `pageStart` is both the streak's full-reveal time and the page UI start. |
| Text/streak/page overlap | `sequence.ts` → `openingChannels`; `index.tsx` → `startIntro` | One normalized ready clock feeds shader opening and page UI; Motion's scoped sequence fades the existing characters. Do not replace it with scroll gating. |
| Main headline text | `../../src/lib` → `stories[3].title` | Shared existing content. The period/space split determines the two moving halves; editing it also affects its other consumers. |
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

- `../../src/components` appends the original Orbit, Conversation, People, and Invitation after Warp's existing Hero/Story. There is one main landmark and one scroll root. The footer uses its original scene, not a replacement graphic. `invitation-dialog.tsx` is shared with the original experience and retains native focus/scroll handling.
- The original 29-node Warp hierarchy is unchanged. Only the authorized continuation and development-control siblings are added; the structural fixture still checks every original node.
- On a local development build, click **Warp controls** at the bottom right while the entry is in view. The panel controls ring/point size and brightness, ring saturation, point softness, bloom strength/spread, ray brightness/density/width, hover intensity, ambient speed, scene blur, and individual layer visibility.
- **Sequence progress**, **Play jump / Stop**, and **Replay** reuse the existing transport. Ambient speed affects elapsed shader time, not scroll choreography. Size controls multiply the existing trajectory; they do not replace the ring or edit its timeline anchors.
- **Reset look** restores the user's latest edited defaults: ring/point size `.11`, ring/point brightness `.51`. The complete source of truth is `../../src/components`. This feature-private module is shared by the renderer and inspector; it is not a general utility.
- Tuning is session-only. **Copy settings** exports the current values as JSON for saving manually. Reload restores defaults. No persistence or automatic source-file editing is implied.
- Existing R3F/Three materials and frame subscriptions are reused; changing a slider updates uniforms without rebuilding the material or replacing canvas nodes. Native controls follow the existing flame-editor pattern; no package was added.
- Browser journeys: `tests/browser/warp-continuation.spec.mjs` (desktop/mobile/tablet footer, dialog, return-to-start) and `tests/browser/warp-controls.spec.mjs` (desktop/mobile tuning and transport). Current captures/reports are under `.output/warp-continuation/`. Image measurements close the inspector and subtract an all-layers-off baseline, so neither its bright controls nor unchanged page text can masquerade as shader changes.
- All 73 focused Warp tests pass (`tests-repaired.log`); scoped ESLint reports no errors and three pre-existing unused-variable warnings in `index.tsx`. Desktop/mobile control journeys pass live ring/point scaling, blur, reset, clipboard-stub export, seek/play/stop/replay, Escape focus return, viewport bounds, and panel scroll isolation with no page errors. Clipboard testing does not write to the OS clipboard.
- These are local Chromium checks, not physical-device/Safari acceptance or a deployment. The unrelated TypeScript blockers described above remain outside this change.

## Ring handoff refinement — 2026-10-26

- Preserve the latest prelude tuning through the jump, including size `.11` and brightness `.51`.
- During overall 60–67.2%, a shared Motion `transform` with `cubicBezier(.2, .16, .6, 1)` drives the return of ring size, brightness, saturation, and ambient-speed multipliers to the original neutral `1`; scene blur returns to `0`. Three `lerp` applies the numeric ring channels. `CORONA_RESTORE_END` in `../../src/components` controls this endpoint within the existing settlement channel. Installed Motion 14.6.0 and Three 0.186.1 supply the interpolation directly; no handwritten easing helper or renderer was introduced.
- The fading filament aperture uses the same effective ring size. Once sizing finishes, color returns during 67.2–70%; its diameter gate checks the actual tuned size, avoiding a premature color flash on a small ring. At 70%, the original ring resumes while Hero is still at zero. Scroll/caption/notification timing and all component nodes remain unchanged.
- Historical smoothing pass: symmetric cubic easing over the slightly longer expansion window reduced its sampled peak growth rate by about 28% versus the initial 60–66.5% quintic pass. That version had zero velocity at both boundaries; its evidence is `.output/warp-handoff/smoother-*`.
- Responsive follow-up: the user found the symmetric slow start too held-then-released. The current asymmetric Motion curve starts with slope `.8`, reaches about `.109` blend in its first tenth (previously `.028`), and still lands at zero velocity. Its sampled normalized peak is about `1.429` versus the prior `1.5`. Ring, aperture, and blur share the mapping; color settlement, ambient damping, scroll settings, node structure, and the 67.2%/70% endpoints are unchanged. This is immediate scroll mapping, not an additional spring or delayed state update.
- Responsive verification: 87 Warp tests pass; full TypeScript passes; scoped ESLint has no errors and five existing unused-variable warnings. Two independent source reviews pass. Live isolated desktop playback lands at Hero top `0`; early/mid/landing captures and logs are under `.output/warp-handoff/responsive-*`. Santa review: early growth is readable, aperture/rays stay aligned, no added compositing artifacts, and the original full-color endpoint is intact. Static captures and numeric curve tests do not prove physical-trackpad feel or pixel-level color velocity.
- Visibility checkboxes remain explicit overrides. Ring look controls tune the prelude; they do not permanently shrink or dim the subsequent corona. Reverse scrolling retraces the same restoration curve.
- Blur is a Motion-driven CSS variable on the existing scene node, not per-frame React state. The passage is outside that node and remains unblurred.
- Actual live browser captures at 60%, 63%, and 70%: `.output/warp-handoff/`. The 70% check confirmed Hero top `0` and scene blur `0px`; setting prelude blur to `8px` restored that value on reverse and cleared it again at handoff. Behavioral tests execute the real Ring/Filaments callbacks and scene-blur transform, covering responsive geometry, endpoint continuity, reversal, original speed, and manual visibility.
- Two independent source/visual reviews passed. Physical-device scroll feel and deployment are not established by this local refinement.

## Halo formation beat — 2026-10-27 (superseded)

The user rejected this intermediate halo treatment: it still revealed the final silhouette too early and read as separate objects. The radial-deformation revision below replaces it; these notes and `formation-*` captures are historical.

- The existing Ring material now has a separate scroll-driven `uFormation` channel during the 60–67.2% expansion. The light gathers into a clean pale halo, its two closely spaced profiles separate unevenly and broaden, then the original inward veils return before color settles. This is a material formation beat, not an extra page node, scroll hold, or ambient clock.
- Reuses the production shader's `profile` function and native GLSL interpolation. The weighted halo replaces rather than adds to the image, and existing brightness/saturation/visibility controls apply afterward. No new renderer, package, shader-noise implementation, or shared helper was added.
- Formation bypasses at settlement zero and at/after `.72`: the approved opening and original corona output are retained. The size curve, aperture, ambient-motion release, 67.2–70% color return, and Hero-zero handoff remain unchanged.
- Validation: all 17 handoff tests pass, full TypeScript passes, and scoped lint has no errors (one existing unused `error` warning). The wider Warp suite is 86/90: four SSR/continuation checks currently fail, including missing App Router context; this shader-only work does not repair those unrelated harness/routing issues.
- Live local desktop playback, midpoint inspections, and the 70% landing were checked; Hero top is `0`. Before/after and formation captures plus RED/GREEN logs are under `.output/warp-handoff/formation-*`. These checks do not establish physical trackpad/touch feel or deployment readiness.
- Two independent Santa/source reviews passed the scoped formation change: a distinct hollow halo, no doubled outlines in sampled frames, and preserved control ordering/endpoints. Formation parameters reverse deterministically; the existing ambient phase does not rewind after visiting the animated corona. The hidden-ring capture confirms the halo obeys the layer override.

## Filled-light radial deformation — 2026-10-27

- Replaces the temporary halo blend with inverse radial deformation of the production field. The luminous ridge begins at radius zero, then moves outward while the filled center opens. Its edge first narrows to match the streaks, then relaxes into the original inward veils. The neutral carrier and production `shade` sample the same deformed coordinates; interpolation changes surface character, not two independently sized silhouettes.
- The new core matches the original filament hotspot's world-space radius, softness, and brightness controls. Its contribution takes over as the original core fades. The streak aperture follows the projected rim and narrowing edge, avoiding the black gap created by clearing space for the eventual full ring too early. Existing tuning defaults are untouched.
- The original material is called directly once settlement reaches `.72` (overall 67.2%); color return still ends at 70%, with Hero at zero. Geometry/brightness restoration anchors, ambient phase ownership, node hierarchy, and global scroll behavior are not changed. Visible silhouette intentionally differs before the endpoint. Reversal retraces deformation parameters, not the independently advancing ambient phase after handoff.
- Uses existing Three interpolation and the production shader's `profile`, `shade`, and `toSrgb`, plus native GLSL coordinate arithmetic; no additional renderer, helper library, or animation clock. The local shader configuration is resolved once so its phase uses the same loop period as the original material.
- Live local desktop checks include the filled core at 60–61%, crisp developing rim at 63%, emerging material at 65%, and Play jump ending with Hero top `0` at 70%. No browser shader errors were reported. Evidence and tests are `.output/warp-handoff/morph-*`; static captures cannot certify physical scroll feel or frame-perfect temporal continuity.
- Focused morph/tuning/pointer tests and TypeScript pass. The wider Warp run still has unrelated SSR, routing, and hierarchy/source-contract failures in concurrently edited page code; no unrelated component work was reverted to satisfy those tests. Independent source/captured-frame reviews passed this scoped deformation.

## Earlier-revision verification (historical)

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


## 2026-10-27 — Interior radiance and responsive scroll

Supersedes the earlier sharp-rim formation direction. The existing Ring material now keeps a separately tunable interior field while its radial cavity forms. Interior brightness, color, bloom and blur are independent controls; forming-edge blur separately widens the transient rim. The fill reaches the rim rather than leaving a dark moat around a second central orb. Its envelope fades through settlement and is gone at the original 70% corona handoff. Defaults retain the user's 0.11 size and 0.51 brightness. No scene-node restructuring.

Scroll response and travel are separate: Lenis lerp is 0.35 with the existing 0.45 wheel gain; the headline begins splitting at 0.5% instead of 20%. The 600svh Warp runway adds 25% usable travel; later chapter scale is 1.3. Chapter animations retarget the latest destination immediately rather than queueing obsolete adjacent reveals. No extra animation clock or package was introduced: existing Motion/Three APIs and native GLSL supply interpolation; the feature-specific interior field remains in its owning shader.

Validation (isolated desktop browser tab; original user tabs untouched):
- Scoped combined tests: 94 passed. Typecheck passed; scoped lint has no errors. This is not whole-suite or coverage certification.
- Native controls visibly changed interior color and blur; zero interior brightness/bloom removed the fill without removing the rim. Defaults restored afterward.
- Sampled 63/65/68/70% formation, plus adjacent frames around 67.2% material restoration: no visible sudden cavity or outer-glow cut at the tested settings. Two independent Santa reviewers passed the bounded source/render review.
- A 120px synthetic wheel input moved 54px and visibly began splitting the headline. A 600px input moved 270px; 95% arrived by approximately 176ms. A -300px input reversed monotonically by 135px, with 95% reached by approximately 176ms. Captured per-frame DOM scroll positions, not theoretical timing.
- Evidence: `.output/warp-handoff/combined-final.log`, `typecheck-final.log`, `lint-final.log`, `wheel-response.json`, `wheel-reverse.json`, `interior-final-controls.png`, and `interior-{pre,post}-material.png`.
- Updated stale browser-control script assertions for 18 numeric knobs and ring-size testing during formation. That standalone E2E script was syntax/lint checked, not rerun; controls were exercised through the live browser instead.

Limits: physical trackpad/mobile feel, every extreme tuning combination, and pixel-exact equality to a frozen original reference remain unverified. No commit, deployment, or service restart performed.


### Corrective pass — restore smoothing and material detail

The user rejected the preceding tuning as unsmoothed and visually under-detailed; the previous bounded review did not establish subjective acceptance. This pass supersedes those motion/appearance defaults.

- Lenis lerp returns to 0.16 (not the original 0.1 long tail, nor the rejected 0.35). Existing wheel gain and extra runway are unchanged. Chapter durations are 0.6/0.5/0.8/0.65/0.9 seconds with a gentler initial easing slope. Latest-destination retargeting remains; no queue restored.
- Normal chapter endpoint crossings no longer call position.jump. Initial synchronization uses progress available at effect setup; deferred restoration measurements intentionally animate instead of creating a special snap window or duplicate DOM geometry calculation.
- Interior radiance uses capped headroom addition, replacing the channel-wise max floor that hid darker material detail. Defaults: interior brightness0.30, bloom0.10, forming-edge blur0.5. Material detail emerges over morph0.12–0.8. The original ring/point size and brightness, scene nodes, controls and70% endpoint are preserved.
- RED/GREEN tests cover restored smoothing tokens, live endpoint/reversal behavior, interior contrast, zero light and extreme settings. Combined99 tests pass; noEmit typecheck passes; scoped lint has no errors (existing unused error parameter warning remains).
- Isolated live browser: wheel/reverse measurements show gradual monotonic deceleration. Hero92→100% scrub fades header opacity through0.923/0.605/0.183 before0, rather than snapping at the endpoint. Before/after65% captures show returning asymmetric interior shading;63% remains deliberately diffuse. Original corona remains at70%. Two independent bounded Santa reviews passed.
- Evidence under `.output/warp-handoff/`: `smooth-final-tests.log`, `smooth-typecheck.log`, `smooth-lint.log`, `smooth-wheel.json`, `smooth-reverse.json`, `smooth-endpoint.json`, `smooth-before-65.png`, `smooth-after-{63,65,70}.png`, `smooth-final.png`. Temporary viewport override matched the desktop comparison and was reset afterward.

Physical trackpad feel and user aesthetic acceptance are still open. No commit, deployment, dependency installation or service restart.

## 2026-10-27 — Overlapping choreography (visual gate pending)

This pass changes choreography, not input damping. The existing headline separation retains its early response and translation; scale has its own 0.5–34% channel. The passage now traverses the viewport from 24–60%, with its existing first and second lines revealing over 24–32% and 27–35%. Side-headline opacity holds through 34% and eases out by 43%. No React nodes were added, removed or reparented.

The ring ridge still follows the accepted geometry/restoration clock. Its width narrows later than its radius expands; the filament aperture uses the same width mapping. Surface detail appears earlier, while interior light reaches full support earlier and holds longer before release. Existing tuning defaults, readiness opening, smoothing, chapter durations and original-corona handoff at 70% are unchanged. Motion transform/cubicBezier, Three math and native GLSL are reused; no dependency or parallel interpolation helper was introduced.

Validation: tests first (text and ring RED logs), then 103 targeted tests passed; full noEmit typecheck passed; scoped lint reports zero errors and five pre-existing unused-variable warnings. Evidence: `.output/warp-handoff/choreo-{text-red,text-green,ring-red,ring-green,tests,typecheck,lint}.log`; before-pass production files retained in `.output/warp-handoff/choreo-before/` for scoped review.

Visual gate remains OPEN: the isolated browser attempt at `http://127.0.0.1:3000/` returned `ERR_CONNECTION_REFUSED`. No server or Docker stack was started. Desktop/mobile text collision, interior luminosity, full transition playback and physical scroll feel are not accepted from source/tests alone. No commit or deployment.

Two independent scoped reviews passed the technical checks, including AST node-tree parity. Both withheld visual acceptance because the preview is unavailable. Revisit text collisions and the perceived light-to-ring continuity in the live render before calling this complete.

## 2026-10-27 — Visible passage and half-viewport split

The missing passage was a real rendering defect: Motion could not interpolate a bare `100svh` endpoint against `calc(0svh - 100%)`. At 42% overall progress the live paragraph had opacity 1 but its bottom was already at viewport y=0. Matching `calc` endpoint shapes now interpolate viewport distance and the block’s own height together. A new regression extracts the actual component ranges and runs installed Motion against them, rather than testing only normalized progress.

Split and shrink finish at 7% overall: the existing 600svh runway provides 500svh usable travel, so 7/70 consumes exactly 50svh. The passage follows immediately (7–60%), with staggered line reveals and headline fading before the paragraph crosses center. Smoothing, total runway, node hierarchy, warp/ring and corona timing are unchanged.

Live checks at desktop1280×720 and narrow390×844: the desktop split reaches ±19vw/0.72scale at scrollY360; the passage enters from below, is readable mid-viewport, exits fully above, and retraces on reverse seeks. Desktop34% top319.32/bottom385.88; mobile34% top388.94/bottom438.33. At59% desktop the last14.78px remain visible; after60% the whole block is above. Synthetic wheel/reversal sampling confirms intermediate poses with the existing smoothing. Raw wheel delta and document travel differ because the unchanged wheel gain is0.45; physical trackpad/touch feel remains user acceptance, not a hardware claim.

Validation: new regressions RED2→GREEN; combined105 targeted tests pass, noEmit typecheck passes, scoped lint zero errors (four existing unused-variable warnings). Evidence: `.output/warp-handoff/passage-{red,green,tests,typecheck,lint}.log`, `passage-{poses,wheel,reverse}.json`, and `passage-{desktop,mobile,split,mobile-split}.png`. No commit/deployment or unrelated-file edits.

Two independent Santa reviews passed the scoped source and screenshot checks: no text collisions, no node changes, and no smoothing/ring regressions found. Physical-device acceptance remains unverified.
