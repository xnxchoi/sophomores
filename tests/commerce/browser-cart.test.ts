import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { installCartLocks } from "../fixtures/commerce/cart-locks";
import {
  addGuestCartLine, clearGuestCart, GUEST_CART_STORAGE_KEY, listGuestCart, readGuestCartCount,
  removeGuestCartLine, subscribeGuestCart, writeThroughGuestCart,
} from "../../src/lib/commerce/browser-cart";
import { CART_EXPECTED_MEMBER_HEADER, CART_MERGE_BROWSER_HEADER, cartRefusalMessage } from "../../src/lib/commerce/cart-refusal";

let restoreLocks: () => void;
before(() => { restoreLocks = installCartLocks(); });
after(() => { restoreLocks(); });

function memoryStorage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); } };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => { resolve = accept; });
  return { promise, resolve };
}

function scriptedServer(...responses: Array<Response | (() => Response | Promise<Response>)>) {
  const calls: { url: string; method: string; headers: Headers; body?: unknown; cache?: RequestCache }[] = [];
  const fetcher = (async (url, init) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", headers: new Headers(init?.headers),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined, cache: init?.cache });
    const next = responses.shift();
    assert.ok(next, "unexpected request");
    return typeof next === "function" ? next() : next;
  }) satisfies typeof fetch;
  return { calls, fetcher };
}
const me = (id = "member", docs: Array<string | { id: string }> = []) => Response.json({ user: { id, cart: { docs } } });
const line = (productID: string, quantity = 1) => ({ productID, quantity });
const ack = (product: string, quantity = 1, customer = "member", id = "cart") =>
  Response.json({ doc: { id, customer: { id: customer }, items: [{ product: { id: product }, quantity }] } });
const refusal = (reason: Parameters<typeof cartRefusalMessage>[0]) =>
  Response.json({ errors: [{ message: cartRefusalMessage(reason) }] }, { status: 409 });

test("browser storage keeps several distinct editions and respects a supplied product cap", async () => {
  const storage = memoryStorage();
  assert.deepEqual(listGuestCart(storage), []);
  await assert.rejects(() => addGuestCartLine("", storage));
  await assert.rejects(() => addGuestCartLine("b", storage, { quantity: 0 }));
  await addGuestCartLine("a", storage);
  await addGuestCartLine("b", storage, { quantity: 5, maximum: null });
  await addGuestCartLine("b", storage);
  await addGuestCartLine("a", storage, { quantity: 3, maximum: 2 });
  assert.deepEqual(listGuestCart(storage), [line("a"), line("b", 5)]);
  assert.equal(await removeGuestCartLine("a", storage), true);
  assert.deepEqual(listGuestCart(storage), [line("b", 5)]);
  await clearGuestCart(storage);
  assert.equal(storage.values.has(GUEST_CART_STORAGE_KEY), false);
});

test("a failed durable edit leaves the previous cart intact and does not notify success", async () => {
  const durable = memoryStorage();
  await addGuestCartLine("a", durable);
  const readOnly = { ...durable, setItem() { throw new Error("quota"); } };
  let notifications = 0;
  const unsubscribe = subscribeGuestCart(() => { notifications++; });
  try {
    assert.equal(await addGuestCartLine("b", readOnly), false);
    assert.deepEqual(listGuestCart(readOnly), [line("a")]);
    assert.equal(notifications, 0);
  } finally { unsubscribe(); }
});

test("an empty browser cart does not read the session", async () => {
  const server = scriptedServer();
  assert.deepEqual(await writeThroughGuestCart({ ...server, memberID: "member", storage: memoryStorage() }), { outcome: "nothing" });
  assert.equal(server.calls.length, 0);
});

test("write-through pins every write, creates once and merges later quantities without sending member rows", async () => {
  const storage = memoryStorage();
  await addGuestCartLine("a", storage);
  await addGuestCartLine("b", storage, { quantity: 4 });
  const server = scriptedServer(me(), ack("a"), ack("b", 4));
  assert.deepEqual(await writeThroughGuestCart({ ...server, storage, memberID: "member" }), { outcome: "written", cartID: "cart" });
  const [identify, create, merge] = server.calls;
  assert.deepEqual(server.calls.map(({ method, cache }) => [method, cache]), [["GET", "no-store"], ["POST", "no-store"], ["PATCH", "no-store"]]);
  assert.equal(identify?.url, "/api/users/me?depth=0&select[id]=true&select[cart]=true");
  assert.equal(create?.url, "/api/carts");
  assert.equal(merge?.url, "/api/carts/cart");
  for (const write of [create, merge]) assert.equal(write?.headers.get(CART_EXPECTED_MEMBER_HEADER), "member");
  assert.equal(create?.headers.get(CART_MERGE_BROWSER_HEADER), null);
  assert.equal(merge?.headers.get(CART_MERGE_BROWSER_HEADER), "1");
  assert.deepEqual(create?.body, { currency: "KRW", items: [{ product: "a", quantity: 1 }] });
  assert.deepEqual(merge?.body, { items: [{ product: "b", quantity: 4 }] });
  assert.deepEqual(listGuestCart(storage), []);
});

test("one combination refusal keeps that line local and does not discard independent lines", async () => {
  const storage = memoryStorage();
  for (const product of ["a", "b", "c"]) await addGuestCartLine(product, storage);
  const server = scriptedServer(me("member", [{ id: "cart" }]), ack("a"), refusal("membership-in-cart"), ack("c"));
  assert.deepEqual(await writeThroughGuestCart({ ...server, storage, memberID: "member" }),
    { outcome: "refused", reason: "membership-in-cart", productID: "b", changed: true });
  assert.deepEqual(listGuestCart(storage, "member"), [line("b")]);
  assert.deepEqual(server.calls.map(({ method }) => method), ["GET", "PATCH", "PATCH", "PATCH"]);
});

test("a pending cart keeps its confirmed member until empty", async () => {
  const storage = memoryStorage();
  await addGuestCartLine("a", storage, { quantity: 2 });
  const first = scriptedServer(me(), refusal("offer-unavailable"));
  assert.equal((await writeThroughGuestCart({ ...first, memberID: "member", storage })).outcome, "refused");
  assert.equal(await addGuestCartLine("b", storage), false);
  assert.equal(await removeGuestCartLine("a", storage, "other"), false);
  assert.equal(await addGuestCartLine("b", storage, { memberID: "member" }), true);
  assert.equal(JSON.parse(storage.values.get(GUEST_CART_STORAGE_KEY)!).owner, "member");

  const other = scriptedServer();
  assert.equal((await writeThroughGuestCart({ ...other, memberID: "other", storage })).outcome, "nothing");
  assert.equal(other.calls.length, 0);
  assert.deepEqual(listGuestCart(storage, "member"), [line("a", 2), line("b")]);

  const resumed = scriptedServer(me(), ack("a", 2), ack("b"));
  assert.equal((await writeThroughGuestCart({ ...resumed, memberID: "member", storage })).outcome, "written");
  assert.deepEqual(listGuestCart(storage), []);
  assert.equal(storage.values.has(GUEST_CART_STORAGE_KEY), false);
  await addGuestCartLine("c", storage);
  const fresh = scriptedServer(me("other"), ack("c", 1, "other"));
  assert.equal((await writeThroughGuestCart({ ...fresh, memberID: "other", storage })).outcome, "written");
});

test("a failed pin write over an older durable unpinned cart refuses transfer until the pin can be saved", async () => {
  const durable = memoryStorage();
  await addGuestCartLine("a", durable);
  let blocked = true;
  const storage = { ...durable, setItem(key: string, value: string) {
    if (blocked) throw new Error("quota");
    durable.setItem(key, value);
  } };
  const first = scriptedServer(me());
  assert.equal((await writeThroughGuestCart({ ...first, memberID: "member", storage })).outcome, "retry");
  assert.deepEqual(first.calls.map(({ method }) => method), ["GET"]);
  assert.deepEqual(listGuestCart(storage), [line("a")]);
  blocked = false;
  const resumed = scriptedServer(me(), ack("a"));
  assert.equal((await writeThroughGuestCart({ ...resumed, memberID: "member", storage })).outcome, "written");
});

test("two confirmed members competing for one browser cart cannot both dispatch a write", async () => {
  const storage = memoryStorage();
  await addGuestCartLine("a", storage);
  const firstIdentity = deferred<Response>();
  const secondIdentity = deferred<Response>();
  const dispatched = deferred<void>();
  const acknowledgement = deferred<Response>();
  const first = scriptedServer(() => firstIdentity.promise, () => {
    dispatched.resolve();
    return acknowledgement.promise;
  });
  const second = scriptedServer(() => secondIdentity.promise);
  const pending = writeThroughGuestCart({ ...first, storage, memberID: "member" });
  const competing = writeThroughGuestCart({ ...second, storage, memberID: "other" });
  assert.ok(first.calls.length === 1 && second.calls.length === 1);
  firstIdentity.resolve(me());
  secondIdentity.resolve(me("other"));
  await dispatched.promise;
  assert.equal((await competing).outcome, "account-changed");
  assert.deepEqual(second.calls.map(({ method }) => method), ["GET"]);
  acknowledgement.resolve(ack("a"));
  assert.equal((await pending).outcome, "written");
});

for (const replacement of ["line", "cart"] as const) {
  test(`late acknowledgement cannot clear an identical selection from a replacement ${replacement}`, async () => {
    const storage = memoryStorage();
    await addGuestCartLine("a", storage);
    await addGuestCartLine("b", storage);
    const dispatched = deferred<void>();
    const acknowledgement = deferred<Response>();
    const first = scriptedServer(me(), () => {
      dispatched.resolve();
      return acknowledgement.promise;
    }, ack("b"));
    const pending = writeThroughGuestCart({ ...first, memberID: "member", storage });
    await dispatched.promise;
    if (replacement === "line") {
      assert.equal(await removeGuestCartLine("a", storage, "member"), true);
    } else {
      await clearGuestCart(storage);
    }
    await addGuestCartLine("a", storage, { memberID: "member" });
    acknowledgement.resolve(ack("a"));
    assert.equal((await pending).outcome, "written");
    assert.deepEqual(listGuestCart(storage, "member"), [line("a")]);
    assert.equal(first.calls.length, replacement === "line" ? 3 : 2);
  });
}

test("an account switch before or partway through transfer cannot move remaining selections", async () => {
  const storage = memoryStorage();
  for (const product of ["a", "b", "c"]) await addGuestCartLine(product, storage);
  const initial = scriptedServer(me("another"));
  assert.deepEqual(await writeThroughGuestCart({ ...initial, storage, memberID: "member" }),
    { outcome: "account-changed", productID: "a", changed: false });
  assert.equal(initial.calls.length, 1);
  const partial = scriptedServer(me(), ack("a"), refusal("account-changed"));
  assert.deepEqual(await writeThroughGuestCart({ ...partial, storage, memberID: "member" }),
    { outcome: "account-changed", productID: "b", changed: true });
  assert.deepEqual(partial.calls.map(({ method }) => method), ["GET", "POST", "PATCH"]);
  assert.deepEqual(listGuestCart(storage, "member"), [line("b"), line("c")]);
});

test("concurrent create converges on the confirmed member's current cart", async () => {
  const storage = memoryStorage();
  await addGuestCartLine("a", storage);
  const server = scriptedServer(me(), refusal("open-cart-exists"), me("member", ["cart"]), ack("a", 3));
  assert.deepEqual(await writeThroughGuestCart({ ...server, storage, memberID: "member" }), { outcome: "written", cartID: "cart" });
  assert.deepEqual(server.calls.map(({ method }) => method), ["GET", "POST", "GET", "PATCH"]);
  assert.deepEqual(listGuestCart(storage), []);
});

test("disconnected, incomplete, or mismatched replies keep the unacknowledged selection", async () => {
  for (const response of [
    Response.json({}, { status: 429 }), Response.json({}, { status: 500 }),
    Response.json({ doc: { id: "cart" } }), ack("a", 1), ack("b", 2), ack("a", 2, "other"), ack("a", 2, "member", "different"),
  ]) {
    const storage = memoryStorage();
    await addGuestCartLine("a", storage, { quantity: 2 });
    const server = scriptedServer(me("member", ["cart"]), response);
    assert.deepEqual(await writeThroughGuestCart({ ...server, storage, memberID: "member" }),
      { outcome: "retry", productID: "a", changed: false });
    assert.deepEqual(listGuestCart(storage, "member"), [line("a", 2)]);
  }
});

test("booking lock stops subsequent writes and keeps the existing local selections", async () => {
  const storage = memoryStorage();
  await addGuestCartLine("a", storage);
  await addGuestCartLine("b", storage);
  const server = scriptedServer(me("member", ["cart"]), refusal("payment-in-progress"));
  assert.deepEqual(await writeThroughGuestCart({ ...server, storage, memberID: "member" }),
    { outcome: "refused", reason: "payment-in-progress", productID: "a", changed: false });
  assert.equal(server.calls.length, 2);
  assert.deepEqual(listGuestCart(storage, "member"), [line("a"), line("b")]);
});

test("an acknowledgement never clears a quantity changed while the write was in flight", async () => {
  const storage = memoryStorage();
  await addGuestCartLine("a", storage);
  const server = scriptedServer(me(), async () => {
    await addGuestCartLine("a", storage, { quantity: 2, memberID: "member" });
    await addGuestCartLine("b", storage, { memberID: "member" });
    return ack("a");
  });
  assert.deepEqual(await writeThroughGuestCart({ ...server, storage, memberID: "member" }), { outcome: "written", cartID: "cart" });
  assert.deepEqual(listGuestCart(storage, "member"), [line("a", 2), line("b")]);
});

// Review-B/Cordy, 27 Nov: the header's signed-out count tells a verified-empty cart from an unreadable one, and reading
// it never changes storage.
test("the guest count: 0 only when verified empty, the line count when readable, unknown otherwise, storage untouched", async () => {
  const storage = memoryStorage();
  assert.equal(readGuestCartCount(storage), 0);
  await addGuestCartLine("product-a", storage);
  assert.equal(readGuestCartCount(storage), 1);
  await addGuestCartLine("product-b", storage, { quantity: 2 });
  assert.equal(readGuestCartCount(storage), 2, "counts distinct lines, not the sum of units");
  for (const raw of ["not json", JSON.stringify({ version: 2, lines: [] }), JSON.stringify({ version: 1, lines: [line("a", 0)] })]) {
    storage.values.set(GUEST_CART_STORAGE_KEY, raw);
    assert.equal(readGuestCartCount(storage), "unknown", raw);
    assert.equal(storage.values.get(GUEST_CART_STORAGE_KEY), raw, "a bad record is left for listGuestCart to handle");
  }
  const blocked = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
  assert.equal(readGuestCartCount(blocked), "unknown");
});

test("a browser without locks keeps the saved cart read-only and never contacts the transfer endpoint", async () => {
  const storage = memoryStorage();
  await addGuestCartLine("a", storage);
  const keys = [...storage.values];
  const descriptor = Object.getOwnPropertyDescriptor(navigator, "locks")!;
  Object.defineProperty(navigator, "locks", { value: undefined, configurable: true });
  try {
    assert.equal(await addGuestCartLine("b", storage), false);
    assert.equal(await removeGuestCartLine("a", storage), false);
    assert.equal(await clearGuestCart(storage), false);
    const api = scriptedServer();
    assert.equal((await writeThroughGuestCart({ ...api, memberID: "member", storage })).outcome, "retry");
    assert.equal(api.calls.length, 0);
    assert.deepEqual([...storage.values], keys);
    assert.equal(readGuestCartCount(storage), 1);
  } finally { Object.defineProperty(navigator, "locks", descriptor); }
});

test("a v1 cart is never silently adopted, even if an older tab still writes it", async () => {
  const storage = memoryStorage();
  storage.setItem("sphmrs.cart.v1", JSON.stringify({ version: 1, lines: [line("legacy")] }));
  const api = scriptedServer();
  assert.equal((await writeThroughGuestCart({ ...api, memberID: "member", storage })).outcome, "nothing");
  assert.equal(api.calls.length, 0);
  await addGuestCartLine("new", storage);
  storage.removeItem("sphmrs.cart.v1");
  assert.deepEqual(listGuestCart(storage), [line("new")]);
});
