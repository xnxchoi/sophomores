import { clamp, cubicBezier, easeInOut, transform } from "motion";

// Load timeline: seconds after renderer readiness, not scroll percentages.
export const OPENING_TIMING = Object.freeze({
  duration: 2.8,
  textStart: 0.1,
  characterDuration: 0.5,
  characterStagger: 0.045,
  fieldStart: 0.2,
  pageStart: 2.1
});

// Overall study progress where the prelude hands off to original Hero position 0.
export const HANDOFF = 0.7;

/**
 * Feature-local art direction, not a shared interpolation helper. Motion 12.43.0
 * supplies transform, easing and clamp directly; the existing teaser entry
 * controller handles wordmark docking, not this study's approach/corona phases.
 * Scroll phases are deterministic; the React owner clocks one ready load sequence.
 * Motion cubicBezier supplies continuous acceleration, not a custom spline.
 */
// Legacy warp coordinates (0–1): these are NOT overall study percentages.
const channels = {
  ringScale: transform(
    [0, 0.22, 0.4, 0.52, 0.63, 0.74, 0.86, 1],
    [0.018, 0.035, 0.1, 0.35, 1.15, 1.6, 1.6, 3.6],
    {
      ease: [
        // x = 1/3, 2/3 makes time linear. y controls match endpoint slopes
        // [0, .15, .9, 4, 6, 0] across the original expansion anchors.
        cubicBezier(1 / 3, 0, 2 / 3, 1 - (0.15 * 0.22) / (3 * 0.017)),
        cubicBezier(
          1 / 3,
          (0.15 * 0.18) / (3 * 0.065),
          2 / 3,
          1 - (0.9 * 0.18) / (3 * 0.065)
        ),
        cubicBezier(
          1 / 3,
          (0.9 * 0.12) / (3 * 0.25),
          2 / 3,
          1 - (4 * 0.12) / (3 * 0.25)
        ),
        cubicBezier(
          1 / 3,
          (4 * 0.11) / (3 * 0.8),
          2 / 3,
          1 - (6 * 0.11) / (3 * 0.8)
        ),
        cubicBezier(1 / 3, (6 * 0.11) / (3 * 0.45), 2 / 3, 1),
        easeInOut,
        easeInOut
      ]
    }
  ),
  pointRadius: transform(
    [0, 0.25, 0.48, 0.6, 0.72, 1],
    [0.006, 0.01, 0.035, 0.1, 0.12, 0.12],
    { ease: easeInOut }
  ),
  pointOpacity: transform([0, 0.4, 0.53, 0.68, 1], [1, 1, 0.65, 0, 0], {
    ease: easeInOut
  }),
  rayOpacity: transform([0, 0.5, 0.62, 0.76, 1], [1, 1, 0.65, 0, 0], {
    ease: easeInOut
  }),
  // Matched travel slopes [0, .8, 3, 9, 10, 1, 0] retain every distance anchor.
  travel: transform(
    [0, 0.22, 0.4, 0.52, 0.63, 0.74, 1],
    [0, 0.1, 0.4, 1.1, 2.8, 3.7, 3.9],
    {
      ease: [
        cubicBezier(1 / 3, 0, 2 / 3, 1 - (0.8 * 0.22) / (3 * 0.1)),
        cubicBezier(
          1 / 3,
          (0.8 * 0.18) / (3 * 0.3),
          2 / 3,
          1 - (3 * 0.18) / (3 * 0.3)
        ),
        cubicBezier(
          1 / 3,
          (3 * 0.12) / (3 * 0.7),
          2 / 3,
          1 - (9 * 0.12) / (3 * 0.7)
        ),
        cubicBezier(
          1 / 3,
          (9 * 0.11) / (3 * 1.7),
          2 / 3,
          1 - (10 * 0.11) / (3 * 1.7)
        ),
        cubicBezier(
          1 / 3,
          (10 * 0.11) / (3 * 0.9),
          2 / 3,
          1 - 0.11 / (3 * 0.9)
        ),
        cubicBezier(1 / 3, 0.26 / (3 * 0.2), 2 / 3, 1)
      ]
    }
  ),
  headlineSplit: transform([0, 0.25, 1], [0, 1, 1], { ease: easeInOut }),
  headlineOpacity: transform([0, 0.22, 0.48, 1], [1, 1, 0, 0], {
    ease: easeInOut
  }),
  captionOpacity: transform(
    [0, 0.22, 0.4, 0.7, 0.86, 1],
    [0, 0, 0.15, 1, 1, 0],
    { ease: easeInOut }
  ),
  captionY: transform([0, 0.22, 0.7, 1], [90, 90, 0, 0], { ease: easeInOut }),
  sceneOpacity: transform([0, 0.88, 1], [1, 1, 0], { ease: easeInOut })
};

const phases = [
  [0.08, "Stillness"],
  [0.38, "Attraction"],
  [0.6, "Acceleration"],
  [0.7, "Threshold"],
  [0.88, "Suspension"]
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
    phase: phases.find(([boundary]) => position < boundary)?.[1] ?? "Handoff"
  });
}

// Ready clock (0–1): text is animated in the React owner; these channels share it.
const openingChannels = {
  fieldOpacity: transform(
    [
      OPENING_TIMING.fieldStart / OPENING_TIMING.duration,
      OPENING_TIMING.pageStart / OPENING_TIMING.duration
    ],
    [0, 1]
  ),
  controlsOpacity: transform(
    [OPENING_TIMING.pageStart / OPENING_TIMING.duration, 1],
    [0, 1]
  )
};

const openingPhases = [
  [OPENING_TIMING.textStart / OPENING_TIMING.duration, "Black"],
  [OPENING_TIMING.fieldStart / OPENING_TIMING.duration, "Text reveal"],
  [OPENING_TIMING.pageStart / OPENING_TIMING.duration, "Text + streak reveal"],
  [1, "Page reveal"]
] as const;

export function getOpeningFrame(progress: number) {
  if (!Number.isFinite(progress)) {
    throw new RangeError("Opening progress must be a finite number.");
  }
  const position = clamp(0, 1, progress);
  return Object.freeze({
    fieldOpacity: openingChannels.fieldOpacity(position),
    controlsOpacity: openingChannels.controlsOpacity(position),
    phase:
      openingPhases.find(([boundary]) => position < boundary)?.[1] ?? "Ready"
  });
}

// Prelude ends at the production corona's zero-scroll pose. The actual Hero
// owns every notification and caption after this boundary.
export const TOR = Object.freeze({
  duration: 9.8,
  seconds: Object.freeze([0, 0.45, 1.3, 2, 2.6, 4, 4.8, 6, 7.4, 9.8]),
  progress: Object.freeze([
    0,
    0.01,
    0.04,
    0.08,
    0.14,
    0.34,
    0.42,
    0.5,
    0.6,
    HANDOFF
  ])
});

// Overall scroll (0–1): prelude ends at handoff; original Hero owns the remainder.
const warpProgress = transform(
  [0, 0.04, 0.6, 0.68, HANDOFF, 1],
  [0, 0, 0.74, 0.74, 0.76, 0.76]
);
// A separate pinned material transition: expansion never restores ring color.
const settlement = transform([0.6, HANDOFF], [0, 1]);
const headlineSplit = transform([0.2, 0.34], [0, 1], { ease: easeInOut });
const headlineOp = transform([0.3, 0.4], [1, 0]);
const reveal = transform([0.34, 0.42], [0, 1], { ease: easeInOut });
// The passage traverses the viewport; fade only after its bottom clears the top.
const opa = transform([0, 0.34, 0.35, 0.6, 0.61, 1], [0, 0, 1, 1, 0, 0]);
const lift = transform([0.34, 0.6], [0, 1]);

export function getFrame(progress: number) {
  if (!Number.isFinite(progress)) {
    throw new RangeError("Study progress must be a finite number.");
  }
  const position = clamp(0, 1, progress);
  return Object.freeze({
    warpProgress: warpProgress(position),
    settlement: settlement(position),
    headlineSplit: headlineSplit(position),
    headlineOpacity: headlineOp(position),
    passageReveal: reveal(position),
    passageOpacity: opa(position),
    passageLift: lift(position),
    phase:
      position < 0.34
        ? "Attraction"
        : position < 0.6
          ? "Passage"
          : position < 0.62
            ? "Settling"
            : position < HANDOFF
              ? "Color return"
              : "Corona"
  });
}
