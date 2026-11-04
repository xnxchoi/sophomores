import { describe, expect, it } from "vitest";
import { nextCrossfadeStep } from "./crossfade";
import type { CrossfadeInput } from "./crossfade";

const BASE: CrossfadeInput = {
  phase: "play",
  elapsedSec: 0,
  durationSec: 180,
  phaseElapsedMs: 0,
  fadeMs: 2000,
  thresholdSec: 10,
  sourceLoaded: true
};

describe("nextCrossfadeStep", () => {
  describe("guard — invalid inputs return noop", () => {
    it("returns noop when elapsedSec is NaN", () => {
      const r = nextCrossfadeStep({ ...BASE, elapsedSec: NaN });
      expect(r.action).toBe("noop");
      expect(r.resetPhaseClock).toBe(false);
      expect(r.nextPhase).toBe("play");
    });

    it("returns noop when durationSec is 0", () => {
      const r = nextCrossfadeStep({ ...BASE, durationSec: 0 });
      expect(r.action).toBe("noop");
    });

    it("returns noop when durationSec is negative", () => {
      const r = nextCrossfadeStep({ ...BASE, durationSec: -1 });
      expect(r.action).toBe("noop");
    });

    it("returns noop when elapsedSec is negative", () => {
      const r = nextCrossfadeStep({ ...BASE, elapsedSec: -1 });
      expect(r.action).toBe("noop");
    });

    it("returns noop when phaseElapsedMs is negative", () => {
      const r = nextCrossfadeStep({ ...BASE, phaseElapsedMs: -1 });
      expect(r.action).toBe("noop");
    });

    it("returns noop when fadeMs is 0", () => {
      const r = nextCrossfadeStep({ ...BASE, fadeMs: 0 });
      expect(r.action).toBe("noop");
    });

    it("returns noop when thresholdSec is negative", () => {
      const r = nextCrossfadeStep({ ...BASE, thresholdSec: -1 });
      expect(r.action).toBe("noop");
    });

    it("returns noop when durationSec is Infinity", () => {
      const r = nextCrossfadeStep({ ...BASE, durationSec: Infinity });
      expect(r.action).toBe("noop");
    });

    it("preserves crossfade phase on guard", () => {
      const r = nextCrossfadeStep({
        ...BASE,
        phase: "crossfade",
        durationSec: 0
      });
      expect(r.action).toBe("noop");
      expect(r.nextPhase).toBe("crossfade");
    });
  });

  describe("phase: play", () => {
    it("returns noop when remaining > threshold", () => {
      const r = nextCrossfadeStep({
        ...BASE,
        phase: "play",
        elapsedSec: 100,
        durationSec: 180,
        thresholdSec: 10
        // remaining = 80s > 10s threshold
      });
      expect(r.action).toBe("noop");
      expect(r.nextPhase).toBe("play");
      expect(r.resetPhaseClock).toBe(false);
    });

    it("returns beginCrossfade when remaining === threshold and source loaded", () => {
      const r = nextCrossfadeStep({
        ...BASE,
        phase: "play",
        elapsedSec: 170,
        durationSec: 180,
        thresholdSec: 10,
        sourceLoaded: true
      });
      expect(r.action).toBe("beginCrossfade");
      expect(r.nextPhase).toBe("crossfade");
      expect(r.resetPhaseClock).toBe(true);
    });

    it("returns beginCrossfade when remaining < threshold and source loaded", () => {
      const r = nextCrossfadeStep({
        ...BASE,
        phase: "play",
        elapsedSec: 175,
        durationSec: 180,
        thresholdSec: 10,
        sourceLoaded: true
      });
      expect(r.action).toBe("beginCrossfade");
      expect(r.nextPhase).toBe("crossfade");
      expect(r.resetPhaseClock).toBe(true);
    });

    it("returns deferCrossfade when remaining <= threshold but source not loaded", () => {
      const r = nextCrossfadeStep({
        ...BASE,
        phase: "play",
        elapsedSec: 175,
        durationSec: 180,
        thresholdSec: 10,
        sourceLoaded: false
      });
      expect(r.action).toBe("deferCrossfade");
      expect(r.nextPhase).toBe("play");
      expect(r.resetPhaseClock).toBe(false);
    });

    it("returns noop when track just started", () => {
      const r = nextCrossfadeStep({
        ...BASE,
        phase: "play",
        elapsedSec: 1,
        durationSec: 180,
        thresholdSec: 10
      });
      expect(r.action).toBe("noop");
    });
  });

  describe("phase: crossfade", () => {
    it("returns noop when phaseElapsedMs < fadeMs", () => {
      const r = nextCrossfadeStep({
        ...BASE,
        phase: "crossfade",
        phaseElapsedMs: 1000,
        fadeMs: 2000
      });
      expect(r.action).toBe("noop");
      expect(r.nextPhase).toBe("crossfade");
      expect(r.resetPhaseClock).toBe(false);
    });

    it("returns commitCrossfade when phaseElapsedMs === fadeMs", () => {
      const r = nextCrossfadeStep({
        ...BASE,
        phase: "crossfade",
        phaseElapsedMs: 2000,
        fadeMs: 2000
      });
      expect(r.action).toBe("commitCrossfade");
      expect(r.nextPhase).toBe("play");
      expect(r.resetPhaseClock).toBe(true);
    });

    it("returns commitCrossfade when phaseElapsedMs > fadeMs", () => {
      const r = nextCrossfadeStep({
        ...BASE,
        phase: "crossfade",
        phaseElapsedMs: 3000,
        fadeMs: 2000
      });
      expect(r.action).toBe("commitCrossfade");
      expect(r.nextPhase).toBe("play");
      expect(r.resetPhaseClock).toBe(true);
    });
  });

  describe("full cycle", () => {
    it("walks play → crossfade → play (source loaded)", () => {
      const base: CrossfadeInput = {
        elapsedSec: 0,
        durationSec: 60,
        phaseElapsedMs: 0,
        fadeMs: 1000,
        thresholdSec: 5,
        phase: "play",
        sourceLoaded: true
      };

      const s1 = nextCrossfadeStep({ ...base, elapsedSec: 50 });
      expect(s1.action).toBe("noop");

      const s2 = nextCrossfadeStep({ ...base, elapsedSec: 56 });
      expect(s2.action).toBe("beginCrossfade");
      expect(s2.nextPhase).toBe("crossfade");

      const s3 = nextCrossfadeStep({
        ...base,
        phase: "crossfade",
        phaseElapsedMs: 500
      });
      expect(s3.action).toBe("noop");

      const s4 = nextCrossfadeStep({
        ...base,
        phase: "crossfade",
        phaseElapsedMs: 1000
      });
      expect(s4.action).toBe("commitCrossfade");
      expect(s4.nextPhase).toBe("play");
    });

    it("defers then begins once source loads", () => {
      const base: CrossfadeInput = {
        elapsedSec: 56,
        durationSec: 60,
        phaseElapsedMs: 0,
        fadeMs: 1000,
        thresholdSec: 5,
        phase: "play",
        sourceLoaded: false
      };

      const deferred = nextCrossfadeStep(base);
      expect(deferred.action).toBe("deferCrossfade");
      expect(deferred.nextPhase).toBe("play");

      const begun = nextCrossfadeStep({ ...base, sourceLoaded: true });
      expect(begun.action).toBe("beginCrossfade");
      expect(begun.nextPhase).toBe("crossfade");
    });
  });

  describe("idempotency", () => {
    it("calling twice with same input returns same decision (play → crossfade)", () => {
      const input: CrossfadeInput = {
        ...BASE,
        phase: "play",
        elapsedSec: 175,
        durationSec: 180,
        thresholdSec: 10,
        sourceLoaded: true
      };
      const r1 = nextCrossfadeStep(input);
      const r2 = nextCrossfadeStep(input);
      expect(r1).toEqual(r2);
    });

    it("calling twice with same input returns same decision (crossfade → play)", () => {
      const input: CrossfadeInput = {
        ...BASE,
        phase: "crossfade",
        phaseElapsedMs: 2500,
        fadeMs: 2000
      };
      const r1 = nextCrossfadeStep(input);
      const r2 = nextCrossfadeStep(input);
      expect(r1).toEqual(r2);
    });
  });
});
