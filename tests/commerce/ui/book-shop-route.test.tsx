import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { registerHooks } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import type { CommerceEditionCatalogue } from "@/lib/commerce/editions";
import { setBookShopScenario } from "../../fixtures/commerce/book-shop-route";

let ShopPage: typeof import("@/app/(site)/shop/page").default;
let boundary: ReturnType<typeof registerHooks>;

before(async () => {
  boundary = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL && new URL(context.parentURL).pathname.endsWith("/src/app/(site)/shop/page.tsx")
        && ["next/server", "payload", "@payload-config", "@/lib/commerce/catalogue", "@/lib/commerce/editions",
          "@/lib/member-auth/public-capabilities.server", "@/components/commerce/checkout",
          "@/components/commerce/offer", "@/components/commerce/book-offer"].includes(specifier)) {
        return { url: new URL("../../fixtures/commerce/book-shop-route.tsx", import.meta.url).href, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
  });
  ShopPage = (await import("@/app/(site)/shop/page")).default;
});
after(() => boundary?.deregister());

test("actual ShopPage routes native absence independently but never purchases an ambiguous book", async (t) => {
  for (const reason of ["native-schema-unregistered", "product-unpublished"] as const) {
    await t.test(reason + " preserves a legitimate existing legacy offer", async () => {
      setBookShopScenario({ editions: { status: "unavailable", reason, purchaseReady: false }, legacyOffer: true });
      const html = renderToStaticMarkup(await ShopPage());
      assert.match(html, /data-legacy-offer="present"/);
      assert.match(html, /data-legacy-checkout/);
      assert.doesNotMatch(html, /data-book-state/);
    });
  }
  for (const reason of ["product-ambiguous", "invalid-configuration", "editions-unpublished"] as const) {
    await t.test(reason + " shows unavailable book information without legacy checkout", async () => {
      setBookShopScenario({ editions: { status: "unavailable", reason, purchaseReady: false }, legacyOffer: true });
      const html = renderToStaticMarkup(await ShopPage());
      assert.match(html, /data-book-state="unavailable"/);
      assert.doesNotMatch(html, /data-legacy-offer|data-legacy-checkout|data-account-gate/);
    });
  }
  await t.test("one published native parent renders display-only book even alongside a legacy offer", async () => {
    const editions: CommerceEditionCatalogue = { status: "displayable", purchaseReady: false,
      product: { productID: "fixture-book", releaseID: "fixture-book", title: "Fixture book", description: "Fixture description",
        images: [{ image: "fixture-media" }], productVersion: "fixture-version" },
      editions: [{ variantID: "fixture-variant", optionID: "fixture-option", variantTypeID: "fixture-type",
        label: "Fixture edition", value: "fixture", priceKRW: null, variantVersion: "fixture-version" }],
    };
    setBookShopScenario({ editions, legacyOffer: true });
    const html = renderToStaticMarkup(await ShopPage());
    assert.match(html, /data-book-state="displayable"/);
    assert.doesNotMatch(html, /data-legacy-offer|data-legacy-checkout|data-account-gate/);
  });
  await t.test("actual edition read failure is not absence or a legacy purchase fallback", async () => {
    setBookShopScenario({ editions: new Error("Synthetic edition read failure"), legacyOffer: true });
    const html = renderToStaticMarkup(await ShopPage());
    assert.match(html, /data-book-state="read-failed"/);
    assert.doesNotMatch(html, /data-legacy-offer|data-legacy-checkout|data-account-gate/);
  });
  await t.test("no native or legacy publication never fabricates a checkout", async () => {
    setBookShopScenario({ editions: { status: "unavailable", reason: "product-unpublished", purchaseReady: false }, legacyOffer: false });
    const html = renderToStaticMarkup(await ShopPage());
    assert.match(html, /data-legacy-offer="absent"/);
    assert.doesNotMatch(html, /data-legacy-checkout|data-account-gate/);
  });
});
