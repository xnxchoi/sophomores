import { describe, expect, it } from "vitest";

import {
  getHeaderScrollProgress,
  getNextHeaderScrubPosition
} from "./headerMotion";

describe("header motion helpers", () => {
  it("clamps scroll progress to the compact header range", () => {
    expect(getHeaderScrollProgress(-50)).toBe(0);
    expect(getHeaderScrollProgress(175)).toBe(0.5);
    expect(getHeaderScrollProgress(700)).toBe(1);
  });

  it("steps scrub position toward the latest scroll progress without recursion", () => {
    expect(
      getNextHeaderScrubPosition({
        currentScrub: 0.8,
        latestScroll: 175,
        amount: 0.08
      })
    ).toBeCloseTo(0.776);
  });
});
