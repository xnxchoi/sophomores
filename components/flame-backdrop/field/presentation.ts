/** Presentation-only remap: material and alpha share UVs, anchored at the bottom. */
export const FIELD_VERTEX_SHADER = `
uniform float uVerticalStretch;
varying vec2 vUv;
void main() {
  vUv = position.xy * .5 + .5;
  vUv.y /= uVerticalStretch;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export function validateVerticalStretch(value: number): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < .5 || value > 3) {
    throw new RangeError('Field vertical stretch must be a finite number between 0.5 and 3.');
  }
}
