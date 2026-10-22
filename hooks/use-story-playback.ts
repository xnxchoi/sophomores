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
import {
  canPlayStory,
  createStoryPlaybackController,
  storyPlayback
} from "@/lib/teaser/story-playback";

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
  const control = useRef<ReturnType<
    typeof createStoryPlaybackController
  > | null>(null);
  const [focused, setFocused] = useState(false);
  const [paused, setPaused] = useState(false);
  const [settled, setSettled] = useState(settlement.get());
  const [revision, setRevision] = useState(0);
  const [complete, setComplete] = useState(false);
  useMotionValueEvent(progress, "change", (value) => setComplete(value === 1));
  useMotionValueEvent(settlement, "change", setSettled);
  const eligible = !still && inView && !focused && !paused && settled;
  const canAdvance = useEffectEvent(
    () => eligible && document.visibilityState === "visible" && settlement.get()
  );
  const advance = useEffectEvent(onAdvance);

  useEffect(() => {
    progress.set(0);
    const playback = createStoryPlaybackController({
      start: (onComplete) =>
        animate(progress, 1, {
          duration: storyPlayback.holdSeconds,
          ease: "linear",
          onComplete
        }),
      canAdvance,
      onAdvance: advance
    });
    control.current = playback;
    return () => {
      playback.dispose();
      control.current = null;
    };
  }, [progress, step, revision]);

  useEffect(() => {
    const sync = () =>
      control.current?.sync(
        canPlayStory({
          still: still || !settlement.get(),
          inView,
          visible: document.visibilityState === "visible",
          focused,
          paused
        })
      );
    sync();
    const unsubscribe = settlement.on("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      unsubscribe();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [still, settlement, settled, inView, focused, paused, step, revision]);

  return {
    progress,
    playing: eligible,
    complete,
    paused: paused || focused,
    clearFocus: () => setFocused(false),
    stopForFocus: () => setFocused(true),
    toggle: () => {
      setPaused(!(paused || focused));
      setFocused(false);
    },
    play: () => {
      setPaused(false);
      setFocused(false);
    },
    restart: () => {
      setRevision((value) => value + 1);
    }
  };
}
