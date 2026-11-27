import { MemberAuthProviders } from "../../member-auth/fixtures/providers";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import { setupCartDom } from "../../fixtures/commerce/cart-dom";
import { seedCart } from "../../fixtures/commerce/cart-locks";
import { readProductPageContent } from "../../../src/components/commerce/product-page/_shared/content";
import { GUEST_CART_STORAGE_KEY } from "../../../src/lib/commerce/browser-cart";

// The edition's add row in the shop's details (Hamlet, 27 Nov; owner: editions go in the cart): does it work? A press
// adds the book to the browser cart through Auth's exports and the row says it's in the cart; × takes it out again.
// Review-B HOLD on 0336e57b (Auth-editions' boundary): the row works in the shop viewer's scope, verified before each
// change; the book flies only on a confirmed add for the viewer still looking; a refusal says so, without the fly.
let env: Awaited<ReturnType<typeof setupCartDom>>;
let DetailPanel: typeof import("../../../src/components/commerce/shop/detail-panel").DetailPanel;
let CartFlyContext: typeof import("../../../src/components/commerce/shop/cart-fly").CartFlyContext;
type Props = Parameters<typeof DetailPanel>[0];
const product = { productID: "e1", title: "Edition one", description: "" } as unknown as Props["product"];
const offer = { priceKRW: 82000, maximumQuantity: 1,
  editionEntitlements: { membershipSignet: false, refundable: true } } as unknown as Props["offer"];
const realFetch = globalThis.fetch;

before(async () => {
  env = await setupCartDom();
  DetailPanel = (await import("../../../src/components/commerce/shop/detail-panel")).DetailPanel;
  CartFlyContext = (await import("../../../src/components/commerce/shop/cart-fly")).CartFlyContext;
});
afterEach(() => { env.ui.cleanup(); env.dom.window.localStorage.clear(); globalThis.fetch = realFetch; });
after(async () => { await env.restore(); });

type StoredCart = { owner?: string; lines: { productID: string; quantity: number }[] };
const stored = () => JSON.parse(env.dom.window.localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? "null") as StoredCart | null;
const ids = () => (stored()?.lines ?? []).map((line) => line.productID).sort();
/** A record pinned to a member, as Auth's transfer leaves it. */
const pinned = (owner: string, productIDs: string[]) => env.dom.window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify({
  generation: crypto.randomUUID(), owner, lines: productIDs.map((productID) => ({ productID, quantity: 1, intent: crypto.randomUUID() })) }));
/** Who /api/users/me says is signed in, one answer per read (the last repeats). */
function viewers(...answers: Array<string | null | (() => Promise<string | null>)>) {
  const served: (string | null)[] = [];
  globalThis.fetch = (async () => {
    const next = answers.length > 1 ? answers.shift()! : answers[0];
    const id = typeof next === "function" ? await next() : next;
    served.push(id);
    return Response.json({ user: id === null ? null : { id } });
  }) as typeof fetch;
  return served;
}
function render(flown: string[] = []) {
  env.ui.render(<MemberAuthProviders><CartFlyContext value={(id) => { flown.push(id); }}>
    <DetailPanel product={product} offer={offer} content={readProductPageContent(undefined)} />
  </CartFlyContext></MemberAuthProviders>);
  return flown;
}
const screen = () => env.ui.screen;
const add = () => screen().getByRole("button", { name: /Add to cart/ });
const ready = () => env.ui.waitFor(() => assert.equal((add() as HTMLButtonElement).disabled, false));

test("signed out, Add to cart puts the edition in the cart, the book flies after the add, and × takes it out", async () => {
  viewers(null);
  const flown = render();
  await ready();
  env.ui.fireEvent.click(add());
  assert.ok(await screen().findByText("In your cart"));
  assert.deepEqual(ids(), ["e1"]);
  assert.deepEqual(flown, ["e1"], "the fly follows the confirmed add");
  env.ui.fireEvent.click(screen().getByRole("button", { name: "Remove Edition one from your cart" }));
  await env.ui.waitFor(() => assert.deepEqual(ids(), []));
  assert.ok(await screen().findByRole("button", { name: /Add to cart/ }));
});

test("while the viewer is still being checked, the row shows no selection and changes nothing", async () => {
  seedCart(env.dom.window.localStorage, [{ productID: "e1", quantity: 1 }]);
  let answer: (id: string | null) => void = () => {};
  viewers(() => new Promise((resolve) => { answer = resolve; }));
  const flown = render();
  assert.equal(screen().queryByText("In your cart") === null, true, "no selection before the viewer is known");
  assert.equal((add() as HTMLButtonElement).disabled, true);
  env.ui.fireEvent.click(add());
  assert.deepEqual(flown, []);
  answer(null);
  assert.ok(await screen().findByText("In your cart"));
});

test("a member adds to their own pinned record: the line joins it and the pin stays", async () => {
  pinned("u1", ["e2"]);
  viewers("u1");
  const flown = render();
  await ready();
  env.ui.fireEvent.click(add());
  assert.ok(await screen().findByText("In your cart"));
  assert.deepEqual(ids(), ["e1", "e2"]);
  assert.equal(stored()?.owner, "u1");
  assert.deepEqual(flown, ["e1"]);
});

test("another member's pinned record refuses the add: it says so in place, with no fly and no change", async () => {
  pinned("u2", ["e2"]);
  viewers("u1");
  const flown = render();
  await ready();
  assert.equal(screen().queryByText("In your cart") === null, true, "u2's lines are not u1's to see");
  env.ui.fireEvent.click(add());
  assert.ok(await screen().findByText("We couldn't add it to your cart."));
  assert.deepEqual(flown, []);
  assert.deepEqual(ids(), ["e2"]);
  assert.equal(stored()?.owner, "u2");
});

test("a focus recheck hides the member's selection until the server answers again", async () => {
  pinned("u1", ["e1"]);
  let answer: (id: string | null) => void = () => {};
  viewers("u1", () => new Promise((resolve) => { answer = resolve; }));
  render();
  assert.ok(await screen().findByText("In your cart"));
  env.ui.act(() => { env.dom.window.dispatchEvent(new env.dom.window.FocusEvent("focus")); });
  assert.equal(screen().queryByText("In your cart") === null, true, "nothing scoped to the previous answer stays shown");
  assert.equal((add() as HTMLButtonElement).disabled, true);
  answer("u1");
  assert.ok(await screen().findByText("In your cart"));
});

/**
 * Queue an add behind a held cart lock, then recheck the viewer (a focus) to `next`, and only after that answer release
 * the lock. Whatever `next` is, the queued add is retired: it writes nothing, and nothing flies or is reported.
 */
async function queuedAddThenRecheck(next: string) {
  pinned("u1", ["e2"]);
  viewers("u1");
  const flown = render();
  await ready();
  const saved = Object.getOwnPropertyDescriptor(navigator, "locks")!;
  let requested = false, release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  Object.defineProperty(navigator, "locks", { configurable: true,
    value: { request: async (_name: string, _options: unknown, work: () => unknown) => { requested = true; await gate; return work(); } } });
  try {
    env.ui.fireEvent.click(add());
    await env.ui.waitFor(() => assert.equal(requested, true), { timeout: 1000 });
    const served = viewers(next);
    env.ui.act(() => { env.dom.window.dispatchEvent(new env.dom.window.FocusEvent("focus")); });
    await env.ui.waitFor(() => assert.deepEqual(served, [next]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    release();
    await env.ui.waitFor(() => assert.equal((add() as HTMLButtonElement).disabled, false));
  } finally { Object.defineProperty(navigator, "locks", saved); }
  assert.deepEqual(ids(), ["e2"], "the queued add wrote nothing");
  assert.equal(stored()?.owner, "u1");
  assert.deepEqual(flown, [], "no fly");
  assert.equal(screen().queryByText("We couldn't add it to your cart.") === null, true, "no status");
}

test("an account switch while the add waits for the lock: nothing is written, flown or reported", async () => {
  await queuedAddThenRecheck("u2");
});

test("control: a recheck that lands on the same member still retires the queued add (generation, not just the id)", async () => {
  await queuedAddThenRecheck("u1");
});
