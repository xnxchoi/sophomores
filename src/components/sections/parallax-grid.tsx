"use client";
import { useMotionValue, useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { ParallaxFrame } from "@/lib/content/slots";

/**
 * The row slides left as the page scrolls past it: from its top reaching the middle of the screen to its
 * bottom leaving the top, the same span the earlier GSAP ScrollTrigger scrub used. Motion's useScroll
 * reads the root scroll Lenis drives, so no second scroll system is needed (D3: Motion leads, Lenis
 * scrolls).
 */
export function ParallaxGrid({
  title,
  frames
}: {
  title: string;
  frames: ParallaxFrame[];
}) {
  const list = useRef<HTMLUListElement>(null);
  const travel = useMotionValue(0);

  useEffect(() => {
    const row = list.current;
    if (!row) return;
    const measure = () => travel.set(Math.max(0, row.scrollWidth - window.innerWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [travel, frames.length]);

  const { scrollYProgress } = useScroll({ target: list, offset: ["start center", "end start"] });
  const x = useTransform(() => -scrollYProgress.get() * travel.get());

  return (
    <section className="overflow-hidden py-16">
      <h2 className="px-6 font-serif text-5xl font-light tracking-tight">{title}</h2>
      <m.ul ref={list} style={{ x }} className="mt-8 flex w-max gap-4 px-6">
        {frames.map((frame) => (
          <li
            key={`${frame.alt}-${frame.imageUrl}`}
            className="port-wash h-48 w-48 shrink-0 overflow-hidden rounded-lg"
          >
            {frame.imageUrl ? (
              <Image
                src={frame.imageUrl}
                alt={frame.alt}
                width={frame.width}
                height={frame.height}
                className="h-full w-full object-cover"
              />
            ) : null}
          </li>
        ))}
      </m.ul>
    </section>
  );
}
