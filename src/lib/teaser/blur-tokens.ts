// Reference inspection: words begin together; later words take longer to resolve.
import { TargetAndTransition, Variant, Variants } from "motion";

export const blurTextTokens = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 20 } as TargetAndTransition,
  visible: { opacity: 1, filter: "blur(0px)", y: 0 } as TargetAndTransition,
  durationStep: 0.2,
  maxDuration: 2.2,
  reverseDuration: 0.55,
  ease: [0.42, 0, 0.58, 1] as const
};

export function wordTransition(index: number) {
  return {
    duration: Math.min(
      index * blurTextTokens.durationStep,
      blurTextTokens.maxDuration
    ),
    delay: 0,
    ease: blurTextTokens.ease
  };
}

export function blurWordTransition(
  index: number,
  visible: boolean
) {
  return visible
    ? wordTransition(index)
    : {
        duration: blurTextTokens.reverseDuration,
        delay: 0,
        ease: blurTextTokens.ease
      };
}
