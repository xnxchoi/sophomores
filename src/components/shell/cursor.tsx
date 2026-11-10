"use client";

import { siteLayer } from "@/constants/site-layers";
import { cn } from "@/lib/utils";
import { AnimatePresence, LazyMotion, domAnimation, useMotionValue, useSpring } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useMemo, useState } from "react";

type CursorState = "FOCUS" | "DRAG" | string | null;

const INK = {
  rouge: "62.41% 0.246 28.34",
  light: "10.17% 0.0013 218.99",
  dark: "97.5% 0.0013 218.99"
} as const;

const SIZE = { large: 48, medium: 17, small: 6 };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function Marquee({ caption }: { caption: string }) {
  const copies = Math.max(2, Math.ceil(120 / (caption.length + 1)));
  return (
    <span className="marquee-horizontal-ltr animate-[marquee-horizontal-ltr_25s_linear_infinite] absolute flex h-full items-center whitespace-nowrap">
      {Array.from({ length: copies }, (_, index) => (
        <span key={`${caption}-${index}`} className="font-doto font-['Doto',sans-serif] mr-3 inline-block text-sm font-bold uppercase">
          {caption}
        </span>
      ))}
    </span>
  );
}

/** Hideaway pointer. Position tracks the pointer. Only the ring radius springs. */
export function SiteCursor() {
  const cursorX = useMotionValue(0);
  const cursorY = useMotionValue(0);
  const outerRad = useMotionValue(SIZE.small);
  const innerRad = useMotionValue(SIZE.small);
  const containerWidth = useMotionValue(1);
  const containerHeight = useMotionValue(1);
  const strokeColor = useMotionValue(`oklch(${INK.dark}/1)`);
  const outerRadius = useSpring(outerRad, { visualDuration: 0.3, stiffness: 500, damping: 30 });
  const innerRadius = useSpring(innerRad, { visualDuration: 0.3, stiffness: 500, damping: 30 });
  const [enabled, setEnabled] = useState(true);
  const [cursorState, setCursorState] = useState<CursorState>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [marquee, setMarquee] = useState(false);
  const variant = cursorState === "FOCUS" ? "FOCUS" : cursorState === "DRAG" ? "DRAG" : "DEFAULT";

  const textLabel = cursorState && cursorState !== "FOCUS" && cursorState !== "DRAG" ? cursorState : "";
  const isText = textLabel.length > 0;

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)");
    const sync = () => setEnabled(!coarse.matches);
    sync();
    coarse.addEventListener("change", sync);
    cursorX.set(window.innerWidth / 2);
    cursorY.set(window.innerHeight / 2);
    const move = (event: PointerEvent) => {
      cursorX.set(event.clientX);
      cursorY.set(event.clientY);
    };
    const aim = (event: Event) => {
      const node = event.target instanceof Element ? event.target : null;
      const labeled = node?.closest("[data-cursor]");
      const label = labeled?.getAttribute("data-cursor");
      if (label) {
        setCursorState(label);
        setMarquee(label.length > 12);
      } else if (node?.closest("a, button")) {
        setCursorState("FOCUS");
        setMarquee(false);
      } else {
        setCursorState(null);
        setMarquee(false);
      }
      setTheme(document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", aim);
    return () => {
      coarse.removeEventListener("change", sync);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", aim);
    };
  }, [cursorX, cursorY]);

  useEffect(() => {
    const focus = cursorState === "FOCUS";
    const drag = cursorState === "DRAG";
    const ink = focus || drag ? INK.rouge : INK[theme];
    strokeColor.set(`oklch(${ink}/1)`);
    const outer = focus || drag ? SIZE.medium : SIZE.small;
    outerRad.set(outer);
    innerRad.set(drag ? 0 : focus ? 1 : outer);
    containerWidth.set(isText ? clamp(textLabel.length * 15, 85, 120) : 1);
    containerHeight.set(isText ? 40 : 1);
  }, [cursorState, theme, isText, textLabel.length, strokeColor, outerRad, innerRad, containerWidth, containerHeight]);

  const circle = useMemo(
    () => ({
      hidden: { opacity: 0, visibility: "hidden" as const, scale: 0 },
      DRAG: { scale: 0.9, opacity: 1, visibility: "visible" as const },
      FOCUS: { opacity: 1, visibility: "visible" as const, scale: 1 },
      DEFAULT: { opacity: 1, visibility: "visible" as const, scale: 1 }
    }),
    []
  );

  return (
    <LazyMotion features={domAnimation}>
    <m.span
      aria-hidden
      className={cn("rp-cursor fixed top-0 left-0 z-100 size-0 pointer-events-none opacity-0", enabled && "is-on opacity-100", isText && "is-text")}
      data-state={cursorState ?? "null"}
      data-theme={theme}
      style={{ x: cursorX, y: cursorY, zIndex: siteLayer.cursor }}
    >
      <span className="rp-cursor-mark flex size-24 items-center justify-center -translate-x-1/2 -translate-y-1/2">
      <AnimatePresence mode="sync" initial>
        {enabled && isText ? (
          <m.span
            key="label"
            className="pointer-events-none flex items-center justify-center overflow-hidden rounded-[8px] bg-faded-white/10 backdrop-blur-xs"
            style={{ width: containerWidth, height: containerHeight }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <span className="font-doto font-['Doto',sans-serif] text-sm font-bold tracking-[0.05rem] whitespace-nowrap mix-blend-difference">
              {marquee ? <Marquee caption={textLabel} /> : textLabel}
            </span>
          </m.span>
        ) : null}
        {enabled && !isText ? (
          <m.svg key="ring" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <m.circle
              cx={50}
              cy={50}
              r={outerRadius}
              strokeWidth={1}
              fill="transparent"
              variants={circle}
              initial="hidden"
              animate={variant}
              style={{ stroke: strokeColor }}
              exit={{ opacity: 0, scale: 0, transition: { duration: 0.2, delay: 0.1, ease: [0.215, 0.61, 0.355, 1] } }}
            />
            <m.circle
              cx={50}
              cy={50}
              r={innerRadius}
              variants={circle}
              initial="hidden"
              animate={variant}
              exit="hidden"
              style={{ fill: strokeColor }}
            />
          </m.svg>
        ) : null}
      </AnimatePresence>
      </span>
    </m.span>
    </LazyMotion>
  );
}
