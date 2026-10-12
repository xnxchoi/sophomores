"use client";
import { useChapterActivity } from "./use-chapter-activity";
import { motion, useTransform, type MotionValue } from "motion/react";
import type { ReactNode, RefObject } from "react";
import { teaser } from "@/lib/teaser/content";
import { motionTokens } from "@/lib/motion-tokens";
import type { ChapterId } from "@/lib/teaser/choreography";
import type { useEntry } from "./use-entry";
import { BlurText } from "./blur-text";

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
  still
}: {
  letter: string;
  index: number;
  entry: Entry;
  still: boolean;
}) {
  const x = useTransform(
    entry.layout,
    (value) =>
      `calc(var(--notification-space) * ${(-index / (teaser.name.length - 1)) * value})`
  );
  return (
    <motion.span aria-hidden="true" style={{ x: still ? undefined : x }}>
      {letter}
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
      className={
        step === 0 ? "notification" : "notification notification-second"
      }
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
  const wordmarkY = useTransform(
    entry.dock,
    (value) => `calc((50svh - .425em - 12px) * ${1 - value})`
  );
  return (
    <motion.section
      ref={sectionRef}
      id="hero"
      className="hero-section"
      aria-label="Introduction"
      style={sectionStyle}
    >
      <div className="stage hero-stage">
        <motion.header
          className="hero-header"
          style={{ opacity: still ? 1 : headerOpacity }}
        >
          <motion.h1
            className="wordmark"
            aria-label="sophomores"
            style={{
              y: still ? 0 : wordmarkY,
              opacity: still ? 1 : entry.glyph
            }}
          >
            {teaser.name.split("").map((letter, index) => (
              <Letter key={index} {...{ letter, index, entry, still }} />
            ))}
          </motion.h1>
          <div className="notifications">
            <NotificationSurface position={position} step={0} still={still}>
              <div className="message-meta">
                <span>From: sophomores</span>
                <span>Now</span>
              </div>
              <p>{teaser.introduction}</p>
            </NotificationSurface>
            <NotificationSurface position={position} step={1} still={still}>
              <div className="message-meta">
                <span>Ticket sales open</span>
                <span>{teaser.launchHint}</span>
              </div>
              <p>{teaser.notification}</p>
            </NotificationSurface>
          </div>
        </motion.header>
        <h2 className="hero-statement">
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
