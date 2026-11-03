"use client";

import { counterReadout } from "@/lib/content/transport";

/** Elapsed and remaining. The sliding-digit reel stays in Hideaway. */
export function TapeCounter({ position, duration }: { position: number; duration: number }) {
  const readout = counterReadout(position, duration);

  return (
    <div
      role="timer"
      aria-label={`${readout.elapsed} elapsed, ${readout.remaining} remaining`}
      className="port-rule flex items-center justify-between rounded-sm border px-3 py-2 text-base tabular-nums"
    >
      <span>{readout.elapsed}</span>
      <span aria-hidden="true" className="port-meta">
        ▶
      </span>
      <span className="port-copy">{readout.remaining}</span>
    </div>
  );
}
