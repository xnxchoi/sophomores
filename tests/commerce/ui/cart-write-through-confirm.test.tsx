import assert from "node:assert/strict";
import test from "node:test";
import { addGuestCartLine, listGuestCart } from "../../../src/lib/commerce/browser-cart";
import { CART_EXPECTED_MEMBER_HEADER } from "../../../src/lib/commerce/cart-refusal";
import { confirmAndWriteThrough } from "../../../src/app/(site)/shop/cart/cart-view";

// /shop/cart's write-through on Auth's r3 contract: the member is confirmed and their cart is read fresh before writing.
function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
function server(routes: [prefix: string, route: { status?: number; body: unknown }][]) {
  const calls: { url: string; method: string; member?: string }[] = [];
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    const key = String(url);
    const method = init?.method ?? "GET";
    calls.push({ url: key, method, member: (init?.headers as Record<string, string> | undefined)?.[CART_EXPECTED_MEMBER_HEADER] });
    const route = routes.find(([prefix]) => key.startsWith(prefix))?.[1];
    return Response.json(route?.body ?? {}, { status: route ? route.status ?? 200 : 404 });
  }) as typeof fetch;
  return { fetcher, calls };
}
const me = (id: string, carts: string[] = []) => ({ body: { user: { id, cart: { docs: carts } } } });

test("the cart is read fresh for the confirmed member: already holding the line, nothing is written", async () => {
  const storage = memoryStorage();
  addGuestCartLine("p1", storage);
  const { fetcher, calls } = server([["/api/users/me", me("m1", ["c9"])], ["/api/carts/c9", { body: { id: "c9", items: [{ product: "p1" }] } }]]);
  assert.deepEqual(await confirmAndWriteThrough("m1", { fetcher, storage }), { outcome: "already-in-cart", cartID: "c9" });
  assert.deepEqual(calls.map((call) => call.method), ["GET", "GET"]);
  assert.deepEqual(listGuestCart(storage), []);
});

test("a fresh cart holding something else is replaced by one PATCH pinned to the member", async () => {
  const storage = memoryStorage();
  addGuestCartLine("p1", storage);
  const { fetcher, calls } = server([["/api/users/me", me("m1", ["c9"])], ["/api/carts/c9?depth=0", { body: { id: "c9", items: [{ product: "p2" }] } }],
    ["/api/carts/c9", { body: { doc: { id: "c9" } } }]]);
  assert.equal((await confirmAndWriteThrough("m1", { fetcher, storage })).outcome, "written");
  const writes = calls.filter((call) => call.method !== "GET");
  assert.deepEqual(writes, [{ url: "/api/carts/c9", method: "PATCH", member: "m1" }]);
});

test("another account signed in: account-changed, nothing written, the line kept", async () => {
  const storage = memoryStorage();
  addGuestCartLine("p1", storage);
  const { fetcher, calls } = server([["/api/users/me", me("m2", ["c7"])]]);
  assert.deepEqual(await confirmAndWriteThrough("m1", { fetcher, storage }), { outcome: "account-changed", productID: "p1" });
  assert.deepEqual(calls.map((call) => call.url), ["/api/users/me?depth=0&select[id]=true&select[cart]=true"]);
  assert.deepEqual(listGuestCart(storage), [{ productID: "p1", quantity: 1 }]);
});

test("a cart read that doesn't settle keeps the line for a later try", async () => {
  const storage = memoryStorage();
  addGuestCartLine("p1", storage);
  const { fetcher, calls } = server([["/api/users/me", me("m1", ["c9"])], ["/api/carts/c9", { status: 500, body: {} }]]);
  assert.deepEqual(await confirmAndWriteThrough("m1", { fetcher, storage }), { outcome: "retry", productID: "p1" });
  assert.equal(calls.some((call) => call.method !== "GET"), false);
  assert.deepEqual(listGuestCart(storage), [{ productID: "p1", quantity: 1 }]);
});
