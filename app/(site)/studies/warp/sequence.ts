import { clamp, easeInOut, transform } from "motion";

/**
 * Feature-local art direction, not a shared interpolation helper. Motion 12.43.0
 * supplies transform, easing and clamp directly; the existing teaser entry
 * controller handles wordmark docking, not this study's approach/corona phases.
 * Geometry is deterministic in scroll progress; the independent opening clock
 * belongs to the React study, so reversing this map never replays loading.
 */
const channels = {
  ringScale: transform(
    [0, 0.22, 0.4, 0.52, 0.63, 0.74, 0.86, 1],
    [0.018, 0.035, 0.1, 0.35, 1.15, 1.6, 1.6, 3.6],
    { ease: easeInOut },
  ),
  pointRadius: transform(
    [0, 0.25, 0.48, 0.6, 0.72, 1],
    [0.006, 0.01, 0.035, 0.1, 0.12, 0.12],
    { ease: easeInOut },
  ),
  pointOpacity: transform([0, 0.4, 0.53, 0.68, 1], [1, 1, 0.65, 0, 0], { ease: easeInOut }),
  rayOpacity: transform([0, 0.5, 0.62, 0.76, 1], [1, 1, 0.65, 0, 0], { ease: easeInOut }),
  // Linear travel preserves outward movement through every approach keyframe;
  // only the art-directed distance increments accelerate/decelerate its speed.
  travel: transform([0, 0.22, 0.4, 0.52, 0.63, 0.74, 1], [0, 0.1, 0.4, 1.1, 2.8, 3.7, 3.9]),
  headlineSplit: transform([0, 0.25, 1], [0, 1, 1], { ease: easeInOut }),
  headlineOpacity: transform([0, 0.22, 0.48, 1], [1, 1, 0, 0], { ease: easeInOut }),
  captionOpacity: transform([0, 0.22, 0.4, 0.7, 0.86, 1], [0, 0, 0.15, 1, 1, 0], { ease: easeInOut }),
  captionY: transform([0, 0.22, 0.7, 1], [90, 90, 0, 0], { ease: easeInOut }),
  sceneOpacity: transform([0, 0.88, 1], [1, 1, 0], { ease: easeInOut }),
};

const phases = [
  [0.08, "Stillness"],
  [0.38, "Attraction"],
  [0.6, "Acceleration"],
  [0.7, "Threshold"],
  [0.88, "Suspension"],
] as const;

export function getWarpFrame(progress: number) {
  if (!Number.isFinite(progress)) {
    throw new RangeError("Warp progress must be a finite number.");
  }
  const position = clamp(0, 1, progress);
  return Object.freeze({
    ringScale: channels.ringScale(position),
    pointRadius: channels.pointRadius(position),
    pointOpacity: channels.pointOpacity(position),
    rayOpacity: channels.rayOpacity(position),
    travel: channels.travel(position),
    headlineSplit: channels.headlineSplit(position),
    headlineOpacity: channels.headlineOpacity(position),
    captionOpacity: channels.captionOpacity(position),
    captionY: channels.captionY(position),
    sceneOpacity: channels.sceneOpacity(position),
    phase: phases.find(([boundary]) => position < boundary)?.[1] ?? "Handoff",
  });
}

// Separate clock-owned opening: add a first-line wipe without replacing the
// existing headline or modifying the approved scroll-driven warp above.
const openingChannels = {
  lineReveal: transform([0, 0.12, 0.42, 1], [0, 0, 1, 1]),
  lineOpacity: transform([0, 0.12, 0.58, 0.7, 1], [0, 1, 1, 0, 0]),
  fieldOpacity: transform([0, 0.68, 0.88, 1], [0, 0, 1, 1]),
  headlineOpacity: transform([0, 0.82, 1], [0, 0, 1]),
  controlsOpacity: transform([0, 0.94, 1], [0, 0, 1]),
};

const openingPhases = [
  [0.12, "Black"], [0.68, "First line"], [0.88, "Streak reveal"],
] as const;

export function getOpeningFrame(progress: number) {
  if (!Number.isFinite(progress)) {
    throw new RangeError("Opening progress must be a finite number.");
  }
  const position = clamp(0, 1, progress);
  return Object.freeze({
    lineReveal: openingChannels.lineReveal(position),
    // At .12 the opacity becomes one while reveal remains zero: the first
    // visible pixels belong to the wipe, never a premature full-line fade.
    lineOpacity: position < 0.12 ? 0 : openingChannels.lineOpacity(position),
    fieldOpacity: openingChannels.fieldOpacity(position),
    headlineOpacity: openingChannels.headlineOpacity(position),
    controlsOpacity: openingChannels.controlsOpacity(position),
    phase: openingPhases.find(([boundary]) => position < boundary)?.[1] ?? "Headline",
  });
}

// Prelude ends at the production corona's zero-scroll pose. The actual Hero
// owns every notification and caption after this boundary.
export const STUDY_TOUR = Object.freeze({
  duration: 7.6,
  seconds: Object.freeze([0, 5.2, 7.6]),
  progress: Object.freeze([0, 0.75, 1]),
});

const studyWarpProgress = transform([0, 0.75, 0.98, 1], [0, 0.74, 0.74, 0.76]);
// A separate pinned material transition: expansion never restores ring color.
const studySettlement = transform([0.75, 1], [0, 1]);

export function getStudyFrame(progress: number) {
  if (!Number.isFinite(progress)) {
    throw new RangeError("Study progress must be a finite number.");
  }
  const position = clamp(0, 1, progress);
  const warpProgress = studyWarpProgress(position);
  return Object.freeze({
    warpProgress,
    settlement: studySettlement(position),
    phase: position < 0.75
      ? getWarpFrame(warpProgress).phase
      : position < 0.78 ? "Settling" : position < 1 ? "Color return" : "Corona · 0",
  });
}
