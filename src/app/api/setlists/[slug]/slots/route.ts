import { NextResponse } from "next/server";
import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { Forbidden, ValidationError } from "payload";
import { getPayload } from "@/payload";
import { withMusicGrant } from "@/payload/collections/music-grants";
import { entryCap, evaluateUserEligibility, getUserSetlistSlots } from "@/lib/music/eligibility";
import { setlistLocalRequest } from "@/lib/music/local-request";
import { guardMusicRoute } from "@/lib/music/route-guard";
import { entryResponse, noteContent, parseEntryBody, setlistForEntry, trackContent } from "./entry";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string }> };

/**
 * A simultaneous create already took this seat: the Tracks unique
 * (setlist, submittedBy, slotIndex) index rejected it. The Postgres adapter
 * reports that as a ValidationError naming the index columns; any other unique
 * clash (such as slug) is not a taken seat. The rejected statement aborted this
 * request's transaction, so nothing retries on it.
 */
function isSeatTaken(error: unknown): boolean {
  if (!(error instanceof ValidationError) || error.data.collection !== "tracks") return false;
  const { errors } = error.data;
  return errors.length === 1 && errors[0].path === "setlist_id, submitted_by_id, slot_index";
}

/** Adds a new entry. Where it goes is up to staff: it joins the end of the running order. */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return denied;
  const guard = await guardMusicRoute(request, "setlistEntries", "member");
  if (guard.response) return guard.response;
  const { slug } = await params;
  const payload = await getPayload();
  const req = await setlistLocalRequest(payload, request, guard.user);
  const user = guard.user;

  const setlist = await setlistForEntry(payload, req, slug);
  if (!setlist) return NextResponse.json({ error: "Setlist not found." }, { status: 404 });

  const eligibility = await evaluateUserEligibility(payload, user as never, setlist);
  if (!eligibility.canEdit) {
    return NextResponse.json(
      { error: "You are not eligible to add entries to this setlist.", reason: eligibility.reason },
      { status: 403 }
    );
  }

  const body = await parseEntryBody(request, true);
  if ("error" in body) return NextResponse.json({ error: body.error }, { status: 400 });

  // The hidden seat holds the cap: the first free one, or none when full.
  const cap = entryCap(setlist);
  const { entries } = await getUserSetlistSlots(payload, String(user.id), String(setlist.id), user as never);
  // Count entries, not seats: an entry without a valid seat still counts.
  const taken = new Set(entries.map((entry) => entry.slotIndex));
  const seat = entries.length >= cap ? undefined : [1, 2].slice(0, cap).find((candidate) => !taken.has(candidate));
  if (seat === undefined) {
    return NextResponse.json({ error: `You already have ${cap} entries here.` }, { status: 409 });
  }

  let saved;
  try {
    saved = await withMusicGrant(
      req,
      { kind: "entry-create", userId: String(user.id), setlistId: String(setlist.id), seat },
      () => payload.create({
        collection: "tracks",
        data: { ...trackContent(body.track!), ...noteContent(body.note), setlist: setlist.id, submittedBy: user.id, slotIndex: seat },
        overrideAccess: false,
        req
      })
    );
  } catch (error) {
    if (error instanceof Forbidden) return NextResponse.json({ error: "You cannot add this entry." }, { status: 403 });
    if (isSeatTaken(error)) {
      return NextResponse.json({ error: "Another entry was just added. Refresh and try again." }, { status: 409 });
    }
    throw error;
  }
  return entryResponse(payload, user, setlist, saved);
}
