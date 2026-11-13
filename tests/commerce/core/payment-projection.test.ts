import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { inPaymentTransaction } from "../../../src/lib/commerce/_shared/transaction";
import { nativeTransactionFixture } from "./native-transaction-fixture";

test("installed findByID transaction-only adapter projection retains native ownership", async (t) => {
  const f = await nativeTransactionFixture();
  t.after(f.cleanup);
  let reads = 0;
  f.adapter.findOne = (async ({ req }: { req: Partial<PayloadRequest> }) => {
    reads++;
    assert.deepEqual(Reflect.ownKeys(req), ["transactionID"]);
    assert.equal(req.transactionID, f.req.transactionID);
    return { id: "event" };
  }) as typeof f.adapter.findOne;
  Object.assign(f.req.payload, { findByID: async ({ req }: { req: PayloadRequest }) => {
    // Exact installed 3.92.1 findByID.js:101-110 argument projection.
    return req.payload.db.findOne({ collection: "commerce-events" as never,
      where: { id: { equals: "event" } }, req: { transactionID: req.transactionID } });
  } });
  const result = await inPaymentTransaction(f.req, () => f.req.payload.findByID({
    collection: "commerce-events" as never, id: "event", req: f.req,
  }));
  assert.deepEqual(result, { id: "event" });
  assert.equal(reads, 1);
  assert.deepEqual(f.events, ["begin", "commit"]);
});

for (const kind of ["mismatch", "absent", "undefined", "empty", "extra", "symbol", "hidden", "inherited", "local-api", "lost-id", "lost-session"] as const) {
  test(`payment adapter projection rejects ${kind} before underlying effects`, async (t) => {
    const f = await nativeTransactionFixture();
    t.after(f.cleanup);
    let calls = 0;
    f.adapter.findOne = (async () => { calls++; return { id: "event" }; }) as typeof f.adapter.findOne;
    Object.assign(f.req.payload, { findByID: async () => { calls++; return { id: "event" }; } });
    await assert.rejects(inPaymentTransaction(f.req, async () => {
      await f.capture();
      const transactionID = f.req.transactionID;
      const projected = kind === "absent" ? {} : kind === "inherited" ? Object.create({ transactionID }) as object
        : { transactionID: kind === "mismatch" ? "foreign" : kind === "undefined" ? undefined : kind === "empty" ? "" : transactionID,
          ...(kind === "extra" ? { context: {} } : {}), ...(kind === "symbol" ? { [Symbol("extra")]: true } : {}) };
      if (kind === "hidden") Object.defineProperty(projected, "extra", { value: true });
      if (kind === "lost-id") delete f.req.transactionID;
      if (kind === "lost-session") delete f.adapter.sessions[String(transactionID)];
      if (kind === "local-api") {
        await f.req.payload.findByID({ collection: "commerce-events" as never, id: "event", req: projected });
      } else {
        await f.req.payload.db.findOne({ collection: "commerce-events" as never,
          where: { id: { equals: "event" } }, req: projected });
      }
    }), /outcome unknown/);
    assert.equal(calls, 0);
    assert.deepEqual(f.events, ["begin", "rollback"]);
  });
}
