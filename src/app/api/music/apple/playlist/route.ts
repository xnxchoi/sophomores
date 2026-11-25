import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getAppleMusicPlaylist } from "@/lib/music/apple-music";
import { guardMusicRoute, privateJson } from "@/lib/music/route-guard";

export const runtime = "nodejs";

// No page calls this route; server code reads playlists through the library.
// Curators only, rate limited. Public catalog playlists only: a library playlist
// would be read with the shared server Music User Token, so it is never fetched here.
export async function GET(request: Request): Promise<Response> {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return denied;
  const guard = await guardMusicRoute(request, "playlist", "curator");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const idOrUrl = searchParams.get("id") || searchParams.get("url");

  if (!idOrUrl) {
    return privateJson({ error: "Query parameter 'id' or 'url' is required." }, { status: 400 });
  }

  try {
    const playlist = await getAppleMusicPlaylist(idOrUrl, undefined, { catalogOnly: true });
    return privateJson({ playlist });
  } catch (error) {
    // Provider details, and a refused library identifier, stay in the server log.
    console.error("Apple Music playlist failed", error);
    return privateJson({ error: "Playlist is unavailable right now." }, { status: 500 });
  }
}
