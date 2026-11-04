"use client";

import { useSiteMenu } from "@/lib/content/menu";
import { animate } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

const PAGE_EASE = [0.6, 0, 0.3, 1] as const;

/**
 * Hideaway page motion.
 * Entry fades in after 0.7s. Leaving scales the page. The menu uses that same scale.
 */
export function PageMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const open = useSiteMenu((state) => state.open);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.opacity = "0";
    animate(node, { opacity: 1 }, { duration: 0.3, delay: 0.7, ease: "easeIn" });
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    animate(
      node,
      open ? { scale: 0.5, scaleX: 0.9 } : { scale: 1, scaleX: 1 },
      { duration: 0.86, ease: PAGE_EASE }
    );
  }, [open]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest("a");
      if (!link) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      const node = ref.current;
      if (!node) return;
      event.preventDefault();
      animate(node, { scale: 0.5, scaleX: 0.9 }, { duration: 0.86, ease: PAGE_EASE }).then(() => {
        window.location.assign(url.href);
      });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  return (
    <div ref={ref} id="page-root" className="page-root">
      {children}
    </div>
  );
}
