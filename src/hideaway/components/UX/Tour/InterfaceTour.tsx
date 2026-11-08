"use client";

import { MotionPillButton } from "@/hideaway/components/core/Button";
import { SPRING_EASE } from "@/hideaway/constants/animations";
import { cn } from "@/lib/utils";
import type { TourTarget } from "@/hideaway/stores/Tour/TourStore";
import { AnimatePresence, useReducedMotion, Variants } from "motion/react";
import * as m from "motion/react-m";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import { useShallow } from "zustand/shallow";
import { useTourStore } from "./TourProvider";
import { TextBlurIn } from "./TextBlurIn";

// ─── Rect tracking ────────────────────────────────────────────────────────────

type Rect = { top: number; left: number; width: number; height: number };
const EMPTY_RECT: Rect = { top: 0, left: 0, width: 0, height: 0 };
const PADDING = 8; // px padding around the spotlit element

function getTargetRect(id: string): Rect {
  const el = document.querySelector(`[data-tour="${id}"]`);
  if (!el) return EMPTY_RECT;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

// ─── Subtle body fade for tooltip content ────────────────────────────────────

const tooltipBodyVariants: Variants = {
  hidden: { opacity: 0, y: 4, filter: "blur(3px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.35, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function TourTooltip({
  target,
  rect,
  index,
  total,
  onNext,
  onPrev,
  onClose
}: {
  target: TourTarget;
  rect: Rect;
  index: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const prefersReduced = useReducedMotion();

  // Position tooltip outside spotlit element
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  const tooltipWidth = 280;
  const gap = 16;

  let x = rect.left + rect.width + PADDING + gap;
  let y = rect.top + rect.height / 2;
  let anchor: "left" | "right" | "top" | "bottom" = "left";

  if (x + tooltipWidth > vw - 16) {
    x = rect.left - PADDING - gap - tooltipWidth;
    anchor = "right";
  }
  if (x < 16) {
    x = Math.max(16, rect.left + rect.width / 2 - tooltipWidth / 2);
    y = rect.top - PADDING - gap;
    anchor = "bottom";
    if (y < 80) {
      y = rect.top + rect.height + PADDING + gap;
      anchor = "top";
    }
  }

  // Clamp vertically
  const tooltipHeight = 140;
  y = Math.max(16, Math.min(vh - tooltipHeight - 16, y - tooltipHeight / 2));

  return (
    <m.div
      key={target.id}
      className={cn(
        "fixed z-[502] w-[280px]",
        "rounded-xl border border-foreground/10 bg-background shadow-xl",
        "flex flex-col gap-4 p-5"
      )}
      style={{ left: x, top: y }}
      initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 6 }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={prefersReduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
      transition={{ type: "spring", ...SPRING_EASE.power3.out }}
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <m.span
            className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            {index + 1} / {total}
          </m.span>
          {target.shortcut && (
            <m.kbd
              className="rounded border border-foreground/10 bg-foreground/5 px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.12 }}
            >
              {target.shortcut}
            </m.kbd>
          )}
        </div>
        <TextBlurIn
          key={`if-label-${target.id}`}
          text={target.label}
          as="h3"
          className="text-base leading-snug font-medium text-foreground"
          splitBy="word"
          stagger={0.03}
          delay={0.04}
          yOffset={4}
          blurAmount={5}
          duration={0.35}
        />
      </div>

      <m.p
        className="text-sm leading-relaxed text-muted-foreground"
        variants={tooltipBodyVariants}
        initial="hidden"
        animate="visible"
      >
        {target.description}
      </m.p>

      {/* Navigation */}
      <m.div
        className="flex items-center justify-between gap-2"
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.3,
          delay: 0.18,
          ease: [0.25, 0.46, 0.45, 0.94]
        }}
      >
        <MotionPillButton
          onClick={onPrev}
          disabled={index === 0}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 14 14"
            fill="none"
            aria-hidden="true"
            className="mr-1"
          >
            <path
              d="M8.5 3L4.5 7L8.5 11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Prev
        </MotionPillButton>
        <MotionPillButton
          onClick={onClose}
          className="text-sm text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          Close
        </MotionPillButton>
        <MotionPillButton
          onClick={onNext}
          className="text-sm font-medium text-foreground transition-colors hover:text-foreground/70"
        >
          {index === total - 1 ? (
            "Done"
          ) : (
            <>
              Next
              <svg
                width="12"
                height="12"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                className="ml-1"
              >
                <path
                  d="M5.5 3L9.5 7L5.5 11"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </MotionPillButton>
      </m.div>
    </m.div>
  );
}

// ─── Spotlight mask (SVG clip-path technique) ─────────────────────────────────

function SpotlightOverlay({
  rect,
  onClick
}: {
  rect: Rect;
  onClick: () => void;
}) {
  const prefersReduced = useReducedMotion();

  const sp =
    rect === EMPTY_RECT
      ? null
      : {
          x: rect.left - PADDING,
          y: rect.top - PADDING,
          w: rect.width + PADDING * 2,
          h: rect.height + PADDING * 2
        };

  return (
    <m.div
      className="pointer-events-none fixed inset-0 z-[501]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.2 }}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {sp && (
              <m.rect
                key={`${sp.x}-${sp.y}`}
                x={sp.x}
                y={sp.y}
                width={sp.w}
                height={sp.h}
                rx={10}
                fill="black"
                initial={prefersReduced ? {} : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ type: "spring", ...SPRING_EASE.power3.out }}
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="oklch(0 0 0 / 0.6)"
          mask="url(#tour-mask)"
          className="pointer-events-auto"
          onClick={onClick}
        />
      </svg>

      {/* Spotlight border ring */}
      {sp && (
        <m.div
          className="pointer-events-none absolute rounded-[10px] border border-foreground/20"
          initial={prefersReduced ? {} : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", ...SPRING_EASE.power3.out }}
          style={{
            left: sp.x,
            top: sp.y,
            width: sp.w,
            height: sp.h
          }}
        />
      )}

      {/* Subtle pulse ring for emphasis */}
      {sp && !prefersReduced && (
        <m.div
          className="pointer-events-none absolute rounded-[10px] border border-foreground/8"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{
            opacity: [0, 0.5, 0],
            scale: [1, 1.04, 1.06]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            left: sp.x,
            top: sp.y,
            width: sp.w,
            height: sp.h
          }}
        />
      )}
    </m.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function InterfaceTour() {
  const ifActive = useTourStore((s) => s.ifActive);
  const ifIndex = useTourStore((s) => s.ifIndex);
  const ifTargets = useTourStore(useShallow((s) => s.ifTargets));
  const ifNext = useTourStore((s) => s.ifNext);
  const ifPrev = useTourStore((s) => s.ifPrev);
  const closeInterfaceTour = useTourStore((s) => s.closeInterfaceTour);

  const [rect, setRect] = useState<Rect>(EMPTY_RECT);
  const rafRef = useRef<number>(0);

  const currentTarget = ifTargets[ifIndex] as TourTarget | undefined;

  // Track spotlit element rect (live, handles resize/scroll)
  const updateRect = useCallback(() => {
    if (currentTarget) setRect(getTargetRect(currentTarget.id));
  }, [currentTarget]);

  useLayoutEffect(() => {
    if (!ifActive) return;
    updateRect();
    const handleResize = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateRect);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("scroll", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [ifActive, updateRect]);

  // Keyboard controls
  useEffect(() => {
    if (!ifActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeInterfaceTour();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        ifNext();
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        ifPrev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ifActive, ifNext, ifPrev, closeInterfaceTour]);

  return (
    <AnimatePresence>
      {ifActive && currentTarget && (
        <>
          <SpotlightOverlay rect={rect} onClick={closeInterfaceTour} />
          <TourTooltip
            target={currentTarget}
            rect={rect}
            index={ifIndex}
            total={ifTargets.length}
            onNext={ifNext}
            onPrev={ifPrev}
            onClose={closeInterfaceTour}
          />
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Global shortcut listener ─────────────────────────────────────────────────

export function InterfaceTourTrigger() {
  const openInterfaceTour = useTourStore((s) => s.openInterfaceTour);
  const ifActive = useTourStore((s) => s.ifActive);
  const regActive = useTourStore((s) => s.regActive);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // `?` key (Shift+/) when not typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (e.target as HTMLElement)?.isContentEditable;

      if (e.key === "?" && !isTyping && !regActive) {
        e.preventDefault();
        if (ifActive) return; // already open
        openInterfaceTour();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [ifActive, regActive, openInterfaceTour]);

  return null;
}
