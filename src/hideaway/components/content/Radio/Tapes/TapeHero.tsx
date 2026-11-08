"use client";

import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";

/**
 * Editorial title block for a Tape page.
 *
 * Pairs with the parallax `StationHideawayHero` above and `TapeStory`
 * below. Pure title + subhead — no decorative ghost letters, no scroll
 * cue (the parallax is the affordance).
 *
 * Used as a building block by hand-crafted Tape pages under
 * `/radio/tapes/vol-NNN/`. Each Tape composes its own layout; this
 * component keeps the title-block grammar consistent across volumes.
 */
interface TapeHeroProps {
  /** e.g. "Hideaway FM — Tape / Vol. 001" */
  eyebrow: string;
  /** Artist name as h1, or the Tape's own title if standalone */
  title: string;
  /**
   * Factual one-liner — recording context, edition, release date.
   * Avoid poetic placeholders. e.g.
   * "Recorded in Seoul · Edition of 100 · 2026.04"
   */
  subhead: string;
}

export function TapeHero({ eyebrow, title, subhead }: TapeHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  });

  const titleY = useTransform(scrollYProgress, [0, 1], ["0vh", "-15vh"]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 1, 0]);
  const subY = useTransform(scrollYProgress, [0, 1], ["0vh", "-8vh"]);
  const subOpacity = useTransform(scrollYProgress, [0, 0.4, 0.8], [0, 1, 0]);

  return (
    <section
      ref={sectionRef}
      className="relative flex h-[120vh] w-full items-center justify-center overflow-hidden"
    >
      <div className="relative z-10 mx-auto max-w-7xl px-6 xl:px-10">
        <m.div style={{ y: titleY, opacity: titleOpacity }}>
          <p className="mb-6 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/50 uppercase xl:text-xs">
            {eyebrow}
          </p>
          <h1 className="max-w-4xl text-3xl font-light tracking-tight sm:text-4xl md:text-5xl xl:text-6xl 2xl:text-7xl">
            {title}
          </h1>
        </m.div>

        <m.div style={{ y: subY, opacity: subOpacity }} className="mt-8">
          <p className="max-w-lg font-sans text-[11px] leading-relaxed text-muted-foreground/60 xl:text-xs">
            {subhead}
          </p>
        </m.div>
      </div>
    </section>
  );
}
