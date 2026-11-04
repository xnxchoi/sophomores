"use client";

import { cn } from "src/lib/utils";
import type { Release as ReleaseType } from "src/payload/collections/Radio/api/queryReleaseBySlug";
import type { Media, Track } from "src/payload-types";
import Image from "next/image";

/**
 * Release detail composition — works for both Albums and Playlists.
 *
 * Editorial-grade by default. The catalog is intentionally small (one
 * release a year, at most one a quarter), so every release page is
 * given the full editorial treatment rather than a streaming-grid card.
 *
 * Layout:
 *   - Eyebrow: "· Hideaway FM / Long-play | Curation / No. NN"
 *   - Cover (1:1) on the left, metadata column on the right
 *   - Listen / Shuffle action row
 *   - Tracklist as typographic table (#, title, artist, runtime)
 *   - Description as a single prose column
 *   - Tags
 *   - "Read the Tape →" link (if a Tape exists for this release)
 *   - Adjacent — 3 related releases (TODO when archive populates)
 *   - Colophon footer
 *
 * MISSING SCHEMA FIELDS (TODOs flagged inline):
 *   - catalogNumber (manual integer, drives "No. NN")
 *   - colophon.recordedAt / mixedBy / masteredBy / masteredAt / edition
 *   - artist as a relationship (currently text-only on Albums/Tracks)
 *   - sideA / sideB grouping on tracklist
 *   - link to optional Tape page
 */

interface ReleaseProps {
  release: ReleaseType;
}

export function Release({ release }: ReleaseProps) {
  const isAlbum = release.kind === "album";
  const eyebrowKind = isAlbum ? "Long-play" : "Curation";
  const cover = release.data.cover;
  const coverUrl =
    typeof cover === "object" && cover && "url" in cover ? cover.url : null;
  const coverAlt =
    typeof cover === "object" && cover && "alt" in cover
      ? (cover as Media).alt
      : (release.data.title ?? "");

  const totalRuntimeSec = release.tracks.reduce(
    (acc, t) => acc + (t.duration ?? 0),
    0
  );
  const releaseDate = isAlbum
    ? ((release.data as { release_date?: string | null }).release_date ??
      release.data.publishedAt)
    : release.data.publishedAt;

  return (
    <article className="relative w-full">
      {/* ── Hero band ─────────────────────────────────────────────────────── */}
      <header className="border-b border-border/20 pt-24 pb-16 xl:pt-32 xl:pb-20">
        <div className="mx-auto max-w-7xl px-6 xl:px-10">
          {/* Eyebrow */}
          <p className="mb-10 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase xl:text-xs">
            <span aria-hidden="true">· </span>
            Hideaway FM
            <span className="mx-2 text-muted-foreground/30">/</span>
            {eyebrowKind}
            {/* TODO(catalog-number): when `catalogNumber` is added to the
                Albums/Playlists schema, render `/ No. NN` here. */}
          </p>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12 xl:gap-16">
            {/* Cover — 5/12 columns at lg+ */}
            <div className="lg:col-span-5">
              <div className="relative aspect-square w-full overflow-hidden rounded-sm border border-border/20 bg-muted/20">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={coverAlt ?? ""}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center font-sans text-[20vw] leading-none text-foreground/[0.04] uppercase lg:text-[10vw]">
                    {(release.data.title ?? "—").slice(0, 1)}
                  </div>
                )}
              </div>
            </div>

            {/* Metadata column — 7/12 */}
            <div className="lg:col-span-7 lg:pt-2">
              <h1 className="text-3xl font-light tracking-tight sm:text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl">
                {release.data.title}
              </h1>

              {/* Artist */}
              {isAlbum && (
                <p className="mt-6 text-lg text-foreground/80 xl:text-xl">
                  {/* TODO(artist-relation): when `artist` becomes a relationship
                      on Albums, render as a Link to /radio/artists/[slug]. */}
                  {(release.data as { artist?: string }).artist}
                </p>
              )}

              {/* Factual line — date · runtime · count */}
              <p className="mt-4 font-sans text-[11px] text-muted-foreground/60 xl:text-xs">
                <ReleaseDate date={releaseDate} />
                <Sep />
                <Runtime seconds={totalRuntimeSec} />
                <Sep />
                {release.tracks.length}{" "}
                {release.tracks.length === 1 ? "track" : "tracks"}
              </p>

              {/* Action row — Listen / Shuffle. Wires into HideawayFM later. */}
              <div className="mt-10 flex items-center gap-3">
                <ActionPill primary>Play</ActionPill>
                <ActionPill>Shuffle</ActionPill>
                {/* TODO(tape-link): if a Tape exists for this release, render
                    "Read the Tape →" as a quiet text link here. */}
              </div>

              {/* Description */}
              {release.data.description && (
                <p className="mt-12 max-w-prose font-sans text-[12px] leading-relaxed text-foreground/80 xl:text-[13px]">
                  {release.data.description}
                </p>
              )}

              {/* Tags */}
              {Array.isArray(release.data.tagged) &&
                release.data.tagged.length > 0 && (
                  <div className="mt-8 flex flex-wrap gap-x-3 gap-y-1">
                    {release.data.tagged.map((t) => {
                      const tag =
                        typeof t === "object" && t !== null ? t : null;
                      if (!tag) return null;
                      return (
                        <span
                          key={tag.id}
                          className="font-sans text-[10px] tracking-widest text-muted-foreground/50 uppercase xl:text-[11px]"
                        >
                          · {tag.title ?? tag.id}
                        </span>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Tracklist ─────────────────────────────────────────────────────── */}
      <section className="border-b border-border/20 py-20 xl:py-24">
        <div className="mx-auto max-w-7xl px-6 xl:px-10">
          <p className="mb-10 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/50 uppercase xl:text-xs">
            · Tracklist
          </p>
          {/* TODO(side-A-B): once Albums carry a sideA/sideB grouping,
              split the tracklist into two columns (A on left, B on right)
              styled as a J-card. */}
          <Tracklist tracks={release.tracks} />
        </div>
      </section>

      {/* ── Adjacent ──────────────────────────────────────────────────────── */}
      {/* TODO(adjacent): when the archive holds 4+ releases, render
          three sibling release links here (chronologically near). */}

      {/* ── Colophon ──────────────────────────────────────────────────────── */}
      <footer className="py-16 xl:py-20">
        <div className="mx-auto max-w-7xl px-6 xl:px-10">
          <p className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/40 uppercase xl:text-[11px]">
            {/* TODO(colophon): wire to colophon.{recordedAt, mixedBy,
                masteredBy, masteredAt, edition} once those fields land
                on Albums/Playlists. */}
            End of broadcast.
          </p>
        </div>
      </footer>
    </article>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Sep() {
  return <span className="mx-2 text-muted-foreground/30">·</span>;
}

function ReleaseDate({ date }: { date?: string | null }) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return (
    <time dateTime={d.toISOString()}>
      {d.getFullYear()}.{String(d.getMonth() + 1).padStart(2, "0")}.
      {String(d.getDate()).padStart(2, "0")}
    </time>
  );
}

function Runtime({ seconds }: { seconds: number }) {
  if (!seconds) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return (
    <span>
      {mins}′{String(secs).padStart(2, "0")}″
    </span>
  );
}

interface ActionPillProps {
  children: React.ReactNode;
  primary?: boolean;
  onClick?: () => void;
}

function ActionPill({ children, primary, onClick }: ActionPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "border px-5 py-2.5 font-sans text-[11px] tracking-widest uppercase transition-colors",
        primary
          ? "border-foreground/60 text-foreground hover:bg-foreground hover:text-background"
          : "border-border/40 text-foreground/60 hover:border-border hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

interface TracklistProps {
  tracks: Track[];
}

function Tracklist({ tracks }: TracklistProps) {
  if (tracks.length === 0) {
    return (
      <p className="font-sans text-[11px] text-muted-foreground/40 xl:text-xs">
        No tracks yet.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-border/15">
      {tracks.map((track, i) => (
        <TrackRow key={track.id} track={track} index={i} />
      ))}
    </ol>
  );
}

interface TrackRowProps {
  track: Track;
  index: number;
}

function TrackRow({ track, index }: TrackRowProps) {
  const number = track.track_number ?? index + 1;
  return (
    <li className="group flex items-baseline gap-4 py-4 transition-colors hover:bg-muted/5 xl:gap-6">
      <span className="w-8 shrink-0 font-sans text-[10px] text-muted-foreground/40 xl:text-[11px]">
        {String(number).padStart(2, "0")}
      </span>
      <span className="flex-1 truncate text-sm font-medium tracking-tight text-foreground/90 xl:text-base">
        {track.title}
      </span>
      <span className="hidden flex-1 truncate font-sans text-[11px] text-muted-foreground/50 sm:block xl:text-xs">
        {track.artist}
      </span>
      <span className="shrink-0 font-sans text-[11px] text-muted-foreground/60 tabular-nums xl:text-xs">
        <Runtime seconds={track.duration ?? 0} />
      </span>
    </li>
  );
}
