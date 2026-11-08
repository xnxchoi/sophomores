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
