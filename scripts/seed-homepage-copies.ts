import { loadEnvConfig } from "@next/env";
import type { Payload } from "payload";
import {
  teaser as defaultTeaser,
  teaserKo as defaultTeaserKo,
  stories as defaultStories,
  storiesKo as defaultStoriesKo,
  messages as defaultMessages,
  messagesKo as defaultMessagesKo,
} from "@/lib/teaser/content";

loadEnvConfig(process.cwd());

function buildLocaleContent(locale: "en" | "ko") {
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

async function seedDocument(
  payload: Payload,
  options: {
    name: string;
    isFallback: boolean;
    status: "draft" | "published";
  }
) {
  const enContent = buildLocaleContent("en");
  const koContent = buildLocaleContent("ko");
  const isDraft = options.status === "draft";

  const created = await payload.create({
    collection: "home-page",
    locale: "en",
    data: {
      ...enContent,
      name: options.name,
      isFallback: options.isFallback,
      _status: options.status,
    },
    draft: isDraft,
    context: { internalFallbackOp: true },
  });

  await payload.update({
    collection: "home-page",
    id: created.id,
    locale: "ko",
    data: {
      ...koContent,
      name: options.name,
      isFallback: options.isFallback,
      _status: options.status,
      stories: koContent.stories.map((s, idx) => ({
        id: created.stories?.[idx]?.id,
        ...s,
      })),
      messages: koContent.messages.map((m, idx) => ({
        id: created.messages?.[idx]?.id,
        ...m,
      })),
    },
    draft: isDraft,
    context: { internalFallbackOp: true },
  });

  return created;
}

async function main() {
  const force = process.argv.includes("--force");
  const { getPayload } = await import("@/payload");
  const payload = await getPayload();

  const existing = await payload.find({
    collection: "home-page",
    draft: true,
    limit: 100,
  });

  if (existing.totalDocs > 0 && !force) {
    console.log(
      `Found ${existing.totalDocs} existing home-page copies. Pass --force to replace them.`
    );
    return;
  }

  if (existing.totalDocs > 0 && force) {
    for (const doc of existing.docs) {
      await payload.delete({
        collection: "home-page",
        id: doc.id,
        overrideAccess: true,
      });
    }
    console.log(`Deleted ${existing.totalDocs} existing home-page copies.`);
  }

  const fallbackDoc = await seedDocument(payload, {
    name: "Effective Fallback Copy",
    isFallback: true,
    status: "draft",
  });
  console.log("Created Fallback copy (en + ko):", fallbackDoc.id);

  const publishedDoc = await seedDocument(payload, {
    name: "Published Webpage Copy",
    isFallback: false,
    status: "published",
  });
  console.log("Created Published copy (en + ko):", publishedDoc.id);

  console.log("Seeding completed successfully.");
  await payload.db?.destroy?.();
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
