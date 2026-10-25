import type { FlameConfig } from '../config';
import { replaceHistoricalOnce } from './material';
import { createBodyMaterialShader, type MaterialLightingWeights } from './body-material';
import { FLAME_BLEND_WEIGHTS, FLAME_NEW_MOTION_PACE } from './blend';

/** CPU mirror of the shared UV transform for continuity regression sampling. */
export function ignitionUvSample(v: number, progress: number, exposure: number): number {
  if (![v, progress, exposure].every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
    throw new RangeError('Ignition UV, progress and exposure must be normalized finite values.');
  }
  const phase = Math.min(1, Math.max(0, (progress - .18) / (.95 - .18)));
  const heightScale = .14 + .86 * phase * phase * (3 - 2 * phase);
  const hearth = .06 + (.25 - .06) * heightScale;
  const exposureOffset = Math.max(0, hearth - .42 * exposure);
  return .06 + (v + exposureOffset - .06) / heightScale;
}

/** Add controlled timing/presentation around the original field, never a replacement texture. */
export function createGasFlameShader(config: FlameConfig, materialWeights?: MaterialLightingWeights): string {
  const material = replaceHistoricalOnce(createBodyMaterialShader(config, materialWeights),
    'void renderEnvelopeMaterial()', 'void renderEnvelopeMaterial(vec2 vUv, float uTime)');
  const named = replaceHistoricalOnce(material, 'void main()', 'void renderOriginalField(vec2 vUv, float motionTime)');
  const original = replaceHistoricalOnce(named, 'renderEnvelopeMaterial();', 'renderEnvelopeMaterial(vUv, motionTime);');
  const w = FLAME_BLEND_WEIGHTS;
  const pace = w.motion.original + w.motion.next * FLAME_NEW_MOTION_PACE;
  return original + '\n// IGNITION WRAPPER\n' + IGNITION_WRAPPER
    .replace('__SILHOUETTE_OG__', w.silhouette.original.toFixed(2))
    .replace('__SILHOUETTE_NG__', w.silhouette.next.toFixed(2))
    .replace('__COLOR_NG__', w.color.next.toFixed(2))
    .replace('__ANIMATION_NG__', w.animation.next.toFixed(2))
    .replace('__MOTION_PACE__', pace.toFixed(2));
}

const IGNITION_WRAPPER = `
uniform float uIgnitionProgress;
uniform float uViewportExposure;
uniform float uMotionTime;

float ignitionHash(float seed) {
  return fract(sin(seed * 127.1) * 43758.5453);
}

/** A few detached crackles only; this does not synthesize a flame surface. */
vec3 ignitionCrackles(vec2 uv, float progress) {
  vec3 light = vec3(0.0);
  for (int i = 0; i < 7; i++) {
    float seed = float(i) + 1.0;
    float lifetime = .45 + ignitionHash(seed + 11.0) * .55;
    float age = mod(uColorTime + seed * 1.73, 5.5 + ignitionHash(seed) * 4.0);
    float travel = age / lifetime;
    float x = .1 + ignitionHash(seed + 3.0) * .8;
    x += sin(seed * 2.3 + travel * 3.0) * travel * .028;
    float y = .27 + travel * (.18 + ignitionHash(seed + 7.0) * .20);
    vec2 d = uv - vec2(x, y);
    float radius = max(.0008, uCssPixel * .65);
    float spark = exp(-dot(d / vec2(radius, radius * 2.4), d / vec2(radius, radius * 2.4)));
    float fade = max(0.0, sin(clamp(travel, 0.0, 1.0) * 3.14159265));
    light += vec3(.95, .63, .30) * spark * fade * step(age, lifetime) * .42;
  }
  return light * smoothstep(.22, .65, progress);
}

void applyApprovedBlend(vec2 uv) {
  // Broad presentation only: at least 70% of the canonical mask always survives.
  float lap = .025 * sin(uMotionTime * .62 + uv.x * 3.0);
  float heightEnvelope = 1.0 - smoothstep(.42 + lap, .73 + lap, uv.y);
  gl_FragColor.a *= __SILHOUETTE_OG__ + __SILHOUETTE_NG__ * heightEnvelope;
  // Hue only: preserve the original luminance and transparency, with a rare warm lick.
  float warmLife = pow(.5 + .5 * sin(uColorTime * .31), 6.0);
  float warmCenter = .5 + .28 * sin(uColorTime * .12);
  float warmLocal = exp(-pow((uv.x - warmCenter) / .11, 2.0)) * smoothstep(.30, .54, uv.y);
  vec3 accent = mix(vec3(.22, .65, .94), vec3(.95, .64, .34), warmLife * warmLocal);
  vec3 luminanceWeights = vec3(.2126, .7152, .0722);
  float originalLuminance = dot(gl_FragColor.rgb, luminanceWeights);
  accent *= originalLuminance / max(dot(accent, luminanceWeights), .001);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, accent, __COLOR_NG__);
}

void main() {
  float progress = mix(1.0, clamp(uIgnitionProgress, 0.0, 1.0), __ANIMATION_NG__);
  if (progress <= 0.0) {
    gl_FragColor = vec4(0.0);
    return;
  }
  // Original noise, reaction and color body receive only a continuous temporal pace.
  float motionTime = uMotionTime * __MOTION_PACE__;
  float heightScale = mix(.14, 1.0, smoothstep(.18, .95, progress));
  float hearth = .06 + (.25 - .06) * heightScale;
  float exposureOffset = max(0.0, hearth - .42 * clamp(uViewportExposure, 0.0, 1.0));
  vec2 ignitionUv = vec2(vUv.x, .06 + (vUv.y + exposureOffset - .06) / heightScale);
  if (progress >= 1.0 && exposureOffset == 0.0) {
    renderOriginalField(vUv, motionTime);
  } else {
    renderOriginalField(ignitionUv, motionTime);
  }
  if (progress < 1.0) {
    float catchArrival = (1.0 - vUv.x) * .30;
    float catchGain = smoothstep(catchArrival, catchArrival + .055, progress);
    float pilot = smoothstep(0.0, .18, progress);
    gl_FragColor.a *= catchGain * pilot;
    float flash = smoothstep(.22, .38, progress) * (1.0 - smoothstep(.48, .70, progress));
    gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(.63, .78, .91), flash * .06);
  }
  applyApprovedBlend(vUv);
  vec3 sparkLight = ignitionCrackles(vUv, progress);
  float sparkAlpha = max(max(sparkLight.r, sparkLight.g), sparkLight.b);
  if (sparkAlpha > .00001) {
    float combinedAlpha = clamp(gl_FragColor.a + sparkAlpha, 0.0, 1.0);
    gl_FragColor.rgb = (gl_FragColor.rgb * gl_FragColor.a + sparkLight) / max(combinedAlpha, .001);
    gl_FragColor.a = combinedAlpha;
  }
}
`;
