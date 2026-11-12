import assert from "node:assert/strict";
import test from "node:test";
import type { PayloadRequest } from "payload";
import { officialSettlementFixture, settlementEffects } from "./official-settlement-fixture";
import { inPaymentTransaction } from "../../../src/lib/commerce/_shared/transaction";

test("unwrapped installed official handler reports success after rejected COMMIT (characterization)", async (t) => {
  const f = await officialSettlementFixture({ commitError: new Error("lost native COMMIT") });
  t.after(f.cleanup);
  assert.equal((await f.run(false)).ok, true);
  assert.deepEqual(f.committed().effects, []);
  assert.deepEqual(f.events.slice(-2), ["commit", "rollback"]);
});

test("native financial wrapper commits official finalizer and same-request hook effects once", async (t) => {
  const f = await officialSettlementFixture();
  t.after(f.cleanup);
  const response = await f.run();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { orderID: "order", transactionID: "attempt" });
  assert.deepEqual(f.committed().effects, settlementEffects);
  assert.equal(f.events.filter((event) => event === "commit").length, 1);
  assert.equal(f.req.transactionID, undefined);
});

for (const applied of [false, true]) {
  test("native COMMIT acknowledgement loss is unknown, including applied=" + applied, async (t) => {
    const f = await officialSettlementFixture({ commitError: new Error("lost acknowledgement"), commitAppliedBeforeError: applied });
    t.after(f.cleanup);
    await assert.rejects(f.run(), /outcome unknown/i);
    assert.deepEqual(f.committed().effects, applied ? settlementEffects : []);
    await assert.rejects(inPaymentTransaction(f.req, async () => "retry"), /outcome unknown/i);
  });
}

for (const name of settlementEffects) {
  test("fault after official/synthetic hook effect " + name + " rolls back without successful partial result", async (t) => {
    const f = await officialSettlementFixture({ afterEffect: (effect) => { if (effect === name) throw new Error("injected " + name); } });
    t.after(f.cleanup);
    const response = await f.run();
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { message: "Error confirming order." });
    assert.deepEqual(f.committed().effects, []);
    assert.equal(f.events.includes("commit"), false);
    assert.equal(f.events.at(-1), "rollback");
  });
}

for (const kind of ["request", "session", "replacement", "registry", "adapter", "payload", "database"] as const) {
  test("stolen " + kind + " after order creation cannot escape into later official effects", async (t) => {
    const f = await officialSettlementFixture({ afterEffect: (name, req) => {
      if (name !== "order") return;
      const id = String(req.transactionID);
      if (kind === "request") req.transactionID = "foreign";
      if (kind === "session") delete f.adapter.sessions[id];
      if (kind === "replacement") f.adapter.sessions[id] = { db: f.adapter.drizzle as unknown as typeof f.adapter.sessions[string]["db"], resolve: async () => {}, reject: async () => {} };
      if (kind === "registry") f.adapter.sessions = {};
      if (kind === "adapter") req.payload.db = {} as typeof req.payload.db;
      if (kind === "payload") req.payload = { ...req.payload } as unknown as PayloadRequest["payload"];
      if (kind === "database") f.adapter.sessions[id].db = f.adapter.drizzle as unknown as typeof f.adapter.sessions[string]["db"];
    } });
    t.after(f.cleanup);
    await assert.rejects(f.run(), /outcome unknown/i);
    assert.deepEqual(f.committed().effects, []);
    assert.equal(f.events.includes("commit"), false);
    if (kind === "request") assert.equal(f.req.transactionID, "foreign");
    if (kind === "replacement") assert.equal(Object.keys(f.adapter.sessions).length, 1, "cleanup must preserve the replacement-owned session");
  });
}

test("failed official rollback remains unknown, never a known safe rejection", async (t) => {
  const f = await officialSettlementFixture({ rollbackError: new Error("rollback lost"),
    afterEffect: (name) => { if (name === "order") throw new Error("order hook failed"); } });
  t.after(f.cleanup);
  await assert.rejects(f.run(), /outcome unknown/i);
});
