import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { registerHooks } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import type { CommerceEditionShop } from "@/lib/commerce/editions";
import { legacyOfferReads, setBookShopScenario } from "../../fixtures/commerce/book-shop-route";

let ShopPage: typeof import("@/app/(site)/shop/page").default;
let boundary: ReturnType<typeof registerHooks>;

before(async () => {
  boundary = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (context.parentURL && new URL(context.parentURL).pathname.endsWith("/src/app/(site)/shop/page.tsx")
        && ["next/server", "payload", "@payload-config", "@/lib/commerce/catalogue", "@/lib/commerce/editions",
          "@/lib/member-auth/public-capabilities.server", "@/components/commerce/checkout",
          "@/components/commerce/offer", "@/components/commerce/book-offer", "@/components/commerce/load-retry"].includes(specifier)) {
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
    await t.test(reason + " never falls back to standalone sales", async () => {
      setBookShopScenario({ editions: { status: "unavailable", reason, purchaseReady: false }, legacyOffer: true });
      const html = renderToStaticMarkup(await ShopPage());
      assert.match(html, /data-book-state="unavailable"/);
      assert.doesNotMatch(html, /data-legacy-offer|data-legacy-checkout|data-account-gate/);
      assert.equal(legacyOfferReads(), 0);
    });
  }
  for (const reason of ["invalid-configuration"] as const) {
    await t.test(reason + " shows unavailable book information without legacy checkout", async () => {
      setBookShopScenario({ editions: { status: "unavailable", reason, purchaseReady: false }, legacyOffer: true });
      const html = renderToStaticMarkup(await ShopPage());
      assert.match(html, /data-book-state="unavailable"/);
      assert.doesNotMatch(html, /data-legacy-offer|data-legacy-checkout|data-account-gate/);
      assert.equal(legacyOfferReads(), 0);
    });
  }
  await t.test("published native products render the shop even alongside a legacy offer", async () => {
    // The list contents are covered by tests/commerce/editions/shop-list.test.ts on the real loaders.
    const editions: CommerceEditionShop = { status: "displayable", purchaseReady: false, products: [] };
    setBookShopScenario({ editions, legacyOffer: true });
    const html = renderToStaticMarkup(await ShopPage());
    assert.match(html, /data-book-state="displayable"/);
    assert.doesNotMatch(html, /data-legacy-offer|data-legacy-checkout|data-account-gate/);
    assert.equal(legacyOfferReads(), 0);
  });
  await t.test("actual edition read failure is not absence or a legacy purchase fallback", async () => {
    setBookShopScenario({ editions: new Error("Synthetic edition read failure"), legacyOffer: true });
    const html = renderToStaticMarkup(await ShopPage());
    assert.match(html, /data-book-state="read-failed"/);
    assert.match(html, /data-retry/, "a failed read retries in place");
    assert.doesNotMatch(html, /data-legacy-offer|data-legacy-checkout|data-account-gate/);
    assert.equal(legacyOfferReads(), 0);
  });
  await t.test("the removed legacy fallback is never queried, even on native absence", async () => {
    setBookShopScenario({ editions: { status: "unavailable", reason: "product-unpublished", purchaseReady: false }, legacyOffer: new Error("Synthetic legacy read failure") });
    const html = renderToStaticMarkup(await ShopPage());
    assert.match(html, /data-book-state="unavailable"/);
    assert.doesNotMatch(html, /data-legacy-offer|data-legacy-checkout|data-account-gate/);
    assert.equal(legacyOfferReads(), 0);
  });
});
