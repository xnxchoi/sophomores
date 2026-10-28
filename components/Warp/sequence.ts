import { clamp, cubicBezier, easeInOut, transform } from "motion";
import {
  type SequenceDraft,
  validateSequenceDraft
} from "./_shared/sequence-editor";

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
 * Feature-local art direction, not a shared interpolation helper. Installed Motion
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
  [0, 0.6, 0.68, HANDOFF, 1],
  [0, 0.74, 0.74, 0.76, 0.76]
);
// A separate pinned material transition: expansion never restores ring color.
const settlement = transform([0.6, HANDOFF], [0, 1]);
// 600svh runway minus one viewport = 500svh of travel. At 7% overall
// (7/70 of that travel), the split is complete after just 50svh of scrolling.
const headlineSplit = transform([0.005, 0.07], [0, 1], {
  ease: cubicBezier(0.25, 0.6, 0.35, 1)
});
// Separation leads within the gesture; scale settles as the next copy starts.
// These are scroll poses, not extra smoothing layers or independently running clocks.
const headlineScale = transform([0.005, 0.07], [1, 0.72], {
  ease: cubicBezier(0.22, 0.4, 0.4, 1)
});
const headlineOp = transform([0.22, 0.29], [1, 0], { ease: easeInOut });
const reveal = transform([0.07, 0.15], [0, 1], { ease: easeInOut });
const secondReveal = transform([0.1, 0.18], [0, 1], { ease: easeInOut });
// The passage traverses the viewport; fade only after its bottom clears the top.
const opa = transform([0, 0.07, 0.08, 0.6, 0.61, 1], [0, 0, 1, 1, 0, 0]);
const lift = transform([0.07, 0.6], [0, 1]);

export function getFrame(progress: number) {
  if (!Number.isFinite(progress)) {
    throw new RangeError("Study progress must be a finite number.");
  }
  const position = clamp(0, 1, progress);
  return Object.freeze({
    warpProgress: warpProgress(position),
    settlement: settlement(position),
    headlineSplit: headlineSplit(position),
    headlineScale: headlineScale(position),
    headlineOpacity: headlineOp(position),
    passageReveal: reveal(position),
    passageSecondReveal: secondReveal(position),
    passageOpacity: opa(position),
    passageLift: lift(position),
    phase:
      position < 0.07
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

// Compile once per validated draft, not on scroll frames. These are the feature's
// actual channels, using native Motion interpolation and easing directly.
export function createSequenceMappers(input: SequenceDraft) {
  const parsed = validateSequenceDraft(input);
  if (!parsed.success) throw parsed.error;
  const { clips, openingDuration } = parsed.data;
  const split = transform(
    [clips.headlineSplit.start / 100, clips.headlineSplit.end / 100],
    [0, 1],
    { ease: cubicBezier(...clips.headlineSplit.ease) }
  );
  const scale = transform(
    [clips.headlineScale.start / 100, clips.headlineScale.end / 100],
    [1, 0.72],
    { ease: cubicBezier(...clips.headlineScale.ease) }
  );
  const fade = transform(
    [clips.headlineFade.start / 100, clips.headlineFade.end / 100],
    [1, 0],
    { ease: cubicBezier(...clips.headlineFade.ease) }
  );
  const line1 = transform(
    [clips.passageLine1.start / 100, clips.passageLine1.end / 100],
    [0, 1],
    { ease: cubicBezier(...clips.passageLine1.ease) }
  );
  const line2 = transform(
    [clips.passageLine2.start / 100, clips.passageLine2.end / 100],
    [0, 1],
    { ease: cubicBezier(...clips.passageLine2.ease) }
  );
  const travel = transform(
    [clips.passageTravel.start / 100, clips.passageTravel.end / 100],
    [0, 1],
    { ease: cubicBezier(...clips.passageTravel.ease) }
  );
  const fadeIn = transform(
    [clips.passageFadeIn.start / 100, clips.passageFadeIn.end / 100],
    [0, 1],
    { ease: cubicBezier(...clips.passageFadeIn.ease) }
  );
  const fadeOut = transform(
    [clips.passageFadeOut.start / 100, clips.passageFadeOut.end / 100],
    [0, 1],
    { ease: cubicBezier(...clips.passageFadeOut.ease) }
  );
  const approach = transform([0, clips.warpApproach.end / 100], [0, 0.74], {
    ease: cubicBezier(...clips.warpApproach.ease)
  });
  const terminalApproach = transform([0.68, HANDOFF], [0, 0.02]);
  const settle = transform(
    [clips.ringSettlement.start / 100, HANDOFF],
    [0, 1],
    { ease: cubicBezier(...clips.ringSettlement.ease) }
  );
  const field = transform(
    [clips.openingField.start, clips.openingField.end],
    [0, 1],
    { ease: cubicBezier(...clips.openingField.ease) }
  );
  const controls = transform(
    [OPENING_TIMING.pageStart, OPENING_TIMING.duration],
    [0, 1]
  );

  return Object.freeze({
    frame(progress: number) {
      if (!Number.isFinite(progress))
        throw new RangeError("Study progress must be a finite number.");
      const position = clamp(0, 1, progress);
      return Object.freeze({
        warpProgress: approach(position) + terminalApproach(position),
        settlement: settle(position),
        headlineSplit: split(position),
        headlineScale: scale(position),
        headlineOpacity: fade(position),
        passageReveal: line1(position),
        passageSecondReveal: line2(position),
        passageOpacity: fadeIn(position) * (1 - fadeOut(position)),
        passageLift: travel(position),
        phase:
          position < clips.headlineSplit.end / 100
            ? "Attraction"
            : position < clips.ringSettlement.start / 100
              ? "Passage"
              : position <
                  (clips.ringSettlement.start +
                    (70 - clips.ringSettlement.start) * 0.2) /
                    100
                ? "Settling"
                : position < HANDOFF
                  ? "Color return"
                  : "Corona"
      });
    },
    opening(progress: number) {
      if (!Number.isFinite(progress))
        throw new RangeError("Opening progress must be a finite number.");
      const position = clamp(0, 1, progress);
      const seconds = position * openingDuration;
      return Object.freeze({
        fieldOpacity: field(seconds),
        controlsOpacity: controls(seconds),
        phase:
          position <
          Math.min(clips.openingText.start, clips.openingField.start) /
            openingDuration
            ? "Black"
            : position < clips.openingText.start / openingDuration
              ? "Field reveal"
              : position < clips.openingField.start / openingDuration
                ? "Text reveal"
                : position < clips.openingField.end / openingDuration
                  ? "Text + streak reveal"
                  : position < 1
                    ? "Page reveal"
                    : "Ready"
      });
    }
  });
}
