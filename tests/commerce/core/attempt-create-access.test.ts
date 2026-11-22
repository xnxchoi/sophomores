import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { commerceAttemptCreate, withCommerceWrite } from "../../../src/lib/commerce/access";

// S0c #52: only server code in a write scope may create, and only the signed-in member's own attempt.
const member = { id: "member-a", collection: "users" };
const allowed = (req: PayloadRequest, customer: unknown) => commerceAttemptCreate({ req, data: { customer } } as never);

test("outside a server write scope, no one creates an attempt (REST and GraphQL included)", () => {
  const req = { user: member } as unknown as PayloadRequest;
  assert.equal(allowed(req, "member-a"), false);
});

test("inside the scope, only the signed-in member's own customer id is accepted", async () => {
  for (const [user, customer, expected] of [
    [member, "member-a", true], [member, "member-b", false], [member, undefined, false],
    [{ id: "member-a", collection: "admins" }, "member-a", false], [null, "member-a", false],
  ] as const) {
    const req = { user } as unknown as PayloadRequest;
    assert.equal(await withCommerceWrite(req, async () => allowed(req, customer)), expected, JSON.stringify([user, customer]));
  }
});
