import { getPayload } from "@/lib/payload";
import { getAppleMusicPlaylist } from "@/lib/music/apple-music";

const PLAYLIST_URL =
  "https://music.apple.com/kr/playlist/pl.u-LdbqqJmC2AEP9E?a=join&it=m42wwXZcOkXroXsOzOB3&l=en";
const SETLIST_SLUG = "seoul-2026";

export async function seedSeoul2026() {
  console.log("Connecting to Apple Music to pull live playlist...");
  const playlist = await getAppleMusicPlaylist(PLAYLIST_URL);
  console.log(`Fetched "${playlist.title}" by ${playlist.curatorName} (${playlist.trackCount} tracks).`);

  const payload = await getPayload();

  // 1. Check or create Setlist
  const existingSetlists = await payload.find({
    collection: "setlists",
    where: { slug: { equals: SETLIST_SLUG } },
    limit: 1
  });

  let setlist;
  // Default deadline: 14 days from now
  const defaultDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  if (existingSetlists.docs.length > 0) {
    setlist = existingSetlists.docs[0];
    console.log(`Setlist "${setlist.title}" already exists (ID: ${setlist.id}). Updating metadata...`);
    setlist = await payload.update({
      collection: "setlists",
      id: setlist.id,
      data: {
        title: playlist.title || "SEOUL 2026",
        appleMusic: {
          playlistId: playlist.id,
          playlistUrl: playlist.url || PLAYLIST_URL
        },
        status: "active"
      }
    });
  } else {
    console.log(`Creating new Setlist "${playlist.title}"...`);
    setlist = await payload.create({
      collection: "setlists",
      data: {
        title: playlist.title || "SEOUL 2026",
        slug: SETLIST_SLUG,
        description: playlist.description || "Sophomores SEOUL 2026 Collaborative Setlist",
        status: "active",
        deadline: defaultDeadline,
        maxSlotsPerUser: 2,
        provider: "apple_music",
        isPublic: true,
        appleMusic: {
          playlistId: playlist.id,
          playlistUrl: playlist.url || PLAYLIST_URL
        }
      }
    });
    console.log(`Created Setlist (ID: ${setlist.id}).`);
  }

  // 2. Ingest base tracks from Apple Music
  console.log(`Ingesting ${playlist.tracks.length} base tracks into Payload...`);
  const createdTrackIds: string[] = [];

  for (let i = 0; i < playlist.tracks.length; i++) {
    const t = playlist.tracks[i];
    const trackSlug = `seoul-2026-base-${i + 1}-${t.id}`;

    const existingTracks = await payload.find({
      collection: "tracks",
      where: {
        and: [
          { setlist: { equals: setlist.id } },
          { "appleMusic.id": { equals: t.id } }
        ]
      },
      limit: 1
    });

    if (existingTracks.docs.length > 0) {
      createdTrackIds.push(existingTracks.docs[0].id);
    } else {
      const doc = await payload.create({
        collection: "tracks",
        data: {
          title: t.title,
          artist: t.artist,
          slug: trackSlug,
          albumTitle: t.album,
          isrc: t.isrc,
          duration: t.duration,
          coverUrl: t.coverUrl,
          previewUrl: t.previewUrl,
          appleMusic: {
            id: t.id,
            url: t.url,
            storefront: "kr"
          },
          setlist: setlist.id,
          syncStatus: "synced",
          syncedAt: new Date().toISOString()
        }
      });
      createdTrackIds.push(doc.id);
    }
  }

  // 3. Link tracks in Setlist
  await payload.update({
    collection: "setlists",
    id: setlist.id,
    data: {
      tracks: createdTrackIds,
      lastSyncedAt: new Date().toISOString(),
      needsSync: false
    }
  });

  console.log(`\nSuccessfully seeded "${playlist.title}" with ${createdTrackIds.length} tracks!`);
}

if (process.argv[1] && process.argv[1].includes("seed-seoul-2026")) {
  seedSeoul2026().catch(console.error);
}
