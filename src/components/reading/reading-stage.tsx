"use client";

import type { ReactNode } from "react";
import { TrackPlayer } from "@/components/radio/track-player";
import { ReadingChrome } from "@/components/shell/reading-chrome";
import { TickerCrown } from "@/components/shell/ticker/TickerCrown";
import { Starliner } from "@/components/sections/starliner";
import type { ReadingSurface } from "@/lib/content/reading-surface";

/**
 * The reading pages' shared shell: header actions, the track and the closing sections. `/essays` puts the
 * archive inside it and `/essays/[slug]` the one essay (The Hideaway: essays/page.tsx, essays/[slug]/page.tsx).
 * The essays layout owns the reading type and shade.
 */
export function ReadingStage({ surface, children }: { surface: ReadingSurface; children: ReactNode }) {
  const { posts, track, notifications, memberId } = surface;
  return (
    <main className="min-h-screen bg-off-bg pt-[76px] text-faded-fg">
      {/* The site frame mounts the one header; this hands it the posts for Search and the inbox its rows. */}
      <ReadingChrome posts={posts} notifications={notifications} userId={memberId} />
      {children}
      {track ? <TrackPlayer track={track} /> : null}
      <Starliner />
      <TickerCrown />
    </main>
  );
}
