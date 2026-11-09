"use client";
import { type ReactNode, useRef } from "react";
import { motion, useScroll, useMotionValueEvent } from "motion/react";
import { chapters } from "@/lib/teaser/content";
import type { ChapterId } from "@/lib/teaser/choreography";
import { useHomeNavigation } from "@/hooks/use-home-navigation";
import { BlurText } from "../blur-text";
import { sectionHeightVh } from "@/lib/teaser/step-motion";
import { useFooterPlayback } from "@/hooks/use-footer-playback";
import { useTeaserContent } from "./content-provider";

export { Hero } from "./hero";
export { Story } from "./story";
export { Orbit } from "./orbit";
export { Conversation } from "./conversation";

export function People({ onActive }: { onActive: (id: ChapterId) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const content = useTeaserContent();
  const { scrollYProgress: activityProgress } = useScroll({
    target: sectionRef,
    offset: ["start 40%", "end 40%"]
  });
  useMotionValueEvent(activityProgress, "change", (value) => {
    if (value > 0 && value < 1) onActive("people");
  });

  return (
    <motion.section
      ref={sectionRef}
      id="people"
      className="flex min-h-svh items-center bg-black px-3 py-16 md:p-6"
      aria-labelledby="people-heading"
    >
      <div className="my-auto flex w-full flex-col justify-center">
        <h2
          id="people-heading"
          className="max-w-300 font-teaser-serif text-teaser-heading md:tall:text-teaser-display teaser-wide:tall:text-[80px]"
        >
          <BlurText text={content.peopleHeadline} />
        </h2>
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
  const content = useTeaserContent();
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
            <BlurText text={content.invitationHeadline} />
          </h2>
          <button
            className="self-start bg-none p-0 text-left text-[18px] leading-[1.3] uppercase hover:text-teaser-focus"
            onClick={onOpen}
          >
            → {content.rsvpButtonLabel.replace(/^→\s*/, "")}{" "}
            <span className="mt-3 block text-[12px] text-teaser-muted">
              {content.rsvpButtonSubtext}
            </span>
          </button>
        </div>
      </div>
      <footer className="flex flex-wrap justify-between gap-5 font-sans text-teaser-fine text-teaser-muted uppercase md:flex-nowrap md:text-teaser-caption">
        <span>{content.footerCopyright}</span>
        <a
          className="order-3 basis-full md:order-none md:basis-auto"
          href={`#${chapters[0].id}`}
          onClick={navigateHome}
        >
          Back to the beginning ↑
        </a>
        <span>{content.footerDomain}</span>
      </footer>
    </motion.section>
  );
}
