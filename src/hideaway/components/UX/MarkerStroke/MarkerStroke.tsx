"use client";

import { useId } from "react";
import * as m from "motion/react-m";
import { useInView, useReducedMotion, type Variants } from "motion/react";
import { useRef } from "react";

/**
 * Hand-drawn marker overlay primitive.
 * Procedurally generated SVG strokes with hover/scroll-driven draw-in.
 * To swap in a hand-drawn asset later, drop a matching variant SVG into
 * `./scribbles/<variant>.svg` and import it from a sibling file — the
 * procedural fallback below stays as the default.
 *
 * Reference vibe: Hero Collective marker overlays — felt-tip on print,
 * scribbled by a real human, layered on top of the digital type.
 */

export type MarkerStrokeVariant = "underline" | "circle" | "cross" | "tick";

export type MarkerStrokeProps = {
  variant?: MarkerStrokeVariant;
  /** Trigger: "hover" (parent :hover or aria-current), "in-view" (one-shot on enter), "always" (animates on mount). */
  trigger?: "hover" | "in-view" | "always";
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
};

// Each variant is a hand-feel path traced through a few inflection points.
// Slight wobble + non-uniform thickness via dasharray asymmetry.
const PATHS: Record<MarkerStrokeVariant, string> = {
  // Slightly wavy underline that overshoots on the right
  underline: "M 2 14 C 12 11, 28 13, 46 12 S 78 14, 96 12 S 130 13, 158 13",
  // Lasso-style circle, doesn't quite close
  circle:
    "M 80 6 C 50 6, 22 14, 14 32 S 18 64, 50 70 S 110 66, 122 50 S 122 22, 96 12 S 70 4, 60 8",
  // X mark
  cross: "M 6 6 L 38 38 M 38 6 L 6 38",
  // Quick tick
  tick: "M 6 22 L 18 32 L 36 6"
};

const VIEWBOXES: Record<MarkerStrokeVariant, string> = {
  underline: "0 0 160 18",
  circle: "0 0 132 76",
  cross: "0 0 44 44",
  tick: "0 0 44 38"
};

const variants: Variants = {
  rest: { pathLength: 0, opacity: 0.85 },
  draw: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
      opacity: { duration: 0.12 }
    }
  }
};

export function MarkerStroke({
  variant = "underline",
  trigger = "hover",
  color = "currentColor",
  strokeWidth = 2.4,
  className,
  style
}: MarkerStrokeProps) {
  const id = useId();
  const ref = useRef<SVGSVGElement>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { amount: 0.6, once: true });

  let animate: string;
  if (reduced || trigger === "always") animate = "draw";
  else if (trigger === "in-view") animate = inView ? "draw" : "rest";
  else animate = "rest"; // "hover" — parent toggles via CSS / data attribute

  return (
    <m.svg
      ref={ref}
      role="presentation"
      aria-hidden
      viewBox={VIEWBOXES[variant]}
      className={className}
      style={{
        overflow: "visible",
        pointerEvents: "none",
        ...style
      }}
      initial="rest"
      animate={animate}
      data-marker-variant={variant}
      data-marker-trigger={trigger}
    >
      <defs>
        <filter id={`rough-${id}`} x="-2%" y="-50%" width="104%" height="200%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            seed="3"
          />
          <feDisplacementMap in="SourceGraphic" scale="1.1" />
        </filter>
      </defs>
      <m.path
        d={PATHS[variant]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#rough-${id})`}
        variants={variants}
      />
    </m.svg>
  );
}
