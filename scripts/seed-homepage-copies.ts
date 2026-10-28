import { getPayload } from "../lib/payload";
import {
  teaser as defaultTeaser,
  stories as defaultStories,
  principles as defaultPrinciples,
  messages as defaultMessages,
  values as defaultValues,
} from "../lib/teaser/content";

async function main() {
  const payload = await getPayload();

  // Check if documents already exist
  const existing = await payload.find({
    collection: "home-page",
    draft: true,
    limit: 10,
  });

  if (existing.totalDocs > 0) {
    console.log(`Found ${existing.totalDocs} existing home-page copies.`);
    return;
  }

  const baseContent = {
    brandWordmark: defaultTeaser.name,
    preludeTitleLeft: "Experienced.",
    preludeTitleRight: "Not Finished.",
    warpPassageLine1: "Lorem ipsum dolor sit amet,",
    warpPassageLine2: "consectetur adipiscing elit sed do.",
    notice1Sender: "From: sophomores",
    notice1Body: defaultTeaser.introduction,
    notice2Sender: "Ticket sales open",
    notice2Time: defaultTeaser.launchHint,
    notice2Body:
      defaultTeaser.notification ||
      "Something is taking shape. Ticket sales open in around ten days. The first night is still under wraps.",
    centerHeadline: defaultTeaser.headline,
    stories: defaultStories.map((s) => ({
      title: s.title,
      body: s.body,
      tone: s.tone,
    })),
    principles: defaultPrinciples.map((p) => ({
      title: p.title,
      body: p.body,
      color: p.color,
    })),
    messages: defaultMessages.map((m) => ({
      from: m.from,
      text: m.text,
    })),
    peopleHeadline: defaultTeaser.peopleHeadline,
    values: defaultValues.map((v) => ({
      body: v.body,
    })),
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
  };

  // 1. Create the Designated Fallback Draft copy
  const fallbackDoc = await payload.create({
    collection: "home-page",
    data: {
      ...baseContent,
      name: "Effective Fallback Copy",
      isFallback: true,
      _status: "draft",
    },
    draft: true,
    context: { internalFallbackOp: true },
  });
  console.log("Created Fallback copy:", fallbackDoc.id);

  // 2. Create the Published Live copy
  const publishedDoc = await payload.create({
    collection: "home-page",
    data: {
      ...baseContent,
      name: "Published Webpage Copy",
      isFallback: false,
      _status: "published",
    },
    draft: false,
    context: { internalFallbackOp: true },
  });
  console.log("Created Published copy:", publishedDoc.id);

  console.log("Seeding completed successfully.");
}

main()
  .catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
  })
  .then(() => process.exit(0));
