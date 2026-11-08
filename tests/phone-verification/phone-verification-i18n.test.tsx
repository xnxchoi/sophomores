import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { PhoneVerification } from "@/components/Authentication/phone-verification/phone-verification";
import { PhoneNumberField } from "@/components/Authentication/phone-verification/phone-number-field";
import {
  messagesByLocale,
  verificationLocales,
  type VerificationLocale
} from "@/lib/phone-verification/i18n";

function leafMessages(value: object, prefix = ""): Record<string, string> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, message]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof message === "string") return [[path, message]];
    assert.ok(message && typeof message === "object", `invalid message: ${path}`);
    return Object.entries(leafMessages(message, path));
  }));
}

function placeholders(message: string) {
  return [...new Set([...message.matchAll(/\{\s*([A-Za-z_][\w]*)\s*[,}]/g)].map((match) => match[1]))].sort();
}

function languageButton(html: string, label: string) {
  const button = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)]
    .map((match) => match[0])
    .find((markup) => markup.replace(/<[^>]*>/g, "") === label);
  assert.ok(button, `missing language button: ${label}`);
  return button;
}

test("verification catalogs cover both locales with identical nonempty keys and ICU parameters", () => {
  assert.deepEqual(verificationLocales, ["en", "ko"]);
  const english = leafMessages(messagesByLocale.en);
  const korean = leafMessages(messagesByLocale.ko);
  assert.deepEqual(Object.keys(english).sort(), Object.keys(korean).sort());
  assert.ok(Object.keys(english).length > 20, "catalog must cover the complete verification flow");
  for (const key of Object.keys(english)) {
    assert.ok(english[key].trim(), `empty English message: ${key}`);
    assert.ok(korean[key].trim(), `empty Korean message: ${key}`);
    assert.deepEqual(placeholders(english[key]), placeholders(korean[key]), `ICU parameters differ: ${key}`);
  }
});

test("English verification renders a translated screen, dialing prefix, and language controls", () => {
  const html = renderToStaticMarkup(<PhoneVerification initialLocale="en" />);
  assert.match(html, /lang="en"/);
  assert.match(html, /Verify your phone/);
  assert.match(html, /Phone number/);
  assert.match(html, />Next<span aria-hidden="true">↗<\/span><\/button>/);
  assert.match(html, /South Korea/);
  assert.match(html, /\+82/);
  assert.doesNotMatch(html.replaceAll("한국어", ""), /[가-힣]/);
  assert.match(languageButton(html, "English"), /aria-pressed="true"/);
  assert.match(languageButton(html, "한국어"), /aria-pressed="false"/);
});

test("Korean remains the default locale with an accessible language selection", () => {
  const html = renderToStaticMarkup(<PhoneVerification />);
  assert.match(html, /lang="ko"/);
  assert.match(html, /휴대폰 인증/);
  assert.match(html, /휴대폰 번호/);
  assert.match(html, /대한민국/);
  assert.match(languageButton(html, "한국어"), /aria-pressed="true"/);
  assert.match(languageButton(html, "English"), /aria-pressed="false"/);
});

for (const locale of ["en", "ko"] satisfies VerificationLocale[]) {
  test(`${locale} phone validation is translated and remains associated with its input`, () => {
    const t = createTranslator({locale, messages: messagesByLocale[locale], namespace: "Verification"});
    const message = t("invalidPhone");
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]} timeZone="Asia/Seoul">
        <PhoneNumberField value="123" onChange={() => {}} error={message} />
      </NextIntlClientProvider>
    );
    assert.ok(html.includes(message));
    const input = html.match(/<input\b[^>]*>/)?.[0];
    assert.ok(input);
    assert.match(input, /aria-invalid="true"/);
    assert.match(input, /aria-describedby="[^"]*\bpv-error\b[^"]*"/);
    assert.match(html, /id="pv-error"/);
    assert.notEqual(message, "Verification.invalidPhone");
    if (locale === "en") assert.doesNotMatch(html, /[가-힣]/);
    else assert.match(message, /[가-힣]/);
  });
}
