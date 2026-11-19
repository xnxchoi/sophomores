"use client";

import { cn } from "@/lib/utils";
import { useScroll } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import type { ContentsEntry } from "./long-form";

/** How far below the viewport top a heading counts as the one being read: the anchors' `scroll-mt-header` plus a little. */
const READING_LINE = 120;

/**
 * Contents for a long page. Plain anchors work before hydration; once hydrated, the entry being read
 * is marked as the current location. Passive reading never rewrites the address.
 */
export function ContentsNav({ entries, label }: { entries: ReadonlyArray<ContentsEntry>; label: string }) {
  const [current, setCurrent] = useState<string | null>(null);
  const { scrollY } = useScroll();

  useEffect(() => {
    const update = () => {
      let reading: string | null = null;
      for (const entry of entries) {
        const target = document.getElementById(entry.id);
        if (target && target.getBoundingClientRect().top - READING_LINE <= 0) reading = entry.id;
      }
      // On a page that scrolls, the last entry may never reach the line once the end is reached; it is
      // still the one being read. A page that fits the screen keeps whatever has actually passed the line.
      const page = document.documentElement;
      const scrollable = page.scrollHeight > window.innerHeight + 2;
      if (scrollable && window.innerHeight + window.scrollY >= page.scrollHeight - 2 && entries.length > 0) reading = entries[entries.length - 1]!.id;
      setCurrent(reading);
    };
    update();
    const stop = scrollY.on("change", update);
    // Layout changes (opening the phone contents, fonts, resizing) move targets without scrolling.
    const layout = new ResizeObserver(update);
    layout.observe(document.body);
    window.addEventListener("hashchange", update);
    return () => {
      stop();
      layout.disconnect();
      window.removeEventListener("hashchange", update);
    };
  }, [entries, scrollY]);

  if (entries.length === 0) return null;
  return (
    <>
      <details className="group border-y border-border lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-medium outline-offset-4 focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
          {label}
          <span aria-hidden="true" className="text-lg leading-none text-muted-foreground transition-transform duration-[var(--duration-spring)] ease-[var(--ease-spring)] group-open:rotate-45">+</span>
        </summary>
        {/* Jumping to a section folds the phone contents away, so the text is not pushed down on return. */}
        <nav aria-label={label} className="pb-4" onClick={(event) => { if ((event.target as Element).closest("a")) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
          <ContentsLinks entries={entries} current={current} />
        </nav>
      </details>
      <nav aria-label={label} className="hidden lg:block">
        <h2 className="mb-4 text-xs font-medium tracking-widest text-muted-foreground uppercase">{label}</h2>
        <ContentsLinks entries={entries} current={current} rail />
      </nav>
    </>
  );
}

function ContentsLinks({ entries, current, rail = false }: { entries: ReadonlyArray<ContentsEntry>; current: string | null; rail?: boolean }) {
  // Numbering counts top-level entries only, so nested entries never shift it.
  const numbers = useMemo(() => {
    let count = 0;
    return entries.map((entry) => (entry.depth === 2 ? String(++count).padStart(2, "0") : null));
  }, [entries]);
  return (
    <ol>
      {entries.map((entry, index) => (
        <li key={entry.id}>
          <a
            href={`#${entry.id}`}
            aria-current={current === entry.id ? "location" : undefined}
            className={cn(
              "flex min-h-12 items-start gap-3 py-3 text-sm leading-6 text-muted-foreground underline-offset-4 outline-offset-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:text-foreground hover:underline focus-visible:outline-2 aria-[current=location]:text-foreground",
              rail && "border-l border-border pl-5 hover:border-foreground aria-[current=location]:border-foreground",
              entry.depth === 3 && (rail ? "pl-9" : "pl-6")
            )}
          >
            {numbers[index] && <span aria-hidden="true" className="shrink-0 font-mono text-xs leading-6">{numbers[index]}</span>}
            <span>{entry.label}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
