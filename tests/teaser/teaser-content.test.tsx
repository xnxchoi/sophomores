import assert from "node:assert/strict";
import { test } from "node:test";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../fixtures/english-render";
import { Warp } from "@/components/Warp";
import {
  TeaserContentProvider,
  type HomePageContent
} from "@/components/teaser/content-provider";
import {
  chapters,
  messages,
  principles,
  stories,
  teaser,
  values
} from "@/lib/teaser/content";

test("teaser identifies the club without inventing a confirmed launch date", () => {
  assert.equal(teaser.name, "sophomores");
  assert.equal(teaser.domain, "sophomores.co");
  assert.equal(teaser.launchAt, null);
  assert.equal(teaser.launchHint, "In ~10 days");
});

test("chapter navigation follows the complete intended narrative order", () => {
  assert.deepEqual(
    chapters.map(({ id }) => id),
    ["hero", "origin", "strategy", "people", "contacts"]
  );
  assert.equal(new Set(chapters.map(({ id }) => id)).size, chapters.length);
  for (const chapter of chapters) {
    assert.ok(
      chapter.label.trim().length > 0,
      `${chapter.id} needs an accessible label`
    );
  }
});

test("the origin story has four complete cards with distinct titles", () => {
  assert.equal(stories.length, 4);
  assert.equal(new Set(stories.map(({ title }) => title)).size, stories.length);
  for (const story of stories) {
    assert.ok(story.title.trim().length > 0);
    assert.ok(story.body.trim().length > 0);
    assert.ok(story.tone.trim().length > 0);
  }
});

test("the three principles have display copy and explicit color identities", () => {
  assert.equal(principles.length, 3);
  for (const principle of principles) {
    assert.ok(principle.title.trim().length > 0);
    assert.ok(principle.body.trim().length > 0);
    assert.ok(principle.color.trim().length > 0);
  }
});

test("the message sequence has three attributed, nonempty messages", () => {
  assert.equal(messages.length, 3);
  for (const message of messages) {
    assert.ok(message.from.trim().length > 0);
    assert.ok(message.text.trim().length > 0);
  }
});

test("the values section has three illustrated content entries", () => {
  assert.equal(values.length, 3);
  for (const value of values) {
    assert.ok(value.image.trim().length > 0);
    assert.ok(value.body.trim().length > 0);
  }
});

test("every teaser section renders PayloadCMS home-page collection copy when provided", () => {
  const cmsCopy: HomePageContent = {
    brandWordmark: "sophomores-cms",
    preludeTitleLeft: "CMS Prelude Left",
    preludeTitleRight: "CMS Prelude Right",
    warpPassageLine1: "CMS Warp Passage Line One",
    warpPassageLine2: "CMS Warp Passage Line Two",
    notice1Sender: "CMS Sender One",
    notice1Time: "CMS Time One",
    notice1Body: "CMS Notice One Body Copy",
    notice2Sender: "CMS Sender Two",
    notice2Time: "CMS Time Two",
    notice2Body: "CMS Notice Two Body Copy",
    centerHeadline: "CMS Center Statement Headline",
    stories: [
      { title: "CMS Story Title 1", body: "CMS Story Body 1", tone: "blue" },
      { title: "CMS Story Title 2", body: "CMS Story Body 2", tone: "dark" },
      { title: "CMS Story Title 3", body: "CMS Story Body 3", tone: "green" },
      { title: "CMS Story Title 4", body: "CMS Story Body 4", tone: "portrait" }
    ],
    messages: [
      { from: "CMS Chat Sender 1", text: "CMS Chat Message One" },
      { from: "CMS Chat Sender 2", text: "CMS Chat Message Two" },
      { from: "CMS Chat Sender 3", text: "CMS Chat Message Three" }
    ],
    peopleHeadline: "CMS People Section Headline",
    invitationHeadline: "CMS Invitation Section Headline",
    rsvpButtonLabel: "CMS Invitation Button",
    rsvpButtonSubtext: "CMS Invitation Subtext",
    footerCopyright: "© CMS 2026",
    footerDomain: "cms.sophomores.co",
    modalHeading: "CMS Modal Heading",
    modalLead: "CMS Modal Lead",
    modalDisclaimer1: "CMS Modal Disclaimer One",
    modalDisclaimer2: "CMS Modal Disclaimer Two",
    modalReturnButton: "CMS Modal Return"
  };

  const html = renderToStaticMarkup(
    <TeaserContentProvider initialContent={cmsCopy}>
      <Warp />
    </TeaserContentProvider>
  );

  for (const expected of [
    "CMS Prelude Left CMS Prelude Right",
    "CMS Warp Passage Line One",
    "CMS Warp Passage Line Two",
    "CMS Sender One",
    "CMS Time One",
    "CMS Notice One Body Copy",
    "CMS Sender Two",
    "CMS Time Two",
    "CMS Notice Two Body Copy",
    "CMS Center Statement Headline",
    "CMS Story Title 1",
    "CMS Story Body 1",
    "CMS Story Title 4",
    "CMS Story Body 4",
    "CMS Chat Sender 1",
    "CMS Chat Message One",
    "CMS Chat Sender 2",
    "CMS Chat Message Two",
    "CMS Chat Sender 3",
    "CMS Chat Message Three",
    "CMS People Section Headline",
    "CMS Invitation Section Headline",
    "CMS Invitation Button",
    "CMS Invitation Subtext",
    "© CMS 2026",
    "cms.sophomores.co",
    "CMS Modal Heading",
    "CMS Modal Lead",
    "CMS Modal Disclaimer One",
    "CMS Modal Disclaimer Two",
    "CMS Modal Return"
  ]) {
    assert.ok(
      html.includes(expected),
      `Expected rendered teaser markup to include PayloadCMS string: ${expected}`
    );
  }
});
