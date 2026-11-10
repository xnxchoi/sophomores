import { NextResponse } from "next/server";
import { getPayload } from "@/lib/payload";
import { currentUser } from "@/lib/auth/server";
import { evaluateUserEligibility, getUserSetlistSlots } from "@/lib/music/eligibility";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string; slotIndex: string }> };

export async function DELETE(
  _request: Request,
  { params }: Context
): Promise<NextResponse> {
  const { slug, slotIndex: slotIndexStr } = await params;
  const payload = await getPayload();
  const user = await currentUser();

  if (!user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const slotIndex = parseInt(slotIndexStr, 10);
  if (isNaN(slotIndex) || slotIndex < 1 || slotIndex > 2) {
    return NextResponse.json({ error: "Invalid slot index." }, { status: 400 });
  }

  // 1. Fetch Setlist by Slug
  const query = await payload.find({
    collection: "setlists",
    where: { slug: { equals: slug } },
    limit: 1
  });

  const setlist = query.docs[0];
  if (!setlist) {
    return NextResponse.json({ error: "Setlist not found." }, { status: 404 });
  }

  // 2. Check Eligibility & Deadline
  const eligibility = await evaluateUserEligibility(payload, user, setlist);
  if (!eligibility.canEdit) {
    return NextResponse.json(
      {
        error: "Cannot clear slot after the deadline or while setlist is locked.",
        reason: eligibility.reason
      },
      { status: 403 }
    );
  }

  // 3. Find and Delete Track in this Slot
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

  const trackToDelete = existingTracks.docs[0];
  if (!trackToDelete) {
    return NextResponse.json({ error: "No track found in this slot." }, { status: 404 });
  }

  await payload.delete({
    collection: "tracks",
    id: trackToDelete.id
  });

  // Mark setlist as needing background sync
  await payload.update({
    collection: "setlists",
    id: setlist.id,
    data: { needsSync: true }
  });

  const updatedSlots = await getUserSetlistSlots(payload, user.id, setlist.id);

  return NextResponse.json({
    success: true,
    message: `Slot ${slotIndex} cleared.`,
    slots: updatedSlots
  });
}
