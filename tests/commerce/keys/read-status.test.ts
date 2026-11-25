import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { readMemberGrantStatus } from "../../../src/lib/commerce/keys/read";

// S0c-2 (Review-A HARDEN): the beneficiary comes from the verified principal on req, never an argument.
function fixture(user: unknown) {
  const filters: unknown[] = [];
  const req = { user, payload: { find: async (options: { where: unknown; select: unknown }) => {
    filters.push([options.where, options.select]);
    return { docs: [{ state: "pending" }] };
  } } } as unknown as PayloadRequest;
  return { req, filters };
}

test("key status is read for the signed-in member only, state field only", async () => {
  const { req, filters } = fixture({ id: "member-a", collection: "users" });
  await readMemberGrantStatus(req);
  assert.deepEqual(filters, [[{ beneficiaryUser: { equals: "member-a" } }, { state: true }]]);
});

test("no verified users principal, no read", async () => {
  for (const user of [undefined, { id: "staff", collection: "admins" }]) {
    const { req, filters } = fixture(user);
    await assert.rejects(readMemberGrantStatus(req), /Member required/);
    assert.deepEqual(filters, []);
  }
});
