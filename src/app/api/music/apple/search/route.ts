import { NextResponse } from "next/server";
import { searchAppleMusicSongs } from "@/lib/music/apple-music";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || searchParams.get("term");
  const limitParam = searchParams.get("limit");
  const storefront = searchParams.get("storefront") || undefined;

  if (!query || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Query parameter 'q' is required." },
      { status: 400 }
    );
  }

  const limit = limitParam ? Math.min(Math.max(1, parseInt(limitParam, 10) || 20), 25) : 20;

  try {
    const tracks = await searchAppleMusicSongs(query, limit, storefront);
    return NextResponse.json({ tracks });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to search Apple Music catalog"
      },
      { status: 500 }
    );
  }
}
