"use client";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type RefObject
} from "react";
import {
  animate,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  type MotionValue
} from "motion/react";
import { canPlayStory, storyPlayback } from "@/lib/teaser/story-playback";

export function useStoryPlayback({
  stage,
  settlement,
  step,
  still,
  onAdvance
}: {
  stage: RefObject<HTMLDivElement | null>;
  settlement: MotionValue<boolean>;
  step: number;
  still: boolean;
  onAdvance: () => void;
}) {
  const inView = useInView(stage, { amount: storyPlayback.visibleAmount });
  const progress = useMotionValue(0);
  const control = useRef<ReturnType<typeof animate<number>> | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [settled, setSettled] = useState(settlement.get());
  const [revision, setRevision] = useState(0);
  const [complete, setComplete] = useState(false);
  useMotionValueEvent(progress, "change", (value) => setComplete(value === 1));
  useMotionValueEvent(settlement, "change", setSettled);
  const eligible =
    !still && inView && !hovered && !focused && !paused && settled;
  const advance = useEffectEvent(() => {
    if (
      eligible &&
      document.visibilityState === "visible" &&
      settlement.get()
    )
      onAdvance();
  });

  useEffect(() => {
    progress.set(0);
    const playback = animate(progress, 1, {
      duration: storyPlayback.holdSeconds,
      ease: "linear",
      onComplete: advance
    });
    playback.pause();
    control.current = playback;
    return () => {
      playback.stop();
      control.current = null;
    };
  }, [progress, step, revision]);

  useEffect(() => {
    const sync = () => {
      const playing = canPlayStory({
        still: still || !settled,
        inView,
        visible: document.visibilityState === "visible",
        hovered,
        focused,
        paused
      });
      const playback = control.current;
      if (playing && playback?.state === "paused") playback.play();
      else if (!playing && playback?.state === "running") playback.pause();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [still, settled, inView, hovered, focused, paused, step, revision]);

  return {
    progress,
    playing: eligible,
    complete,
    paused: paused || focused,
    setHovered,
    stopForFocus: () => setFocused(true),
    toggle: () => {
      setPaused(!(paused || focused));
      setFocused(false);
    },
    play: () => {
      setPaused(false);
      setFocused(false);
    },
    restart: () => setRevision((value) => value + 1)
  };
}
