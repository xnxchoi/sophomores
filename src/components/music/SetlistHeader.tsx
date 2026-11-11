"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { BrandMark } from "@/lib/brand";
import { ArrowSquareOutIcon, ClockIcon, LockKeyIcon, MusicNotesIcon } from "@phosphor-icons/react";
import { Check, CircleAlert, Copy } from "lucide-react";
import { useCopyFeedback } from "@/components/arc/copy-button/use-copy-feedback";
import { cn } from "@/lib/utils";
import type { SetlistData } from "@/lib/music/types";

interface SetlistHeaderProps {
  setlist: SetlistData;
  contributedCount: number;
}

function formatCountdown(targetDate: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
} {
  const target = new Date(targetDate).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0 || isNaN(diff)) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
}

export function SetlistHeader({ setlist, contributedCount }: SetlistHeaderProps) {
  const [countdown, setCountdown] = useState(() => formatCountdown(setlist.deadline));
  const { state: copyState, copy } = useCopyFeedback();
  const shareUrl = useSyncExternalStore(
    () => () => {},
    () => (typeof window !== "undefined" ? window.location.href : ""),
    () => ""
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(formatCountdown(setlist.deadline));
    }, 1000);

    return () => clearInterval(interval);
  }, [setlist.deadline]);

  const appleUrl =
    setlist.appleMusic?.playlistUrl ||
    "https://music.apple.com/kr/playlist/pl.u-LdbqqJmC2AEP9E?a=join&it=m42wwXZcOkXroXsOzOB3&l=en";

  const isClosed = countdown.isExpired || setlist.isPastDeadline || setlist.status === "locked";

  return (
    <header className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] md:p-8">
      {/* Subtle top edge specular highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] text-white">
              <MusicNotesIcon className="size-4" />
            </span>
            <span className="text-xs font-mono tracking-tight text-neutral-400">
              Collaborative setlist
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-mono text-neutral-300">
              Apple Music
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-2xl md:text-3xl font-medium tracking-tight text-white">
              <BrandMark className="mr-2">Sophomores</BrandMark>
              <span>{setlist.title}</span>
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 leading-relaxed">
              {setlist.description ||
                "A collaborative room setlist for Sophomores. Ticket holders nominate two tracks from Apple Music to shape the night."}
            </p>
          </div>

          {/* Metric badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-300">
              <span className="text-neutral-400">Total tracks:</span>
              <span className="font-mono text-white tabular-nums">{setlist.totalTracks}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-300">
              <span className="text-neutral-400">Attendee additions:</span>
              <span className="font-mono text-white tabular-nums">{contributedCount}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-neutral-950/60 px-3 py-1.5 text-xs text-neutral-300">
              <span className="text-neutral-400">Limit:</span>
              <span className="font-mono text-white">2 slots per ticket</span>
            </div>
          </div>
        </div>

        {/* Right column: Countdown & Actions */}
        <div className="flex flex-col gap-4 md:items-end">
          {/* Deadline card */}
          <div
            className={cn(
              "flex flex-col gap-1.5 rounded-xl border p-3.5 min-w-[240px]",
              isClosed
                ? "border-white/10 bg-neutral-950/80 text-neutral-400"
                : "border-white/15 bg-neutral-950/90 text-white"
            )}
          >
            <div className="flex items-center gap-2 text-xs">
              {isClosed ? (
                <LockKeyIcon className="size-3.5 text-neutral-400" />
              ) : (
                <ClockIcon className="size-3.5 text-neutral-300" />
              )}
              <span className="font-medium text-neutral-300">
                {isClosed ? "Nominations closed" : "Nominations close in"}
              </span>
            </div>

            {isClosed ? (
              <p className="text-xs text-neutral-400">
                Setlist is locked and ready for the event.
              </p>
            ) : (
              <div className="flex items-baseline gap-2 font-mono text-lg font-medium tabular-nums text-white">
                <span>{countdown.days}d</span>
                <span className="text-neutral-500">:</span>
                <span>{String(countdown.hours).padStart(2, "0")}h</span>
                <span className="text-neutral-500">:</span>
                <span>{String(countdown.minutes).padStart(2, "0")}m</span>
                <span className="text-neutral-500">:</span>
                <span>{String(countdown.seconds).padStart(2, "0")}s</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <a
              href={appleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 text-xs font-medium text-black transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white shrink-0"
            >
              <span>Open in Apple Music</span>
              <ArrowSquareOutIcon className="size-4" />
            </a>

            {shareUrl ? (
              <button
                type="button"
                onClick={() => void copy(shareUrl)}
                aria-label={copyState === "copied" ? "Link copied" : "Copy link"}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-neutral-900/90 px-4 text-xs font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white shrink-0"
              >
                {copyState === "copied" ? (
                  <>
                    <Check className="size-4 text-white" />
                    <span>Copied</span>
                  </>
                ) : copyState === "error" ? (
                  <>
                    <CircleAlert className="size-4 text-neutral-400" />
                    <span>Failed to copy</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-4 text-neutral-400" />
                    <span>Copy link</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
