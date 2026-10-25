
precision highp float;
varying vec2 vUv;
uniform vec2 uScale;
uniform vec2 uOrigin;
uniform float uTime;
uniform float uIgnitionProgress;
uniform float uColorTime;
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
    + breath * 1.35 * sin(cycles * phase + phaseOffset);
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
  vec3 white = .72 * 0.0 * (1.0 - exp(-.8 * density * density));
  return white * smoothstep(vec3(0.025), vec3(0.16), white);
}

float flameHash(float x, float y) {
  x = mod(x, 64.0);
  y = mod(y, 8.0);
  return fract(sin(x * 127.1 + y * 311.7) * 43758.5453);
}
float flameNoise(float x, float y) {
  float ix = floor(x), iy = floor(y);
  float fx = fract(x), fy = fract(y);
  float sx = fx * fx * (3.0 - 2.0 * fx), sy = fy * fy * (3.0 - 2.0 * fy);
  float bottom = mix(flameHash(ix, iy), flameHash(ix + 1.0, iy), sx);
  float top = mix(flameHash(ix, iy + 1.0), flameHash(ix + 1.0, iy + 1.0), sx);
  return mix(bottom, top, sy);
}
float flameReaction(float x, float lift, float phase) {
  float travel = phase / 6.283185307179586 * 2.0 * 8.0;
  float curl = 0.7;
  float frequency = 9.0;
  float warpX = flameNoise(x * 3.1, lift * .55 - travel) - .5;
  float warpY = flameNoise(x * 2.2 + 17.4, lift * .65 - travel + 3.3) - .5;
  float qx = x * frequency * .48 + warpX * curl * 1.15;
  float qy = lift * .85 - travel + warpY * curl * .75;
  float fuel = .80 * flameNoise(qx, qy)
    + .20 * flameNoise(qx * 2.0 + 11.3, qy * 2.0 + 4.7);
  float threshold = .32 + .42 * max(0.0, lift)
    + .06 * (flameNoise(x * 2.4 + 13.2, -travel) - .5);
  return fuel - threshold;
}
float flameFront(float reaction, float softness) {
  float distance = reaction / softness;
  return exp(-distance * distance);
}
float footerIgnitionLocal(float x, float progress) {
  float arrival = (asin(clamp(x, -1.0, 1.0)) / 3.141592653589793 + .5) * 0.55;
  return (progress - arrival) / 0.44999999999999996;
}
float footerIgnitionHeight(float x, float progress) {
  if (progress >= 1.0) return 1.0;
  float local = footerIgnitionLocal(x, progress);
  if (local >= 1.0) return 1.0;
  if (local <= .08) return .20 + .08 * smoothstep(0.0, .08, local);
  if (local < .30) return .28 + .80 * smoothstep(.08, .30, local);
  return 1.08 - .08 * smoothstep(.30, 1.0, local);
}
float flameIgnition(float x, float lift, float progress) {
  if (progress <= 0.0) return 0.0;
  if (progress >= 1.0) return 1.0;
  float local = footerIgnitionLocal(x, progress);
  float catchGain = smoothstep(0.0, .12, local);
  float surge = smoothstep(.08, .30, local) * (1.0 - smoothstep(.30, 1.0, local));
  return catchGain * (1.0 + .12 * surge);
}
vec3 alcoholFlame(vec2 point, float ringRadius, float phase, float pointer) {
  float height = 0.25;
  float rootY = sqrt(max(0.0, ringRadius * ringRadius - point.x * point.x));
  if (uIgnitionProgress < 1.0) {
    point.y = rootY + (point.y - rootY) / footerIgnitionHeight(point.x / ringRadius, uIgnitionProgress);
  }
  float lift = (point.y - rootY) / height;
  float x = point.x / ringRadius;
  float launch = smoothstep(-.30, .12, lift);
  float dissolve = 1.0 - smoothstep(.65, 1.35, lift);
  float shoulders = 1.0 - smoothstep(.85, 1.04, abs(x));
  float crown = smoothstep(0.0, .18, point.y / ringRadius);
  float envelope = launch * dissolve * shoulders * crown;
  float stemEnvelope = smoothstep(-.65, -.30, lift) * (1.0 - smoothstep(-.05, .20, lift)) * shoulders * crown;
  if (max(envelope, stemEnvelope) < .0001) return vec3(0.0);
  float reaction = flameReaction(x, lift, phase);
  float softness = 0.065 + min(.030, .30 * uCssPixel / height) + .012 * pointer;
  float edge = flameFront(reaction, softness);
  float halo = flameFront(reaction, softness * 2.2) * .060;
  float body = smoothstep(0.0, .25, reaction) * 0.04;
  float stemTravel = phase / 6.283185307179586 * 2.0 * 8.0;
  float stemGate = smoothstep(-.04, .20, reaction) * (.35 + .65 * flameNoise(x * 9.0 * .7, -stemTravel - lift * 1.2));
  float stems = stemGate * stemEnvelope * 0.1;
  float tip = smoothstep(.05, .95, lift);
  float hueCycle = .5 - .5 * cos(uColorTime * 6.283185307179586 / 32.0);
  vec3 cycleBase = mix(vec3(0.007499032043226175,0.10461648409110419,1.0), vec3(0.0024282158683907,0.1589608350608804,0.4910208498478356), hueCycle);
  vec3 cycleTip = mix(vec3(0.10702310297826761,0.5209955732043543,1.0), vec3(0.06480326669290577,0.5209955732043543,0.38132601143253014), hueCycle);
  vec3 dedicatedTint = mix(cycleBase, cycleTip, tip);
  vec3 paletteTint = mix(paletteColor(3, .5), paletteColor(1, .5), tip);
  vec3 tint = mix(paletteTint, dedicatedTint, 1.0);

  float materialTravel = phase / 6.283185307179586 * 8.0;
  float materialPatch = flameNoise(x * 2.1 + 7.3, lift * .60 - materialTravel);
  float materialBacklight = flameNoise(x * 1.3 + 23.1, lift * .42 - materialTravel + 3.7);
  float materialFuel = smoothstep(.24, .70, materialPatch);
  float materialFront = flameFront(reaction, softness * (.85 + .55 * materialBacklight));
  float materialGlow = flameFront(reaction, softness * 2.6);
  float materialEmission = materialFront * (.24 + .95 * materialBacklight) * materialFuel;
  float materialDiffusion = materialGlow * .22 * smoothstep(.18, .72, materialBacklight)
    * (.25 + .75 * materialFuel);
  float materialInterior = smoothstep(softness * .7, softness * 3.5, reaction)
    * .055 * materialFuel * materialBacklight;
  float materialRootFade = 1.0 - smoothstep(.02, .72 + .16 * materialPatch, lift);
  float materialRoot = materialRootFade * (.16 + .38 * smoothstep(-.18, .20, reaction))
    * (.55 + .45 * materialBacklight);
  float materialLight = (materialEmission + materialDiffusion) * 1.9 + materialInterior + materialRoot;
  return tint * (materialLight * envelope + materialRoot * stemEnvelope * (1.0 - envelope) + stems) * (.22 + .06 * pointer) * 1.0;
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
  float inner = 1.65 * innerBase * (.60 + .48 * lower + .15 * cos(local + .8));
  float outer = 1.65 * outerBase * (.85 + .15 * cos(local - .7));
  float intensity = .11 + .70 * pow(.5 + .5 * cos(local - .3), 3.0);
  float rim = 0.0;
  float leakAxis = -2.1 + .24 * sin(2.0 * phase + phaseOffset);
  float leak = pow(.5 + .5 * cos(theta - leakAxis), 3.0);
  float pulse = breath > 0.0 ? .5 + .5 * sin(cycles * phase + phaseOffset) : .5;
  float veilInner = .025 + leak * (.085 + .100 * pulse);
  float veilStrength = (.055 + leak * (.19 + .12 * pulse)) * 0.7;
  // Reuse this ring geometry for six cheap wavelength profiles plus its neutral source.
  // Branching here keeps chromatic-off free of the additional exponential work.
  if (uChromatic * 1.0 > .5) {
    float distance = radius - ringRadius;
    float sourceBody = profile(vec3(distance), inner, outer).g * intensity * rim;
    sourceDensity += sourceBody * sourceSum;
    sourceSum += sourceBody;
    vec3 bodyA = profile(vec3(distance) - vec3(-1.0,-0.6,-0.2) * spread, inner, outer) * intensity * rim;
    vec3 bodyB = profile(vec3(distance) - vec3(0.2,0.6,1.0) * spread, inner, outer) * intensity * rim;
    densityA += bodyA * sumA; sumA += bodyA;
    densityB += bodyB * sumB; sumB += bodyB;
  }
  // Direct signed-distance field widening, not a filter over a pre-rendered image.
  inner *= 1.0 + pointer * 3.4;
  outer *= 1.0 + pointer * 1.8;
  veilInner += pointer * 0.11;
  veilStrength += pointer * 0.18;
  vec3 split = vec3(-1.0, 0.0, 1.0) * 0.0 * (.7 + .3 * cos(theta - phase));
  vec3 distance = vec3(radius - ringRadius) + split;
  vec3 body = profile(distance, inner, outer);
  vec3 diffusion = profile(distance, veilInner, outer * 3.5 / 1.65);
  vec3 field = (body * .78 + diffusion * veilStrength * (1.0 - exp(-pow(radius / .13, 2.0)))) * intensity * rim;
  vec3 pigment = paletteColor(index, .5 + .5 * cos(local));
  pigment = mix(pigment, vec3(0.007499032043226175,0.10461648409110419,1.0), 1.0);
  color += field * pigment;
  vec3 weightedBody = body * intensity * rim;
  
  density += weightedBody * bodySum;
  bodySum += weightedBody;
}

vec3 shade(float radius, float theta, float phase, float pointer) {
  vec3 color = vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535);
  vec3 density = vec3(0.0), bodySum = vec3(0.0);
  float sourceDensity = 0.0, sourceSum = 0.0;
  vec3 densityA = vec3(0.0), sumA = vec3(0.0), densityB = vec3(0.0), sumB = vec3(0.0);
  float weight = clamp(pointer, 0.0, 1.0);
  float spread = 0.01 + weight * 0.008;
  
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
  vec3 overlapWhite = .72 * 0.0 * (1.0 - exp(-.8 * density * density));
  vec3 white = (.96 - color) * overlapWhite;
  if (uChromatic * 1.0 > .5) {
    vec3 sourceA = prismSource(densityA), sourceB = prismSource(densityB);
    float source = prismSource(vec3(sourceDensity)).g;
    vec3 spectral = vec3(0.18439716312056736,0.006172839506172839,0.3354297693920336) * sourceA.r + vec3(0.005319148936170212,0.04938271604938271,0.41928721174004197) * sourceA.g + vec3(0.0017730496453900709,0.37037037037037035,0.2306079664570231) * sourceA.b + vec3(0.09929078014184398,0.4115226337448559,0.01048218029350105) * sourceB.r + vec3(0.35460992907801414,0.15637860082304525,0.0020964360587002098) * sourceB.g + vec3(0.35460992907801414,0.006172839506172839,0.0020964360587002098) * sourceB.b;
    float fraction = 0.0 + weight * 0.0;
    // Only redistribute the additive neutral part; retain pigment * (1 - overlapWhite).
    vec3 neutral = .96 * overlapWhite;
    float neutralBudget = min(neutral.r, min(neutral.g, neutral.b));
    float neutralGain = source > .000001 ? min(.96, neutralBudget / source) : .96;
    vec3 removed = min(neutral, vec3(source * neutralGain * fraction));
    color += white - removed + spectral * neutralGain * fraction;
  } else {
    color += white;
  }
  color += alcoholFlame(vec2(cos(theta), sin(theta)) * radius, 0.35, phase, weight);
  vec2 ignitionPoint = vec2(cos(theta), sin(theta)) * radius;
  float ignitionRoot = sqrt(max(0.0, 0.12249999999999998 - ignitionPoint.x * ignitionPoint.x));
  float ignitionGain = flameIgnition(ignitionPoint.x / 0.35, (ignitionPoint.y - ignitionRoot) / 0.25, uIgnitionProgress);
  color = vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535) + (color - vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535)) * ignitionGain;
  color = vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535) + (color - vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535)) * 0.65;
  vec3 excess = max(vec3(0.0), color - .85);
  return color - excess + .15 * (1.0 - exp(-excess / .15));
}

float toSrgb(float value) {
  return value <= .0031308 ? value * 12.92 : 1.055 * pow(value, 1.0 / 2.4) - .055;
}
void main() {
  vec2 p = (vUv - .5) * uScale - uOrigin;
  
  float radius = length(p);
  float theta = radius > .000001 ? atan(p.y, p.x) : 0.0;
  float phase = uTime * 6.283185307179586 / 16.0;
  float pointer = 1.0 * pointerWeightAt(p, phase) * smoothstep(.09, .18, radius);
  vec3 linear = shade(radius, theta, phase, pointer);
  
  // Let lifted tips dissolve before the canvas ends, never form a clipped ceiling.
  float topFade = smoothstep(0.0, .06, 1.0 - vUv.y);
  linear = mix(vec3(0.0009105809506465125,0.0015176349177441874,0.00121410793419535), linear, topFade);
  
  gl_FragColor = vec4(toSrgb(linear.r), toSrgb(linear.g), toSrgb(linear.b), 1.0);
}