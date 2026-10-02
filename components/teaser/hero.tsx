"use client";
import { useChapterActivity } from "./use-chapter-activity";
import { motion, useTransform, type MotionValue } from "motion/react";
import type { RefObject } from "react";
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
    entry.notification,
    (value) =>
      `calc(var(--notification-space) * ${(-index / (teaser.name.length - 1)) * value})`
  );
  return (
    <motion.span aria-hidden="true" style={{ x: still ? undefined : x }}>
      {letter}
    </motion.span>
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
  const headerOpacity = useTransform(position, [1, 1.65], [1, 0]);
  const secondOpacity = useTransform(position, [0, 1], [0, 1]);
  const secondScale = useTransform(
    position,
    [0, 1],
    [motionTokens.scale.hidden, 1]
  );
  const statementActive = useTransform(position, (value) => value >= 1.5);
  const hintOpacity = useTransform(
    () => entry.notification.get() * (1 - Math.min(1, position.get()))
  );
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
          <motion.div
            className="notifications"
            style={{ opacity: still ? 1 : entry.notification }}
          >
            <div className="notification">
              <div className="message-meta">
                <span>From: sophomores</span>
                <span>Now</span>
              </div>
              <p>{teaser.introduction}</p>
            </div>
            <motion.div
              className="notification notification-second"
              style={{
                opacity: still ? 1 : secondOpacity,
                scale: still ? 1 : secondScale
              }}
            >
              <div className="message-meta">
                <span>Ticket sales open</span>
                <span>{teaser.launchHint}</span>
              </div>
              <p>{teaser.notification}</p>
            </motion.div>
          </motion.div>
        </motion.header>
        <h2 className="hero-statement">
          <BlurText
            text={teaser.headline}
            active={statementActive}
            still={still}
          />
        </h2>
        <motion.p className="scene-hint" style={{ opacity: hintOpacity }}>
          Move to explore · Scroll to begin
        </motion.p>
      </div>
    </motion.section>
  );
}
