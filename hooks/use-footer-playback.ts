"use client";

import { useCallback, useState, useSyncExternalStore, type RefObject } from "react";
import { useScroll, useTransform } from "motion/react";

const serverInactive = () => false;

/** Wake 25vh before either viewport edge. This controls GPU activity, not visibility. */
export function useFooterPlayback(ref: RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({
    target: ref,
    // Motion's axis offsets are viewport-relative, unlike IO's width-relative root margins.
    offset: ["start 125%", "end -25%"]
  });
  const inRange = useTransform(scrollYProgress, value => value > 0 && value < 1);
  const subscribe = useCallback((notify: () => void) => inRange.on("change", notify), [inRange]);
  const snapshot = useCallback(() => inRange.get(), [inRange]);
  const active = useSyncExternalStore(subscribe, snapshot, serverInactive);
  const [visited, setVisited] = useState(false);
  if (active && !visited) setVisited(true);
  return { active, visited };
}
