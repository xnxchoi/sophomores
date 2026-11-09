"use client";

import { SlidingNumber } from "@/components/ui/sliding-number";
import { counterReadout } from "@/lib/content/transport";

/** Elapsed and remaining, each digit on Hideaway's sliding reel. */
export function TapeCounter({ position, duration }: { position: number; duration: number }) {
  const elapsed = Math.max(0, position);
  const span = duration > 0 ? duration : elapsed;
  const remaining = Math.max(0, span - elapsed);
  const readout = counterReadout(position, duration);

  return (
    <div
      role="timer"
      aria-label={`${readout.elapsed} elapsed, ${readout.remaining} remaining`}
      className="flex h-9 w-full items-center justify-between rounded-sm bg-off-bg px-3 font-sans tracking-tight text-[#9fd4ea] tabular-nums"
    >
      <span className="flex items-center">
        <SlidingNumber value={Math.floor(elapsed / 60)} padStart />
        <SlidingNumber value={Math.floor(elapsed % 60)} padStart />
      </span>
      <span aria-hidden="true" className="port-meta text-[oklch(from_var(--port-shade)_l_c_h_/_0.55)]">
        ▶
      </span>
      <span className="flex items-center opacity-60">
        <SlidingNumber value={Math.floor(remaining / 60)} padStart />
        <SlidingNumber value={Math.floor(remaining % 60)} padStart />
      </span>
    </div>
  );
}
