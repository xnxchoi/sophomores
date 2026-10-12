export const stepMotionTokens = {
  hero: { duration: 0.6, ease: [0.42, 0, 0.58, 1] },
  origin: { duration: 0.35, ease: [0.5, 0, 0.5, 1] },
  how: { duration: 1.2, ease: [0.33, 1, 0.68, 1] },
  strategy: { duration: 0.8, ease: [0.5, 0, 0, 1] },
  people: { duration: 1.4, ease: [0.5, 0, 0, 1] },
} as const;

export const sectionHeightScale = 1.2;
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

function assertIndex(value: number) {
  if (!Number.isInteger(value) || value < 0)
    throw new RangeError("Step indices must be non-negative integers.");
}

export function chapterStep(progress: number, steps: number) {
  assertIndex(steps);
  if (steps === 0 || !Number.isFinite(progress))
    throw new RangeError("A chapter needs finite progress and at least one step.");
  return Math.max(0, Math.min(steps - 1, Math.floor(progress * steps)));
}

export function nextDisplayedStep(current: number, target: number) {
  assertIndex(current);
  assertIndex(target);
  return current + Math.sign(target - current);
}

export function getStoryStepProgress(card: number, active: number, segment: number, progress: number) {
  [card, active, segment].forEach(assertIndex);
  if (!Number.isFinite(progress)) throw new RangeError("Progress must be finite.");
  if (card > active || segment > card) return 0;
  if (card < active || segment < card) return 1;
  return Math.max(0, Math.min(1, progress));
}
