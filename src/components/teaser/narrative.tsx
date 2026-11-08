"use client";
import Image from "next/image";
import { type ReactNode, useRef, useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { chapters, teaser, values } from "@/lib/teaser/content";
import type { ChapterId } from "@/lib/teaser/choreography";
import { springs } from "@/lib/motion-tokens";
import { useHomeNavigation } from "@/hooks/use-home-navigation";
import { BlurText } from "../blur-text";
import { sectionHeightVh } from "@/lib/teaser/step-motion";
import { cn } from "@/lib/utils";
import { useFooterPlayback } from "@/hooks/use-footer-playback";

export { Hero } from "./hero";
export { Story } from "./story";
export { Orbit } from "./orbit";
export { Conversation } from "./conversation";

export function People({ onActive }: { onActive: (id: ChapterId) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress: activityProgress } = useScroll({
    target: sectionRef,
    offset: ["start 40%", "end 40%"]
  });
  useMotionValueEvent(activityProgress, "change", (value) => {
    if (value > 0 && value < 1) onActive("people");
  });

  // Measure how far user has scrolled through this sticky section (0 to 1)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  // Which card layout is active as the user scrolls down:
  // 0: First card expanded (92% width)
  // 1: Two cards side-by-side (50% each)
  // 2: All three cards spread evenly (33% each)
  const [activeCards, setActiveCards] = useState<0 | 1 | 2>(0);

  // Remap progress to leave reading room (the final ~10% hold) before unpinning
  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const activeRange = Math.min(1, progress / 0.9);
    if (activeRange < 0.35) setActiveCards(0);
    else if (activeRange < 0.7) setActiveCards(1);
    else setActiveCards(2);
  });

  return (
    <motion.section
      ref={sectionRef}
      id="people"
      className="h-auto bg-black lg:h-[430svh]"
      aria-labelledby="people-heading"
    >
      <div className="relative top-0 flex h-auto flex-col justify-between gap-9 overflow-visible px-3 py-[14.4px] lg:sticky lg:h-[calc(100svh-88px)] lg:gap-7.5 lg:overflow-hidden lg:py-3">
        <h2
          id="people-heading"
          className="max-w-300 font-teaser-serif text-teaser-heading md:tall:text-teaser-display teaser-wide:tall:text-[80px]"
        >
          <BlurText text={teaser.peopleHeadline} />
        </h2>
        <div className="flex max-h-none min-h-70 flex-1 flex-col gap-[14.4px] lg:max-h-95 lg:flex-row lg:gap-3 md:short:min-h-60">
          {values.map((value) => (
            <motion.article
              key={value.image}
              className={cn(
                "flex min-h-105 flex-none flex-col justify-between gap-30 rounded-teaser-card bg-teaser-card p-6 md:min-h-102 lg:min-h-auto md:short:gap-5 md:short:p-4.5 lg:tall:gap-15",
                activeCards === 1
                  ? "lg:basis-[calc(50%-6px)]"
                  : activeCards === 2
                    ? "lg:basis-[calc((100%-24px)/3)]"
                    : "lg:basis-[91.6667%]"
              )}
              layout={true}
              transition={springs.gentle}
            >
              <motion.div layout={"position"}>
                <Image
                  src={value.image}
                  width={96}
                  height={96}
                  alt=""
                  className="size-24 object-contain md:short:size-16"
                />
              </motion.div>
              <motion.p
                className="font-sans text-teaser-body whitespace-pre-line uppercase"
                layout={"position"}
              >
                {value.body}
              </motion.p>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

export function Invitation({
  onOpen,
  onActive,
  renderBackdrop
}: {
  onOpen: () => void;
  onActive: (id: ChapterId) => void;
  renderBackdrop?: (active: boolean) => ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const footerPlayback = useFooterPlayback(ref);
  const navigateHome = useHomeNavigation();
  const { scrollYProgress: activityProgress } = useScroll({
    target: ref,
    offset: ["start 40%", "end 40%"]
  });
  useMotionValueEvent(activityProgress, "change", (value) => {
    if (value > 0 && value < 1) onActive("contacts");
  });
  return (
    <motion.section
      ref={ref}
      id="contacts"
      className="relative isolate flex min-h-svh flex-col bg-black/15 px-3 pt-3 pb-16 md:p-6"
      aria-labelledby="invitation-heading"
      style={{ minHeight: `${sectionHeightVh(0)}svh` }}
    >
      <div data-footer-backdrop aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-clip opacity-85 [clip-path:inset(0)]">
        <div data-footer-viewport className="fixed inset-0">
          {footerPlayback.visited && renderBackdrop?.(footerPlayback.active)}
          <div className="absolute inset-0 bg-black/15" />
        </div>
      </div>
      <div className="my-auto flex flex-col items-start gap-8 py-20 md:flex-row md:gap-[20%] md:py-25">
        <span
          className="font-sans text-[96px] leading-[0.8] md:text-[130px]"
          aria-hidden="true"
        >
          s/
        </span>
        <div className="flex flex-col gap-22 md:gap-28">
          <h2
            id="invitation-heading"
            className="font-teaser-serif text-teaser-copy leading-[1.4] md:text-teaser-heading md:leading-[1.4] teaser-wide:text-[56px]"
          >
            <BlurText text={teaser.invitation} />
          </h2>
          <button
            className="self-start bg-none p-0 text-left text-[18px] leading-[1.3] uppercase hover:text-teaser-focus"
            onClick={onOpen}
          >
            → The first invitation{" "}
            <span className="mt-3 block text-[12px] text-teaser-muted">
              {teaser.launchHint}
            </span>
          </button>
        </div>
      </div>
      <footer className="flex flex-wrap justify-between gap-5 font-sans text-teaser-fine text-teaser-muted uppercase md:flex-nowrap md:text-teaser-caption">
        <span>© sophomores 2026</span>
        <a
          className="order-3 basis-full md:order-none md:basis-auto"
          href={`#${chapters[0].id}`}
          onClick={navigateHome}
        >
          Back to the beginning ↑
        </a>
        <span>sophomores.co</span>
      </footer>
    </motion.section>
  );
}
