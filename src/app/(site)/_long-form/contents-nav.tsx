"use client";

import { cn } from "@/lib/utils";
import { FocusShape } from "@/components/core/FocusShape/FocusShape";
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
        <summary className="group/focus flex min-h-12 list-none items-center justify-between gap-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
          <FocusShape className="outline-offset-4">{label}</FocusShape>
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

// Top-level entries count 01, 02…; a nested entry takes its parent's number plus its own (02.1), so nesting
// never shifts the top-level count. Nested entries before the first real top-level entry have no parent, so
// each is listed as a top-level entry (01, 02, never 00.1 or 01.1).
function numberEntries(entries: ReadonlyArray<ContentsEntry>) {
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
}

/**
 * The legal-document contents, ported from The Hideaway's anchor table of contents (thehideaway
 * src/components/UX/TableOfContents/TableOfContents.tsx, as DocsShell uses it for /terms and /privacy): a hairline
 * on the left, small caps labels after their numbers, and the entry being read marked by a 1px gradient rule and a
 * soft sheen fading right. Numbers stay in the sans face.
 */
export function DocsContentsNav({ entries, label }: { entries: ReadonlyArray<ContentsEntry>; label: string }) {
  const ids = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const current = useActiveSection(ids, 112);
  const rows = useMemo(() => numberEntries(entries), [entries]);

  if (entries.length === 0) return null;
  // Sizes, tracking, spacing and tones measured from hideawayseoul.com/terms at 390 and 1440.
  return (
    <nav aria-label={label}>
      <h2 className="pl-[12.5px] text-[10px] leading-[1.333] tracking-[0.1em] text-foreground/55 uppercase xl:text-xs xl:leading-[1.43]">{label}</h2>
      <ol className="relative mt-[15px] flex flex-col items-start gap-0.5 border-l border-border">
        {entries.map((entry, index) => (
          <li key={entry.id} className="w-full">
            <a
              href={`#${entry.id}`}
              aria-current={current === entry.id ? "location" : undefined}
              className={cn(
                "group group/focus relative flex items-baseline py-[8.75px] pr-4 pl-[12.5px] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] pointer-coarse:min-h-12",
                "before:absolute before:inset-y-1 before:-left-px before:w-px before:bg-gradient-to-b before:from-transparent before:via-foreground/80 before:to-transparent before:opacity-0 before:transition-opacity before:duration-[var(--duration-fast)] before:ease-[var(--ease-standard)] hover:before:opacity-40 aria-[current=location]:before:opacity-100 dark:before:via-foreground",
                "after:pointer-events-none after:absolute after:inset-y-0 after:-left-px after:w-32 after:bg-gradient-to-r after:from-foreground/[0.05] after:to-transparent after:opacity-0 after:transition-opacity after:duration-[var(--duration-fast)] after:ease-[var(--ease-standard)] aria-[current=location]:after:opacity-100 dark:after:from-foreground/[0.07]",
                rows[index].nested && "pl-10"
              )}
            >
              <FocusShape className="relative z-10 flex items-baseline gap-2.5 outline-offset-4">
                <span aria-hidden="true" className="relative z-10 shrink-0 text-[10px] leading-[1.5] tracking-[0.1em] text-foreground/55 tabular-nums transition-colors group-aria-[current=location]:text-foreground/85">{rows[index].number}</span>
                <span className="relative z-10 text-[11px] leading-[1.5] tracking-[0.18em] text-foreground/60 uppercase transition-colors group-hover:text-foreground/85 group-aria-[current=location]:text-foreground xl:text-[10px] xl:leading-[1.333]">{entry.label}</span>
              </FocusShape>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ContentsLinks({ entries, current, rail = false }: { entries: ReadonlyArray<ContentsEntry>; current: string | null; rail?: boolean }) {
  const rows = useMemo(() => numberEntries(entries), [entries]);
  return (
    <ol>
      {entries.map((entry, index) => (
        <li key={entry.id}>
          <a
            href={`#${entry.id}`}
            aria-current={current === entry.id ? "location" : undefined}
            className={cn(
              "group/focus flex min-h-12 items-start py-3 text-sm leading-6 text-muted-foreground underline-offset-4 transition-colors duration-[var(--duration-fast)] ease-[var(--ease-standard)] hover:text-foreground hover:underline aria-[current=location]:text-foreground",
              rail && "border-l border-border pl-5 hover:border-foreground aria-[current=location]:border-foreground",
              // A nested entry's number starts where its parent's label does: the parent's padding, its
              // fixed-width number (w-5) and the gap (gap-3).
              rows[index].nested && (rail ? "pl-[3.25rem]" : "pl-8")
            )}
          >
            <FocusShape className="flex items-start gap-3 outline-offset-4">
              <span aria-hidden="true" className={cn("shrink-0 font-sans tabular-nums text-xs leading-6", !rows[index].nested && "w-5")}>{rows[index].number}</span>
              <span>{entry.label}</span>
            </FocusShape>
          </a>
        </li>
      ))}
    </ol>
  );
}
