import { MemberAuthProviders } from "../../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { seedCart } from "../../fixtures/commerce/cart-locks";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";
import { CART_EXPECTED_MEMBER_HEADER, cartRefusalMessage } from "../../../src/lib/commerce/cart-refusal";

// The shop's cart column after sign-in (Auth-editions, 28 Nov, for the cart survivor): does it work? The lines that stay
// on this browser show in the column under their own heading with their own ×, say when they're being added, and the
// same-member retry (CartContents' GuestCartWriteThrough) never sends to an account that replaced the first.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let ShopCartPanel: typeof import("../../../src/app/(site)/shop/cart/shop-cart-panel").ShopCartPanel;
let addGuestCartLine: typeof import("../../../src/lib/commerce/browser-cart").addGuestCartLine;
const KEY = "sphmrs.cart.v2";
const realFetch = globalThis.fetch;
const capabilities = { apple: false, kakao: false, emailOtp: true, magicLink: true, google: false, passkey: true };

before(async () => {
  env = await setupCartDom();
  ShopCartPanel = (await import("../../../src/app/(site)/shop/cart/shop-cart-panel")).ShopCartPanel;
  addGuestCartLine = (await import("../../../src/lib/commerce/browser-cart")).addGuestCartLine;
});
afterEach(() => {
  env.ui.cleanup(); env.ecommerce.resetFakeEcommerce(); env.dom.window.localStorage.clear(); globalThis.fetch = realFetch;
});
after(async () => { await env.restore(); });

/** The server, one scripted reply per request, in order; every request is recorded. */
function server(...replies: Array<() => Response | Promise<Response>>) {
  const calls: { method: string; member: string | null; body: unknown }[] = [];
  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    calls.push({ method: init?.method ?? "GET", member: new Headers(init?.headers).get(CART_EXPECTED_MEMBER_HEADER),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    const next = replies.shift();
    return next ? next() : Response.json({}, { status: 500 });
  }) as typeof fetch;
  return { calls, more: (...next: Array<() => Response | Promise<Response>>) => { replies.push(...next); } };
}
const me = (id: string, carts: string[] = []) => () => Response.json({ user: { id, cart: { docs: carts } } });
const ack = (product: string, quantity = 1) => () =>
  Response.json({ doc: { id: "c1", customer: { id: "u1" }, items: [{ product: { id: product }, quantity }] } });
const refused = (reason: Parameters<typeof cartRefusalMessage>[0]) => () =>
  Response.json({ errors: [{ message: cartRefusalMessage(reason) }] }, { status: 409 });
const lines = (): { productID: string; quantity: number }[] =>
  ((JSON.parse(env.dom.window.localStorage.getItem(KEY) ?? "{}").lines ?? []) as { productID: string; quantity: number }[])
    .map(({ productID, quantity }) => ({ productID, quantity }));
const stored = () => lines().map((line) => line.productID);
const screen = () => env.ui.screen;
const local = () => screen().queryByRole("region", { name: "Only on this browser" });
const tryAgain = () => screen().queryByRole("button", { name: "Try again" });

function renderPanel(memberID = "u1") {
  env.ecommerce.setFakeEcommerce({ user: { id: memberID, cart: { docs: [] } }, cart: undefined });
  return env.ui.render(<MemberAuthProviders><ShopCartPanel products={[]} signedIn initialCapabilities={capabilities}
    signInOffInReview={false} copy={{ title: "Cart", signInTitle: "Sign in", backToCart: "Back to cart" }} /></MemberAuthProviders>);
}

test("in the shop's column, a refused line stays under 'Only on this browser', and its × removes only the browser's line", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }, { productID: "e2", quantity: 1 }]);
  const api = server(me("u1"), ack("e1"), refused("membership-in-cart"));
  renderPanel();
  assert.ok(await screen().findByText("Your cart can hold only one edition that includes membership."));
  assert.deepEqual(stored(), ["e2"]);
  assert.equal(local() !== null, true, "the column shows the retained section");
  assert.ok(screen().getByText("These weren't added to your account's cart."));
  const sent = api.calls.length;
  env.ui.fireEvent.click(env.ui.within(local()!).getByRole("button", { name: /^Remove / }));
  await env.ui.waitFor(() => assert.deepEqual(stored(), []));
  assert.equal(api.calls.length, sent, "removing the browser's line sends nothing to the account");
  await env.ui.waitFor(() => assert.equal(local() === null, true));
});

test("while the transfer runs, the column's browser lines say they're being added, and stay removable", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }]);
  let answer: (response: Response) => void = () => {};
  server(me("u1"), () => new Promise<Response>((resolve) => { answer = resolve; }));
  renderPanel();
  assert.ok(await screen().findByText("Adding these to your account."));
  assert.equal(screen().queryByText("These weren't added to your account's cart.") === null, true);
  assert.ok(env.ui.within(local()!).getByRole("button", { name: /^Remove / }));
  answer(ack("e1")());
  await env.ui.waitFor(() => assert.deepEqual(stored(), []));
});

test("a quantity edited while its write was acknowledged is retried from the column with the new quantity", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }]);
  const api = server(me("u1"), async () => { await addGuestCartLine("e1", undefined, { quantity: 2, memberID: "u1" }); return ack("e1")(); });
  renderPanel();
  const retry = await screen().findByRole("button", { name: "Try again" });
  assert.deepEqual(lines(), [{ productID: "e1", quantity: 2 }]);
  assert.equal(local() !== null, true);
  api.more(me("u1", ["c1"]), ack("e1", 2));
  env.ui.fireEvent.click(retry);
  await env.ui.waitFor(() => assert.deepEqual(stored(), []));
  assert.deepEqual(api.calls.slice(2).map((call) => [call.method, call.member, call.body]),
    [["GET", null, undefined], ["PATCH", "u1", { items: [{ product: "e1", quantity: 2 }] }]]);
});

test("a line added during the transfer shows in the column with a retry; after an account switch it hides and nothing is sent", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }]);
  const api = server(me("u1"), async () => { await addGuestCartLine("e3", undefined, { memberID: "u1" }); return ack("e1")(); });
  renderPanel();
  assert.ok(await screen().findByRole("button", { name: "Try again" }));
  assert.deepEqual(stored(), ["e3"]);
  assert.equal(local() !== null, true);
  const sent = api.calls.length;
  env.ui.act(() => env.ecommerce.setFakeEcommerce({ user: { id: "u2", cart: { docs: [] } } }));
  assert.equal(local() === null, true, "another member never sees the first member's browser lines");
  assert.equal(tryAgain() === null, true);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(api.calls.length, sent, "the switched account got no request");
  assert.deepEqual(stored(), ["e3"]);
});
