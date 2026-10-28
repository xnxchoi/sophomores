"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  animate,
  type AnimationPlaybackControls,
  type MotionValue,
  useInView,
  useMotionValueEvent
} from "motion/react";
import type { AnimationItem } from "lottie-web";
import { cn } from "@/lib/utils";

type ArtworkTone = "dark" | "green";
type ArtworkMetadata = { fr: number; ip: number; op: number };

const artwork = {
  dark: {
    source: "/teaser/story-circle.json",
    fallback: "/teaser/story-orbit.webp"
  },
  green: {
    source: "/teaser/story-lines.json",
    fallback: "/teaser/story-lines.webp"
  }
} as const;

export function getArtworkTiming({ fr, ip, op }: ArtworkMetadata) {
  if (![fr, ip, op].every(Number.isFinite) || fr <= 0 || op <= ip)
    throw new Error("Invalid artwork frame metadata");
  return { frames: op - ip, seconds: (op - ip) / fr };
}

/** Benchmark source artwork: Lottie renders SVG; Motion alone advances its frames. */
export function StoryArtwork({
  tone,
  reveal
}: {
  tone: ArtworkTone;
  reveal: MotionValue<number>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host, { amount: "some" });
  const [revealed, setRevealed] = useState(reveal.get() > 0);
  useMotionValueEvent(reveal, "change", (value) => setRevealed(value > 0));
  const container = useRef<HTMLDivElement>(null);
  const clock = useRef<AnimationPlaybackControls | null>(null);
  const shouldPlay = useRef(false);
  const warned = useRef(false);
  const [readyTone, setReadyTone] = useState<ArtworkTone | null>(null);
  const ready = readyTone === tone;

  useEffect(() => {
    // Decorative artwork is independent of the reading hold and active card.
    shouldPlay.current = inView && revealed;
    if (shouldPlay.current && !document.hidden) clock.current?.play();
    else clock.current?.pause();
  }, [inView, revealed]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const abort = new AbortController();
    let disposed = false;
    let failed = false;
    let item: AnimationItem | undefined;
    let removeListeners: (() => void)[] = [];
    const syncPlayback = () => {
      if (shouldPlay.current && !document.hidden) clock.current?.play();
      else clock.current?.pause();
    };
    const fail = (error: unknown) => {
      if (disposed || failed) return;
      failed = true;
      clock.current?.stop();
      clock.current = null;
      removeListeners.forEach((remove) => remove());
      removeListeners = [];
      item?.destroy();
      item = undefined;
      setReadyTone(null);
      if (!warned.current) {
        warned.current = true;
        console.warn(
          "Story artwork unavailable; keeping its static fallback.",
          error
        );
      }
    };
    const load = async () => {
      // Clear any previous ready frame when the artwork tone changes.
      await Promise.resolve();
      if (disposed) return;
      setReadyTone(null);
      // JSON is local literal data, never the downloaded reference JavaScript bundle.
      const [module, response] = await Promise.all([
        import("lottie-web"),
        fetch(artwork[tone].source, { signal: abort.signal })
      ]);
      if (!response.ok)
        throw new Error(`Artwork request failed (${response.status})`);
      const data = await response.json();
      const timing = getArtworkTiming(data);
      if (disposed) return;
      item = module.default.loadAnimation({
        container: element,
        renderer: "svg",
        autoplay: false,
        loop: false,
        animationData: data,
        rendererSettings: {
          preserveAspectRatio: "xMidYMid meet",
          progressiveLoad: false
        }
      });
      const animation = item;
      const onReady = () => {
        if (disposed || failed || clock.current) return;
        try {
          animation.setSubframe(false);
          animation.goToAndStop(0, true);
        } catch (error) {
          fail(error);
          return;
        }
        // Lottie can synchronously emit "error" without throwing from goToAndStop.
        if (failed || disposed) return;
        clock.current = animate(0, timing.frames, {
          duration: timing.seconds,
          ease: "linear",
          repeat: Infinity,
          onUpdate: (frame) => {
            if (!shouldPlay.current || document.hidden || failed || disposed)
              return;
            try {
              animation.goToAndStop(
                Math.min(Math.floor(frame), timing.frames - 1),
                true
              );
            } catch (error) {
              fail(error);
            }
          }
        });
        syncPlayback();
        setReadyTone(tone);
      };
      removeListeners = [
        animation.addEventListener("DOMLoaded", onReady),
        animation.addEventListener("data_failed", () =>
          fail(new Error("Artwork data failed"))
        ),
        animation.addEventListener("error", fail)
      ];
      if (animation.isLoaded) onReady();
    };
    document.addEventListener("visibilitychange", syncPlayback);
    void load().catch((error: unknown) => {
      if (!abort.signal.aborted) fail(error);
    });
    return () => {
      disposed = true;
      abort.abort();
      document.removeEventListener("visibilitychange", syncPlayback);
      removeListeners.forEach((remove) => remove());
      clock.current?.stop();
      clock.current = null;
      item?.destroy();
    };
  }, [tone]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      data-artwork-ready={ready}
      data-story-artwork=""
      className={cn(
        "pointer-events-none",
        tone === "dark"
          ? "relative size-35 shrink-0 self-center object-contain short:max-md:size-18 short:md:size-21"
          : "absolute inset-0 z-0 overflow-hidden"
      )}
    >
      <Image
        src={artwork[tone].fallback}
        alt=""
        fill
        sizes={tone === "dark" ? "196px" : "328px"}
        className={tone === "dark" ? "object-contain" : "object-cover"}
        style={{ opacity: ready ? 0 : 1 }}
      />
      <div
        ref={container}
        className="absolute inset-0"
        style={{
          opacity: ready ? 1 : 0,
          transform: tone === "dark" ? "scale(.75)" : "rotate(90deg) scale(3)"
        }}
      />
    </div>
  );
}
