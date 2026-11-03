"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { useInView } from "motion/react";
import { useEffect, useRef } from "react";

gsap.registerPlugin(CustomEase);
CustomEase.create("star", ".12,.23,.5,1");

const LINE_COUNT = 17;

const LINE_MOTION = [
  { scale: 1, repeatDelay: 1.5, duration: 8 },
  { scale: 0.6, delay: 0.2, duration: 5.6, repeatDelay: 1 },
  { scale: 1.4, delay: 0.6, duration: 7, repeatDelay: -0.6 }
];

/** The travelling lines. The original star-field SVG backdrop stays in Hideaway. */
export function Starliner() {
  const frame = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const lines = useRef<Array<HTMLDivElement | null>>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const inView = useInView(frame, { margin: "200px 0px" });
  const inViewRef = useRef(false);

  useGSAP(
    () => {
      const root = container.current;
      if (!root) return;
      const width = root.offsetWidth;
      const height = root.offsetHeight;
      if (width === 0 || height === 0) return;
      const timeline = gsap.timeline({ repeat: -1 });
      timelineRef.current = timeline;
      lines.current.forEach((line, index) => {
        if (!line) return;
        timeline.add(
          gsap.fromTo(
            line,
            { opacity: 1, rotation: 22.6 },
            {
              ease: "star",
              repeat: -1,
              rotation: "5%",
              opacity: 0,
              x: width + 110,
              y: height * 2.5,
              ...LINE_MOTION[index % LINE_MOTION.length]
            }
          ),
          "<"
        );
      });
      const sync = () => {
        if (document.visibilityState === "hidden" || !inViewRef.current) timeline.pause();
        else timeline.play();
      };
      const onHide = () => sync();
      document.addEventListener("visibilitychange", onHide);
      sync();
      return () => {
        document.removeEventListener("visibilitychange", onHide);
        timeline.kill();
        timelineRef.current = null;
      };
    },
    { scope: container }
  );

  useEffect(() => {
    inViewRef.current = inView;
    const timeline = timelineRef.current;
    if (!timeline) return;
    if (document.visibilityState === "hidden" || !inView) timeline.pause();
    else timeline.play();
  }, [inView]);

  return (
    <div ref={frame} className="relative h-64 overflow-hidden rounded-[10px] bg-black">
      <div ref={container} className="absolute inset-2.5 overflow-hidden">
        {Array.from({ length: LINE_COUNT }, (_, index) => (
          <div
            key={index}
            ref={(element) => {
              lines.current[index] = element;
            }}
            className="absolute h-px w-[100px]"
            style={{
              background:
                "linear-gradient(270deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0) 100%)"
            }}
          />
        ))}
      </div>
    </div>
  );
}
