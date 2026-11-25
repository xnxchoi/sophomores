import config from "@payload-config";
import { getPayload } from "payload";
import { homeGateResponse, readHomeEntry } from "@/lib/content/home-entry.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where a "/" without the Warp cookie (or a staff draft preview) is decided. next.config.ts rewrites "/" here before
 * any page renders, so the answer is a real redirect, never a page that streams and then hops ((site)/loading.tsx
 * would turn a page's redirect() into a client-side meta refresh; Next 16 docs, redirect). Inside the owner's window:
 * a window pass and one way back to "/?entry", which this gate never catches. Otherwise: the default home
 * (src/lib/content/home.ts).
 */
export async function GET() {
  const entry = await readHomeEntry(() => getPayload({ config }));
  return homeGateResponse({ entry, now: Date.now() });
}

export const HEAD = GET;
