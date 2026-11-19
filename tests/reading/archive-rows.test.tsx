import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ArchiveRow, PageRange } from "@/components/reading/archive-rows";
import type { PostCard } from "@/lib/content/slots";
import { EnglishMessages } from "../fixtures/english-messages";
import { ReadingFixture } from "../fixtures/reading-layout";

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(
    <EnglishMessages>
      <ReadingFixture>{node}</ReadingFixture>
    </EnglishMessages>
  )
    .split('<main data-reading-fixture="content">')[1]
    .split("</main>")[0];

const post: PostCard = {
  id: "post-1",
  title: "Stored essay",
  slug: "stored",
  href: "/essays/stored",
  dek: "A dek",
  heroUrl: "",
  authorName: "Desk",
  authorImageUrl: "",
  tags: ["Notes"],
  category: "Essays",
  publishedAt: "2026-11-04T00:00:00.000Z"
};

test("an archive row links to its essay with title, author, category and date", () => {
  const html = render(<ArchiveRow post={post} />);
  assert.ok(html.includes('href="/essays/stored"'));
  for (const text of [
    "Stored essay",
    "Desk",
    "Essays",
    "A dek",
    'dateTime="2026-11-04T00:00:00.000Z"'
  ])
    assert.ok(html.includes(text), text);
});

test("the page range counts the shown essays and links the neighbouring pages", () => {
  const middle = render(
    <PageRange page={2} limit={12} totalDocs={30} totalPages={3} />
  );
  assert.ok(middle.includes("13–24 of 30"));
  assert.ok(
    middle.includes('href="/essays/in/1"') &&
      middle.includes('href="/essays/in/3"')
  );
  const last = render(
    <PageRange page={3} limit={12} totalDocs={30} totalPages={3} />
  );
  assert.ok(
    last.includes("25–30 of 30") && !last.includes('href="/essays/in/4"')
  );
  assert.equal(
    render(<PageRange page={1} limit={12} totalDocs={0} totalPages={0} />),
    ""
  );
});
