"use client";
import { useChapterActivity } from "../../hooks/use-chapter-activity";
import { AnimatePresence, motion, useTransform } from "motion/react";
import { principles } from "@/lib/teaser/content";
import type { ChapterId } from "@/lib/teaser/choreography";
import { useChapterScroll } from "../../hooks/use-chapter-scroll";
import { orbitDescriptionMotion } from "@/lib/teaser/conversation-motion";

const orbitPointClasses = [
  "left-[calc(50%-8px)] -top-2",
  "top-[calc(50%-8px)] -right-2 rotate-90",
  "-bottom-2 left-[calc(50%-8px)] rotate-180"
];

function Description({ index }: { index: number }) {
  return (
    <>
      <h2 className="orbit-static-title hidden">{principles[index].title}</h2>
      <p className="text-center font-sans text-teaser-body uppercase short:max-md:text-base short:max-md:leading-[1.1]">
        {principles[index].body}
      </p>
    </>
  );
}

export function Orbit({
  onActive
}: {
  onActive: (id: ChapterId) => void;
}) {
  const { ref, position, step, sectionStyle } = useChapterScroll("how");
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
      className="scroll-section orbit-section bg-black"
      aria-label="The idea"
      style={sectionStyle}
    >
      <div className={`stage orbit-stage sticky top-0 h-svh overflow-hidden`}>
        <div
          className="orbit-cursor absolute top-[calc(50%-64px)] left-1/2 h-32 border-l border-dashed border-l-teaser-muted"
          aria-hidden="true"
        />
        <motion.div
          className="orbit-wheel absolute top-1/2 -left-[32vw] size-[164vw] rounded-full border border-white"
          style={{ rotate: rotate }}
        >
          {principles.map((principle, index) => (
            <div
              key={principle.title}
              className={`orbit-point orbit-point-${index} absolute size-4 ${orbitPointClasses[index]}`}
            >
              <span
                className="orbit-marker block size-4"
                style={{ background: principle.color }}
                aria-hidden="true"
              />
              <h2 className="absolute bottom-[136px] left-1/2 w-[85vw] -translate-x-1/2 text-center font-teaser-serif text-2xl leading-[1.4] whitespace-pre-line md:w-[360px] short:max-md:bottom-[100px]">
                {principle.title}
              </h2>
            </div>
          ))}
        </motion.div>
        <div className="orbit-descriptions absolute top-[calc(50%+120px)] left-[7.5vw] grid w-[85vw] md:left-[calc(50%-180px)] md:w-[360px] short:max-md:top-[calc(50%+80px)]">

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                className="[grid-area:1/1]"
                {...orbitDescriptionMotion}
              >
                <Description index={step} />
              </motion.div>
            </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}
