import { NextResponse } from "next/server";
import { getPayload } from "@/lib/payload";
import { currentUser } from "@/lib/auth/server";
import { isAuthorizedCurator } from "@/lib/music/curator";
import { syncSetlistToAppleMusic } from "@/lib/music/sync";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string }> };

export async function POST(
  request: Request,
  { params }: Context
): Promise<NextResponse> {
  const { slug } = await params;
  const payload = await getPayload();
  const user = await currentUser();

  // 1. Authorization: either verified curator / staff or matching CRON secret header
  const isCurator = isAuthorizedCurator(user);
  const authHeader = request.headers.get("x-sync-secret");
  const configuredSecret = process.env.SETLIST_SYNC_SECRET;
  const isSecretAuthorized = Boolean(
    configuredSecret && authHeader && authHeader === configuredSecret
  );

  if (!isCurator && !isSecretAuthorized) {
    return NextResponse.json(
      { error: "Unauthorized. Curator session or valid sync secret required." },
      { status: 401 }
    );
  }

  try {
    const result = await syncSetlistToAppleMusic(payload, slug);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Sync failed"
      },
      { status: 500 }
    );
  }
}
