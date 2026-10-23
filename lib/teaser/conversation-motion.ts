export const conversationMotion = {
  wordOffsetY: 20,
  wordDuration: 0.2,
  wordStagger: 0.05,
  colorDuration: 0.35,
  typingDuration: 0.8,
  typingDelays: [0, 0.2, 0.4],
  typingOpacity: [0.25, 1, 0.25]
} as const;

export const orbitDescriptionMotion = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: -60,
    transition: { duration: 0.6, delay: 0.2 }
  },
  transition: { duration: 1.2, ease: [0.5, 0, 0, 1] }
} as const;

export function wordRevealTransition(index: number) {
  return {
    duration: conversationMotion.wordDuration,
    delay: index * conversationMotion.wordStagger
  };
}

export function messageColors(index: number, active: boolean) {
  if (!active)
    return { backgroundColor: "#161616", color: "#fff", meta: "#bbb" };
  return index === 0
    ? { backgroundColor: "#292929", color: "#fff", meta: "#aaa" }
    : { backgroundColor: "#ff4c25", color: "#000", meta: "#552014" };
}

export function shouldAnimateTyping({
  step,
  inView,
  visible,
}: {
  step: number;
  inView: boolean;
  visible: boolean;
}) {
  return step === 1 && inView && visible ;
}
