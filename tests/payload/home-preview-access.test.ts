import assert from "node:assert/strict";
import { test } from "node:test";
import { HomePage } from "@/payload/collections/home-page";

const access = HomePage.access!;
const staff = { collection: "admins", _strategy: "staff-better-auth", role: "staff" };
const member = { collection: "users", id: "member-1" };
const req = (user: unknown) => ({ req: { user } }) as never;

test("the preview entry refuses anonymous requests, even with the old shared secret", async () => {
  const { GET } = await import("@/app/next/preview/route");
  const saved = process.env.PAYLOAD_PREVIEW_SECRET;
  try {
    process.env.PAYLOAD_PREVIEW_SECRET = "right";
    for (const query of ["locale=en", "locale=en&secret=right", "url=//evil.example&secret=right"]) {
      // Unit tests have no Payload configuration, so no session can be verified: the route must answer 403
      // itself rather than throw.
      assert.equal((await GET(new Request(`http://localhost/next/preview?${query}`))).status, 403, query);
    }
  } finally {
    if (saved === undefined) delete process.env.PAYLOAD_PREVIEW_SECRET;
    else process.env.PAYLOAD_PREVIEW_SECRET = saved;
  }
});

test("over REST and GraphQL only staff read drafts and versions; the public reads published or fallback copy", () => {
  for (const user of [null, member]) {
    assert.deepEqual(access.read!(req(user)), { or: [{ _status: { equals: "published" } }, { isFallback: { equals: true } }] });
    assert.equal(access.readVersions!(req(user)), false);
  }
  assert.equal(access.read!(req(staff)), true);
  assert.equal(access.readVersions!(req(staff)), true);
});

test("only verified CMS staff write the home page, and only a super admin deletes it", () => {
  const editor = { ...staff, role: "editor" };
  const superAdmin = { ...staff, role: "admin" };
  // A principal that only claims a role or collection is not CMS staff.
  const forgedAdmin = { collection: "users", id: "member-2", role: "admin" };
  const unverifiedAdmin = { collection: "admins", _strategy: "other", role: "admin" };
  for (const operation of ["create", "update"] as const) {
    for (const user of [staff, editor, superAdmin]) assert.equal(access[operation]!(req(user)), true, `${operation} ${user.role}`);
    for (const user of [null, member, forgedAdmin, unverifiedAdmin]) assert.equal(access[operation]!(req(user)), false, operation);
  }
  assert.equal(access.delete!(req(superAdmin)), true);
  for (const user of [null, member, forgedAdmin, unverifiedAdmin, staff, editor])
    assert.equal(access.delete!(req(user)), false, JSON.stringify(user));
});

test("no generated Live Preview URL carries a secret", () => {
  const saved = process.env.PAYLOAD_PREVIEW_SECRET;
  try {
    process.env.PAYLOAD_PREVIEW_SECRET = "s3cret-canary";
    const url = (HomePage.admin!.livePreview!.url as (args: unknown) => string)({ data: { id: "d1" }, locale: { code: "ko" } });
    assert.equal(url, "/next/preview?locale=ko&draftId=d1");
    assert.equal(url.includes("s3cret-canary") || /secret/i.test(url), false);
  } finally {
    if (saved === undefined) delete process.env.PAYLOAD_PREVIEW_SECRET;
    else process.env.PAYLOAD_PREVIEW_SECRET = saved;
  }
});
