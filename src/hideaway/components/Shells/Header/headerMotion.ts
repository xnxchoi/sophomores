import { lerp } from "@/hideaway/utilities/rp_utils";

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
