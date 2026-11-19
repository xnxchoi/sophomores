import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "@/payload";
import { homePageDefaultsResponse } from "@/lib/teaser/home-page-defaults";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawLocale = searchParams.get("locale");
    const locale =
      rawLocale === "ko"
        ? "ko"
        : rawLocale && rawLocale !== "[object Object]"
          ? (rawLocale as "en" | "ko")
          : "en";
    const draftId = searchParams.get("draftId");
    let isDraftMode = false;
    try {
      isDraftMode = (await draftMode()).isEnabled;
    } catch {
      // Called outside Next.js request context (e.g. unit test)
    }
    const isDraft = searchParams.get("draft") === "true" || isDraftMode;

    const payload = await getPayload();

    // 1. If a specific draftId was requested (e.g. from live preview)
    if (draftId) {
      try {
        const doc = await payload.findByID({
          collection: "home-page",
          id: draftId,
          draft: true,
          locale,
          depth: 1,
        });
        if (doc) return NextResponse.json(doc);
      } catch {
        // Fall through to draft/published lookup
      }
    }

    // 2. If draft mode is requested
    if (isDraft) {
      const drafts = await payload.find({
        collection: "home-page",
        draft: true,
        locale,
        limit: 1,
        sort: "-updatedAt",
        depth: 1,
      });
      if (drafts.totalDocs > 0) {
        return NextResponse.json(drafts.docs[0]);
      }
    }

    // 3. Normal / Production visitor resolution:
    // First, look for the published document
    const published = await payload.find({
      collection: "home-page",
      where: {
        _status: { equals: "published" },
      },
      locale,
      limit: 1,
      depth: 1,
    });

    if (published.totalDocs > 0) {
      return NextResponse.json(published.docs[0]);
    }

    // Safety fallback: if no published document is found, return the designated fallback draft!
    const fallback = await payload.find({
      collection: "home-page",
      where: {
        isFallback: { equals: true },
      },
      draft: true,
      locale,
      limit: 1,
      depth: 1,
    });

    if (fallback.totalDocs > 0) {
      return NextResponse.json(fallback.docs[0]);
    }

    // 4. Neither published nor fallback copy exists: serve the built defaults. This handler never writes;
    // the first copy documents are seeded once at startup (src/payload/seed/home-page.ts, from onInit).
    return NextResponse.json(homePageDefaultsResponse(locale));
  } catch (error) {
    console.error("Error in home-page route:", error);
    return NextResponse.json(
      { error: "Failed to resolve effective homepage copy" },
      { status: 500 }
    );
  }
}
