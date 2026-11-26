"use client";

import { FocusShape } from "@/components/core/FocusShape/FocusShape";
import { GeistMono } from "geist/font/mono";
import { cn } from "@/lib/utils";

/**
 * Their control bar while a book is open (LookInsideControlBar, 06w9:8661-8996): "[ < ]", the spread, "[ > ]" and
 * "[ X ]"; across the width on the home, under the book (left of the details) in the details. Set in Geist Mono (owner,
 * 26 Nov: "The book's page turn bar should use Geist Mono").
 */
export function LookInsideBar({ shown, wide, page, leaves, labels, onBack, onForward, onClose }: { shown: boolean; wide: boolean; page: number; leaves: number;
  labels: { previousPage: string; nextPage: string; closeBook: string }; onBack: () => void; onForward: () => void; onClose: () => void }) {
  const left = Math.max(1, 2 * page - 1), right = Math.min(2 * leaves, 2 * page);
  return <div data-look-inside-bar aria-hidden={!shown} inert={!shown}
    className={cn(GeistMono.className, "fixed bottom-4 left-4 z-30 flex h-9 items-center justify-between text-xs uppercase tracking-[-0.02em] transition-opacity duration-300 pointer-coarse:h-11 max-[900px]:bottom-7 max-[900px]:h-11",
      wide ? "right-4" : "right-[calc(40%+16px)] max-[900px]:right-4", shown ? "opacity-100" : "pointer-events-none opacity-0")}>
    <button type="button" aria-label={labels.previousPage} disabled={page <= 0} onClick={(event) => { event.stopPropagation(); onBack(); }}
      className="group/focus min-h-9 px-2 transition-opacity hover:opacity-70 disabled:opacity-30 pointer-coarse:min-h-11 pointer-coarse:min-w-11 max-[900px]:min-h-11 max-[900px]:min-w-11"><FocusShape>[ &lt; ]</FocusShape></button>
    <span className="tabular-nums">{page <= 0 ? "" : left === right ? left : left + "–" + right}</span>
    <div className="flex items-center gap-2">
      <button type="button" aria-label={labels.nextPage} disabled={page >= leaves} onClick={(event) => { event.stopPropagation(); onForward(); }}
        className="group/focus min-h-9 px-2 transition-opacity hover:opacity-70 disabled:opacity-30 pointer-coarse:min-h-11 pointer-coarse:min-w-11 max-[900px]:min-h-11 max-[900px]:min-w-11"><FocusShape>[ &gt; ]</FocusShape></button>
      <button type="button" aria-label={labels.closeBook} onClick={(event) => { event.stopPropagation(); onClose(); }}
        className="group/focus min-h-9 px-2 transition-opacity hover:opacity-70 pointer-coarse:min-h-11 pointer-coarse:min-w-11 max-[900px]:min-h-11 max-[900px]:min-w-11"><FocusShape>[ X ]</FocusShape></button>
    </div>
  </div>;
}
