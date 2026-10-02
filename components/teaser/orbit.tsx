"use client";
import { useChapterActivity } from "./use-chapter-activity";
import { AnimatePresence, motion, useTransform } from "motion/react";
import { principles } from "@/lib/teaser/content";
import type { ChapterId } from "@/lib/teaser/choreography";
import { useChapterScroll } from "./use-chapter-scroll";
import { orbitDescriptionMotion } from "@/lib/teaser/conversation-motion";

function Description({ index }: { index: number }) {
  return (
    <>
      <h2 className="orbit-static-title">{principles[index].title}</h2>
      <p>{principles[index].body}</p>
    </>
  );
}

export function Orbit({
  still,
  onActive
}: {
  still: boolean;
  onActive: (id: ChapterId) => void;
}) {
  const { ref, position, step, sectionStyle } = useChapterScroll("how", still);
  useChapterActivity(ref, "how", onActive);
  const rotate = useTransform(
    position,
    [0, principles.length - 1],
    [0, -(principles.length - 1) * 90]
  );
  return (
    <motion.section
      ref={ref}
      id="how"
      className="scroll-section orbit-section"
      aria-label="The idea"
      style={sectionStyle}
    >
      <div className="stage orbit-stage">
        <div className="orbit-cursor" aria-hidden="true" />
        <motion.div
          className="orbit-wheel"
          style={{ rotate: still ? 0 : rotate }}
        >
          {principles.map((principle, index) => (
            <div
              key={principle.title}
              className={`orbit-point orbit-point-${index}`}
            >
              <span
                className="orbit-marker"
                style={{ background: principle.color }}
                aria-hidden="true"
              />
              <h2>{principle.title}</h2>
            </div>
          ))}
        </motion.div>
        <div className="orbit-descriptions">
          {still ? (
            principles.map((principle, index) => (
              <div key={principle.title}>
                <Description index={index} />
              </div>
            ))
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} {...orbitDescriptionMotion}>
                <Description index={step} />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.section>
  );
}
