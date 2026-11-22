import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { searchAppleMusicSongs } from "@/lib/music/apple-music";
import { guardMusicRoute, privateJson } from "@/lib/music/route-guard";

export const runtime = "nodejs";

// Attendee track search (TrackSearchDrawer). Signed-in members only, rate limited.
export async function GET(request: Request): Promise<Response> {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return denied;
  const guard = await guardMusicRoute(request, "search", "member");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || searchParams.get("term");
  const limitParam = searchParams.get("limit");
  const storefrontParam = searchParams.get("storefront");

  if (!query || query.trim().length === 0) {
    return privateJson({ error: "Query parameter 'q' is required." }, { status: 400 });
  }
  // The storefront becomes an Apple URL path segment: accept only a two-letter code.
  if (storefrontParam !== null && !/^[A-Za-z]{2}$/.test(storefrontParam)) {
    return privateJson({ error: "Query parameter 'storefront' must be a two-letter code." }, { status: 400 });
  }
  const storefront = storefrontParam?.toLowerCase() || undefined;

  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 25) : 20;

  try {
    const tracks = await searchAppleMusicSongs(query, limit, storefront);
    return privateJson({ tracks });
  } catch (error) {
    return privateJson(
      { error: error instanceof Error ? error.message : "Failed to search Apple Music catalog" },
      { status: 500 }
    );
  }
}
