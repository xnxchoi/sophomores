import assert from "node:assert/strict";
import { test } from "node:test";
import { CommerceEditionCollections } from "@/payload/collections/commerce-editions";

const nativeVariant = CommerceEditionCollections.find((collection) => collection.slug === "variants");
const hook = nativeVariant?.hooks?.beforeChange?.[0];
if (typeof hook !== "function") throw new Error("Native variant beforeChange hook is missing");
const beforeChange = hook;

const originalVariant = { id: "existing-variant", product: "native-parent" };

function fixture() {
  const lookups: string[] = [];
  const req = {
    payload: {
      async findByID({ id }: { id: string }) {
        lookups.push(id);
        return { id, commerceModel: "native-edition-v2" };
      },
    },
  };
  return {
    lookups,
    run: async (operation: "create" | "update", originalDoc: Record<string, unknown>, product: string) =>
      beforeChange({ operation, originalDoc, data: { product }, req } as never),
  };
}

test("native variant create accepts Payload's empty originalDoc", async () => {
  const { run, lookups } = fixture();
  assert.equal((await run("create", {}, "native-parent")).product, "native-parent");
  assert.deepEqual(lookups, ["native-parent"]);
});

test("native variant update still rejects changing an existing parent", async () => {
  const { run, lookups } = fixture();
  await assert.rejects(
    run("update", originalVariant, "other-native-parent"),
    { message: "Variant parent identity is immutable", status: 409 },
  );
  assert.deepEqual(lookups, []);
  assert.equal((await run("update", originalVariant, "native-parent")).product, "native-parent");
  assert.deepEqual(lookups, ["native-parent"]);
});
