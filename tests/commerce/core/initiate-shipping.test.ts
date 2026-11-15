import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { APIError, type PayloadRequest } from "payload";
import { assertInitiateShipping } from "@/lib/commerce/ecommerce";

const address = { country: "KR" as const, recipientName: "Fixture", phone: "01012345678", postalCode: "12345", addressLine1: "Fixture" };
const cartID = "00000000-0000-4000-8000-000000000001";
function request(productKind: string | undefined, customer = "owner") {
  return { user: { id: "owner", collection: "users" }, payload: { findByID: async ({ collection }: { collection: string }) => collection === "carts"
    ? { id: cartID, customer, items: [{ product: "p", quantity: 1 }] }
    : { id: "p", ...(productKind ? { productKind } : {}) } } } as unknown as PayloadRequest;
}
const rejection = (status: number, pattern: RegExp) => (error: unknown) => error instanceof APIError && error.status === status && pattern.test(error.message);

test("a membership checkout without a shipping address is a 400, as before guest invites", async () => {
  for (const kind of ["membership", undefined]) {
    await assert.rejects(assertInitiateShipping(request(kind), { cartID }), rejection(400, /shipping address is required/i), String(kind));
    await assertInitiateShipping(request(kind), { cartID, shippingAddress: address });
  }
});

test("a guest-invite checkout with a shipping address is a 400; without one it proceeds", async () => {
  await assert.rejects(assertInitiateShipping(request("guest_invite"), { cartID, shippingAddress: address }), rejection(400, /no shipping address/i));
  await assertInitiateShipping(request("guest_invite"), { cartID });
});

test("someone else's cart is left to the ownership checks that already reject it", async () => {
  await assertInitiateShipping(request("membership", "intruder"), { cartID });
});

test("the secured initiate endpoint runs the shipping check before the official handler", () => {
  const source = readFileSync("src/lib/commerce/ecommerce.ts", "utf8");
  const secure = source.slice(source.indexOf("const secureEndpoint"), source.indexOf("export const commercePlugin"));
  assert.equal(/endsWith\("\/initiate"\)[\s\S]*assertInitiateShipping\(req, /.test(secure), true);
  assert.equal(secure.indexOf("assertInitiateShipping(req, ") < secure.indexOf("const execute"), true);
});
