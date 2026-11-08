// Adapted from the user-supplied design/references/Warp_v2_1.js, revision 10.
// Preserve its layered travelling highlights and angular beam illumination.
// Lens bending is deliberately absent: pointer input never changes ray geometry.
export const warpVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

export const warpFragmentShader = `
varying vec2 vUv;
uniform vec2 uViewport;
uniform float uTime;
uniform float uTravel;
uniform float uRays;
uniform float uPoint;
uniform float uRadius;
uniform float uOpening;
uniform float uDensity;
uniform float uIntensity;
uniform float uRingScale;
uniform float uRayWidth;
uniform float uPointScale;
uniform float uPointBrightness;
uniform float uPointSoftness;
uniform float uBloomStrength;
uniform float uBloomSpread;
uniform float uShowPoint;
uniform float uShowBloom;
uniform vec3 uColor;
uniform vec2 uHoverPointer;
uniform float uHover;
uniform float uHeartbeat;
const float TAU = 6.28318530718;

float hash(float p) { return fract(sin(p * 127.1 + 311.7) * 43758.5453); }
// Reference uses a quintic reveal, unlike GLSL smoothstep's cubic profile.
float revealEase(float lo, float hi, float value) {
  float t = clamp((value - lo) / (hi - lo), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}
void main() {
  vec2 p = (vUv - .5) * uViewport / min(uViewport.x, uViewport.y);
  float radius = length(p);
  float angle = atan(p.y, p.x);
  float angularPosition = angle / TAU + .5;
  float pixel = 1.0 / min(uViewport.x, uViewport.y);
  float pointerDistance = length(uHoverPointer);
  float pointerAngle = pointerDistance > .000001 ? atan(uHoverPointer.y, uHoverPointer.x) : 0.0;
  float focusWidth = mix(1.65, .13, smoothstep(.025, .55, pointerDistance));
  float allAround = 1.0 - smoothstep(.015, .075, pointerDistance);
  float totalRays = 0.0;
  for (int k = 0; k < 5; k++) totalRays += floor((19.0 + float(k) * 17.0) * uDensity);
  float rayOffset = 0.0;
  vec3 light = vec3(0.0);
  for (int layer = 0; layer < 5; layer++) {
    float l = float(layer);
    float count = floor((19.0 + l * 17.0) * uDensity);
    float cell = angularPosition * count;
    float id = floor(cell);
    for (int neighbor = -1; neighbor <= 1; neighbor++) {
      float rawId = id + float(neighbor);
      float seed = mod(rawId + count, count) + l * 317.0;
      float h = hash(seed);
      float ray = rawId + .15 + .7 * h;
      float delta = (cell - ray) / count * TAU;
      float distance = abs(sin(delta)) * radius;
      float width = (.00022 + pow(hash(seed + 21.0), 9.0) * .006) * (.45 + radius * 1.8) * uRayWidth;
      float core = exp(-pow(distance / (width + pixel * .48), 2.0));
      float halo = exp(-distance / (width * 5.0 + pixel)) * .17;
      float rayDirection = (ray / count - .5) * TAU;
      float bundle = max(pow(abs(cos(rayDirection - 1.02)), 5.0), pow(abs(cos(rayDirection - 2.00)), 6.0));
      // Slow luminance drift redistributes activity without rotating a single ray.
      float drift = .5 + .5 * sin(3.0 * rayDirection - .24 * uTime + h * 2.0);
      float weight = (.16 + bundle * .30 + drift * .22) * (.4 + hash(seed + 8.0));
      float travel = log(max(radius, .008)) * 1.8 - uTime * (1.5 + h * 1.3) - uTravel * 4.0 + h * 30.0;
      float pulse = pow(.5 + .5 * sin(travel), 7.0);
      float envelope = .28 + 1.6 * pulse;
      float fade = smoothstep(.004, .05, radius) * (.7 + .3 * exp(-radius * 1.3));
      vec3 tint = mix(uColor, vec3(.80, .89, 1.0), pow(hash(seed + 6.0), .7));
      float angularDistance = atan(sin(rayDirection - pointerAngle), cos(rayDirection - pointerAngle));
      float focus = mix(exp(-pow(angularDistance / focusWidth, 2.0)), 1.0, allAround);
      float oppositeDistance = atan(sin(angularDistance + TAU * .5), cos(angularDistance + TAU * .5));
      focus += exp(-pow(oppositeDistance / focusWidth, 2.0)) * .05 * (1.0 - focus);
      float selected = focus * uHover * uHeartbeat;
      // A bounded lift also reaches dim rays, without the original additive surge.
      float hoverGain = 1.0 + min(selected * .8, .2);
      float hoverLight = min(selected * .45, .12);
      float activeHalo = halo * min(selected, .12) * .05;
      float ordinal = rayOffset + mod(rawId + count, count);
      float rank = mod(ordinal * 997.0, totalRays);
      float revealStart = .42 * rank / max(totalRays - 1.0, 1.0);
      float reveal = revealEase(revealStart, revealStart + .58, uOpening);
      light += tint * (core + halo + activeHalo) * (weight * envelope * hoverGain + hoverLight) * fade * reveal;
    }
    rayOffset += count;
  }
  // Keep the approved growing aperture: no rays cross its cleared interior.
  float aperture = smoothstep(uRadius * .95 * uRingScale, uRadius * 1.2 * uRingScale, radius);
  light *= aperture * uRays;
  light = 1.0 - exp(-light * uIntensity);
  // Retain the study's resolving hotspot instead of adding a second fixed core.
  float core = exp(-pow(radius / max(.001, uRadius * .85 * uPointScale), 4.0 / uPointSoftness));
  float bloom = exp(-radius / max(.001, uRadius * 1.6 * uBloomSpread)) * .18;
  light += vec3(1.0) * (core * uPointBrightness * uShowPoint + bloom * uBloomStrength * uShowBloom) * uPoint * uOpening;
  float alpha = clamp(max(light.r, max(light.g, light.b)), 0.0, .96);
  gl_FragColor = vec4(light / max(alpha, .0001), alpha);
}`;
