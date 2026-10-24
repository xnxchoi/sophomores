import { motionTokens } from "../motion-tokens";
import type { RegistrationStep } from "./registration";

/** Deliberate question-to-question pacing; does not change any other study motion. */
export const stepMotionTokens = {
  departure: 0.38,
  arrival: 0.7,
  breath: 0.08,
  paused: 0.12,
  distance: motionTokens.distance.sm,
  ease: [0.45, 0, 0.25, 1]
} as const;

export function invitationStepVariants(quiet: boolean) {
  return {
    hidden: { opacity: 0, y: quiet ? 0 : stepMotionTokens.distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: quiet ? stepMotionTokens.paused : stepMotionTokens.arrival,
        delay: quiet ? 0 : stepMotionTokens.breath,
        ease: stepMotionTokens.ease
      }
    },
    exit: {
      opacity: 0,
      y: quiet ? 0 : -stepMotionTokens.distance,
      transition: {
        duration: quiet ? stepMotionTokens.paused : stepMotionTokens.departure,
        ease: stepMotionTokens.ease
      }
    }
  };
}

export function canStartStepTransition(
  current: RegistrationStep,
  next: RegistrationStep,
  pending: RegistrationStep | null
) {
  return pending === null && current !== next;
}

export function hasStepArrived(
  pending: RegistrationStep | null,
  panel: RegistrationStep,
  definition: unknown
) {
  return pending !== null && pending === panel && definition === "visible";
}
