import { MemberAuthProviders } from "../../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { CommerceOffer } from "../../../src/lib/commerce/catalogue";
import { membershipCartProduct, type CartProduct } from "../../../src/lib/commerce/cart-products";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";
import { seedCart } from "../../fixtures/commerce/cart-locks";

// The cart column's lines (Hamlet, 26 Nov): does it work? Lines priced, the × removes, Checkout, the edition route, the
// empty way back, and the stack hears what's in the cart.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let ShopCartLines: typeof import("../../../src/app/(site)/shop/cart/shop-cart-lines").ShopCartLines;
let CartColumn: typeof import("../../../src/components/commerce/shop/cart-column").CartColumn;
let PrivatePageGuard: typeof import("../../../src/components/auth/private-page-guard").PrivatePageGuard;
const offer = { productID: "p1", title: "Book only", description: "", images: [], priceKRW: 35000, maximumQuantity: 1,
  shippingFeeKRW: 3000, availableQuantity: 5 } as unknown as CommerceOffer;
const edition: CartProduct = { productID: "e1", kind: "edition", title: "Edition one", image: null, unitPriceKRW: 50000, shippingKRW: null,
  maxQuantity: 1, availableQuantity: 3, productHref: "/shop/products/edition-one" };
const member = { id: "u1", cart: { docs: [] } };

before(async () => {
  env = await setupCartDom();
  ShopCartLines = (await import("../../../src/app/(site)/shop/cart/shop-cart-lines")).ShopCartLines;
  CartColumn = (await import("../../../src/components/commerce/shop/cart-column")).CartColumn;
  PrivatePageGuard = (await import("../../../src/components/auth/private-page-guard")).PrivatePageGuard;
});
afterEach(() => { env.ui.cleanup(); env.ecommerce.resetFakeEcommerce(); env.dom.window.localStorage.clear(); });
after(async () => { await env.restore(); });

function render(products: readonly CartProduct[], props: { signedIn?: boolean; onSignIn?: () => void } = {},
  column = { closed: 0, reported: [] as unknown[], concealed: [] as boolean[] }) {
  env.ui.render(<MemberAuthProviders><CartColumn open shown back="All products" onBack={() => { column.closed += 1; }}
    onLines={(lines) => { column.reported.push(lines); }} onConceal={(hidden) => { column.concealed.push(hidden); }}>
    <ShopCartLines products={products} signedIn={props.signedIn ?? true} onSignIn={props.onSignIn} />
  </CartColumn></MemberAuthProviders>);
  return column;
}

// The in-place cart's lines inside their private page's guard, as /shop renders them (Review-B HOLD on 38f56878): the
// stack hears "conceal" in the same task the guard hides the panel, the counts are withdrawn, and both come back only for
// the same member.
function renderGuarded(next: () => Promise<string | null | undefined>) {
  const column = { closed: 0, reported: [] as unknown[], concealed: [] as boolean[] }, reloads = { count: 0 };
  env.ecommerce.setFakeEcommerce({ user: member, cart: { id: "c1", status: "active", items: [{ id: "i1", product: "p1", quantity: 1 }] } });
  env.ui.render(<MemberAuthProviders><CartColumn open shown back="All products" onBack={() => undefined}
    onLines={(lines) => { column.reported.push(lines); }} onConceal={(hidden) => { column.concealed.push(hidden); }}>
    <PrivatePageGuard principal="u1" readPrincipal={next} reload={() => { reloads.count += 1; }}>
      <ShopCartLines products={[membershipCartProduct(offer)]} signedIn />
    </PrivatePageGuard>
  </CartColumn></MemberAuthProviders>);
  const panel = () => env.dom.window.document.querySelector("[data-private-page]") as HTMLElement;
  return { column, reloads, panel };
}
const microtask = () => new Promise((resolve) => setTimeout(resolve, 0));
const screen = () => env.ui.screen;

test("a member's membership line is priced, totalled and reported to the stack, with no checkout while it is unavailable", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: { id: "c1", status: "active", items: [{ id: "i1", product: "p1", quantity: 1 }] } });
  const column = render([membershipCartProduct(offer)]);
  assert.ok(screen().getByText("Book only"));
  assert.ok(screen().getByText("35,000 KRW"));
  assert.equal(screen().queryByRole("link", { name: "Continue to checkout" }) === null, true, "no checkout while the cart state does not allow it");
  assert.equal(JSON.stringify(column.reported.at(-1)), JSON.stringify({ p1: 1 }));
});

test("signed out, the column asks to sign in to save (no checkout), and × removes the browser's line", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "p1", quantity: 1 }]);
  let asked = 0;
  render([membershipCartProduct(offer)], { signedIn: false, onSignIn: () => { asked += 1; } });
  assert.equal(screen().queryByRole("button", { name: "Continue to checkout" }) === null, true);
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Sign in to save your cart" }));
  assert.equal(asked, 1);
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Remove Book only" }));
  assert.ok(await screen().findByText("Your cart is empty"));
});

test("an edition line points to its own page and offers no checkout", () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }]);
  render([edition], { signedIn: false });
  assert.equal(screen().getByRole("link", { name: "Buy on its page" }).getAttribute("href"), "/shop/products/edition-one");
  assert.equal(screen().queryByRole("button", { name: "Continue to checkout" }) === null, true);
});

test("while the account's cart loads, a line kept on this browser shows and its × removes only that line", async () => {
  // A same-member retained line (the record pinned to u1), and the account's cart still loading.
  env.dom.window.localStorage.setItem("sphmrs.cart.v2", JSON.stringify({ generation: crypto.randomUUID(), owner: "u1",
    lines: [{ productID: "e1", quantity: 1, intent: crypto.randomUUID() }] }));
  env.ecommerce.setFakeEcommerce({ user: member, cart: undefined, isLoading: true });
  render([edition]);
  assert.ok(screen().getByText("Loading your cart"));
  const local = screen().getByRole("region", { name: "Only on this browser" });
  env.ui.fireEvent.click(env.ui.within(local).getByRole("button", { name: "Remove Edition one" }));
  await env.ui.waitFor(() => assert.equal(screen().queryByRole("region", { name: "Only on this browser" }) === null, true));
  assert.equal(JSON.parse(env.dom.window.localStorage.getItem("sphmrs.cart.v2") ?? "{\"lines\":[]}").lines?.length ?? 0, 0);
  assert.ok(screen().getByText("Loading your cart"), "the account's cart is still loading");
});

test("empty: one line and the way back to the shelf closes the cart", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: undefined });
  const column = render([membershipCartProduct(offer)]);
  assert.ok(screen().getByText("Your cart is empty"));
  // The column has its own way back too (desktop); the empty cart offers one under its line.
  env.ui.fireEvent.click(env.ui.within(env.dom.window.document.querySelector("aside") as HTMLElement).getByRole("button", { name: "All products" }));
  assert.equal(column.closed >= 1, true);
});

test("Refresh shows whenever the member's cart exists: with lines, and on an empty saved cart", () => {
  let refreshed = 0;
  env.ecommerce.setFakeEcommerce({ user: member, cart: { id: "c1", status: "active", items: [{ id: "i1", product: "p1", quantity: 1 }] }, refreshCart: async () => { refreshed += 1; } });
  render([membershipCartProduct(offer)]);
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Refresh cart" }));
  assert.equal(refreshed, 1);
  env.ui.cleanup();
  env.ecommerce.setFakeEcommerce({ user: member, cart: { id: "c1", status: "active", items: [] } });
  render([membershipCartProduct(offer)]);
  assert.ok(screen().getByText("Your cart is empty"));
  assert.ok(screen().getByRole("button", { name: "Refresh cart" }));
});

test("a removal the cart doesn't confirm says so, and Refresh is there to check", async () => {
  let refreshed = 0;
  env.ecommerce.setFakeEcommerce({ user: member, cart: { id: "c1", status: "active", items: [{ id: "i1", product: "p1", quantity: 1 }] },
    removeItem: async () => {}, refreshCart: async () => { refreshed += 1; } });
  render([membershipCartProduct(offer)]);
  await env.ui.act(async () => { env.ui.fireEvent.click(screen().getByRole("button", { name: "Remove Book only" })); });
  assert.ok(screen().getByText("We couldn't confirm removal. Refresh the cart to check its current contents."));
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Refresh cart" }));
  assert.equal(refreshed, 1);
});

test("focus moves into the cart column when it takes input", () => {
  env.ecommerce.setFakeEcommerce({ user: member, cart: undefined });
  render([membershipCartProduct(offer)]);
  assert.equal(env.dom.window.document.activeElement === env.dom.window.document.querySelector("aside"), true);
});

test("a saved edition the page didn't load is named and priced on demand, with its subtotal, and links to checkout", async () => {
  // Owner launch gap, 28 Nov: the cart said "Saved item 1". The resolver (resolveCartEditions, via loadCartProps) names it.
  env.ecommerce.setFakeEcommerce({ user: member, cart: { id: "c1", status: "active", customer: "u1", items: [{ id: "i1", product: "e1", quantity: 1 }] } });
  const asked: string[][] = [];
  env.ui.render(<MemberAuthProviders><CartColumn open shown back="All products" onBack={() => undefined} onLines={() => undefined} onConceal={() => undefined}>
    <ShopCartLines products={[]} signedIn resolveProducts={async (ids) => { asked.push(ids); return [edition]; }} editionCheckoutHref="/shop/checkout" />
  </CartColumn></MemberAuthProviders>);
  assert.ok(await screen().findByText("Edition one"));
  assert.deepEqual(asked, [["e1"]]);
  assert.ok(screen().getByText("Shipping is added at checkout."));
  assert.equal(screen().getByRole("link", { name: /checkout/i }).getAttribute("href"), "/shop/checkout");
  assert.equal(screen().queryByText("We can't quote this cart from the current release. Visit the shop to review your selection and pricing before payment.") === null, true);
});

test("guarded: leaving the page hides the panel and the stack in the same task, and the same member gets both back", async () => {
  const { column, reloads, panel } = renderGuarded(async () => "u1");
  assert.equal(JSON.stringify(column.reported.at(-1)), JSON.stringify({ p1: 1 }));
  env.dom.window.dispatchEvent(new env.dom.window.Event("pagehide"));
  await Promise.resolve(); // the observer's microtask, before any paint
  assert.equal(panel().hasAttribute("data-concealed"), true);
  assert.equal(column.concealed.at(-1), true);
  assert.equal(column.reported.at(-1), null);
  env.dom.window.dispatchEvent(new env.dom.window.Event("focus"));
  await microtask(); await microtask();
  assert.equal(panel().hasAttribute("data-concealed"), false);
  assert.equal(column.concealed.at(-1), false);
  assert.equal(JSON.stringify(column.reported.at(-1)), JSON.stringify({ p1: 1 }));
  assert.equal(reloads.count, 0);
});

test("guarded: lines that change while concealed stay withdrawn, and the reveal reports the committed lines", async () => {
  // Review-B, 28 Nov: the guard's reveal publishes what the last commit shows, not a render's values.
  const column = { reported: [] as unknown[], concealed: [] as boolean[] };
  env.ecommerce.setFakeEcommerce({ user: member, cart: { id: "c1", status: "active", items: [{ id: "i1", product: "p1", quantity: 1 }] } });
  env.ui.render(<MemberAuthProviders><CartColumn open shown back="All products" onBack={() => undefined}
    onLines={(lines) => { column.reported.push(lines); }} onConceal={(hidden) => { column.concealed.push(hidden); }}>
    <PrivatePageGuard principal="u1" readPrincipal={async () => "u1"} reload={() => undefined}>
      <ShopCartLines products={[membershipCartProduct(offer), edition]} signedIn />
    </PrivatePageGuard>
  </CartColumn></MemberAuthProviders>);
  assert.equal(JSON.stringify(column.reported.at(-1)), JSON.stringify({ p1: 1 }));
  env.dom.window.dispatchEvent(new env.dom.window.Event("pagehide"));
  await Promise.resolve();
  assert.equal(column.concealed.at(-1), true);
  env.ui.act(() => { env.ecommerce.setFakeEcommerce({ cart: { id: "c1", status: "active",
    items: [{ id: "i1", product: "p1", quantity: 1 }, { id: "i2", product: "e1", quantity: 1 }] } }); });
  assert.equal(column.reported.at(-1), null, "nothing is published while concealed");
  env.dom.window.dispatchEvent(new env.dom.window.Event("focus"));
  await microtask(); await microtask();
  assert.equal(column.concealed.at(-1), false);
  assert.equal(JSON.stringify(column.reported.at(-1)), JSON.stringify({ p1: 1, e1: 1 }));
});

for (const [name, who] of [["account switch", "u2"], ["sign-out", null]] as const) {
  test(`guarded ${name}: the stack stays hidden and empty, never shown again, and the page reloads`, async () => {
    const { column, reloads, panel } = renderGuarded(async () => who);
    env.dom.window.dispatchEvent(new env.dom.window.Event("pagehide"));
    await Promise.resolve();
    env.dom.window.dispatchEvent(new env.dom.window.Event("focus"));
    await microtask(); await microtask();
    assert.equal(reloads.count, 1);
    assert.equal(panel().hasAttribute("data-concealed"), true);
    assert.equal(column.concealed.at(-1), true);
    assert.equal(column.concealed.includes(false), false, "never revealed after concealment");
    assert.equal(column.reported.at(-1), null);
  });
}

test("guarded restored frame (back-forward cache): concealed from pagehide through the restore, then reloaded", async () => {
  const { column, reloads, panel } = renderGuarded(async () => "u1");
  env.dom.window.dispatchEvent(new env.dom.window.Event("pagehide"));
  await Promise.resolve();
  const restored = new env.dom.window.Event("pageshow") as Event & { persisted?: boolean };
  Object.defineProperty(restored, "persisted", { value: true });
  env.dom.window.dispatchEvent(restored);
  await microtask();
  assert.equal(reloads.count, 1);
  assert.equal(panel().hasAttribute("data-concealed"), true);
  assert.equal(column.concealed.at(-1), true);
  assert.equal(column.reported.at(-1), null);
});
