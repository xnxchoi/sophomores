"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useAudioPreview } from "./use-audio-preview";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  CheckIcon,
  MagnifyingGlassIcon,
  MusicNotesIcon,
  PauseIcon,
  PlayIcon,
  XIcon
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { MusicTrackView } from "@/lib/music/types";
import { Button } from "@/components/core/ArcFocus/ArcFocus";

interface TrackSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  position: number;
  onSelectTrack: (track: MusicTrackView) => Promise<void>;
  isSubmitting?: boolean;
}

function formatDuration(ms?: number): string {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function TrackSearchDrawer({
  isOpen,
  onClose,
  position,
  onSelectTrack,
  isSubmitting = false
}: TrackSearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicTrackView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  const t = useTranslations("Interface.radio");
  const audioPreview = useAudioPreview();

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setIsLoading(false);
    setSelectedTrackId(null);
    audioPreview.pause();
    onClose();
  };

  // Debounced catalog search
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/music/apple/search?q=${encodeURIComponent(trimmed)}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.tracks || []);
        } else {
          setResults([]);
        }
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (track: MusicTrackView) => {
    if (isSubmitting) return;
    setSelectedTrackId(track.id);
    audioPreview.pause();
    await onSelectTrack(track);
    handleClose();
  };

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const displayedResults = hasQuery ? results : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="fixed top-1/2 left-1/2 z-50 flex h-auto max-h-[85vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-carbon-deep p-0 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base font-medium tracking-tight text-white">
                Nominate track for entry {position}
              </DialogTitle>
              <p className="text-xs text-pewter">
                Search Apple Music catalog by title, artist, or album.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-pewter transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Search input field */}
          <div className="relative mt-3">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pewter" />
            <Input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) setResults([]);
              }}
              placeholder="Search Apple Music..."
              className="h-11 rounded-xl border-white/10 bg-carbon/80 pl-9 pr-9 text-sm font-sans text-white placeholder:font-sans placeholder:text-pewter focus-visible:border-white/30"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pewter hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <XIcon className="size-4" />
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-4 min-h-[300px]">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-pewter">
              <Spinner className="size-5 text-white" />
              <span className="text-xs font-sans">Searching Apple Music...</span>
            </div>
          )}

          {!isLoading && displayedResults.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {displayedResults.map((track) => {
                const isSelected = selectedTrackId === track.id;
                const isActive = audioPreview.activeId === track.id;
                const isPlayingThis = isActive && audioPreview.isPlaying;
                const previewLoading = isActive && audioPreview.status === "loading";
                const previewFailed = isActive && audioPreview.status === "error";

                return (
                  <li
                    key={track.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-carbon/40 p-2.5 transition-colors hover:border-white/15 hover:bg-carbon/80"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Artwork thumbnail with play button overlay */}
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-gunmetal">
                        {track.coverUrl ? (
                          <Image
                            src={track.coverUrl}
                            alt={track.title}
                            width={48}
                            height={48}
                            unoptimized
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-pewter">
                            <MusicNotesIcon className="size-5" />
                          </div>
                        )}


                      </div>

                      {/* Track details */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate">
                          {track.title}
                        </span>
                        <span className="text-xs text-pewter truncate">
                          {track.artist}
                          {track.albumTitle && ` • ${track.albumTitle}`}
                        </span>
                        {isActive && (previewLoading || previewFailed) && (
                          <p role="status" className="text-xs text-singer-stone">
                            {t(previewFailed ? "previewError" : "previewLoading")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right side: Duration & Select Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {track.previewUrl && (
                        <Button
                          type="button"
                          variant={isPlayingThis ? "primary" : "secondary"}
                          onClick={() => audioPreview.toggle(track.id, track.previewUrl)}
                          className="size-11 shrink-0"
                          aria-busy={previewLoading || undefined}
                          aria-label={t(previewLoading ? "cancelPreview" : isPlayingThis ? "pausePreview" : previewFailed ? "retryPreview" : "playPreview", { track: track.title })}
                        >
                          {isPlayingThis || previewLoading ? (
                            <PauseIcon aria-hidden="true" className="size-4" weight="fill" />
                          ) : (
                            <PlayIcon aria-hidden="true" className="size-4" weight="fill" />
                          )}
                        </Button>
                      )}

                      <span className="font-sans text-xs tabular-nums text-pewter hidden sm:inline">
                        {formatDuration(track.duration)}
                      </span>

                      <button
                        type="button"
                        disabled={isSubmitting || isSelected}
                        onClick={() => handleSelect(track)}
                        className={cn(
                          "inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                          isSelected
                            ? "bg-gunmetal text-singer-stone"
                            : "bg-white text-black hover:bg-titanium"
                        )}
                      >
                        {isSelected ? (
                          <span className="flex items-center gap-1">
                            <CheckIcon className="size-3.5" />
                            Added
                          </span>
                        ) : (
                          "Nominate"
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {!isLoading && hasQuery && displayedResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <span className="text-sm font-medium text-white">No tracks found</span>
              <p className="text-xs text-pewter max-w-sm">
                We couldn&apos;t find any matches for &ldquo;{query}&rdquo;. Check spelling or search with artist name.
              </p>
            </div>
          )}

          {!isLoading && !hasQuery && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <MusicNotesIcon className="size-8 text-gunmetal-lighter-2" />
              <span className="text-sm font-medium text-singer-stone">
                Explore the Apple Music catalog
              </span>
              <p className="text-xs text-pewter max-w-sm">
                Enter a track name or artist to audition previews and select your choice.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
