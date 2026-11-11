import type { Payload } from "payload";
import { addTracksToApplePlaylist } from "./apple-music";

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  status: string;
  isLocked: boolean;
  message?: string;
}

/**
 * Synchronizes pending attendee track submissions to the owner's Apple Music playlist.
 * Also automatically locks and privatizes the setlist if the deadline has passed.
 */
export async function syncSetlistToAppleMusic(
  payload: Payload,
  setlistIdOrSlug: string
): Promise<SyncResult> {
  // 1. Fetch Setlist
  let setlist;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    setlistIdOrSlug
  );

  if (isUUID) {
    setlist = await payload.findByID({
      collection: "setlists",
      id: setlistIdOrSlug
    });
  } else {
    const query = await payload.find({
      collection: "setlists",
      where: { slug: { equals: setlistIdOrSlug } },
      limit: 1
    });
    setlist = query.docs[0];
  }

  if (!setlist) {
    throw new Error(`Setlist not found: ${setlistIdOrSlug}`);
  }

  // 2. Check Deadline Enforcement
  const now = new Date();
  const deadline = new Date(setlist.deadline);
  const isPastDeadline = now >= deadline;

  let currentStatus = setlist.status;
  let isPublic = setlist.isPublic;

  // Auto-lock and privatize if deadline has passed
  if (isPastDeadline && (setlist.status === "active" || setlist.isPublic)) {
    currentStatus = "locked";
    isPublic = false;
    await payload.update({
      collection: "setlists",
      id: setlist.id,
      data: {
        status: "locked",
        isPublic: false
      }
    });
  }

  // 3. Find pending tracks to sync
  const pendingTracks = await payload.find({
    collection: "tracks",
    where: {
      and: [
        { setlist: { equals: setlist.id } },
        { syncStatus: { equals: "pending" } }
      ]
    },
    pagination: false
  });

  const appleSongIdsToSync: string[] = [];
  const trackIdsToMark: string[] = [];

  for (const track of pendingTracks.docs) {
    const appleId = track.appleMusic?.id;
    if (appleId) {
      appleSongIdsToSync.push(appleId);
      trackIdsToMark.push(track.id);
    }
  }

  // 4. Push to Apple Music if playlistId configured
  const playlistId = setlist.appleMusic?.playlistId;
  let syncMessage: string | undefined;

  if (playlistId && appleSongIdsToSync.length > 0) {
    const pushResult = await addTracksToApplePlaylist(
      playlistId,
      appleSongIdsToSync,
      setlist.appleMusic?.ownerUserToken || undefined
    );
    syncMessage = pushResult.message;

    // Mark tracks as synced
    for (const trackId of trackIdsToMark) {
      await payload.update({
        collection: "tracks",
        id: trackId,
        data: {
          syncStatus: "synced",
          syncedAt: new Date().toISOString()
        }
      });
    }
  }

  // 5. Update Setlist lastSyncedAt and needsSync flag
  // Also collect all track IDs to maintain setlist.tracks relationship
  const allSetlistTracks = await payload.find({
    collection: "tracks",
    where: { setlist: { equals: setlist.id } },
    pagination: false
  });

  await payload.update({
    collection: "setlists",
    id: setlist.id,
    data: {
      tracks: allSetlistTracks.docs.map((t) => t.id),
      lastSyncedAt: new Date().toISOString(),
      needsSync: false
    }
  });

  return {
    success: true,
    syncedCount: appleSongIdsToSync.length,
    status: currentStatus,
    isLocked: isPastDeadline,
    message: syncMessage
  };
}
