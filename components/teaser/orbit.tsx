"use client";
import { useRef, useState } from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform
} from "motion/react";
import type { ReactNode } from "react";
import { principles } from "@/lib/teaser/content";
import {
  createTimeline,
  scrollChapters,
  type ChapterId
} from "@/lib/teaser/choreography";
import { chapterGeometry } from "@/lib/teaser/step-motion";
import { cn } from "@/lib/utils";

function OrbitPoint({
  index,
  children
}: {
  index: number;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute size-4",
        index === 0 && "-top-2 left-[calc(50%-8px)]",
        index === 1 && "top-[calc(50%-8px)] -right-2 rotate-90",
        index === 2 && "-bottom-2 left-[calc(50%-8px)] rotate-180"
      )}
    >
      {children}
    </div>
  );
}

function Description({ index }: { index: number }) {
  return (
    <>
      <h2 className="hidden">{principles[index].title}</h2>
      <p className="text-teaser-body text-center font-sans uppercase short:max-md:text-base short:max-md:leading-[1.1]">
        {principles[index].body}
      </p>
    </>
  );
}

export function Orbit({ onActive }: { onActive: (id: ChapterId) => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress: activityProgress } = useScroll({
    target: ref,
    offset: ["start 40%", "end 40%"]
  });
  useMotionValueEvent(activityProgress, "change", (value) => {
    if (value > 0 && value < 1) onActive("how");
  });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"]
  });

  const [step, setStep] = useState(0);
  const position = useMotionValue(0);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const next = progress < 0.25 ? 0 : progress < 0.8 ? 1 : 2;
    if (next !== step) {
      setStep(next);
      animate(position, next, { duration: 0.8, ease: [0.25, 0.35, 0.35, 1] });
    }
  });

  const rotate = useTransform(
    position,
    [0, principles.length - 1],
    [0, -(principles.length - 1) * 90]
  );
  return (
    <motion.section
      ref={ref}
      id="how"
      className="bg-black"
      style={{
        height: `${chapterGeometry(createTimeline(scrollChapters.how).travelVh).heightVh}svh`
      }}
      aria-label="The idea"
    >
      <div className="sticky top-0 h-svh overflow-hidden">
        <div
          className="absolute top-[calc(50%-64px)] left-1/2 h-32 border-l border-dashed border-l-teaser-muted"
          aria-hidden="true"
        />
        <motion.div
          className="absolute top-1/2 -left-[32vw] size-[164vw] rounded-full border border-white"
          style={{ rotate: rotate }}
        >
          {principles.map((principle, index) => (
            <OrbitPoint key={principle.title} index={index}>
              <span
                className="block size-4"
                style={{ background: principle.color }}
                aria-hidden="true"
              />
              <h2 className="font-teaser-serif absolute bottom-[136px] left-1/2 w-[85vw] -translate-x-1/2 text-center text-2xl leading-[1.4] whitespace-pre-line md:w-[360px] short:max-md:bottom-[100px]">
                {principle.title}
              </h2>
            </OrbitPoint>
          ))}
        </motion.div>
        <div className="absolute top-[calc(50%+120px)] left-[7.5vw] grid w-[85vw] md:left-[calc(50%-180px)] md:w-[360px] short:max-md:top-[calc(50%+80px)]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              className="[grid-area:1/1]"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: -60,
                transition: { duration: 0.6, delay: 0.2 }
              }}
              transition={{ duration: 1.2, ease: [0.5, 0, 0, 1] }}
            >
              <Description index={step} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  );
}
