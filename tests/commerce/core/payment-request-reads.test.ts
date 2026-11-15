import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { inPaymentTransaction } from "../../../src/lib/commerce/_shared/transaction";
import { nativeTransactionFixture } from "./native-transaction-fixture";

// The ecommerce plugin's own initiate handler reads each cart product with
// payload.findByID({ ... }) and no req. Inside the owned payment transaction such
// a read now runs on the owned request; a request-less write is still refused.
test("a request-less official read runs inside the owned payment transaction", async (t) => {
  const f = await nativeTransactionFixture();
  t.after(f.cleanup);
  const seen: unknown[] = [];
  Object.assign(f.req.payload, { findByID: async ({ req }: { req?: PayloadRequest }) => { seen.push(req); return { id: "product" }; } });
  await inPaymentTransaction(f.req, async () => {
    await f.capture();
    assert.deepEqual(await f.req.payload.findByID({ collection: "products" as never, id: "product", depth: 0 }), { id: "product" });
  });
  assert.equal(seen.length, 1);
  assert.equal(seen[0] === f.req, true, "the read joined the owned request");
  assert.deepEqual(f.events, ["begin", "commit"]);
});

test("a request-less write still contaminates and rolls the payment back", async (t) => {
  const f = await nativeTransactionFixture();
  t.after(f.cleanup);
  let writes = 0;
  Object.assign(f.req.payload, { create: async () => { writes++; return { id: "row" }; } });
  await assert.rejects(inPaymentTransaction(f.req, async () => {
    await f.capture();
    await f.req.payload.create({ collection: "transactions" as never, data: {} as never });
  }), /outcome unknown/);
  assert.equal(writes, 0);
  assert.deepEqual(f.events, ["begin", "rollback"]);
});
