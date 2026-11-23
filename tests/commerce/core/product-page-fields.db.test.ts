import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import type { CollectionSlug } from "payload";
import { proofTargets } from "../../support/proof-ports.mjs";

// Product page content (products.page, owner 23 Nov) on real PostgreSQL: a published, approved product returns every
// field to an anonymous reader through the Local API with overrideAccess false; a newer draft, a draft-only product and
// an unapproved product never reach that reader; product versions (drafts included) reach a super admin only, never a
// member or an anonymous reader; and the field checks refuse bad values. Read depth is 0: the fixture's
// media collection is not public, and uploads round-trip as their media IDs.
test("product page content on real PostgreSQL", {
  skip: process.env.PRODUCT_PAGE_DATABASE_TESTS !== "1", timeout: 180_000,
}, async (t) => {
  const target = proofTargets.productPage;
  const { openProofDatabase, isolateTransport, seedCheckoutCart } = await import("./payment-postgres-fixture");
  const { createLocalReq } = await import("payload");
  isolateTransport(t, target.port);
  const { payload, close } = await openProofDatabase(true, new Set(), target);
  t.after(close);
  const products = "products" as CollectionSlug;
  const now = new Date().toISOString();
  const media = async () => {
    const id = randomUUID();
    await payload.db.create({ collection: "media" as CollectionSlug, customID: id, data: { filename: `${id}.png`, mimeType: "image/png", createdAt: now, updatedAt: now } });
    return id;
  };
  const text = (value: string, format = 0) => ({ type: "text", text: value, format, detail: 0, mode: "normal", style: "", version: 1 });
  const paragraph = (...children: unknown[]) => ({ type: "paragraph", children, direction: null, format: "", indent: 0, version: 1, textFormat: 0, textStyle: "" });
  const prose = (...children: unknown[]) => ({ root: { type: "root", children, direction: null, format: "", indent: 0, version: 1 } });
  const anonymous = async () => createLocalReq({}, payload);
  const readPage = async (id: string, draft = false) => {
    const doc = await payload.findByID({ collection: products, id, depth: 0, draft, overrideAccess: false, req: await anonymous() }) as { page?: Record<string, unknown> };
    return doc.page;
  };
  // Array rows get server IDs; compare without them.
  const withoutIDs = (value: unknown): unknown => Array.isArray(value) ? value.map(withoutIDs)
    : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).filter(([key]) => key !== "id").map(([key, inner]) => [key, withoutIDs(inner)])) : value;

  const seeded = await seedCheckoutCart(payload);
  const [stageArt, gallery, ...book] = await Promise.all(Array.from({ length: 10 }, media));
  const page = {
    shelfTitle: "PREVIEW shelf", shelfOrder: 2, kicker: "Book", byline: "by PREVIEW Author", stageArt,
    longDescription: prose(paragraph(text("PREVIEW description, "), text("in italics", 2))),
    about: { heading: "About the author", body: prose(paragraph(text("PREVIEW about."),
      { type: "link", fields: { linkType: "custom", url: "https://example.com/author", newTab: true }, children: [text("site")], direction: null, format: "", indent: 0, version: 3 })),
      links: [{ label: "Site", url: "https://example.com/author" }] },
    formats: [{ label: "Ebook", url: "https://example.com/ebook", note: "Coming later", effect: "hologram" }, { label: "Audiobook", url: null, note: null, effect: "radio" }],
    praise: [{ quote: "PREVIEW praise.", name: "A Reader", role: "Reader", url: "https://example.com/review" }],
    details: { trimWidthMM: 158.8, trimHeightMM: 235, spineMM: 22.5, weightG: 540, pages: 320, words: 90000 },
    typefaces: [{ name: "PREVIEW Serif", foundry: "PREVIEW Foundry" }],
    materials: [{ item: "PREVIEW paper" }], techniques: [{ item: "PREVIEW foil" }],
    gallery: [{ image: gallery, caption: "PREVIEW spread" }],
    book: { coverDiffuse: book[0], coverBumpBase: book[1], coverBumpCustom: book[2], coverFoil: book[3], coverGloss: book[4], coverGlitter: book[5],
      pages: [{ front: book[6], back: book[7] }] },
  };

  await t.test("a published product returns every page field to an anonymous reader", async () => {
    await payload.update({ collection: products, id: seeded.productID, data: { page, _status: "published" } as never, overrideAccess: true, depth: 0 });
    assert.deepEqual(withoutIDs(await readPage(seeded.productID)), withoutIDs(page));
    const listed = await payload.find({ collection: products, depth: 0, overrideAccess: false, req: await anonymous(), where: { id: { equals: seeded.productID } } });
    assert.deepEqual(withoutIDs((listed.docs[0] as { page?: unknown }).page), withoutIDs(page), "the same through find");
  });

  await t.test("a newer draft never reaches the anonymous reader", async () => {
    await payload.update({ collection: products, id: seeded.productID, draft: true, overrideAccess: true, depth: 0,
      data: { page: { ...page, byline: "DRAFT ONLY", praise: [{ quote: "DRAFT ONLY", name: "Draft" }] } } as never });
    for (const draft of [false, true]) {
      const seen = await readPage(seeded.productID, draft).catch(() => undefined);
      assert.notEqual(seen?.byline, "DRAFT ONLY", `draft: ${draft}`);
      assert.equal(JSON.stringify(seen ?? {}).includes("DRAFT ONLY"), false, `draft: ${draft}`);
    }
    const staff = await payload.findByID({ collection: products, id: seeded.productID, depth: 0, draft: true, overrideAccess: true }) as { page?: { byline?: string } };
    assert.equal(staff.page?.byline, "DRAFT ONLY", "staff still see their draft");
  });

  await t.test("versions (drafts included) are for a super admin only, never a member", async () => {
    const versions = (req: Awaited<ReturnType<typeof anonymous>>) =>
      payload.findVersions({ collection: products, depth: 0, overrideAccess: false, req, where: { parent: { equals: seeded.productID } } });
    const all = await payload.findVersions({ collection: products, depth: 0, overrideAccess: true, where: { parent: { equals: seeded.productID } } });
    const draft = all.docs.find((doc) => (doc.version as { page?: { byline?: string } }).page?.byline === "DRAFT ONLY");
    assert.ok(draft, "the draft version exists");
    const forbidden = (error: unknown) => (error as { name?: string }).name === "Forbidden";
    // An ordinary member is a Payload user (Better Auth); anonymous readers are refused too.
    for (const req of [await createLocalReq({ user: seeded.user }, payload), await anonymous()]) {
      await assert.rejects(versions(req), forbidden, "the versions list");
      await assert.rejects(payload.findVersionByID({ collection: products, id: String(draft.id), depth: 0, overrideAccess: false, req }), forbidden, "a version by ID");
    }
    const superAdmin = await createLocalReq({ user: { id: randomUUID(), collection: "admins", role: "admin", _strategy: "staff-better-auth" } as never }, payload);
    const listed = await versions(superAdmin);
    assert.equal(listed.docs.some((doc) => String(doc.id) === String(draft.id)), true, "a super admin lists the draft");
    const byID = await payload.findVersionByID({ collection: products, id: String(draft.id), depth: 0, overrideAccess: false, req: superAdmin });
    assert.equal((byID.version as { page?: { byline?: string } }).page?.byline, "DRAFT ONLY", "a super admin reads it by ID");
  });

  await t.test("a draft-only product and an unapproved product are out of reach", async () => {
    for (const data of [{ _status: "draft", publicationApproved: true }, { _status: "published", publicationApproved: false }]) {
      const id = randomUUID();
      await payload.db.create({ collection: products, customID: id, data: { title: "Hidden", description: "Hidden", ...data,
        inventory: 0, reservedQuantity: 0, page: { byline: "HIDDEN" }, createdAt: now, updatedAt: now } });
      const seen = await readPage(id).catch(() => undefined);
      assert.equal(seen, undefined, JSON.stringify(data));
      const listed = await payload.find({ collection: products, depth: 0, overrideAccess: false, req: await anonymous(), where: { id: { equals: id } } });
      assert.equal(listed.docs.length, 0, JSON.stringify(data));
    }
  });

  await t.test("the field checks refuse bad values", async () => {
    for (const bad of [
      { about: { links: [{ label: "Plain", url: "http://example.com" }] } },
      { formats: [{ label: "Bad", url: "javascript:alert(1)" }] },
      { formats: Array.from({ length: 5 }, (_, n) => ({ label: `F${n}` })) },
      { details: { spineMM: 1.25 } },
      { details: { pages: 1.5 } },
      { shelfOrder: 1.5 },
      { kicker: "x".repeat(41) },
      { praise: [{ quote: "x".repeat(601), name: "Long" }] },
    ]) {
      await assert.rejects(payload.update({ collection: products, id: seeded.productID, data: { page: bad } as never, overrideAccess: true, depth: 0 }),
        (error: unknown) => (error as { name?: string }).name === "ValidationError", JSON.stringify(bad).slice(0, 80));
    }
    assert.deepEqual(withoutIDs(await readPage(seeded.productID)), withoutIDs(page), "the published page is unchanged");
  });
});
