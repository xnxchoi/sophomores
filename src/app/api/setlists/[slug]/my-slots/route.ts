import { NextResponse } from "next/server";
import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getPayload } from "@/payload";
import { currentUser } from "@/lib/auth/server";
import { isCmsStaff } from "@/lib/auth/access";
import { evaluateUserEligibility, getUserSetlistSlots } from "@/lib/music/eligibility";
import type { Track } from "@/payload-types";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string }> };

export async function GET(
  _request: Request,
  { params }: Context
): Promise<Response> {
  const denied = denyReviewCustomerOperation(_request);
  if (denied) return denied;
  const { slug } = await params;
  const payload = await getPayload();
  const user = await currentUser();

  // 1. Fetch Setlist by Slug
  const query = await payload.find({
    collection: "setlists",
    depth: 0,
    where: { slug: { equals: slug } },
    limit: 1
  });

  const setlist = query.docs[0];
  if (!setlist || (setlist.isPublic !== true && !isCmsStaff(user))) {
    return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
  }

  // 2. Evaluate Eligibility
  const eligibility = await evaluateUserEligibility(payload, user, setlist);

  // 3. The member's entries, in the staff running order. Positions are computed.
  let entries: Track[] = [];
  if (user) {
    entries = (await getUserSetlistSlots(payload, user.id, setlist.id, user)).entries;
  }

  return NextResponse.json({
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          isPlaylistEligible: Boolean(user.isPlaylistEligible)
        }
      : null,
    eligibility,
    entries: entries.map((entry, index) => ({
      id: entry.id, position: index + 1, title: entry.title, artist: entry.artist, note: entry.note ?? undefined
    }))
  });
}
