import type { LenisOptions } from "lenis";

export const motionTokens = {
  duration: { instant: 0.08, fast: 0.18, normal: 0.35, slow: 0.6, crawl: 1 },
  easing: { smooth: [0.22, 1, 0.36, 1], linear: [0, 0, 1, 1] },
  distance: { sm: 8, md: 16, lg: 24, xl: 48 },
  scale: { hidden: 0.85, press: 0.95, pop: 1.04 }
} as const;

export const springs = {
  snappy: { type: "spring", stiffness: 300, damping: 30 },
  gentle: { type: "spring", stiffness: 120, damping: 24 }
} as const;

export const scrollSmoothing :LenisOptions = {
  autoRaf: true,
  anchors: true,
  lerp: 0.1,
  smoothWheel: true,
  syncTouch: false,
  respectReducedMotion: false
} as const;

export function shouldAnimate({ prefersReduced = false } = {}) {
  return !prefersReduced;
}
