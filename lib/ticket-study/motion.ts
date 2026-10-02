import { motionTokens } from "../motion-tokens";

export function ticketNumberMotion(still: boolean) {
  if (still) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: motionTokens.duration.fast }
    };
  }
  return {
    initial: { opacity: 0, y: motionTokens.distance.md },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -motionTokens.distance.sm },
    transition: {
      duration: motionTokens.duration.fast,
      ease: motionTokens.easing.smooth
    }
  };
}
