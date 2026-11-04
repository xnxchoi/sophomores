"use client";

import { cn } from "@/lib/utils";
import { TransportBar } from "../controls/TransportBar";
import { ProgressRail } from "../visuals/ProgressRail";
import { TapeCounter } from "../visuals/TapeCounter";
import { TrackInfo } from "../visuals/TrackInfo";
import { SIZES } from "../constants";

type SidebarPlayerProps = {
  className?: string;
};

/**
 * Compact sidebar variant (PC).
 * No tape reels — just text info, thin progress rail, and minimal controls.
 *
 * Layout:
 *   TrackInfo (compact)
 *   ProgressRail (thin)
 *   TapeCounter (small)
 *   TransportBar (compact, no dial)
 */
export const SidebarPlayer = ({ className }: SidebarPlayerProps) => {
  const sizes = SIZES.sidebar;

  return (
    <div
      className={cn(
        "flex w-full flex-col items-center gap-2 px-3 py-3",
        className
      )}
    >
      <TrackInfo size="compact" className="w-full" />
      <ProgressRail thin className="w-full" />
      <TapeCounter
        height={sizes.counterHeight}
        className="w-full text-[0.65rem]"
      />
      <TransportBar compact />
    </div>
  );
};
