import { NextResponse } from "next/server";
import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { Forbidden, NotFound } from "payload";
import { getPayload } from "@/payload";
import { withMusicGrant } from "@/payload/collections/music-grants";
import { evaluateUserEligibility, getUserSetlistSlots } from "@/lib/music/eligibility";
import { setlistLocalRequest } from "@/lib/music/local-request";
import { guardMusicRoute } from "@/lib/music/route-guard";
import { entryResponse, noteContent, parseEntryBody, setlistForEntry, trackContent } from "../entry";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string; entryId: string }> };

// An entry is addressed by its stable id. The write runs through Tracks access
// with a grant bound to that id, the member and the setlist, so the stored owner
// is checked by Payload, not by this route. Owner, setlist and seat never change
// after creation, and the running order lives in setlist-positions, which these
// writes never touch: an edit or delete cannot move anyone's place.
async function resolve(request: Request, params: Context["params"]) {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return { response: denied };
  const guard = await guardMusicRoute(request, "setlistEntries", "member");
  if (guard.response) return { response: guard.response };
  const { slug, entryId } = await params;
  if (!/^[A-Za-z0-9-]{1,64}$/.test(entryId)) {
    return { response: NextResponse.json({ error: "Invalid entry." }, { status: 400 }) };
  }
  const payload = await getPayload();
  const req = await setlistLocalRequest(payload, request, guard.user);
  const setlist = await setlistForEntry(payload, req, slug);
  if (!setlist) return { response: NextResponse.json({ error: "Setlist not found." }, { status: 404 }) };
  const eligibility = await evaluateUserEligibility(payload, guard.user as never, setlist);
  if (!eligibility.canEdit) {
    return {
      response: NextResponse.json(
        { error: "Entries can't change after the deadline or while the setlist is locked.", reason: eligibility.reason },
        { status: 403 }
      )
    };
  }
  const grant = { kind: "entry-write" as const, userId: String(guard.user.id), setlistId: String(setlist.id), entryId };
  return { payload, req, setlist, user: guard.user, entryId, grant };
}

const notYours = () => NextResponse.json({ error: "No such entry of yours." }, { status: 404 });

export async function PATCH(request: Request, { params }: Context): Promise<Response> {
  const ctx = await resolve(request, params);
  if (ctx.response) return ctx.response;
  const { payload, req, setlist, user, entryId, grant } = ctx;
  const body = await parseEntryBody(request, false);
  if ("error" in body) return NextResponse.json({ error: body.error }, { status: 400 });
  let saved;
  try {
    saved = await withMusicGrant(req, grant, () =>
      payload.update({ collection: "tracks", id: entryId, data: { ...(body.track ? trackContent(body.track) : {}), ...noteContent(body.note) }, overrideAccess: false, req })
    );
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) return notYours();
    throw error;
  }
  return entryResponse(payload, user, setlist, saved);
}

export async function DELETE(request: Request, { params }: Context): Promise<Response> {
  const ctx = await resolve(request, params);
  if (ctx.response) return ctx.response;
  const { payload, req, setlist, user, entryId, grant } = ctx;
  try {
    await withMusicGrant(req, grant, () =>
      payload.delete({ collection: "tracks", id: entryId, overrideAccess: false, req })
    );
  } catch (error) {
    if (error instanceof NotFound || error instanceof Forbidden) return notYours();
    throw error;
  }
  const { entries } = await getUserSetlistSlots(payload, String(user.id), String(setlist.id), user as never);
  return NextResponse.json({
    success: true,
    entries: entries.map((entry) => ({ id: entry.id, title: entry.title, artist: entry.artist, note: entry.note ?? undefined }))
  });
}
