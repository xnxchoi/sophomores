"use client";

import { cn } from "@/lib/utils";
import { Variants } from "motion/react";
import * as m from "motion/react-m";
import { CSSProperties, useMemo } from "react";

// ─── Blur-in text effect ─────────────────────────────────────────────────────
// Splits text into words (or characters) and staggers a blur+fade+translate-y
// animation across them. Designed for heading/subtitle polish in the Tour system.

type TextBlurInProps = {
  text: string;
  className?: string;
  /** Split by "word" (default) or "char" for finer granularity */
  splitBy?: "word" | "char";
  /** Base delay before animation starts (seconds) */
  delay?: number;
  /** Stagger between each segment (seconds) */
  stagger?: number;
  /** Vertical offset each segment starts from */
  yOffset?: number;
  /** Start blur amount in px */
  blurAmount?: number;
  /** Duration per segment */
  duration?: number;
  /** Render as this element */
  as?: "h1" | "h2" | "h3" | "p" | "span" | "div";
  /** Preserve whitespace/newlines in pre-line mode */
  preserveNewlines?: boolean;
  /** Inline styles passed to the container element */
  style?: CSSProperties;
};

const containerVariants: Variants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: {
      staggerChildren: stagger
    }
  })
};

export function TextBlurIn({
  text,
  className,
  splitBy = "word",
  delay = 0,
  stagger = 0.04,
  yOffset = 8,
  blurAmount = 8,
  duration = 0.45,
  as: Tag = "div",
  preserveNewlines = false,
  style
}: TextBlurInProps) {

  const segments = useMemo(() => {
    if (preserveNewlines) {
      // Split by newlines first, then by splitBy within each line
      return text.split("\n").map((line) =>
        splitBy === "char" ? line.split("") : line.split(/(\s+)/)
      );
    }
    const flat = splitBy === "char" ? text.split("") : text.split(/(\s+)/);
    return [flat];
  }, [text, splitBy, preserveNewlines]);

  const segmentVariants: Variants = useMemo(
    () => ({
      hidden: {
        opacity: 0,
        y: yOffset,
        filter: `blur(${blurAmount}px)`
      },
      visible: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        transition: {
          duration,
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      }
    }),
    [yOffset, blurAmount, duration]
  );

  // Motion component mapping
  const MTag = m[Tag] as typeof m.div;

  return (
    <MTag
      className={cn(preserveNewlines && "whitespace-pre-line", className)}
      style={style}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={stagger}
      transition={{ delayChildren: delay }}
    >
      {segments.map((line, lineIdx) => (
        <span key={lineIdx} className={preserveNewlines && lineIdx > 0 ? "block" : undefined}>
          {line.map((segment, i) => {
            // Whitespace-only segments render as-is
            if (/^\s+$/.test(segment)) {
              return <span key={`${lineIdx}-ws-${i}`}>{segment}</span>;
            }

            return (
              <m.span
                key={`${lineIdx}-${i}`}
                variants={segmentVariants}
                className="inline-block"
                style={{ willChange: "opacity, filter, transform" }}
              >
                {segment}
              </m.span>
            );
          })}
        </span>
      ))}
    </MTag>
  );
}
