import { describe, expect, it } from "vitest";
import { reducePlayState } from "./playState";
import type { RP_PlayState } from "../types";

const IDLE: RP_PlayState = {
  real: "idle",
  optimistic: "idle",
  previous: "idle"
};
const PLAYING: RP_PlayState = {
  real: "playing",
  optimistic: "playing",
  previous: "idle"
};
const PAUSED: RP_PlayState = {
  real: "paused",
  optimistic: "paused",
  previous: "playing"
};

describe("reducePlayState", () => {
  describe("USER_PLAY", () => {
    it("sets optimistic to playing when idle", () => {
      const next = reducePlayState(IDLE, { type: "USER_PLAY" });
      expect(next.optimistic).toBe("playing");
    });

    it("returns same reference when already optimistically playing", () => {
      const next = reducePlayState(PLAYING, { type: "USER_PLAY" });
      expect(next).toBe(PLAYING);
    });
  });

  describe("USER_PAUSE", () => {
    it("sets optimistic to paused when playing", () => {
      const next = reducePlayState(PLAYING, { type: "USER_PAUSE" });
      expect(next.optimistic).toBe("paused");
    });

    it("returns same reference when already optimistically paused", () => {
      const next = reducePlayState(PAUSED, { type: "USER_PAUSE" });
      expect(next).toBe(PAUSED);
    });
  });

  describe("USER_TOGGLE", () => {
    it("flips playing → paused", () => {
      const next = reducePlayState(PLAYING, { type: "USER_TOGGLE" });
      expect(next.optimistic).toBe("paused");
    });

    it("flips paused → playing", () => {
      const next = reducePlayState(PAUSED, { type: "USER_TOGGLE" });
      expect(next.optimistic).toBe("playing");
    });

    it("flips idle → playing", () => {
      const next = reducePlayState(IDLE, { type: "USER_TOGGLE" });
      expect(next.optimistic).toBe("playing");
    });
  });

  describe("HOWL_PLAY", () => {
    it("sets real to playing and archives previous", () => {
      const next = reducePlayState(PAUSED, { type: "HOWL_PLAY" });
      expect(next.real).toBe("playing");
      expect(next.previous).toBe("paused");
    });

    it("returns same reference when already real-playing", () => {
      const next = reducePlayState(PLAYING, { type: "HOWL_PLAY" });
      expect(next).toBe(PLAYING);
    });
  });

  describe("HOWL_PAUSE", () => {
    it("sets real to paused and archives previous", () => {
      const next = reducePlayState(PLAYING, { type: "HOWL_PAUSE" });
      expect(next.real).toBe("paused");
      expect(next.previous).toBe("playing");
    });

    it("returns same reference when already real-paused", () => {
      const next = reducePlayState(PAUSED, { type: "HOWL_PAUSE" });
      expect(next).toBe(PAUSED);
    });
  });

  describe("HOWL_END", () => {
    it("always archives and sets real to paused", () => {
      const next = reducePlayState(PLAYING, { type: "HOWL_END" });
      expect(next.real).toBe("paused");
      expect(next.previous).toBe("playing");
    });
  });

  describe("HOWL_LOAD", () => {
    it("sets real to loading", () => {
      const next = reducePlayState(IDLE, { type: "HOWL_LOAD" });
      expect(next.real).toBe("loading");
    });

    it("archives concrete previous when transitioning from playing", () => {
      const next = reducePlayState(PLAYING, { type: "HOWL_LOAD" });
      expect(next.previous).toBe("playing");
    });
  });

  describe("HOWL_ERROR", () => {
    it("sets real to error", () => {
      const next = reducePlayState(IDLE, { type: "HOWL_ERROR" });
      expect(next.real).toBe("error");
    });
  });

  describe("RECONCILE", () => {
    it("pulls optimistic toward playing when real is playing", () => {
      const state: RP_PlayState = {
        real: "playing",
        optimistic: "paused",
        previous: "paused"
      };
      const next = reducePlayState(state, { type: "RECONCILE" });
      expect(next.optimistic).toBe("playing");
    });

    it("holds optimistic when real is loading", () => {
      const state: RP_PlayState = {
        real: "loading",
        optimistic: "playing",
        previous: "idle"
      };
      const next = reducePlayState(state, { type: "RECONCILE" });
      expect(next.optimistic).toBe("playing");
    });

    it("falls back to paused when real is error", () => {
      const state: RP_PlayState = {
        real: "error",
        optimistic: "playing",
        previous: "idle"
      };
      const next = reducePlayState(state, { type: "RECONCILE" });
      expect(next.optimistic).toBe("paused");
    });

    it("returns same reference when no drift to heal", () => {
      const next = reducePlayState(PLAYING, { type: "RECONCILE" });
      expect(next).toBe(PLAYING);
    });
  });

  describe("RESET", () => {
    it("collapses all fields to idle", () => {
      const next = reducePlayState(PLAYING, { type: "RESET" });
      expect(next).toEqual({
        real: "idle",
        optimistic: "idle",
        previous: "idle"
      });
    });
  });

  describe("immutability", () => {
    it("never mutates the input state", () => {
      const original = { ...PLAYING };
      reducePlayState(PLAYING, { type: "USER_TOGGLE" });
      expect(PLAYING).toEqual(original);
    });
  });
});
