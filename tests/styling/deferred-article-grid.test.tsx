import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleHero } from "@/components/reading/article-hero";
import { postFixtures } from "@/lib/content/fixtures";
import { fromPost } from "@/lib/content/map";
import { EnglishMessages } from "../fixtures/english-messages";
import { ReadingFixture } from "../fixtures/reading-layout";

// Owner-deferred styling only. Content and image behavior remain blocking in
// tests/reading/fixtures.test.tsx; default pnpm test still runs this assertion.
test("deferred styling: article grid preserves its columns and readable type", () => {
  const posts = postFixtures.map(fromPost);
  const html = renderToStaticMarkup(<EnglishMessages><ReadingFixture><ArticleHero posts={posts} /></ReadingFixture></EnglishMessages>)
    .split('<main data-reading-fixture="content">')[1].split('</main>')[0];
  assert.match(html, /lg:col-span-4/);
  assert.match(html, /lg:col-start-5/);
  assert.match(html, /lg:row-span-2/);
  assert.equal(html.includes("text-[10px]"), false);
});
