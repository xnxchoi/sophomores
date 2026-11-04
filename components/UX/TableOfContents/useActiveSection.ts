"use client";

import { useEffect, useState } from "react";

/**
 * Tracks the currently visible section among a list of element ids using
 * IntersectionObserver. Returns the id of the first section that is currently
 * intersecting the viewport (biased by `topOffset`), or `null` until one is.
 *
 * `topOffset` lets you compensate for sticky headers — the section anchor is
 * considered "active" once it has scrolled past that offset.
 *
 * Initial state is hash-seeded on the client: arriving at `/page#section-id`
 * directly (or via browser back-forward with restored scroll) shows the right
 * item active immediately, before the observer has had a chance to fire.
 */
export function useActiveSection(ids: string[], topOffset = 96): string | null {
  const [activeId, setActiveId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash.slice(1);
    return ids.includes(hash) ? hash : null;
  });

  useEffect(() => {
    if (typeof window === "undefined" || ids.length === 0) return;

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    // Track which sections are currently intersecting.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            visible.add(id);
          } else {
            visible.delete(id);
          }
        }

        // Pick the first visible section in document order.
        let nextActive: string | null = null;
        for (const id of ids) {
          if (visible.has(id)) {
            nextActive = id;
            break;
          }
        }

        // If nothing is intersecting (e.g. between sections), keep the most
        // recent one — avoids flicker on small viewports.
        if (nextActive !== null) {
          setActiveId((prev) => (prev === nextActive ? prev : nextActive));
        }
      },
      {
        // Trigger once an element crosses ~30% from the top of the viewport,
        // shifted down by `topOffset` for sticky headers.
        rootMargin: `-${topOffset}px 0px -60% 0px`,
        threshold: [0, 0.1, 0.5, 1]
      }
    );

    for (const el of elements) observer.observe(el);

    return () => observer.disconnect();
  }, [ids, topOffset]);

  return activeId;
}
