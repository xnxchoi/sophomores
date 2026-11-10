"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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
  if (!ms || ms <= 0) return "--:--";
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
    <section className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60 p-6 backdrop-blur-md md:p-8">
      {/* Subtle top edge highlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />

      <div className="flex flex-col gap-6">
        {/* Header row with search filter */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-base font-medium text-white">Full setlist</h2>
            <p className="text-xs text-neutral-400">
              {tracks.length} tracks assembled for the room. Click to audition 30-second previews.
            </p>
          </div>

          {/* Quick filter input */}
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter setlist..."
              className="h-10 w-full rounded-xl border border-white/10 bg-neutral-950/60 pl-8 pr-8 text-xs text-white placeholder:text-neutral-500 focus-visible:outline-none focus-visible:border-white/30"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
              >
                <XIcon className="size-3.5" />
                <span className="sr-only">Clear filter</span>
              </button>
            )}
          </div>
        </div>

        {/* Tracks Table */}
        <div className="divide-y divide-white/[0.06] rounded-xl border border-white/10 bg-neutral-950/40">
          {filteredTracks.map((track, idx) => {
            const isPlayingThis =
              audioPreview.activeId === track.id && audioPreview.isPlaying;
            const isContributed = !!track.submittedByName;
            const hasNote = !!track.note;
            const isNoteOpen = activeNoteTrackId === track.id;

            return (
              <div
                key={track.id || `${track.title}-${idx}`}
                className={cn(
                  "group flex flex-col gap-2 p-3 transition-colors hover:bg-white/[0.03] md:p-3.5",
                  isPlayingThis && "bg-white/[0.04]"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Track sequence number */}
                    <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-neutral-500">
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Artwork + Play button */}
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-neutral-800 border border-white/10">
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
                        <div className="flex size-full items-center justify-center text-neutral-500">
                          <MusicNotesIcon className="size-4" />
                        </div>
                      )}

                      {track.previewUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            audioPreview.toggle(track.id, track.previewUrl)
                          }
                          className={cn(
                            "absolute inset-0 flex items-center justify-center bg-black/40 text-white transition-opacity",
                            isPlayingThis
                              ? "opacity-100 bg-black/60"
                              : "opacity-0 group-hover:opacity-100 focus:opacity-100"
                          )}
                          title={isPlayingThis ? "Pause preview" : "Play 30s preview"}
                        >
                          {isPlayingThis ? (
                            <PauseIcon className="size-4" weight="fill" />
                          ) : (
                            <PlayIcon className="size-4" weight="fill" />
                          )}
                        </button>
                      )}
                    </div>

                    {/* Track info & Contributor badge */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium truncate",
                            isPlayingThis ? "text-white" : "text-neutral-200"
                          )}
                        >
                          {track.title}
                        </span>

                        {isContributed ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] font-mono text-neutral-300">
                            <span>Added by {track.submittedByName}</span>
                            {hasNote && (
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveNoteTrackId(isNoteOpen ? null : track.id)
                                }
                                title="View note"
                                className="text-neutral-400 hover:text-white ml-0.5"
                              >
                                <ChatCircleTextIcon className="size-3" />
                              </button>
                            )}
                          </span>
                        ) : (
                          <span className="hidden sm:inline font-mono text-[10px] text-neutral-500">
                            Curated by {curatorName}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        <span className="truncate">{track.artist}</span>
                        {track.albumTitle && (
                          <>
                            <span className="text-neutral-600 hidden sm:inline">•</span>
                            <span className="text-neutral-500 truncate hidden sm:inline">
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
                          "flex size-8 items-center justify-center rounded-lg border text-xs transition-colors",
                          isPlayingThis
                            ? "border-white bg-white text-black"
                            : "border-white/10 bg-white/[0.02] text-neutral-400 hover:bg-white/[0.08] hover:text-white"
                        )}
                        title={isPlayingThis ? "Pause preview" : "Play preview"}
                      >
                        {isPlayingThis ? (
                          <PauseIcon className="size-3.5" weight="fill" />
                        ) : (
                          <PlayIcon className="size-3.5" weight="fill" />
                        )}
                      </button>
                    )}

                    <span className="font-mono text-xs tabular-nums text-neutral-500 hidden sm:inline w-12 text-right">
                      {formatDuration(track.duration)}
                    </span>

                    {track.externalUrl && (
                      <a
                        href={track.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                        title="Open track on Apple Music"
                      >
                        <ArrowSquareOutIcon className="size-3.5" />
                        <span className="sr-only">Open track on Apple Music</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Expanded Contributor Note if opened */}
                {isNoteOpen && track.note && (
                  <div className="ml-10 sm:ml-14 rounded-lg border border-white/10 bg-neutral-900/80 p-2.5 text-xs text-neutral-300">
                    <span className="text-neutral-400 font-mono text-[11px] block mb-0.5">
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
              <span className="text-sm font-medium text-neutral-300">No tracks found</span>
              <p className="text-xs text-neutral-500">
                No songs match &ldquo;{filterQuery}&rdquo;. Try another search term.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
