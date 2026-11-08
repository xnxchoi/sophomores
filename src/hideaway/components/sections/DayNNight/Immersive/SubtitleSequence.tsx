"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";

export interface SubtitleSequenceProps {
  /** Ordered caption nodes. Render order = play order. */
  captions: ReactNode[];
  /** When true, the sequence plays. When false, fades out. */
  active?: boolean;
  /** Milliseconds each caption sits fully on screen. */
  perCardMs?: number;
  /** Milliseconds for the in/out fade. */
  fadeMs?: number;
  /**
   * Called once per sequence cycle after the final caption has held and
   * faded out. Used by the dev harness to trigger the photo torrent after
   * the lead-in line clears.
   */
  onPhotoCue?: () => void;
  /** Extra beat after the final caption fades out before the photo cue fires. */
  photoCueOffsetMs?: number;
  /** Bumping this number replays the sequence from card 0. */
  replayKey?: number;
  /** Keep the last caption visible until the parent deactivates the sequence. */
  lingerOnLast?: boolean;
  /** Optional extra classes on the outer fixed wrapper. */
  className?: string;
}

const DEFAULT_PER_CARD_MS = 1800;
const DEFAULT_FADE_MS = 400;
const DEFAULT_PHOTO_CUE_OFFSET_MS = 500;

export function SubtitleSequence({
  captions,
  active = true,
  perCardMs = DEFAULT_PER_CARD_MS,
  fadeMs = DEFAULT_FADE_MS,
  onPhotoCue,
  photoCueOffsetMs = DEFAULT_PHOTO_CUE_OFFSET_MS,
  replayKey = 0,
  lingerOnLast = false,
  className
}: SubtitleSequenceProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(
    active ? 0 : null
  );
  const tweens = useRef<gsap.core.Tween[]>([]);
  const timeouts = useRef<number[]>([]);
  const photoCueRef = useRef(onPhotoCue);

  useEffect(() => {
    photoCueRef.current = onPhotoCue;
  }, [onPhotoCue]);

  useEffect(() => {
    tweens.current.forEach((t) => t.kill());
    tweens.current = [];
    timeouts.current.forEach((id) => window.clearTimeout(id));
    timeouts.current = [];

    if (!active || captions.length === 0) {
      setActiveIndex(null);
      return;
    }

    setActiveIndex(0);
    for (let i = 1; i < captions.length; i++) {
      const id = window.setTimeout(
        () => setActiveIndex(i),
        i * (perCardMs + fadeMs)
      );
      timeouts.current.push(id);
    }

    if (onPhotoCue && captions.length > 0) {
      const lastIdx = captions.length - 1;
      const fireAt =
        lastIdx * (perCardMs + fadeMs) + perCardMs + fadeMs + photoCueOffsetMs;
      const id = window.setTimeout(() => {
        photoCueRef.current?.();
      }, fireAt);
      timeouts.current.push(id);
    }

    if (!lingerOnLast) {
      const lastIndex = captions.length - 1;
      const lastEnter = lastIndex * (perCardMs + fadeMs);
      const lastExit = lastEnter + perCardMs;
      const id = window.setTimeout(() => setActiveIndex(null), lastExit);
      timeouts.current.push(id);
    }

    return () => {
      tweens.current.forEach((t) => t.kill());
      tweens.current = [];
      timeouts.current.forEach((id) => window.clearTimeout(id));
      timeouts.current = [];
    };
  }, [
    active,
    captions,
    perCardMs,
    fadeMs,
    photoCueOffsetMs,
    replayKey,
    lingerOnLast,
    onPhotoCue
  ]);

  return (
    <div
      data-dn-subtitle-host
      aria-live="polite"
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-[clamp(96px,18vh,200px)] z-[43] flex justify-center px-6",
        className
      )}
    >
      <div className="relative min-h-[5em] w-full max-w-[60ch] text-center">
        {captions.map((content, i) => (
          <SubtitleCard
            key={i}
            content={content}
            visible={activeIndex === i}
            fadeMs={fadeMs}
          />
        ))}
      </div>
    </div>
  );
}

interface SubtitleCardProps {
  content: ReactNode;
  visible: boolean;
  fadeMs: number;
}

function SubtitleCard({ content, visible, fadeMs }: SubtitleCardProps) {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: `opacity ${fadeMs}ms ease-out`,
        willChange: "opacity"
      }}
    >
      <div
        className={cn(
          "rounded-2xl px-7 py-5",
          "bg-[oklch(95%_0.01_85)] text-[oklch(18%_0.012_280)]",
          "font-serif text-[clamp(1.3rem,2.6vw,1.8rem)] leading-[1.4]",
          "tracking-[0.005em]",
          "shadow-[0_18px_50px_-16px_rgba(0,0,0,0.78)]"
        )}
      >
        {content}
      </div>
    </div>
  );
}
