"use client";

import { SPRING_EASE } from "@/constants/animations";
import { cn } from "@/lib/utils";
import { useNowPlaying } from "@/providers/HideawayFM/hooks";
import {
  MotionValue,
  SVGMotionProps,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform
} from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useId, useRef } from "react";
import { REEL_SPOKE_COUNT } from "../constants";
import { useTapeAnimation } from "../hooks/useTapeAnimation";

type TapeReelsProps = {
  diameter?: number;
  className?: string;
};

/**
 * OP-1 Field-inspired dual tape reel SVG.
 *
 * Two reels connected by a "tape" path. Supply reel (left) shrinks
 * as the track progresses; takeup reel (right) grows. Both rotate
 * via GSAP timelines driven by useTapeAnimation.
 *
 * SVG viewBox is 320x140 — gives room for two reels + tape path.
 */
export const TapeReels = ({ diameter = 120, className }: TapeReelsProps) => {
  const scopeRef = useRef<SVGSVGElement>(null);
  const supplyRef = useRef<SVGGElement>(null);
  const takeupRef = useRef<SVGGElement>(null);
  const maxWidth = useMotionValue(diameter * 2.67);
  const {} = useTapeAnimation(supplyRef, takeupRef, scopeRef);
  const nowPlaying = useNowPlaying();
  const progressMV = useMotionValue(nowPlaying.progress);
  useEffect(() => {
    progressMV.set(nowPlaying.progress);
  }, [nowPlaying.progress, progressMV]);
  const smoothProgressMV = useSpring(progressMV, SPRING_EASE.power4.inOut);

  // Reel radii: supply shrinks, takeup grows
  const minR = 18;
  const maxR = 48;
  const supplyR = useTransform(() => {
    const progress = smoothProgressMV.get();
    // return maxR - progress * (maxR - minR);
    return 38;
  });
  const takeupR = useTransform(() => {
    const progress = smoothProgressMV.get();

    // return minR + progress * (maxR - minR);
    return 38;
  });
  const hubR = 8;
  const smolHubr = useTransform(() => {
      return supplyR.get() * 0.45;
    }),
    smolHubrR = useTransform(() => takeupR.get() * 0.45);
  const cx1 = useMotionValue(80);
  const guidex1 = useTransform(() => cx1.get() + supplyR.get() + 8);
  const cx2 = useMotionValue(240);
  const guidex2 = useTransform(() => cx2.get() - takeupR.get() - 8); // takeup center x
  const cy = useMotionValue(70); // both centers y

  // Tape path between the two reels (tangent line approximation)

  const textMax = useTransform(() => cy.get() + maxR + 14);
  const tapeR1 = useTransform(() => {
      const progress = smoothProgressMV.get();
      const max = supplyR.get(),
        min = smolHubr.get();
      return max - progress * (max - min);
    }),
    tapeR2 = useTransform(() => {
      const progress = smoothProgressMV.get();
      const max = takeupR.get(),
        min = smolHubrR.get();
      return min + progress * (max - min);
    });
  const tapeId = useId(),
    tapeId2 = useId();
  const tapeWidth1 = useTransform(() => 2 * (tapeR1.get() - smolHubr.get())),
    tapeWidth2 = useTransform(() => 2 * (tapeR2.get() - smolHubrR.get()));
  const mp11 = useTransform(() => cx1.get() + hubR),
    mp12 = useTransform(() => cy.get() - hubR * 0.7),
    lp11 = useTransform(() => cx2.get() - hubR),
    lp12 = useTransform(() => cy.get() - hubR * 0.7),
    mp21 = useTransform(() => cx1.get() + hubR),
    mp22 = useTransform(() => cy.get() + hubR * 0.7),
    lp21 = useTransform(() => cx2.get() - hubR),
    lp22 = useTransform(() => cy.get() + hubR * 0.7);
  const tapeY1 = useMotionTemplate`M ${mp11} ${mp12} L ${lp11} ${lp12}`;
  const tapeY2 = useMotionTemplate`M ${mp21} ${mp22} L ${lp21} ${lp22}`;
  return (
    <m.svg
      ref={scopeRef}
      viewBox="0 0 320 140"
      className={cn("w-full select-none", className)}
      style={{ maxWidth }}
      aria-hidden="true"
    >
      <defs>
        <m.circle cx={cx1} id={tapeId} cy={cy} r={tapeR1} />
        <m.circle cx={cx2} cy={cy} r={tapeR2} id={tapeId2} />
        <m.clipPath id={"clip1"}>
          <m.use xlinkHref={`#${tapeId}`} />
        </m.clipPath>
        <m.clipPath id={"clip2"}>
          <m.use xlinkHref={`#${tapeId2}`} />
        </m.clipPath>
      </defs>
      {/* Tape path connecting reels */}
      <m.path
        d={tapeY1}
        stroke="var(--faded-fg)"
        strokeWidth="1"
        fill="none"
        opacity="0.3"
      />
      <m.path
        d={tapeY2}
        stroke="var(--faded-fg)"
        strokeWidth="1"
        fill="none"
        opacity="0.3"
      />

      {/* Guide heads */}
      <m.circle
        cx={guidex1}
        cy={cy}
        r="2"
        fill="var(--rouge-500)"
        opacity="0.7"
      />
      <m.circle
        cx={guidex2}
        cy={cy}
        r="2"
        fill="var(--rouge-500)"
        opacity="0.7"
      />

      {/* Supply reel (left) */}
      <g ref={supplyRef} style={{ transformOrigin: `0 0` }}>
        {/* Outer ring */}
        <m.circle
          cx={cx1}
          cy={cy}
          r={supplyR}
          fill="none"
          stroke="var(--faded-fg)"
          strokeWidth="1.5"
          opacity="0.6"
        />
        {/* Inner ring */}
        <m.circle
          cx={cx1}
          cy={cy}
          r={smolHubr}
          fill="var(--faded-fg)"
          stroke="var(--faded-fg)"
          strokeWidth="0.75"
          opacity="0.85"
        />
        {/* Tape reel*/}
        <m.circle
          cx={cx1}
          cy={cy}
          r={tapeR1}
          fill={"none"}
          clipPath={`url(#clip1)`}
          style={{
            strokeWidth: tapeWidth1,
            stroke: "var(--muted-faded-fg)",
            opacity: 0.5
          }}
        />
        {/* Hub */}
        <m.circle
          cx={cx1}
          cy={cy}
          r={hubR}
          fill="var(--off-bg)"
          stroke="var(--faded-fg)"
          strokeWidth="1.5"
        />
        {/* Center dot */}
        <m.circle cx={cx1} cy={cy} r="2.5" fill="var(--faded-fg)" />
        {/* Spokes */}
        {new Array(REEL_SPOKE_COUNT).fill(1).map((_, index) => {
          return (
            <Spoke
              cx={cx1}
              cy={cy}
              hubR={smolHubr}
              key={"spoke_" + index}
              r={supplyR}
              index={index}
              total={REEL_SPOKE_COUNT}
            />
          );
        })}
      </g>

      {/* Takeup reel (right) */}
      <g ref={takeupRef}>
        <m.circle
          cx={cx2}
          cy={cy}
          r={takeupR}
          fill="none"
          stroke="var(--faded-fg)"
          strokeWidth="1.5"
          opacity="0.6"
        />
        <m.circle
          cx={cx2}
          cy={cy}
          r={smolHubrR}
          fill="var(--faded-fg)"
          stroke="var(--faded-fg)"
          strokeWidth="0.75"
          opacity="0.85"
        />
        {/* Tape reel*/}
        <m.circle
          cx={cx2}
          cy={cy}
          r={tapeR2}
          fill={"none"}
          clipPath={`url(#clip2)`}
          style={{
            strokeWidth: tapeWidth2,
            stroke: "var(--muted-faded-fg)",
            clipRule: "evenodd",
            opacity: 0.5
          }}
        />
        <m.circle
          cx={cx2}
          cy={cy}
          r={hubR}
          fill="var(--off-bg)"
          stroke="var(--faded-fg)"
          strokeWidth="1.5"
        />
        <m.circle cx={cx2} cy={cy} r="2.5" fill="var(--faded-fg)" />
        {new Array(REEL_SPOKE_COUNT).fill(1).map((_, index) => {
          return (
            <Spoke
              cx={cx2}
              cy={cy}
              hubR={smolHubrR}
              key={"spoke_" + index}
              r={takeupR}
              index={index}
              total={REEL_SPOKE_COUNT}
            />
          );
        })}
      </g>

      {/* Labels */}
      <m.text
        x={cx1}
        y={textMax}
        textAnchor="middle"
        fill="var(--faded-fg)"
        fontSize="8"
        fontFamily="var(--font-mono)"
        letterSpacing="0.08em"
        opacity="0.5"
      >
        SUPPLY
      </m.text>
      <m.text
        x={cx2}
        y={textMax}
        textAnchor="middle"
        fill="var(--faded-fg)"
        fontSize="8"
        fontFamily="var(--font-mono)"
        letterSpacing="0.08em"
        opacity="0.5"
      >
        TAKE-UP
      </m.text>
    </m.svg>
  );
};
const Spoke = ({
  cx,
  cy,
  r,
  index,
  hubR,
  total = REEL_SPOKE_COUNT,
  ...props
}: SVGMotionProps<SVGLineElement> & {
  hubR: MotionValue<number>;
  cy: MotionValue<number>;
  cx: MotionValue<number>;
  r: MotionValue<number>;
  index: number;
  total?: number;
}) => {
  // Generate spoke lines for a reel

  const angle = (index * 360) / total;
  const rad = (angle * Math.PI) / 180;
  const x1 = useTransform(() => cx.get() + hubR.get() * Math.cos(rad)),
    y1 = useTransform(() => cy.get() + hubR.get() * Math.sin(rad)),
    x2 = useTransform(() => cx.get() + (r.get() - 2) * Math.cos(rad)),
    y2 = useTransform(() => cy.get() + (r.get() - 2) * Math.sin(rad));
  return (
    <m.line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="var(--faded-fg)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.5"
      {...props}
    />
  );
};
