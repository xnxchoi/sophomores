"use client";

import { MotionBtn } from "@/hideaway/components/core/Button";
import { cn } from "@/lib/utils";
import { useRadioControls } from "@/hideaway/providers/HideawayFM/useRadioControls";
import { useCallback } from "react";
import { useHaptics } from "../hooks/useHaptics";

type ForwardButtonProps = {
  size?: number;
  className?: string;
};

/**
 * Skip-forward control. Only rendered when `controls.skip` is defined
 * (premium roles). Rotation +30deg spring on press for tactile feel.
 */
export const ForwardButton = ({ size = 44, className }: ForwardButtonProps) => {
  const { skip } = useRadioControls();
  const haptics = useHaptics();

  const handleClick = useCallback(() => {
    skip?.();
    haptics.impact();
  }, [skip, haptics]);

  if (!skip) return null;

  return (
    <MotionBtn
      onClick={handleClick}
      whileTap={{ scale: 0.88, rotate: 30 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className={cn(
        "flex items-center justify-center rounded-full",
        "text-fg transition-colors duration-200",
        "hover:text-rouge-400 active:text-rouge-500",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bleu-400",
        className
      )}
      style={{ width: size, height: size }}
      aria-label="Forward"
    >
      <svg
        viewBox="0 0 15 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[55%] w-[55%]"
      >
        <path
          d="M8.14645 3.14645C7.95118 3.34171 7.95118 3.65829 8.14645 3.85355L11.2929 7L8.14645 10.1464C7.95118 10.3417 7.95118 10.6583 8.14645 10.8536C8.34171 11.0488 8.65829 11.0488 8.85355 10.8536L12.3536 7.35355C12.5488 7.15829 12.5488 6.84171 12.3536 6.64645L8.85355 3.14645C8.65829 2.95118 8.34171 2.95118 8.14645 3.14645ZM2.14645 3.14645C1.95118 3.34171 1.95118 3.65829 2.14645 3.85355L5.29289 7L2.14645 10.1464C1.95118 10.3417 1.95118 10.6583 2.14645 10.8536C2.34171 11.0488 2.65829 11.0488 2.85355 10.8536L6.35355 7.35355C6.54882 7.15829 6.54882 6.84171 6.35355 6.64645L2.85355 3.14645C2.65829 2.95118 2.34171 2.95118 2.14645 3.14645Z"
          fill="currentColor"
          fillRule="evenodd"
          clipRule="evenodd"
        />
      </svg>
    </MotionBtn>
  );
};
