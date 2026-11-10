import english from "@/../messages/en.json";
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
  { key: "ringScale", label: english.Developer.tuningData.ringSize, labelKey: "ringSize", min: .05, max: 3, step: .01, group: "Ring" },
  { key: "ringBrightness", label: english.Developer.tuningData.ringBrightness, labelKey: "ringBrightness", min: 0, max: 3, step: .01, group: "Ring" },
  { key: "ringSaturation", label: english.Developer.tuningData.ringSaturation, labelKey: "ringSaturation", min: 0, max: 2, step: .05, group: "Ring" },
  { key: "edgeBlur", label: english.Developer.tuningData.formingEdgeBlur, labelKey: "formingEdgeBlur", min: 0, max: 2, step: .05, group: "Ring" },
  { key: "pointScale", label: english.Developer.tuningData.pointSize, labelKey: "pointSize", min: .05, max: 3, step: .01, group: "Point" },
  { key: "pointBrightness", label: english.Developer.tuningData.pointBrightness, labelKey: "pointBrightness", min: 0, max: 3, step: .01, group: "Point" },
  { key: "pointSoftness", label: english.Developer.tuningData.pointSoftness, labelKey: "pointSoftness", min: .25, max: 4, step: .05, group: "Point" },
  { key: "interiorBrightness", label: english.Developer.tuningData.interiorBrightness, labelKey: "interiorBrightness", min: 0, max: 2, step: .05, group: "Interior" },
  { key: "interiorBloom", label: english.Developer.tuningData.interiorBloom, labelKey: "interiorBloom", min: 0, max: 2, step: .05, group: "Interior" },
  { key: "interiorBlur", label: english.Developer.tuningData.interiorBlur, labelKey: "interiorBlur", min: 0, max: 3, step: .05, group: "Interior" },
  { key: "bloomStrength", label: english.Developer.tuningData.bloomStrength, labelKey: "bloomStrength", min: 0, max: 3, step: .05, group: "Bloom" },
  { key: "bloomSpread", label: english.Developer.tuningData.bloomSpread, labelKey: "bloomSpread", min: .1, max: 4, step: .05, group: "Bloom" },
  { key: "rayIntensity", label: english.Developer.tuningData.rayBrightness, labelKey: "rayBrightness", min: 0, max: 3, step: .05, group: "Rays" },
  { key: "rayDensity", label: english.Developer.tuningData.rayDensity, labelKey: "rayDensity", min: .1, max: 2, step: .05, group: "Rays" },
  { key: "rayWidth", label: english.Developer.tuningData.rayWidth, labelKey: "rayWidth", min: .25, max: 4, step: .05, group: "Rays" },
  { key: "hoverStrength", label: english.Developer.tuningData.hoverIntensity, labelKey: "hoverIntensity", min: 0, max: 1, step: .01, group: "Rays" },
  { key: "motionSpeed", label: english.Developer.tuningData.ambientSpeed, labelKey: "ambientSpeed", min: 0, max: 3, step: .05, group: "Motion" },
  { key: "blur", label: english.Developer.tuningData.sceneBlurPx, labelKey: "sceneBlurPx", min: 0, max: 20, step: .25, group: "Output" },
] satisfies readonly {
  key: WarpTuningNumberKey;
  label: string;
  labelKey: keyof typeof english.Developer.tuningData;
  min: number;
  max: number;
  step: number;
  group: string;
}[]).map(control => Object.freeze(control)));
