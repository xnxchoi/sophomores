"use client";

import {
  animate,
  MotionValue,
  useAnimationFrame,
  useMotionValue
} from "motion/react";
import { useCallback, useEffect, useRef } from "react";

type IdleDetectionOptions = {
  /** ms before fog starts creeping in */
  timeout?: number;
  /** ms from first idle to full fog */
  maxFogTime?: number;
  /** ms for fog clear animation (max) */
  clearDuration?: number;
};

type IdleDetectionReturn = {
  /** 0 = clear, 1 = full fog */
  fogProgress: MotionValue<number>;
  isIdle: boolean;
};

const MOUSE_DEBOUNCE_MS = 100;
const CLEAR_DECAY_FACTOR = 0.3;
const MIN_CLEAR_MS = 120;
const INTERACTION_COUNT_RESET_MS = 5000;

export function useIdleDetection({
  timeout = 8000,
  maxFogTime = 15000,
  clearDuration = 350
}: IdleDetectionOptions = {}): IdleDetectionReturn {
  const fogProgress = useMotionValue(0);
  const isIdleRef = useRef(false);

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fogRafRef = useRef<number | null>(null);
  const fogStartTimeRef = useRef<number | null>(null);
  const interactionCountRef = useRef(0);
  const interactionResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastMouseMoveRef = useRef(0);
  const activeAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  useAnimationFrame((timestamp, delta) => {
    if (isIdleRef.current) {
      const currentFog = fogProgress.get();

      const progress = Math.min(
        currentFog + (delta / maxFogTime) * (1 - currentFog),
        1
      );
      fogProgress.set(progress);
    }
  });
  const startFogGrowth = useCallback(() => {
    isIdleRef.current = true;
    fogStartTimeRef.current = performance.now();
  }, []);

  const clearFog = useCallback(() => {
    // Stop fog growth
    isIdleRef.current = false;
    fogStartTimeRef.current = null;
    // if (fogRafRef.current !== null) {
    //   cancelAnimationFrame(fogRafRef.current);
    //   fogRafRef.current = null;
    // }

    // Calculate clear duration — faster with successive interactions
    const count = interactionCountRef.current;
    const clearMs = Math.max(
      clearDuration / (1 + count * CLEAR_DECAY_FACTOR),
      MIN_CLEAR_MS
    );
    interactionCountRef.current = count + 1;

    // Reset interaction count after a pause
    if (interactionResetTimerRef.current) {
      clearTimeout(interactionResetTimerRef.current);
    }
    interactionResetTimerRef.current = setTimeout(() => {
      interactionCountRef.current = 0;
    }, INTERACTION_COUNT_RESET_MS);

    // Animate fog back to 0
    if (activeAnimationRef.current) {
      activeAnimationRef.current.stop();
    }
    if (fogProgress.get() > 0.001) {
      activeAnimationRef.current = animate(fogProgress, 0, {
        duration: clearMs / 1000,
        ease: [0.16, 1, 0.3, 1]
      });
    }
  }, [clearDuration, fogProgress]);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // If fog is active, clear it
    if (isIdleRef.current || fogProgress.get() > 0.001) {
      clearFog();
    }

    // Start new idle timer
    idleTimerRef.current = setTimeout(startFogGrowth, timeout);
  }, [clearFog, fogProgress, startFogGrowth, timeout]);

  useEffect(() => {
    const onMouseMove = () => {
      const now = performance.now();
      if (now - lastMouseMoveRef.current < MOUSE_DEBOUNCE_MS) return;
      lastMouseMoveRef.current = now;
      resetIdleTimer();
    };

    const onInteraction = () => resetIdleTimer();

    document.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("keydown", onInteraction, { passive: true });
    document.addEventListener("scroll", onInteraction, { passive: true });
    document.addEventListener("touchstart", onInteraction, { passive: true });
    document.addEventListener("pointerdown", onInteraction, { passive: true });

    // Start initial idle timer
    idleTimerRef.current = setTimeout(startFogGrowth, timeout);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("keydown", onInteraction);
      document.removeEventListener("scroll", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
      document.removeEventListener("pointerdown", onInteraction);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (fogRafRef.current !== null) cancelAnimationFrame(fogRafRef.current);
      if (interactionResetTimerRef.current)
        clearTimeout(interactionResetTimerRef.current);
      if (activeAnimationRef.current) activeAnimationRef.current.stop();
    };
  }, [resetIdleTimer, startFogGrowth, timeout]);

  return {
    fogProgress,
    isIdle: isIdleRef.current
  };
}
