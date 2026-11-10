import { NextResponse } from "next/server";
import { getPayload } from "@/lib/payload";
import { currentUser } from "@/lib/auth/server";
import { isCmsStaff } from "@/lib/auth/access";
import type { ContributedTrackView } from "@/lib/music/types";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string }> };

export async function GET(
  _request: Request,
  { params }: Context
): Promise<NextResponse> {
  const { slug } = await params;
  const payload = await getPayload();
  const user = await currentUser();

  // 1. Fetch Setlist by Slug
  const query = await payload.find({
    collection: "setlists",
    where: { slug: { equals: slug } },
    limit: 1
  });

  const setlist = query.docs[0];
  if (!setlist) {
    return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
  }

  // 2. Check Visibility (If private, only staff can view)
  const isStaff = isCmsStaff(user);
  if (!setlist.isPublic && !isStaff) {
    return NextResponse.json(
      { error: "This setlist is private and no longer accessible." },
      { status: 403 }
    );
  }

  // 3. Fetch Contributed Tracks
  const tracksResult = await payload.find({
    collection: "tracks",
    where: { setlist: { equals: setlist.id } },
    pagination: false,
    depth: 1
  });

  const formattedTracks: ContributedTrackView[] = tracksResult.docs.map((track) => {
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
      slotIndex: track.slotIndex || undefined,
      submittedByName: submitterDisplayName,
      note: track.note || undefined,
      externalUrl: track.appleMusic?.url || track.spotify?.url || undefined
    };
  });

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
      appleMusic: setlist.appleMusic,
      spotify: setlist.spotify,
      totalTracks: formattedTracks.length,
      tracks: formattedTracks
    }
  });
}
