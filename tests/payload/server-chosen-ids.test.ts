import assert from "node:assert/strict";
import test from "node:test";
import type { Config } from "payload";
import { serverChosenIDContext, serverChosenIDsPlugin, stripClientSuppliedID } from "@/payload/server-chosen-ids";

const ID = "11111111-1111-4111-8111-111111111111";
const run = ({ payloadAPI = "REST", operation = "create", data = { id: ID, title: "x" } as unknown, context = {} as Record<string, unknown> } = {}) => {
  const req = { payloadAPI, context };
  const result = stripClientSuppliedID({ args: { data, req }, operation, req, collection: { slug: "c" }, context } as never) as { data: Record<string, unknown> };
  return { data: result.data, context };
};

test("a supplied id is dropped on every API unless the server opted in for that exact id", () => {
  for (const payloadAPI of ["REST", "GraphQL", "local"]) {
    const { data } = run({ payloadAPI });
    assert.equal("id" in data, false, payloadAPI);
    assert.equal(data.title, "x");
  }
  assert.equal("id" in run({ context: serverChosenIDContext("22222222-2222-4222-8222-222222222222") }).data, false, "an opt-in for another id does not count");
});

test("the production initiate shape (REST) keeps the adapter's id once, by explicit opt-in", () => {
  const { data, context } = run({ payloadAPI: "REST", context: serverChosenIDContext(ID) });
  assert.equal(data.id, ID);
  assert.equal("serverChosenID" in context, false, "the opt-in is consumed by its create");
  assert.equal("id" in run({ context }).data, false, "a second create on the same request cannot reuse it");
});

test("other operations and empty data pass through", () => {
  assert.equal(run({ operation: "update" }).data.id, ID);
  assert.deepEqual(run({ data: null }).data, null);
});

test("the guard runs first on every collection, including plugin collections", async () => {
  const existing = () => undefined;
  const config = await serverChosenIDsPlugin({ collections: [{ slug: "a", fields: [] }, { slug: "b", fields: [], hooks: { beforeOperation: [existing] } }] } as unknown as Config);
  for (const collection of config.collections ?? []) assert.equal(collection.hooks?.beforeOperation?.[0], stripClientSuppliedID, collection.slug);
  assert.equal(config.collections?.[1].hooks?.beforeOperation?.[1], existing);
});
