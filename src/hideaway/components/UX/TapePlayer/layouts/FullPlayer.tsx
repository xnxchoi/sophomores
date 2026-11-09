"use client";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hideaway/providers/MiddleMan";
import { TransportBar } from "../controls/TransportBar";
import { ProgressRail } from "../visuals/ProgressRail";
import { TapeCounter } from "../visuals/TapeCounter";
import { TapeReels } from "../visuals/TapeReels";
import { TrackInfo } from "../visuals/TrackInfo";
import { SIZES } from "../constants";

type FullPlayerProps = {
  className?: string;
};

/**
 * Full tape deck layout — all visual + control sub-components.
 * Adapts to touch vs mouse via useIsMobile.
 *
 * Layout:
 *   TapeReels
 *   TapeCounter
 *   TrackInfo
 *   ProgressRail
 *   TransportBar (with SpeedDial)
 */
export const FullPlayer = ({ className }: FullPlayerProps) => {
  const { isTouch } = useIsMobile();
  const sizes = SIZES.full;

  return (
    <div
      className={cn(
        "flex w-full max-w-[480px] flex-col items-center gap-4 px-4 py-6 xl:max-w-[560px]",
        "mx-auto",
        className
      )}
    >
      {/* Tape reels */}
      <TapeReels diameter={sizes.reelDiameter} />

      {/* Digital counter */}
      <TapeCounter height={sizes.counterHeight} className="w-full text-sm" />

      {/* Track info */}
      <TrackInfo size="full" />

      {/* Progress display (passive) */}
      <ProgressRail className="w-full" />

      <TransportBar compact={false} className={cn(isTouch && "gap-8")} />
    </div>
  );
};
