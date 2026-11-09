import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

for (const path of ["src/app/(site)/page.tsx", "src/app/(site)/tickets/payment/page.tsx", ...["terms", "privacy", "refund"].map((policy) => `src/app/(site)/${policy}/page.tsx`)]) {
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
  const source = await readFile("src/app/(site)/page.tsx", "utf8");
  const home = source.slice(source.indexOf("export default function Home()"));
  assert.match(source, /export default function Home\(\)/, "Home remains synchronous");
  assert.doesNotMatch(home, /await |getPayload|loadPublishedCommerceDisclosure/);
  assert.match(home, /<TeaserContentProvider>[\s\S]*<Warp \/>[\s\S]*<\/TeaserContentProvider>[\s\S]*<Suspense/);
  assert.match(home, /fallback=\{<SellerDisclosure seller=\{null\}/);
  assert.match(home, /<PublishedSellerDisclosure \/>/);
  assert.match(source, /async function PublishedSellerDisclosure\(\)/);
});
