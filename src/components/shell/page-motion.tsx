"use client";

import { useSiteMenu } from "@/lib/content/menu";
import { TWEEN_EASE } from "@/constants/animations";
import { animate } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Hideaway page motion.
 * Route fades are owned by the transition router. Opening the menu scales this
 * surface to the menu window, the same way the Hideaway frame does.
 */
export function PageMotion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const open = useSiteMenu((state) => state.open);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const mobile = window.innerWidth < 967;
    const hole = document.querySelector(".site-menu-window");
    const ratio = hole && window.innerHeight ? hole.getBoundingClientRect().height / window.innerHeight : 0.7;
    const scale = mobile || !open ? 1 : 1.1 * ratio;
    void animate(node, { scale, y: 0 }, { duration: 1.2, ease: TWEEN_EASE.power3.inOut });
  }, [open]);

  return (
    <div ref={ref} id="page-root" className="page-root">
      {children}
    </div>
  );
}
