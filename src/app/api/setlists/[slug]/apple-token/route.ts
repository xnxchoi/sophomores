import { NextResponse } from "next/server";
import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getPayload } from "@/payload";
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

  const query = await payload.find({
    collection: "setlists",
    where: { slug: { equals: slug } },
    limit: 1
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

export async function POST(
  request: Request,
  { params }: Context
): Promise<Response> {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return denied;
  // Only curators / admins can bind owner credentials to a setlist
  const guard = await guardMusicRoute(request, "setlistAppleToken", "curator");
  if (guard.response) return guard.response;
  const { slug } = await params;
  const payload = await getPayload();

  let body: { musicUserToken?: string; playlistId?: string; playlistUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { musicUserToken, playlistId, playlistUrl } = body;
  if (!musicUserToken && !playlistId && !playlistUrl) {
    return NextResponse.json(
      { error: "At least one of musicUserToken, playlistId, or playlistUrl must be provided." },
      { status: 400 }
    );
  }

  const query = await payload.find({
    collection: "setlists",
    where: { slug: { equals: slug } },
    limit: 1
  });

  const setlist = query.docs[0];
  if (!setlist) {
    return NextResponse.json({ error: "Setlist not found" }, { status: 404 });
  }

  const currentAppleMusic = setlist.appleMusic || {};

  await payload.update({
    collection: "setlists",
    id: setlist.id,
    data: {
      appleMusic: {
        ...currentAppleMusic,
        ...(playlistId ? { playlistId } : {}),
        ...(playlistUrl ? { playlistUrl } : {}),
        ...(musicUserToken ? { ownerUserToken: musicUserToken } : {})
      }
    }
  });

  return NextResponse.json({
    success: true,
    message: "Apple Music playlist configuration updated successfully."
  });
}
