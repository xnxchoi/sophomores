import { NextResponse } from "next/server";
import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getAppleMusicPlaylist } from "@/lib/music/apple-music";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const idOrUrl = searchParams.get("id") || searchParams.get("url");

  if (!idOrUrl) {
    return NextResponse.json(
      { error: "Query parameter 'id' or 'url' is required." },
      { status: 400 }
    );
  }

  try {
    const playlist = await getAppleMusicPlaylist(idOrUrl);
    return NextResponse.json({ playlist });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch Apple Music playlist"
      },
      { status: 500 }
    );
  }
}
