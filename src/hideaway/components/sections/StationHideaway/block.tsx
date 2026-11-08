"use client";

import { TapePlayer } from "@/hideaway/components/UX/TapePlayer";
import { Tape3DScene } from "@/hideaway/components/UX/TapePlayer/visuals/Tape3DScene";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hideaway/providers/MiddleMan";
import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { Suspense, useRef } from "react";

/**
 * StationHideawayHero
 *
 * The 3D cassette parallax — reserved for hand-crafted Tape pages
 * (`/radio/tapes/vol-NNN/`). Pulled from the home page and from
 * `/radio` because the cassette is the brand's runway object; it
 * appears once per Tape, never as ambient wallpaper.
 *
 *   z-30  RP / FM call-sign + room label  — static, no parallax drift
 *   z-20  Tape3DScene                     — float in, linger, drift away
 *   z-10  TapePlayer hero                 — micro-parallax under scene
 */
interface StationHideawayHeroProps {
  className?: string;
}

export function StationHideawayHero({ className }: StationHideawayHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { isMobile } = useIsMobile();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start center", "end 15%"]
  });

  // Tape3DScene — float in, LINGER, drift away
  const sceneY = useTransform(
    scrollYProgress,
    [0, 0.25, 0.35, 0.5, 0.85, 1],
    ["100vh", "80vh", "15vh", "10vh", "-5vh", "-100vh"]
  );
  const sceneOpacity = useTransform(
    scrollYProgress,
    [0, 0.1, 0.6, 0.85, 1],
    [0, 1, 1, 0.8, 0]
  );

  // TapePlayer — micro-parallax, grounded
  const playerY = useTransform(scrollYProgress, [0, 1], ["0vh", "-20vh"]);
  const playerOpacity = useTransform(scrollYProgress, [0, 0.15, 1], [0, 1, 1]);

  return (
    <section
      ref={sectionRef}
      id="station-hideaway-hero"
      className={cn("relative w-full min-w-screen", className)}
      style={{ minHeight: "180vh" }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {/* z-10: TapePlayer — grounded, micro-parallax */}
        <m.div
          style={{ y: playerY, opacity: playerOpacity }}
          className="absolute inset-0 z-[10] flex items-center justify-center"
        >
          <TapePlayer variant="hero" className="min-h-0" />
        </m.div>

        {/* z-20: Tape3DScene — floats in, lingers, drifts away */}
        <m.div
          style={{ y: sceneY, opacity: sceneOpacity }}
          className="absolute inset-0 z-[20]"
        >
          {!isMobile && (
            <Suspense>
              <Tape3DScene
                scrollTriggerId="station-hideaway-hero"
                className="absolute inset-0 !h-full"
                style={{ aspectRatio: "unset" }}
              />
            </Suspense>
          )}
        </m.div>

        {/* z-30: Static call-sign + room label */}
        {/* RP — top-left */}
        <div
          className="text-fg/[0.07] pointer-events-none absolute top-6 left-[-0.02em] z-[30] font-sans text-[clamp(8rem,18vw,22rem)] leading-none font-black tracking-[-0.04em] uppercase select-none"
          aria-hidden="true"
        >
          RP
        </div>

        {/* FM — bottom-right */}
        <div
          className="text-fg/[0.07] pointer-events-none absolute right-[-0.02em] bottom-4 z-[30] text-right font-sans text-[clamp(8rem,18vw,22rem)] leading-none font-black tracking-[-0.04em] uppercase select-none"
          aria-hidden="true"
        >
          FM
        </div>

        {/* Room label — top-right */}
        <div
          className="pointer-events-none absolute top-6 right-6 z-[30] flex flex-col items-end gap-0.5 text-right select-none"
          aria-hidden="true"
        >
          <span className="text-faded-fg/80 text-md font-sans tracking-[0.2em] uppercase">
            · Hideaway FM
          </span>
        </div>
      </div>
    </section>
  );
}
