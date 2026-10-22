import { CENTER_FADE, ENVELOPE_PATH, edgeFalloffAlpha, envelopeBlurPixels, envelopeFadeLayers } from './profile';

/** Same SVG image supplies the render's CSS alpha mask and the white debug preview. */
export function createPreviousEnvelopeMaskUrl(width: number, height: number): string {
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
    throw new RangeError('Mask width must be a positive finite number.');
  }
  const deviation = envelopeBlurPixels(height, 6.5);
  const exponent = 2.2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><filter id="feather" x="-50%" y="-50%" width="200%" height="200%" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feGaussianBlur stdDeviation="${deviation}"/><feComponentTransfer><feFuncA type="gamma" amplitude="1" exponent="${exponent}" offset="0"/></feComponentTransfer>
</filter></defs><g filter="url(#feather)"><svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible"><path d="${ENVELOPE_PATH}" fill="white"/></svg></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** Only the opacity field changes: the expanded silhouette and procedural material stay intact. */
export function createEnvelopeMaskUrl(width: number, height: number, smoothing: number, exponent: number, before = false, centerLift: number = CENTER_FADE.centerLift): string {
  if (typeof before !== 'boolean') throw new TypeError('Invalid comparison mode.');
  if (before) return createPreviousEnvelopeMaskUrl(width, height);
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) throw new RangeError('Mask width must be a positive finite number.');
  if (typeof smoothing !== 'number' || !Number.isFinite(smoothing) || smoothing < 0 || smoothing > CENTER_FADE.maxSmoothing) throw new RangeError('Contour smoothing must be between 0 and 2 percent.');
  const deviation = envelopeBlurPixels(height, smoothing);
  edgeFalloffAlpha(1, exponent);
  const [cx, cy] = CENTER_FADE.origin;
  const layers = envelopeFadeLayers(exponent, centerLift).map(({ scale, opacity }) => `<use data-fade-layer="${scale}" href="#outline" transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})" fill="white" opacity="${opacity}"/>`).join('');
  const profile = '<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" overflow="visible"><use href="#profile"/></svg>';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<defs><path id="outline" d="${ENVELOPE_PATH}"/><g id="profile">${layers}</g>
<filter id="soften" x="-50%" y="-50%" width="200%" height="200%" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${deviation}"/></filter>
<mask id="edge-guard" mask-type="alpha" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><g filter="url(#soften)">${profile}</g></mask>
<clipPath id="outer-boundary" clipPathUnits="userSpaceOnUse"><use href="#outline" transform="scale(${width / 100} ${height / 100})"/></clipPath></defs>
<g clip-path="url(#outer-boundary)"><g mask="url(#edge-guard)"><g filter="url(#soften)">${profile}</g></g></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
