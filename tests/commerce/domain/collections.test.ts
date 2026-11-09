import assert from "node:assert/strict";
import test from "node:test";
import { CommerceEvents } from "../../../src/lib/payload/collections/commerce-events";
import { CommerceClaims } from "../../../src/lib/payload/collections/commerce-claims";
import { CommerceAdmissions } from "../../../src/lib/payload/collections/commerce-admissions";

test("guest and claim ledgers deny anonymous, foreign customers and non-superadmin staff", async () => {
  for (const collection of [CommerceClaims, CommerceAdmissions]) {
    for (const user of [null, { collection: "users", id: "foreign" }, { collection: "admins", role: "editor", _strategy: "staff-better-auth" }]) {
      assert.equal(await collection.access!.read!({ req: { user } } as never), false);
      assert.equal(await collection.access!.create!({ req: { user } } as never), false);
      assert.equal(await collection.access!.update!({ req: { user } } as never), false);
    }
    assert.equal(await collection.access!.read!({ req: { user: { collection: "admins", role: "admin", _strategy: "staff-better-auth" } } } as never), true);
  }
  const digest = CommerceClaims.fields.find((field) => "name" in field && field.name === "tokenDigest");
  assert.ok(digest && "access" in digest);
  assert.equal(await digest.access!.read!({} as never), false, "even the operator UI does not expose claim digests");
});

const publication = {
  name: "Owner event", publicationApproved: true, capacity: 100, transportCapacity: 100,
  partIStartsAt: "2027-01-01T18:00:00.000Z", partIEndsAt: "2027-01-01T23:00:00.000Z", claimCutoffAt: "2027-01-01T19:00:00.000Z",
};
const validate = CommerceEvents.hooks!.beforeValidate![0];

test("publication requires owner event times and guaranteed transport for every eligible admission", async () => {
  await assert.rejects(async () => validate({ data: { ...publication, partIEndsAt: publication.partIStartsAt }, req: {} } as never), /Part I/i);
  await assert.rejects(async () => validate({ data: { ...publication, transportCapacity: 99 }, req: {} } as never), /transport/i);
  await assert.rejects(async () => validate({ data: { ...publication, claimCutoffAt: undefined }, req: {} } as never), /cutoff/i);
});

test("owner-provided cutoff may be during Part I without inventing an earlier deadline", async () => {
  assert.deepEqual(await validate({ data: publication, req: {} } as never), publication);
});

test("unpublishing cannot shrink physical event or transport capacity below obligations", async () => {
  await assert.rejects(async () => validate({ data: { ...publication, publicationApproved: false, capacity: 1, committedQuantity: 2 }, req: {} } as never), /strand/i);
});
