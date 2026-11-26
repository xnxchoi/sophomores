"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowSquareOutIcon,
  ChatCircleTextIcon,
  MagnifyingGlassIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  XIcon
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { AudioPreviewState } from "./use-audio-preview";
import type { MusicTrackView } from "@/lib/music/types";

interface SetlistTracklistProps {
  tracks: MusicTrackView[];
  audioPreview: AudioPreviewState;
  curatorName?: string;
}

function formatDuration(ms?: number): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function SetlistTracklist({
  tracks,
  audioPreview,
  curatorName = "Sean S. Choi"
}: SetlistTracklistProps) {
  const t = useTranslations("Interface.radio");
  const [filterQuery, setFilterQuery] = useState("");
  const [activeNoteTrackId, setActiveNoteTrackId] = useState<string | null>(null);

  const filteredTracks = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        track.artist.toLowerCase().includes(q) ||
        (track.albumTitle && track.albumTitle.toLowerCase().includes(q)) ||
        (track.submittedByName && track.submittedByName.toLowerCase().includes(q))
    );
  }, [tracks, filterQuery]);

  return (
    <section className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-carbon/60 p-6 backdrop-blur-md md:p-8">
      {/* Subtle top edge highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      <div className="flex flex-col gap-6">
        {/* Header row with search filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base text-white">Full setlist</h2>
            <p className="text-xs text-pewter">
              {t("setlistPreviewIntro", { count: tracks.length })}
            </p>
          </div>

          {/* Quick filter input. The global input rule (sphmrs.scss) is in the base layer, so these utilities set every property it touches. */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-pewter" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter setlist..."
              className="mt-0 h-10 w-full rounded-none border-0 border-b border-white/15 bg-transparent py-0 pl-8 pr-8 font-sans text-xs font-normal tracking-normal text-white placeholder:text-pewter focus-visible:outline-none focus-visible:border-white/40"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pewter hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <XIcon className="size-3.5" />
                <span className="sr-only">Clear filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Tracks: a flat list divided by rules (no box inside the section) */}
        <div className="divide-y divide-white/[0.06] border-y border-white/10">
          {filteredTracks.map((track, idx) => {
            const isPlayingThis =
              audioPreview.activeId === track.id && audioPreview.isPlaying;
            const isActive = audioPreview.activeId === track.id;
            const previewLoading = isActive && audioPreview.status === "loading";
            const previewFailed = isActive && audioPreview.status === "error";
            const isContributed = !!track.submittedByName;
            const hasNote = !!track.note;
            const isNoteOpen = activeNoteTrackId === track.id;

            return (
              <div
                key={track.id || `${track.title}-${idx}`}
                className={cn(
                  "group flex flex-col gap-2 py-3 transition-colors hover:bg-white/[0.03] md:py-3.5",
                  isPlayingThis && "bg-white/[0.04]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Track sequence number */}
                    <span className="w-6 shrink-0 text-center font-sans text-xs tabular-nums text-pewter">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Artwork + Play button */}
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-gunmetal border border-white/10">
                      {track.coverUrl ? (
                        <Image
                          src={track.coverUrl}
                          alt={track.title}
                          width={44}
                          height={44}
                          unoptimized
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center text-pewter">
                          <MusicNotesIcon className="size-4" />
                        </div>
                      )}


                    </div>

                    {/* Track info & Contributor badge */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium truncate",
                            isPlayingThis ? "text-white" : "text-titanium"
                          )}
                        >
                          {track.title}
                        </span>

                        {isContributed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-sans text-singer-stone">
                            <span>Added by {track.submittedByName}</span>
                            {hasNote && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveNoteTrackId(isNoteOpen ? null : track.id)
                                }
                                title="View note"
                                className="text-pewter hover:text-white ml-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                              >
                                <ChatCircleTextIcon className="size-3" />
                              </button>
                            )}
                          </span>
                        ) : (
                          <span className="hidden sm:inline font-sans text-[10px] text-pewter">
                            Curated by {curatorName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-pewter">
                        <span className="truncate">{track.artist}</span>
                        {track.albumTitle && (
                          <>
                            <span className="text-gunmetal-lighter-2 hidden sm:inline">•</span>
                            <span className="text-pewter truncate hidden sm:inline">
                              {track.albumTitle}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions on right */}
                  <div className="flex items-center gap-2 shrink-0">
                    {track.previewUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          audioPreview.toggle(track.id, track.previewUrl)
                        }
                        className={cn(
                          "flex size-11 items-center justify-center rounded-lg border text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                          isPlayingThis
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-white/[0.02] text-pewter hover:bg-white/[0.08] hover:text-white"
                        )}
                        aria-busy={previewLoading || undefined}
                        aria-label={t(previewLoading ? "cancelPreview" : isPlayingThis ? "pausePreview" : previewFailed ? "retryPreview" : "playPreview", { track: track.title })}
                      >
                        {isPlayingThis || previewLoading ? (
                          <PauseIcon aria-hidden="true" className="size-3.5" weight="fill" />
                        ) : (
                          <PlayIcon aria-hidden="true" className="size-3.5" weight="fill" />
                        )}
                      </button>
                    )}

                    <span className="font-sans text-xs tabular-nums text-pewter hidden sm:inline w-12 text-right">
                      {formatDuration(track.duration)}
                    </span>

                    {track.externalUrl && (
                      <a
                        href={track.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-pewter transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        title="Open track on Apple Music"
                      >
                        <ArrowSquareOutIcon className="size-3.5" />
                        <span className="sr-only">Open track on Apple Music</span>
                      </a>
                    )}
                  </div>
                </div>

                {isActive && (previewLoading || previewFailed) && (
                  <p className="ml-9 text-xs text-singer-stone sm:ml-12">
                    {t(previewFailed ? "previewError" : "previewLoading")}
                  </p>
                )}

                {/* Expanded Contributor Note if opened */}
                {isNoteOpen && track.note && (
                  <div className="ml-10 sm:ml-14 border-l border-white/15 pl-3 text-xs text-singer-stone">
                    <span className="text-pewter font-sans text-[11px] block mb-0.5">
                      Note from {track.submittedByName}:
                    </span>
                    <p className="italic">&ldquo;{track.note}&rdquo;</p>
                  </div>
                )}
              </div>
            );
          })}

          {filteredTracks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
              <span className="text-sm font-medium text-singer-stone">No tracks found</span>
              <p className="text-xs text-pewter">
                No songs match &ldquo;{filterQuery}&rdquo;. Try another search term.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
