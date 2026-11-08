import { NextResponse } from "next/server";
import { getPayload } from "@/lib/payload";
import {
  teaser as defaultTeaser,
  stories as defaultStories,
  principles as defaultPrinciples,
  messages as defaultMessages,
  values as defaultValues,
} from "@/lib/teaser/content";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawLocale = searchParams.get("locale");
    const locale =
      rawLocale && rawLocale !== "[object Object]"
        ? (rawLocale as "en" | "ko")
        : "en";
    const draftId = searchParams.get("draftId");
    const isDraft = searchParams.get("draft") === "true";

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

    // If database has neither published nor fallback, return built-in defaults
    return NextResponse.json({
      brandWordmark: defaultTeaser.name,
      preludeTitleLeft: "Experienced.",
      preludeTitleRight: "Not Finished.",
      warpPassageLine1: "Lorem ipsum dolor sit amet,",
      warpPassageLine2: "consectetur adipiscing elit sed do.",
      notice1Sender: "From: sophomores",
      notice1Body: defaultTeaser.introduction,
      notice2Sender: "Ticket sales open",
      notice2Time: defaultTeaser.launchHint,
      notice2Body: defaultTeaser.notification,
      centerHeadline: defaultTeaser.headline,
      stories: defaultStories,
      principles: defaultPrinciples,
      messages: defaultMessages,
      peopleHeadline: defaultTeaser.peopleHeadline,
      values: defaultValues,
      invitationHeadline: defaultTeaser.invitation,
      rsvpButtonLabel: "RSVP",
      rsvpButtonSubtext: defaultTeaser.launchHint,
      footerCopyright: "© sophomores 2026",
      footerDomain: defaultTeaser.domain,
      modalHeading: "This Is Only\nThe Beginning.",
      modalLead: `Ticket sales open ${defaultTeaser.launchHint.toLowerCase()}.`,
      modalDisclaimer1: "Date to be announced. Ticket sales are not open yet.",
      modalDisclaimer2:
        "Preview only. No email is collected and no reservation is made.",
      modalReturnButton: "Back to Top →",
    });
  } catch (error) {
    console.error("Error in home-page route:", error);
    return NextResponse.json(
      { error: "Failed to resolve effective homepage copy" },
      { status: 500 }
    );
  }
}
