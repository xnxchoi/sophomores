import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { grantMembershipOnPayment } from "@/lib/commerce/membership";

function fakeReq(status: string | undefined) {
  const user: Record<string, unknown> = { id: "buyer", membershipStatus: status };
  const updates: unknown[] = [];
  const req = { payload: {
    findByID: async ({ collection, id, req: owner }: { collection: string; id: string; req: unknown }) => {
      assert.equal(collection, "users"); assert.equal(id, "buyer"); assert.equal(owner === req, true);
      return { ...user };
    },
    update: async ({ collection, id, data, req: owner }: { collection: string; id: string; data: Record<string, unknown>; req: unknown }) => {
      assert.equal(collection, "users"); assert.equal(id, "buyer"); assert.equal(owner === req, true, "grant must use the settling req");
      updates.push(data); Object.assign(user, data); return { ...user };
    },
  } } as unknown as PayloadRequest;
  return { req, user, updates };
}

test("payment approves applicant, invited and waitlist accounts once", async () => {
  for (const status of ["applicant", "invited", "waitlist"]) {
    const f = fakeReq(status);
    await grantMembershipOnPayment(f.req, "buyer");
    assert.equal(f.user.membershipStatus, "approved");
    await grantMembershipOnPayment(f.req, "buyer");
    assert.deepEqual(f.updates, [{ membershipStatus: "approved" }], `${status}: replay writes nothing`);
  }
});

test("payment never changes staff, suspended or already approved accounts", async () => {
  for (const status of ["staff", "suspended", "approved"]) {
    const f = fakeReq(status);
    await grantMembershipOnPayment(f.req, "buyer");
    assert.equal(f.user.membershipStatus, status);
    assert.equal(f.updates.length, 0);
  }
});

test("settlement grants membership inside the transaction-success hook", () => {
  const source = readFileSync("src/lib/commerce/ecommerce.ts", "utf8");
  const hook = source.slice(source.indexOf("afterChange: [...(defaultCollection.hooks?.afterChange"));
  assert.equal(/settleReservation[\s\S]*grantMembershipOnPayment\(req, /.test(hook), true);
  assert.equal(/Settlement requires its active transaction[\s\S]*grantMembershipOnPayment/.test(hook), true);
});
