import type { Payload } from "payload";
import { homePageDefaultsResponse } from "./home-page-defaults";
import { homePageDraftViewer, homePageLocale, resolveHomePageCopy } from "./home-page-copy";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * The Home copy JSON response. While draft mode is on, every response is private and never stored: the
 * draft served to verified staff, the public copy served after a rejected staff check, and errors. Errors are
 * never stored either way. Outside draft mode a successful response keeps Next's defaults. It never writes.
 */
export async function homePageCopyResponse(
  req: Request,
  { draftMode, payload: load }: { draftMode: boolean; payload: () => Promise<Payload> }
): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const locale = homePageLocale(searchParams.get("locale"));
    const payload = await load();
    const staff = await homePageDraftViewer(payload, { draftMode, headers: req.headers });
    const doc = await resolveHomePageCopy(payload, { locale, staff, draftId: staff ? searchParams.get("draftId") : null });
    // Neither published nor fallback copy exists: serve the built defaults.
    return Response.json(doc ?? homePageDefaultsResponse(locale), draftMode ? { headers: NO_STORE } : undefined);
  } catch (error) {
    console.error("Error in home-page route:", error);
    return Response.json({ error: "Failed to resolve effective homepage copy" }, { status: 500, headers: NO_STORE });
  }
}
