"use client";

import * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import * as m from "motion/react-m";
import {
  animate,
  MotionValue,
  SVGMotionProps,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform
} from "motion/react";

import { cn } from "@/lib/utils";

import {
  closestIndex,
  DEFAULT_TICK_SPRING,
  magnifyTick,
  type TickSpringConfig
} from "./_shared/magnify";
import type { TickIndicatorMode } from "./TickIndicator";
import { useSyncedMotionValue } from "./useSyncedMotionValue";

export interface TickDialProps extends Omit<
  SVGMotionProps<SVGSVGElement>,
  "role"
> {
  value: number;
  max?: number;
  mode?: TickIndicatorMode;
  ticks?: number;
  size?: number;
  tickLength?: number;
  focalExtension?: number;
  tickWidth?: number;
  startAngle?: number;
  endAngle?: number;
  magnify?: boolean;
  magnifyRadius?: number;
  magnifyStrength?: number;
  magnifyAtEnds?: boolean;
  accent?: string;
  accentIntensity?: number;
  entrance?: boolean;
  entranceStagger?: number;
  springConfig?: Partial<TickSpringConfig>;
  ariaValueText?: string;
}

function TickDial({
  value: valueProp,
  max = 1,
  mode = "fill",
  ticks = 45,
  size = 140,
  tickLength: tickLengthProp = 8,
  focalExtension: focalExtensionProp = 5,
  tickWidth: tickWidthProp = 1,
  startAngle = -90,
  endAngle = 270,
  magnify: magnifyProp,
  magnifyRadius: magnifyRadiusProp = 4,
  magnifyStrength: magnifyStrengthProp = 0.6,
  magnifyAtEnds = false,
  accent,
  accentIntensity = 0.5,
  entrance = false,
  entranceStagger = 16,
  springConfig,
  ariaValueText,
  className,
  ...rest
}: TickDialProps) {
  const spring: TickSpringConfig = { ...DEFAULT_TICK_SPRING, ...springConfig };

  const value = useSyncedMotionValue(valueProp);
  const maxMv = useSyncedMotionValue(max);
  const tickLength = useSyncedMotionValue(tickLengthProp);
  const focalExtension = useSyncedMotionValue(focalExtensionProp);
  const tickWidth = useSyncedMotionValue(tickWidthProp);
  const magnifyRadius = useSyncedMotionValue(magnifyRadiusProp);
  const magnifyStrength = useSyncedMotionValue(magnifyStrengthProp);

  const shouldMagnify = magnifyProp ?? mode === "focus";

  const center = size / 2;
  const outerRadius = useTransform(tickWidth, (w) => center - w);

  const sweep = endAngle - startAngle;
  const isClosedLoop = Math.abs(sweep) >= 359.9;
  const step = useMemo(
    () =>
      Math.abs(sweep) >= 359.9 ? sweep / ticks : sweep / Math.max(1, ticks - 1),
    [ticks, sweep]
  );

  const normalized = useTransform(() => {
    const mx = maxMv.get();
    return mx > 0 ? value.get() / mx : 0;
  });
  const focalIndex = useTransform(normalized, (v) => closestIndex(v, ticks));
  const atEnd = useTransform(() => {
    const v = value.get();
    const mx = maxMv.get();
    return v <= 0 || (mx > 0 && v >= mx);
  });

  const items = useMemo(
    () => Array.from({ length: ticks }, (_, index) => index),
    [ticks]
  );

  return (
    <m.svg
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={valueProp}
      aria-valuetext={ariaValueText}
      data-slot="tick-dial"
      data-mode={mode}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn("text-foreground", className)}
      {...rest}
    >
      <g transform={`translate(${center} ${center})`}>
        {items.map((index) => (
          <TickMark
            key={index}
            index={index}
            mode={mode}
            focalIndex={focalIndex}
            atEnd={atEnd}
            magnifyAtEnds={magnifyAtEnds}
            outerRadius={outerRadius}
            shouldMagnify={shouldMagnify}
            magnifyRadius={magnifyRadius}
            magnifyStrength={magnifyStrength}
            magnifyStrengthValue={magnifyStrengthProp}
            tickLength={tickLength}
            focalExtension={focalExtension}
            tickWidth={tickWidth}
            startAngle={startAngle}
            step={step}
            accent={accent}
            accentIntensity={accentIntensity}
            entrance={entrance}
            entranceStagger={entranceStagger}
            spring={spring}
          />
        ))}
      </g>
    </m.svg>
  );
}

interface TickMarkProps {
  index: number;
  mode: TickIndicatorMode;
  focalIndex: MotionValue<number>;
  atEnd: MotionValue<boolean>;
  magnifyAtEnds: boolean;
  outerRadius: MotionValue<number>;
  shouldMagnify: boolean;
  magnifyRadius: MotionValue<number>;
  magnifyStrength: MotionValue<number>;
  magnifyStrengthValue: number;
  tickLength: MotionValue<number>;
  focalExtension: MotionValue<number>;
  tickWidth: MotionValue<number>;
  startAngle: number;
  step: number;
  accent?: string;
  accentIntensity: number;
  entrance: boolean;
  entranceStagger: number;
  spring: TickSpringConfig;
}

function TickMark({
  index,
  mode,
  focalIndex,
  atEnd,
  magnifyAtEnds,
  outerRadius,
  shouldMagnify,
  magnifyRadius,
  magnifyStrength,
  magnifyStrengthValue,
  tickLength,
  focalExtension,
  tickWidth,
  startAngle,
  step,
  accent,
  accentIntensity,
  entrance,
  entranceStagger,
  spring
}: TickMarkProps) {
  const { stiffness, damping, mass } = spring;
  const elementRef = useRef<SVGLineElement>(null);
  useEffect(() => {
    const apply = (f: number) => {
      const el = elementRef.current;
      if (!el) return;
      if (index === f) el.setAttribute("data-focal", "");
      else el.removeAttribute("data-focal");
    };
    apply(focalIndex.get());
    return focalIndex.on("change", apply);
  }, [focalIndex, index]);

  const entranceMv = useMotionValue(entrance ? 0 : 1);
  useEffect(() => {
    if (!entrance) {
      entranceMv.set(1);
      return;
    }
    entranceMv.set(0);
    let controls: ReturnType<typeof animate> | undefined;
    const timer = setTimeout(() => {
      controls = animate(entranceMv, 1, {
        type: "spring",
        stiffness,
        damping,
        mass
      });
    }, index * entranceStagger);
    return () => {
      clearTimeout(timer);
      controls?.stop();
    };
  }, [entrance, entranceStagger, entranceMv, index, stiffness, damping, mass]);

  const magnifyActive = useTransform(
    () => shouldMagnify && (magnifyAtEnds || !atEnd.get())
  );

  const magnifyResult = useTransform(() => {
    if (!magnifyActive.get()) return { scaleY: 1, opacity: 1 };
    return magnifyTick(index, {
      focalIndex: focalIndex.get(),
      radius: magnifyRadius.get(),
      strength: magnifyStrength.get()
    });
  });

  const rawScaleY = useTransform(magnifyResult, (r) => r.scaleY);
  const rawOpacityLift = useTransform(magnifyResult, (r) => r.opacity);

  const suppressFocalExtension = useTransform(
    () => !magnifyAtEnds && atEnd.get()
  );

  const targetLength = useTransform(() => {
    const focal = index === focalIndex.get();
    const extension =
      focal && !suppressFocalExtension.get() ? focalExtension.get() : 0;
    const base = tickLength.get() + extension;
    const extra = focal ? 0 : (rawScaleY.get() - 1) * tickLength.get();
    return base + extra;
  });

  const targetStrokeOpacity = useTransform(() => {
    const focal = index === focalIndex.get();
    const before = index < focalIndex.get();
    if (mode === "fill") {
      return focal ? 1 : before ? 0.7 : 0.1;
    }
    return focal ? 1 : Math.min(1, 0.25 * rawOpacityLift.get());
  });

  const lengthBase = useSpring(targetLength, spring);
  const strokeOpacityBase = useSpring(targetStrokeOpacity, spring);

  const totalLength = useTransform(() => lengthBase.get() * entranceMv.get());
  const strokeOpacity = useTransform(
    () => strokeOpacityBase.get() * entranceMv.get()
  );

  const y1 = useTransform(outerRadius, (r) => -r);
  const y2 = useTransform(() => -outerRadius.get() + totalLength.get());

  const accentWeight = useTransform(() => {
    if (!accent) return 0;
    if (index === focalIndex.get()) return 1;
    if (!magnifyActive.get()) return 0;
    if (magnifyStrengthValue <= 0) return 0;
    const lift = magnifyResult.get().scaleY - 1;
    return Math.min(1, Math.max(0, lift / magnifyStrengthValue));
  });

  const accentPctString = useTransform(
    accentWeight,
    (v) => `${Math.round(v * accentIntensity * 1000) / 10}%`
  );
  const accentedStroke = useMotionTemplate`color-mix(in oklch, ${accent ?? "transparent"} ${accentPctString}, currentColor)`;
  const stroke = accent ? accentedStroke : "currentColor";

  const angle = startAngle + index * step;

  return (
    <m.line
      ref={elementRef}
      x1={0}
      x2={0}
      y1={y1}
      y2={y2}
      stroke={stroke}
      strokeWidth={tickWidth}
      strokeLinecap="butt"
      strokeOpacity={strokeOpacity}
      transform={`rotate(${angle})`}
      data-tick={index}
    />
  );
}

export { TickDial };
