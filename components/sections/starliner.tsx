"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { useInView } from "motion/react";
import { useEffect, useRef } from "react";

gsap.registerPlugin(CustomEase);
CustomEase.create("star", ".12,.23,.5,1");

const STAR_ORIGINS = [
  { left: -110, top: 40 },
  { left: -100, top: 70 },
  { left: -120, top: 140 },
  { left: -120, top: 160 },
  { left: -120, top: "52.6316%" },
  { left: -100, top: -25 },
  { left: -10, top: -25 },
  { left: 50, top: -40 },
  { left: -90, top: -40 },
  { left: 200, top: -25 },
  { left: 290, top: -40 },
  { left: 120, top: -40 },
  { left: 140, top: -40 },
  { left: -100, top: "50%" },
  { left: -120, top: 10 },
  { left: 140, top: -25 },
  { left: 140, top: -25 }
] as const;

const STAR_MOTION = [
  { scale: 1, repeatDelay: 1.5, duration: 8 },
  { scale: 0.6, delay: 0.2, duration: 5.6, repeatDelay: 1 },
  { scale: 1.4, delay: 0.6, duration: 7, repeatDelay: -0.6 },
  { scale: 1.2, delay: 0.2, repeatDelay: 1, duration: 5.9 },
  { scale: 0.9, duration: 2.3, repeatDelay: 5.4 },
  { scale: 0.7, delay: 2.4, duration: 6, repeatDelay: 2 },
  { scale: 1.1, delay: 2.4, duration: 6, repeatDelay: 3.2 },
  { delay: 1, duration: 5, repeatDelay: 1 },
  { scale: 1.2, delay: 1, duration: 6, repeatDelay: 4.5 },
  { scale: 1, delay: 3, duration: 5.6, repeatDelay: 3 },
  { scale: 1, delay: 1, duration: 5, repeatDelay: 2 },
  { scale: 0.6, delay: 3, duration: 5.6, repeatDelay: 3 },
  { scale: 0.9, delay: 2.3, duration: 5.8, repeatDelay: 2 },
  { delay: 1, duration: 5, scale: 0.9, repeatDelay: 1.7 },
  { scale: 1.2, delay: 0.6, duration: 7, repeatDelay: 0.6 },
  { scale: 0.6, delay: 2, duration: 8, repeatDelay: 2 },
  { scale: 0.7, delay: 2, duration: 7, repeatDelay: 2 }
] as const;

/** Travelling lines over the repeating star field. */
export function Starliner() {
  const frame = useRef<HTMLDivElement>(null);
  const twinkle = useRef<HTMLDivElement>(null);
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
              ...STAR_MOTION[index]
            }
          ),
          "<"
        );
      });
      const twinkleTween = twinkle.current
        ? gsap.fromTo(
            twinkle.current,
            { opacity: 0 },
            { opacity: 0.55, duration: 2.8, ease: "sine.inOut", yoyo: true, repeat: -1 }
          )
        : null;
      const sync = () => {
        const paused = document.visibilityState === "hidden" || !inViewRef.current;
        if (paused) {
          timeline.pause();
          twinkleTween?.pause();
        } else {
          timeline.play();
          twinkleTween?.play();
        }
      };
      const onHide = () => sync();
      document.addEventListener("visibilitychange", onHide);
      sync();
      return () => {
        document.removeEventListener("visibilitychange", onHide);
        timeline.kill();
        twinkleTween?.kill();
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
    <div ref={frame} className="relative mx-auto h-72 w-full max-w-md overflow-hidden rounded-[10px] bg-black">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'url("/assets/starliner-backdrop.svg")',
          backgroundRepeat: "repeat",
          backgroundSize: "220px auto",
          backgroundPosition: "center",
          opacity: 0.85
        }}
      />
      <div
        ref={twinkle}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'url("/assets/starliner-backdrop.svg")',
          backgroundRepeat: "repeat",
          backgroundSize: "220px auto",
          backgroundPosition: "center",
          mixBlendMode: "screen",
          opacity: 0
        }}
      />
      <div ref={container} className="absolute inset-2.5 overflow-hidden">
        {STAR_ORIGINS.map((origin, index) => (
          <div
            key={index}
            ref={(element) => {
              lines.current[index] = element;
            }}
            className="starline absolute h-px w-[100px]"
            style={{ left: origin.left, top: origin.top, transform: "rotate(22.6deg)" }}
          >
            <div className="port-star-tail relative h-px w-[100px] overflow-visible">
              <div className="port-star-head absolute top-0 right-0 h-[2px] w-[2px] rounded-sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
