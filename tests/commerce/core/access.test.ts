import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { assertCommerceBrowserAuthority, commerceServerWrite, withCommerceWrite, commerceOwnerRead, commerceAdmin } from "../../../src/lib/commerce/access";

test("server write capability cannot be forged in body or context and retires after work", async () => {
  const req = { context: { commerceWrite: true }, data: { commerceVersion: "commerce-v1" } } as unknown as PayloadRequest;
  assert.equal(commerceServerWrite(req), false);
  await withCommerceWrite(req, async () => {
    assert.equal(commerceServerWrite(req), true);
    await withCommerceWrite(req, async () => assert.equal(commerceServerWrite(req), true));
    assert.equal(commerceServerWrite(req), true);
  });
  assert.equal(commerceServerWrite(req), false);
  await assert.rejects(withCommerceWrite(req, async () => { throw new Error("rollback"); }));
  assert.equal(commerceServerWrite(req), false);
});

test("commerce administrative authority cannot be inferred from customer role", () => {
  const user = { id: "c", collection: "users", role: "admin" };
  assert.equal(commerceAdmin({ req: { user } } as never), false);
  assert.deepEqual(commerceOwnerRead({ req: { user } } as never), { customer: { equals: "c" } });
  assert.equal(commerceOwnerRead({ req: { user: { id: "x", collection: "admins", role: "staff" } } } as never), false);
});

test("pending reads permit native same-origin GET without Origin but reject cross-site authority", () => {
  const origin = "http://localhost:3077";
  const request = (url = `${origin}/api/payments/portone/pending?productID=product`, headers?: HeadersInit, method = "GET") => new Request(url, { method, headers });
  assert.doesNotThrow(() => assertCommerceBrowserAuthority(request(), origin, "read"));
  assert.doesNotThrow(() => assertCommerceBrowserAuthority(request(undefined, { origin }), origin, "read"));
  for (const req of [request(undefined, { origin: "https://attacker.example" }), request(undefined, { "sec-fetch-site": "cross-site" }), request(undefined, { "sec-fetch-site": "same-site" }),
    request("http://localhost:9999/api/payments/portone/pending"), request(undefined, { host: "attacker.example" }), request(undefined, undefined, "POST")]) {
    assert.throws(() => assertCommerceBrowserAuthority(req, origin, "read"));
  }
  assert.throws(() => assertCommerceBrowserAuthority(request(), origin, "mutation"));
});
