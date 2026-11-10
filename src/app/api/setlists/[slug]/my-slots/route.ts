import { NextResponse } from "next/server";
import { getPayload } from "@/lib/payload";
import { currentUser } from "@/lib/auth/server";
import { evaluateUserEligibility, getUserSetlistSlots } from "@/lib/music/eligibility";

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

  // 2. Evaluate Eligibility
  const eligibility = await evaluateUserEligibility(payload, user, setlist);

  // 3. If user is logged in, fetch their current slots
  let slots = { slot1: null, slot2: null, totalFilled: 0 };
  if (user) {
    const userSlots = await getUserSetlistSlots(payload, user.id, setlist.id);
    slots = {
      slot1: userSlots.slot1 as any,
      slot2: userSlots.slot2 as any,
      totalFilled: userSlots.totalFilled
    };
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
    slots
  });
}
