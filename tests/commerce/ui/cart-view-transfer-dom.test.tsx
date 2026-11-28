import { seedCart } from "../../fixtures/commerce/cart-locks";
import { MemberAuthProviders } from "../../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";
import { CART_EXPECTED_MEMBER_HEADER, cartRefusalMessage } from "../../../src/lib/commerce/cart-refusal";
import { listGuestCart, readGuestCartCount, readGuestCartIntentKey } from "../../../src/lib/commerce/browser-cart";
import { signOutAndLeave } from "../../../src/lib/member-auth/browser-copies";

// Auth-editions HOLD, 27 Nov: the browser cart's transfer after sign-in, seen through the cart page itself (CartView):
// a refused line and a line added while its write was acknowledged stay on this browser with a same-member Try again,
// and nothing moves into an account that replaced the one the transfer began with.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let CartView: typeof import("../../../src/app/(site)/shop/cart/cart-view").CartView;
let addGuestCartLine: typeof import("../../../src/lib/commerce/browser-cart").addGuestCartLine;
const KEY = "sphmrs.cart.v2";
const realFetch = globalThis.fetch;
const capabilities = { apple: false, kakao: false, emailOtp: true, magicLink: true, google: false, passkey: true };

before(async () => {
  env = await setupCartDom();
  CartView = (await import("../../../src/app/(site)/shop/cart/cart-view")).CartView;
  addGuestCartLine = (await import("../../../src/lib/commerce/browser-cart")).addGuestCartLine;
});
afterEach(() => {
  env.ui.cleanup(); env.ecommerce.resetFakeEcommerce(); env.dom.window.localStorage.clear(); globalThis.fetch = realFetch;
});
after(async () => { await env.restore(); });

/** The server, one scripted reply per request, in order; every request is recorded. */
function server(...replies: Array<() => Response | Promise<Response>>) {
  const calls: { url: string; method: string; member: string | null; body: unknown }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", member: new Headers(init?.headers).get(CART_EXPECTED_MEMBER_HEADER),
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
const tryAgain = () => screen().queryByRole("button", { name: "Try again" });

function renderSignedIn(memberID = "u1") {
  env.ecommerce.setFakeEcommerce({ user: { id: memberID, cart: { docs: [] } }, cart: undefined });
  return env.ui.render(<MemberAuthProviders><CartView products={[]} signedIn initialCapabilities={capabilities} signInOffInReview={false}
    copy={{ title: "Cart", signInTitle: "Sign in", backToCart: "Back to cart" }} /></MemberAuthProviders>);
}

test("a refused line stays on this browser, and the same member's Try again sends only what is left", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }, { productID: "e2", quantity: 1 }]);
  const api = server(me("u1"), ack("e1"), refused("membership-in-cart"));
  renderSignedIn();
  assert.ok(await screen().findByText("Your cart can hold only one edition that includes membership."));
  assert.deepEqual(stored(), ["e2"], "the acknowledged line left the browser; the refused one stayed");
  assert.ok(screen().getByRole("region", { name: "Only on this browser" }));
  assert.deepEqual(api.calls.map((call) => call.member), [null, "u1", "u1"], "every write is pinned to the member");
  api.more(me("u1", ["c1"]), ack("e2"));
  env.ui.fireEvent.click(tryAgain()!);
  await env.ui.waitFor(() => assert.deepEqual(stored(), []));
  assert.deepEqual(api.calls.slice(3).map((call) => [call.method, call.member, call.body]),
    [["GET", null, undefined], ["PATCH", "u1", { items: [{ product: "e2", quantity: 1 }] }]], "the retry sent only the line left");
  await env.ui.waitFor(() => assert.equal(screen().queryByRole("region", { name: "Only on this browser" }) === null, true));
});

test("while the transfer runs, the browser's lines say they're being added, and stay removable", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }]);
  let answer: (response: Response) => void = () => {};
  server(me("u1"), () => new Promise<Response>((resolve) => { answer = resolve; }));
  renderSignedIn();
  assert.ok(await screen().findByText("Adding these to your account."));
  assert.equal(screen().queryByText("These weren't added to your account's cart.") === null, true, "no failure is claimed while it runs");
  assert.ok(screen().getByRole("button", { name: /^Remove / }));
  answer(ack("e1")());
  await env.ui.waitFor(() => assert.deepEqual(stored(), []));
});

test("a quantity changed while its write was acknowledged is retried by the same member with the new quantity", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }]);
  const api = server(me("u1"), async () => { await addGuestCartLine("e1", undefined, { quantity: 2, memberID: "u1" }); return ack("e1")(); });
  renderSignedIn();
  const retry = await screen().findByRole("button", { name: "Try again" });
  assert.deepEqual(lines(), [{ productID: "e1", quantity: 2 }], "the acknowledgement of 1 left the edited line");
  api.more(me("u1", ["c1"]), ack("e1", 2));
  env.ui.fireEvent.click(retry);
  await env.ui.waitFor(() => assert.deepEqual(stored(), []));
  assert.deepEqual(api.calls.slice(2).map((call) => [call.method, call.member, call.body]),
    [["GET", null, undefined], ["PATCH", "u1", { items: [{ product: "e1", quantity: 2 }] }]]);
});

test("a line added while the transfer was acknowledged gets a same-member Try again; after an account switch, nothing is sent", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }]);
  const api = server(me("u1"), async () => { await addGuestCartLine("e3", undefined, { memberID: "u1" }); return ack("e1")(); });
  renderSignedIn();
  assert.ok(await screen().findByRole("button", { name: "Try again" }), "the late line can be retried by the member who signed in");
  assert.deepEqual(stored(), ["e3"]);
  const sent = api.calls.length;
  env.ui.act(() => env.ecommerce.setFakeEcommerce({ user: { id: "u2", cart: { docs: [] } } }));
  assert.equal(screen().queryByText("The signed-in account changed. We stopped adding items.") === null, true);
  assert.equal(screen().queryByRole("region", { name: "Only on this browser" }) === null, true);
  assert.equal(tryAgain() === null, true, "no retry into a different account");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(api.calls.length, sent, "the switched account got no request");
  assert.deepEqual(stored(), ["e3"], "the line stays on this browser");
});

test("a retained line cannot transfer to a different member after remount, but its original member can resume", async () => {
  await addGuestCartLine("e1");
  const api = server(me("u1"), refused("offer-unavailable"));
  const original = renderSignedIn();
  await screen().findByText("That item isn't on sale now, so it wasn't added.");
  original.unmount();

  const sent = api.calls.length;
  const different = renderSignedIn("u2");
  await screen().findByText("Your cart is empty");
  assert.equal(screen().queryByRole("region", { name: "Only on this browser" }) === null, true);
  assert.equal(api.calls.length, sent, "no cart lookup or write for the different member");
  assert.equal(tryAgain() === null, true);
  assert.deepEqual(stored(), ["e1"]);
  different.unmount();

  api.more(me("u1"), ack("e1"));
  renderSignedIn();
  await env.ui.waitFor(() => assert.deepEqual(stored(), []));
  assert.deepEqual(api.calls.slice(sent).map(({ method, member }) => [method, member]), [["GET", null], ["POST", "u1"]]);
});

for (const lockFailure of ["missing", "rejected"] as const) {
  test(`confirmed sign-out completes and leaves no cart projections for another viewer when locks are ${lockFailure}`, async () => {
    await addGuestCartLine("e1");
    const api = server(me("u1"), refused("membership-in-cart"));
    const memberView = renderSignedIn();
    await screen().findByRole("button", { name: "Try again" });
    assert.equal(readGuestCartCount(undefined, "u1"), 1);
    assert.notEqual(readGuestCartIntentKey("u1"), "[]");
    const sent = api.calls.length;
    const savedLocks = Object.getOwnPropertyDescriptor(navigator, "locks")!;
    Object.defineProperty(navigator, "locks", {
      configurable: true,
      value: lockFailure === "missing" ? undefined : { request: async () => { throw new Error("denied"); } },
    });
    try {
      const navigations: string[] = [];
      assert.equal(await signOutAndLeave(async () => ({ data: { success: true } }), (url) => navigations.push(url)), true);
      assert.deepEqual(navigations, ["/"]);
      assert.deepEqual(stored(), ["e1"], "sign-out does not bypass the durable mutation lock");

      await env.ui.waitFor(() => assert.equal(tryAgain() === null, true));
      assert.equal(readGuestCartCount(undefined, "u1"), 0, "even a stale provider loses the revoked generation");
      assert.equal(screen().queryByRole("region", { name: "Only on this browser" }) === null, true);
      memberView.unmount();

      const guest = env.ui.render(<MemberAuthProviders><CartView products={[]} signedIn={false} initialCapabilities={capabilities}
        signInOffInReview={false} copy={{ title: "Cart", signInTitle: "Sign in", backToCart: "Back to cart" }} /></MemberAuthProviders>);
      await screen().findByText("Your cart is empty");
      assert.deepEqual(listGuestCart(), []);
      assert.equal(readGuestCartCount(), 0);
      assert.equal(readGuestCartIntentKey(), "[]");
      guest.unmount();

      renderSignedIn("u2");
      await screen().findByText("Your cart is empty");
      assert.deepEqual(listGuestCart(undefined, "u2"), []);
      assert.equal(readGuestCartCount(undefined, "u2"), 0);
      assert.equal(readGuestCartIntentKey("u2"), "[]");
      assert.equal(tryAgain() === null, true);
      assert.equal(screen().queryByText("The signed-in account changed. We stopped adding items.") === null, true);
      assert.equal(api.calls.length, sent);
    } finally { Object.defineProperty(navigator, "locks", savedLocks); }
  });
}

test("a sign-out storage event conceals retained items and transfer feedback in another open cart", async () => {
  await addGuestCartLine("e1");
  server(me("u1"), refused("membership-in-cart"));
  renderSignedIn();
  await screen().findByRole("button", { name: "Try again" });
  const { localStorage, StorageEvent } = env.dom.window;
  const { generation } = JSON.parse(localStorage.getItem(KEY)!);
  // Model a different tab writing only the revocation marker.
  const key = "sphmrs.cart.revoked." + generation;
  localStorage.setItem(key, "1");
  env.ui.act(() => env.dom.window.dispatchEvent(new StorageEvent("storage", { key, newValue: "1" })));
  assert.equal(tryAgain() === null, true);
  assert.equal(screen().queryByRole("region", { name: "Only on this browser" }) === null, true);
  assert.equal(readGuestCartCount(undefined, "u1"), 0);
  assert.deepEqual(stored(), ["e1"]);
});

for (const when of ["before acknowledgement", "after refusal"] as const) {
  test(`a change to the sole refused line's quantity ${when} enables retry`, async () => {
    await addGuestCartLine("e1", undefined, { quantity: 3 });
    const edit = () => addGuestCartLine("e1", undefined, { quantity: 2, memberID: "u1" });
    const api = server(me("u1"), async () => {
      if (when === "before acknowledgement") await edit();
      return refused("offer-unavailable")();
    });
    renderSignedIn();
    await screen().findByText("That item isn't on sale now, so it wasn't added.");
    if (when === "after refusal") {
      assert.equal(tryAgain() === null, true, "unchanged unavailable intent is not automatically retryable");
      await env.ui.act(async () => { await edit(); });
    }
    api.more(me("u1"), ack("e1", 2));
    env.ui.fireEvent.click(await screen().findByRole("button", { name: "Try again" }));
    await env.ui.waitFor(() => assert.deepEqual(stored(), []));
    assert.deepEqual(api.calls.at(-1)?.body, { currency: "KRW", items: [{ product: "e1", quantity: 2 }] });
  });
}
