
precision highp float;
varying vec2 vUv;
uniform vec2 uScale;
uniform vec2 uOrigin;
uniform float uTime;
uniform vec2 uPointer;
uniform float uPointerStrength;
uniform float uChromatic;
uniform float uCssPixel;
uniform vec3 uPaletteWeights;

vec3 paletteColor(int index, float blend) {
  
  if (index == 0) return uPaletteWeights.r * 0.84 * mix(vec3(0.13843161503245183,0.1301364766903643,0.41254261348390375), vec3(0.1651321945016676,0.1301364766903643,0.2874408377269175), blend) + uPaletteWeights.g * 0.88 * mix(vec3(0.12743768043564743,0.1559264637078274,0.45641102318040466), vec3(0.1559264637078274,0.11443537382697373,0.3277780980565422), blend) + uPaletteWeights.b * 0.85 * mix(vec3(0.12213877222960187,0.10702310297826761,0.3467040563550296), vec3(0.162029375639111,0.08021982031446832,0.25415209433082675), blend);
  if (index == 1) return uPaletteWeights.r * 0.84 * mix(vec3(0.6514056374198242,0.5457244613701866,0.2874408377269175), vec3(0.6938717612919899,0.6172065624196511,0.4072402119017367), blend) + uPaletteWeights.g * 0.88 * mix(vec3(0.6866853124353135,0.5520114015120001,0.29177064981753587), vec3(0.7758222183174236,0.6444796819705821,0.35153259950043936), blend) + uPaletteWeights.b * 0.85 * mix(vec3(0.6938717612919899,0.4851499400560704,0.24620132670783548), vec3(0.6795424696330938,0.5583403896342679,0.3467040563550296), blend);
  if (index == 2) return uPaletteWeights.r * 0.84 * mix(vec3(0.47353149614800955,0.2232279573168085,0.09989872824711389), vec3(0.4232676699860717,0.13563332965520566,0.07227185068231748), blend) + uPaletteWeights.g * 0.88 * mix(vec3(0.5972017883637634,0.19120168274079138,0.07036009569659588), vec3(0.4286904966139066,0.07818742180518633,0.0382043715953465), blend) + uPaletteWeights.b * 0.85 * mix(vec3(0.6444796819705821,0.184474994500441,0.0595112381629812), vec3(0.5209955732043543,0.07818742180518633,0.03189603307301153), blend);
  if (index == 3) return uPaletteWeights.r * 0.84 * mix(vec3(0.665387298282272,0.467783796112159,0.14412847085805777), vec3(0.5332764040105052,0.23455058216100522,0.07036009569659588), blend) + uPaletteWeights.g * 0.88 * mix(vec3(0.7011018919329731,0.45078578283822346,0.12743768043564743), vec3(0.6375968739940326,0.25415209433082675,0.06662593864377289), blend) + uPaletteWeights.b * 0.85 * mix(vec3(0.7083757798916868,0.35153259950043936,0.10224173308810132), vec3(0.6375968739940326,0.14995978981060856,0.04091519690685319), blend);
  if (index == 4) return uPaletteWeights.r * 0.84 * mix(vec3(0.11697066775851084,0.10946171077829933,0.33716361504833037), vec3(0.08437621154414882,0.19120168274079138,0.2232279573168085), blend) + uPaletteWeights.g * 0.88 * mix(vec3(0.12213877222960187,0.08865558628577294,0.30946892281750854), vec3(0.0595112381629812,0.15292615199615017,0.238397573812271), blend) + uPaletteWeights.b * 0.85 * mix(vec3(0.1301364766903643,0.08021982031446832,0.3005437944157765), vec3(0.06124605423161761,0.1119324278369056,0.24228112246555486), blend);
  return vec3(0.0);
}

float radiusAt(float offset, float spin, float breath, float cycles, float phaseOffset, float theta, float phase) {
  float local = theta - spin * phase + phaseOffset;
  return 0.35 + offset + .009 * sin(2.0 * local + .6)
    + .004 * cos(3.0 * local + 1.7) + .002 * sin(5.0 * local)
    + breath * 1.0 * sin(cycles * phase + phaseOffset);
}

// Mirrors pointerWeightAt: one animated centerline focus, not a cursor-centered disk.
float pointerWeightAt(vec2 point, float phase) {
  float pointerRadius = length(uPointer);
  if (uPointerStrength <= 0.0 || pointerRadius < .000001) return 0.0;
  float theta = atan(uPointer.y, uPointer.x);
  float ringRadius = (radiusAt(-0.006,3.0,0.0,0.0,0.2, theta, phase) + radiusAt(0.001,-3.0,0.0035,2.0,1.7, theta, phase) + radiusAt(-0.003,2.0,0.0045,3.0,3.0, theta, phase) + radiusAt(0.005,4.0,0.0,0.0,4.4, theta, phase) + radiusAt(-0.01,-1.0,0.003,4.0,5.8, theta, phase)) / 5.0;
  float proximity = 1.0 - smoothstep(0.0, 0.12, abs(pointerRadius - ringRadius));
  vec2 axis = uPointer / pointerRadius;
  vec2 offset = point - axis * ringRadius;
  vec2 local = vec2(dot(offset, axis) / 0.2071875,
    dot(offset, vec2(-axis.y, axis.x)) / 0.284375);
  float focus = 1.0 - smoothstep(0.0, 1.0, length(local));
  return proximity * proximity * focus * focus * uPointerStrength;
}

vec3 profile(vec3 distance, float inner, float outer) {
  vec3 inward = max(vec3(0.0), -distance) / inner;
  vec3 outward = max(vec3(0.0), distance) / outer;
  return exp(-inward * inward - outward * outward);
}
vec3 prismSource(vec3 density) {
  vec3 white = .72 * 1.0 * (1.0 - exp(-.8 * density * density));
  return white * smoothstep(vec3(0.025), vec3(0.16), white);
}

void layer(int index, float innerBase, float outerBase, float offset,
  float spin, float breath, float cycles, float phaseOffset,
  float radius, float theta, float phase, float pointer, float spread,
  inout vec3 color, inout vec3 density, inout vec3 bodySum,
  inout float sourceDensity, inout float sourceSum,
  inout vec3 densityA, inout vec3 sumA, inout vec3 densityB, inout vec3 sumB) {
  float local = theta - spin * phase + phaseOffset;
  float ringRadius = radiusAt(offset, spin, breath, cycles, phaseOffset, theta, phase);
  float lower = pow(.5 + .5 * cos(theta + 2.1), 2.0);
  float inner = 1.425 * innerBase * (.60 + .48 * lower + .15 * cos(local + .8));
  float outer = 1.425 * outerBase * (.85 + .15 * cos(local - .7));
  float intensity = .11 + .70 * pow(.5 + .5 * cos(local - .3), 3.0);
  
  float leakAxis = -2.1 + .24 * sin(2.0 * phase + phaseOffset);
  float leak = pow(.5 + .5 * cos(theta - leakAxis), 3.0);
  float pulse = breath > 0.0 ? .5 + .5 * sin(cycles * phase + phaseOffset) : .5;
  float veilInner = .025 + leak * (.085 + .100 * pulse);
  float veilStrength = (.055 + leak * (.19 + .12 * pulse)) * 1.0;
  // Reuse this ring geometry for six cheap wavelength profiles plus its neutral source.
  // Branching here keeps chromatic-off free of the additional exponential work.
  if (uChromatic * 1.0 > .5) {
    float distance = radius - ringRadius;
    float sourceBody = profile(vec3(distance), inner, outer).g * intensity;
    sourceDensity += sourceBody * sourceSum;
    sourceSum += sourceBody;
    vec3 bodyA = profile(vec3(distance) - vec3(-1.0,-0.6,-0.2) * spread, inner, outer) * intensity;
    vec3 bodyB = profile(vec3(distance) - vec3(0.2,0.6,1.0) * spread, inner, outer) * intensity;
    densityA += bodyA * sumA; sumA += bodyA;
    densityB += bodyB * sumB; sumB += bodyB;
  }
  // Direct signed-distance field widening, not a filter over a pre-rendered image.
  inner *= 1.0 + pointer * 3.4;
  outer *= 1.0 + pointer * 1.8;
  veilInner += pointer * 0.11;
  veilStrength += pointer * 0.18;
  vec3 split = vec3(-1.0, 0.0, 1.0) * 0.0018 * (.7 + .3 * cos(theta - phase));
  vec3 distance = vec3(radius - ringRadius) + split;
  vec3 body = profile(distance, inner, outer);
  vec3 diffusion = profile(distance, veilInner, outer * 3.5 / 1.425);
  vec3 field = (body * .78 + diffusion * veilStrength * (1.0 - exp(-pow(radius / .13, 2.0)))) * intensity;
  vec3 pigment = paletteColor(index, .5 + .5 * cos(local));
  
  color += field * pigment;
  vec3 weightedBody = body * intensity;
  
  density += weightedBody * bodySum;
  bodySum += weightedBody;
}

vec3 shade(float radius, float theta, float phase, float pointer) {
  vec3 color = vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535);
  vec3 density = vec3(0.0), bodySum = vec3(0.0);
  float sourceDensity = 0.0, sourceSum = 0.0;
  vec3 densityA = vec3(0.0), sumA = vec3(0.0), densityB = vec3(0.0), sumB = vec3(0.0);
  float weight = clamp(pointer, 0.0, 1.0);
  float spread = 0.012 + weight * 0.008;
  
  layer(0, 0.018,0.0045,-0.006,3.0,0.0,0.0,0.2,
    radius, theta, phase, pointer, spread, color, density, bodySum, sourceDensity, sourceSum, densityA, sumA, densityB, sumB);
  layer(1, 0.008,0.005,0.001,-3.0,0.0035,2.0,1.7,
    radius, theta, phase, pointer, spread, color, density, bodySum, sourceDensity, sourceSum, densityA, sumA, densityB, sumB);
  layer(2, 0.011,0.006,-0.003,2.0,0.0045,3.0,3.0,
    radius, theta, phase, pointer, spread, color, density, bodySum, sourceDensity, sourceSum, densityA, sumA, densityB, sumB);
  layer(3, 0.007,0.014,0.005,4.0,0.0,0.0,4.4,
    radius, theta, phase, pointer, spread, color, density, bodySum, sourceDensity, sourceSum, densityA, sumA, densityB, sumB);
  layer(4, 0.03,0.008,-0.01,-1.0,0.003,4.0,5.8,
    radius, theta, phase, pointer, spread, color, density, bodySum, sourceDensity, sourceSum, densityA, sumA, densityB, sumB);
  vec3 overlapWhite = .72 * 1.0 * (1.0 - exp(-.8 * density * density));
  vec3 white = (.96 - color) * overlapWhite;
  if (uChromatic * 1.0 > .5) {
    vec3 sourceA = prismSource(densityA), sourceB = prismSource(densityB);
    float source = prismSource(vec3(sourceDensity)).g;
    vec3 spectral = vec3(0.18439716312056736,0.006172839506172839,0.3354297693920336) * sourceA.r + vec3(0.005319148936170212,0.04938271604938271,0.41928721174004197) * sourceA.g + vec3(0.0017730496453900709,0.37037037037037035,0.2306079664570231) * sourceA.b + vec3(0.09929078014184398,0.4115226337448559,0.01048218029350105) * sourceB.r + vec3(0.35460992907801414,0.15637860082304525,0.0020964360587002098) * sourceB.g + vec3(0.35460992907801414,0.006172839506172839,0.0020964360587002098) * sourceB.b;
    float fraction = 0.42 + weight * 0.18;
    // Only redistribute the additive neutral part; retain pigment * (1 - overlapWhite).
    vec3 neutral = .96 * overlapWhite;
    float neutralBudget = min(neutral.r, min(neutral.g, neutral.b));
    float neutralGain = source > .000001 ? min(.96, neutralBudget / source) : .96;
    vec3 removed = min(neutral, vec3(source * neutralGain * fraction));
    color += white - removed + spectral * neutralGain * fraction;
  } else {
    color += white;
  }
  color = vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535) + (color - vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535)) * 1.0;
  vec3 excess = max(vec3(0.0), color - .85);
  return color - excess + .15 * (1.0 - exp(-excess / .15));
}

float toSrgb(float value) {
  return value <= .0031308 ? value * 12.92 : 1.055 * pow(value, 1.0 / 2.4) - .055;
}
void main() {
  vec2 p = (vUv - .5) * uScale - uOrigin;
  if (abs(p.x) > .5 || abs(p.y) > .5) {
    vec3 background = vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535);
    gl_FragColor = vec4(toSrgb(background.r), toSrgb(background.g), toSrgb(background.b), 1.0);
    return;
  }
  float radius = length(p);
  float theta = radius > .000001 ? atan(p.y, p.x) : 0.0;
  float phase = uTime * 6.283185307179586 / 12.0;
  float pointer = 1.0 * pointerWeightAt(p, phase) * smoothstep(.09, .18, radius);
  vec3 linear = shade(radius, theta, phase, pointer);
  
  gl_FragColor = vec4(toSrgb(linear.r), toSrgb(linear.g), toSrgb(linear.b), 1.0);
}