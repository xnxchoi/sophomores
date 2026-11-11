import { NextResponse } from "next/server";
import { getPayload } from "@/lib/payload";
import { currentUser } from "@/lib/auth/server";
import { isAuthorizedCurator } from "@/lib/music/curator";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string }> };

export async function GET(
  _request: Request,
  { params }: Context
): Promise<NextResponse> {
  const { slug } = await params;
  const payload = await getPayload();
  const user = await currentUser();

  if (!isAuthorizedCurator(user)) {
    return NextResponse.json(
      { error: "Unauthorized. Curator privileges required." },
      { status: 401 }
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

  const hasToken = Boolean(
    setlist.appleMusic?.ownerUserToken || process.env.APPLE_MUSIC_USER_TOKEN
  );

  return NextResponse.json({
    isConfigured: hasToken,
    playlistId: setlist.appleMusic?.playlistId || null,
    playlistUrl: setlist.appleMusic?.playlistUrl || null
  });
}

export async function POST(
  request: Request,
  { params }: Context
): Promise<NextResponse> {
  const { slug } = await params;
  const payload = await getPayload();
  const user = await currentUser();

  // Only curators / admins can bind owner credentials to a setlist
  if (!isAuthorizedCurator(user)) {
    return NextResponse.json(
      { error: "Unauthorized. Curator privileges required." },
      { status: 401 }
    );
  }

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
