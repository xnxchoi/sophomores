"use client";

import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
import { useRef } from "react";
import Image from "next/image";

/**
 * Scroll-pinned story blocks for a Tape page.
 *
 * Composed by hand-crafted Tape pages (`/radio/tapes/vol-NNN/`). Each
 * volume passes its own block list — content is fully art-directed
 * per Tape, not templated from a CMS array.
 *
 * The layout alternates text/image columns; passing `imageSide="left"`
 * on a block flips the order at lg+. Pass an image src for a real
 * photograph or omit it for a quiet typographic block.
 */

export interface StoryBlock {
  eyebrow: string;
  heading: string;
  body: string;
  /** Optional photograph for the block. When omitted, the image column
      collapses and the text column expands to a single editorial column. */
  image?: {
    src: string;
    alt: string;
  };
  /** Which side the image sits on at lg+. Defaults to "right". */
  imageSide?: "left" | "right";
}

interface TapeStoryProps {
  blocks: StoryBlock[];
}

export function TapeStory({ blocks }: TapeStoryProps) {
  return (
    <div className="relative">
      <div className="mx-auto max-w-7xl px-6 xl:px-10">
        <div className="h-px w-full border-t border-border/20" />
      </div>

      {blocks.map((block, i) => (
        <Block key={`${block.eyebrow}-${i}`} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: StoryBlock }) {
  const blockRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: blockRef,
    offset: ["start 85%", "start 30%"]
  });

  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], ["3rem", "0rem"]);

  const hasImage = Boolean(block.image);
  const imageOnLeft = block.imageSide === "left";

  return (
    <m.div
      ref={blockRef}
      style={{ opacity, y }}
      className="mx-auto max-w-7xl px-6 py-24 xl:px-10 xl:py-32"
    >
      {hasImage ? (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 xl:gap-24">
          <div className={`lg:col-span-6 ${imageOnLeft ? "lg:order-2" : ""}`}>
            <p className="mb-4 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/50 uppercase xl:text-xs">
              {block.eyebrow}
            </p>
            <h2 className="mb-6 text-xl font-light tracking-tight xl:text-2xl 2xl:text-3xl">
              {block.heading}
            </h2>
            <p className="max-w-prose font-sans text-[11px] leading-relaxed text-muted-foreground/70 xl:text-xs">
              {block.body}
            </p>
          </div>
          <div
            className={`relative aspect-[4/3] overflow-hidden rounded-sm border border-border/20 bg-muted/10 lg:col-span-6 ${
              imageOnLeft ? "lg:order-1" : ""
            }`}
          >
            <Image
              src={block.image!.src}
              alt={block.image!.alt}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl">
          <p className="mb-4 font-sans text-[10px] tracking-[0.2em] text-muted-foreground/50 uppercase xl:text-xs">
            {block.eyebrow}
          </p>
          <h2 className="mb-6 text-xl font-light tracking-tight xl:text-2xl 2xl:text-3xl">
            {block.heading}
          </h2>
          <p className="font-sans text-[12px] leading-relaxed text-muted-foreground/70 xl:text-[13px]">
            {block.body}
          </p>
        </div>
      )}
    </m.div>
  );
}
