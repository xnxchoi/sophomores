import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { CollectionSlug } from "payload";
import { proofTargets } from "../../support/proof-ports.mjs";

// The product page's display read (src/app/(site)/shop/products/[id]/page-documents.ts) on real PostgreSQL. It overrides
// access on purpose, so the query itself must keep everything else out. With sales closed (the commerce-publication
// global never published, as before launch, so an anonymous reader gets nothing), it returns the published, approved
// product only, at its published version (not a newer draft), never a draft-only or unapproved product, and only the
// page group.
test("product page display read on real PostgreSQL", {
  skip: process.env.PRODUCT_PAGE_DISPLAY_DATABASE_TESTS !== "1", timeout: 180_000,
}, async (t) => {
  const target = proofTargets.productPageDisplay;
  const { openProofDatabase, isolateTransport } = await import("./payment-postgres-fixture");
  const { loadProductPageDocuments } = await import("../../../src/app/(site)/shop/products/[id]/page-documents");
  const { createLocalReq } = await import("payload");
  isolateTransport(t, target.port);
  const { payload, close } = await openProofDatabase(true, new Set(), target);
  t.after(close);
  const products = "products" as CollectionSlug;
  const now = new Date().toISOString();

  // Fixture rows (the adapter, as Auth's fixtures do): a published, approved product; one never published; one published
  // but not approved; one neither.
  const product = async (status: "draft" | "published", approved: boolean, marker: string) => {
    const id = randomUUID();
    await payload.db.create({ collection: products, customID: id, data: { title: marker, description: marker, _status: status,
      publicationApproved: approved, page: { byline: marker, kicker: marker }, createdAt: now, updatedAt: now } });
    return id;
  };
  const published = await product("published", true, "PUBLISHED");
  // A newer draft of the published product, through the Local API.
  await payload.update({ collection: products, id: published, draft: true, overrideAccess: true, depth: 0,
    data: { page: { byline: "LEAK newer draft", kicker: "LEAK newer draft" } } as never });
  const draftOnly = await product("draft", true, "LEAK draft only");
  const unapproved = await product("published", false, "LEAK unapproved");
  const unpublishedUnapproved = await product("draft", false, "LEAK draft and unapproved");

  await t.test("with sales closed, an anonymous reader gets nothing (why the read overrides access)", async () => {
    const req = await createLocalReq({}, payload);
    // Read access returns false (adminOrPublishedStatus), which Payload reports as a 403 Forbidden; any other fault fails.
    await assert.rejects(payload.find({ collection: products, depth: 0, overrideAccess: false, req, where: { id: { equals: published } } }),
      (error: { status?: unknown; name?: unknown }) => error.status === 403 && error.name === "Forbidden");
  });

  await t.test("only the published, approved product comes back, at its published version", async () => {
    const documents = await loadProductPageDocuments(payload, [published, draftOnly, unapproved, unpublishedUnapproved, randomUUID(), published]);
    assert.deepEqual(documents.map((document) => String((document as { id?: unknown }).id)), [published]);
    const page = (documents[0] as { page?: { byline?: string; kicker?: string } }).page;
    assert.equal(page?.byline, "PUBLISHED");
    assert.equal(page?.kicker, "PUBLISHED");
    assert.equal(JSON.stringify(documents).includes("LEAK"), false, "no draft, unpublished or unapproved content");
  });

  await t.test("only the page group is read", async () => {
    const [document] = await loadProductPageDocuments(payload, [published]) as Record<string, unknown>[];
    for (const field of ["title", "description", "priceInKRW", "inventory", "images", "publicationApproved"])
      assert.equal(field in document, false, field);
  });
});
