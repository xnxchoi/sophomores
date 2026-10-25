import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import * as verificationUi from "../components/phone-verification/verification-ui";
import type { ComponentType, ReactNode } from "react";
import {
  ChallengeCard,
  Heading,
  Modal,
  VerificationMark,
  PrimaryButton,
  PrimaryLink,
  SecondaryButton,
  TextButton,
  Note
} from "../components/phone-verification/verification-ui";
import { messagesByLocale } from "../lib/phone-verification/i18n";
import { readFileSync } from "node:fs";

test("verification sheet is a dark surface while retaining short-screen internal scrolling", () => {
  const modalMarkup = renderToStaticMarkup(<Modal />);
  assert.match(
    modalMarkup,
    /(?:^|\s)!?bg-(?:teaser-card|black|neutral-9(?:00|50)|\[#(?:0[0-9a-f]|1[0-9a-f]){3}\])(?:\/95)?(?:\s|$)/i
  );
  assert.match(modalMarkup, /(?:^|\s)!?text-white(?:\s|$)/);
  assert.doesNotMatch(modalMarkup, /(?:^|\s)!?bg-white(?:\s|$)/);
  assert.match(modalMarkup, /max-h-\[calc\(100dvh-/);
  assert.match(modalMarkup, /(?:^|\s)overflow-y-(?:auto|scroll)(?:\s|$)/);
  assert.match(modalMarkup, /(?:^|\s)overscroll-contain(?:\s|$)/);
});
test("verification sheet and title size to their content rather than reserving expanded space", () => {
  const modalMarkup = renderToStaticMarkup(<Modal />);
  const headingMarkup = renderToStaticMarkup(<Heading />);
  assert.doesNotMatch(modalMarkup, /(?:^|\s)!?h-\[(?:min\(|760px)/);
  assert.doesNotMatch(modalMarkup, /(?:^|\s)!?h-(?:screen|full|\d+)(?:\s|$)/);
  assert.doesNotMatch(headingMarkup, /(?:^|\s)(?:sm:)?h-\d+(?:\s|$)/);
  assert.match(modalMarkup, /(?:^|\s)overflow-y-(?:auto|scroll)(?:\s|$)/);
});

test("verification heading and primary action use a restrained monochrome hierarchy", () => {
  const headingMarkup = renderToStaticMarkup(<Heading />);
  const primaryMarkup = renderToStaticMarkup(<PrimaryButton />);
  assert.match(headingMarkup, /(?:^|\s)text-left(?:\s|$)/);
  assert.match(headingMarkup, /(?:^|\s)font-(?:semibold|bold)(?:\s|$)/);
  assert.doesNotMatch(headingMarkup, /(?:^|\s)text-center(?:\s|$)/);
  assert.match(primaryMarkup, /(?:^|\s)bg-white(?:\s|$)/);
  assert.match(primaryMarkup, /(?:^|\s)text-teaser-card(?:\s|$)/);
  assert.match(primaryMarkup, /focus-visible:/);
  assert.match(primaryMarkup, /disabled:/);
});

test("verification uses no green in actions, focus, waiting, countdown or copy feedback", () => {
  for (const file of [
    "verification-ui.tsx",
    "phone-number-field.tsx",
    "phone-verification.tsx",
    "phone-verification-trial.tsx",
    "verification-countdown.tsx"
  ]) {
    const source = readFileSync(
      new URL(`../components/phone-verification/${file}`, import.meta.url),
      "utf8"
    );
    assert.doesNotMatch(
      source,
      /teaser-green|teaser-focus|(?:bg|text|border|ring|outline|decoration)-(?:green|lime|emerald)-|#(?:a9fa85|b5ff95)/i,
      file
    );
  }
});

test("phone entry has no decorative state ornament but waiting still has a motion mark", () => {
  assert.equal(renderToStaticMarkup(<VerificationMark state="entry" />), "");
  const waiting = renderToStaticMarkup(<VerificationMark state="pending" />);
  assert.match(waiting, /data-verification-mark="pending"/);
  assert.match(waiting, /aria-hidden="true"/);
  assert.doesNotMatch(waiting, /\d+%/);
});

test("challenge card is a dark inset with exact selectable values and distinct copy actions", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider
      locale="en"
      messages={messagesByLocale.en}
      timeZone="Asia/Seoul"
    >
      <ChallengeCard
        recipient="verify+party@example.test"
        body="SPHMRS A1B2C3 — 서울 🎟️"
      />
    </NextIntlClientProvider>
  );
  const card = html.match(/^<div[^>]*class="([^"]*)"/)?.[1];
  assert.ok(card, "challenge card must have a styled container");
  assert.doesNotMatch(card, /(?:^|\s)bg-(?:white|neutral-100)(?:\s|$)/);
  assert.match(card, /(?:^|\s)bg-/);
  assert.match(html, /aria-label="Copy recipient"/);
  assert.match(html, /aria-label="Copy code"/);
  assert.match(
    html,
    /<code[^>]*class="[^"]*select-all[^\"]*"[^>]*>verify\+party@example\.test<\/code>/
  );
  assert.match(html, /<code[^>]*>SPHMRS A1B2C3 — 서울 🎟️<\/code>/);
  assert.equal((html.match(/role="status"/g) ?? []).length, 2);
  assert.equal((html.match(/type="button"/g) ?? []).length, 2);
  assert.doesNotMatch(html, /href="(?:sms|mailto):/);
});

test("copy actions reserve compact button and icon widths without empty feedback paragraphs", () => {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider
      locale="en"
      messages={messagesByLocale.en}
      timeZone="Asia/Seoul"
    >
      <ChallengeCard recipient="verify@example.test" body="SPHMRS 123456" />
    </NextIntlClientProvider>
  );
  const buttons = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].map(
    ([button]) => button
  );
  assert.equal(buttons.length, 2);
  for (const button of buttons) {
    assert.match(button, /class="[^"]*!(?:size-11|w-28)\b/);
  }
  const statuses = [...html.matchAll(/<p\b[^>]*role="status"[^>]*>/g)].map(
    ([status]) => status
  );
  assert.ok(statuses.length <= 2);
  for (const status of statuses) {
    assert.doesNotMatch(status, /class="[^"]*\bh-(?:8|10|12|16|20)\b/);
  }
});

test("closed verification details expose a button but collapse the controlled body to zero height", () => {
  const Details = Reflect.get(
    verificationUi,
    "VerificationDetails"
  ) as ComponentType<{ label: string; children: ReactNode }>;
  assert.equal(
    typeof Details,
    "function",
    "shared VerificationDetails must own help disclosure geometry"
  );
  const html = renderToStaticMarkup(
    <Details label="How this works">Your message stays on this device.</Details>
  );
  const button = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/)?.[0];
  assert.ok(button, "help disclosure must be an accessible button");
  assert.match(button, /type="button"/);
  assert.match(button, /aria-expanded="false"/);
  assert.match(button, /How this works/);
  const controlledId = button.match(/aria-controls="([^"]+)"/)?.[1];
  assert.ok(controlledId, "help disclosure must identify its content");
  const content = [...html.matchAll(/<[^>]+>/g)]
    .map(([tag]) => tag)
    .find((tag) => tag.includes(`id="${controlledId}"`));
  assert.ok(content, "controlled body remains addressable while collapsed");
  assert.match(content, /aria-hidden="true"/);
  assert.match(content, /\binert(?:="")?(?:\s|>)/);
  assert.match(
    content,
    /(?:style="[^"]*height:0(?:px)?(?:;|")|class="[^"]*\bh-0\b|\bhidden(?:="")?(?:\s|>))/,
    "collapsed body has no layout height"
  );
  assert.doesNotMatch(
    html,
    /class="[^"]*\bh-(?:20|32)\b/,
    "disclosure cannot retain an expanded-height slot"
  );
});

test("help disclosure explicitly eases real height changes", () => {
  const source = readFileSync(
    new URL(
      "../components/phone-verification/verification-ui.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const details = source.match(
    /export function VerificationDetails\([\s\S]*?(?=\n(?:export )?function |$)/
  )?.[0];
  assert.ok(details, "shared VerificationDetails implementation must exist");
  assert.match(
    details,
    /(?:height\s*:|grid-template-rows|\blayout(?:=|\s|>))/,
    "opening and closing must animate real geometry"
  );
  assert.match(
    details,
    /ease:|ease-/,
    "height changes require explicit easing"
  );
  assert.doesNotMatch(
    details,
    /transition-all/,
    "do not animate unrelated properties"
  );
});

test("shared verification controls preserve native semantics and inline class overrides", () => {
  const primary = renderToStaticMarkup(
    <PrimaryButton
      type="submit"
      disabled
      name="action"
      value="continue"
      className="mt-3"
    >
      Continue
    </PrimaryButton>
  );
  assert.match(primary, /^<button/);
  assert.match(primary, /type="submit"/);
  assert.match(primary, /disabled=""/);
  assert.match(primary, /name="action"/);
  assert.match(primary, /value="continue"/);
  assert.match(primary, /(?:^|\s)mt-3(?:\s|"|$)/);
  assert.doesNotMatch(primary, /(?:^|\s)mt-5(?:\s|$)/);
  const link = renderToStaticMarkup(
    <PrimaryLink href="sms:+821012345678" aria-label="Open composer">
      Message
    </PrimaryLink>
  );
  assert.match(link, /^<a /);
  assert.match(link, /href="sms:\+821012345678"/);
  assert.match(link, /aria-label="Open composer"/);
  for (const Control of [SecondaryButton, TextButton]) {
    const html = renderToStaticMarkup(
      <Control type="button" aria-expanded={false}>
        Action
      </Control>
    );
    assert.match(html, /^<button/);
    assert.match(html, /type="button"/);
    assert.match(html, /aria-expanded="false"/);
  }
  const note = renderToStaticMarkup(
    <Note id="privacy" className="text-center">
      Private
    </Note>
  );
  assert.match(note, /^<p /);
  assert.match(note, /id="privacy"/);
  assert.match(note, /text-center/);
});
