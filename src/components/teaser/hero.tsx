"use client";

import type { MotionValue } from "motion/react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import type { ReactNode, RefObject } from "react";
import { useTeaserContent } from "./content-provider";
import { motionTokens } from "@/lib/motion-tokens";
import type { ChapterId } from "@/lib/teaser/choreography";
import { BlurText } from "../blur-text";

type Props = {
  sectionRef: RefObject<HTMLElement | null>;
  sectionStyle: { height: string };
  position: MotionValue<number>;
  onActive: (id: ChapterId) => void;
};

function NotificationSurface({
  position,
  step,
  children
}: {
  position: MotionValue<number>;
  step: 0 | 1;
  children: ReactNode;
}) {
  const opacity = useTransform(position, [step, step + 1], [0, 1]);
  const scale = useTransform(
    position,
    [step, step + 1],
    [motionTokens.scale.hidden, 1]
  );
  return (
    <motion.div
      data-notification=""
      className="flex min-w-0 flex-col gap-6 rounded-teaser-card bg-ultramarine p-6 md:min-w-(--notification-width)"
      style={{
        opacity: opacity,
        scale: scale,
        transformOrigin: "50% 50%"
      }}
    >
      {children}
    </motion.div>
  );
}

export function Hero({
  sectionRef,
  sectionStyle,
  position,
  onActive
}: Props) {
  const content = useTeaserContent();
  const { scrollYProgress: activityProgress } = useScroll({
    target: sectionRef,
    offset: ["start 40%", "end 40%"]
  });
  useMotionValueEvent(activityProgress, "change", (value) => {
    if (value > 0 && value < 1) onActive?.("hero");
  });
  const headerOpacity = useTransform(position, [2, 2.65], [1, 0]);
  const statementActive = useTransform(position, (value) => value >= 2.5);
  return (
    <motion.section
      ref={sectionRef}
      id="hero"
      className="relative"
      aria-label="Introduction"
      style={sectionStyle}
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <motion.header
          className="relative min-h-102.5 p-3 md:min-h-80"
          style={{ opacity: headerOpacity }}
        >
          <div className="absolute top-[calc(clamp(28px,8.2vw,48px)*0.85+36px)] right-3 left-3 flex w-auto flex-col gap-1 md:top-3 md:left-auto md:w-(--notification-width)">
            <NotificationSurface position={position} step={0}>
              <div className="flex justify-between gap-4 font-sans text-teaser-caption leading-[1.1] text-mauve-bone uppercase">
                <span>{content.notice1Sender}</span>
                <span>{content.notice1Time}</span>
              </div>
              <p className="font-message text-teaser-body uppercase">
                {content.notice1Body}
              </p>
            </NotificationSurface>
            <NotificationSurface position={position} step={1}>
              <div className="flex justify-between gap-4 font-sans text-teaser-caption leading-[1.1] text-mauve-bone uppercase">
                <span>{content.notice2Sender}</span>
                <span>{content.notice2Time}</span>
              </div>
              <p className="font-message text-teaser-body uppercase">
                {content.notice2Body}
              </p>
            </NotificationSurface>
          </div>
        </motion.header>
        <h2
          data-hero-statement=""
          className="absolute inset-x-3 top-[calc(50%-100px)] text-center font-teaser-serif text-[40px] leading-[1.35] md:top-[calc(50%-90px)] md:text-teaser-display teaser-wide:text-[80px]"
        >
          <BlurText text={content.centerHeadline} active={statementActive} />
        </h2>
      </div>
    </motion.section>
  );
}
