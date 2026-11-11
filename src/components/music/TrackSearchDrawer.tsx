"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
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

interface TrackSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  slotIndex: 1 | 2;
  onSelectTrack: (track: MusicTrackView) => Promise<void>;
  isSubmitting?: boolean;
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return "--:--";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function TrackSearchDrawer({
  isOpen,
  onClose,
  slotIndex,
  onSelectTrack,
  isSubmitting = false
}: TrackSearchDrawerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MusicTrackView[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  // In-drawer preview player
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onEnded = () => setPreviewTrackId(null);
    const onError = () => setPreviewTrackId(null);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.pause();
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.src = "";
    };
  }, []);

  const handleClose = () => {
    setQuery("");
    setResults([]);
    setIsLoading(false);
    setSelectedTrackId(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setPreviewTrackId(null);
    }
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

  const togglePreview = (track: MusicTrackView) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (previewTrackId === track.id) {
      audio.pause();
      setPreviewTrackId(null);
      return;
    }

    if (!track.previewUrl) return;

    audio.src = track.previewUrl;
    setPreviewTrackId(track.id);
    audio.play().catch(() => setPreviewTrackId(null));
  };

  const handleSelect = async (track: MusicTrackView) => {
    if (isSubmitting) return;
    setSelectedTrackId(track.id);
    if (audioRef.current) {
      audioRef.current.pause();
      setPreviewTrackId(null);
    }
    await onSelectTrack(track);
    handleClose();
  };

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const displayedResults = hasQuery ? results : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="fixed top-1/2 left-1/2 z-50 flex h-auto max-h-[85vh] w-full max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 p-0 text-white shadow-2xl backdrop-blur-xl">
        <DialogHeader className="border-b border-white/10 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <DialogTitle className="text-base font-medium tracking-tight text-white">
                Nominate track for slot {slotIndex}
              </DialogTitle>
              <p className="text-xs text-neutral-400">
                Search Apple Music catalog by title, artist, or album.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white"
            >
              <XIcon className="size-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Search input field */}
          <div className="relative mt-3">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) setResults([]);
              }}
              placeholder="Search Apple Music..."
              className="h-11 rounded-xl border-white/10 bg-neutral-900/80 pl-9 pr-9 text-sm font-sans text-white placeholder:font-sans placeholder:text-neutral-500 focus-visible:border-white/30"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
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
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-400">
              <Spinner className="size-5 text-white" />
              <span className="text-xs font-mono">Searching Apple Music...</span>
            </div>
          )}

          {!isLoading && displayedResults.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {displayedResults.map((track) => {
                const isSelected = selectedTrackId === track.id;
                const isPlayingThis = previewTrackId === track.id;

                return (
                  <li
                    key={track.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-neutral-900/40 p-2.5 transition-colors hover:border-white/15 hover:bg-neutral-900/80"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Artwork thumbnail with play button overlay */}
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
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
                          <div className="flex size-full items-center justify-center text-neutral-500">
                            <MusicNotesIcon className="size-5" />
                          </div>
                        )}

                        {track.previewUrl && (
                          <button
                            type="button"
                            onClick={() => togglePreview(track)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity hover:opacity-100 focus:opacity-100"
                            title={isPlayingThis ? "Pause preview" : "Play 30s preview"}
                          >
                            {isPlayingThis ? (
                              <PauseIcon className="size-5" weight="fill" />
                            ) : (
                              <PlayIcon className="size-5" weight="fill" />
                            )}
                          </button>
                        )}
                      </div>

                      {/* Track details */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-white truncate">
                          {track.title}
                        </span>
                        <span className="text-xs text-neutral-400 truncate">
                          {track.artist}
                          {track.albumTitle && ` • ${track.albumTitle}`}
                        </span>
                      </div>
                    </div>

                    {/* Right side: Duration & Select Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      {track.previewUrl && (
                        <button
                          type="button"
                          onClick={() => togglePreview(track)}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg border text-xs transition-colors",
                            isPlayingThis
                              ? "border-white bg-white text-black"
                              : "border-white/10 bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08] hover:text-white"
                          )}
                          title={isPlayingThis ? "Pause preview" : "Play preview"}
                        >
                          {isPlayingThis ? (
                            <PauseIcon className="size-4" weight="fill" />
                          ) : (
                            <PlayIcon className="size-4" weight="fill" />
                          )}
                        </button>
                      )}

                      <span className="font-mono text-xs tabular-nums text-neutral-500 hidden sm:inline">
                        {formatDuration(track.duration)}
                      </span>

                      <button
                        type="button"
                        disabled={isSubmitting || isSelected}
                        onClick={() => handleSelect(track)}
                        className={cn(
                          "inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium transition-colors",
                          isSelected
                            ? "bg-neutral-800 text-neutral-300 cursor-default"
                            : "bg-white text-black hover:bg-neutral-200"
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
              <p className="text-xs text-neutral-400 max-w-sm">
                We couldn&apos;t find any matches for &ldquo;{query}&rdquo;. Check spelling or search with artist name.
              </p>
            </div>
          )}

          {!isLoading && !hasQuery && (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <MusicNotesIcon className="size-8 text-neutral-600" />
              <span className="text-sm font-medium text-neutral-300">
                Explore the Apple Music catalog
              </span>
              <p className="text-xs text-neutral-500 max-w-sm">
                Enter a track name or artist to audition previews and select your choice.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
