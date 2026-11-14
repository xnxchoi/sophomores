import { draftMode } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "@/payload";
import {
  teaser as defaultTeaser,
  teaserKo as defaultTeaserKo,
  stories as defaultStories,
  storiesKo as defaultStoriesKo,
  principles as defaultPrinciples,
  messages as defaultMessages,
  messagesKo as defaultMessagesKo,
  values as defaultValues,
} from "@/lib/teaser/content";

export const dynamic = "force-dynamic";

function buildDefaultLocaleData(locale: "en" | "ko") {
  const activeTeaser = locale === "ko" ? defaultTeaserKo : defaultTeaser;
  const activeStories = locale === "ko" ? defaultStoriesKo : defaultStories;
  const activeMessages = locale === "ko" ? defaultMessagesKo : defaultMessages;

  return {
    brandWordmark: activeTeaser.name,
    preludeTitleLeft: activeTeaser.preludeTitleLeft,
    preludeTitleRight: activeTeaser.preludeTitleRight,
    warpPassageLine1: activeTeaser.warpPassageLine1,
    warpPassageLine2: activeTeaser.warpPassageLine2,
    notice1Sender: "From: sophomores",
    notice1Body: activeTeaser.introduction,
    notice2Sender: locale === "ko" ? "티켓 오픈 안내" : "Ticket sales open",
    notice2Time: activeTeaser.launchHint,
    notice2Body: activeTeaser.notification,
    centerHeadline: activeTeaser.headline,
    stories: activeStories.map((s) => ({
      title: s.title,
      body: s.body,
      tone: s.tone,
    })),
    messages: activeMessages.map((m) => ({
      from: m.from,
      text: m.text,
    })),
    peopleHeadline: activeTeaser.peopleHeadline,
    invitationHeadline: activeTeaser.invitation,
    rsvpButtonLabel: "The first invitation",
    rsvpButtonSubtext: activeTeaser.launchHint,
    footerCopyright: "© sophomores 2026",
    footerDomain: activeTeaser.domain,
    modalHeading:
      locale === "ko" ? "첫 번째 초대장" : "The first invitation",
    modalLead:
      locale === "ko"
        ? `${activeTeaser.launchHint} 티켓이 오픈됩니다.`
        : `Ticket sales open ${activeTeaser.launchHint.toLowerCase()}.`,
    modalDisclaimer1:
      locale === "ko"
        ? "일정은 곧 공개됩니다. 아직 티켓 판매가 시작되지 않았습니다."
        : "Date to be announced. Ticket sales are not open yet.",
    modalDisclaimer2:
      locale === "ko"
        ? "프리뷰 화면입니다. 이메일 수집이나 예약이 이루어지지 않습니다."
        : "Preview only. No email is collected and no reservation is made.",
    modalReturnButton:
      locale === "ko" ? "이야기로 돌아가기 →" : "Back to the story →",
  };
}

let seedPromise: Promise<void> | null = null;

async function ensureInitialHomePageDocs(
  payload: Awaited<ReturnType<typeof getPayload>>
) {
  if (seedPromise) {
    await seedPromise;
    return;
  }

  seedPromise = (async () => {
    try {
      const existing = await payload.find({
        collection: "home-page",
        draft: true,
        limit: 1,
      });
      if (existing.totalDocs > 0) return;

      const enData = buildDefaultLocaleData("en");
      const koData = buildDefaultLocaleData("ko");

      for (const spec of [
        {
          name: "Effective Fallback Copy",
          isFallback: true,
          status: "draft" as const,
        },
        {
          name: "Published Webpage Copy",
          isFallback: false,
          status: "published" as const,
        },
      ]) {
        const isDraft = spec.status === "draft";
        const created = await payload.create({
          collection: "home-page",
          locale: "en",
          overrideAccess: true,
          data: {
            ...enData,
            name: spec.name,
            isFallback: spec.isFallback,
            _status: spec.status,
          },
          draft: isDraft,
          context: { internalFallbackOp: true },
        });

        await payload.update({
          collection: "home-page",
          id: created.id,
          locale: "ko",
          overrideAccess: true,
          data: {
            ...koData,
            name: spec.name,
            isFallback: spec.isFallback,
            _status: spec.status,
            stories: koData.stories.map((s, idx) => ({
              id: created.stories?.[idx]?.id,
              ...s,
            })),
            messages: koData.messages.map((m, idx) => ({
              id: created.messages?.[idx]?.id,
              ...m,
            })),
          },
          draft: isDraft,
          context: { internalFallbackOp: true },
        });
      }
    } finally {
      seedPromise = null;
    }
  })();

  await seedPromise;
}

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

    // 4. If database has neither published nor fallback, seed the initial collection documents
    try {
      await ensureInitialHomePageDocs(payload);
      const seededPublished = await payload.find({
        collection: "home-page",
        where: {
          _status: { equals: "published" },
        },
        locale,
        limit: 1,
        depth: 1,
      });
      if (seededPublished.totalDocs > 0) {
        return NextResponse.json(seededPublished.docs[0]);
      }
    } catch (seedErr) {
      console.error("Failed to auto-seed initial home-page docs:", seedErr);
    }

    const activeDefaults = buildDefaultLocaleData(locale);

    return NextResponse.json({
      ...activeDefaults,
      notice1Time: "Now",
      storyLabel: "Our story",
      principles: defaultPrinciples,
      values: defaultValues,
    });
  } catch (error) {
    console.error("Error in home-page route:", error);
    return NextResponse.json(
      { error: "Failed to resolve effective homepage copy" },
      { status: 500 }
    );
  }
}
