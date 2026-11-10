"use client";
import { useTranslations } from "next-intl";


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
  const t = useTranslations('Customer.components_reading_bookmark_button');
  return (
    <m.button
      type="button"
      aria-pressed={saved}
      className="port-control border border-[oklch(from_var(--port-shade)_l_c_h_/_0.4)] bg-[oklch(from_var(--port-shade)_l_c_h_/_0.08)] text-[oklch(from_var(--port-shade)_l_c_h_/_0.9)] hover:border-[oklch(from_var(--port-shade)_l_c_h_/_0.7)] hover:bg-[oklch(from_var(--port-shade)_l_c_h_/_0.14)] disabled:opacity-40 rounded-md px-3 py-2 text-xs uppercase tracking-[0.18em]"
      onClick={() => onToggle?.({ kind, id, saved: !saved })}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", bounce: 0.4 }}
    >
      {saved ? t('saved') : t('save')}
    </m.button>
  );
}
