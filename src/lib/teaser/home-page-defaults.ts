// The built-in home-page copy, per locale: what the first-time seed writes, and what the home-page route
// serves when no copy document exists yet.
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

export function buildDefaultLocaleData(locale: "en" | "ko") {
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

/** The response the route serves when no copy document exists: the built defaults plus fixed extras. */
export function homePageDefaultsResponse(locale: "en" | "ko") {
  return {
    ...buildDefaultLocaleData(locale),
    notice1Time: "Now",
    storyLabel: "Our story",
    principles: defaultPrinciples,
    values: defaultValues,
  };
}
