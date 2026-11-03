"use client";

import type { BookmarkKind } from "@/lib/content/slots";

export function BookmarkButton({
  kind,
  id,
  saved = false,
  onToggle
}: {
  kind: BookmarkKind;
  id: string;
  saved?: boolean;
  onToggle?: (next: { kind: BookmarkKind; id: string; saved: boolean }) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      className="rounded-md border border-white/25 px-3 py-2 text-xs uppercase tracking-[0.18em]"
      onClick={() => onToggle?.({ kind, id, saved: !saved })}
    >
      {saved ? "Saved" : "Save"}
    </button>
  );
}
