"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { useRef } from "react";
import type { ParallaxFrame } from "@/lib/content/slots";

gsap.registerPlugin(ScrollTrigger);

export function ParallaxGrid({
  title,
  frames
}: {
  title: string;
  frames: ParallaxFrame[];
}) {
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useGSAP(
    () => {
      const row = list.current;
      const root = section.current;
      if (!row || !root || typeof window === "undefined") return;
      const tween = gsap.fromTo(
        row,
        { x: 0 },
        {
          x: () => -Math.max(0, row.scrollWidth - window.innerWidth),
          ease: "none",
          invalidateOnRefresh: true,
          scrollTrigger: {
            trigger: row,
            start: "top center",
            end: "bottom top",
            scrub: true,
            invalidateOnRefresh: true
          }
        }
      );
      const onResize = () => ScrollTrigger.refresh();
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    },
    { scope: section, dependencies: [frames.length] }
  );

  return (
    <section ref={section} className="overflow-hidden py-16">
      <h2 className="px-6 font-serif text-5xl font-light tracking-tight">{title}</h2>
      <ul ref={list} className="mt-8 flex w-max gap-4 px-6">
        {frames.map((frame) => (
          <li
            key={`${frame.alt}-${frame.imageUrl}`}
            className="h-48 w-48 shrink-0 overflow-hidden rounded-lg bg-muted/20"
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
      </ul>
    </section>
  );
}
