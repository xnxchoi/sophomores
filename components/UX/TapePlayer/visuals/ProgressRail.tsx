"use client";

import { useEffect, useRef, useState } from "react";

import { TickIndicator } from "@/components/ui/tick-indicator";
import { cn } from "@/lib/utils";
import { useNowPlaying } from "@/providers/HideawayFM/hooks";
import { SPRING_EASE } from "@/constants/animations";

type ProgressRailProps = {
  thin?: boolean;
  className?: string;
};

const MIN_TICKS = 20;

/**
 * Passive progress display — shows tape travel as a discrete tick rail.
 * Non-interactive: seeking is handled by SeekKnob.
 *
 * Uses a ResizeObserver to derive the tick count from container width,
 * so the rail spans edge-to-edge regardless of layout. Internal springs
 * inside TickIndicator handle per-tick motion, so we feed raw progress.
 */
export const ProgressRail = ({
  thin = false,
  className
}: ProgressRailProps) => {
  const { progress } = useNowPlaying();
  const railRef = useRef<HTMLDivElement>(null);

  const tickSpacing = thin ? 2 : 3;
  const tickHeight = thin ? 4 : 6;
  const focalHeight = thin ? 8 : 12;
  const railHeight = thin ? 10 : 16;

  const [ticks, setTicks] = useState(60);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;

    const compute = (width: number) => {
      const next = Math.max(MIN_TICKS, Math.floor(width / tickSpacing));
      setTicks((prev) => (prev === next ? prev : next));
    };

    compute(el.getBoundingClientRect().width);

    const ro = new ResizeObserver(([entry]) => {
      compute(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [tickSpacing]);

  return (
    <div
      ref={railRef}
      className={cn(
        "relative flex w-full cursor-default items-center justify-center",
        className
      )}
      style={{ height: railHeight }}
    >
      <TickIndicator
        mode="fill"
        value={progress}
        springConfig={SPRING_EASE.power4.inOut}
        ticks={ticks}
        tickSpacing={tickSpacing}
        tickHeight={tickHeight}
        focalHeight={focalHeight}
      />
    </div>
  );
};
