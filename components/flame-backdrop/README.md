# Flame backdrop components

## Current footer: image-backed airy field

`FlameFooterBackdrop` now uses the accepted B/breathing material from the shader
editor with the approved image mask. The hero's original `FlameBackdrop` is unchanged.
The actual site footer is wired in `components/teaser/scene.tsx`; the developer
editor remains at `/studies/flame-envelope`.

```tsx
import FlameFooterBackdrop from '@/components/flame-backdrop/footer';

<FlameFooterBackdrop
  maskSource="/masks/flame-envelope.png"
  visible={footerIsActive}
  paused={false}
  style={{ position: 'absolute', inset: 0, height: '100%' }}
/>
```

Give the host a nonzero height; the canvas uses the project's Tailwind utilities.
The component is decorative and pointer-transparent. Put the content above it.

| Prop | Default | Purpose |
| --- | --- | --- |
| `maskSource` | `/masks/flame-envelope.png` | PNG/SVG alpha; RGB is ignored. Swap the file or URL without changing material code. |
| `visible` | `true` | Pause active-time motion offscreen without unmounting. |
| `paused` | `false` | Freeze the current frame. |
| `className`, `style` | — | Host layout and dimensions. |

Mask replacement keeps the WebGL context and active-time clock. Pending/failed
masks render transparent rather than exposing an unmasked rectangle. Errors are
logged and surfaced on `data-field-error`; page content remains usable. Document
hiding, explicit pause, and caller visibility suspend the clock; resuming does not
restart the breathing cycle. The site mounts only after the first footer visit and
retains it afterwards. Parent scene opacity remains `.85`.

### Edit points

- `field/parameters.ts`: default mask URL.
- `mask/profile.ts`: approved export defaults, **1.39% smoothing / 1.20 falloff / .18 center lift**.
- `mask/svg.ts`: shape/opacity construction. Center lift does not modify material RGB or outer-edge opacity.
- `field/shader.ts`: image-alpha application and accepted viewport-to-material mapping.
- `field/material.ts`: recovered material snapshots and 24-second A/B breathing. Change intentionally, not during a mask-only adjustment.
- `field/renderer.ts`: shared Three.js runtime, texture loading, resize and playback lifecycle.
- `../devtools/flame-editor/flame-editor.tsx`: durable saved/procedural/local-image editor.
- [`../../design/flame-envelope/README.md`](../../design/flame-envelope/README.md): editable vector source, exports and mask replacement procedure.

The editor's local PNG/SVG picker and procedural sliders do not upload or overwrite
the production image. Export a new asset separately, or supply a different
`maskSource`. Its Before button preserves the older mask for comparison. Saved
images already contain the center-lift adjustment; the shader does not apply it a
second time. Historical study routes are compatibility references, not runtime dependencies.

## Legacy ring and procedural footer renderer reference

The notes below document the original `FlameBackdrop` / `createFlame` renderer and
prior footer experiments. Their palette/config/ignition examples are **not** the
current `FlameFooterBackdrop` API above. The original hero retains those APIs.


Self-contained extraction of the approved Sophomores procedural flame material,
including the ring-bound gliding sheen and soft six-band prism dispersion.
No videos, textures, Blender files, study controls, assets, R3F, or new dependencies.
Only React is needed by the optional component wrapper; `createFlame` works without React.
The existing site is **not** wired to this component automatically.

## Drop-in footer (approved iteration)

Import the dedicated footer entry. All approved settings are already the defaults:
the taller translucent flame, faint stems, first-entry ignition, and slow blue/green drift.

```tsx
import FlameFooterBackdrop from '@/components/flame-backdrop/footer';

<FlameFooterBackdrop style={{ height: 480 }} />
```

Give the component a nonzero height. It renders its own near-black background and
is decorative/pointer-transparent. Layer footer content above it using your layout.
No external assets, global styles, providers, Three.js, or preview server are needed.
Keep the runtime files together in this folder; `__tests__` and this README are not
runtime dependencies. Nothing has been wired into the site's pages automatically.

- `footer.ts`: default/named footer component, props type, preset and resolver.
- `index.ts`: original full-ring default plus both named components and shared APIs.
- `viewportActivation="once"` is the footer default; use `"repeat"` to relight on reentry.
- `config` exposes flame shape, stems, colors, hue timing, ignition and quality controls.
- Motion remains enabled regardless of the system motion preference; explicit pause and visibility controls remain.

## Footer fire variant

`FlameFooterBackdrop` uses the same renderer, but anchors a flattened arc at the lower
edge as an invisible emission zone for translucent blue reaction fronts. Thin
luminous borders surround dark interiors; no warm rim or rainbow whitening is
added by the footer preset. The
original `FlameBackdrop` defaults remain unchanged; fire is opt-in there.

```tsx
import { FlameFooterBackdrop } from '@/components/flame-backdrop';

<FlameFooterBackdrop
  palette="copper-ember"
  viewportActivation="once"
  viewportThreshold={0.3}
  style={{ height: 480 }}
  config={{
    ignition: { enabled: true, durationSeconds: 1.6, sweepFraction: .55 },
    motion: { loopSeconds: 16 },
    composition: { widthRatio: 0.94, heightRatio: 0.90, verticalScale: 0.60, baselineOffset: 0 },
    fire: { intensity: 1, plumeHeight: 0.25, plumeFrequency: 9, flowCycles: 2, warmth: 1, curlAmount: 0.7, rimStrength: 0,
      baseColor: '#155BFF', tipColor: '#5CBFFF', frontSoftness: .065, bodyOpacity: .04,
      stemStrength: .1, alternateBaseColor: '#086FBA', alternateTipColor: '#48BFA6', colorCycleSeconds: 32 },
  }}
/>
```

Pause, pointer, fallback, and quality props remain available. For a single hue,
set `fire.baseColor` and `fire.tipColor` to the same hex color **and** set
`fire.colorCycleSeconds: 0` to disable the alternate-color cycle. The blue footer uses
`fire.warmth: 1`, selecting these pigments exclusively. Set it below 1 to blend in
the existing driver-agnostic palette/weight input; at 0 the palette controls hue.

The default responsive height is `clamp(300px, 42vw, 580px)`;
override it through `style` to fit the footer. Use `resolveFooterConfig()` with
`createFlame` for non-React integration. `DEFAULT_FOOTER_CONFIG` is immutable and exported.

| Control | Meaning |
| --- | --- |
| `composition.mode` | `'ring'` uses the original centered square; `'footer'` uses a bottom-anchored upper hemisphere. |
| `composition.widthRatio` | Maximum sphere diameter as a fraction of host width. |
| `composition.heightRatio` | Maximum unscaled radius as a fraction of host height, before verticalScale. The smaller width/height constraint wins. |
| `composition.verticalScale` | Artwork height multiplier, .25–2 (original ring 1, footer .6). Lower values flatten the arc; pointer coordinates use the same transform. |
| `composition.baselineOffset` | Sink the sphere center below the host bottom, in host-height units; zero shows a half-sphere. |
| `fire.intensity` | Flame contribution; zero omits the extra field and warming. Full-ring default 0, footer default 1. |
| `fire.plumeHeight` | Upward plume reach in artwork units (must be positive). |
| `fire.plumeFrequency` | Noise-cell density across the emission arc; higher produces smaller flame patches. |
| `fire.flowCycles` | Integer upward-flow cycles per geometry loop, preserving a seamless wrap. |
| `fire.baseColor`, `fire.tipColor` | Validated #RRGGBB pigments at the base and rising tips; use matching values for monochrome flames. |
| `fire.frontSoftness` | Reaction-front width in fuel-field units, .005–.2; default .065. Larger values soften the luminous membrane. |
| `fire.bodyOpacity` | Interior emission relative to the front, 0–.15; default .04. Not CSS or canvas alpha. |
| `fire.stemStrength` | Faint noise-gated fuel stems below the flame front, 0–.3. Footer .1; 0 omits them. |
| `fire.alternateBaseColor`, `fire.alternateTipColor` | Second pair of validated hex pigments for the optional hue cycle. |
| `fire.colorCycleSeconds` | Blue→alternate→blue period in active seconds; 0 disables cycling. Footer 32s. Independent of geometry. |
| `ignition.enabled` | Enable procedural ignition: center-out for light; traveling arc catch for substance. Original ring false; footer true. |
| `ignition.durationSeconds` | Time from dark to fully caught; footer 1.6s. Pausing or hiding freezes progress. |
| `ignition.sweepFraction` | Fraction of ignition duration allocated to propagation; default .55. Substance travels left→crown→right at uniform angular speed; light remains center-out. The remainder is each sector’s catch/rise/settle time. |
| `fire.warmth` | Legacy tint-mix name: 0 uses palette pigments, 1 uses only baseColor/tipColor; not a color-temperature control. |
| `fire.curlAmount` | Domain turbulence amplitude of the rising flame field, 0–2. |
| `fire.rimStrength` | Strength of the underlying ring/hearth when fire is active, 0–1. Lower reduces the underlying arc so the moving sheets define the edge. |

Footer defaults also use ring thickness 1.65, breathing 1.35, inward leakage .7,
brightness .65, overlap whitening 0, and no prism or native RGB split. The approved
full-ring material keeps all its original color and prism defaults. Every value
can be overridden independently; coupled prism bounds validate against the footer
preset. The top edge softly dissolves to the configured background rather than
clipping flame tips. Geometry and pointer hit-testing share the same transform.

The footer uses a taller, broader flame and a 16-second geometry loop without
increasing brightness or body opacity. Its dedicated pigments drift to sea-glass
blue-green and back over 32 active seconds. Use `fire.colorCycleSeconds: 0` for a
fixed tint, or provide your own palette driver with `fire.warmth: 0`.

Viewport activation is optional in the shared renderer wrapper, on by default only
for the footer. The observer starts hidden until its first result (no lit flash).
Once-mode progress survives ordinary prop/config updates; repeat-mode rearms on
full viewport exit, not threshold jitter. Document hiding and caller `visible:false`
pause rather than rearm. With unavailable IntersectionObserver,
activation settles immediately.
The study's **Test viewport entry** control adds scrolling space; **Repeat ignition**
is a preview setting, not the reusable component's default.

Local visual study: http://127.0.0.1:4178/footer-preview/ (requires the existing
motion-study server). No site footer markup or routes are modified by this package.

## Palette control is driver-agnostic

The renderer accepts either a preset name or three blend weights. It does not own
a scroll listener, timer, section observer, or interaction state. Any of those can
drive the same input:

```tsx
import { FlameBackdrop } from '@/components/flame-backdrop';

<FlameBackdrop
  palette="gilded-flame"
  transitionSeconds={2.4}
  style={{ position: 'fixed', inset: 0 }}
/>
```

Place it behind content using your layout's stacking order. It is decorative,
`aria-hidden`, and pointer-transparent. It observes pointer movement on the window,
so buttons and links above it remain interactive. Give its host a nonzero height;
the artwork occupies the centered square within the available rectangle.

### Presets, buttons, or section changes

Set `palette` to `'pale-brass'`, `'gilded-flame'`, or `'copper-ember'` from your own
state. Each change eases from the **currently displayed mix**, not the previous
endpoint. Reversing or interrupting a transition does not jump, restart the ring
animation, recompile the shader, or reset the cursor sheen.

```tsx
const [activePalette, setActivePalette] = useState<FlamePalette>('gilded-flame');
// A button, IntersectionObserver, timeline, or other controller calls setActivePalette.
<FlameBackdrop palette={activePalette} transitionSeconds={2.4} />
```

Import `useState` from React and `FlamePalette` from this folder when using the snippet.
There is no preference for scroll over other drivers.

### Scroll thresholds

The pure helpers can map your existing progress value to a preset:

```ts
import { paletteAtProgress, scrollProgress } from '@/components/flame-backdrop';

const stops = [
  { progress: 0, palette: 'gilded-flame' },
  { progress: 0.4, palette: 'pale-brass' },
  { progress: 0.75, palette: 'copper-ember' },
] as const;

const progress = scrollProgress(scrollTop, scrollHeight, viewportHeight);
const palette = paletteAtProgress(progress, stops);
// Pass palette to <FlameBackdrop palette={palette} />.
```

Thresholds work in both directions; equality activates the new stop. These are
example positions, not site-specific section assumptions. Stops must begin at 0
and increase strictly within [0, 1]. For section-based control, skip the helpers
and pass the section's preset directly. The host owns scroll/resize subscriptions
and cleanup, whether the scroll container is the window or a custom element.

### Continuous scroll, sliders, timelines, or other animation systems

Weights are ordered **[pale brass, gilded flame, copper ember]**. They must be finite,
nonnegative, and not all zero; normalization is automatic and never mutates input.
Pass continuously animated weights with `transitionSeconds={0}` so the renderer
doesn't add another layer of easing to your controller.

```tsx
<FlameBackdrop palette={[0, 1 - progress, progress]} transitionSeconds={0} />
```

With a positive duration, a weight tuple is a target blend just like a preset.
Mixing occurs on strength-weighted linear-light pigments before the existing
overlap whitening, prism, and display transform—not by crossfading video frames.

### Cyclical driver

```tsx
import { cyclePaletteWeights } from '@/components/flame-backdrop';

const palette = cyclePaletteWeights(elapsedSeconds, {
  palettes: ['gilded-flame', 'copper-ember', 'pale-brass'],
  holdSeconds: 8,
  transitionSeconds: 8,
});
<FlameBackdrop palette={palette} transitionSeconds={0} />
```

Supply `elapsedSeconds` from your existing animation clock. This helper starts no
timer and has a smooth loop seam. The host should suspend its own clock when not
needed; the renderer independently respects document visibility and explicit pause.

## Public component props

| Prop | Default | Purpose |
| --- | --- | --- |
| `palette` | `'gilded-flame'` | Preset or normalized three-palette weights; any controller can supply it. |
| `transitionSeconds` | `2.4` | Smoothstep transition duration. `0` follows external control immediately. |
| `config` | Approved defaults below | Nested partial visual/behavior settings. |
| `paused` | `false` | Freeze all animation, including an in-progress palette transition. Resume continues it. |
| `visible` | `true` | Suspend rendering when offscreen/unused. Does not unmount the fallback. |
| `viewportActivation` | `none` (footer: `once`) | `none`: immediately settled; `once`: ignite first entry and retain progress; `repeat`: extinguish on full exit and ignite next entry. |
| `viewportThreshold` | `.08` (footer: `.3`) | Visible host fraction needed to start. Falling below threshold does not rearm until the host fully exits. |
| `className`, `style` | — | Host layout. Default fills a positioned parent; supply a height/inset. |
| `fallback` | Near-black container | Optional decorative still/React node behind the canvas during SSR or failure. No image required. |
| `onUnavailable` | Console error | Client-side callback for WebGL allocation, shader, drawing, or context-loss failures. |

`paused` also defers zero-duration palette updates until playback resumes.
Hidden documents stop scheduling; return resumes without counting hidden wall time.
WebGL failure hides the canvas and releases GPU resources; remount to retry.

## Named configuration

```tsx
<FlameBackdrop config={{
  visual: { ringThickness: 1.425, inwardLeakAmount: 1 },
  pointer: { angularFollowRate: 3.8, tangentRadius: 0.284375 },
  prism: { spread: 0.012, amount: 0.42 },
  motion: { loopSeconds: 12 },
  quality: { fps: 30, maxPixelRatio: 1.5 },
}} />
```

Omitted fields retain the approved settings. Changing config **recreates** the
renderer and resets its scene clock; use `palette` for per-frame color changes.
Equivalent freshly allocated config objects do not trigger recreation. Invalid
values fail clearly rather than being silently clamped. Exact bounds and types
are in `config.ts`; `DEFAULT_FLAME_CONFIG` and `resolveFlameConfig` are public.

Distances below use artwork units: the centered square is 1 unit wide, not CSS pixels.

| Group | Controls (default) | Meaning |
| --- | --- | --- |
| `visual` | `ringRadius` .35; `ringThickness` 1.425 | Mean radius and ring-body width multiplier. |
| | `brightness` 1; `breathingAmount` 1 | Pigment brightness and radial breathing multiplier. |
| | `inwardLeakAmount` 1; `overlapWhitening` 1 | Natural inner haze multiplier and overlap-to-white strength (0–1). |
| | `backgroundColor` `#030504` | Opaque six-digit sRGB background color. |
| `pointer` | `enabled` true; `proximityRadius` .12 | Toggle and cursor-to-ring activation reach. |
| | `tangentRadius` .284375; `radialRadius` .2071875 | Sheen footprint along/across the rim; steep cutoff retained. |
| | `inwardExpansion` 3.4; `outwardExpansion` 1.8 | Local ring broadening multipliers. |
| | `veilReach` .11; `veilStrength` .18 | Added inward diffusion reach and intensity. |
| | `angularFollowRate` 3.8; `radialFollowRate` 10 | Exponential follow rates per second; lower is slower. |
| | `attackRate` 5; `releaseRate` 9 | Sheen strength rise/fade rates per second. |
| | `entryArc` .25 | Initial lag behind cursor, in radians; follows shortest rim arc. |
| `prism` | `enabled` true; `nativeSplit` .0018 | Extra prism toggle; native edge split remains independently tunable. |
| | `spread` .012; `pointerSpread` .008 | Base spectral half-spread and local sheen addition. |
| | `amount` .42; `pointerAmount` .18 | Redistributed neutral-light fractions; combined maximum 1. |
| | `gateLow` .025; `gateHigh` .16 | Overlap-source intensity thresholds; high must exceed low. |
| `motion` | `loopSeconds` 12 | Complete geometry loop duration; higher slows ring motion. |
| `quality` | `fps` 30; `maxPixelRatio` 1.5; `maxRenderSize` 1440 | Frame cap, DPR ceiling, and backing-canvas long-edge pixel ceiling. |

## Imperative / non-React consumers

```ts
import { createFlame, resolveFlameConfig } from '@/components/flame-backdrop';

const flame = createFlame({
  canvas, stage, pointerTarget: window,
  config: resolveFlameConfig(),
  initialPalette: 'gilded-flame',
  transitionSeconds: 2.4,
  onUnavailable: error => console.error(error),
});
flame.setState({ palette: 'copper-ember' });
// External animation: flame.setState({ palette: [0, 0.6, 0.4], transitionSeconds: 0 });
// On disposal:
flame.destroy();
```

Direct users own visibility subscriptions and pass `initialState`
before the first draw, then `setState` updates. React wrapper handles these.
Import from `./renderer`, `./config`, and `./palette` directly if avoiding React
entirely in the module graph. Supply resolved config, not an unchecked cast.

## Verification

### Reversible footer material study

The site selects `footerMaterial="aurora"` as a blend, not a replacement for
the established wispy substance material. It retains that reaction texture and
opacity gradients, lifting the whole field into space with restrained uneven
drift and a faint halo. The original bands remain the dominant visual.
The once-only entry clock drives an empty-to-rising entrance over the site's
`footerEntrySeconds` (3.6 seconds). Offscreen suspension and retained progress
use the existing renderer lifecycle.

The canvas remains full-screen behind the invitation, with blue/sea-glass
color, no textures, extra passes, or new dependencies. A uniform invitation
scrim and the existing foreground stacking keep content above the atmosphere.
The `light` and `substance` variants remain unchanged for comparison; original
hero/light/substance source parity is regression-tested.

`FlameFooterBackdrop` accepts `footerMaterial="substance"` for gaseous self-emission:
irregular luminous reaction fronts, dark upper fuel gaps, and soft uneven glow.
A restrained, noise-varied luminous root body grades upward into the ribbons and
continues below the arc through the existing smooth stem envelope, rather than
leaving a detached aurora or restoring a reflective translucent sheet. Two low-frequency
advected patches modulate the existing reaction field; no surface-normal samples,
facing glints, textures, screen-space noise, or offset contour bands are used.
This leaves the settled silhouette envelope, palette, and animation clocks intact
while using fewer field evaluations than the earlier transmission study. The main
ring ignores the selector, even if it has fire enabled.

The default remains `"light"`, with byte-identical approved hero and light-footer
shaders protected by SHA-256 regression tests. Neither preset was changed. The
Sophomores site opts in only on the footer through `backdropTokens.footerMaterial`
in `lib/teaser/backdrop-tokens.ts`; set that token to `"light"` for an exact material
rollback. Changing the selector recreates the renderer while retaining the existing
ignition checkpoint. Real GPU appearance and mounted behavior still require browser
checks; shader-source tests are not visual proof.

With ignition enabled, the substance footer catches once along the existing upper
arc, left→crown→right: a gas-stove-like cascading ignition, not a literal burner or
an opacity wipe. At the default 1.6 seconds, propagation takes 880ms, with each
sector receiving a 720ms local catch/rise/settle. Each plume starts low, rises to an
8% height overshoot after 216ms of local age, and settles smoothly; a restrained
12% light surge follows that same traveling catch. Plumes rise relative to their
arc roots, keeping the hearth geometry in place. No sparks, new palette, or
settled silhouette changes are introduced.

This uses the existing ignition progress and once-only viewport latch: no extra
clock, repeated flicker, or replay on later visits. Pausing or hiding retains local
progress. At progress 1, the field transform
is bypassed and light gain is exactly 1, preserving the accepted fully lit image.
Short durations compress the entire sequence, including the last sector’s settle;
sweep-fraction bounds retain a positive local settle window. The original light
footer and hero shaders remain byte-identical. Shader tests establish these timing
contracts; browser/GPU checks are needed to establish the actual appearance.

From the project root:

```sh
rtk proxy node --import tsx --test --experimental-test-coverage --test-coverage-include="components/flame-backdrop/**" --test-coverage-exclude="**/__tests__/**" components/flame-backdrop/flame-backdrop/*.test.ts components/flame-backdrop/flame-backdrop/*.test.tsx
rtk proxy pnpm exec eslint components/flame-backdrop
rtk proxy pnpm exec tsc --noEmit --incremental false
```

Tests cover configuration validation, approved pointer geometry, generated shader
expressions, palette fades, loop/scroll helpers, lifecycle disposal, pause/hide
controls, and SSR markup. SSR tests alone are not mounted-lifecycle or GPU proof.

Packaged footer: **93 tests pass**, **95.64% line / 95.85% branch /
97.21% function** aggregate coverage. A standalone browser-bundle check resolves
all runtime modules within this folder, with only React external imports. Scoped component TypeScript and ESLint pass.
Tests include independent hue/geometry clocks, ignition reset/resume, observer
threshold latching, stale callbacks, rapid recreation, and unsupported-observer
fallback. Wrapper effect coverage is supplemented by mounted browser checks;
SSR and helper tests alone do not establish its lifecycle behavior.

Viewport-ignition baseline GPU verification at 400×300 matches approved full-ring pixels exactly
for all three palettes at time zero. The footer's combined 32-second geometry/hue
loop differs by at most one 8-bit channel step (5 channels). Same-geometry frames
at 0 and 16 seconds demonstrate the blue-to-green change without warm-dominant
pixels. Ignition at progress 0 is dark, .35 is partially lit, and 1 fully lit.
Pointer uniforms still change the rendered output at equal time.

Mounted browser checks exercised real scroll entry and recorded ignition progress
from .025 to 1 over approximately 1.6 seconds, retaining a single live renderer on
entry. Once-mode stayed at 1 after tint-config recreation and exit/reentry. These
are historical renderer observations; current motion stays enabled for every system preference.
`footer-preview/footer-ignition.mp4` records the real viewport-triggered sweep;
it is evidence only, never a rendering dependency. Earlier blue/sheet recordings
are previous iterations, not the current implementation.

Checks and footer studies live outside the component folder, under the motion-study
project's `footer-preview/`. They are local evidence, not cross-device precision or
performance guarantees. No production integration or physical-device certification.
