"use client";

import { counterReadout } from "@/lib/content/transport";

/** Elapsed and remaining. The sliding-digit reel stays in Hideaway. */
export function TapeCounter({ position, duration }: { position: number; duration: number }) {
  const readout = counterReadout(position, duration);

  return (
    <div
      role="timer"
      aria-label={`${readout.elapsed} elapsed, ${readout.remaining} remaining`}
      className="flex items-center justify-between rounded-sm border border-border px-3 py-2 text-base tabular-nums"
    >
      <span>{readout.elapsed}</span>
      <span aria-hidden="true" className="text-foreground/40">
        ▶
      </span>
      <span className="text-foreground/60">{readout.remaining}</span>
    </div>
  );
}
