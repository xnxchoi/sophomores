import { NextResponse } from "next/server";
import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getPayload } from "@/payload";
import { setlistLocalRequest } from "@/lib/music/local-request";
import { guardMusicRoute } from "@/lib/music/route-guard";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string }> };

export async function GET(
  _request: Request,
  { params }: Context
): Promise<Response> {
  const denied = denyReviewCustomerOperation(_request);
  if (denied) return denied;
  const guard = await guardMusicRoute(_request, "setlistAppleToken", "curator");
  if (guard.response) return guard.response;
  const { slug } = await params;
  const payload = await getPayload();

  // Trusted read, curator-gated above: only a server read can see whether the
  // server-owned owner token exists. The response carries a boolean, never the token.
  const query = await payload.find({
    collection: "setlists",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    overrideAccess: true
  });

  const setlist = query.docs[0];
  if (!setlist) {
    return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
  }

  const hasToken = Boolean(
    setlist.appleMusic?.ownerUserToken || process.env.APPLE_MUSIC_USER_TOKEN
  );

  return NextResponse.json({
    isConfigured: hasToken,
    playlistId: setlist.appleMusic?.playlistId || null,
    playlistUrl: setlist.appleMusic?.playlistUrl || null
  }, { headers: { "cache-control": "private, no-store" } });
}

const optionalText = (value: unknown): value is string | undefined =>
  value === undefined || (typeof value === "string" && value.length <= 4096);

export async function POST(
  request: Request,
  { params }: Context
): Promise<Response> {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return denied;
  // Only curators (CMS staff) can bind owner credentials to a setlist
  const guard = await guardMusicRoute(request, "setlistAppleToken", "curator");
  if (guard.response) return guard.response;
  const { slug } = await params;
  const payload = await getPayload();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  // JSON null, arrays, numbers and non-string fields are malformed input, not server errors.
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { musicUserToken, playlistId, playlistUrl } = body as Record<string, unknown>;
  if (!optionalText(musicUserToken) || !optionalText(playlistId) || !optionalText(playlistUrl)) {
    return NextResponse.json({ error: "musicUserToken, playlistId and playlistUrl must be strings." }, { status: 400 });
  }
  if (!musicUserToken && !playlistId && !playlistUrl) {
    return NextResponse.json(
      { error: "At least one of musicUserToken, playlistId, or playlistUrl must be provided." },
      { status: 400 }
    );
  }

  // Look up and write through Setlists access as the curator's CMS staff
  // principal. Omitted appleMusic subfields keep their stored values, so the
  // owner token is never read back here.
  const req = await setlistLocalRequest(payload, request, guard.user);
  const query = await payload.find({
    collection: "setlists",
    where: { slug: { equals: slug } },
    limit: 1,
    depth: 0,
    select: { slug: true },
    overrideAccess: false,
    req
  });

  const setlist = query.docs[0];
  if (!setlist) {
    return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
  }

  await payload.update({
    collection: "setlists",
    id: setlist.id,
    data: {
      appleMusic: {
        ...(playlistId ? { playlistId } : {}),
        ...(playlistUrl ? { playlistUrl } : {}),
        ...(musicUserToken ? { ownerUserToken: musicUserToken } : {})
      }
    },
    depth: 0,
    overrideAccess: false,
    req
  });

  return NextResponse.json({
    success: true,
    message: "Apple Music playlist configuration updated successfully."
  }, { headers: { "cache-control": "private, no-store" } });
}
