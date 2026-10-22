import { transform } from "motion";

export const introStudy = {
  referenceUrl: "https://analogueagency.com/",
  referenceVideo:
    "https://framerusercontent.com/assets/PA90UEnQs8MIYLqAD6hWaIJmzB4.mp4",
  productionApproved: false,
  finalCopy: false,
  choreography: {
    heroOut: [0.12, 0.29],
    propositionIn: [0.35, 0.49],
    propositionOut: [0.61, 0.76],
    frameIn: 0.64,
    frameScale: 0.93
  }
} as const;

const heroOpacity = transform([...introStudy.choreography.heroOut], [1, 0]);
const propositionOpacity = transform(
  [
    ...introStudy.choreography.propositionIn,
    ...introStudy.choreography.propositionOut
  ],
  [0, 1, 1, 0]
);

/** One JS scroll clock for both passages; avoid independent native ScrollTimeline ranges. */
export function introCopyOpacity(progress: number) {
  return {
    hero: heroOpacity(progress),
    proposition: propositionOpacity(progress)
  };
}

export interface IntroPlayback {
  readonly ready: boolean;
  readonly reduced: boolean;
  readonly saveData: boolean;
  readonly paused: boolean;
  readonly visible: boolean;
  readonly inView: boolean;
}

export function resolveIntroPlayback(state: IntroPlayback) {
  const loadVideo = state.ready && !state.reduced && !state.saveData;
  return {
    loadVideo,
    playVideo: loadVideo && !state.paused && state.visible && state.inView,
    staticLayout: state.reduced || state.paused
  };
}

export function introFrame(progress: number) {
  const { frameIn, frameScale } = introStudy.choreography;
  const bounded = Math.max(
    0,
    Math.min(1, (progress - frameIn) / (1 - frameIn))
  );
  return { scale: 1 - (1 - frameScale) * bounded };
}
