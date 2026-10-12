// Reference inspection: words begin together; later words take longer to resolve.
export const blurTextTokens = {
  hidden: { opacity: 0, filter: "blur(12px)", y: 20 },
  visible: { opacity: 1, filter: "blur(0px)", y: 0 },
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


export function blurWordTransition(index: number, visible: boolean, still: boolean) {
  if (still) return { duration: 0 };
  if (visible) return wordTransition(index);
  return {
    duration: blurTextTokens.reverseDuration,
    delay: 0,
    ease: blurTextTokens.ease
  };
}
