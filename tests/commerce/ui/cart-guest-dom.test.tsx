import { MemberAuthProviders } from "../../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { JSDOM } from "jsdom";
import type { CommerceOffer } from "../../../src/lib/commerce/catalogue";
import { membershipCartProduct } from "../../../src/lib/commerce/cart-products";

// Signed out, /shop/cart shows the browser cart's line (Auth's browser-cart contract) and Checkout asks for sign-in.
let dom: JSDOM;
let ui: typeof import("@testing-library/react/pure");
let CommerceCart: typeof import("../../../src/components/commerce/cart").CommerceCart;
let CommerceProvider: typeof import("../../../src/components/commerce/checkout").CommerceProvider;
const previous = new Map<string, PropertyDescriptor | undefined>();
const offer = { productID: "p1", title: "Book only", description: "", images: [], priceKRW: 35000, maximumQuantity: 1,
  shippingFeeKRW: 3000, availableQuantity: 5 } as unknown as CommerceOffer;

before(async () => {
  dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "http://localhost/shop/cart", pretendToBeVisual: true });
  for (const key of ["window", "self", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Element", "Node", "MutationObserver", "Event", "KeyboardEvent", "StorageEvent", "getComputedStyle", "history", "location", "localStorage", "customElements", "fetch", "IS_REACT_ACT_ENVIRONMENT"]) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    const value = key === "window" || key === "self" ? dom.window
      : key === "fetch" ? async () => new Response(JSON.stringify({ user: null }), { status: 200, headers: { "Content-Type": "application/json" } })
      : key === "IS_REACT_ACT_ENVIRONMENT" ? true
      : dom.window[key as keyof typeof dom.window];
    Object.defineProperty(globalThis, key, { value: key === "getComputedStyle" && typeof value === "function" ? value.bind(dom.window) : value, configurable: true, writable: true });
  }
  Object.defineProperty(dom.window, "matchMedia", { configurable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
  ui = await import("@testing-library/react/pure");
  ui.configure({ getElementError: (message) => new Error(message ?? "Element not found") });
  CommerceCart = (await import("../../../src/components/commerce/cart")).CommerceCart;
  CommerceProvider = (await import("../../../src/components/commerce/checkout")).CommerceProvider;
});
// The provider reads the member on mount; let that settle before unmounting and restoring the globals.
afterEach(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); ui.cleanup(); dom.window.localStorage.clear(); });
after(async () => {
  await new Promise((resolve) => setTimeout(resolve, 50));
  dom.window.close();
  for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
});

test("signed out: the browser cart's line shows, Checkout asks for sign-in, and Remove empties it", async () => {
  dom.window.localStorage.setItem("sphmrs.cart.v1", JSON.stringify({ version: 1, lines: [{ productID: "p1", quantity: 1 }] }));
  let signIn = 0;
  ui.render(<MemberAuthProviders><CommerceProvider>
    <CommerceCart products={[membershipCartProduct(offer)]} wide signedIn={false} onSignIn={() => { signIn += 1; }} />
  </CommerceProvider></MemberAuthProviders>);
  assert.ok(ui.screen.getByRole("heading", { name: "Book only" }));
  ui.fireEvent.click(ui.screen.getByRole("button", { name: /checkout/i }));
  assert.equal(signIn, 1);
  ui.fireEvent.click(ui.screen.getByRole("button", { name: /Remove Book only/ }));
  await ui.waitFor(() => assert.ok(ui.screen.getByText("Your cart is empty")));
  assert.equal(dom.window.localStorage.getItem("sphmrs.cart.v1") === null, true);
});

test("signed out with no browser line: the empty state, never a loading line", () => {
  ui.render(<MemberAuthProviders><CommerceProvider>
    <CommerceCart products={[membershipCartProduct(offer)]} wide signedIn={false} onSignIn={() => {}} />
  </CommerceProvider></MemberAuthProviders>);
  assert.ok(ui.screen.getByText("Your cart is empty"));
  assert.equal(ui.screen.queryByText("Loading your cart") === null, true);
});
