"use client";

import { counterReadout } from "@/lib/content/transport";

/** Elapsed and remaining. The sliding-digit reel stays in Hideaway. */
export function TapeCounter({ position, duration }: { position: number; duration: number }) {
  const readout = counterReadout(position, duration);

  return (
    <div
      role="timer"
      aria-label={`${readout.elapsed} elapsed, ${readout.remaining} remaining`}
      className="flex h-9 w-full items-center justify-between rounded-sm bg-off-bg px-3 font-sans tracking-tight text-[#9fd4ea] tabular-nums"
    >
      <span>{readout.elapsed}</span>
      <span aria-hidden="true" className="port-meta">
        ▶
      </span>
      <span className="port-copy">{readout.remaining}</span>
    </div>
  );
}
