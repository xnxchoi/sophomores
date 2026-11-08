# Warp sequence editor

## Scope and use

Open **Sequence editor** at the bottom-left of the local development homepage.
The editor is development-only and does not save to CMS, production, browser
storage, or source files. Export the versioned JSON before leaving; import it to
resume a session. Reset restores the current source defaults, including the
actual headline's character count. Existing Warp look controls remain separate.

- **Page reveal · seconds** edits renderer-ready headline/field reveals.
- **Scroll · percent** edits the Warp choreography through 70%. The original
  corona intro at 70–100% remains seekable but read-only, with its own owner.
- Each property has a separate overlapping lane. Drag/resize clips or enter
  exact endpoints. Selection can auto-seek to the start, end, or clicked position.
- Inspect scene picks associated property lanes, including pointer-transparent
  text. Canvas selection identifies the field group, not individual shader pixels.
- Easing subtracks display compact curve previews. The inspector provides
  graphical Bézier handles, presets, and keyboard-editable control points.
- Playback uses Motion; the timeline package never runs the page animation.
  Shader simulation time remains autonomous, so scrubbing restores scene pose,
  not a bit-identical shader frame.

## Dependency and ownership decisions

Search-first research compared installed Motion, timeline editor packages,
Theatre, and Bézier editors using package sources, documentation, and registry
metadata. The user approved `@xzdarcy/react-timeline-editor@1.0.0` and
`react-bezier-curve-editor@2.1.0`, including their vendor UI styles inside the
developer panel. First-party styling uses Tailwind. Theatre's independent
engine/schema and Studio licensing were unnecessary for this integration.
The Bézier package has differing permissive license metadata (npm ISC/repo MIT).

- `../../src/components`: feature-private serializable
  timing/easing model and Zod boundary validation, shared by owner and editor.
- `../../src/components`: existing frame API plus compiled native Motion
  mappings. This existing renderer contract remains alongside its owning feature.
- `../../src/components`: scene and native playback ownership.
- `../../src/components`: developer UI only; no new production scene wrappers.
- `tests/warp/sequence-editor*.test.*`, `editor-playback.test.ts`, and
  `editor-clock-isolation.test.tsx`: model, component behavior, and playback
  regressions.

Native Motion interpolation and the approved editor packages are reused directly.
The small custom model exists for product-specific clock units, clip IDs, and
handoff constraints, not as a replacement timeline engine. Input boundaries
reject invalid ranges, non-finite coordinates, and incompatible handoff edits.

## Recovery

An unintended working-tree change removed editor files and reverted Warp owners.
Recovery was explicitly authorized. Only affected editor/Warp files were restored;
unrelated working-tree changes were not reset. Local evidence and snapshots are
under `.output/warp-editor/`, including `reverted/`, `recovered/`, and `before/`.

## Verification boundaries

Default compiler parity was sampled at 10,001 positions (maximum difference
4.44e-16). The structure comparison retained 29 Warp/Hero/Story scene nodes;
developer panels and the unchanged TeaserContinuation were excluded.
Model/compiler-only line coverage was 99.34%; this
does not establish whole-feature or repository coverage.

Browser checks cover native clip drag/resize, pointer-position seeking, stationary
timing/easing edits, graphical Bézier changes, scene selection, invalid JSON
rejection, valid JSON round-trip, keyboard clock tabs, and 390×844 panel/export
reachability. Screenshots and observations are under `.output/warp-editor/`.

Repeated opening replay exposed a React/Motion projection feedback loop from
per-frame display state in the scene owner. Precise clock subscriptions now live
in a small editor-only React bridge; native Motion values remain authoritative.
The regression applies 120 samples plus a backward seek without rerendering the
scene owner. Clean browser checks repeat play/pause/backward seek three times,
complete the reveal at 2.8 seconds, then play Warp through its 70% handoff.
Visibility pause/resume intent is covered by production-closure tests, not a
claimed physical browser-background test.

Final checks: 96 focused tests passed; typecheck passed; scoped lint had no errors
and four existing unused-variable warnings. Both independent Santa reviewers
passed the scoped local UI/runtime review. The UI test harness now awaits React
cleanup and its scheduled turn before removing JSDOM globals; this addresses an
intermittent post-test callback error without suppressing failures.

The wider Warp suite passed 126 of 138 tests, with 12 pre-existing/stale failures:
missing App Router
context in SSR fixtures, obsolete notification/renderer source assertions,
500svh expectations against the accepted 600svh runway, and old node fixtures.
These fixtures were not rewritten to manufacture a green result. No default
repository test suite, deployment, or physical-device validation is claimed.
