"use client";

import { ArrowUpRightIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";

/**
 * One ruled format row (stripe.press's Hardcover / E-book / Audiobook rows); a row with a URL opens it in a new tab. A
 * row's effect (stripe.press's Ebook hologram and Audiobook radio on hover) isn't wired to the shop's scene yet.
 */
export function FormatRow({ label, note, url }: { label: string; note?: string | null; url?: string | null; effect?: "none" | "hologram" | "radio" | null }) {
  const content: ReactNode = <>
    <span className="min-w-0 [overflow-wrap:anywhere]">{label}</span>
    <span className="flex shrink-0 items-center gap-2 text-muted-foreground tabular-nums">{note}{url && <ArrowUpRightIcon aria-hidden="true" className="size-3.5" />}</span>
  </>;
  return <li className="border-b border-dotted border-foreground/40">
    {url
      ? <a href={url} target="_blank" rel="noreferrer" className="group/focus flex min-h-10 items-center justify-between gap-4 text-[13px] leading-5 transition-colors hover:text-muted-foreground pointer-coarse:min-h-11"><FocusShape className="flex min-w-0 flex-1 items-center justify-between gap-[inherit]">{content}</FocusShape></a>
      : <div className="flex min-h-10 items-center justify-between gap-4 text-[13px] leading-5 pointer-coarse:min-h-11">{content}</div>}
  </li>;
}
