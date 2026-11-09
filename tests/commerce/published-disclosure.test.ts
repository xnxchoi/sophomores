import assert from "node:assert/strict";
import { test } from "node:test";
import type { Payload, PayloadRequest } from "payload";
import { loadPublishedCommerceDisclosure } from "@/lib/commerce/catalogue";

const policy = { effectiveDate: "2020-01-01", sections: [{ heading: "Fixture", paragraphs: ["Test only, not public policy."] }] };
const publication = {
  _status: "published", publicationApproved: true, physicalProductApproved: true,
  fulfillmentReady: true, addressRetentionApproved: true, shippingCountries: ["KR"],
  disclosure: {
    seller: { name: "Fixture", registrationNumber: "123-45-67890", representative: "Fixture", address: "Fixture", phone: "02-1234-5678" },
    policies: { terms: policy, privacy: policy, refund: policy },
  },
};

test("published disclosure reads no products and projects only approved public fields", async () => {
  const req = {} as PayloadRequest;
  const payload = { findGlobal: async (options: Record<string, unknown>) => {
    assert.equal(options.slug, "commerce-publication");
    assert.equal(options.draft, false);
    assert.equal(options.depth, 0);
    assert.equal(options.overrideAccess, true);
    assert.equal(options.req === req, true);
    return { ...publication, internalNote: "private" };
  } } as unknown as Payload;
  assert.deepEqual(await loadPublishedCommerceDisclosure(payload, req), publication.disclosure);
});

test("missing, draft, unapproved and invalid publication fail closed", async () => {
  for (const data of [{}, { ...publication, _status: "draft" }, { ...publication, publicationApproved: false }, { ...publication, disclosure: null }]) {
    const payload = { findGlobal: async () => data } as unknown as Payload;
    assert.equal(await loadPublishedCommerceDisclosure(payload), null);
  }
});

test("CMS read errors propagate to the route's unavailable boundary", async () => {
  const payload = { findGlobal: async () => { throw new Error("Unavailable fixture"); } } as unknown as Payload;
  await assert.rejects(loadPublishedCommerceDisclosure(payload), /Unavailable fixture/);
});
