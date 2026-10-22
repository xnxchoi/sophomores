"use client";

import { useEffect, useMemo, useRef } from "react";
import { animate, useMotionValue, useScroll } from "motion/react";
import { entryTokens } from "@/lib/teaser/entry-tokens";
import {
  createEntryState,
  updateEntryState,
  type EntryState
} from "@/lib/teaser/entry-controller";

/** Motion owns the entry clock; values bind directly to motion elements or Three. */
export function useEntry(reduced: boolean) {
  const { scrollY } = useScroll();
  const finished = useRef(false);
  const phase = useRef<EntryState | null>(null);
  const dock = useMotionValue<number>(entryTokens.initial.dock);
  const backdrop = useMotionValue<number>(entryTokens.initial.backdrop);
  const layout = useMotionValue<number>(entryTokens.initial.layout);
  const scale = useMotionValue<number>(entryTokens.initial.scale);
  const glyph = useMotionValue<number>(entryTokens.initial.glyph);
  const values = useMemo(
    () => ({ dock, backdrop, layout, scale, glyph }),
    [dock, backdrop, layout, scale, glyph]
  );

  useEffect(() => {
    if (reduced) {
      for (const key of Object.keys(values) as (keyof typeof values)[]) {
        values[key].set(entryTokens.complete[key]);
      }
      finished.current = true;
    }

    phase.current ??= createEntryState(
      window.scrollY,
      Boolean(window.location.hash && window.location.hash !== "#hero")
    );
    const channels = ["dock", "backdrop", "layout", "scale"] as const;
    let controls: ReturnType<typeof animate>[] = [];
    let disposed = false;
    let revision = 0;
    const updateVisibility = () => {
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

    const transition = (state: EntryState, immediate = false) => {
      for (const control of controls) control.stop();
      const currentRevision = ++revision;
      const intro = state === "initial" && !finished.current;
      const target =
        state === "clean" ? entryTokens.clean : entryTokens.complete;
      if (immediate && !intro) {
        controls = [];
        for (const key of Object.keys(values) as (keyof typeof values)[])
          values[key].set(target[key]);
        return;
      }
      controls = intro
        ? [
            ...channels.map((key) =>
              animate(
                values[key],
                [entryTokens.initial[key], entryTokens.complete[key]],
                { ease: entryTokens.ease, ...entryTokens[key] }
              )
            ),
            animate(values.glyph, [...entryTokens.glyph.keyframes], {
              duration: entryTokens.glyph.duration,
              times: [...entryTokens.glyph.times],
              ease: entryTokens.ease
            })
          ]
        : (Object.keys(values) as (keyof typeof values)[]).map((key) =>
            animate(values[key], target[key], {
              ...entryTokens.return,
              ease: entryTokens.ease
            })
          );
      updateVisibility();
      void Promise.all(controls).then(() => {
        if (!disposed && currentRevision === revision) finished.current = true;
      });
    };
    const updateScroll = (position: number) => {
      const next = updateEntryState(phase.current!, position);
      if (next === phase.current) return;
      phase.current = next;
      finished.current = true;
      // Keep tracking excursions in still mode, without hiding content or animating.
      if (!reduced) transition(next);
    };

    if (!reduced) transition(phase.current, true);
    document.addEventListener("visibilitychange", updateVisibility);
    const stopScroll = scrollY.on("change", updateScroll);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", updateVisibility);
      stopScroll();
      for (const control of controls) control.stop();
    };
  }, [values, reduced, scrollY]);

  return values;
}
