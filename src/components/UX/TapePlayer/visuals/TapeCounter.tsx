"use client";

import { SlidingNumber } from "@/components/ui/sliding-number";
import { cn } from "@/lib/utils";
import { useNowPlaying } from "@/providers/HideawayFM/hooks";
import * as m from "motion/react-m";
import { useEffect, useState } from "react";

type TapeCounterProps = {
  height?: number;
  className?: string;
};

/**
 * OP-1 Field-inspired digital tape counter.
 * Shows elapsed time on the left and remaining on the right.
 */
export const TapeCounter = ({ height = 36, className }: TapeCounterProps) => {
  const { elapsedMs, durationMs } = useNowPlaying();
  const elapsedSec = elapsedMs / 1000;
  const durationSec = durationMs / 1000;

  const [elapsedMinutes, setElapsedM] = useState(Math.floor(elapsedSec / 60));
  const [elapsedSeconds, setElapsedS] = useState(Math.floor(elapsedSec % 60));
  const [remainingMinutes, setRemainingMinutes] = useState(
    durationSec > 0 ? Math.floor((durationSec - elapsedSec) / 60) : 0
  );
  const [remainingSeconds, setRemainingSeconds] = useState(
    durationSec > 0 ? Math.floor((durationSec - elapsedSec) % 60) : 0
  );

  useEffect(() => {
    if (durationSec > 0) {
      const remaining = Math.max(0, durationSec - elapsedSec);
      setElapsedM(Math.floor(elapsedSec / 60));
      setElapsedS(Math.floor(elapsedSec % 60));
      setRemainingMinutes(Math.floor(remaining / 60));
      setRemainingSeconds(Math.floor(remaining % 60));
    } else {
      setElapsedM(0);
      setElapsedS(0);
      setRemainingMinutes(0);
      setRemainingSeconds(0);
    }
  }, [durationSec, elapsedSec]);

  return (
    <m.div
      className={cn(
        "bg-off-bg flex w-full items-center justify-between rounded-sm px-3",
        "font-sans tracking-tight text-bleu-200 tabular-nums",
        className
      )}
      style={{ height }}
      role="timer"
    >
      {/* Elapsed */}
      <div className="flex items-center gap-0">
        <SlidingNumber value={elapsedMinutes} padStart={true} />
        <SlidingNumber value={elapsedSeconds} padStart={true} />
      </div>
      {/* Center separator */}
      <span className="text-[0.6em] opacity-30">▶</span>
      {/* Remaining */}
      <div className="flex items-center gap-0 opacity-60">
        <SlidingNumber value={remainingMinutes} padStart={true} />
        <SlidingNumber value={remainingSeconds} padStart={true} />
      </div>
    </m.div>
  );
};
