"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { BrandMark } from "@/lib/brand";
import { ArrowSquareOutIcon, ClockIcon, LockKeyIcon, MusicNotesIcon } from "@phosphor-icons/react";
import { Check, CircleAlert, Copy } from "lucide-react";
import { useCopyFeedback } from "@/components/arc/copy-button/use-copy-feedback";
import { cn } from "@/lib/utils";
import type { SetlistData } from "@/lib/music/types";

interface SetlistHeaderProps {
  setlist: SetlistData;
  contributedCount: number;
  archiveOnly?: boolean;
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

export function SetlistHeader({ setlist, contributedCount, archiveOnly = false }: SetlistHeaderProps) {
  const t = useTranslations("Interface.radio");
  const copyT = useTranslations("Interface.copy");
  const [countdown, setCountdown] = useState<ReturnType<typeof formatCountdown> | null>(null);
  const { state: copyState, copy } = useCopyFeedback();
  const [showManualCopy, setShowManualCopy] = useState(false);
  const shareUrl = useSyncExternalStore(
    () => () => {},
    () => (typeof window !== "undefined" ? window.location.origin + window.location.pathname : ""),
    () => ""
  );

  useEffect(() => {
    if (archiveOnly || setlist.status !== "active") return;
    const update = () => setCountdown(formatCountdown(setlist.deadline));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [archiveOnly, setlist.deadline, setlist.status]);

  const appleUrl = setlist.appleMusic?.playlistUrl;
  const isClosed = Boolean(countdown?.isExpired) || setlist.isPastDeadline || setlist.status !== "active";

  return (
    <header className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur-md shadow-[0_4px_24px_-4px_rgba(0,0,0,0.5)] md:p-8">
      {/* Subtle top edge specular highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between lg:flex-col lg:items-stretch">
        <div className="flex flex-col gap-3 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center text-white">
              <MusicNotesIcon className="size-4" />
            </span>
            <span className="text-xs font-sans tracking-tight text-neutral-400">
              {archiveOnly ? t("publicArchive") : t("collaborativeSetlist")}
            </span>
            <span className="text-xs font-sans text-neutral-300">
              Apple Music
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h1 tabIndex={-1} className="text-2xl md:text-3xl tracking-tight text-white">
              <BrandMark className="mr-2">Sophomores</BrandMark>
              {/* JSX leaves no space between the mark and the title; this lets a narrow header wrap there. */}
              <wbr />
              <span>{setlist.title}</span>
            </h1>
            <p className="text-xs md:text-sm text-neutral-400 leading-relaxed">
              {archiveOnly ? t("archiveReadOnly") : setlist.description}
            </p>
          </div>

          {/* Metric badges */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-300">
              <span className="text-neutral-400">Total tracks:</span>
              <span className="font-sans text-white tabular-nums">{setlist.totalTracks}</span>
            </div>
            {!archiveOnly && <>
            <div className="flex items-center gap-1.5 text-xs text-neutral-300">
              <span className="text-neutral-400">Attendee additions:</span>
              <span className="font-sans text-white tabular-nums">{contributedCount}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-neutral-300">
              <span className="text-neutral-400">Limit:</span>
              <span className="font-sans text-white">2 slots per ticket</span>
            </div>
            </>}
          </div>
        </div>

        {/* Right column: Countdown & Actions */}
        <div className="flex flex-col gap-4 md:items-end lg:items-stretch">
          {/* Deadline: a ruled section, not a card inside the header */}
          {!archiveOnly && <div
            className={cn(
              "flex flex-col gap-1.5 border-t border-white/10 pt-4",
              isClosed ? "text-neutral-400" : "text-white"
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

            {!isClosed && countdown && (
              <div className="flex items-baseline gap-2 font-sans text-lg font-medium tabular-nums text-white">
                <span>{countdown.days}d</span>
                <span className="text-neutral-500">:</span>
                <span>{String(countdown.hours).padStart(2, "0")}h</span>
                <span className="text-neutral-500">:</span>
                <span>{String(countdown.minutes).padStart(2, "0")}m</span>
                <span className="text-neutral-500">:</span>
                <span>{String(countdown.seconds).padStart(2, "0")}s</span>
              </div>
            )}
          </div>}

          {/* Quick Actions */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {appleUrl && <a
              href={appleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white px-4 text-xs font-medium text-black transition-colors hover:bg-neutral-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white shrink-0"
            >
              <span>Open in Apple Music</span>
              <ArrowSquareOutIcon className="size-4" />
            </a>}

            {shareUrl ? (
              <button
                type="button"
                onClick={async () => setShowManualCopy(!(await copy(shareUrl)))}
                aria-label={t("copySetlistLink")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-neutral-900/90 px-4 text-xs font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white shrink-0"
              >
                {copyState === "copied" ? (
                  <>
                    <Check className="size-4 text-white" />
                    <span>{copyT("copied")}</span>
                  </>
                ) : showManualCopy ? (
                  <>
                    <CircleAlert className="size-4 text-neutral-400" />
                    <span>{t("copyLinkFailed")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-4 text-neutral-400" />
                    <span>{t("copySetlistLink")}</span>
                  </>
                )}
              </button>
            ) : null}
          </div>
          <p role="status" className="sr-only">
            {copyState === "copied" ? copyT("successAnnouncement", { label: t("setlistLink") })
              : showManualCopy ? t("copyLinkFailed") : null}
          </p>
          {showManualCopy && (
            <label className="grid min-w-0 gap-1 text-sm text-neutral-300">
              {t("copyLinkManually")}
              <input
                className="mt-0 min-h-11 w-full rounded-none border-0 border-b border-white/15 bg-transparent px-0 py-0 font-normal tracking-normal text-white"
                value={shareUrl}
                readOnly
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
          )}
        </div>
      </div>
    </header>
  );
}
