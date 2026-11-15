import assert from "node:assert/strict";
import test from "node:test";
import type { Config } from "payload";
import { serverChosenIDsPlugin, stripClientSuppliedID } from "@/payload/server-chosen-ids";

const run = (payloadAPI: string, operation = "create", data: unknown = { id: "11111111-1111-4111-8111-111111111111", title: "x" }) =>
  stripClientSuppliedID({ args: { data }, operation, req: { payloadAPI }, collection: { slug: "c" }, context: {} } as never) as { data: Record<string, unknown> };

test("REST and GraphQL creates never choose their own id", () => {
  for (const api of ["REST", "GraphQL"]) {
    const { data } = run(api);
    assert.equal("id" in data, false, api);
    assert.equal(data.title, "x");
  }
});

test("server Local API creates, and other operations, keep what they were given", () => {
  assert.equal(run("local").data.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(run("REST", "update").data.id, "11111111-1111-4111-8111-111111111111");
  assert.deepEqual(run("REST", "create", null), { data: null });
});

test("the guard runs first on every collection, including plugin collections", async () => {
  const existing = () => undefined;
  const config = await serverChosenIDsPlugin({ collections: [{ slug: "a", fields: [] }, { slug: "b", fields: [], hooks: { beforeOperation: [existing] } }] } as unknown as Config);
  for (const collection of config.collections ?? []) assert.equal(collection.hooks?.beforeOperation?.[0], stripClientSuppliedID, collection.slug);
  assert.equal(config.collections?.[1].hooks?.beforeOperation?.[1], existing);
});
