"use client";

import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import type { ContentsEntry } from "./long-form";

/**
 * The entry being read, ported from The Hideaway's table of contents (components/UX/TableOfContents/
 * useActiveSection.ts; src/hideaway is reference-only, so it lives here with its one user): an
 * IntersectionObserver marks the first section past the header, seeded from the URL hash.
 */
function useActiveSection(ids: string[], topOffset = 96): string | null {
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash.slice(1);
    return ids.includes(hash) ? hash : null;
  });
  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // The first visible section in document order; between sections, keep the last one.
        const next = ids.find((id) => visible.has(id)) ?? null;
        if (next !== null) setActiveId((previous) => (previous === next ? previous : next));
      },
      { rootMargin: `-${topOffset}px 0px -60% 0px`, threshold: [0, 0.1, 0.5, 1] }
    );
    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [ids, topOffset]);
  return activeId;
}

/**
 * Contents for a long page, as The Hideaway's table of contents does it (components/UX/TableOfContents):
 * plain anchors, with the entry being read found by an IntersectionObserver (useActiveSection, below) and the
 * smooth scroll left to Lenis. Works before hydration; passive reading never rewrites the address.
 */
export function ContentsNav({ entries, label }: { entries: ReadonlyArray<ContentsEntry>; label: string }) {
  const ids = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const current = useActiveSection(ids);

  if (entries.length === 0) return null;
  return (
    <>
      <details className="group border-y border-border lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm outline-offset-4 focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
          {label}
          <span aria-hidden="true" className="text-lg leading-none text-muted-foreground transition-transform duration-[var(--duration-spring)] ease-[var(--ease-spring)] group-open:rotate-45">+</span>
        </summary>
        {/* Jumping to a section folds the phone contents away, so the text is not pushed down on return. */}
        <nav aria-label={label} className="pb-4" onClick={(event) => { if ((event.target as Element).closest("a")) event.currentTarget.closest("details")?.removeAttribute("open"); }}>
          <ContentsLinks entries={entries} current={current} />
        </nav>
      </details>
      <nav aria-label={label} className="hidden lg:block">
        <h2 className="mb-4 text-xs tracking-widest text-muted-foreground uppercase">{label}</h2>
        <ContentsLinks entries={entries} current={current} rail />
      </nav>
    </>
  );
}

function ContentsLinks({ entries, current, rail = false }: { entries: ReadonlyArray<ContentsEntry>; current: string | null; rail?: boolean }) {
  // Top-level entries count 01, 02…; a nested entry takes its parent's number plus its own (02.1), so nesting
  // never shifts the top-level count. Nested entries before the first real top-level entry have no parent, so
  // each is listed as a top-level entry (01, 02, never 00.1 or 01.1).
  const rows = useMemo(() => {
    let top = 0;
    let sub = 0;
    let parent = false;
    return entries.map((entry) => {
      if (entry.depth === 2) parent = true;
      if (entry.depth === 2 || !parent) {
        sub = 0;
        return { nested: false, number: String(++top).padStart(2, "0") };
      }
      return { nested: true, number: `${String(top).padStart(2, "0")}.${++sub}` };
    });
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
              // A nested entry's number starts where its parent's label does: the parent's padding, its
              // fixed-width number (w-5) and the gap (gap-3).
              rows[index].nested && (rail ? "pl-[3.25rem]" : "pl-8")
            )}
          >
            <span aria-hidden="true" className={cn("shrink-0 font-mono text-xs leading-6", !rows[index].nested && "w-5")}>{rows[index].number}</span>
            <span>{entry.label}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
