"use client";

import { useEffect, useRef, useState } from "react";
import { SPRING_EASE } from "@/constants/animations";
import { TickIndicator } from "@/components/ui/tick-indicator";

const MIN_TICKS = 20;

/** Hideaway tick rail. Seeking stays on the rewind and forward buttons. */
export function ProgressRail({ progress }: { progress: number }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [ticks, setTicks] = useState(60);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const compute = (width: number) => {
      const next = Math.max(MIN_TICKS, Math.floor(width / 3));
      setTicks((current) => (current === next ? current : next));
    };
    compute(rail.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => compute(entry.contentRect.width));
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={railRef} className="relative flex w-full items-center justify-center" style={{ height: 16 }}>
      <TickIndicator
        mode="fill"
        value={progress}
        springConfig={SPRING_EASE.power4.inOut}
        ticks={ticks}
        tickSpacing={3}
        tickHeight={6}
        focalHeight={12}
      />
    </div>
  );
}
