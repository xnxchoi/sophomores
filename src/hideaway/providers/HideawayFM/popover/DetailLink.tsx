"use client";

/**
 * Entity drill-down link rendered inside `TrackTitlePopover`.
 *
 * Routing note:
 * The Hideaway does not yet expose dedicated `/albums/:slug`,
 * `/tracks/:slug`, or `/artists/:slug` routes (see `src/app/(frontend)/
 * (site)/(content)/` — only essays/surf/lists/users/etc. exist today).
 * Rather than render a dead 404 link, we route every kind to
 * `/search?q=<name>`, which mirrors how `CommandKey/SearchBar.tsx`
 * already navigates. When the real entity routes land, swap the
 * `href` per kind and delete the `disabled` escape hatch.
 */

import { Link } from "@/hideaway/components/core/Link/Link";

import { cn } from "@/lib/utils";

export type DetailLinkKind = "artist" | "album" | "track";

export interface DetailEntity {
  id: string;
  name: string;
  slug?: string;
}

export interface DetailLinkProps {
  kind: DetailLinkKind;
  entity: DetailEntity;
  disabled?: boolean;
}

const COPY: Record<DetailLinkKind, string> = {
  artist: "More on this artist →",
  album: "More from this album →",
  track: "More on this track →"
};

const LABEL_CLASSES =
  "font-sans text-[11px] uppercase tracking-widest transition-colors";

export function DetailLink({ kind, entity, disabled }: DetailLinkProps) {
  const label = COPY[kind];

  if (disabled || !entity.name) {
    return (
      <span
        className={cn(LABEL_CLASSES, "text-muted-foreground/40")}
        aria-disabled="true"
      >
        {label}
      </span>
    );
  }

  const href = `/search?q=${encodeURIComponent(entity.name)}`;

  return (
    <Link
      href={href}
      className={cn(
        LABEL_CLASSES,
        "text-foreground/70 hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
      )}
    >
      {label}
    </Link>
  );
}
