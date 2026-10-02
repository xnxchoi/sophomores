"use client";
import { useEffect, type RefObject } from "react";
import { useMotionValueEvent, useScroll, useTransform } from "motion/react";
import type { ChapterId } from "@/lib/teaser/choreography";

export function useChapterActivity(
  ref: RefObject<HTMLElement | null>,
  id: ChapterId,
  onActive: (id: ChapterId) => void
) {
  // Motion offsets are intersections on the vertical scroll axis, not IO root margins.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 40%", "end 40%"]
  });
  const active = useTransform(
    scrollYProgress,
    (value) => value > 0 && value < 1
  );
  useMotionValueEvent(active, "change", (value) => {
    if (value) onActive(id);
  });
  useEffect(() => {
    if (active.get()) onActive(id);
  }, [active, id, onActive]);
}
