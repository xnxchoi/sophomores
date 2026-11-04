"use client";

import { TapePlayer } from "src/components/UX/TapePlayer";
import type { ReleaseSummary } from "src/payload/collections/Radio/api/queryAllReleases";
import type { Media } from "src/payload-types";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AmbientBackgroundAuto } from "../Station/AmbientBackground";

/**
 * /radio — the Broadcast hub.
 *
 * Three zones, each ≥100vh, stacked simply:
 *
 *   1. On Air        full-screen player over scroll-linked AmbientBackground
 *   2. The Archive   chronological list of every published release
 *   3. Forthcoming   one line teasing the next drop
 *
 * No 3D parallax — that's reserved for Tape pages (/radio/tapes/vol-NNN).
 * No card grid — the catalog is small and the list reads as a record-label
 * release page, not a streaming hub.
 */
interface BroadcastHubProps {
  releases: ReleaseSummary[];
}

export function BroadcastHub({ releases }: BroadcastHubProps) {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Ambient background — auto-selects R3F vs CSS fallback based on the
          device's perf tier (reduced-motion / RAM / cores / WebGL probe),
          not viewport width. Always present, on every device that can
          render it sensibly. */}
      <Suspense>
        <AmbientBackgroundAuto />
      </Suspense>

      <div className="relative z-2 flex flex-col">
        {/* ── Zone 1: On Air — full-screen player ──────────────────────────── */}
        <section
          aria-labelledby="on-air"
          className="relative flex min-h-[88svh] w-full items-center justify-center px-6 pt-24 pb-14 sm:min-h-[84svh]"
        >
          {/* Eyebrow sits below the floating header chrome (≈ 90px on mobile,
              ≈ 60px on desktop). top-28/sm:top-12 keeps it clear of MENU/H/moon. */}
          <div className="absolute top-28 left-1/2 -translate-x-1/2 sm:top-12">
            <p
              id="on-air"
              className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/50 uppercase xl:text-xs"
            >
              · On Air
            </p>
          </div>

          <TapePlayer variant="full" />
        </section>

        {/* ── Zone 2: The Archive — chronological list ─────────────────────── */}
        <BroadcastArchive releases={releases} />

        {/* ── Zone 3: Forthcoming ──────────────────────────────────────────── */}
        <Forthcoming />
      </div>
    </div>
  );
}

// ── Archive ─────────────────────────────────────────────────────────────────

interface BroadcastArchiveProps {
  releases: ReleaseSummary[];
}

function BroadcastArchive({ releases }: BroadcastArchiveProps) {
  return (
    <section
      aria-labelledby="archive"
      className="relative w-full border-y border-border/15 bg-black/80 pt-20 pb-16 backdrop-blur-[1px] sm:pt-20 xl:py-24"
    >
      <div className="mx-auto w-full max-w-7xl px-6 xl:px-10">
        <header className="mb-8 flex items-end justify-between border-b border-border/30 pb-6 sm:mb-12 sm:pb-8 xl:mb-14">
          <p
            id="archive"
            className="font-sans text-[10px] tracking-[0.2em] text-muted-foreground/65 uppercase xl:text-xs"
          >
            · The Archive
          </p>
          <p className="font-sans text-[10px] text-muted-foreground/60 tabular-nums xl:text-[11px]">
            {String(releases.length).padStart(3, "0")}{" "}
            {releases.length === 1 ? "release" : "releases"}
          </p>
        </header>

        {releases.length === 0 ? (
          <ArchiveEmpty />
        ) : (
          <ol className="divide-y divide-border/15">
            {releases.map((release, i) => (
              <ArchiveRow
                key={release.id}
                release={release}
                index={releases.length - i}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

interface ArchiveRowProps {
  release: ReleaseSummary;
  /** Catalog number — derived from chronological position for now.
      Will switch to a manual `catalogNumber` field once that lands. */
  index: number;
}

function ArchiveRow({ release, index }: ArchiveRowProps) {
  const kindLabel = release.kind === "album" ? "Long-play" : "Curation";
  const cover = release.cover as Media | null;
  const coverUrl =
    cover && typeof cover === "object" && "url" in cover ? cover.url : null;
  const catalogNo = `No. ${String(index).padStart(3, "0")}`;

  return (
    <li>
      <Link
        href={`/radio/${release.slug}`}
        className="group flex items-center gap-4 py-6 transition-colors hover:bg-muted/5 sm:gap-6 sm:py-8 xl:gap-8 xl:py-10"
      >
        {/* Catalog no. — desktop only; mobile shows it inline above the title */}
        <span className="hidden w-12 shrink-0 self-center font-sans text-[11px] text-muted-foreground/40 tabular-nums sm:block xl:w-14">
          {catalogNo}
        </span>

        {/* Cover thumb */}
        <span className="block w-14 shrink-0 sm:w-20 xl:w-24">
          <span className="relative block aspect-square w-full overflow-hidden rounded-sm border border-border/20 bg-muted/20">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                sizes="(max-width: 640px) 56px, (max-width: 1280px) 80px, 96px"
              />
            ) : (
              <span className="flex h-full items-center justify-center font-sans text-2xl text-foreground/[0.15] uppercase">
                {(release.title ?? "—").slice(0, 1)}
              </span>
            )}
          </span>
        </span>

        {/* Content — title, kind/artist eyebrow, meta line */}
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex min-w-0 flex-col gap-0.5 sm:gap-1">
            {/* Catalog no. inline on mobile only */}
            <span className="font-sans text-[10px] text-muted-foreground/40 tabular-nums sm:hidden">
              {catalogNo}
            </span>
            <span className="truncate text-base font-light tracking-tight text-foreground/90 transition-colors group-hover:text-foreground sm:text-lg xl:text-xl 2xl:text-2xl">
              {release.title}
            </span>
            <span className="truncate font-sans text-[10px] tracking-widest text-muted-foreground/50 uppercase xl:text-[11px]">
              {kindLabel}
              {release.artist && (
                <>
                  <Sep />
                  {release.artist}
                </>
              )}
            </span>
          </div>

          {/* Date · runtime · count — wraps gracefully at narrow widths */}
          <span className="flex shrink-0 flex-wrap items-baseline gap-x-2 font-sans text-[10px] text-muted-foreground/50 tabular-nums sm:flex-col sm:items-end sm:gap-1 xl:flex-row xl:items-baseline xl:gap-3 xl:text-[11px]">
            <ReleaseDate date={release.releaseDate} />
            <span className="hidden xl:inline">
              <Sep />
            </span>
            <span>
              <Runtime seconds={release.runtimeSec} />
            </span>
            <span className="hidden xl:inline">
              <Sep />
            </span>
            <span>
              {release.trackCount}{" "}
              {release.trackCount === 1 ? "track" : "tracks"}
            </span>
          </span>
        </div>
      </Link>
    </li>
  );
}

function ArchiveEmpty() {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <span className="mb-4 font-sans text-5xl text-foreground/20">○</span>
      <p className="text-base font-light text-foreground/85">
        Nothing in rotation yet.
      </p>
      <p className="mt-1.5 max-w-xs font-sans text-[11px] text-muted-foreground/65">
        The first volume drops soon.
      </p>
    </div>
  );
}

// ── Forthcoming ─────────────────────────────────────────────────────────────

function Forthcoming() {
  return (
    <section
      aria-labelledby="forthcoming"
      className="relative w-full border-t border-border/30 bg-black/80 py-14 backdrop-blur-[1px] xl:py-20"
    >
      <div className="mx-auto w-full max-w-7xl px-6 xl:px-10">
        <p
          id="forthcoming"
          className="mb-6 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/65 uppercase xl:text-xs"
        >
          · Forthcoming
        </p>
        {/* TODO(forthcoming-cms): pull from a Payload global once the
            Brevo dispatch capture lands (Phase 2 step 9). For now this
            slot stays inert so /radio still ships. */}
        <p className="max-w-prose text-lg font-light text-foreground/85 xl:text-xl">
          Untitled · Spring 2026
        </p>
        <p className="mt-3 font-sans text-[11px] text-muted-foreground/65 xl:text-xs">
          Sign up for the dispatch{" "}
          <span className="text-muted-foreground/50">→</span>
          <span className="ml-2 text-muted-foreground/50">[coming soon]</span>
        </p>
      </div>
    </section>
  );
}

// ── Atoms ───────────────────────────────────────────────────────────────────

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
