"use client";
import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import {
  createTimeline,
  scrollChapters,
  type PinnedChapter
} from "@/lib/teaser/choreography";
import { chapterStep, sectionHeightVh, stepMotionTokens } from "@/lib/teaser/step-motion";
import { createStepQueue } from "@/lib/teaser/step-queue";

export function useChapterScroll(id: PinnedChapter, still = false) {
  const ref = useRef<HTMLElement>(null);
  const timeline = createTimeline(scrollChapters[id]);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"]
  });
  // Scroll selects a destination; Motion owns the time needed to reach it.
  const rawPosition = useTransform(scrollYProgress, [0, 1], [0, scrollChapters[id].steps - 1]);
  const position = useMotionValue(0);
  const displayed = useMotionValue(0);
  const settled = useMotionValue(true);
  const [step, setStep] = useState(0);
  useMotionValueEvent(displayed, "change", setStep);
  useEffect(() => {
    const queue = createStepQueue(Math.round(position.get()), {
      start: (destination, onComplete) => animate(position, destination, {
        ...stepMotionTokens[id],
        onComplete,
      }),
      display: (destination) => displayed.set(destination),
      snap: (destination) => position.jump(destination),
      settle: (value) => settled.set(value),
    });
    const seek = (progress: number) => queue.seek(
      chapterStep(progress, scrollChapters[id].steps),
      still || progress <= 0 || progress >= 1,
    );
    const syncVisibility = () => {
      queue.setPaused(document.visibilityState === "hidden");
    };
    // Observe raw progress too: reaching an endpoint may not change the quantized step.
    const unsubscribe = scrollYProgress.on("change", seek);
    document.addEventListener("visibilitychange", syncVisibility);
    syncVisibility();
    seek(scrollYProgress.get());
    return () => {
      queue.dispose();
      unsubscribe();
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, [id, still, position, displayed, settled, scrollYProgress]);
  return {
    ref,
    position,
    rawPosition,
    step,
    settled,
    timeline,
    sectionStyle: { height: `${sectionHeightVh(timeline.travelVh)}svh` }
  };
}
