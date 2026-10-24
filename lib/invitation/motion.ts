import { motionTokens } from "../motion-tokens";

// Study-specific geometry. Timing/easing retain the site's existing vocabulary.
export const studyMotion = {
  perspective: 1200,
  entry: { y: "65%", rotateX: -24, scale: 0.88 },
  exit: { y: "48%", rotateX: 18, scale: 0.92 },
  duration: {
    enter: motionTokens.duration.slow,
    exit: motionTokens.duration.normal,
    paused: motionTokens.duration.fast
  },
  easing: motionTokens.easing.smooth
} as const;

export function filmPoses(still: boolean) {
  if (still) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: studyMotion.duration.paused }
    };
  }
  return {
    initial: { opacity: 0, ...studyMotion.entry },
    animate: { opacity: 1, y: "0%", rotateX: 0, scale: 1 },
    exit: {
      opacity: 0,
      ...studyMotion.exit,
      transition: { duration: studyMotion.duration.exit }
    },
    transition: {
      duration: studyMotion.duration.enter,
      ease: studyMotion.easing
    }
  };
}
