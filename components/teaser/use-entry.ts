"use client";

import { useEffect, useMemo, useRef } from "react";
import { animate, useMotionValue } from "motion/react";
import { entryTokens } from "@/lib/teaser/entry-tokens";

/** Motion owns the entry clock; values bind directly to motion elements or Three. */
export function useEntry(reduced: boolean) {
  const finished = useRef(false);
  const dock = useMotionValue<number>(entryTokens.initial.dock);
  const backdrop = useMotionValue<number>(entryTokens.initial.backdrop);
  const notification = useMotionValue<number>(entryTokens.initial.notification);
  const scale = useMotionValue<number>(entryTokens.initial.scale);
  const glyph = useMotionValue<number>(entryTokens.initial.glyph);
  const values = useMemo(
    () => ({ dock, backdrop, notification, scale, glyph }),
    [dock, backdrop, notification, scale, glyph]
  );

  useEffect(() => {
    if (reduced || finished.current) {
      for (const key of Object.keys(values) as (keyof typeof values)[]) {
        values[key].set(entryTokens.complete[key]);
      }
      finished.current = true;
      return;
    }

    const channels = ["dock", "backdrop", "notification", "scale"] as const;
    const controls = [
      ...channels.map((key) =>
        animate(
          values[key],
          [entryTokens.initial[key], entryTokens.complete[key]],
          { ...entryTokens[key], ease: entryTokens.ease }
        )
      ),
      animate(values.glyph, [...entryTokens.glyph.keyframes], {
        duration: entryTokens.glyph.duration,
        times: [...entryTokens.glyph.times],
        ease: entryTokens.ease
      })
    ];
    let disposed = false;
    const updateVisibility = () => {
      if (finished.current) return;
      for (const control of controls) {
        if (
          document.visibilityState === "hidden" &&
          control.state === "running"
        )
          control.pause();
        else if (
          document.visibilityState !== "hidden" &&
          control.state === "paused"
        )
          control.play();
      }
    };
    if (document.visibilityState === "hidden") updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    void Promise.all(controls).then(() => {
      if (!disposed) finished.current = true;
    });
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", updateVisibility);
      for (const control of controls) control.stop();
    };
  }, [values, reduced]);

  return values;
}
