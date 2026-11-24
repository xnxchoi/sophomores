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

test("Reader hides outer blank lines without moving any highlight offset", () => {
  const body = "\n\n첫 문단.\n\n둘째 문단,\n시의 한 줄.\n\n\n";
  const start = body.indexOf("문단.");
  const end = body.indexOf("둘째") + "둘째".length;
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messagesByLocale.en} timeZone="Asia/Seoul">
      <Reader
        body={body}
        highlights={[{ id: "h1", postId: "p1", quote: body.slice(start, end), start, end, note: "", authorLabel: "" }]}
        onHighlight={() => {}}
      />
    </NextIntlClientProvider>
  );
  const article = /<article[^>]*>([\s\S]*?)<\/article>/.exec(html)?.[1] ?? "";
  assert.ok(article.startsWith('<span hidden="">\n\n</span>'), "leading blank lines are hidden");
  assert.ok(article.endsWith('<span hidden="">\n\n\n</span>'), "trailing blank lines are hidden");
  assert.match(article, /<mark[^>]*>문단\.\n\n둘째<\/mark>/, "a highlight across paragraphs keeps its exact text");
  assert.equal(article.replace(/<[^>]+>/g, ""), body, "the article text is the whole body, so offsets still count from 0");
});
