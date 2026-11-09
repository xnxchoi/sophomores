"use client";
import { useTranslations } from "next-intl";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "cn";
import {
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
  type SVGMotionProps
} from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useId, useRef, type RefObject } from "react";

const SPOKES = 3;
const TURN_SECONDS = 8;

function useTapeAnimation(
  supplyRef: RefObject<SVGGElement | null>,
  takeupRef: RefObject<SVGGElement | null>,
  scopeRef: RefObject<SVGSVGElement | null>,
  playing: boolean
) {
  const supplyTL = useRef<gsap.core.Timeline | null>(null);
  const takeupTL = useRef<gsap.core.Timeline | null>(null);

  useGSAP(
    () => {
      if (!supplyRef.current || !takeupRef.current) return;

      supplyTL.current = gsap
        .timeline({ defaults: { ease: "none", repeat: -1, yoyo: false } })
        .to(supplyRef.current, {
          rotate: 360,
          duration: TURN_SECONDS,
          transformOrigin: "center center"
        });

      takeupTL.current = gsap
        .timeline({ defaults: { ease: "none", repeat: -1, yoyo: false } })
        .to(takeupRef.current, {
          rotate: 360,
          duration: TURN_SECONDS,
          transformOrigin: "center center"
        });

      supplyTL.current.timeScale(0);
      takeupTL.current.timeScale(0);
    },
    { scope: scopeRef }
  );

  useGSAP(
    () => {
      if (!supplyTL.current || !takeupTL.current) return;
      const active = playing ? 1 : 0;
      const ease = playing ? "power2.in" : "power2.out";
      gsap.to(supplyTL.current, { timeScale: active, duration: 0.3, ease, overwrite: true });
      gsap.to(takeupTL.current, { timeScale: active, duration: 0.3, ease, overwrite: true });
    },
    { dependencies: [playing], scope: scopeRef }
  );
}

function Spoke({
  cx,
  cy,
  r,
  index,
  hubR,
  total = SPOKES
}: SVGMotionProps<SVGLineElement> & {
  hubR: MotionValue<number>;
  cy: MotionValue<number>;
  cx: MotionValue<number>;
  r: MotionValue<number>;
  index: number;
  total?: number;
}) {
  const angle = (index * 360) / total;
  const rad = (angle * Math.PI) / 180;
  const x1 = useTransform(() => cx.get() + hubR.get() * Math.cos(rad));
  const y1 = useTransform(() => cy.get() + hubR.get() * Math.sin(rad));
  const x2 = useTransform(() => cx.get() + (r.get() - 2) * Math.cos(rad));
  const y2 = useTransform(() => cy.get() + (r.get() - 2) * Math.sin(rad));
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
    />
  );
}

/** Hideaway's flat dual-reel deck. Play eases both reels from a stop to one turn every 8 seconds. */
export function TapeReels({ playing, progress }: { playing: boolean; progress: number }) {
  const t = useTranslations("Interface.radio");
  const scopeRef = useRef<SVGSVGElement>(null);
  const supplyRef = useRef<SVGGElement>(null);
  const takeupRef = useRef<SVGGElement>(null);
  const maxWidth = useMotionValue(120 * 2.67);
  useTapeAnimation(supplyRef, takeupRef, scopeRef, playing);
  const progressMV = useMotionValue(progress);
  useEffect(() => {
    progressMV.set(progress);
  }, [progress, progressMV]);
  const smoothProgress = useSpring(progressMV, { stiffness: 400, damping: 48, mass: 1 });

  const supplyR = useMotionValue(38);
  const takeupR = useMotionValue(38);
  const hubR = 8;
  const smolHub = useTransform(() => supplyR.get() * 0.45);
  const smolHubRight = useTransform(() => takeupR.get() * 0.45);
  const cx1 = useMotionValue(80);
  const cx2 = useMotionValue(240);
  const cy = useMotionValue(70);
  const guideLeft = useTransform(() => cx1.get() + supplyR.get() + 8);
  const guideRight = useTransform(() => cx2.get() - takeupR.get() - 8);
  const labelY = useTransform(() => cy.get() + 48 + 14);
  const tapeR1 = useTransform(() => {
    const max = supplyR.get();
    const min = smolHub.get();
    return max - smoothProgress.get() * (max - min);
  });
  const tapeR2 = useTransform(() => {
    const max = takeupR.get();
    const min = smolHubRight.get();
    return min + smoothProgress.get() * (max - min);
  });
  const tapeId = useId();
  const tapeId2 = useId();
  const tapeWidth1 = useTransform(() => 2 * (tapeR1.get() - smolHub.get()));
  const tapeWidth2 = useTransform(() => 2 * (tapeR2.get() - smolHubRight.get()));
  const topLeftX = useTransform(() => cx1.get() + hubR);
  const topLeftY = useTransform(() => cy.get() - hubR * 0.7);
  const topRightX = useTransform(() => cx2.get() - hubR);
  const bottomLeftY = useTransform(() => cy.get() + hubR * 0.7);
  const tapeTop = useMotionTemplate`M ${topLeftX} ${topLeftY} L ${topRightX} ${topLeftY}`;
  const tapeBottom = useMotionTemplate`M ${topLeftX} ${bottomLeftY} L ${topRightX} ${bottomLeftY}`;

  return (
    <m.svg ref={scopeRef} viewBox="0 0 320 140" className={cn("w-full select-none")} style={{ maxWidth }} aria-hidden="true">
      <defs>
        <m.circle cx={cx1} id={tapeId} cy={cy} r={tapeR1} />
        <m.circle cx={cx2} cy={cy} r={tapeR2} id={tapeId2} />
        <m.clipPath id="clip1">
          <m.use href={`#${tapeId}`} />
        </m.clipPath>
        <m.clipPath id="clip2">
          <m.use href={`#${tapeId2}`} />
        </m.clipPath>
      </defs>
      <m.path d={tapeTop} stroke="var(--faded-fg)" strokeWidth="1" fill="none" opacity="0.3" />
      <m.path d={tapeBottom} stroke="var(--faded-fg)" strokeWidth="1" fill="none" opacity="0.3" />
      <m.circle cx={guideLeft} cy={cy} r="2" fill="var(--rouge-500)" opacity="0.7" />
      <m.circle cx={guideRight} cy={cy} r="2" fill="var(--rouge-500)" opacity="0.7" />
      <g ref={supplyRef} style={{ transformOrigin: "0 0" }}>
        <m.circle cx={cx1} cy={cy} r={supplyR} fill="none" stroke="var(--faded-fg)" strokeWidth="1.5" opacity="0.6" />
        <m.circle cx={cx1} cy={cy} r={smolHub} fill="var(--faded-fg)" stroke="var(--faded-fg)" strokeWidth="0.75" opacity="0.85" />
        <m.circle cx={cx1} cy={cy} r={tapeR1} fill="none" clipPath="url(#clip1)" style={{ strokeWidth: tapeWidth1, stroke: "var(--muted-faded-fg)", opacity: 0.5 }} />
        <m.circle cx={cx1} cy={cy} r={hubR} fill="var(--off-bg)" stroke="var(--faded-fg)" strokeWidth="1.5" />
        <m.circle cx={cx1} cy={cy} r="2.5" fill="var(--faded-fg)" />
        {Array.from({ length: SPOKES }, (_, index) => (
          <Spoke key={index} cx={cx1} cy={cy} hubR={smolHub} r={supplyR} index={index} />
        ))}
      </g>
      <g ref={takeupRef}>
        <m.circle cx={cx2} cy={cy} r={takeupR} fill="none" stroke="var(--faded-fg)" strokeWidth="1.5" opacity="0.6" />
        <m.circle cx={cx2} cy={cy} r={smolHubRight} fill="var(--faded-fg)" stroke="var(--faded-fg)" strokeWidth="0.75" opacity="0.85" />
        <m.circle cx={cx2} cy={cy} r={tapeR2} fill="none" clipPath="url(#clip2)" style={{ strokeWidth: tapeWidth2, stroke: "var(--muted-faded-fg)", opacity: 0.5 }} />
        <m.circle cx={cx2} cy={cy} r={hubR} fill="var(--off-bg)" stroke="var(--faded-fg)" strokeWidth="1.5" />
        <m.circle cx={cx2} cy={cy} r="2.5" fill="var(--faded-fg)" />
        {Array.from({ length: SPOKES }, (_, index) => (
          <Spoke key={index} cx={cx2} cy={cy} hubR={smolHubRight} r={takeupR} index={index} />
        ))}
      </g>
      <m.text x={cx1} y={labelY} textAnchor="middle" fill="var(--faded-fg)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.08em" opacity="0.5">
        {t("supply")}
      </m.text>
      <m.text x={cx2} y={labelY} textAnchor="middle" fill="var(--faded-fg)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.08em" opacity="0.5">
        {t("takeUp")}
      </m.text>
    </m.svg>
  );
}
