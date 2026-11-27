import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

// Home and ticket payment no longer read it: seller details moved to the site footer (owner, 21 Nov).
for (const path of ["src/lib/site-info/load-seller-facts.ts", ...["terms", "privacy", "refund"].map((policy) => `src/app/(site)/${policy}/page.tsx`)]) {
  test(`source-only: ${path} reads published CMS disclosures independently of products`, async () => {
    const source = await readFile(path, "utf8");
    assert.match(source, /loadPublishedCommerceDisclosure/);
    assert.doesNotMatch(source, /commerceDisclosure|loadCommerceOffer|loadPortOne/);
    if (!path.startsWith("src/lib/")) assert.match(source, /await connection\(\)/);
  });
}

test("source-only: the footer streams the seller facts per request", async () => {
  const source = await readFile("src/components/shell/Footer/footer.tsx", "utf8");
  assert.match(source, /await connection\(\)[\s\S]*loadSellerFacts\(\)/);
});

test("source-only: legacy tickets entry forwards to the sole CMS shop", async () => {
  const source = await readFile("src/app/(site)/tickets/page.tsx", "utf8");
  assert.match(source, /import ShopPage from "\.\.\/shop\/page"/);
  assert.match(source, /<ShopPage/);
  assert.doesNotMatch(source, /loadPortOne|commerceDisclosure|JSON\.stringify/);
});

test("source-only: disclosure presenters have no private or legacy data authority", async () => {
  for (const path of [
    ...["seller-disclosure", "policy-page"].map((name) => `src/app/(site)/_commerce/${name}.tsx`),
    ...["footer-shell", "commerce-info", "locale-switch", "policy-links"].map((name) => `src/components/shell/Footer/${name}.tsx`)
  ]) {
    const source = await readFile(path, "utf8");
    assert.doesNotMatch(source, /commerceDisclosure|@payload-config|getPayload|catalogue/);
  }
});


test("source-only: home renders the teaser only; seller details live in the site footer", async () => {
  // The page resolves the copy on the server (audit row 8), then renders the synchronous view.
  const page = await readFile("src/app/(site)/page.tsx", "utf8");
  assert.match(page, /resolveHomePageCopy[\s\S]*<HomeView content=/);
  const source = await readFile("src/app/(site)/_home/home-view.tsx", "utf8");
  const home = source.slice(source.indexOf("export function HomeView("));
  assert.match(source, /export function HomeView\(/, "the view remains synchronous");
  assert.doesNotMatch(home, /await |getPayload|loadPublishedCommerceDisclosure/);
  assert.match(home, /<TeaserContentProvider initialContent=\{content\}>[\s\S]*<Warp \/>[\s\S]*<\/TeaserContentProvider>/);
  // Owner, 21 Nov: "it shouldn't be part of the fucking page. It should be part of the fucking, you know, footer."
  assert.doesNotMatch(source, /SellerDisclosure|bg-teaser-blue/);
});
