import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

for (const path of ["src/app/(site)/_home/home-view.tsx", "src/app/(site)/tickets/payment/page.tsx", ...["terms", "privacy", "refund"].map((policy) => `src/app/(site)/${policy}/page.tsx`)]) {
  test(`source-only: ${path} reads published CMS disclosures independently of products`, async () => {
    const source = await readFile(path, "utf8");
    assert.match(source, /loadPublishedCommerceDisclosure/);
    assert.doesNotMatch(source, /commerceDisclosure|loadCommerceOffer|loadPortOne/);
    assert.match(source, /await connection\(\)/);
  });
}

test("source-only: legacy tickets entry forwards to the sole CMS shop", async () => {
  const source = await readFile("src/app/(site)/tickets/page.tsx", "utf8");
  assert.match(source, /import ShopPage from "\.\.\/shop\/page"/);
  assert.match(source, /<ShopPage/);
  assert.doesNotMatch(source, /loadPortOne|commerceDisclosure|JSON\.stringify/);
});

test("source-only: disclosure presenters have no private or legacy data authority", async () => {
  for (const name of ["seller-disclosure", "policy-page"]) {
    const source = await readFile(`src/app/(site)/_commerce/${name}.tsx`, "utf8");
    assert.doesNotMatch(source, /commerceDisclosure|@payload-config|getPayload|catalogue/);
  }
});


test("source-only: home streams the CMS footer without blocking the teaser", async () => {
  // The page resolves the copy on the server (audit row 8), then renders the synchronous view.
  const page = await readFile("src/app/(site)/page.tsx", "utf8");
  assert.match(page, /resolveHomePageCopy[\s\S]*<HomeView content=/);
  const source = await readFile("src/app/(site)/_home/home-view.tsx", "utf8");
  const home = source.slice(source.indexOf("export function HomeView("));
  assert.match(source, /export function HomeView\(/, "the view remains synchronous");
  assert.doesNotMatch(home, /await |getPayload|loadPublishedCommerceDisclosure/);
  assert.match(home, /<TeaserContentProvider initialContent=\{content\}>[\s\S]*<Warp \/>[\s\S]*<\/TeaserContentProvider>[\s\S]*<Suspense/);
  assert.match(home, /<Suspense fallback=\{null\}>/);
  assert.doesNotMatch(home, /<SellerDisclosure seller=\{null\}/);
  assert.match(home, /<PublishedSellerDisclosure \/>/);
  assert.match(source, /async function PublishedSellerDisclosure\(\)/);
});
