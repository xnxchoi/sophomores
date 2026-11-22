import { createHash, timingSafeEqual } from "node:crypto";
import { denyReviewCustomerOperation } from "@/lib/auth/review-editor-policy";
import { getPayload } from "@/payload";
import { guardMusicRoute, privateJson } from "@/lib/music/route-guard";
import { syncSetlistToAppleMusic } from "@/lib/music/sync";

export const runtime = "nodejs";

type Context = { params: Promise<{ slug: string }> };

/**
 * The cron's shared secret, compared in constant time. Both sides are hashed
 * first so the comparison never depends on, or leaks, the secret's length.
 */
function isSyncSecret(header: string | null): boolean {
  const configured = process.env.SETLIST_SYNC_SECRET;
  if (!configured || !header) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(header), digest(configured));
}

/**
 * Pushes a setlist's pending entries to Apple Music. Callers: the cron with the
 * shared secret, or a granted curator. Without a valid secret the request goes
 * through the music route guard: sign-in, curator grant, and per-account and
 * per-address limits (repeated wrong secrets count as refusals).
 */
export async function POST(request: Request, { params }: Context): Promise<Response> {
  const denied = denyReviewCustomerOperation(request);
  if (denied) return denied;
  if (!isSyncSecret(request.headers.get("x-sync-secret"))) {
    const guard = await guardMusicRoute(request, "setlistSync", "curator");
    if (guard.response) return guard.response;
  }
  const { slug } = await params;
  const payload = await getPayload();
  try {
    return privateJson(await syncSetlistToAppleMusic(payload, slug));
  } catch (error) {
    // Provider and storage details stay in the server log.
    payload.logger.error({ err: error, msg: "Setlist sync failed" });
    return privateJson({ error: "Sync failed." }, { status: 500 });
  }
}
