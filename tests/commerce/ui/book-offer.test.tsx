import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import type { CommerceEditionCatalogue } from "@/lib/commerce/editions";
import { CommerceBookView } from "@/components/commerce/book-offer";
import { EnglishMessages } from "../../fixtures/english-messages";
import { ReadingFixture } from "../../fixtures/reading-layout";

const catalogue: Extract<CommerceEditionCatalogue, { status: "displayable" }> = {
  status: "displayable", purchaseReady: false,
  product: {
    productID: "fixture-book", releaseID: "fixture-book", title: "Fixture printed book",
    description: "Approved fixture description <script>not markup</script>",
    images: [{ image: { id: "fixture-image" } }], productVersion: "fixture-version",
  },
  editions: [
    { variantID: "fixture-variant", optionID: "fixture-option", variantTypeID: "fixture-type",
      label: "Fixture personal edition", value: "fixture-personal", priceKRW: 76123,
      variantVersion: "fixture-variant-version" },
    { variantID: "fixture-unpriced", optionID: "fixture-unpriced-option", variantTypeID: "fixture-type",
      label: "Fixture unpriced edition", value: "fixture-unpriced", priceKRW: null,
      variantVersion: "fixture-variant-version" },
  ],
};

// Reuse the existing full navigation/provider fixture, then isolate the book's
// content so global header links cannot satisfy or fail purchase-action checks.
function renderBook(value: CommerceEditionCatalogue | null) {
  return renderToStaticMarkup(<EnglishMessages><ReadingFixture><CommerceBookView catalogue={value} /></ReadingFixture></EnglishMessages>)
    .split('<main data-reading-fixture="content">')[1].split("</main>")[0];
}

test("book display renders actual published facts and a non-proposal price", () => {
  const html = renderBook(catalogue);
  assert.match(html, /Fixture printed book/);
  assert.match(html, /Fixture personal edition/);
  assert.match(html, /76,123/);
  assert.match(html, /&lt;script&gt;not markup&lt;\/script&gt;/);
  assert.doesNotMatch(html, /35,000|82,000|329,000|<script>/);
});

test("unpriced edition stays unpriced and absent artwork does not become a cover", () => {
  const html = renderBook(catalogue);
  assert.match(html, /Fixture unpriced edition/);
  assert.match(html, /Price has not been published/);
  assert.doesNotMatch(html, /<img\b|0 KRW|Free|engraving|guaranteed admission|non-refundable/i);
});

test("display-only editions have no selector, checkout, account or payment action", () => {
  const html = renderBook(catalogue);
  assert.match(html, /Purchasing is not open/);
  assert.match(html, /href="#book-editions"/);
  assert.match(html, /<section id="book-editions" tabindex="-1" aria-labelledby="book-editions-heading"/i);
  assert.match(html, /href="\/help"/);
  assert.doesNotMatch(html, /<button\b|<input\b|<select\b|<form\b|href="[^\"]*(?:checkout|account|payment|purchase)/i);
});

test("known unpublished configuration and read failure do not become sold out or a sample", () => {
  for (const state of [null, {
    status: "unavailable", reason: "editions-unpublished", purchaseReady: false,
  } as const]) {
    const html = renderBook(state);
    assert.match(html, /Book information is unavailable/);
    assert.match(html, /href="\/help"/);
    assert.doesNotMatch(html, /Fixture|sold out|payment failed|35,000|82,000|329,000|<button\b/i);
  }
});
