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
