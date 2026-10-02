import { motionTokens } from "@/lib/motion-tokens";
import type { createTimeline } from "./choreography";

export const storyPlayback = {
  holdSeconds: 5,
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
  still,
  inView,
  visible,
  hovered,
  focused,
  paused
}: {
  still: boolean;
  inView: boolean;
  visible: boolean;
  hovered: boolean;
  focused: boolean;
  paused: boolean;
}) {
  return !still && inView && visible && !hovered && !focused && !paused;
}
