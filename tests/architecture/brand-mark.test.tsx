import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BrandMark } from "@/components/core/BrandMark";

// Owner, 27 Nov: the brand mark is the logo. It is the SVG alone; callers wrap it in their own link or heading.
test("the brand mark is the logo alone: one hidden SVG in the text colour, sized by the font", () => {
  const mark = renderToStaticMarkup(<BrandMark className="text-xl" />);
  assert.match(mark, /^<svg[^>]*>[\s\S]*<\/svg>$/);
  assert.equal(/<a[\s>]/.test(mark), false, "no link of its own");
  assert.match(mark, /aria-hidden="true"/);
  assert.match(mark, /fill="currentColor"/);
  assert.match(mark, /viewBox="0 0 908.3 98.51"/);
  assert.match(mark, /class="inline-block h-\[1em\] w-auto shrink-0 text-xl"/);
  assert.equal(/<svg[^>]* (width|height)=/.test(mark), false, "no fixed size");
});

test("children and the old asChild prop are ignored, so no caller's text shows beside the logo", () => {
  const mark = renderToStaticMarkup(<BrandMark asChild>sophomores</BrandMark>);
  assert.equal(mark.includes("sophomores"), false);
  assert.equal(mark.includes("asChild"), false);
});

test("the site header's home link wraps the mark once, with no link inside a link", () => {
  const source = readFileSync("src/components/shell/site-header.tsx", "utf8");
  assert.match(source, /<Link href="\/" aria-label="Sophomores"[^>]*>[\s\S]{0,600}?<BrandMark [^>]*\/>/);
  assert.equal(readFileSync("src/components/core/BrandMark/index.tsx", "utf8").includes("Link"), false);
});
