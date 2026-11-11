import { importPKCS8, SignJWT } from "jose";
import { getAppleMusicConfig, isAppleMusicConfigured } from "./config";
import type { MusicTrackItem } from "./types";

interface CachedToken {
  token: string;
  expiresAt: number;
}

let cachedDeveloperToken: CachedToken | null = null;

/**
 * Generates or retrieves a cached Apple Music Developer Token (ES256 JWT).
 * Valid for 30 days.
 */
export async function getAppleMusicDeveloperToken(): Promise<string> {
  const config = getAppleMusicConfig();

  // If a pre-signed Developer Token is provided in environment, use it directly
  if (config.developerToken) {
    return config.developerToken;
  }

  const now = Math.floor(Date.now() / 1000);

  if (cachedDeveloperToken && cachedDeveloperToken.expiresAt > now + 300) {
    return cachedDeveloperToken.token;
  }

  if (!config.teamId || !config.keyId || !config.privateKey) {
    throw new Error(
      "Apple Music credentials incomplete. Provide either APPLE_DEVELOPER_TOKEN or (APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY)."
    );
  }

  try {
    const privateKey = await importPKCS8(config.privateKey, "ES256");
    const tokenLifetimeSeconds = 86400 * 30; // 30 days

    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "ES256", kid: config.keyId })
      .setIssuer(config.teamId)
      .setIssuedAt(now)
      .setExpirationTime(now + tokenLifetimeSeconds)
      .sign(privateKey);

    cachedDeveloperToken = {
      token,
      expiresAt: now + tokenLifetimeSeconds
    };

    return token;
  } catch (error) {
    throw new Error(
      `Failed to generate Apple Music Developer Token: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Formats Apple Music's template artwork URL (e.g. replacing {w}x{h} with 300x300)
 */
function formatArtworkUrl(templateUrl?: string, width = 300, height = 300): string | undefined {
  if (!templateUrl) return undefined;
  return templateUrl.replace("{w}", String(width)).replace("{h}", String(height));
}

/**
 * Search the Apple Music catalog for songs matching the query.
 * Falls back to local dev mock results if Apple Music credentials are not yet configured.
 */
export async function searchAppleMusicSongs(
  query: string,
  limit = 20,
  storefrontOverride?: string
): Promise<MusicTrackItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const config = getAppleMusicConfig();
  const storefront = storefrontOverride || config.storefront || "us";

  // Development Mock Fallback if environment variables are not set
  if (!isAppleMusicConfigured()) {
    return getDevMockSearchResults(trimmed, limit);
  }

  const developerToken = await getAppleMusicDeveloperToken();
  const searchUrl = `https://api.music.apple.com/v1/catalog/${storefront}/search?term=${encodeURIComponent(
    trimmed
  )}&types=songs&limit=${Math.min(limit, 25)}`;

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${developerToken}`
    },
    next: { revalidate: 60 } // Next.js cache for 60 seconds
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Apple Music API search failed (${response.status}): ${errorText}`);
  }

  interface AppleSongResource {
    id: string;
    type: string;
    attributes: {
      name: string;
      artistName: string;
      albumName?: string;
      durationInMillis?: number;
      isrc?: string;
      url?: string;
      artwork?: {
        url: string;
      };
      previews?: Array<{
        url: string;
      }>;
    };
  }

  const payload = (await response.json()) as {
    results?: {
      songs?: {
        data?: AppleSongResource[];
      };
    };
  };

  const songResources = payload.results?.songs?.data || [];

  return songResources.map((song) => ({
    id: song.id,
    provider: "apple_music",
    title: song.attributes.name,
    artist: song.attributes.artistName,
    album: song.attributes.albumName,
    isrc: song.attributes.isrc,
    duration: song.attributes.durationInMillis,
    coverUrl: formatArtworkUrl(song.attributes.artwork?.url, 300, 300),
    previewUrl: song.attributes.previews?.[0]?.url,
    url: song.attributes.url
  }));
}

export interface AppleMusicPlaylistDetails {
  id: string;
  title: string;
  description?: string;
  curatorName?: string;
  artworkUrl?: string;
  url?: string;
  trackCount: number;
  tracks: MusicTrackItem[];
}

/**
 * Extracts the storefront and playlist ID from an Apple Music share link or raw ID.
 * Examples:
 * - "https://music.apple.com/us/playlist/late-night/pl.u-12345" -> { storefront: "us", id: "pl.u-12345" }
 * - "pl.u-12345" -> { storefront: "us", id: "pl.u-12345" }
 */
export function parseAppleMusicPlaylistIdentifier(idOrUrl: string, defaultStorefront = "us"): {
  id: string;
  storefront: string;
} {
  const trimmed = idOrUrl.trim();

  try {
    const parsed = new URL(trimmed);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const storefront = segments[0]?.length === 2 ? segments[0].toLowerCase() : defaultStorefront;
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      return { id: lastSegment, storefront };
    }
  } catch {
    // Not a full URL string
  }

  // Handle direct ID (strip any accidental trailing query string or hash)
  const cleanId = trimmed.split("?")[0].split("#")[0].trim();
  return { id: cleanId, storefront: defaultStorefront };
}

const playlistCache = new Map<string, { data: AppleMusicPlaylistDetails; expiresAt: number }>();

/**
 * Fetches an Apple Music playlist by ID or public share URL.
 * Works with public/shared playlists using the Developer Token, or library playlists if userToken is supplied.
 */
export async function getAppleMusicPlaylist(
  idOrUrl: string,
  userTokenOverride?: string
): Promise<AppleMusicPlaylistDetails> {
  const config = getAppleMusicConfig();
  const { id, storefront } = parseAppleMusicPlaylistIdentifier(idOrUrl, config.storefront || "us");

  const cacheKey = `${storefront}:${id}`;
  if (!userTokenOverride) {
    const cached = playlistCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }
  }

  const developerToken = await getAppleMusicDeveloperToken();
  const effectiveUserToken = userTokenOverride || config.userToken;

  const isLibraryPlaylist = id.startsWith("p.");

  const endpoint = isLibraryPlaylist
    ? `https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(id)}?include=tracks`
    : `https://api.music.apple.com/v1/catalog/${storefront}/playlists/${encodeURIComponent(id)}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${developerToken}`
  };

  if (isLibraryPlaylist && effectiveUserToken) {
    headers["Music-User-Token"] = effectiveUserToken;
  }

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch Apple Music playlist (${response.status}): ${errorText}`);
  }

  interface AppleMusicPlaylistItem {
    id: string;
    attributes?: {
      name?: string;
      description?: { standard?: string };
      curatorName?: string;
      artwork?: { url?: string };
      url?: string;
    };
    relationships?: {
      tracks?: {
        data?: Array<{
          id: string;
          attributes?: {
            name?: string;
            artistName?: string;
            albumName?: string;
            isrc?: string;
            durationInMillis?: number;
            artwork?: { url?: string };
            previews?: Array<{ url?: string }>;
            url?: string;
          };
        }>;
      };
    };
  }

  const data = (await response.json()) as { data?: AppleMusicPlaylistItem[] };
  const playlistItem = data.data?.[0];

  if (!playlistItem) {
    throw new Error(`Playlist ${id} not found in Apple Music.`);
  }

  const attr = playlistItem.attributes || {};
  const tracksData = playlistItem.relationships?.tracks?.data || [];

  const tracks: MusicTrackItem[] = tracksData.map((t) => ({
    id: t.id,
    provider: "apple_music" as const,
    title: t.attributes?.name || "Untitled Track",
    artist: t.attributes?.artistName || "Unknown Artist",
    album: t.attributes?.albumName,
    isrc: t.attributes?.isrc,
    duration: t.attributes?.durationInMillis,
    coverUrl: formatArtworkUrl(t.attributes?.artwork?.url, 300, 300),
    previewUrl: t.attributes?.previews?.[0]?.url,
    url: t.attributes?.url
  }));

  const result: AppleMusicPlaylistDetails = {
    id: playlistItem.id,
    title: attr.name || "Untitled Playlist",
    description: attr.description?.standard,
    curatorName: attr.curatorName,
    artworkUrl: formatArtworkUrl(attr.artwork?.url, 600, 600),
    url: attr.url,
    trackCount: tracks.length,
    tracks
  };

  if (!userTokenOverride) {
    playlistCache.set(cacheKey, { data: result, expiresAt: Date.now() + 5 * 60 * 1000 });
  }

  return result;
}

/**
 * Pushes track catalog IDs to the owner's Apple Music playlist.
 * Requires APPLE_MUSIC_USER_TOKEN.
 */
export async function addTracksToApplePlaylist(
  playlistId: string,
  songCatalogIds: string[],
  userTokenOverride?: string
): Promise<{ success: boolean; addedCount: number; message?: string }> {
  if (songCatalogIds.length === 0) {
    return { success: true, addedCount: 0 };
  }

  const config = getAppleMusicConfig();
  const effectiveUserToken = userTokenOverride || config.userToken;

  if (!effectiveUserToken) {
    // In mock mode / pending token setup
    return {
      success: true,
      addedCount: songCatalogIds.length,
      message: "Sync simulated (Apple Music user token not configured in environment or setlist)."
    };
  }

  const developerToken = await getAppleMusicDeveloperToken();
  const endpoint = `https://api.music.apple.com/v1/me/library/playlists/${encodeURIComponent(
    playlistId
  )}/tracks`;

  const bodyData = {
    data: songCatalogIds.map((id) => ({
      id,
      type: "songs"
    }))
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${developerToken}`,
      "Music-User-Token": effectiveUserToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(bodyData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to add tracks to Apple Music playlist (${response.status}): ${errorText}`);
  }

  return { success: true, addedCount: songCatalogIds.length };
}

/**
 * Realistic mock songs for developer sandbox mode prior to entering production Apple developer keys.
 */
function getDevMockSearchResults(query: string, limit: number): MusicTrackItem[] {
  const catalog = [
    {
      id: "mock_1",
      provider: "apple_music" as const,
      title: `${query} (Original Mix)`,
      artist: "Sophomores Collective",
      album: "Volume 01: Night Sessions",
      isrc: "USSPH2600001",
      duration: 218000,
      coverUrl: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop",
      previewUrl: "https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3",
      url: "https://music.apple.com"
    },
    {
      id: "mock_2",
      provider: "apple_music" as const,
      title: `${query} - Club Re-Edit`,
      artist: "Gar & Friends",
      album: "Warehouse Resonance",
      isrc: "USSPH2600002",
      duration: 312000,
      coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop",
      previewUrl: "https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3",
      url: "https://music.apple.com"
    },
    {
      id: "mock_3",
      provider: "apple_music" as const,
      title: "Midnight Drive",
      artist: `${query} feat. Ambient`,
      album: "Tokyo Noir",
      isrc: "USSPH2600003",
      duration: 195000,
      coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&h=300&fit=crop",
      previewUrl: "https://cdn.freesound.org/previews/320/320655_5260872-lq.mp3",
      url: "https://music.apple.com"
    }
  ];

  return catalog.slice(0, limit);
}
