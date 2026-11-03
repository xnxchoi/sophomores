"use client";

import { useEffect, useRef, useState } from "react";

const MIN_TICKS = 20;

/** Passive tick rail. Seeking stays on the rewind and forward buttons. */
export function ProgressRail({ progress }: { progress: number }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [ticks, setTicks] = useState(MIN_TICKS);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(MIN_TICKS, Math.floor(entry.contentRect.width / 3));
      setTicks((current) => (current === next ? current : next));
    });
    observer.observe(rail);
    return () => observer.disconnect();
  }, []);

  const filled = Math.round(ticks * Math.min(1, Math.max(0, progress)));

  return (
    <div
      ref={railRef}
      className="flex h-4 w-full items-end justify-between"
      aria-hidden="true"
    >
      {Array.from({ length: ticks }, (_, index) => (
        <span
          key={index}
          className={index < filled ? "h-3 w-px bg-foreground" : "h-1.5 w-px bg-foreground/35"}
        />
      ))}
    </div>
  );
}
