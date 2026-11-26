import { MemberAuthProviders } from "../../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { CommerceOffer } from "../../../src/lib/commerce/catalogue";
import { membershipCartProduct, type CartProduct } from "../../../src/lib/commerce/cart-products";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";

// The cart column's lines (Hamlet, 26 Nov): does it work? Lines priced, the × removes, Checkout, the edition route, the
// empty way back, and the stack hears what's in the cart.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let ShopCartLines: typeof import("../../../src/app/(site)/shop/cart/shop-cart-lines").ShopCartLines;
let CartColumn: typeof import("../../../src/components/commerce/shop/cart-column").CartColumn;
const offer = { productID: "p1", title: "Book only", description: "", images: [], priceKRW: 35000, maximumQuantity: 1,
  shippingFeeKRW: 3000, availableQuantity: 5 } as unknown as CommerceOffer;
const edition: CartProduct = { productID: "e1", kind: "edition", title: "Edition one", image: null, unitPriceKRW: 50000, shippingKRW: null,
  maxQuantity: 1, availableQuantity: 3, productHref: "/shop/products/edition-one" };
const member = { id: "u1", cart: { docs: [] } };

before(async () => {
  env = await setupCartDom();
  ShopCartLines = (await import("../../../src/app/(site)/shop/cart/shop-cart-lines")).ShopCartLines;
  CartColumn = (await import("../../../src/components/commerce/shop/cart-column")).CartColumn;
});
afterEach(() => { env.ui.cleanup(); env.ecommerce.resetFakeEcommerce(); env.dom.window.localStorage.clear(); });
after(async () => { await env.restore(); });

function render(products: readonly CartProduct[], props: { signedIn?: boolean; onSignIn?: () => void } = {}, column = { closed: 0, reported: [] as unknown[] }) {
  env.ui.render(<MemberAuthProviders><CartColumn open shown back="All products" onBack={() => { column.closed += 1; }} onLines={(lines) => { column.reported.push(lines); }}>
    <ShopCartLines products={products} signedIn={props.signedIn ?? true} onSignIn={props.onSignIn} />
  </CartColumn></MemberAuthProviders>);
  return column;
}
const screen = () => env.ui.screen;

test("a member's membership line is priced, totalled, reported to the stack, and goes to checkout", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: { id: "c1", status: "active", items: [{ id: "i1", product: "p1", quantity: 1 }] } });
  const column = render([membershipCartProduct(offer)]);
  assert.ok(screen().getByText("Book only"));
  assert.ok(screen().getByText("35,000 KRW"));
  assert.equal(screen().getByRole("link", { name: "Continue to checkout" }).getAttribute("href"), "/shop/checkout");
  assert.equal(JSON.stringify(column.reported.at(-1)), JSON.stringify({ p1: 1 }));
});

test("signed out, Checkout asks for sign-in, and × removes the browser's line", () => {
  env.dom.window.localStorage.setItem("sphmrs.cart.v1", JSON.stringify({ version: 1, lines: [{ productID: "p1", quantity: 1 }] }));
  let asked = 0;
  render([membershipCartProduct(offer)], { signedIn: false, onSignIn: () => { asked += 1; } });
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Continue to checkout" }));
  assert.equal(asked, 1);
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Remove Book only" }));
  assert.ok(screen().getByText("Your cart is empty"));
});

test("an edition line points to its own page and offers no checkout", () => {
  env.dom.window.localStorage.setItem("sphmrs.cart.v1", JSON.stringify({ version: 1, lines: [{ productID: "e1", quantity: 1 }] }));
  render([edition], { signedIn: false });
  assert.equal(screen().getByRole("link", { name: "Buy on its page" }).getAttribute("href"), "/shop/products/edition-one");
  assert.equal(screen().queryByRole("button", { name: "Continue to checkout" }) === null, true);
});

test("empty: one line and the way back to the shelf closes the cart", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: undefined });
  const column = render([membershipCartProduct(offer)]);
  assert.ok(screen().getByText("Your cart is empty"));
  // The column has its own way back too (desktop); the empty cart offers one under its line.
  env.ui.fireEvent.click(env.ui.within(env.dom.window.document.querySelector("aside") as HTMLElement).getByRole("button", { name: "All products" }));
  assert.equal(column.closed >= 1, true);
});
