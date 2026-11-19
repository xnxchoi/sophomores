"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { useEffect, useRef, type ReactNode, type RefObject } from "react";

gsap.registerPlugin(ScrollTrigger);

function LenisClock({ lenisRef }: { lenisRef: RefObject<LenisRef | null> }) {
  useEffect(() => {
    let frame = 0;
    const tick = (time: number) => {
      // Lenis measures the gap between calls in milliseconds, the same unit
      // Tempus passes on Hideaway. A seconds clock stretches the lerp.
      lenisRef.current?.lenis?.raf(time);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [lenisRef]);

  useLenis(() => {
    ScrollTrigger.update();
  });

  return null;
}

// Holders of the scroll lock. The root scroller is shared, so a surface that needs the page held still
// (the menu, a focused portrait, a modal dialog) takes a hold instead of calling lenis.stop()/start()
// itself: scrolling resumes only when the last hold is released, whatever order they close in.
const scrollHolds = new Set<symbol>();

/** Holds the root smooth scroll still while `active` is true (S6: one writer for Lenis). */
export function useScrollLock(active: boolean) {
  const lenis = useLenis();
  useEffect(() => {
    if (!active || !lenis) return;
    const hold = Symbol("scroll-hold");
    scrollHolds.add(hold);
    lenis.stop();
    return () => {
      scrollHolds.delete(hold);
      if (scrollHolds.size === 0) lenis.start();
    };
  }, [active, lenis]);
}

/**
 * Hideaway root scroller. No duration is set, so the wheel uses lerp 0.1
 * rather than the one-second easing curve.
 */
export function SiteScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  return (
    <ReactLenis
      ref={lenisRef}
      root
      options={{
        autoRaf: false,
        anchors: true,
        lerp: 0.1,
        smoothWheel: true,
        syncTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 1
      }}
    >
      <LenisClock lenisRef={lenisRef} />
      {children}
    </ReactLenis>
  );
}
