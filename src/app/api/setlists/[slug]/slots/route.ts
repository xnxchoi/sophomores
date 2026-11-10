import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPayload } from "@/lib/payload";
import { currentUser } from "@/lib/auth/server";
import { evaluateUserEligibility, getUserSetlistSlots } from "@/lib/music/eligibility";
import type { MusicTrackItem } from "@/lib/music/types";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string }> };

interface SubmitSlotBody {
  slotIndex: number;
  track: MusicTrackItem;
  note?: string;
}

export async function POST(
  request: Request,
  { params }: Context
): Promise<NextResponse> {
  const { slug } = await params;
  const payload = await getPayload();
  const user = await currentUser();

  // 1. Verify User Authentication
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required to submit tracks." },
      { status: 401 }
    );
  }

  // 2. Fetch Setlist by Slug
  const query = await payload.find({
    collection: "setlists",
    where: { slug: { equals: slug } },
    limit: 1
  });

  const setlist = query.docs[0];
  if (!setlist) {
    return NextResponse.json({ error: "Setlist not found." }, { status: 404 });
  }

  // 3. Verify Eligibility & Deadline
  const eligibility = await evaluateUserEligibility(payload, user, setlist);
  if (!eligibility.canEdit) {
    return NextResponse.json(
      {
        error: "You are not eligible to modify slots for this setlist.",
        reason: eligibility.reason
      },
      { status: 403 }
    );
  }

  // 4. Parse & Validate Request Body
  let body: SubmitSlotBody;
  try {
    body = (await request.json()) as SubmitSlotBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { slotIndex, track, note } = body;

  const maxSlots = setlist.maxSlotsPerUser || 2;
  if (!slotIndex || slotIndex < 1 || slotIndex > maxSlots) {
    return NextResponse.json(
      { error: `Invalid slot index. Must be between 1 and ${maxSlots}.` },
      { status: 400 }
    );
  }

  if (!track || !track.title || !track.artist || !track.id) {
    return NextResponse.json(
      { error: "Track metadata incomplete (title, artist, and ID required)." },
      { status: 400 }
    );
  }

  // 5. Check if user already submitted for this specific slot
  const existingTracks = await payload.find({
    collection: "tracks",
    where: {
      and: [
        { setlist: { equals: setlist.id } },
        { submittedBy: { equals: user.id } },
        { slotIndex: { equals: slotIndex } }
      ]
    },
    limit: 1
  });

  const existingTrack = existingTracks.docs[0];

  const generatedSlug = `${track.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "track"}-${nanoid(6)}`;

  const trackPayloadData = {
    title: track.title,
    artist: track.artist,
    slug: existingTrack?.slug || generatedSlug,
    albumTitle: track.album || undefined,
    duration: track.duration,
    coverUrl: track.coverUrl,
    previewUrl: track.previewUrl,
    isrc: track.isrc,
    appleMusic: {
      id: track.id,
      url: track.url || `https://music.apple.com/song/${track.id}`,
      storefront: "us"
    },
    setlist: setlist.id,
    submittedBy: user.id,
    slotIndex,
    note: note ? note.slice(0, 120) : undefined,
    syncStatus: "pending" as const
  };

  let savedTrack;
  if (existingTrack) {
    // Update existing slot entry
    savedTrack = await payload.update({
      collection: "tracks",
      id: existingTrack.id,
      data: trackPayloadData
    });
  } else {
    // Create new track entry in this slot
    savedTrack = await payload.create({
      collection: "tracks",
      data: trackPayloadData
    });
  }

  // Mark setlist as needing background sync
  await payload.update({
    collection: "setlists",
    id: setlist.id,
    data: { needsSync: true }
  });

  const updatedSlots = await getUserSetlistSlots(payload, user.id, setlist.id);

  return NextResponse.json({
    success: true,
    savedTrack: {
      id: savedTrack.id,
      title: savedTrack.title,
      artist: savedTrack.artist,
      slotIndex: savedTrack.slotIndex,
      syncStatus: savedTrack.syncStatus
    },
    slots: updatedSlots
  });
}
