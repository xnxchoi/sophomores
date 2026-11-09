"use client";

import { cn } from "@/lib/utils";
import { useRadioControls } from "@/hideaway/providers/HideawayFM/useRadioControls";
import * as m from "motion/react-m";
import { useCallback } from "react";
import { useHaptics } from "../hooks/useHaptics";

type RewindButtonProps = {
  size?: number;
  className?: string;
};

/**
 * Rewind control. Jumps to the previous track unconditionally — the
 * internet-radio discipline treats the playhead as a moving target rather
 * than something to scrub against. Only rendered when `controls.rewind`
 * is defined (premium roles).
 */
export const RewindButton = ({ size = 44, className }: RewindButtonProps) => {
  const { rewind } = useRadioControls();
  const haptics = useHaptics();

  const handleClick = useCallback(() => {
    rewind?.();
    haptics.impact();
  }, [rewind, haptics]);

  if (!rewind) return null;

  return (
    <m.button
      onClick={handleClick}
      whileTap={{ scale: 0.88, rotate: -30 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={cn(
        "flex items-center justify-center rounded-full",
        "text-fg transition-colors duration-200",
        "hover:text-rouge-400 active:text-rouge-500",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bleu-400",
        className
      )}
      style={{ width: size, height: size }}
      aria-label="Rewind"
    >
      <svg
        viewBox="0 0 15 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[55%] w-[55%]"
      >
        <path
          d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7L6.85355 10.1464C7.04882 10.3417 7.04882 10.6583 6.85355 10.8536C6.65829 11.0488 6.34171 11.0488 6.14645 10.8536L2.64645 7.35355C2.45118 7.15829 2.45118 6.84171 2.64645 6.64645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645ZM12.8536 3.14645C13.0488 3.34171 13.0488 3.65829 12.8536 3.85355L9.70711 7L12.8536 10.1464C13.0488 10.3417 13.0488 10.6583 12.8536 10.8536C12.6583 11.0488 12.3417 11.0488 12.1464 10.8536L8.64645 7.35355C8.45118 7.15829 8.45118 6.84171 8.64645 6.64645L12.1464 3.14645C12.3417 2.95118 12.6583 2.95118 12.8536 3.14645Z"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </m.button>
  );
};
