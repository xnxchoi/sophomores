import { draftMode } from "next/headers";
import { getPayload } from "@/payload";
import { homePageCopyResponse } from "@/lib/teaser/home-page-copy-response";

export const dynamic = "force-dynamic";

/**
 * The effective home page copy as JSON; the page itself resolves the same copy on the server. Drafts only
 * for a staff session verified on this request while draft mode is on, never from `?draft` or `?draftId`.
 * The response (and its no-store rule) is built by homePageCopyResponse, so tests can drive it with draft
 * mode on and off.
 */
export async function GET(req: Request) {
  let isDraftMode = false;
  try {
    isDraftMode = (await draftMode()).isEnabled;
  } catch {
    // Called outside Next.js request context (e.g. unit test)
  }
  return homePageCopyResponse(req, { draftMode: isDraftMode, payload: getPayload });
}
