import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getAppleMusicDeveloperToken } from "@/lib/music/apple-music";
import { getAppleMusicConfig, isAppleMusicConfigured } from "@/lib/music/config";
import { guardMusicRoute, privateJson } from "@/lib/music/route-guard";

export const runtime = "nodejs";

/**
 * Returns the Apple Music Developer Token for the curator's MusicKit JS
 * initialization (CuratorControlBar → useMusicKit). Curators only, rate limited.
 */
export async function GET(request: Request): Promise<Response> {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return denied;
  const guard = await guardMusicRoute(request, "developerToken", "curator");
  if (guard.response) return guard.response;
  const config = getAppleMusicConfig();

  if (!isAppleMusicConfigured()) {
    return privateJson({
      developerToken: null,
      storefront: config.storefront || "us",
      isConfigured: false,
      message: "Apple Music Developer credentials are not configured. Running in sandbox/mock mode."
    });
  }

  try {
    const token = await getAppleMusicDeveloperToken();
    return privateJson({
      developerToken: token,
      storefront: config.storefront || "us",
      isConfigured: true
    });
  } catch (error) {
    // Signing and configuration details stay in the server log.
    console.error("Apple Music developer token failed", error);
    return privateJson({ error: "Apple Music is unavailable right now." }, { status: 500 });
  }
}
