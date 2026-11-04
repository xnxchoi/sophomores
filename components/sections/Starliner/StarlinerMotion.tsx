"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion, type Transition } from "motion/react";
import * as m from "motion/react-m";
import { cn } from "@/lib/utils";
import "@/styles/__stars.scss";

const STARLINE_BASES: { left: number; top: number; width?: number }[] = [
  { left: -110, top: 40, width: 110 }, // 1
  { left: -100, top: 70 }, // 2
  { left: -120, top: 140 }, // 3
  { left: -120, top: 160 }, // 4
  { left: -120, top: 0 }, // 5 (52.6% — resolved at runtime via ratio flag)
  { left: -100, top: -25 }, // 6
  { left: -10, top: -25 }, // 7
  { left: 50, top: -40 }, // 8
  { left: -90, top: -40 }, // 9
  { left: 200, top: -25 }, // 10
  { left: 290, top: -40 }, // 11
  { left: 120, top: -40 }, // 12
  { left: 140, top: -40 }, // 13
  { left: -100, top: 0 }, // 14 (50% — resolved at runtime)
  { left: -120, top: 10 }, // 15
  { left: 140, top: -25 }, // 16
  { left: 140, top: -25 } // 17
];

// Indexes that resolve `top` from a percentage of container height.
const TOP_BY_RATIO: Partial<Record<number, number>> = {
  4: 0.526,
  13: 0.5
};

// Indexes that get the "comet" treatment: warmer, slower, scaled up.
const COMET_INDEXES = new Set([2, 9, 14]);

const ANIM_CONFIGS: Array<{
  scale: number;
  delay: number;
  duration: number;
  repeatDelay: number;
}> = [
  { scale: 1, delay: 0, duration: 8, repeatDelay: 1.5 },
  { scale: 0.6, delay: 0.2, duration: 5.6, repeatDelay: 1 },
  { scale: 1.4, delay: 0.6, duration: 7, repeatDelay: 0 },
  { scale: 1.2, delay: 0.2, duration: 5.9, repeatDelay: 1 },
  { scale: 0.9, delay: 0, duration: 2.3, repeatDelay: 5.4 },
  { scale: 0.7, delay: 2.4, duration: 6, repeatDelay: 2 },
  { scale: 1.1, delay: 2.4, duration: 6, repeatDelay: 3.2 },
  { scale: 1, delay: 1, duration: 5, repeatDelay: 1 },
  { scale: 1.2, delay: 1, duration: 6, repeatDelay: 4.5 },
  { scale: 1, delay: 3, duration: 5.6, repeatDelay: 3 },
  { scale: 1, delay: 1, duration: 5, repeatDelay: 2 },
  { scale: 0.6, delay: 3, duration: 5.6, repeatDelay: 3 },
  { scale: 0.9, delay: 2.3, duration: 5.8, repeatDelay: 2 },
  { scale: 0.9, delay: 1, duration: 5, repeatDelay: 1.7 },
  { scale: 1.2, delay: 0.6, duration: 7, repeatDelay: 0.6 },
  { scale: 0.6, delay: 2, duration: 8, repeatDelay: 2 },
  { scale: 0.7, delay: 2, duration: 7, repeatDelay: 2 }
];

const STAR_EASE: Transition["ease"] = [0.12, 0.23, 0.5, 1];

// Stars fall on a steep diagonal (top-left → bottom-right). Per-star jitter
// keeps the field from moving in lockstep. Range ~38°–58°.
const STAR_BASE_ANGLE_DEG = 48;
const STAR_ANGLE_JITTER: number[] = [
  -8, 5, 10, -4, 7, -10, 3, 8, -6, 9, -3, 4, 6, -7, 2, -2, 11
];
const angleForIndex = (i: number): number => {
  const jitter = STAR_ANGLE_JITTER[i % STAR_ANGLE_JITTER.length] ?? 0;
  return STAR_BASE_ANGLE_DEG + jitter;
};

export type StarlinerMotionProps = {
  /** "warm" leans the star tail amber/cream — fits the Patron card. */
  tint?: "white" | "warm";
  className?: string;
};

export function StarlinerMotion({
  tint = "white",
  className
}: StarlinerMotionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const inView = useInView(wrapperRef, { amount: 0.1 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { w, h } = size;
  const ready = w > 0 && h > 0;
  const animationsActive = ready && inView;

  const tailGradient =
    tint === "warm"
      ? "linear-gradient(270deg, oklch(0.95 0.08 80 / 0.7) 0%, oklch(0.95 0.08 80 / 0) 100%)"
      : "linear-gradient(270deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 100%)";
  const headColor =
    tint === "warm" ? "oklch(0.95 0.08 80 / 0.85)" : "rgba(255,255,255,0.92)";
  const headGlow =
    tint === "warm"
      ? "oklch(0.95 0.13 80 / 0.7) 0 0 8px 1px"
      : "rgba(255,255,255,0.6) 0 0 6px 1px";

  return (
    <m.div
      ref={wrapperRef}
      aria-hidden
      className={cn("starliner absolute inset-0", className)}
      data-tint={tint}
    >
      <div
        ref={containerRef}
        className="absolute inset-2.5 z-1 overflow-hidden rounded-2xl"
      >
        {ready &&
          STARLINE_BASES.map((base, i) => {
            const cfg = ANIM_CONFIGS[i] ?? ANIM_CONFIGS[0];
            const top = TOP_BY_RATIO[i] ? TOP_BY_RATIO[i]! * h : base.top;
            const isComet = COMET_INDEXES.has(i);
            // Per-star angle (fall direction matches visual rotation).
            const angleDeg = angleForIndex(i);
            const angleRad = (angleDeg * Math.PI) / 180;
            // Travel a full diagonal-plus, with the star entering from
            // off-screen on the upstream side so the user never sees it
            // "spawn" at a fixed point and gear up.
            const distance = Math.hypot(w, h) + 320;
            const dx = Math.cos(angleRad);
            const dy = Math.sin(angleRad);
            const travelX = distance * dx;
            const travelY = distance * dy;
            const entryOffset = 180; // start this far off-screen up-left
            const startX = -entryOffset * dx;
            const startY = -entryOffset * dy;
            const endX = travelX;
            const endY = travelY;
            const lineWidth = base.width ?? 100;
            const scale = isComet ? cfg.scale * 1.6 : cfg.scale;
            const duration = isComet ? cfg.duration * 1.15 : cfg.duration;

            return (
              <m.div
                key={`starline-${i}`}
                className="starline"
                style={{
                  position: "absolute",
                  left: base.left,
                  top,
                  width: lineWidth,
                  height: 1,
                  transformOrigin: "left center"
                }}
                initial={{
                  x: startX,
                  y: startY,
                  opacity: 0,
                  scale,
                  rotate: angleDeg
                }}
                animate={
                  animationsActive
                    ? {
                        x: [startX, endX],
                        y: [startY, endY],
                        opacity: [0, 1, 1, 0],
                        scale,
                        rotate: angleDeg
                      }
                    : {
                        x: startX,
                        y: startY,
                        opacity: 0,
                        scale,
                        rotate: angleDeg
                      }
                }
                transition={
                  animationsActive
                    ? {
                        duration,
                        ease: STAR_EASE,
                        delay: cfg.delay,
                        repeat: Infinity,
                        repeatDelay: Math.max(0, cfg.repeatDelay),
                        times: [0, 0.18, 0.78, 1]
                      }
                    : { duration: 0.2 }
                }
              >
                <div className="contents">
                  <m.div
                    className="relative h-px overflow-visible"
                    style={{
                      width: lineWidth,
                      background: tailGradient
                    }}
                  >
                    <div
                      className="absolute top-0 right-0 overflow-visible"
                      style={{
                        width: isComet ? 2 : 1,
                        height: isComet ? 2 : 1,
                        backgroundColor: headColor,
                        borderRadius: 1,
                        boxShadow: headGlow
                      }}
                    />
                  </m.div>
                </div>
              </m.div>
            );
          })}
      </div>
      <m.div
        className="starline-backdrop"
        style={{
          imageRendering: "pixelated",
          flexShrink: 0,
          backgroundImage: `url("/assets/starliner-backdrop.svg")`,
          opacity: 0.8,
          backgroundRepeat: "repeat",
          backgroundSize: "44% 23%",
          inset: 0,
          backgroundPosition: "center"
        }}
      />
      <m.div
        className="starliner-twinkle"
        aria-hidden
        style={{
          backgroundSize: "44% 23%"
        }}
      />
    </m.div>
  );
}
