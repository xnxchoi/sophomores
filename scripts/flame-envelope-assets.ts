import {
  CENTER_FADE,
  ENVELOPE_PATH,
  centerOpacityAt
} from "@/components/gl/flame-backdrop/mask/profile";
import { createEnvelopeMaskUrl } from "@/components/gl/flame-backdrop/mask/svg";
import { FLAME_APPEARANCE } from "@/components/gl/flame-backdrop/appearance";

export const ASSET_SIZE = {
  width: FLAME_APPEARANCE.mask.exportWidth,
  height: FLAME_APPEARANCE.mask.exportHeight
} as const;

/** Authoritative standalone browser mask, including the approved Gaussian smoothing. */
export function createMaskAssetSvg(): string {
  const url = createEnvelopeMaskUrl(
    ASSET_SIZE.width,
    ASSET_SIZE.height,
    CENTER_FADE.smoothing,
    CENTER_FADE.exponent,
    false,
    CENTER_FADE.centerLift
  );
  return decodeURIComponent(url.slice(url.indexOf(",") + 1));
}

/** A native radial fill is an experiment, not a substitute for the contour-shaped opacity field. */
export function reusableGradientStops() {
  return Array.from({ length: 65 }, (_, index) => ({
    offset: index / 64,
    opacity: centerOpacityAt(
      index / 64,
      CENTER_FADE.exponent,
      CENTER_FADE.centerLift
    )
  }));
}

function editableContourPaths(): string {
  const [cx, cy] = CENTER_FADE.origin;
  const scaleAt = (index: number) =>
    Math.max(0.001, 1 - index / (CENTER_FADE.layers - 1));
  const alphaAt = (index: number) =>
    index === CENTER_FADE.layers - 1
      ? 1
      : centerOpacityAt(
          scaleAt(index),
          CENTER_FADE.exponent,
          CENTER_FADE.centerLift
        );
  return Array.from({ length: CENTER_FADE.layers }, (_, index) => {
    const scale = scaleAt(index);
    const previous = index ? alphaAt(index - 1) : 0;
    const opacity = (alphaAt(index) - previous) / (1 - previous);
    return `<path data-contour-scale="${scale}" d="${ENVELOPE_PATH}" transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})" fill="white" opacity="${opacity}"/>`;
  }).join("\n");
}

/** Filter-free vector construction so Illustrator keeps the silhouette editable rather than rasterizing it. */
export function createIllustratorSourceSvg(): string {
  const stops = reusableGradientStops()
    .map(
      (stop) =>
        `<stop offset="${stop.offset}" stop-color="white" stop-opacity="${stop.opacity}"/>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:i="http://ns.adobe.com/AdobeIllustrator/10.0/" width="2880" height="1120" viewBox="0 0 2880 1120">
<title>Sophomores — editable mask and reusable opacity gradient</title>
<desc>Approved silhouette and contour gradient at ${CENTER_FADE.exponent} falloff and ${CENTER_FADE.centerLift} core lift. Editable vectors deliberately omit Gaussian smoothing; the runtime PNG/SVG includes ${CENTER_FADE.smoothing}% height smoothing. The separate radial fill is for experiments on other closed shapes, not an exact replacement for contour falloff.</desc>
<defs><clipPath id="silhouette-boundary"><path d="${ENVELOPE_PATH}"/></clipPath>
<radialGradient id="reusable-opacity-gradient" cx="50%" cy="50%" r="50%">${stops}</radialGradient></defs>
<g id="preview-background-hide-before-export" i:layer="yes"><rect width="2880" height="1120" fill="#101214"/></g>
<g id="approved-contour-mask" i:layer="yes">
<g transform="translate(40 145) scale(14 9)"><g clip-path="url(#silhouette-boundary)">${editableContourPaths()}</g></g>
</g>
<g id="reusable-gradient-fill" i:layer="yes"><path d="M 1760 260 H 2640 V 960 H 1760 Z" fill="url(#reusable-opacity-gradient)"/></g>
<g id="labels-hide-before-export" i:layer="yes" fill="white" font-family="Helvetica, Arial, sans-serif">
<text x="40" y="50" font-size="28">1 / APPROVED SILHOUETTE + CONTOUR OPACITY GRADIENT</text>
<text x="40" y="88" font-size="19">Falloff ${CENTER_FADE.exponent}; core lift ${CENTER_FADE.centerLift}. Editable paths; Gaussian smoothing is deliberately not flattened into these vectors.</text>
<text x="40" y="118" font-size="19">At a 900px canvas height, apply ${((900 * CENTER_FADE.smoothing) / 100).toFixed(2)}px Gaussian smoothing. Runtime PNG/SVG is the exact reference.</text>
<text x="1660" y="50" font-size="28">2 / REUSABLE NATIVE GRADIENT FILL</text>
<text x="1660" y="88" font-size="19">Use the Eyedropper on this closed path, or save its gradient as a swatch.</text>
<text x="1660" y="118" font-size="19">Radial experiment: same opacity curve, not the contour-shaped mask.</text>
<text x="40" y="1080" font-size="19">Hide the background and labels before exporting transparent PNG. Runtime mask reads ALPHA, not black/white luminance.</text>
</g></svg>`;
}
