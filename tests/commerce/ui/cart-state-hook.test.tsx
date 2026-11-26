import { MemberAuthProviders } from "../../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import type { ReactNode } from "react";
import { after, afterEach, before, test } from "node:test";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";
import type { CartProduct } from "../../../src/lib/commerce/cart-products";

// The cart's state as a hook, per product line (Cordy/Hamlet, 26 Nov: "the shop sells three edition products, so the
// hook must be per product line"). Edition lines resolve their name and price; checkout from the cart stays the
// membership offer's (the server cart's own rule), so an edition line points to its product page.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let useCommerceCartState: typeof import("../../../src/components/commerce/use-commerce-cart-state").useCommerceCartState;
const membership: CartProduct = { productID: "p1", kind: "membership", title: "Book only", image: null, unitPriceKRW: 35000,
  shippingKRW: 3000, maxQuantity: 1, availableQuantity: 5, productHref: null };
const edition: CartProduct = { productID: "e1", kind: "edition", title: "Signed edition", image: { url: "/e1.jpg", alt: "Signed edition" },
  unitPriceKRW: 120000, shippingKRW: null, maxQuantity: 1, availableQuantity: null, productHref: "/shop/products/e1" };
const member = { id: "u1", cart: { docs: [] } };
const cart = (items: unknown[], extra: Record<string, unknown> = {}) => ({ id: "c1", status: "active", items, ...extra });

before(async () => {
  env = await setupCartDom();
  useCommerceCartState = (await import("../../../src/components/commerce/use-commerce-cart-state")).useCommerceCartState;
});
afterEach(() => { env.ui.cleanup(); env.ecommerce.resetFakeEcommerce(); env.dom.window.localStorage.clear(); });
after(async () => { await env.restore(); });

const wrapper = ({ children }: { children: ReactNode }) => <MemberAuthProviders>{children}</MemberAuthProviders>;
function state(products: readonly CartProduct[], signedIn = true) {
  return env.ui.renderHook(() => useCommerceCartState({ signedIn, products }), { wrapper });
}

test("a membership line resolves, is quoted, and checks out", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: cart([{ id: "i1", product: "p1", quantity: 1 }]) });
  const { result } = state([membership, edition]);
  assert.deepEqual(result.current.lines, [{ id: "i1", productID: "p1", kind: "membership", title: "Book only", image: null,
    unitPriceKRW: 35000, quantity: 1, maxQuantity: 1, available: true, quoted: true, productHref: null }]);
  assert.deepEqual([result.current.subtotalKRW, result.current.shippingKRW, result.current.totalKRW], [35000, 3000, 38000]);
  assert.deepEqual([result.current.checkoutAvailable, result.current.checkoutReason, result.current.checkoutHref], [true, "ready", "/shop/checkout"]);
  assert.equal(result.current.canRefresh, true);
});

test("an edition line resolves its name, image and price, and points to its product page instead of checkout", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: cart([{ id: "i2", product: "e1", quantity: 1 }]) });
  const { result } = state([membership, edition]);
  assert.deepEqual(result.current.lines, [{ id: "i2", productID: "e1", kind: "edition", title: "Signed edition",
    image: { url: "/e1.jpg", alt: "Signed edition" }, unitPriceKRW: 120000, quantity: 1, maxQuantity: 1,
    available: false, quoted: true, productHref: "/shop/products/e1" }]);
  assert.deepEqual([result.current.subtotalKRW, result.current.shippingKRW, result.current.totalKRW], [null, null, null]);
  assert.deepEqual([result.current.checkoutAvailable, result.current.checkoutReason, result.current.checkoutHref],
    [false, "edition-on-product-page", null]);
});

test("a signed-out browser line resolves the same way, its ID being the product ID", () => {
  env.dom.window.localStorage.setItem("sphmrs.cart.v1", JSON.stringify({ version: 1, lines: [{ productID: "e1", quantity: 1 }] }));
  const { result } = state([membership, edition], false);
  assert.equal(result.current.lines[0]?.id, "e1");
  assert.equal(result.current.lines[0]?.title, "Signed edition");
  assert.equal(result.current.checkoutReason, "edition-on-product-page");
  assert.equal(result.current.canRefresh, false, "a browser cart has nothing to refresh");
});

test("an unpublished product is an unknown line: no name, no price, not quoted", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: cart([{ id: "i3", product: "gone", quantity: 1 }]) });
  const { result } = state([membership]);
  assert.deepEqual(result.current.lines.map(({ kind, title, unitPriceKRW, quoted, available }) => ({ kind, title, unitPriceKRW, quoted, available })),
    [{ kind: "unknown", title: null, unitPriceKRW: null, quoted: false, available: false }]);
  assert.deepEqual([result.current.totalKRW, result.current.checkoutReason], [null, "not-quoted"]);
});

test("checkout reasons: loading, empty, purchased, multiple lines, quantity, sold out", () => {
  const cases: Array<[Record<string, unknown>, readonly CartProduct[], string]> = [
    [{ user: null, cart: undefined }, [membership], "loading"],
    [{ user: member, cart: undefined }, [membership], "empty"],
    [{ user: member, cart: cart([{ id: "i1", product: "p1", quantity: 1 }], { status: "purchased" }) }, [membership], "purchased"],
    [{ user: member, cart: cart([{ id: "i1", product: "p1", quantity: 1 }, { id: "i2", product: "e1", quantity: 1 }]) }, [membership, edition], "multiple-lines"],
    [{ user: member, cart: cart([{ id: "i1", product: "p1", quantity: 2 }]) }, [{ ...membership, maxQuantity: 2 }], "quantity"],
    [{ user: member, cart: cart([{ id: "i1", product: "p1", quantity: 1 }]) }, [{ ...membership, availableQuantity: 0 }], "sold-out"],
  ];
  for (const [fake, products, reason] of cases) {
    env.ecommerce.setFakeEcommerce({ isLoading: false, ...fake });
    const { result } = state(products);
    assert.equal(result.current.checkoutReason, reason, reason);
    assert.equal(result.current.checkoutAvailable, false, reason);
    env.ui.cleanup();
  }
});

test("remove and refresh drive the same feedback as the cart view", async () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: cart([{ id: "i1", product: "p1", quantity: 1 }]),
    removeItem: async () => { env.ecommerce.setFakeEcommerce({ cart: cart([]) }); }, refreshCart: async () => {} });
  const { result } = state([membership]);
  await env.ui.act(() => result.current.remove("i1"));
  assert.equal(result.current.feedback, "Item removed.");
  await env.ui.act(() => result.current.refresh());
  assert.equal(result.current.feedback, "Cart refreshed.");
});
