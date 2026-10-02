export type ChapterTiming = {
  steps: number;
  holdVh: number;
  transitionVh: number;
};

// One unit is 1% of the viewport. Increase holdVh to give every step more reading room.
// Transition distance stays independent: longer holds never make transitions sluggish.
export const scrollChapters = {
  hero: { steps: 3, holdVh: 40, transitionVh: 20 },
  origin: { steps: 4, holdVh: 55, transitionVh: 20 },
  how: { steps: 3, holdVh: 70, transitionVh: 35 },
  strategy: { steps: 3, holdVh: 70, transitionVh: 35 },
  people: { steps: 3, holdVh: 50, transitionVh: 23 }
} as const satisfies Record<string, ChapterTiming>;

export type PinnedChapter = keyof typeof scrollChapters;
export type ChapterId = PinnedChapter | "contacts";

// This constructs keyframe DATA only. Motion owns measurement, interpolation and playback.
export function createTimeline({ steps, holdVh, transitionVh }: ChapterTiming) {
  if (
    !Number.isInteger(steps) ||
    steps < 1 ||
    ![holdVh, transitionVh].every((n) => Number.isFinite(n) && n > 0)
  )
    throw new RangeError(
      "Chapter timing requires a positive step count and scroll distances."
    );
  const travelVh = steps * holdVh + (steps - 1) * transitionVh;
  const input = Array.from({ length: steps }, (_, i) => [
    (i * (holdVh + transitionVh)) / travelVh,
    (i * (holdVh + transitionVh) + holdVh) / travelVh
  ]).flat();
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
