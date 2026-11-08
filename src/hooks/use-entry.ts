"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  animate,
  type AnimationSequence,
  useMotionValue,
  useScroll
} from "motion/react";
import { entryTokens } from "@/lib/teaser/entry-tokens";

/** One Motion timeline drives the opening; scroll only decides when to settle it. */
export function useEntry() {
  const { scrollY } = useScroll();
  const finished = useRef(false);
  const away = useRef<boolean | null>(null);
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
    // Restored positions and chapter links must never wait for the opening.
    away.current ??=
      Boolean(window.location.hash && window.location.hash !== "#hero") ||
      (Number.isFinite(window.scrollY) &&
        window.scrollY >= entryTokens.scroll.rearm);
    let control: ReturnType<typeof animate> | undefined;
    let disposed = false;
    const updateVisibility = () => {
      if (document.visibilityState === "hidden" && control?.state === "running")
        control.pause();
      else if (
        document.visibilityState !== "hidden" &&
        control?.state === "paused"
      )
        control.play();
    };
    const transition = (intro: boolean, immediate = false) => {
      control?.stop();
      if (immediate && !intro) {
        control = undefined;
        for (const key of Object.keys(values) as (keyof typeof values)[])
          values[key].set(entryTokens.complete[key]);
        return;
      }
      // Absolute offsets preserve overlapping channels; Motion owns the single clock.
      const sequence: AnimationSequence = intro
        ? [
            [
              dock,
              [entryTokens.initial.dock, entryTokens.complete.dock],
              {
                at: entryTokens.dock.delay,
                duration: entryTokens.dock.duration
              }
            ],
            [
              backdrop,
              [entryTokens.initial.backdrop, entryTokens.complete.backdrop],
              {
                at: entryTokens.backdrop.delay,
                duration: entryTokens.backdrop.duration
              }
            ],
            [
              layout,
              [entryTokens.initial.layout, entryTokens.complete.layout],
              {
                at: entryTokens.layout.delay,
                duration: entryTokens.layout.duration
              }
            ],
            [
              scale,
              [entryTokens.initial.scale, entryTokens.complete.scale],
              {
                at: entryTokens.scale.delay,
                duration: entryTokens.scale.duration
              }
            ],
            [
              glyph,
              [...entryTokens.glyph.keyframes],
              {
                at: 0,
                duration: entryTokens.glyph.duration,
                times: [...entryTokens.glyph.times]
              }
            ]
          ]
        : (Object.keys(values) as (keyof typeof values)[]).map((key) => [
            values[key],
            entryTokens.complete[key],
            { at: 0, duration: entryTokens.return.duration }
          ]);
      control = animate(sequence, {
        defaultTransition: { ease: entryTokens.ease }
      });
      updateVisibility();
      void control.then(() => {
        if (!disposed) finished.current = true;
      });
    };
    const updateScroll = (position: number) => {
      if (!Number.isFinite(position)) return;
      // Hysteresis ignores inertial jitter near the top; an interrupted intro never replays.
      const next = away.current
        ? position > entryTokens.scroll.reset
        : position >= entryTokens.scroll.rearm;
      if (next === away.current) return;
      away.current = next;
      finished.current = true;
      transition(false);
    };

    transition(!away.current && !finished.current, true);
    document.addEventListener("visibilitychange", updateVisibility);
    const stopScroll = scrollY.on("change", updateScroll);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", updateVisibility);
      stopScroll();
      control?.stop();
    };
  }, [values, scrollY, dock, backdrop, layout, scale, glyph]);

  return values;
}
