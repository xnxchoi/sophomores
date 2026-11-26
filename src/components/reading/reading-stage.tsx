"use client";

import type { ReactNode } from "react";
import { ReadingChrome } from "@/components/shell/reading-chrome";
import type { ReadingSurface } from "@/lib/content/reading-surface";

/**
 * The reading pages' shared shell: header actions. `/essays` puts the
 * archive inside it and `/essays/[slug]` the one essay (The Hideaway: essays/page.tsx, essays/[slug]/page.tsx).
 * The essays layout owns the reading type and shade.
 */
export function ReadingStage({ surface, children }: { surface: ReadingSurface; children: ReactNode }) {
  const { posts, notifications, memberId } = surface;
  return (
    <main className="min-h-screen bg-background pt-[76px] text-foreground">
      {/* The site frame mounts the one header; this hands it the posts for Search and the inbox its rows. */}
      <ReadingChrome posts={posts} notifications={notifications} userId={memberId} />
      {children}
    </main>
  );
}
