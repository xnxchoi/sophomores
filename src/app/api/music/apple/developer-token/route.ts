import { NextResponse } from "next/server";
import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getAppleMusicDeveloperToken } from "@/lib/music/apple-music";
import { getAppleMusicConfig, isAppleMusicConfigured } from "@/lib/music/config";

export const runtime = "nodejs";

/**
 * Returns the Apple Music Developer Token for client-side MusicKit JS initialization.
 * Developer tokens are app-level and safe to pass to the browser to enable
 * MusicKit.configure({ developerToken: ... }).
 */
export async function GET(request: Request): Promise<Response> {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return denied;
  const config = getAppleMusicConfig();

  if (!isAppleMusicConfigured()) {
    return NextResponse.json(
      {
        developerToken: null,
        storefront: config.storefront || "us",
        isConfigured: false,
        message: "Apple Music Developer credentials are not configured. Running in sandbox/mock mode."
      },
      { status: 200 }
    );
  }

  try {
    const token = await getAppleMusicDeveloperToken();
    return NextResponse.json({
      developerToken: token,
      storefront: config.storefront || "us",
      isConfigured: true
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to obtain developer token",
        isConfigured: false
      },
      { status: 500 }
    );
  }
}
