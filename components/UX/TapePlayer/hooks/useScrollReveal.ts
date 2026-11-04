"use client";

import {
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { RefObject } from "react";

type ScrollRevealValues = {
  opacity: MotionValue<number>;
  y: MotionValue<number>;
  reelRotation: MotionValue<number>;
  scrollProgress: MotionValue<number>;
};

/**
 * Scroll-linked reveal for the Hero player section.
 * - Reels gently rotate as user scrolls past (hints interactivity)
 * - Content fades in on enter, dims on exit
 * - Subtle parallax y-shift
 */
export function useScrollReveal(
  containerRef: RefObject<HTMLElement | null>
): ScrollRevealValues {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const opacity = useTransform(
    scrollYProgress,
    [0, 0.2, 0.7, 1],
    [0, 1, 1, 0.3]
  );

  const y = useTransform(scrollYProgress, [0, 0.5, 1], [40, 0, -20]);

  // Two full rotations over the scroll range
  const reelRotation = useTransform(scrollYProgress, [0, 1], [0, 720]);

  return {
    opacity,
    y,
    reelRotation,
    scrollProgress: scrollYProgress,
  };
}
