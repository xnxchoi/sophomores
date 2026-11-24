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

function renderArticle(body: string, start: number, end: number) {
  const html = renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={messagesByLocale.en} timeZone="Asia/Seoul">
      <Reader
        body={body}
        highlights={[{ id: "h1", postId: "p1", quote: body.slice(start, end).trim(), start, end, note: "", authorLabel: "" }]}
        onHighlight={() => {}}
      />
    </NextIntlClientProvider>
  );
  return /<article[^>]*>([\s\S]*?)<\/article>/.exec(html)?.[1] ?? "";
}

test("Reader hides outer blank lines inside a citation that starts at offset 0", () => {
  const body = "\n\n첫 문단.\n\n둘째 문단.";
  const article = renderArticle(body, 0, body.indexOf("."));
  assert.match(article, /^<span hidden="">\n\n<\/span><mark[^>]*>첫 문단<\/mark>/);
  assert.equal(article.replace(/<[^>]+>/g, ""), body);
});

test("Reader hides outer blank lines inside a citation that ends at body.length", () => {
  const body = "첫 문단.\n\n둘째 문단.\n\n";
  const article = renderArticle(body, body.indexOf("둘째"), body.length);
  assert.match(article, /<mark[^>]*>둘째 문단\.<\/mark><span hidden="">\n\n<\/span>$/);
  assert.equal(article.replace(/<[^>]+>/g, ""), body);
});
