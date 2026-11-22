import assert from "node:assert/strict";
import test from "node:test";
import type { Access } from "payload";
import { Citations } from "@/payload/collections/citations";

// Citations are editorial quotes from posts. No member interface writes them,
// so a signed-in member must not create one through Payload REST: rows have no
// owner and every member reads them on the reading surface.
const staff = { id: "staff-1", collection: "admins", role: "editor", _strategy: "staff-better-auth" };
const member = { id: "member-1", collection: "users", role: "user" };
const forged = { id: "member-2", collection: "users", role: "admin" };
const call = (access: Access | undefined, user: unknown) =>
  access?.({ req: { user } } as never);

test("only CMS staff create, update or delete citations", () => {
  for (const operation of ["create", "update", "delete"] as const) {
    const access = Citations.access?.[operation];
    assert.equal(call(access, staff), true, operation);
    for (const user of [member, forged, null])
      assert.equal(call(access, user), false, `${operation} ${JSON.stringify(user)}`);
  }
});

test("signed-in readers still read citations", () => {
  assert.equal(Boolean(call(Citations.access?.read, member)), true);
  assert.equal(Boolean(call(Citations.access?.read, staff)), true);
  assert.equal(Boolean(call(Citations.access?.read, null)), false);
});
