# r3f-baked

Drop-in R3F/drei counterpart to the **Three.js Baker** Blender add-on
(v1.2.0+). The add-on writes `manifest.json` next to the baked textures;
these hooks read it and wire every map into the right material slot —
including the packed channel layouts (ORM, specular RGBA, sheen RGBA,
anisotropy RGB). No manual texture wiring.

**Requires:** three ≥ r152, `@react-three/fiber` v8+, `@react-three/drei` v9+.

## Install

Copy this folder into your `../../..` (e.g. `src/r3f-baked/`). Serve the bake
output folder (with `manifest.json`) from `public/textures/`.

## Usage

### Single mesh

```tsx
import { useBakedManifest, BakedMaterial } from './r3f-baked'

function Walle() {
  const manifest = useBakedManifest('/textures/manifest.json')
  return (
    <mesh geometry={geometry}>
      <BakedMaterial manifest={manifest} object="walle" />
    </mesh>
  )
}
```

### Whole GLB (recommended — matches the Blender→glTF workflow)

```tsx
import { useBakedManifest, useBakedGLTF } from './r3f-baked'

function Model() {
  const manifest = useBakedManifest('/textures/manifest.json')
  const { scene } = useBakedGLTF('/models/walle.glb', manifest)
  return <primitive object={scene} />
}
```

Meshes are matched to manifest entries by sanitized name (exact, then
prefix — tolerates the `.001` suffixes glTF exporters add).

### Overrides

Baked values act as maps with multiplier 1; tune at runtime via overrides
(applied last):

```tsx
<BakedMaterial
  manifest={manifest}
  object="walle"
  overrides={{ envMapIntensity: 0.8, sheenRoughness: 0.6, anisotropyRotation: Math.PI / 4 }}
/>
```

## What gets wired

| Manifest key | Material slots | Notes |
|---|---|---|
| basecolor | `map` | sRGB |
| normal | `normalMap` | OpenGL +Y, flipY=false |
| orm | `aoMap` + `roughnessMap` + `metalnessMap` | R/G/B channels; `roughness`/`metalness` set to 1 |
| roughness/metallic/ao | individual slots | only when ORM packing was off |
| emissive | `emissiveMap`, `emissive`=white | sRGB |
| height | `displacementMap` | `displacementScale` defaults to 0.05 — override per asset |
| specular | `specularColorMap` (RGB) + `specularIntensityMap` (A) | auto-switches to MeshPhysicalMaterial |
| sheen | `sheenColorMap` (RGB) + `sheenRoughnessMap` (A) | `sheen`=1; tint×weight pre-baked |
| anisotropy | `anisotropyMap` (RG dir, B strength) | `anisotropy`=1; tune `anisotropyRotation` if the frame is off |
| clearcoat | `clearcoatMap` (R) + `clearcoatRoughnessMap` (G) | `clearcoat`/`clearcoatRoughness`=1; clearcoat normal not baked (uses base normal) |

Any of specular/sheen/anisotropy/clearcoat present → `MeshPhysicalMaterial`,
otherwise `MeshStandardMaterial`.

## Gotchas

- All hooks suspend — wrap in `<Suspense>`.
- `flipY` comes from the manifest (`false`, glTF convention). If you apply
  baked textures to non-glTF procedural geometry, pass `flipY: true`.
- Materials are disposed on unmount; textures are cached by drei's
  `useTexture` and shared.
- Displacement needs subdivided geometry; it does nothing on low-poly meshes.
- For production, consider KTX2-compressing the PNGs; the manifest `file`
  fields are plain strings, so you can post-process and rewrite extensions.
