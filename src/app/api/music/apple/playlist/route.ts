import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getAppleMusicPlaylist } from "@/lib/music/apple-music";
import { guardMusicRoute, privateJson } from "@/lib/music/route-guard";

export const runtime = "nodejs";

// No page calls this route; server code reads playlists through the library.
// Curators only, rate limited.
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
    const playlist = await getAppleMusicPlaylist(idOrUrl);
    return privateJson({ playlist });
  } catch (error) {
    return privateJson(
      { error: error instanceof Error ? error.message : "Failed to fetch Apple Music playlist" },
      { status: 500 }
    );
  }
}
