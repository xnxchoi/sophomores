"use client";
import { useChapterActivity } from "../../hooks/use-chapter-activity";
import { motion, type MotionStyle, type MotionValue, useTransform } from "motion/react";
import type { ReactNode, RefObject } from "react";
import { teaser } from "@/lib/teaser/content";
import { motionTokens } from "@/lib/motion-tokens";
import { entryTokens } from "@/lib/teaser/entry-tokens";
import type { ChapterId } from "@/lib/teaser/choreography";
import type { useEntry } from "../../hooks/use-entry";
import { BlurText } from "../blur-text";

type Entry = ReturnType<typeof useEntry>;
type Props = {
  sectionRef: RefObject<HTMLElement | null>;
  sectionStyle: { height: string };
  position: MotionValue<number>;
  entry: Entry;
  still: boolean;
  onActive: (id: ChapterId) => void;
};

function Letter({
  letter,
  index,
  entry,
  still,
  glyphScale
}: {
  letter: string;
  index: number;
  entry: Entry;
  still: boolean;
  glyphScale: MotionValue<number>;
}) {
  const x = useTransform(
    entry.layout,
    (value) =>
      `calc(var(--notification-space) * ${(-index / (teaser.name.length - 1)) * value})`
  );
  const glyphStyle: MotionStyle & {
    "--wordmark-scale": number | MotionValue<number>;
  } = {
    "--wordmark-scale": still ? entryTokens.wordmark.dockedScale : glyphScale
  };
  return (
    <motion.span aria-hidden="true" style={{ x: still ? undefined : x }}>
      <motion.span
        className="wordmark-glyph inline-block origin-center scale-(--wordmark-scale)"
        style={glyphStyle}
      >
        {letter}
      </motion.span>
    </motion.span>
  );
}

function NotificationSurface({
  position,
  step,
  still,
  children
}: {
  position: MotionValue<number>;
  step: 0 | 1;
  still: boolean;
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
      className={`notification flex min-w-0 flex-col gap-6 rounded-teaser-card bg-teaser-notice p-6 md:min-w-(--notification-width) ${step === 1 ? "notification-second" : ""}`}
      style={{
        opacity: still ? 1 : opacity,
        scale: still ? 1 : scale,
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
  entry,
  still,
  onActive
}: Props) {
  useChapterActivity(sectionRef, "hero", onActive);
  const headerOpacity = useTransform(position, [2, 2.65], [1, 0]);
  const statementActive = useTransform(position, (value) => value >= 2.5);
  const glyphScale = useTransform<number, number>(
    entry.dock,
    [0, 1],
    [entryTokens.wordmark.initialScale, entryTokens.wordmark.dockedScale]
  );
  const wordmarkY = useTransform(
    entry.dock,
    (value) => `calc((50svh - .425em - 12px) * ${1 - value})`
  );
  const wordmarkStyle: MotionStyle & { "--wordmark-docked-scale": number } = {
    y: still ? 0 : wordmarkY,
    opacity: still ? 1 : entry.glyph,
    "--wordmark-docked-scale": entryTokens.wordmark.dockedScale
  };
  return (
    <motion.section
      ref={sectionRef}
      id="hero"
      className="hero-section"
      aria-label="Introduction"
      style={sectionStyle}
    >
      <div className="stage hero-stage sticky top-0 h-svh overflow-hidden">
        <motion.header
          className="hero-header relative min-h-102.5 p-3 md:min-h-80"
          style={{ opacity: still ? 1 : headerOpacity }}
        >
          <motion.h1
            className="wordmark flex w-full flex-initial justify-between font-sans uppercase text-[clamp(28px,8.2vw,48px)] leading-[0.85] md:text-teaser-heading lg:text-teaser-display teaser-wide:text-[80px]"
            aria-label="sophomores"
            style={wordmarkStyle}
          >
            {teaser.name.split("").map((letter, index) => (
              <Letter key={index} {...{ letter, index, entry, still, glyphScale }} />
            ))}
          </motion.h1>
          <div className="notifications absolute top-[calc(clamp(28px,8.2vw,48px)*0.85+36px)] right-3 left-3 flex w-auto flex-col gap-1 md:top-3 md:left-auto md:w-(--notification-width)">
            <NotificationSurface position={position} step={0} still={still}>
              <div className="message-meta flex justify-between gap-4 font-sans text-teaser-caption leading-[1.1] text-teaser-notice-meta uppercase">
                <span>From: sophomores</span>
                <span>Now</span>
              </div>
              <p className="font-message text-teaser-body uppercase">
                {teaser.introduction}
              </p>
            </NotificationSurface>
            <NotificationSurface position={position} step={1} still={still}>
              <div className="message-meta flex justify-between gap-4 font-sans text-teaser-caption leading-[1.1] text-teaser-notice-meta uppercase">
                <span>Ticket sales open</span>
                <span>{teaser.launchHint}</span>
              </div>
              <p className="font-message text-teaser-body uppercase">
                {teaser.notification}
              </p>
            </NotificationSurface>
          </div>
        </motion.header>
        <h2 className="hero-statement absolute inset-x-3 top-[calc(50%-100px)] text-center font-teaser-serif text-[40px] leading-[1.35] md:top-[calc(50%-90px)] md:text-teaser-display teaser-wide:text-[80px]">
          <BlurText
            text={teaser.headline}
            active={statementActive}
            still={still}
          />
        </h2>
      </div>
    </motion.section>
  );
}
