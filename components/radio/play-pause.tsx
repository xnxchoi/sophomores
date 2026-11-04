"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { useEffect, useRef } from "react";
import * as m from "motion/react-m";

gsap.registerPlugin(MorphSVGPlugin);

/** 15×15 transport paths from the Hideaway tape player. */
export const PLAY_PAUSE_PATHS = {
  play: "M3.24182 2.32181C3.3919 2.23132 3.5784 2.22601 3.73338 2.30781L12.7334 7.05781C12.8974 7.14436 13 7.31457 13 7.5C13 7.68543 12.8974 7.85564 12.7334 7.94219L3.73338 12.6922C3.5784 12.774 3.3919 12.7687 3.24182 12.6782C3.09175 12.5877 3 12.4252 3 12.25V2.75C3 2.57476 3.09175 2.4123 3.24182 2.32181ZM4 3.57925V11.4207L11.4288 7.5L4 3.57925Z",
  pause:
    "M6.04995 2.74998C6.04995 2.44623 5.80371 2.19998 5.49995 2.19998C5.19619 2.19998 4.94995 2.44623 4.94995 2.74998V12.25C4.94995 12.5537 5.19619 12.8 5.49995 12.8C5.80371 12.8 6.04995 12.5537 6.04995 12.25V2.74998ZM10.05 2.74998C10.05 2.44623 9.80371 2.19998 9.49995 2.19998C9.19619 2.19998 8.94995 2.44623 8.94995 2.74998V12.25C8.94995 12.5537 9.19619 12.8 9.49995 12.8C9.80371 12.8 10.05 12.5537 10.05 12.25V2.74998Z"
} as const;

export function PlayPauseButton({
  playing,
  onToggle,
  size = 44
}: {
  playing: boolean;
  onToggle: () => void;
  size?: number;
}) {
  const pathRef = useRef<SVGPathElement>(null);
  const wrapperRef = useRef<HTMLButtonElement>(null);
  const morphTL = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      if (!pathRef.current) return;
      morphTL.current = gsap
        .timeline({
          defaults: { duration: 0.25, ease: "power2.inOut" },
          paused: true
        })
        .fromTo(
          pathRef.current,
          {
            morphSVG: {
              type: "rotational",
              map: "complexity",
              shape: PLAY_PAUSE_PATHS.pause
            }
          },
          {
            morphSVG: {
              type: "rotational",
              map: "complexity",
              shape: PLAY_PAUSE_PATHS.play
            }
          }
        );
      morphTL.current.progress(1);
    },
    { scope: wrapperRef }
  );

  useEffect(() => {
    if (!morphTL.current) return;
    if (playing) morphTL.current.reverse();
    else morphTL.current.play();
  }, [playing]);

  return (
    <m.button
      ref={wrapperRef}
      type="button"
      aria-label={playing ? "Pause" : "Play"}
      aria-pressed={playing}
      className="flex items-center justify-center rounded-full text-faded-fg"
      style={{ width: size, height: size }}
      onClick={onToggle}
      whileTap={{ scale: 0.92 }}
    >
      <svg viewBox="0 0 15 15" fill="none" className="h-[60%] w-[60%]" aria-hidden="true">
        <path
          ref={pathRef}
          d={PLAY_PAUSE_PATHS.play}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </m.button>
  );
}
