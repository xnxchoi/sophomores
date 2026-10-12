"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  animate,
  useInView,
  useMotionValueEvent,
  type MotionValue,
  useReducedMotion,
  type AnimationPlaybackControls
} from "motion/react";
import type { AnimationItem } from "lottie-web";
import { canPlayStoryArtwork } from "@/lib/teaser/story-artwork";

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
  reveal,
  still = false
}: {
  tone: ArtworkTone;
  reveal: MotionValue<number>;
  still?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const inView = useInView(host, { amount: "some" });
  const [revealed, setRevealed] = useState(reveal.get() > 0);
  useMotionValueEvent(reveal, "change", (value) => setRevealed(value > 0));
  const container = useRef<HTMLDivElement>(null);
  const clock = useRef<AnimationPlaybackControls | null>(null);
  const shouldPlay = useRef(false);
  const warned = useRef(false);
  const reduce = useReducedMotion();
  const [readyTone, setReadyTone] = useState<ArtworkTone | null>(null);
  const ready = readyTone === tone && !still && !reduce;

  useEffect(() => {
    shouldPlay.current = canPlayStoryArtwork({
      inView,
      revealed,
      visible: true,
      reduced: still || Boolean(reduce)
    });
    if (shouldPlay.current && !document.hidden) clock.current?.play();
    else clock.current?.pause();
  }, [inView, revealed, still, reduce]);

  useEffect(() => {
    const element = container.current;
    if (!element || still || reduce) return;
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
      // Clear any previous ready frame when the tone or reduced-motion preference changes.
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
  }, [tone, still, reduce]);

  return (
    <div
      ref={host}
      aria-hidden="true"
      data-artwork-ready={ready}
      className={`story-artwork story-artwork-${tone}${tone === "dark" ? " story-orb" : ""}`}
      style={
        tone === "dark"
          ? { position: "relative", flexShrink: 0, pointerEvents: "none" }
          : {
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
              zIndex: 0
            }
      }
    >
      <Image
        src={artwork[tone].fallback}
        alt=""
        fill
        sizes={tone === "dark" ? "196px" : "328px"}
        style={{
          objectFit: tone === "dark" ? "contain" : "cover",
          opacity: ready ? 0 : 1
        }}
      />
      <div
        ref={container}
        style={{
          position: "absolute",
          inset: 0,
          opacity: ready ? 1 : 0,
          transform: tone === "dark" ? "scale(.75)" : "rotate(90deg) scale(3)"
        }}
      />
    </div>
  );
}
