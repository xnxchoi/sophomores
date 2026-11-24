import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { messagesByLocale } from "@/i18n/messages";
import { Reader } from "@/components/reading/reader";

test("Reader keeps an essay's paragraph and line breaks", () => {
  const body = "첫 문단.\n\n둘째 문단,\n시의 한 줄.";
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messagesByLocale.en} timeZone="Asia/Seoul">
      <Reader body={body} highlights={[]} onHighlight={() => {}} />
    </NextIntlClientProvider>
  );
  assert.match(html, /<article[^>]*whitespace-pre-line/);
  assert.ok(html.includes(body), "the body text reaches the page with its breaks intact");
});
