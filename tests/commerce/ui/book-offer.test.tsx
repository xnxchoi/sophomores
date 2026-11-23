import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { listCommerceEditionProducts, type CommerceEditionShop } from "@/lib/commerce/editions";
import { BookUnavailable, CommerceShopView } from "@/components/commerce/book-offer";
import { ProductPage } from "@/components/commerce/product-page/product-page";
import { readProductPageContent } from "@/components/commerce/product-page/_shared/content";
import { EnglishMessages } from "../../fixtures/english-messages";
import { ReadingFixture } from "../../fixtures/reading-layout";
import { nativeEditionsPayload } from "../../fixtures/commerce/native-editions-payload";

// Owner: each edition is its own product (book only 35,000, no token or ticket; édition personnelle 82,000; premium 329,000).
// No picker; name, price and what it includes come from E1's server offer; never "coins".
function render(node: ReactNode) {
  return renderToStaticMarkup(<EnglishMessages><ReadingFixture>{node}</ReadingFixture></EnglishMessages>)
    .split('<main data-reading-fixture="content">')[1].split("</main>")[0];
}
async function shop() {
  const value = await listCommerceEditionProducts(nativeEditionsPayload());
  assert.equal(value.status, "displayable");
  return value as Extract<CommerceEditionShop, { status: "displayable" }>;
}

test("the shop lists three separate products, each linking to its own page, with no picker", async () => {
  const html = render(<CommerceShopView shop={await shop()} />);
  const order = ["Book only", "Édition personnelle", "Premium edition"].map((name) => html.indexOf(name));
  assert.deepEqual([...order].sort((a, b) => a - b), order, "sorted by price");
  assert.equal(order.every((index) => index >= 0), true);
  for (const id of ["book", "personal", "premium"]) assert.match(html, new RegExp('href="/shop/products/' + id + '"'));
  assert.match(html, /₩35,000/); assert.match(html, /₩82,000/); assert.match(html, /₩329,000/);
  assert.match(html, /The book only\. No membership token or ticket\./);
  assert.equal((html.match(/Includes the book, one membership token and one free Member Ticket\./g) ?? []).length, 2);
  assert.doesNotMatch(html, /<select\b|<input\b|role="radio|coin|Editions/i);
});

test("a product page shows one product, its facts and that purchase is not open, with no cart or payment", async () => {
  const { product, offer } = (await shop()).products[1]!;
  const html = render(<ProductPage product={product} offer={offer} content={readProductPageContent(null)} shelf={[]} />);
  assert.match(html, /Édition personnelle/);
  assert.match(html, /₩82,000/);
  assert.match(html, /One per account/);
  assert.match(html, /Release pending/);
  assert.match(html, /href="\/shop"/);
  assert.doesNotMatch(html, /Book only|Premium edition|<button\b|<input\b|<form\b|href="[^"]*(?:checkout|payment)/i);
});

test("the first resolved image is the card cover; no image means no fake cover", async () => {
  const value = await shop();
  const first = value.products[0]!;
  const withImage = { ...first, product: { ...first.product, images: [{ image: "unresolved" }, { image: { id: "front", url: "/front.jpg", alt: "Front cover" } }] } };
  assert.match(render(<CommerceShopView shop={{ ...value, products: [withImage] }} />), /<img\b[^>]*alt="Front cover"/);
  assert.doesNotMatch(render(<CommerceShopView shop={{ ...value, products: [first] }} />), /<img\b/);
});

test("an unavailable shop or missing product shows unavailable information, not a sample or a sale", () => {
  for (const html of [render(<CommerceShopView shop={null} />),
    render(<CommerceShopView shop={{ status: "unavailable", reason: "invalid-configuration", purchaseReady: false }} />),
    render(<BookUnavailable />)]) {
    assert.match(html, /Book information is unavailable/);
    assert.match(html, /href="\/help"/);
    assert.doesNotMatch(html, /sold out|35,000|82,000|329,000|<button\b/i);
  }
});

test("a product with content fields shows its shelf, sections and table; malformed fields drop out", async () => {
  const { product, offer } = (await shop()).products[1]!;
  const content = readProductPageContent({ page: {
    shelfTitle: "Personnelle", kicker: "PREVIEW", byline: "A. Writer",
    formats: [{ label: "Hardcover", note: "₩82,000" }, { label: "E-book", url: "http://insecure.example" }],
    praise: [{ quote: "PREVIEW praise.", name: "R. Reader", role: "Critic" }, { quote: "" }],
    details: { pages: 240, trimWidthMM: 140, trimHeightMM: 210 },
    typefaces: [{ name: "Display Serif", foundry: "Foundry" }], materials: [{ item: "Cloth" }], techniques: "not a list"
  } });
  const html = render(<ProductPage product={product} offer={offer} content={content}
    shelf={[{ productID: "book", title: "Book only", current: false }, { productID: "personal", title: "Personnelle", current: true }]} />);
  for (const text of [/PREVIEW/, /by A\. Writer/, /Hardcover/, /PREVIEW praise\./, /R\. Reader/, /240 pages/, /Display Serif/, /Cloth/]) assert.match(html, text);
  assert.match(html, /href="\/shop\/products\/book"/);
  assert.match(html, /E-book/);
  assert.doesNotMatch(html, /insecure\.example/, "a non-https link is dropped; the row stays as text");
  assert.equal((html.match(/R\. Reader/g) ?? []).length, 1, "the empty quote is dropped");
  assert.equal(content.techniques.length, 0);
  assert.doesNotMatch(html, /<form\b|<input\b|href="[^"]*(?:checkout|payment)/i);
});
