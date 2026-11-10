import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

const PLAYLIST_URL =
  "https://music.apple.com/kr/playlist/pl.u-LdbqqJmC2AEP9E?a=join&it=m42wwXZcOkXroXsOzOB3&l=en";
const SETLIST_SLUG = "seoul-2026";

export async function seedSeoul2026() {
  const { getAppleMusicPlaylist } = await import("@/lib/music/apple-music");
  const { getPayload } = await import("@/lib/payload");

  console.log("Connecting to Apple Music to pull live playlist metadata...");
  const playlist = await getAppleMusicPlaylist(PLAYLIST_URL);
  console.log(
    `Fetched "${playlist.title}" by ${playlist.curatorName} (${playlist.trackCount} base tracks on Apple Music).`
  );

  const payload = await getPayload();

  // Check or create Setlist (base tracks stay on Apple Music; Payload only stores attendee nominations)
  const existingSetlists = await payload.find({
    collection: "setlists",
    where: { slug: { equals: SETLIST_SLUG } },
    limit: 1
  });

  const defaultDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  let setlist;
  if (existingSetlists.docs.length > 0) {
    const existing = existingSetlists.docs[0];
    console.log(`Setlist "${existing.title}" already exists (ID: ${existing.id}). Updating metadata...`);
    setlist = await payload.update({
      collection: "setlists",
      id: existing.id,
      data: {
        title: playlist.title || "SEOUL 2026",
        description: playlist.description || "Sophomores SEOUL 2026 Collaborative Setlist",
        appleMusic: {
          playlistId: playlist.id,
          playlistUrl: playlist.url || PLAYLIST_URL
        },
        status: "active"
      }
    });
    console.log(`Updated Setlist "${setlist.title}".`);
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
    console.log(`Created Setlist "${setlist.title}" (ID: ${setlist.id}).`);
  }

  console.log(
    `\nSuccess! Setlist initialized. Zero base music tracks stored in DB — live Apple Music catalog remains single source of truth.`
  );
}

if (process.argv[1] && process.argv[1].includes("seed-seoul-2026")) {
  seedSeoul2026()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
