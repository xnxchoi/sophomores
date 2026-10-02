/** Renderer controls. Distances use centered artwork coordinates: the square is 1 unit wide. */
export interface FlameConfig {
  readonly visual: Readonly<{ ringThickness: number; ringRadius: number; brightness: number;
    breathingAmount: number; inwardLeakAmount: number; overlapWhitening: number; backgroundColor: string }>;
  readonly pointer: Readonly<{ enabled: boolean; proximityRadius: number; tangentRadius: number;
    radialRadius: number; inwardExpansion: number; outwardExpansion: number; veilReach: number;
    veilStrength: number; angularFollowRate: number; radialFollowRate: number; attackRate: number;
    releaseRate: number; entryArc: number }>;
  readonly prism: Readonly<{ enabled: boolean; nativeSplit: number; spread: number; pointerSpread: number;
    amount: number; pointerAmount: number; gateLow: number; gateHigh: number }>;
  readonly motion: Readonly<{ loopSeconds: number }>;
  readonly composition: Readonly<{ mode: 'ring' | 'footer'; widthRatio: number; heightRatio: number; baselineOffset: number;
    /** Physical vertical scale relative to width; below 1 flattens the arc without changing its width. */
    verticalScale: number }>;
  readonly fire: Readonly<{ intensity: number; plumeHeight: number; plumeFrequency: number; flowCycles: number; warmth: number; curlAmount: number; rimStrength: number;
    /** Dedicated linear-light hue endpoints; warmth blends toward these from the active palette. */
    baseColor: string; tipColor: string; frontSoftness: number; bodyOpacity: number;
    stemStrength: number; alternateBaseColor: string; alternateTipColor: string; colorCycleSeconds: number }>;
  readonly ignition: Readonly<{ enabled: boolean; durationSeconds: number; sweepFraction: number }>;
  readonly quality: Readonly<{ fps: number; maxPixelRatio: number; maxRenderSize: number }>;
}
export type FlameConfigInput = { readonly [K in keyof FlameConfig]?: Partial<FlameConfig[K]> };
export const DEFAULT_FLAME_CONFIG: FlameConfig = Object.freeze({
  visual: Object.freeze({ ringThickness: 1.425, ringRadius: .35, brightness: 1, breathingAmount: 1,
    inwardLeakAmount: 1, overlapWhitening: 1, backgroundColor: '#030504' }),
  pointer: Object.freeze({ enabled: true, proximityRadius: .12, tangentRadius: .284375,
    radialRadius: .2071875, inwardExpansion: 3.4, outwardExpansion: 1.8, veilReach: .11,
    veilStrength: .18, angularFollowRate: 3.8, radialFollowRate: 10, attackRate: 5,
    releaseRate: 9, entryArc: .25 }),
  prism: Object.freeze({ enabled: true, nativeSplit: .0018, spread: .012, pointerSpread: .008,
    amount: .42, pointerAmount: .18, gateLow: .025, gateHigh: .16 }),
  motion: Object.freeze({ loopSeconds: 12 }),
  composition: Object.freeze({ mode: 'ring', widthRatio: .94, heightRatio: .78, baselineOffset: 0, verticalScale: 1 }),
  fire: Object.freeze({ intensity: 0, plumeHeight: .09, plumeFrequency: 9, flowCycles: 2, warmth: .7, curlAmount: .7, rimStrength: 1,
    baseColor: '#155BFF', tipColor: '#5CBFFF', frontSoftness: .065, bodyOpacity: .04,
    stemStrength: 0, alternateBaseColor: '#155BFF', alternateTipColor: '#5CBFFF', colorCycleSeconds: 0 }),
  ignition: Object.freeze({ enabled: false, durationSeconds: 1.6, sweepFraction: .55 }),
  quality: Object.freeze({ fps: 30, maxPixelRatio: 1.5, maxRenderSize: 1440 }),
});
const limits: Record<string, readonly [number, number]> = {
  ringThickness: [.1, 5], ringRadius: [.1, .45], brightness: [0, 3], breathingAmount: [0, 4],
  inwardLeakAmount: [0, 4], overlapWhitening: [0, 1], proximityRadius: [.001, 1],
  tangentRadius: [.001, 1], radialRadius: [.001, 1], inwardExpansion: [0, 10],
  outwardExpansion: [0, 10], veilReach: [0, 1], veilStrength: [0, 2],
  angularFollowRate: [.01, 100], radialFollowRate: [.01, 100], attackRate: [.01, 100],
  releaseRate: [.01, 100], entryArc: [0, Math.PI], nativeSplit: [0, .05], spread: [0, .1],
  pointerSpread: [0, .1], amount: [0, 1], pointerAmount: [0, 1], gateLow: [0, .72],
  gateHigh: [0, .72], loopSeconds: [.1, 600], fps: [1, 120], maxPixelRatio: [.25, 3],
  maxRenderSize: [64, 4096],
  widthRatio: [.1, 2], heightRatio: [.1, 2], baselineOffset: [0, 1], verticalScale: [.25, 2],
  intensity: [0, 3], plumeHeight: [.001, .25], plumeFrequency: [1, 24], flowCycles: [0, 12], warmth: [0, 1],
  curlAmount: [0, 2], rimStrength: [0, 1],
  frontSoftness: [.005, .2], bodyOpacity: [0, .15],
  stemStrength: [0, .3], colorCycleSeconds: [0, 600], durationSeconds: [.1, 10], sweepFraction: [.1, .9],
};
function checkedGroup(defaults: Record<string, unknown>, input: unknown, name: string) {
  if (input !== undefined && (!input || typeof input !== 'object' || Array.isArray(input))) {
    throw new TypeError(`Flame ${name} must be an object`);
  }
  const overrides = input as Record<string, unknown> | undefined;
  for (const key of Object.keys(overrides ?? {})) {
    if (!Object.hasOwn(defaults, key)) throw new RangeError(`Unknown flame control: ${name}.${key}`);
  }
  return Object.freeze(Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => {
    const value = overrides && Object.hasOwn(overrides, key) ? overrides[key] : fallback;
    if (typeof fallback === 'number') {
      const [min, max] = limits[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        throw new RangeError(`Flame ${name}.${key} must be a finite number between ${min} and ${max}`);
      }
    } else if (key === 'mode') {
      if (value !== 'ring' && value !== 'footer') throw new RangeError('composition.mode must be ring or footer');
    } else if (typeof fallback === 'boolean') {
      if (typeof value !== 'boolean') throw new TypeError(`Flame ${name}.${key} must be boolean`);
    } else if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) {
      throw new TypeError(`Flame ${name}.${key} must be #RRGGBB`);
    }
    return [key, value];
  })));
}
/** Resolve nested overrides once; throws for invalid controls instead of silently clamping artist intent. */
export function resolveFlameConfig(input: FlameConfigInput = {}, defaults: FlameConfig = DEFAULT_FLAME_CONFIG): FlameConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('Flame config must be an object');
  for (const group of Object.keys(input)) {
    if (!Object.hasOwn(DEFAULT_FLAME_CONFIG, group)) throw new RangeError(`Unknown flame group: ${group}`);
  }
  const config = Object.freeze(Object.fromEntries(Object.entries(defaults).map(([group, groupDefaults]) =>
    [group, checkedGroup(groupDefaults, input[group as keyof FlameConfig], group)]))) as unknown as FlameConfig;
  if (config.prism.gateHigh <= config.prism.gateLow) throw new RangeError('prism.gateHigh must exceed gateLow');
  if (config.prism.amount + config.prism.pointerAmount > 1) throw new RangeError('Combined prism amount must not exceed 1');
  if (!Number.isInteger(config.fire.flowCycles)) throw new RangeError('fire.flowCycles must be an integer to preserve the motion loop');
  return config;
}
export type RGB = readonly [number, number, number];
const linear = (v: number) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
export const linearColor = (hex: string): RGB => Object.freeze([0, 2, 4].map(i =>
  linear(parseInt(hex.replace('#', '').slice(i, i + 2), 16) / 255))) as unknown as RGB;
const palette = (id: string, strength: number, pairs: readonly (readonly string[])[]) => Object.freeze({
  id, strength, colors: Object.freeze(pairs.map(pair => Object.freeze(pair.map(linearColor)))),
});
export const PALETTES = Object.freeze([
  palette('pale-brass', .84, [['6865AC','716592'],['D3C392','D9CEAB'],['B78259','AE674C'],['D5B66A','C1854B'],['605D9D','527982']]),
  palette('gilded-flame', .88, [['646EB4','6E5F9B'],['D8C493','E4D2A0'],['CB794B','AF4F37'],['DAB364','D18A49'],['625497','456D86']]),
  palette('copper-ember', .85, [['625C9F','70508A'],['D9B988','D7C59F'],['D27745','BF4F32'],['DBA05A','D16C39'],['655095','465E87']]),
]);
const ring = (name: string, inner: number, outer: number, offset: number, spin: number,
  breath: number, cycles: number, phase: number) => Object.freeze({ name, inner, outer, offset, spin, breath, cycles, phase });
export const RINGS = Object.freeze([
  ring('mineral', .018, .0045, -.006, 3, 0, 0, .2),
  ring('opal', .008, .005, .001, -3, .0035, 2, 1.7),
  ring('rose', .011, .006, -.003, 2, .0045, 3, 3),
  ring('amber', .007, .014, .005, 4, 0, 0, 4.4),
  ring('violet', .030, .008, -.010, -1, .003, 4, 5.8),
]);
const rawBands: readonly (readonly [number, RGB])[] = [
  [-1, [.52, .015, .8]], [-.6, [.015, .12, 1]], [-.2, [.005, .9, .55]],
  [.2, [.28, 1, .025]], [.6, [1, .38, .005]], [1, [1, .015, .005]],
];
/** Component-normalized lobes: equal spectral energy recombines to neutral white. */
export const PRISM_BANDS = Object.freeze(rawBands.map(([offset, weight]) => Object.freeze({
  offset, weight: Object.freeze(weight.map((value, channel) =>
    value / rawBands.reduce((sum, band) => sum + band[1][channel], 0))),
})));
