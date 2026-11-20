import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "@/payload";
import { homePageDefaultsResponse } from "@/lib/teaser/home-page-defaults";
import { homePageDraftViewer, homePageLocale, resolveHomePageCopy } from "@/lib/teaser/home-page-copy";

export const dynamic = "force-dynamic";

/**
 * The effective home page copy as JSON; the page itself resolves the same copy on the server. Drafts only
 * for a staff session verified on this request while draft mode is on, never from `?draft` or `?draftId`.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = homePageLocale(searchParams.get("locale"));
    let isDraftMode = false;
    try {
      isDraftMode = (await draftMode()).isEnabled;
    } catch {
      // Called outside Next.js request context (e.g. unit test)
    }
    const payload = await getPayload();
    const staff = await homePageDraftViewer(payload, { draftMode: isDraftMode, headers: req.headers });
    const doc = await resolveHomePageCopy(payload, { locale, staff, draftId: staff ? searchParams.get("draftId") : null });
    // Neither published nor fallback copy exists: serve the built defaults. This handler never writes.
    return NextResponse.json(doc ?? homePageDefaultsResponse(locale));
  } catch (error) {
    console.error("Error in home-page route:", error);
    return NextResponse.json({ error: "Failed to resolve effective homepage copy" }, { status: 500 });
  }
}
