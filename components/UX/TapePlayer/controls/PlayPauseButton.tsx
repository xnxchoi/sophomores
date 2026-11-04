"use client";

import { MotionBtn } from "@/components/core/Button";
import { cn } from "@/lib/utils";
import { usePlayState } from "@/providers/HideawayFM/hooks";
import { useRadioControls } from "@/providers/HideawayFM/useRadioControls";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { useCallback, useEffect, useRef } from "react";
import { ICON_PATHS } from "../constants";
import { useHaptics } from "../hooks/useHaptics";

gsap.registerPlugin(MorphSVGPlugin);

type PlayPauseButtonProps = {
  size?: number;
  className?: string;
};

/**
 * Play/Pause toggle with MorphSVG icon morphing.
 * Reads `optimistic` so UI flips the instant the user presses — the real
 * Howl state reconciles behind it.
 */
export const PlayPauseButton = ({
  size = 44,
  className
}: PlayPauseButtonProps) => {
  const { optimistic } = usePlayState();
  const { toggle } = useRadioControls();
  const playing = optimistic === "playing";
  const haptics = useHaptics();

  const pathRef = useRef<SVGPathElement>(null);
  const wrapperRef = useRef<HTMLButtonElement>(null);
  const morphTL = useRef<GSAPTimeline>(null!);

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
              shape: ICON_PATHS.pause
            }
          },
          {
            morphSVG: {
              type: "rotational",
              map: "complexity",
              shape: ICON_PATHS.play
            }
          }
        );
    },
    { scope: wrapperRef }
  );

  useEffect(() => {
    if (!morphTL.current) return;
    if (playing) {
      morphTL.current.reverse();
    } else {
      morphTL.current.play();
    }
  }, [playing]);

  const handleClick = useCallback(() => {
    toggle();
    haptics.impact();
  }, [toggle, haptics]);

  return (
    <MotionBtn
      ref={wrapperRef}
      onClick={handleClick}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cn(
        "flex items-center justify-center rounded-full",
        "text-fg transition-colors duration-200",
        "hover:text-rouge-400 active:text-rouge-500",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bleu-400",
        className
      )}
      style={{ width: size, height: size }}
      aria-label={playing ? "Pause" : "Play"}
    >
      <svg
        viewBox="0 0 15 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[60%] w-[60%]"
      >
        <path
          ref={pathRef}
          d={ICON_PATHS.play}
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </MotionBtn>
  );
};
