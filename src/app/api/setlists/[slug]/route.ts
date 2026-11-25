import { isReviewCopyRequest } from "@/lib/auth/review-editor-policy";
import { NextResponse } from "next/server";
import { getPayload } from "@/payload";
import { getAppleMusicPlaylist } from "@/lib/music/apple-music";
import { setlistLocalRequest } from "@/lib/music/local-request";
import { inRunningOrder, runningOrder } from "@/lib/music/running-order";
import type { ContributedTrackView } from "@/lib/music/types";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string }> };

export async function GET(
  _request: Request,
  { params }: Context
): Promise<NextResponse> {
  const { slug } = await params;
  const payload = await getPayload();
  // One request carrying the caller's Payload principal: both reads below run through
  // collection access, so a private setlist is visible to CMS staff only.
  const req = await setlistLocalRequest(payload, _request);

  // 1-2. Fetch the setlist by slug through Setlists access. Missing and not visible
  // to this caller answer the same 404.
  const query = await payload.find({
    collection: "setlists",
    depth: 0,
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: false,
    req
  });

  const setlist = query.docs[0];
  if (!setlist) {
    return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
  }

  // 3. Fetch Base tracks from Apple Music (if playlist configured)
  let baseTracks: ContributedTrackView[] = [];
  const playlistUrl = setlist.appleMusic?.playlistUrl;
  const review = isReviewCopyRequest(_request);
  if (playlistUrl && (!review || setlist.isPublic === true)) {
    try {
      const applePlaylist = review
        ? await getAppleMusicPlaylist(playlistUrl, undefined, { catalogOnly: true })
        : await getAppleMusicPlaylist(playlistUrl);
      baseTracks = applePlaylist.tracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        albumTitle: t.album,
        coverUrl: t.coverUrl,
        previewUrl: t.previewUrl,
        duration: t.duration,
        isrc: t.isrc,
        externalUrl: t.url
      }));
    } catch {
      console.warn("Could not fetch base tracks from Apple Music.");
    }
  }

  // 4. Fetch Attendee Contributed Tracks from Payload
  const tracksResult = await payload.find({
    collection: "tracks",
    overrideAccess: false,
    req,
    where: { setlist: { equals: setlist.id } },
    pagination: false,
    depth: 1
  });

  // Staff running order; the numbers shown are positions in this list.
  const ordered = inRunningOrder(tracksResult.docs, await runningOrder(payload, String(setlist.id)));
  const attendeeTracks: ContributedTrackView[] = ordered.map((track) => {
    let submitterDisplayName = "Guest Contributor";
    if (track.submittedBy && typeof track.submittedBy === "object") {
      const subUser = track.submittedBy as { name?: string; email?: string };
      submitterDisplayName = subUser.name || (subUser.email ? subUser.email.split("@")[0] : "Attendee");
    }

    return {
      id: track.id,
      title: track.title,
      artist: track.artist || "Unknown Artist",
      albumTitle: track.albumTitle || undefined,
      coverUrl: track.coverUrl || undefined,
      previewUrl: track.previewUrl || undefined,
      duration: track.duration || undefined,
      isrc: track.isrc || undefined,
      submittedByName: submitterDisplayName,
      note: track.note || undefined,
      externalUrl: track.appleMusic?.url || track.spotify?.url || undefined
    };
  });

  const allTracks = [...baseTracks, ...attendeeTracks];
  const isPastDeadline = new Date() >= new Date(setlist.deadline);

  return NextResponse.json({
    setlist: {
      id: setlist.id,
      title: setlist.title,
      slug: setlist.slug,
      description: setlist.description,
      status: setlist.status,
      deadline: setlist.deadline,
      isPastDeadline,
      provider: setlist.provider,
      appleMusic: setlist.appleMusic && {
        playlistId: setlist.appleMusic.playlistId,
        playlistUrl: setlist.appleMusic.playlistUrl
      },
      spotify: setlist.spotify,
      totalTracks: allTracks.length,
      tracks: allTracks
    }
  });
}
