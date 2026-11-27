import { seedCart } from "../../fixtures/commerce/cart-locks";
import { MemberAuthProviders } from "../../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { CommerceOffer } from "../../../src/lib/commerce/catalogue";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";
import { membershipCartProduct } from "../../../src/lib/commerce/cart-products";

// Cordy, 26 Nov: split cart.tsx's mechanics into a hook "with no change in behaviour". These pin what the signed-in cart
// does today (waiting, quote, checkout, remove, refresh, feedback); they ran green on cart.tsx before the split.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let CommerceCart: typeof import("../../../src/components/commerce/cart").CommerceCart;
const offer = { productID: "p1", title: "Book only", description: "", images: [], priceKRW: 35000, maximumQuantity: 1,
  shippingFeeKRW: 3000, availableQuantity: 5 } as unknown as CommerceOffer;
const member = { id: "u1", cart: { docs: [] } };
const cart = (items: unknown[], extra: Record<string, unknown> = {}) => ({ id: "c1", status: "active", items, ...extra });
const line = { id: "i1", product: "p1", quantity: 1 };

before(async () => {
  env = await setupCartDom();
  CommerceCart = (await import("../../../src/components/commerce/cart")).CommerceCart;
});
afterEach(() => { env.ui.cleanup(); env.ecommerce.resetFakeEcommerce(); });
after(async () => { await env.restore(); });

/** The one place the cart's inputs are given; everything below asserts what a person sees. */
function render(given: CommerceOffer | null = offer, props: { signedIn?: boolean; onSignIn?: () => void } = {}) {
  return env.ui.render(<MemberAuthProviders><CommerceCart products={given ? [membershipCartProduct(given)] : []} wide {...props} /></MemberAuthProviders>);
}
const screen = () => env.ui.screen;
const link = (name: RegExp | string) => screen().getByRole("link", { name }) as HTMLAnchorElement;
const status = () => screen().getAllByRole("status").map((node) => node.textContent ?? "");

test("signed in, before the member is read, the provider loading, or a named cart not yet loaded: loading, not empty", () => {
  for (const state of [{ user: null }, { user: member, isLoading: true }, { user: { id: "u1", cart: { docs: [{ id: "c1" }] } } }]) {
    env.ecommerce.setFakeEcommerce({ cart: undefined, isLoading: false, ...state });
    render();
    assert.ok(screen().getByText("Loading your cart"));
    assert.equal(screen().queryByText("Your cart is empty") === null, true);
    env.ui.cleanup();
  }
});

test("signed in with no saved cart: empty, and the next step is the shop", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: undefined });
  render();
  assert.ok(screen().getByText("Your cart is empty"));
  assert.equal(link("Visit the shop").getAttribute("href"), "/shop");
  assert.equal(screen().queryByRole("button", { name: "Refresh cart" }) === null, true, "no cart, nothing to refresh");
});

test("one line of the current offer can be reviewed but does not link to checkout", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: cart([line]) });
  render();
  assert.ok(screen().getByRole("heading", { name: "Book only" }));
  assert.ok(screen().getByText("35,000 KRW each"));
  assert.equal(status().includes("Estimated total: 38,000 KRW"), true);
  assert.equal(link("Review and purchase in the shop").getAttribute("href"), "/shop");
  assert.equal(screen().queryByRole("link", { name: "Continue to checkout" }) === null, true);
});

test("signed out with onSignIn, a quoted line asks for sign-in instead of linking on", () => {
  seedCart(env.dom.window.localStorage, [{ productID: "p1", quantity: 1 }]);
  let asked = 0;
  render(offer, { signedIn: false, onSignIn: () => { asked += 1; } });
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Sign in to save your cart" }));
  assert.equal(asked, 1);
  env.dom.window.localStorage.clear();
});

test("a line that isn't the current offer, too many, or a purchased cart is not quoted", () => {
  for (const [given, items, extra] of [
    [offer, [{ ...line, product: "other" }], {}],
    [offer, [{ ...line, quantity: 2 }], {}],
    [offer, [line], { status: "purchased" }],
    [offer, [line], { purchasedAt: "2026-11-26T00:00:00.000Z" }],
    [null, [line], {}],
  ] as const) {
    env.ecommerce.setFakeEcommerce({ user: member, cart: cart([...items], extra) });
    render(given);
    assert.ok(screen().getByText(/We can't quote this cart/));
    assert.equal(status().some((text) => text.startsWith("Estimated total")), false);
    assert.equal(link("Review and purchase in the shop").getAttribute("href"), "/shop");
    env.ui.cleanup();
  }
});

test("a quoted line still can't check out with two units, a variant, or not enough stock", () => {
  const two = { ...offer, maximumQuantity: 2 } as CommerceOffer;
  for (const [given, item] of [
    [two, { ...line, quantity: 2 }],
    [offer, { ...line, variant: "v1" }],
    [{ ...offer, availableQuantity: 0 } as CommerceOffer, line],
  ] as const) {
    env.ecommerce.setFakeEcommerce({ user: member, cart: cart([item]) });
    render(given);
    assert.equal(status().some((text) => text.startsWith("Estimated total")), true, "still quoted");
    assert.equal(link("Review and purchase in the shop").getAttribute("href"), "/shop");
    env.ui.cleanup();
  }
});

test("remove: pending, then removed when the same cart no longer has the line", async () => {
  let finish!: () => void;
  env.ecommerce.setFakeEcommerce({ user: member, cart: cart([line]),
    removeItem: () => new Promise<void>((resolve) => { finish = resolve; }) });
  render();
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Remove Book only" }));
  await env.ui.waitFor(() => assert.equal(status().includes("Removing item…"), true));
  assert.equal((screen().getByRole("button", { name: "Remove Book only" }) as HTMLButtonElement).disabled, true);
  await env.ui.act(async () => { env.ecommerce.setFakeEcommerce({ cart: cart([]) }); finish(); });
  await env.ui.waitFor(() => assert.equal(status().includes("Item removed."), true));
});

test("remove: unconfirmed when the line is still there, failed when the call throws", async () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: cart([line]), removeItem: async () => {} });
  render();
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Remove Book only" }));
  await env.ui.waitFor(() => assert.equal(status().some((text) => text.startsWith("We couldn't confirm removal")), true));
  env.ui.cleanup();
  env.ecommerce.setFakeEcommerce({ removeItem: async () => { throw new Error("no"); } });
  render();
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Remove Book only" }));
  await env.ui.waitFor(() => assert.equal(status().some((text) => text.startsWith("We couldn't remove that item")), true));
});

test("refresh: refreshed on success, failed on error", async () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: cart([line]), refreshCart: async () => {} });
  render();
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Refresh cart" }));
  await env.ui.waitFor(() => assert.equal(status().includes("Cart refreshed."), true));
  env.ui.cleanup();
  env.ecommerce.setFakeEcommerce({ refreshCart: async () => { throw new Error("no"); } });
  render();
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Refresh cart" }));
  await env.ui.waitFor(() => assert.equal(status().some((text) => text.startsWith("We couldn't refresh the cart")), true));
});

// Review-B HOLD, 27 Nov: signed in, the browser's cart lines its transfer kept back or the account refused stay visible
// apart from the account's cart and can be removed here; removing one never touches the account's cart.
test("signed in, the browser's remaining lines show under their own heading and × removes only them", async () => {
  let accountRemovals = 0;
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }]);
  env.ecommerce.setFakeEcommerce({ user: member, cart: cart([line]), removeItem: async () => { accountRemovals += 1; } });
  render();
  assert.ok(screen().getByText("Book only"));
  const local = screen().getByRole("region", { name: "Only on this browser" });
  assert.ok(env.ui.within(local).getByText("These weren't added to your account's cart."));
  env.ui.fireEvent.click(env.ui.within(local).getByRole("button", { name: /^Remove / }));
  await env.ui.waitFor(() => assert.equal(JSON.parse(env.dom.window.localStorage.getItem("sphmrs.cart.v2") ?? "{}").lines?.length ?? 0, 0));
  assert.equal(screen().queryByRole("region", { name: "Only on this browser" }) === null, true);
  assert.equal(accountRemovals, 0);
  assert.ok(screen().getByText("Book only"));
  env.dom.window.localStorage.clear();
});
