import { describe, expect, it } from "vitest";

import { getLenisRafTime } from "./lenis-raf-time";

describe("getLenisRafTime", () => {
  it("passes through native requestAnimationFrame timestamps", () => {
    expect(getLenisRafTime(1240.5)).toBe(1240.5);
  });

  it("extracts the elapsed millisecond timestamp from Tempus frames", () => {
    expect(getLenisRafTime({ deltaTime: 16.7, frame: 12, time: 240.2 })).toBe(
      240.2
    );
  });

  it("rejects invalid frame values instead of poisoning Lenis timing", () => {
    expect(getLenisRafTime(undefined)).toBeNull();
    expect(getLenisRafTime({ deltaTime: 16.7, frame: 12 })).toBeNull();
    expect(getLenisRafTime(Number.NaN)).toBeNull();
  });
});
