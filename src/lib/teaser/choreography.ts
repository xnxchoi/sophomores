export type ChapterTiming = {
  steps: number;
  holdVh: number;
  transitionVh: number;
  stepHoldsVh?: readonly number[];
};

// One unit is 1% of the viewport, so 100svh is one screen. Increase holdVh to
// give every pose about one viewport of scrolling before the next one begins.
// Transition distance stays independent: longer holds never make transitions sluggish.
export const scrollChapters = {
  // Step 0 is the post-warp aurora zoom, 40% shorter than the 160svh pose.
  // Steps 1–2 are the notifications. Step 3 is the "It didn't begin" statement.
  hero: {
    steps: 4,
    holdVh: 160,
    transitionVh: 20,
    stepHoldsVh: [96, 320, 320, 360]
  },
  origin: { steps: 4, holdVh: 160, transitionVh: 20 },
  how: { steps: 3, holdVh: 160, transitionVh: 35 },
  strategy: { steps: 3, holdVh: 80, transitionVh: 35 },
  people: { steps: 3, holdVh: 80, transitionVh: 23 }
} as const satisfies Record<string, ChapterTiming>;

export type PinnedChapter = keyof typeof scrollChapters;
// Extra scroll distance after blur headings resolve; earlier cues stay put.
/** Post-warp aurora zoom, in svh. 60% of the previous 940svh hero motion. */
export const heroAuroraZoomVh = 564;

export const chapterExitHoldVh: Partial<Record<PinnedChapter, number>> = {
  hero: 60,
  people: 45,
};
export type ChapterId = PinnedChapter | "contacts";

// This constructs keyframe DATA only. Motion owns measurement, interpolation and playback.
export function createTimeline({
  steps,
  holdVh,
  transitionVh,
  stepHoldsVh
}: ChapterTiming) {
  if (
    !Number.isInteger(steps) ||
    steps < 1 ||
    ![holdVh, transitionVh].every((n) => Number.isFinite(n) && n > 0)
  )
    throw new RangeError(
      "Chapter timing requires a positive step count and scroll distances."
    );
  const holds =
    stepHoldsVh ?? Array.from({ length: steps }, () => holdVh);
  if (holds.length !== steps || holds.some((hold) => !Number.isFinite(hold) || hold <= 0))
    throw new RangeError(
      "Chapter timing requires one positive hold for every step."
    );
  let cursor = 0;
  const spans: number[] = [];
  for (let step = 0; step < steps; step++) {
    spans.push(cursor, cursor + holds[step]);
    cursor += holds[step];
    if (step < steps - 1) cursor += transitionVh;
  }
  const travelVh = cursor;
  const input = spans.map((distance) => distance / travelVh);
  const output = Array.from({ length: steps }, (_, i) => [i, i]).flat();
  return { input, output, travelVh };
}

export const conversationPoses = {
  desktop: [
    {
      x: ["-50%", "-75%", "-115%"],
      y: ["-50%", "-105%", "-290%"],
      scale: [1, 0.85, 0.7225],
      opacity: [1, 1, 0.35]
    },
    {
      x: ["-20%", "-20%", "-70%"],
      y: ["35%", "-20%", "-240%"],
      scale: [0.3, 1, 0.85],
      opacity: [0, 1, 0.55]
    },
    {
      x: ["-20%", "-20%", "-20%"],
      y: ["35%", "35%", "-50%"],
      scale: [0.3, 0.3, 1],
      opacity: [0, 0, 1]
    }
  ],
  mobile: [
    {
      x: ["-50%", "-50%", "-50%"],
      y: ["-50%", "-130%", "-330%"],
      scale: [1, 0.85, 0.7225],
      opacity: [1, 1, 0.35]
    },
    {
      x: ["-50%", "-50%", "-50%"],
      y: ["35%", "-50%", "-245%"],
      scale: [0.3, 1, 0.85],
      opacity: [0, 1, 0.55]
    },
    {
      x: ["-50%", "-50%", "-50%"],
      y: ["35%", "35%", "-50%"],
      scale: [0.3, 0.3, 1],
      opacity: [0, 0, 1]
    }
  ]
};
