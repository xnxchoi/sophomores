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

for (const kind of ["mismatch", "absent", "undefined", "empty", "extra", "symbol", "hidden", "inherited", "local-api", "lost-id", "lost-session",
  "getter", "flipping-getter", "proxy-ownKeys", "proxy-descriptor", "proxy-get", "promise", "number", "non-enumerable", "custom-prototype"] as const) {
  test(`payment adapter projection rejects ${kind} before underlying effects`, async (t) => {
    const f = await nativeTransactionFixture();
    t.after(f.cleanup);
    let calls = 0;
    f.adapter.findOne = (async () => { calls++; return { id: "event" }; }) as typeof f.adapter.findOne;
    Object.assign(f.req.payload, { findByID: async () => { calls++; return { id: "event" }; } });
    await assert.rejects(inPaymentTransaction(f.req, async () => {
      await f.capture();
      const transactionID = f.req.transactionID;
      let projected = kind === "absent" ? {} : kind === "inherited" ? Object.create({ transactionID }) as object
        : { transactionID: kind === "mismatch" ? "foreign" : kind === "undefined" ? undefined : kind === "empty" ? "" : transactionID,
          ...(kind === "extra" ? { context: {} } : {}), ...(kind === "symbol" ? { [Symbol("extra")]: true } : {}) };
      if (kind === "hidden") Object.defineProperty(projected, "extra", { value: true });
      if (kind === "getter" || kind === "flipping-getter") {
        let reads = 0;
        projected = Object.defineProperty({}, "transactionID", { enumerable: true,
          get: () => kind === "getter" || reads++ === 0 ? transactionID : undefined });
      }
      if (kind === "proxy-ownKeys") projected = new Proxy({ transactionID }, { ownKeys: () => ["transactionID"] });
      if (kind === "proxy-descriptor") projected = new Proxy({ transactionID }, {
        getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true, writable: true, value: transactionID }),
      });
      if (kind === "proxy-get") projected = new Proxy({ transactionID }, { get: () => transactionID });
      if (kind === "promise") projected = { transactionID: Promise.resolve(transactionID) };
      if (kind === "number") projected = { transactionID: 123 };
      if (kind === "non-enumerable") projected = Object.defineProperty({}, "transactionID", { value: transactionID });
      if (kind === "custom-prototype") projected = Object.assign(Object.create({ other: true }) as object, { transactionID });
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

test("null-prototype transaction projection is accepted and replaced", async (t) => {
  const f = await nativeTransactionFixture();
  t.after(f.cleanup);
  await inPaymentTransaction(f.req, async () => {
    await f.capture();
    const projected = Object.assign(Object.create(null) as object, { transactionID: f.req.transactionID });
    f.adapter.findOne = (async ({ req }: { req: Partial<PayloadRequest> }) => {
      assert.equal(req === projected, false);
      assert.equal(req.transactionID, f.req.transactionID);
      return { id: "event" };
    }) as typeof f.adapter.findOne;
    await f.req.payload.db.findOne({ collection: "commerce-events" as never, req: projected });
  });
  assert.deepEqual(f.events, ["begin", "commit"]);
});

test("adapter receives an owned snapshot despite caller mutation and reads input.req once", async (t) => {
  const f = await nativeTransactionFixture();
  t.after(f.cleanup);
  await inPaymentTransaction(f.req, async () => {
    await f.capture();
    const transactionID = f.req.transactionID;
    const projected = { transactionID };
    let enter!: () => void;
    let release!: () => void;
    const entered = new Promise<void>((resolve) => { enter = resolve; });
    const released = new Promise<void>((resolve) => { release = resolve; });
    f.adapter.findOne = (async ({ req }: { req: Partial<PayloadRequest> }) => {
      enter();
      await released;
      assert.equal(req === projected, false);
      assert.equal(req.transactionID, transactionID);
      return { id: "event" };
    }) as typeof f.adapter.findOne;
    let reads = 0;
    const operation = f.req.payload.db.findOne({ collection: "commerce-events" as never,
      get req() { reads++; return projected; } });
    await entered;
    projected.transactionID = "foreign";
    release();
    await operation;
    assert.equal(reads, 1);
  });
  assert.deepEqual(f.events, ["begin", "commit"]);
});

test("identity path neutralizes a flipping outer req getter while forwarding the owned request itself", async (t) => {
  const f = await nativeTransactionFixture();
  t.after(f.cleanup);
  f.adapter.findOne = (async ({ req }: { req: Partial<PayloadRequest> }) => {
    assert.equal(req === f.req, true);
    return { id: "event" };
  }) as typeof f.adapter.findOne;
  let reads = 0;
  await inPaymentTransaction(f.req, async () => {
    await f.capture();
    await f.req.payload.db.findOne({ collection: "commerce-events" as never,
      get req() { return reads++ === 0 ? f.req : { transactionID: "foreign" }; } });
  });
  assert.equal(reads, 1);
  assert.deepEqual(f.events, ["begin", "commit"]);
});
