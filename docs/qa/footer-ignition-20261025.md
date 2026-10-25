# Footer ignition and weighted preservation — 2026-10-25

## Direction and boundaries

The first synthetic gas-flame treatment was rejected for its stripes. It is not
the visual reference. The original soft, transparent field is the foundation;
`design/flame-envelope/ignition-sequence.mov` informs ignition and motion only.

Independent OG:NG budgets live in `components/flame-backdrop/field/blend.ts`:

| Factor | OG | NG |
| --- | ---: | ---: |
| Overall silhouette | .70 | .30 |
| Material / transparency | .90 | .10 |
| Color | .80 | .20 |
| Surface / texture | 1.00 | .00 |
| Motion | .30 | .70 |
| Animation | .00 | 1.00 |

These are interpolation controls, not measured percentages of perceived pixels.
There is one original flame field, not two rendered flames or a raster crossfade.

## Implementation

- `field/gas-shader.ts` embeds `createResponsiveEnvelopeShader` unchanged apart
  from function parameters for UV/time and its entry-point name. A roundtrip test
  recovers the exact canonical source. The rejected ribbon/jet/surface generator
  is removed. The saved mask, historical material, hero and editor are unchanged
  by this feature.
- Silhouette contributes only a broad, bounded alpha envelope; material adds a
  small proportional transparency modulation. Color interpolation preserves the
  original luminance and alpha. Surface generation remains entirely canonical.
- Motion uses continuous active time at the weighted pace `.3 * 1 + .7 * 1.6`;
  the original editor clock remains unchanged. Sparse detached crackles do not
  define or replace the flame body.
- `field/ignition.ts` holds black for .3 active seconds (approximately 1.5 times
  the reference's .2-second opening), then catches, spreads and rises through a
  three-second sequence. Actual section intersection, not preloading, starts it.
- Reverse scrolling permanently enables scrub mode with a .18 pilot floor.
  Fast upward exit retains that pilot without advancing active clocks. Reentry
  restores the field without replaying black. Shared mask/material translation
  keeps the pilot in a partially visible footer and is continuous at completion.
- `FlameFooterBackdrop` opts in; the shared editor does not. No second RAF loop,
  new runtime dependency, wordmark change or reduced-motion gate was added.

## Validation

- 54 focused field, mask, ignition, shader and integration tests pass.
- New timing/blend helpers have 100% line/function coverage and greater than
  90% branch coverage; this is not whole-project or GPU coverage.
- Fresh Next production build, typecheck and scoped ESLint pass.
- Earlier repository-wide tests were not clean: authentication tests failed in
  the concurrently dirty workspace. That run is not represented as passing and
  was not widened into unrelated authentication repairs.
- Live Chromium inspection: 1200x811, 390x844, 768x1024 and 375x667. A clean
  resize sweep retained active rendering; no horizontal overflow was observed.
- Entry captures show localized catch, low spread, rise and original sustained
  field. At 14.9911% exposure, progress .965889 to 1 stayed spatially continuous.
- Reverse at 8.0244% exposure reached progress .245824. Exit retained .18;
  active elapsed 36.955700 stayed unchanged across the pause sample. Reentry
  reached .995160 without black replay.
- Clean built-app screenshots have no development issue badge; its console
  sample had zero warnings/errors. Two independent final Santa reviews passed
  the preservation, weights, readability, ignition continuity and runtime rubric.

Evidence is local, outside tracked source, under
`/Users/seanschoi/Projects/Sophomores/`: `flame-weighted-clean-desktop.png`,
`flame-weighted-clean-mobile.png`, `weighted-sequence-*.png`, and
`weighted-partial-{before,after}-settle.png`.

Local built-app preview: `http://127.0.0.1:3108/#contacts`. Authentication mode is
overridden only for the loopback process; no saved credentials or environment
files were changed. This is not a deployment, physical Safari/device check or
user confirmation of the artistic result. No commit, push or remote change.

## Visibility follow-up

The user approved the weighted appearance but requested less blur/fuzz. The
production-only `field/visibility.ts` derives an immutable, validated config:
existing front softness `.065 -> .0403` (x.62), brightness `.65 -> .728` (x1.12).
These are parameter changes within the original algorithm, not a new surface.
Mask/alpha formulas, palette, blend weights, noise functions and timing remain
unchanged. The canonical roundtrip now compares against that explicitly tuned
original configuration; the editor/hero do not receive the tuning.

Matched before/after browser captures use the same active time (4s), uniforms,
mask, viewport, exposure and presentation. They show a modest definition lift,
not a hard-edged graphic. The test-only frozen render is not shipped; normal
animation was resumed with a reload and checked on 390x844 and 375x667. Matched
evidence: `definition-before-matched.png`, `definition-after-matched.png` in the
same local evidence directory. Two independent visual/code Santa reviews pass.

Resize testing also reproduced a pre-existing queued-observer bug: one callback
contained an exit followed by reentry, but only its first entry was consumed.
`latestViewportIntersection` now applies the last entry, with an empty-batch
guard. A RED-to-GREEN regression covers both batch orders. Instrumented browser
resizes reproduced `[false,true]` batches after the fix while playback remained
`playing/always` and elapsed advanced 3.566400 -> 3.873900 over the pause sample.
The playback architecture and clocks are otherwise unchanged. Code and React
reviews pass; 58 focused tests, scoped ESLint, typecheck and production build pass.

### Stronger visibility revision

The user rejected the mild visibility pass as still too blurry and dark.
Only the two production visibility constants were increased in strength:
front softness `.0403 -> .00975`, brightness `.728 -> 2.6`. Alpha, mask,
palette, original surface functions, blend ratios and timing stay unchanged.
The test now prevents falling back to a barely perceptible adjustment.

Root compared several real-GPU candidates at matched active time 4s and chose
`clarity-strong-d.png` against `clarity-strong-before.png`. The chosen values
were then confirmed in the generated production shader. Two independent
code/Santa reviews passed the stronger-definition, retained-identity and
readability rubric. 58 focused tests, scoped lint, typecheck and build pass.
The loopback built-app server was restarted and both existing in-app preview
tabs were explicitly reloaded, rather than relying on an already-open tab to
pick up a newly built bundle.

## Material/body checkpoint — visual gate failed

The next approved plan required connected translucent interiors before any
motion work. `field/body-material.ts` now derives independently bounded body,
edge and halo lighting from the existing reaction/fuel/backlight fields. It
preserves exact OG radiance and blends normalized NG lighting at the actual
90:10 material ratio. It removes the previous alpha-breath proxy and bypasses
the failed sharpening/exposure override. Canonical source files, mask, palette,
blend ratios and all motion/ignition clocks remain untouched.

Root inspected the first candidate and the single permitted correction in the
live GPU renderer. Both still read as blue fog. Two independent final Santa
reviews also failed the flame-body gate. Passing technical checks are not
visual acceptance: 64 focused tests pass; changed-module coverage is 100%
lines/functions and greater than 95% branches, with scoped lint and typecheck
passing. No additional brightness tuning or motion implementation followed.

Matched evidence includes original lighting, the rejected contour pass, and
the corrected 90:10 candidate. Still frames use active time 4s; three synchronized
12fps recordings cover the same active-time segment, 4–12s. A locally served
comparison is available at `http://127.0.0.1:3110/`; files are under
`/Users/seanschoi/.codex/visualizations/2026/10/25/01a170fb-4650-7d63-a8a8-316a9ecf936d/flame-material-checkpoint/`.

The candidate remains an unaccepted working-tree prototype. It was not built
into or promoted to the existing port-3108 preview, committed, pushed or deployed.
This bounded attempt does not establish that every possible 90:10 material
solution is impossible. The next step requires a user decision on a material-only
ratio comparison or another approved constraint change; surface/noise identity
must not be silently replaced.

## Material-only ratio comparison — no candidate accepted

User authorized 70:30 and 50:50 alongside 90:10 for comparison only. Optional
validated immutable material weights alter only the final lighting mix. The
default remains 90:10; mask, surface/noise, palette, alpha and clocks are fixed.
Matched 4s stills and the same approximately 8-second active-time recording
segment are available at http://127.0.0.1:3110/. Existing comparison preserved
as body-baseline-comparison.html.

Root inspected the live desktop/mobile gallery and playback. Two independent
Santa reviewers failed all three ratios: diffuse dim blue clouds rather than
convincing flame bodies. Higher NG fills interiors but does not solve spatial
structure. This does not rule out other lighting profiles; no variant was
promoted and no new motion work followed. Port 3108 remains unchanged.

Browser QA found the original static-server media unseekable. Lossless VP9
remux plus local blob-backed loading fixes seeking without new dependencies.
Shared controls passed: simultaneous playback at 1.2058s; scrub paused all at
2.999988s; resume advanced all to approximately 3.5055s; restart paused at zero.
All three full-size still links returned 200. Desktop 1440x1000 and mobile
390x844 have no horizontal overflow. The existing user tab was reloaded and
playback visually verified. These are local Chromium checks, not physical
Safari/device acceptance. Screenshots: comparison-desktop.png and
comparison-mobile.png beside the gallery.

Current rerun: 26 scoped material/gas/blend/ignition/stability tests pass.
Independent code review also passed typecheck, scoped ESLint and 15 focused
material/gas tests. Technical comparison passes; flame appearance fails.
No commit, push, build promotion, deployment or external changes.

## Black-video playback correction

User screen recording demonstrates completely black video surfaces despite
advancing clocks, not merely dim source content. The previous explanation
conflated these and was incorrect.

Changed only comparison gallery sources from alpha-tagged VP9 WebM to opaque
H.264 MP4 (yuv420p, faststart, CRF12; one black bottom padding row for even
height). No brightness gains, shader, palette, material or motion changes.
The existing affected in-app tab was reloaded: all three now visibly show
blue forms during playback and after restart. Screenshot: playback-fixed-iab.png
in the comparison directory. Encoding/playback compatibility is isolated as
the practical fault; the exact browser decoder/compositor failure is not proven.

Local browser regression passed shared play/pause, matched seek, restart,
720x488 decoded dimensions and null media errors. Santa review: comparison
playback now usable; flame appearance remains unaccepted.

## User-approved 70:30 — live local integration pass

User accepted material-lighting OG:NG 70:30 and requested a live pass. Changed
only field/blend.ts material default and matching regression assertions; all
other factor weights, mask, palette, alpha, surface, emission and timing remain
unchanged. Explicit 90:10 override coverage remains. Tests failed on old default
before implementation, then 26 scoped tests passed; scoped lint and typecheck
passed. Independent code review passed.

Live dev http://127.0.0.1:3107/#contacts uses the actual footer component, not a
video. Inspected compiled active WebGL fragment source: 0.70/0.30 present,
0.90/0.10 absent. Existing IAB tab 1 now points here; port3108 built app unchanged.
No new server, build, commit, push or deployment.

Desktop1440x1000 cold entry at15% exposure: progress0 at elapsed.0377/.1872,
.090926 at.5455, .316370 at1.1542, 1 at3.4575. Reverse to8% exposure reached
.245633. Offscreen retained.18 with elapsed4.241700 unchanged across pause.
Reentry reached.999995 without black replay. No pageerrors. Mobile390x844 had
no horizontal overflow; reverse7.1275% exposure reached.238487.

Santa review: desktop fidelity and reverse/reentry PASS against user-approved
material direction. Mobile visual-read NOT PASSED: significantly fainter at
390px, nearly lost in black at sampled phase. Do not claim cross-viewport visual
completion or silently add brightness/geometry changes. Physical-device/Safari
not tested. Actual IAB also visually inspected. Evidence files live70-*.png
are beside the comparison gallery.

## Library-first rules and nearest-owner cleanup

Saved the refined rule in project AGENTS.md and global ~/.codex/AGENTS.md.
The rule includes installed-package/doc lookup before custom helpers; distinct
use cases before shared utils extraction; non-React-only utilities; real React
files; root tests; modular nesting; and nearest production-owner placement
within framework constraints. User explicitly approved feature-private _shared
.ts exceptions and a named root flame-backdrop package. No blanket lib move
remains; existing unrelated lib code was preserved.

Shared flame source is now flame-backdrop/{field,mask,react}; one-study renderer
lives with app/.../flame-reference/_rendering. Four real hooks stay beside their
consumers; editor reducer and single-owner style data were inlined. Four small
sibling-shared modules use approved feature _shared folders. Browser visibility
subscription/server snapshot are the only cross-domain utilities. All new tests
and fixtures live in scoped root tests folders. Test discovery now uses Node's
documented recursive globs and source packaging includes the actual source
boundaries; isolated snapshot tests model installed dependencies without shipping
node_modules. No forwarding façades were left in previous staging folders.

Installed Three MathUtils replaces redundant CPU smoothstep, clamps, interpolation
and damping. Color.convertSRGBToLinear replaces the repeated transfer function.
Original shader fixture hashes remain fixed: tests verify every nonnumeric byte
and Float32 numeric value, not falsely identical decimal strings. Characterized
color error max1.08147e-11, damping1.11022e-16. A representative Node26 benchmark
(120000 color initializations, alternating order, median after warmup) measured
26.84ms original vs23.50ms installed; this is NOT a browser FPS/bundle benchmark.
Scoped changed-logic coverage:99.31% lines,96.52% branches,97.83% functions.

Final canonical typecheck passes; scoped ESLint passes (existing unrelated warnings
remain). Recursive full run:968tests,886pass,56fail,26skip. Failure names are the
same56 as pre-cleanup root-only baseline(836tests,754pass,56fail,26skip), with no
new failure names. Five existing material assertions still expect70:30 whereas
the actual working-tree material was already75:25 at task start; that dirty
setting was preserved, not silently fixed.123 owned flame-package tests pass.
The whole repository test suite is therefore NOT green.

Live browser: desktop1440x1000 footer ready, sustained1; reverse8% exposure
progress.245637; exit retains.18; reentry1. Editor ready with ignitiondisabled.
Account-compositions study renders. Mobile390x844 has no horizontal overflow;
known faint flame remains. Santa review passes refactor visual preservation,
not a new aesthetic/mobile acceptance. No pageerrors, but the two existing React
render-phase warnings (Hero->BlurText and StoryCard->StoryArtwork) remain; these
also appeared in the older dev log before this verification.

The pre-existing3107 process referenced deletedNext16.3.8 after an unrelated
dependency update to installed16.5.0-canary.14. Restarted only3107 on loopback
using documented PREVIEW_AUTH_MODE=public ordinary local UI development mode
(deployment/PREVIEW-AUTH.md); no credential/config edits or cache deletion.
Built3108, comparison3110 and external previews were not changed. No install,
commit, push or deployment performed by this task. Actual IAB tab reloaded.
Evidence: reuse-cleanup-*.png beside the local comparison gallery.

## Centralized appearance controls — no retuning

Authoritative file: flame-backdrop/appearance.ts. Groups cover frontsoftness and
pixel/pointer widening, OG diffusion/interior/edge coefficients, current NG body
profile, OG:NG mix, exposure/breathing/stems, renderer quality/mask filtering,
mask-build/editor defaults and size, verticalstretch, and explicitly inactive
legacy values. Each setting has effect/unit/useful-range comments; ranges are
starting guidance, not newly enforced clamps. No controls UI/settings engine added.

Captured actual current source first: .045 softness, .74 bodybacklight, .18 edge,
75:25 mix, gain1–1.9. Did not normalize current NG gains(1.10 total). Frozen
historical blocks and original fixtures remain unchanged by this refactor. New
current-state fixtures compare21lighting samples, gain samples, full current
shader nonnumericbytes/Float32numbers, and PNGchecksum. Parent tests verify
unchanged generated mask/Illustrator SVG checksums and rendering bindings.
Baked PNG was not regenerated. Unused footerOpacity.85 and old visibility pass
are catalogued as inactive and remain unconsumed by the active footer.

New6appearance tests pass; declarative catalog coverage100% lines/functions and
77.78% reported branches (the catalog itself contains no conditional logic).
Canonical typecheck and scoped ESLint pass. Full recursive974tests:883pass,65fail,
26skip; pre-change968tests:877pass,65fail,26skip. Failure names unchanged. The
existing failures include earlier tuning/provenance/default assertions; these were
not rewritten to manufacture a green repository suite. Updated only2introduced
test assumptions: isolatedsource fixture now copies appearance.ts dependency;
breathing equivalence checks every nonnumericbyte and Float32literal rather than
decimal spelling. Original provenancehash checks were not reset.

Live1440x1000: firstentry black0 at15%exposure, sustained1; reverse8% ->.245637;
offscreen retains.18; reentry1. Mobile390x844 ready and no horizontaloverflow.
Editor ready with savedmask and unchanged controls. No pageerrors. Independent
code and Santa preservation reviews PASS; known faint mobile effect unchanged.
Evidence: appearance-footer-desktop.png, appearance-footer-mobile.png and
appearance-editor.png beside the comparison gallery. Local-only; no install,
commit, push, sourceasset overwrite, or deployment.

## Accepted checkpoint and rejected depth proof — 2026-10-25

The three-stratum depth experiment was rejected and reverted. Production again
uses `createBodyMaterialShader`; no depth controls, depth shader, or probe is
loaded by the accepted renderer. Ignition and interaction choreography were not
changed by that experiment. Restoration was checked live on loopback port 3107;
the preservation review passed, without claiming improved clarity or brightness.

The rejected source is preserved separately on local branch
`experiments/flame-depth-20261025`, including its construction tests, browser
probe, and exact generated shader inputs. This is an unapproved experiment,
not a production candidate. It produced hollow basins/contour shoulders rather
than convincing overlapping tongues. Branch-local density was only proposed;
it was not implemented. Existing historical material references remain intact.

Precommit validation used a staged-only source snapshot: 241 flame/dependency
tests, 227 pass and 14 known baseline failures. The restored working tree has
the same 14 failure names, with no new names in the staged snapshot. The six
appearance characterization tests pass; typecheck passes. Installed production
dependency audit reports zero advisories. Canonical GLSL fixtures retain their
original whitespace rather than changing provenance bytes to satisfy whitespace
checks. Authentication, Warp, generic cleanup, and dependency updates remain
outside this checkpoint. No push or deployment is included.
