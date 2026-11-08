"use client";

import { cn } from "@/lib/utils";
import { ProgressRail } from "../visuals/ProgressRail";
import { TapeCounter } from "../visuals/TapeCounter";
import { TapeReels } from "../visuals/TapeReels";
import { TrackInfo } from "../visuals/TrackInfo";
import { SIZES } from "../constants";

type DrawerPlayerProps = {
  className?: string;
};

/**
 * Mobile drawer variant — touch-optimized, info-and-state only.
 *
 * Layout:
 *   Left: mini TapeReels (visual indicator)
 *   Right:
 *     TrackInfo (two lines)
 *     ProgressRail
 *     TapeCounter
 *
 * Play/pause lives in the Controlbar's left zone. Skip/rewind, when
 * available to premium roles, are surfaced on the dedicated Radio page —
 * not duplicated here so the narrow viewport stays uncrowded.
 */
export const DrawerPlayer = ({ className }: DrawerPlayerProps) => {
  const sizes = SIZES.drawer;

  return (
    <div className={cn("flex w-full items-center gap-3 px-4 py-3", className)}>
      {/* Mini reels on the left */}
      <div className="flex shrink-0 items-center justify-center">
        <TapeReels diameter={sizes.reelDiameter} className="w-[96px]" />
      </div>

      {/* Info + progress on the right */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <TrackInfo size="compact" />
        <ProgressRail thin className="w-full" />
        <TapeCounter
          height={sizes.counterHeight}
          className="w-full text-[0.6rem]"
        />
      </div>
    </div>
  );
};
