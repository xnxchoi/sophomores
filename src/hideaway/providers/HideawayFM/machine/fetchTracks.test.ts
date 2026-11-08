import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchTracks, MANUAL_RADIO_TRACKS, pickSeed } from "./fetchTracks";
import type { PersistedSeed, SeedResult } from "./fetchTracks";
import type { RP_Track } from "../types";
import { SESSION_RESUME_TTL_MIN } from "../constants";

const TTL_MS = SESSION_RESUME_TTL_MIN * 60 * 1000;

const makeTrack = (overrides: Partial<RP_Track> = {}): RP_Track => ({
  id: "track-1",
  title: "Test Track",
  artist: "Test Artist",
  album: "Test Album",
  duration: 240,
  url: "/api/tracks/stream/track-1",
  cover: null,
  ...overrides
});

const TRACKS: RP_Track[] = [
  makeTrack({ id: "t1", duration: 200 }),
  makeTrack({ id: "t2", duration: 300 }),
  makeTrack({ id: "t3", duration: 180 })
];

describe("fetchTracks", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("falls back to the manual radio roll when Payload has no tracks", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ docs: [] })
      })
    );

    await expect(fetchTracks()).resolves.toEqual(MANUAL_RADIO_TRACKS);
  });

  it("falls back to the manual radio roll when Payload tracks are not playable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          docs: [
            {
              id: "payload-track-1",
              title: "Draft Track",
              artist: "YM.FM",
              duration: 0,
              url: null,
              album: null
            }
          ]
        })
      })
    );

    await expect(fetchTracks()).resolves.toEqual(MANUAL_RADIO_TRACKS);
  });

  it("prefers playable Payload tracks when present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          docs: [
            {
              id: "payload-track-1",
              title: "Payload Track",
              artist: "YM.FM",
              duration: 144,
              url: "/media/payload-track.mp3",
              album: {
                id: "album-1",
                title: "Payload Album",
                slug: "payload-album",
                cover: null
              },
              slug: "payload-track"
            }
          ]
        })
      })
    );

    await expect(fetchTracks()).resolves.toEqual([
      {
        id: "payload-track-1",
        title: "Payload Track",
        artist: "YM.FM",
        album: "Payload Album",
        albumId: "album-1",
        albumSlug: "payload-album",
        slug: "payload-track",
        duration: 144,
        url: "/api/tracks/stream/payload-track-1",
        cover: null
      }
    ]);
  });
});

describe("pickSeed", () => {
  describe("empty tracks", () => {
    it("throws when tracks array is empty", () => {
      expect(() => pickSeed([], null)).toThrow(
        "HideawayFM: no tracks available to seed"
      );
    });
  });

  describe("fresh persisted seed", () => {
    let now: number;

    beforeEach(() => {
      now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("resumes from persisted seed when fresh and index in bounds", () => {
      const persisted: PersistedSeed = {
        index: 1,
        time: 120,
        ts: now - 1000 // 1 second ago — well within TTL
      };
      const result = pickSeed(TRACKS, persisted);
      expect(result.index).toBe(1);
      expect(result.seekSec).toBe(120);
    });

    it("clamps seekSec to duration - 1 when persisted time exceeds duration", () => {
      const persisted: PersistedSeed = {
        index: 0,
        time: 9999,
        ts: now - 1000
      };
      const result = pickSeed(TRACKS, persisted);
      expect(result.index).toBe(0);
      // track duration = 200, so max seek = max(200 - 1, 0) = 199
      expect(result.seekSec).toBe(199);
    });

    it("falls through to random seed when persisted time is negative", () => {
      // isFreshSeed rejects time < 0, so negative time is treated as invalid
      const persisted: PersistedSeed = {
        index: 0,
        time: -50,
        ts: now - 1000
      };
      const result = pickSeed(TRACKS, persisted);
      // Falls through to random — index must still be valid
      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.index).toBeLessThan(TRACKS.length);
    });

    it("falls through to random seed when index is out of bounds", () => {
      const persisted: PersistedSeed = {
        index: 999, // beyond TRACKS.length
        time: 10,
        ts: now - 1000
      };
      const result = pickSeed(TRACKS, persisted);
      // index must be a valid index, not 999
      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.index).toBeLessThan(TRACKS.length);
    });
  });

  describe("stale persisted seed — falls back to random", () => {
    let now: number;

    beforeEach(() => {
      now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("ignores seed older than TTL", () => {
      const staleSeed: PersistedSeed = {
        index: 0,
        time: 60,
        ts: now - TTL_MS - 1 // one ms past TTL
      };
      // random path — just verify it returns a valid index
      const result = pickSeed(TRACKS, staleSeed);
      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.index).toBeLessThan(TRACKS.length);
    });
  });

  describe("null / malformed persisted seed — falls back to random", () => {
    it("handles null persisted", () => {
      const result = pickSeed(TRACKS, null);
      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.index).toBeLessThan(TRACKS.length);
    });

    it("handles persisted with missing index", () => {
      const result = pickSeed(TRACKS, { time: 10, ts: Date.now() });
      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.index).toBeLessThan(TRACKS.length);
    });

    it("handles persisted with negative index", () => {
      const result = pickSeed(TRACKS, { index: -1, time: 10, ts: Date.now() });
      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.index).toBeLessThan(TRACKS.length);
    });

    it("handles persisted with missing ts", () => {
      const result = pickSeed(TRACKS, { index: 0, time: 10 });
      expect(result.index).toBeGreaterThanOrEqual(0);
    });

    it("handles persisted with NaN time", () => {
      const result = pickSeed(TRACKS, {
        index: 0,
        time: NaN,
        ts: Date.now()
      });
      expect(result.index).toBeGreaterThanOrEqual(0);
    });
  });

  describe("random seed properties", () => {
    it("seekSec stays within 70% of track duration (SEEK_WINDOW)", () => {
      // Run many iterations to confirm the 70% cap holds
      for (let i = 0; i < 200; i++) {
        const result = pickSeed(TRACKS, null);
        const track = TRACKS[result.index];
        expect(result.seekSec).toBeGreaterThanOrEqual(0);
        expect(result.seekSec).toBeLessThan(
          track.duration * 0.7 + Number.EPSILON
        );
      }
    });

    it("returns a valid index when single track provided", () => {
      const single = [makeTrack({ id: "only", duration: 120 })];
      const result = pickSeed(single, null);
      expect(result.index).toBe(0);
      expect(result.seekSec).toBeGreaterThanOrEqual(0);
      expect(result.seekSec).toBeLessThan(120 * 0.7 + Number.EPSILON);
    });
  });

  describe("return shape", () => {
    it("always returns index and seekSec", () => {
      const result: SeedResult = pickSeed(TRACKS, null);
      expect(typeof result.index).toBe("number");
      expect(typeof result.seekSec).toBe("number");
    });
  });
});
