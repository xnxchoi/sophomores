"use client";
import { useTranslations } from "next-intl";

import { SlidingNumber } from "@/components/ui/sliding-number";
import { counterReadout } from "@/lib/content/transport";

/** Elapsed and remaining, each digit on Hideaway's sliding reel. */
export function TapeCounter({ position, duration }: { position: number; duration: number }) {
  const t = useTranslations("Interface.radio");
  const elapsed = Math.max(0, position);
  const hasDuration = Number.isFinite(duration) && duration > 0;
  const remaining = Math.max(0, duration - elapsed);
  const readout = counterReadout(position, duration);

  return (
    <div
      role="timer"
      aria-label={hasDuration ? t("counter", { elapsed: readout.elapsed, remaining: readout.remaining }) : t("elapsedOnly", { elapsed: readout.elapsed })}
      className="flex h-9 w-full items-center justify-between rounded-sm bg-off-bg px-3 font-sans tracking-tight text-[#9fd4ea] tabular-nums"
    >
      <span className="flex items-center">
        <SlidingNumber value={Math.floor(elapsed / 60)} padStart />
        <SlidingNumber value={Math.floor(elapsed % 60)} padStart />
      </span>
      <span aria-hidden="true" className="port-meta text-[oklch(from_var(--port-shade)_l_c_h_/_0.55)]">
        ▶
      </span>
      <span className="flex min-w-[4ch] items-center justify-end opacity-60" aria-hidden="true">
        {hasDuration ? (
          <>
            <SlidingNumber value={Math.floor(remaining / 60)} padStart />
            <SlidingNumber value={Math.floor(remaining % 60)} padStart />
          </>
        ) : <span>--</span>}
      </span>
    </div>
  );
}
