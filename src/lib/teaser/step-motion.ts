import {
  chapterExitHoldVh,
  createTimeline,
  scrollChapters,
  type PinnedChapter
} from "./choreography";

/**
 * Scroll distance through the analogue intro, in svh.
 * 100svh equals one viewport. 300svh is 3 viewports of scrolling, about
 * 3000–3900px on a screen 1000–1300px tall.
 */
export const analogueScrollTravelVh = 300;

/** Scroll distance, in svh, of every pinned Blink chapter plus the invitation. */
export function blinkScrollTravelVh() {
  const chapters = (Object.keys(scrollChapters) as PinnedChapter[]).reduce(
    (travel, id) => {
      const timeline = createTimeline(scrollChapters[id]);
      const geometry = chapterGeometry(
        timeline.travelVh,
        chapterExitHoldVh[id] ?? 0
      );
      return travel + geometry.heightVh - 100;
    },
    0
  );
  return chapters + sectionHeightVh(0) - 100;
}

/** Pinned runway: one viewport plus the analogue scroll distance. */
export function analogueRunwayHeightVh() {
  return analogueScrollTravelVh + 100;
}

export const stepMotionTokens = {
  hero: { duration: 0.6, ease: [0.25, 0.35, 0.35, 1] },
  origin: { duration: 0.5, ease: [0.25, 0.35, 0.35, 1] },
  how: { duration: 0.8, ease: [0.25, 0.35, 0.35, 1] },
  strategy: { duration: 0.65, ease: [0.25, 0.35, 0.35, 1] },
  people: { duration: 0.9, ease: [0.25, 0.35, 0.35, 1] }
} as const;

export const sectionHeightScale = 1.3;
export function sectionHeightVh(travelVh: number) {
  if (!Number.isFinite(travelVh) || travelVh < 0)
    throw new RangeError("Section travel must be finite and non-negative.");
  return (100 + travelVh) * sectionHeightScale;
}

/** Add reading room after the final pose without moving earlier scroll cues. */
export function chapterGeometry(travelVh: number, exitHoldVh = 0) {
  if (!Number.isFinite(exitHoldVh) || exitHoldVh < 0)
    throw new RangeError("Exit hold must be finite and non-negative.");
  const baseHeight = sectionHeightVh(travelVh);
  const baseTravel = baseHeight - 100;
  return {
    heightVh: baseHeight + exitHoldVh,
    motionEnd: baseTravel / (baseTravel + exitHoldVh),
  };
}

