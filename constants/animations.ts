/** Motion springs used by the Hideaway tour and header. */
export const SPRING_EASE = {
  power2: {
    out: { stiffness: 280, damping: 33, mass: 1 }
  },
  power3: {
    out: { stiffness: 390, damping: 39, mass: 1 }
  },
  power4: {
    inOut: { stiffness: 400, damping: 48, mass: 1 }
  }
} as const;

/** Cubic beziers. `power4.inOut` is the Missing page reveal. `power3.inOut` is the menu. */
export const TWEEN_EASE = {
  power3: {
    inOut: [0.77, 0, 0.175, 1] as [number, number, number, number]
  },
  power4: {
    inOut: [0.76, 0, 0.24, 1] as [number, number, number, number]
  }
} as const;

/** Hideaway's alias. TransitionProvider and RPage import this name. */
export const TE = TWEEN_EASE;
