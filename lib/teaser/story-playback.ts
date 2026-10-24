import { motionTokens } from "@/lib/motion-tokens";
import type { createTimeline } from "./choreography";

export const storyPlayback = {
  holdSeconds: 3.5,
  transitionSeconds: motionTokens.duration.slow,
  visibleAmount: 0.85
} as const;

export function storyTarget(
  index: number,
  timeline: ReturnType<typeof createTimeline>
) {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index >= timeline.output.length / 2
  )
    throw new RangeError("Story index must identify an existing hold.");
  return (timeline.input[index * 2] + timeline.input[index * 2 + 1]) / 2;
}

export function canPlayStory({
  suspended,
  inView,
  visible,
  focused,
  paused
}: {
  suspended: boolean;
  inView: boolean;
  visible: boolean;
  focused: boolean;
  paused: boolean;
}) {
  return !suspended && inView && visible && !focused && !paused;
}

type PlaybackControl = {
  play: () => void;
  pause: () => void;
  stop: () => void;
};

/** Motion owns elapsed time; this coordinates eligibility and a once-only completion. */
export function createStoryPlaybackController({
  start,
  canAdvance,
  onAdvance
}: {
  start: (onComplete: () => void) => PlaybackControl;
  canAdvance: () => boolean;
  onAdvance: () => void;
}) {
  let state = {
    playing: false,
    complete: false,
    advanced: false,
    disposed: false
  };
  const advanceIfReady = () => {
    if (
      !state.disposed &&
      state.playing &&
      state.complete &&
      !state.advanced &&
      canAdvance()
    ) {
      state = { ...state, advanced: true };
      onAdvance();
    }
  };
  const playback = start(() => {
    state = { ...state, complete: true };
    advanceIfReady();
  });
  playback.pause();
  return {
    sync(playing: boolean) {
      if (state.disposed) return;
      const changed = playing !== state.playing;
      state = { ...state, playing };
      if (!state.complete && changed) {
        if (playing) playback.play();
        else playback.pause();
      }
      advanceIfReady();
    },
    dispose() {
      if (state.disposed) return;
      state = { ...state, disposed: true };
      playback.stop();
    }
  };
}
