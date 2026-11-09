"use client";

import * as React from "react";
import { useEffect, useMemo, useRef } from "react";
import * as m from "motion/react-m";
import {
  animate,
  MotionValue,
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
import { useSyncedMotionValue } from "./useSyncedMotionValue";

export type TickIndicatorMode = "fill" | "focus";

export interface TickIndicatorProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "role"
> {
  value: number;
  max?: number;
  mode?: TickIndicatorMode;
  ticks?: number;
  tickSpacing?: number;
  tickWidth?: number;
  tickHeight?: number;
  focalHeight?: number;
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

function TickIndicator({
  value: valueProp,
  max = 1,
  mode = "fill",
  ticks = 36,
  tickSpacing = 3,
  tickWidth = 1,
  tickHeight: tickHeightProp = 6,
  focalHeight: focalHeightProp = 12,
  magnify: magnifyProp = true,
  magnifyRadius: magnifyRadiusProp = 4,
  magnifyStrength: magnifyStrengthProp = 0.55,
  magnifyAtEnds = false,
  accent,
  accentIntensity = 0.5,
  entrance = false,
  entranceStagger = 18,
  springConfig,
  ariaValueText,
  className,
  ...rest
}: TickIndicatorProps) {
  const spring: TickSpringConfig = { ...DEFAULT_TICK_SPRING, ...springConfig };

  const value = useSyncedMotionValue(valueProp);
  const maxMv = useSyncedMotionValue(max);
  const tickHeight = useSyncedMotionValue(tickHeightProp);
  const focalHeight = useSyncedMotionValue(focalHeightProp);
  const magnifyRadius = useSyncedMotionValue(magnifyRadiusProp);
  const magnifyStrength = useSyncedMotionValue(magnifyStrengthProp);

  const shouldMagnify = magnifyProp ?? mode === "focus";

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

  const frameHeight = Math.max(tickHeightProp, focalHeightProp);

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={valueProp}
      aria-valuetext={ariaValueText}
      data-slot="tick-indicator"
      data-mode={mode}
      className={cn("inline-flex items-center", className)}
      style={{
        gap: `${tickSpacing - tickWidth}px`,
        height: `${frameHeight}px`
      }}
      {...rest}
    >
      {items.map((index) => (
        <TickBar
          key={index}
          index={index}
          mode={mode}
          focalIndex={focalIndex}
          atEnd={atEnd}
          magnifyAtEnds={magnifyAtEnds}
          shouldMagnify={shouldMagnify}
          magnifyRadius={magnifyRadius}
          magnifyStrength={magnifyStrength}
          magnifyStrengthValue={magnifyStrengthProp}
          tickHeight={tickHeight}
          focalHeight={focalHeight}
          tickWidth={tickWidth}
          accent={accent}
          accentIntensity={accentIntensity}
          entrance={entrance}
          entranceStagger={entranceStagger}
          spring={spring}
        />
      ))}
    </div>
  );
}

interface TickBarProps {
  index: number;
  mode: TickIndicatorMode;
  focalIndex: MotionValue<number>;
  atEnd: MotionValue<boolean>;
  magnifyAtEnds: boolean;
  shouldMagnify: boolean;
  magnifyRadius: MotionValue<number>;
  magnifyStrength: MotionValue<number>;
  magnifyStrengthValue: number;
  tickHeight: MotionValue<number>;
  focalHeight: MotionValue<number>;
  tickWidth: number;
  accent?: string;
  accentIntensity: number;
  entrance: boolean;
  entranceStagger: number;
  spring: TickSpringConfig;
}

function TickBar({
  index,
  mode,
  focalIndex,
  atEnd,
  magnifyAtEnds,
  shouldMagnify,
  magnifyRadius,
  magnifyStrength,
  magnifyStrengthValue,
  tickHeight,
  focalHeight,
  tickWidth,
  accent,
  accentIntensity,
  entrance,
  entranceStagger,
  spring
}: TickBarProps) {
  const { stiffness, damping, mass } = spring;
  const elementRef = useRef<HTMLSpanElement>(null);
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

  const targetScaleY = useTransform(() => {
    const focal = index === focalIndex.get();
    return focal ? 1 : magnifyResult.get().scaleY;
  });

  const targetOpacity = useTransform(() => {
    const focal = index === focalIndex.get();
    const before = index < focalIndex.get();
    if (mode === "fill") {
      return focal ? 1 : before ? 0.7 : 0.1;
    }
    const magnified = magnifyResult.get().opacity;
    return focal ? 1 : Math.min(1, 0.25 * magnified);
  });

  const suppressFocalHeight = useTransform(() => !magnifyAtEnds && atEnd.get());

  const targetHeight = useTransform(() => {
    const focal = index === focalIndex.get();
    if (focal && !suppressFocalHeight.get()) return focalHeight.get();
    return tickHeight.get();
  });

  const scaleY = useSpring(targetScaleY, spring);
  const opacityBase = useSpring(targetOpacity, spring);
  const height = useSpring(targetHeight, spring);

  const opacity = useTransform(() => opacityBase.get() * entranceMv.get());

  const accentWeight = useTransform(() => {
    if (!accent) return 0;
    if (index === focalIndex.get()) return 1;
    if (!magnifyActive.get()) return 0;
    const strengthAtCenter = magnifyStrengthValue;
    if (strengthAtCenter <= 0) return 0;
    const lift = magnifyResult.get().scaleY - 1;
    return Math.min(1, Math.max(0, lift / strengthAtCenter));
  });

  const accentPctString = useTransform(
    accentWeight,
    (v) => `${Math.round(v * accentIntensity * 1000) / 10}%`
  );
  const background = useMotionTemplate`color-mix(in oklch, ${accent ?? "transparent"} ${accentPctString}, var(--n-s-fg))`;

  return (
    <m.span
      ref={elementRef}
      aria-hidden
      data-tick={index}
      className={cn(
        "block shrink-0 rounded-[0.5px] text-nav-foreground",
        !accent && "bg-nav-foreground"
      )}
      style={{
        width: tickWidth,
        height,
        opacity,
        scaleY,
        transformOrigin: "center",
        background
      }}
    />
  );
}

export { TickIndicator };
