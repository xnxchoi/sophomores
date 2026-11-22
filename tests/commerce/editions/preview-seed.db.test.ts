import assert from "node:assert/strict";
import test from "node:test";
import { createLocalReq } from "payload";
import { seedPreviewEditionOffers } from "../../../scripts/preview/edition-offer-fixture";
import { loadCommerceEditionOffer } from "@/lib/commerce/editions";
import { isolateTransport, openProofDatabase } from "../core/payment-postgres-fixture";

const target = { container: "sphmrs-edition-seed-proof", port: 55523, database: "sphmrs_edition_seed_proof" };

test("preview editions seed through Payload once and provide all three E1 offers", {
  skip: process.env.EDITION_SEED_DATABASE_TESTS !== "1", timeout: 30_000,
}, async (t) => {
  isolateTransport(t, target.port);
  const db = await openProofDatabase(true, new Set(), target);
  t.after(db.close);
  const req = await createLocalReq({}, db.payload);
  const local = { req, overrideAccess: true, depth: 0 } as const;
  const media = await db.payload.create({ ...local, collection: "media", data: { alt: "Synthetic preview image" } as never,
    file: { data: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV2kAAAAASUVORK5CYII=", "base64"),
      mimetype: "image/png", name: "synthetic.png", size: 68 } });
  const type = await db.payload.create({ ...local, collection: "variantTypes", data: { label: "Edition", name: "edition" } });
  const deps = { media: media.id, editionType: type.id };
  const result = await seedPreviewEditionOffers(req, deps);
  assert.equal(result.length, 3);
  const values = async () => Promise.all(result.map((entry) => loadCommerceEditionOffer(db.payload, entry.productID, req)));
  const before = await values();
  assert.deepEqual(before.map((offer) => [offer?.title, offer?.priceKRW, offer?.maximumQuantity, offer?.editionEntitlements, offer?.purchaseReady]), [
    ["Book only", 35000, 1, { membershipSignet: false, freeLaunchTicket: false }, false],
    ["\u00e9dition personnelle", 82000, 1, { membershipSignet: true, freeLaunchTicket: true }, false],
    ["Premium", 329000, 1, { membershipSignet: true, freeLaunchTicket: true }, false],
  ]);
  assert.deepEqual(await seedPreviewEditionOffers(req, deps), result);
  assert.deepEqual(await values(), before, "idempotent rerun never rewrites timestamps or facts");
  const first = before[0];
  assert.ok(first);
  await db.payload.update({ ...local, collection: "variants", id: first.edition.variantID, data: { priceInKRW: 1 } });
  await assert.rejects(seedPreviewEditionOffers(req, deps), /Unexpected existing edition SKU/);
  assert.equal((await db.payload.findByID({ ...local, collection: "variants", id: first.edition.variantID })).priceInKRW, 1);
});
