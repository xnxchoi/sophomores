import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getPayload } from "@/payload";
import { evaluateUserEligibility, getUserSetlistSlots } from "@/lib/music/eligibility";
import { setlistLocalRequest } from "@/lib/music/local-request";
import { privateJson } from "@/lib/music/route-guard";
import type { Track, User } from "@/payload-types";

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
  // The caller's Payload principal: members arrive as "users", CMS staff as "admins".
  const req = await setlistLocalRequest(payload, _request);
  const user = (req.user ?? null) as User | null;

  // 1. Fetch the setlist by slug through Setlists access (private rows: CMS staff only).
  // Missing and not visible to this caller answer the same 404.
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
    return privateJson({ error: "Setlist not found" }, { status: 404 });
  }

  // 2. Evaluate Eligibility
  const eligibility = await evaluateUserEligibility(payload, user, setlist);

  // 3. The member's entries, in the staff running order. Positions are computed.
  let entries: Track[] = [];
  if (user) {
    entries = (await getUserSetlistSlots(payload, user.id, setlist.id, user)).entries;
  }

  return privateJson({
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          // Same key, now the live per-event answer (the stored flag is no longer used).
          isPlaylistEligible: eligibility.isEligible
        }
      : null,
    eligibility,
    entries: entries.map((entry, index) => ({
      id: entry.id, position: index + 1, title: entry.title, artist: entry.artist, note: entry.note ?? undefined
    }))
  });
}
