/** Seconds, not scroll progress. Keep the opening sequence independently tunable. */
export const entryTokens = {
  initial: {
    dock: 0,
    backdrop: 0,
    layout: 0,
    scale: 0.77,
    glyph: 0.4
  },
  complete: {
    dock: 1,
    backdrop: 1,
    layout: 1,
    scale: 1,
    glyph: 1
  },
  clean: {
    dock: 1,
    backdrop: 1,
    layout: 1,
    scale: 1,
    glyph: 1
  },
  scroll: { reset: 8, rearm: 48 },
  return: { duration: 0.5 },
  ease: [0.37, 0, 0.63, 1] as const,
  dock: { delay: 1.5, duration: 1.5 },
  backdrop: { delay: 1, duration: 1 },
  layout: { delay: 3, duration: 0.5 },
  scale: { delay: 2, duration: 3 },
  glyph: {
    duration: 1.5,
    keyframes: [0.4, 0.4, 1, 0.4, 1],
    times: [0, 0.2, 0.35, 0.5, 1]
  }
} as const;
