import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { renderWithEnglishMessages as renderToStaticMarkup } from "../../fixtures/english-render";
import { BlurText } from "@/components/blur-text";

test("blur text keeps one complete accessible reading and preserves visual word separators", () => {
  const text = "One two.\nThree";
  const html = renderToStaticMarkup(
    <BlurText text={text} active={false} />
  );
  assert.match(html, /class="[^"]*\bsr-only\b[^"]*">One two\.\nThree<\/span>/);
  assert.match(html, /aria-hidden="true"/);
  const words = [
    ...html.matchAll(
      /<span\b[^>]*class="[^"]*\bblur-word\b[^"]*"[^>]*>(.*?)<\/span>/gs
    )
  ];
  assert.deepEqual(
    words.map((word) => word[1]),
    ["One", "two.", "Three"],
    "only words may be inline-block animation spans; isolated collapsible spaces have zero layout width"
  );
  assert.match(html, /One<\/span> <span/,
    "word separators must remain real inline text nodes and wrap opportunities");
  assert.match(html, /two\.<\/span>\n<span/,
    "newlines remain raw text governed by the parent's whitespace-pre-line");
  const visual = html
    .slice(html.indexOf('aria-hidden="true"'))
    .replace(/^[^>]*>/, "");
  assert.equal(
    visual.replace(/<br\s*\/?\s*>/g, "\n").replace(/<[^>]*>/g, ""),
    text
  );
});

test("BlurText retargets existing Motion words with directional timing, rather than snapping hidden", () => {
  const source = readFileSync(new URL("../../../src/components/blur-text.tsx", import.meta.url), "utf8");
  assert.match(source, /index=\{Math\.floor\(index \/ 2\)\}/);
  assert.doesNotMatch(source, /blurWordTransition|blur-tokens/);
  assert.doesNotMatch(source, /still \|\| !visible\s*\? \{ duration: 0 \}/);
});
