import { motionTokens } from "../motion-tokens";

export function ticketNumberMotion() {
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
