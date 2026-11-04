"use client";

import type { BookmarkKind } from "@/lib/content/slots";
import * as m from "motion/react-m";

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
    <m.button
      type="button"
      aria-pressed={saved}
      className="port-control rounded-md px-3 py-2 text-xs uppercase tracking-[0.18em]"
      onClick={() => onToggle?.({ kind, id, saved: !saved })}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", bounce: 0.4 }}
    >
      {saved ? "Saved" : "Save"}
    </m.button>
  );
}
