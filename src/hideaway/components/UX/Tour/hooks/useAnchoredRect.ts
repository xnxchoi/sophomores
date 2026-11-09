"use client";

import { useEffect, useState } from "react";

export type AnchoredRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export function useAnchoredRect(
  element: HTMLElement | null
): AnchoredRect | null {
  const [rect, setRect] = useState<AnchoredRect | null>(null);

  useEffect(() => {
    if (!element) {
      setRect(null);
      return;
    }

    let rafId = 0;
    let prev: AnchoredRect | null = null;

    const read = () => {
      const r = element.getBoundingClientRect();
      const next: AnchoredRect = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height
      };
      if (
        !prev ||
        prev.top !== next.top ||
        prev.left !== next.left ||
        prev.width !== next.width ||
        prev.height !== next.height
      ) {
        prev = next;
        setRect(next);
      }
      rafId = requestAnimationFrame(read);
    };

    rafId = requestAnimationFrame(read);

    const ro = new ResizeObserver(() => {});
    ro.observe(element);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, [element]);

  return rect;
}
