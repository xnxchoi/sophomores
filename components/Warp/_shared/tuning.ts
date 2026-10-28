import { cubicBezier, transform } from "motion";

// Settlement spans 60–70% overall progress. Restore geometry and material by
// 67.2%, leaving the final color return before the original Hero starts at zero.
export const CORONA_RESTORE_END = .72;
// The wormhole may grow for the whole settlement. Its center stays filled
// until this morph amount, then opens into the corona. 1 is the lock.
export const WORMHOLE_HOLE_START = 0.78;
// Direct Motion mapping responds immediately and coasts, without a symmetric hold/release.
export const coronaRestoreBlend = transform([0, CORONA_RESTORE_END], [0, 1], {
  ease: cubicBezier(.2, .16, .6, 1)
});

// Feature-private contract shared by the live renderer and its developer panel.
// User-selected reset values; multiplier 1 is neutral. Sliders do not retime scroll.
export const DEFAULT_WARP_TUNING = Object.freeze({
  ringScale: .11,
  ringBrightness: .51,
  ringSaturation: 1,
  pointScale: .11,
  pointBrightness: .51,
  pointSoftness: 1,
  interiorBrightness: .30,
  interiorColor: "#ffffff",
  interiorBloom: .10,
  interiorBlur: 1,
  edgeBlur: .5,
  bloomStrength: 1,
  bloomSpread: 1,
  rayIntensity: 1.35,
  rayDensity: .85,
  rayWidth: 1,
  hoverStrength: .24,
  motionSpeed: 1,
  blur: 0,
  showRing: true,
  showPoint: true,
  showBloom: true,
  showRays: true,
});

export type WarpTuning = {
  readonly [Key in keyof typeof DEFAULT_WARP_TUNING]:
    typeof DEFAULT_WARP_TUNING[Key] extends number ? number :
    typeof DEFAULT_WARP_TUNING[Key] extends string ? string : boolean;
};

export type WarpTuningNumberKey = {
  [Key in keyof WarpTuning]: WarpTuning[Key] extends number ? Key : never;
}[keyof WarpTuning];

export const WARP_TUNING_CONTROLS = Object.freeze(([
  { key: "ringScale", label: "Ring size", min: .05, max: 3, step: .01, group: "Ring" },
  { key: "ringBrightness", label: "Ring brightness", min: 0, max: 3, step: .01, group: "Ring" },
  { key: "ringSaturation", label: "Ring saturation", min: 0, max: 2, step: .05, group: "Ring" },
  { key: "edgeBlur", label: "Forming edge blur", min: 0, max: 2, step: .05, group: "Ring" },
  { key: "pointScale", label: "Point size", min: .05, max: 3, step: .01, group: "Point" },
  { key: "pointBrightness", label: "Point brightness", min: 0, max: 3, step: .01, group: "Point" },
  { key: "pointSoftness", label: "Point softness", min: .25, max: 4, step: .05, group: "Point" },
  { key: "interiorBrightness", label: "Interior brightness", min: 0, max: 2, step: .05, group: "Interior" },
  { key: "interiorBloom", label: "Interior bloom", min: 0, max: 2, step: .05, group: "Interior" },
  { key: "interiorBlur", label: "Interior blur", min: 0, max: 3, step: .05, group: "Interior" },
  { key: "bloomStrength", label: "Bloom strength", min: 0, max: 3, step: .05, group: "Bloom" },
  { key: "bloomSpread", label: "Bloom spread", min: .1, max: 4, step: .05, group: "Bloom" },
  { key: "rayIntensity", label: "Ray brightness", min: 0, max: 3, step: .05, group: "Rays" },
  { key: "rayDensity", label: "Ray density", min: .1, max: 2, step: .05, group: "Rays" },
  { key: "rayWidth", label: "Ray width", min: .25, max: 4, step: .05, group: "Rays" },
  { key: "hoverStrength", label: "Hover intensity", min: 0, max: 1, step: .01, group: "Rays" },
  { key: "motionSpeed", label: "Ambient speed", min: 0, max: 3, step: .05, group: "Motion" },
  { key: "blur", label: "Scene blur (px)", min: 0, max: 20, step: .25, group: "Output" },
] satisfies readonly {
  key: WarpTuningNumberKey;
  label: string;
  min: number;
  max: number;
  step: number;
  group: string;
}[]).map(control => Object.freeze(control)));
