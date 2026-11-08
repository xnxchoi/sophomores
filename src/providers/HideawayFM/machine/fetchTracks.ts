/**
 * Loads the full roll of Payload `tracks` docs and hydrates each into the
 * minimal `RP_Track` shape the HideawayFM runtime actually renders. A single
 * REST call with `depth=2` is used so the album relation arrives populated —
 * cheaper than a second per-track album fetch and simpler than stitching
 * together two response sets.
 *
 * `pickSeed` owns the radio-station "feel" on first load: we either resume a
 * fresh-enough persisted position or pick a random index and drop the
 * playhead somewhere in the first 70% of the track. The 30% tail is avoided
 * so the seed never lands inside a natural outro, which otherwise makes the
 * station feel stale the instant it opens.
 *
 * Errors are soft: a failed fetch resolves to the bundled manual roll so the
 * provider can still mount the player without requiring seeded Payload docs.
 */

import type { Album, Media, Track } from "@/payload-types";

import { SESSION_RESUME_TTL_MIN } from "../constants";
import type { RP_Track } from "../types";

interface PayloadListResponse<T> {
  docs: T[];
  totalDocs?: number;
  hasNextPage?: boolean;
}

export interface PersistedSeed {
  index?: number;
  time?: number;
  ts?: number;
}

export interface SeedResult {
  index: number;
  seekSec: number;
}

const TRACKS_ENDPOINT = "/api/tracks?limit=200&depth=2";
const STREAM_PREFIX = "/api/tracks/stream";
const SEEK_WINDOW = 0.7;
const TTL_MS = SESSION_RESUME_TTL_MIN * 60 * 1000;

/**
 * Static manual roll. Used when running in dev (no Payload media seeded) or
 * when a production fetch returns zero playable tracks. Keep this client-safe:
 * no server actions, filesystem metadata reads, or runtime UUIDs. The player
 * gates on `tracks.length`, so this array is what keeps `/radio` mountable.
 */
export const MANUAL_RADIO_TRACKS: RP_Track[] = [
  {
    id: "manual-radio-track-001",
    album: "Hideaway Ambience",
    duration: 96.522,
    title: "Don't Wanna Know",
    url: "/track_media/Track_1.mp3",
    artist: "YM.FM"
  },
  {
    id: "manual-radio-track-002",
    title: "Gin Fizz Shibuya",
    album: "Hideaway Ambience",
    duration: 127.269,
    url: "/track_media/Track_2.mp3",
    artist: "YM.FM"
  },
  {
    id: "manual-radio-track-003",
    title: "Funk Confessions",
    album: "Hideaway Ambience",
    duration: 90.54,
    url: "/track_media/Track_3.mp3",
    artist: "YM.FM"
  },
  {
    id: "manual-radio-track-004",
    title: "Cooled Breeze",
    album: "Hideaway Ambience",
    duration: 62.563,
    url: "/track_media/Track_4.mp3",
    artist: "YM.FM"
  },
  {
    id: "manual-radio-track-005",
    title: "Parisienne Tabac",
    album: "Hideaway Ambience",
    duration: 108.878,
    url: "/track_media/Track_5.mp3",
    artist: "YM.FM"
  },
  {
    id: "manual-radio-track-006",
    title: "Pigalle Nights",
    album: "Hideaway Ambience",
    duration: 90.514,
    url: "/track_media/Track_6.mp3",
    artist: "YM.FM"
  },
  {
    id: "manual-radio-track-007",
    title: "Rex",
    album: "Hideaway Ambience",
    duration: 160.157,
    url: "/track_media/Track_7.mp3",
    artist: "YM.FM"
  },
  {
    id: "manual-radio-track-008",
    title: "Part 8",
    album: "Hideaway Ambience",
    duration: 28.029,
    url: "/track_media/Track_8.mp3",
    artist: "The Estate"
  },
  {
    id: "manual-radio-track-009",
    title: "Part 9",
    album: "Hideaway Ambience",
    duration: 35.422,
    url: "/track_media/Track_9.mp3",
    artist: "The Estate"
  }
];

const isAlbumObject = (album: Track["album"]): album is Album =>
  typeof album === "object" && album !== null;

const isMediaObject = (cover: Album["cover"]): cover is Media =>
  typeof cover === "object" && cover !== null;

const resolveCover = (album: Track["album"]): string | null => {
  if (!isAlbumObject(album)) return null;
  const { cover } = album;
  if (!cover) return null;
  if (isMediaObject(cover)) return cover.url ?? null;
  return null;
};

const toRPTrack = (track: Track): RP_Track | null => {
  if (!track.url || !(track.duration > 0)) return null;

  const albumObject = isAlbumObject(track.album) ? track.album : null;

  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: albumObject?.title ?? "",
    albumId: albumObject?.id,
    albumSlug: albumObject?.slug ?? track.albumSlug ?? undefined,
    slug: track.slug,
    duration: track.duration,
    url: `${STREAM_PREFIX}/${track.id}`,
    cover: resolveCover(track.album)
  };
};

const manualRadioTracks = (): RP_Track[] =>
  MANUAL_RADIO_TRACKS.map((track) => ({ ...track }));

const withManualFallback = (tracks: RP_Track[]) =>
  tracks.length > 0 ? tracks : manualRadioTracks();

export async function fetchTracks(): Promise<RP_Track[]> {
  if (process.env.NODE_ENV === "development") {
    return manualRadioTracks();
  }

  try {
    const response = await fetch(TRACKS_ENDPOINT, {
      credentials: "include",
      headers: { accept: "application/json" }
    });

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `[HideawayFM] fetchTracks failed: ${response.status} ${response.statusText}`
        );
      }
      return withManualFallback([]);
    }

    const payload = (await response.json()) as PayloadListResponse<Track>;
    const docs = Array.isArray(payload.docs) ? payload.docs : [];

    const mapped = docs.reduce<RP_Track[]>((acc, doc) => {
      const result = toRPTrack(doc);
      if (result) acc.push(result);
      return acc;
    }, []);

    return withManualFallback(mapped);
  } catch (error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[HideawayFM] fetchTracks threw", error);
    }
    return withManualFallback([]);
  }
}

const isFreshSeed = (
  persisted: PersistedSeed | null,
  now: number
): persisted is Required<Pick<PersistedSeed, "index" | "time" | "ts">> => {
  if (!persisted) return false;
  const { index, time, ts } = persisted;
  if (typeof index !== "number" || index < 0) return false;
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0) {
    return false;
  }
  if (typeof ts !== "number" || !Number.isFinite(ts)) return false;
  return now - ts < TTL_MS;
};

export function pickSeed(
  tracks: RP_Track[],
  persisted: PersistedSeed | null
): SeedResult {
  if (tracks.length === 0) {
    throw new Error("HideawayFM: no tracks available to seed");
  }

  const now = Date.now();

  if (isFreshSeed(persisted, now) && persisted.index < tracks.length) {
    const track = tracks[persisted.index];
    const clampedSeek = Math.min(
      Math.max(persisted.time, 0),
      Math.max(track.duration - 1, 0)
    );
    return { index: persisted.index, seekSec: clampedSeek };
  }

  const index = Math.floor(Math.random() * tracks.length);
  const track = tracks[index];
  const seekSec = Math.random() * track.duration * SEEK_WINDOW;
  return { index, seekSec };
}
