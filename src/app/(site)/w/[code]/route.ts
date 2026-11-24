import { getIP } from "@better-auth/core/utils/ip";
import config from "@payload-config";
import { getPayload } from "payload";
import { entryLinkResponse, readHomeEntry } from "@/lib/content/home-entry.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * An entry link (owner, 24 Nov: the Warp home "for those entering with a particular link"). It never renders a page:
 * a valid code sets the visit's signed cookie, and every request 303s to "/", so the code leaves the address bar
 * before any page or referrer can see it. The app's request log skips /w (next.config.ts) and nothing here logs it;
 * an ingress or CDN in front still logs the path unless told not to (see the deployment note). The code is a campaign
 * token, not a secret: it only opens the Warp home for 6 hours. Attempts are limited per address.
 */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  // better-auth's getIP, as the music routes use it: the ingress overwrites X-Forwarded-For. The attempt is counted
  // before Payload is read.
  return entryLinkResponse({
    loadEntry: () => readHomeEntry(() => getPayload({ config })),
    code,
    now: Date.now(),
    address: getIP(request, {}) ?? "unknown"
  });
}
