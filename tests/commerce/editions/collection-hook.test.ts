import assert from "node:assert/strict";
import { test } from "node:test";
import { CommerceEditionCollections } from "@/payload/collections/commerce-editions";
import { inCommerceTransaction } from "@/lib/commerce/_shared/transaction";
import { nativeTransactionFixture } from "../core/native-transaction-fixture";

const nativeVariant = CommerceEditionCollections.find((collection) => collection.slug === "variants");
const hook = nativeVariant?.hooks?.beforeChange?.[0];
if (typeof hook !== "function") throw new Error("Native variant beforeChange hook is missing");
const beforeChange = hook;

const originalVariant = { id: "existing-variant", product: "native-parent" };

async function fixture() {
  const lookups: string[] = [];
  const { req } = await nativeTransactionFixture();
  req.payload.db.findOne = (async ({ collection, where }: { collection: string; where: { id: { equals: string } } }) => {
    const id = where.id.equals;
    lookups.push(id);
    return collection === "products" ? { id, commerceModel: "native-edition-v2" }
      : { id, inventory: 10, product: "native-parent" };
  }) as typeof req.payload.db.findOne;
  return {
    lookups,
    run: async (operation: "create" | "update", originalDoc: Record<string, unknown>, product: string) =>
      inCommerceTransaction(req, () => Promise.resolve(beforeChange({ operation, originalDoc, data: { product }, req } as never))),
  };
}

test("native variant create accepts Payload's empty originalDoc", async () => {
  const { run, lookups } = await fixture();
  assert.equal((await run("create", {}, "native-parent")).product, "native-parent");
  assert.deepEqual(lookups, ["native-parent"]);
});

test("native variant update still rejects changing an existing parent", async () => {
  const { run, lookups } = await fixture();
  await assert.rejects(
    run("update", originalVariant, "other-native-parent"),
    { message: "Variant parent identity is immutable", status: 409 },
  );
  assert.deepEqual(lookups, []);
  assert.equal((await run("update", originalVariant, "native-parent")).product, "native-parent");
  assert.deepEqual(lookups, ["native-parent", "existing-variant"]);
});
