import assert from "node:assert/strict";
import test from "node:test";
import { addGuestCartLine, clearGuestCart, GUEST_CART_STORAGE_KEY, listGuestCart, removeGuestCartLine, subscribeGuestCart, writeThroughGuestCart } from "../../src/lib/commerce/browser-cart";

function memoryStorage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
type Call = { url: string; init: RequestInit };
function fetcher(status: number, body: unknown, calls: Call[] = []) {
  return Object.assign(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Response.json(body, { status });
  }, { calls }) as unknown as typeof fetch & { calls: Call[] };
}

test("a signed-out line is one product, replaced by the latest choice, never summed", () => {
  const storage = memoryStorage();
  assert.deepEqual(listGuestCart(storage), []);
  addGuestCartLine("product-a", storage);
  assert.deepEqual(addGuestCartLine("product-b", storage), [{ productID: "product-b", quantity: 1 }]);
  assert.deepEqual(addGuestCartLine("product-b", storage), [{ productID: "product-b", quantity: 1 }]);
  assert.deepEqual(removeGuestCartLine("product-a", storage), [{ productID: "product-b", quantity: 1 }]);
  assert.deepEqual(removeGuestCartLine("product-b", storage), []);
  assert.equal(storage.values.has(GUEST_CART_STORAGE_KEY), false);
  assert.throws(() => addGuestCartLine("", storage));
});

test("stored data is validated; anything malformed reads as empty and is removed", () => {
  const storage = memoryStorage();
  for (const raw of ["not json", JSON.stringify({ version: 2, lines: [] }), JSON.stringify({ version: 1, lines: [{ productID: "a", quantity: 2 }] }),
    JSON.stringify({ version: 1, lines: [{ productID: "a", quantity: 1 }, { productID: "b", quantity: 1 }] })]) {
    storage.values.set(GUEST_CART_STORAGE_KEY, raw);
    assert.deepEqual(listGuestCart(storage), []);
  }
  const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
  assert.deepEqual(listGuestCart(throwing), []);
});

test("subscribers hear same-tab changes until they unsubscribe", () => {
  const storage = memoryStorage();
  let heard = 0;
  const stop = subscribeGuestCart(() => { heard++; });
  addGuestCartLine("product-a", storage);
  clearGuestCart(storage);
  stop();
  addGuestCartLine("product-a", storage);
  assert.equal(heard, 2);
});

test("write-through creates the member's cart with exactly the browser line, then clears it", async () => {
  const storage = memoryStorage();
  addGuestCartLine("product-a", storage);
  const post = fetcher(201, { doc: { id: "cart-1" } });
  assert.deepEqual(await writeThroughGuestCart(undefined, { fetcher: post, storage }), { outcome: "written", cartID: "cart-1" });
  assert.equal(post.calls[0].url, "/api/carts");
  assert.equal(post.calls[0].init.method, "POST");
  assert.equal(post.calls[0].init.credentials, "include");
  assert.deepEqual(JSON.parse(String(post.calls[0].init.body)), { items: [{ product: "product-a", quantity: 1 }], currency: "KRW" });
  assert.deepEqual(listGuestCart(storage), []);
});

test("write-through replaces another line in one PATCH and sends no query, secret or customer", async () => {
  const storage = memoryStorage();
  addGuestCartLine("product-b", storage);
  const patch = fetcher(200, { doc: { id: "cart-1" } });
  assert.deepEqual(await writeThroughGuestCart({ id: "cart-1", items: [{ product: { id: "product-a" } }] }, { fetcher: patch, storage }), { outcome: "written", cartID: "cart-1" });
  assert.equal(patch.calls.length, 1);
  assert.equal(patch.calls[0].url, "/api/carts/cart-1");
  assert.equal(patch.calls[0].init.method, "PATCH");
  assert.deepEqual(JSON.parse(String(patch.calls[0].init.body)), { items: [{ product: "product-b", quantity: 1 }] });
  assert.equal(patch.calls[0].url.includes("?"), false);
});

test("the same product already in the member's cart needs no write", async () => {
  const storage = memoryStorage();
  addGuestCartLine("product-a", storage);
  const none = fetcher(500, {});
  assert.deepEqual(await writeThroughGuestCart({ id: 7, items: [{ product: "product-a" }] }, { fetcher: none, storage }), { outcome: "already-in-cart", cartID: "7" });
  assert.equal(none.calls.length, 0);
  assert.deepEqual(listGuestCart(storage), []);
  assert.deepEqual(await writeThroughGuestCart({ id: 7, items: [] }, { fetcher: none, storage }), { outcome: "nothing" });
});

test("a stale line is refused by reason and cleared; a payment in progress keeps it", async () => {
  for (const reason of ["offer-unavailable", "limit-reached", "cart-locked"] as const) {
    const storage = memoryStorage();
    addGuestCartLine("product-a", storage);
    assert.deepEqual(await writeThroughGuestCart(undefined, { fetcher: fetcher(409, { errors: [{ message: "x", data: { cartRefusal: reason } }] }), storage }),
      { outcome: "refused", reason, productID: "product-a" });
    assert.deepEqual(listGuestCart(storage), []);
  }
  const storage = memoryStorage();
  addGuestCartLine("product-a", storage);
  assert.deepEqual(await writeThroughGuestCart({ id: "cart-1", items: [] }, { fetcher: fetcher(409, { errors: [{ data: { cartRefusal: "payment-in-progress" } }] }), storage }),
    { outcome: "refused", reason: "payment-in-progress", productID: "product-a" });
  assert.equal(listGuestCart(storage).length, 1);
  assert.deepEqual(await writeThroughGuestCart(undefined, { fetcher: fetcher(400, { errors: [{ message: "Only one unit per purchase" }] }), storage }),
    { outcome: "refused", reason: "rejected", productID: "product-a" });
  assert.deepEqual(listGuestCart(storage), []);
});

test("transient failures and a lost session keep the line for a later try", async () => {
  for (const status of [401, 403, 429, 500, 503]) {
    const storage = memoryStorage();
    addGuestCartLine("product-a", storage);
    assert.deepEqual(await writeThroughGuestCart(undefined, { fetcher: fetcher(status, {}), storage }), { outcome: "retry", productID: "product-a" });
    assert.equal(listGuestCart(storage).length, 1);
  }
  const storage = memoryStorage();
  addGuestCartLine("product-a", storage);
  const offline = (async () => { throw new TypeError("offline"); }) as unknown as typeof fetch;
  assert.deepEqual(await writeThroughGuestCart(undefined, { fetcher: offline, storage }), { outcome: "retry", productID: "product-a" });
  assert.equal(listGuestCart(storage).length, 1);
});

test("a refusal whose error data was stripped is still read from its message tag", async () => {
  const storage = memoryStorage();
  addGuestCartLine("product-a", storage);
  const stripped = fetcher(409, { errors: [{ message: "Resolve the existing payment before editing this cart [cart-refusal:payment-in-progress]" }] });
  assert.deepEqual(await writeThroughGuestCart({ id: "cart-1", items: [] }, { fetcher: stripped, storage }),
    { outcome: "refused", reason: "payment-in-progress", productID: "product-a" });
  assert.equal(listGuestCart(storage).length, 1, "payment in progress keeps the line, even without error data");
});

test("a create that finds the member's open cart writes the line into that cart instead (retry, race or lost ack)", async () => {
  const storage = memoryStorage();
  addGuestCartLine("product-a", storage);
  const calls: { url: string; init: RequestInit }[] = [];
  const answers = [
    Response.json({ errors: [{ message: "An open cart already exists [cart-refusal:open-cart-exists]" }] }, { status: 409 }),
    Response.json({ user: { id: "member", cart: { docs: ["cart-9"] } } }),
    Response.json({ doc: { id: "cart-9" } }),
  ];
  const sequence = (async (url: string, init?: RequestInit) => { calls.push({ url: String(url), init: init ?? {} }); return answers.shift()!; }) as unknown as typeof fetch;
  assert.deepEqual(await writeThroughGuestCart(undefined, { fetcher: sequence, storage }), { outcome: "written", cartID: "cart-9" });
  assert.deepEqual(calls.map(({ url, init }) => `${init.method ?? "GET"} ${url}`),
    ["POST /api/carts", "GET /api/users/me?depth=0&select[cart]=true", "PATCH /api/carts/cart-9"]);
  assert.deepEqual(JSON.parse(String(calls[2].init.body)), { items: [{ product: "product-a", quantity: 1 }] });
  assert.deepEqual(listGuestCart(storage), []);
});

test("an open cart that cannot be found, or a second open-cart refusal, is a retry, never a loop", async () => {
  const storage = memoryStorage();
  addGuestCartLine("product-a", storage);
  const exists = () => Response.json({ errors: [{ message: "x [cart-refusal:open-cart-exists]" }] }, { status: 409 });
  const noCart = [exists(), Response.json({ user: { id: "member", cart: { docs: [] } } })];
  assert.deepEqual(await writeThroughGuestCart(undefined, { fetcher: (async () => noCart.shift()!) as unknown as typeof fetch, storage }),
    { outcome: "retry", productID: "product-a" });
  const twice = [exists(), Response.json({ user: { cart: { docs: [{ id: "cart-9" }] } } }), exists()];
  assert.deepEqual(await writeThroughGuestCart(undefined, { fetcher: (async () => twice.shift()!) as unknown as typeof fetch, storage }),
    { outcome: "retry", productID: "product-a" });
  assert.equal(listGuestCart(storage).length, 1);
});

test("a newer choice made while a write-through was in flight is kept", async () => {
  const storage = memoryStorage();
  addGuestCartLine("product-a", storage);
  const slow = (async () => { addGuestCartLine("product-b", storage); return Response.json({ doc: { id: "cart-1" } }); }) as unknown as typeof fetch;
  assert.deepEqual(await writeThroughGuestCart({ id: "cart-1", items: [] }, { fetcher: slow, storage }), { outcome: "written", cartID: "cart-1" });
  assert.deepEqual(listGuestCart(storage), [{ productID: "product-b", quantity: 1 }], "only the line that was sent is cleared");
});

test("storage that exists but refuses access keeps the cart for the page", () => {
  const refusing = { getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("denied"); }, removeItem: () => { throw new Error("denied"); } };
  addGuestCartLine("product-a", refusing);
  assert.deepEqual(listGuestCart(refusing), [{ productID: "product-a", quantity: 1 }]);
  clearGuestCart(refusing);
  assert.deepEqual(listGuestCart(refusing), []);
});
