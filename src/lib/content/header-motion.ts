function lerp(baseValue: number, toValue: number, delta = 0.1) {
  return (1 - delta) * baseValue + toValue * delta;
}

const HEADER_SCROLL_DISTANCE = 350;

export function getHeaderScrollProgress(latestScroll: number) {
  return Math.min(1, Math.max(0, latestScroll / HEADER_SCROLL_DISTANCE));
}

export function getNextHeaderScrubPosition({
  currentScrub,
  latestScroll,
  amount = 0.08
}: {
  currentScrub: number;
  latestScroll: number;
  amount?: number;
}) {
  return lerp(currentScrub, getHeaderScrollProgress(latestScroll), amount);
}
