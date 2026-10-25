# Sophomores editable envelope mask

Approved shape with **1.39% height smoothing** and **1.20 center falloff**, with **0.18 center lift**. The lift fills out only the high-opacity inner region; it leaves the low-opacity edges and the silhouette unchanged.

## Files

- `flame-envelope.ai`: native Illustrator 2026 document, saved with PDF compatibility and reopened in Illustrator. Includes an editable approved silhouette with a native opacity-gradient fill, a separate closed-shape sample, and the reusable **Sophomores opacity falloff 1.20** swatch (65 stops, 100% to 0% opacity). The 128-path contour source and an embedded exact runtime PNG are preserved on separate hidden reference layers. The visible native gradient is an **authoring approximation**, not the exact contour/Gaussian runtime mask; the image assets below remain authoritative. Background and instruction layers are explicitly named for hiding before export.

- `../../public/masks/flame-envelope.png`: authoritative runtime mask, **2880 × 1800**, transparent RGBA PNG.
- `../../public/masks/flame-envelope.svg`: exact standalone procedural SVG used to rasterize that PNG, including smoothing.
- `flame-envelope-illustrator.svg`: Illustrator-openable, editable vector source with two main groups:
  1. **approved-contour-mask** — the original irregular silhouette as 128 nested, editable paths with shape-following opacity. This is not an elliptical gradient substituted for the approved shape.
  2. **reusable-gradient-fill** — a native radial gradient on a closed path, with the same 1.20 opacity curve. Select the sample path and save its gradient to Swatches, or use the Eyedropper to copy its fill onto another closed shape. This is an experimental reusable fill, **not mathematically identical** to shape-following contour opacity.
- `manifest.json`: approved values, rasterizer version, dimensions, and SHA-256 checksums.

## Illustrator editing

The companion avoids SVG filters in the editable contour group so Illustrator can retain paths instead of silently flattening the effect into an image. Consequently, its editable vector artwork **does not bake in Gaussian smoothing**. The PNG and standalone runtime SVG are the exact smoothed references.

At a 900px-high artwork area, 1.39% height equals **12.51px**. A native Illustrator Gaussian Blur can be applied to the edited contour artwork as a starting point. This is an editing aid, not a claim that a single Illustrator blur duplicates the browser's two smoothed half-opacity fields. Retain the exact PNG when no shape edits are intended.

Keep **preview-background-hide-before-export** and **labels-hide-before-export** hidden when exporting a replacement mask. Export only the chosen artwork artboard with a **transparent background**, preferably at the original 2880 × 1800 ratio. White (or any RGB color) is fine: the renderer reads **alpha**, not luminance. An opaque black background would make the entire mask opaque.

The saved image is mapped across normalized screen coordinates. Its canonical aspect ratio is 1.6; a differently shaped viewport stretches that image. The file-based mask is stable and independent of procedural sliders unless procedural editing is explicitly selected.

## Regenerate approved assets

From the repository root, with Playwright and its Chromium browser installed:

```sh
node --import tsx scripts/export-flame-envelope.ts
```

The exporter accepts `PLAYWRIGHT_MODULE` (package name or absolute installed module path) and `CHROMIUM_EXECUTABLE` (optional browser executable path) when using an existing bundled runtime. It opens only an isolated headless canvas; no website, server, or external service is required. It regenerates the PNG, runtime SVG, Illustrator companion SVG, and manifest. It does **not** overwrite a separately saved native `.ai` document.

The source of the approved outline/default values is `flame-backdrop/mask/profile.ts`; runtime SVG serialization is in `flame-backdrop/mask/svg.ts`. Export construction is in `scripts/flame-envelope-assets.ts`.

## Human-editable component configuration

The footer reads an image texture rather than recalculating the contour profile every frame. Keep replacement masks in `public/masks/` and select their URL in the footer's mask configuration. To replace a file in-place, retain its dimensions/transparent-alpha contract and reload the page; use a new filename or versioned URL to invalidate cached assets reliably.

The procedural editor remains available for exploration. Its shared profile source controls new procedural exports; changing those values alone does not modify an already exported image. Run the exporter to promote an approved procedural change into the file-based runtime mask. Do not change the renderer material, palette, animation, or outline when only adjusting these mask parameters.
