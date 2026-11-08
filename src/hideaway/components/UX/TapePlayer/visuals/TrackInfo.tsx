"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

import { cn } from "@/lib/utils";
import { TrackTitlePopover } from "@/hideaway/providers/HideawayFM/popover/TrackTitlePopover";
import { useNowPlaying } from "@/hideaway/providers/HideawayFM/hooks";
import type { RP_Track } from "@/hideaway/providers/HideawayFM/types";

type TrackInfoProps = {
  /** "hero" for large display, "compact" for single/two line */
  size?: "hero" | "full" | "compact";
  className?: string;
};

/**
 * Track metadata display — artist, title, album.
 * Adapts presentation based on size variant.
 * Animates on track change via AnimatePresence.
 *
 * Each title is an interactive popover trigger: clicking the artist,
 * album, or track text opens a floating popover with a drill-down link.
 * Triggers are inline `<button>` elements wrapping the visible text —
 * typography stays on the caller side (see `TrackTitlePopover`).
 */
export const TrackInfo = ({ size = "full", className }: TrackInfoProps) => {
  const { track } = useNowPlaying();

  if (!track) return null;

  if (size === "compact") {
    return <CompactInfo key={track.id} track={track} className={className} />;
  }

  if (size === "hero") {
    return <HeroInfo key={track.id} track={track} className={className} />;
  }

  return <FullInfo key={track.id} track={track} className={className} />;
};

type InfoProps = {
  track: RP_Track;
  className?: string;
};

/**
 * Entity builders — `TrackTitlePopover` accepts `{ id, name, slug?, cover? }`.
 * The artist entity has no independent id in the current schema, so we
 * seed it with the track id; once an `Artists` collection exists the
 * builder is the only place that needs to change.
 */
const artistEntity = (track: RP_Track) => ({
  id: track.id,
  name: track.artist
});

const albumEntity = (track: RP_Track) => ({
  id: track.albumId ?? track.id,
  name: track.album,
  slug: track.albumSlug,
  cover: track.cover
});

const trackEntity = (track: RP_Track) => ({
  id: track.id,
  name: track.title,
  slug: track.slug,
  cover: track.cover
});

const FullInfo = ({ track, className }: InfoProps) => (
  <AnimatePresence mode="wait">
    <m.div
      key={`${track.artist}-${track.title}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "flex flex-col items-center gap-0.5 text-center",
        className
      )}
    >
      <TrackTitlePopover
        kind="artist"
        entity={artistEntity(track)}
        className="text-faded-fg font-sans text-xs font-medium tracking-widest uppercase"
      >
        {track.artist}
      </TrackTitlePopover>
      <TrackTitlePopover
        kind="track"
        entity={trackEntity(track)}
        className="font-serif text-base leading-tight font-bold italic"
      >
        {track.title}
      </TrackTitlePopover>
      {track.album ? (
        <TrackTitlePopover
          kind="album"
          entity={albumEntity(track)}
          className="text-faded-fg/60 font-sans text-[0.65rem] tracking-wide"
        >
          {track.album}
        </TrackTitlePopover>
      ) : null}
    </m.div>
  </AnimatePresence>
);

const HeroInfo = ({ track, className }: InfoProps) => (
  <AnimatePresence mode="wait">
    <m.div
      key={`${track.artist}-${track.title}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={cn("flex flex-col items-center gap-1 text-center", className)}
    >
      <TrackTitlePopover
        kind="artist"
        entity={artistEntity(track)}
        className="text-faded-fg font-sans text-sm font-medium tracking-[0.2em] uppercase"
      >
        {track.artist}
      </TrackTitlePopover>
      <TrackTitlePopover
        kind="track"
        entity={trackEntity(track)}
        className="font-serif text-3xl leading-tight font-bold italic min-sm:text-4xl"
      >
        {track.title}
      </TrackTitlePopover>
      {track.album ? (
        <TrackTitlePopover
          kind="album"
          entity={albumEntity(track)}
          className="text-faded-fg/50 font-sans text-xs tracking-wide"
        >
          {track.album}
        </TrackTitlePopover>
      ) : null}
    </m.div>
  </AnimatePresence>
);

const CompactInfo = ({ track, className }: InfoProps) => (
  <AnimatePresence mode="wait">
    <m.div
      key={`${track.artist}-${track.title}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex min-w-0 items-center gap-1.5 truncate text-sm",
        className
      )}
    >
      <TrackTitlePopover
        kind="artist"
        entity={artistEntity(track)}
        className="text-faded-fg truncate font-sans text-xs font-medium"
      >
        {track.artist}
      </TrackTitlePopover>
      <span className="text-faded-fg/30">·</span>
      <TrackTitlePopover
        kind="track"
        entity={trackEntity(track)}
        className="truncate font-serif text-sm font-semibold italic"
      >
        {track.title}
      </TrackTitlePopover>
    </m.div>
  </AnimatePresence>
);
