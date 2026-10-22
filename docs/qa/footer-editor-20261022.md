# Footer field and shader editor QA — 2026-10-22

## Status and scope

Final validation passed on `main` after selective integration, before commit. The footer/editor journeys were rerun after old-path deletions were corrected; the initial duplicate-route build error is resolved.

- Routes: `/#contacts` and `/studies/flame-envelope`, local port 3332.
- Chromium: desktop 1440×900 and phone emulation 390×844; resize 1024×768 and 375×667.
- 34 grouped journey checks across both routes/sizes, plus 2 initial-reduced-motion checks and 2 rejected-route HTTP checks. No app/server edits or deployment by QA.
- Excluded `/studies/aurora` and `/studies/flame-mask` both return HTTP 404 on final `main`.
- Defaults verified: smoothing 1.39%, falloff 1.20, center opacity lift0.18.

## Verified

- Actual footer requests the saved PNG, uses the shared field renderer and has no second CSS mask. Canvas covers the viewport; no smaller clipping container or horizontal overflow.
- Leaving contacts pauses elapsed/breathing clocks and emission gain. Returning resumes without resetting. Synthetic hidden-tab state also pauses/resumes.
- Initial reduced-motion load is paused at exactly 0 on desktop/mobile. Dynamic preference changes preserve the still field; clearing preference resumes. Resize retains paused time.
- Editor default/procedural/local PNG/SVG selection, keyboard file picker, render/mask switching and pause/resume work.
- Alpha 0/half/1, asymmetric orientation and black RGB/opaque alpha fixtures pass. Raw material RGB remains byte-identical to the pre-integration canonical opaque capture. Saved shader-mask versus CSS composition differs by at most 1 RGB unit from raster sampling.
- Invalid files fail to transparent black with a recoverable message; valid replacement restores rendering and clears the error without resetting clocks.
- Hero material/config/layout/renderer/palette/geometry/viewport fingerprints match their pre-task values.
- Inspected desktop/mobile actual footer and editor screenshots. Visible footer copy has measured contrast ≥8.66:1 desktop and ≥8.69:1 mobile, except the existing covered backlink described below. These are sampled paused-frame background measurements, not a comprehensive accessibility audit.

## Existing issues outside this slice

1. **Desktop footer backlink is covered by fixed navigation.** At 1440×900, “Back to the beginning” occupies approximately x652–809/y861–876 under the nav. Its measured contrast is not meaningful as readable text because the nav obscures it. Invitation/footer markup and fixed-nav classes were unchanged by this integration; source diff confirms only import changes in `narrative.tsx`, and import/Lenis changes in `experience.tsx`. Mobile backlink remains visible. No layout scope expansion was made.
2. **Existing development React warnings:** desktop/mobile traversal logs render-phase updates from Hero → BlurText and StoryCard → StoryArtwork. No new field/editor error, shader failure, or page exception occurred. These warnings are retained in evidence, not suppressed or presented as a zero-warning result.

## Evidence

Raw artifacts and reproducible read-only harnesses are outside the repository:
`/tmp/sophomores-final-qa-20261022/`

- `home.cjs`, `home-results.json`: footer lifecycle, viewport coverage and sampled contrast.
- `editor.cjs`, `results.json`: editor journey and pixel-fixture comparisons.
- `initial-reduced.cjs`, `initial-reduced-results.json`: native initial preference, both sizes.
- `{desktop,mobile}-home-footer-normal.png`, `-home-footer-reduced.png`, `-home-footer-resized.png`.
- `{desktop,mobile}-default-render.png`, `-default-mask.png`: editor captures.
- `hero-material-check.json`: preserved hero source fingerprints.
- `final-main-{editor,home,reduced}.log`, `excluded-routes.json`: final main rerun and rejected-route checks.

## Validation limits

- Phone emulation is not physical iPhone/Safari proof; no hardware/iOS performance acceptance claimed.
- Installed Chromium updates the media query match on emulation but emits no MediaQueryList change event. Dynamic preference checks therefore dispatch that event explicitly; initial reduced-motion checks require no workaround. Hidden-tab and context-state checks are synthetic lifecycle tests.
- Screenshot approval is not inferred from technical passes. No native Illustrator roundtrip, deployment ingress, full-site regression, or production release validation is claimed here.
- `/tmp` artifacts are ephemeral. This report is the durable summary, not an archive of binary captures.
