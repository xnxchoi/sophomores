import assert from "node:assert/strict";
import test from "node:test";
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload";
import { inCommerceTransaction, inPaymentTransaction, updateCommerce } from "../../../src/lib/commerce/_shared/transaction";
import { nativeTransactionFixture } from "./native-transaction-fixture";

test("installed lifted COMMIT fulfills despite a native rejection (characterization)", async (t) => {
  const f = await nativeTransactionFixture({ commitError: new Error("COMMIT acknowledgement lost") });
  t.after(f.cleanup);
  await initTransaction(f.req);
  await f.capture();
  await commitTransaction(f.req);
  assert.deepEqual(f.events, ["begin", "commit", "rollback"]);
  assert.equal(f.req.transactionID, undefined);
  assert.equal(Object.keys(f.adapter.sessions).length, 0);
});

test("installed kill fulfills despite native ROLLBACK rejection (characterization)", async (t) => {
  const f = await nativeTransactionFixture({ rollbackError: new Error("ROLLBACK rejected") });
  t.after(f.cleanup);
  await initTransaction(f.req);
  await f.capture();
  await killTransaction(f.req);
  assert.deepEqual(f.events, ["begin", "rollback"]);
  assert.equal(f.req.transactionID, undefined);
});

test("missing session commit and rollback are no-ops, not acknowledgements (characterization)", async () => {
  const f = await nativeTransactionFixture();
  await f.adapter.commitTransaction("absent");
  await f.adapter.rollbackTransaction("absent");
  assert.deepEqual(f.events, []);
});

test("commerce must not return a known receipt when native COMMIT rejects", async (t) => {
  const f = await nativeTransactionFixture({ commitError: new Error("COMMIT rejected") });
  t.after(f.cleanup);
  await assert.rejects(inPaymentTransaction(f.req, async () => {
    await f.capture();
    return { outcome: "confirmed", orderID: "canonical-order" };
  }), /outcome unknown/i);
});

test("commerce must not expose a known domain rejection when native ROLLBACK rejects", async (t) => {
  const f = await nativeTransactionFixture({ rollbackError: new Error("ROLLBACK rejected") });
  t.after(f.cleanup);
  await assert.rejects(inPaymentTransaction(f.req, async () => {
    await f.capture();
    throw new Error("known not-paid rejection");
  }), /outcome unknown/i);
});

for (const operation of ["commitTransaction", "rollbackTransaction"] as const) {
  test("commerce must reject session consumption by inner " + operation, async (t) => {
    const f = await nativeTransactionFixture();
    t.after(f.cleanup);
    await assert.rejects(inPaymentTransaction(f.req, async () => {
      await f.capture();
      await f.adapter[operation](String(await f.req.transactionID));
      return { outcome: "confirmed" };
    }), /ownership|outcome unknown/i);
  });
}

test("commerce must stop before a Local API pool fallback after request ownership loss", async (t) => {
  const f = await nativeTransactionFixture();
  t.after(f.cleanup);
  let outsideWrites = 0;
  f.req.payload.update = (async () => { outsideWrites++; return { id: "order" }; }) as typeof f.req.payload.update;
  await assert.rejects(inPaymentTransaction(f.req, async () => {
    await f.capture();
    delete f.req.transactionID;
    await updateCommerce(f.req, "orders", "order", { status: "processing" });
    return { outcome: "confirmed" };
  }), /ownership|outcome unknown/i);
  assert.equal(outsideWrites, 0);
});

test("non-claim ordinary commerce remains an explicit unrepaired legacy boundary", async (t) => {
  const f = await nativeTransactionFixture({ commitError: new Error("COMMIT rejected") });
  t.after(f.cleanup);
  assert.equal(await inCommerceTransaction(f.req, async () => {
    await f.capture();
    return "legacy-result";
  }), "legacy-result");
  assert.deepEqual(f.events, ["begin", "commit", "rollback"]);
});

for (const kind of ["inherited", "disabled-factory", "disabled-options", "foreign-method"] as const) {
  test("financial ownership fails closed before mutations for " + kind, async () => {
    const f = await nativeTransactionFixture({ disabled: kind === "disabled-factory" });
    if (kind === "inherited") f.req.transactionID = "foreign";
    if (kind === "disabled-options") f.adapter.transactionOptions = false;
    if (kind === "foreign-method") f.adapter.beginTransaction = async () => "invented";
    let mutations = 0;
    await assert.rejects(inPaymentTransaction(f.req, async () => { mutations++; }));
    assert.equal(mutations, 0);
    assert.deepEqual(f.events, []);
    if (kind === "inherited") assert.equal(f.req.transactionID, "foreign");
  });
}

test("caught nested financial ownership attempts contaminate the outer owner", async () => {
  const f = await nativeTransactionFixture();
  await assert.rejects(inPaymentTransaction(f.req, async () => {
    await assert.rejects(inPaymentTransaction(f.req, async () => "nested"));
    return "must not commit";
  }), /outcome unknown/);
  assert.deepEqual(f.events, ["begin", "rollback"]);
});

test("loss of request ownership during native COMMIT cannot publish a receipt", async () => {
  const f = await nativeTransactionFixture({ onQuery: (kind) => { if (kind === "commit") f.req.transactionID = "foreign"; } });
  await assert.rejects(inPaymentTransaction(f.req, async () => "receipt"), /outcome unknown/);
  assert.equal(f.req.transactionID, "foreign");
});

test("a swallowed native COMMIT rejection cannot impersonate an undefined successful result", async () => {
  const f = await nativeTransactionFixture({ commitError: new Error("COMMIT failed") });
  const original = f.adapter.drizzle.transaction.bind(f.adapter.drizzle);
  f.adapter.drizzle = Object.assign(Object.create(f.adapter.drizzle), {
    transaction: (...args: Parameters<typeof original>) => original(...args).catch(() => undefined),
  });
  await assert.rejects(inPaymentTransaction(f.req, async () => undefined), /outcome unknown/);
  assert.deepEqual(f.events, ["begin", "commit", "rollback"]);
});

test("installed createLocalReq rebinding retains the protected same-request Payload boundary", async () => {
  const f = await nativeTransactionFixture();
  const payload = f.req.payload;
  Object.assign(f.req, { i18n: { t: () => "" }, payloadDataLoader: {}, headers: new Headers() });
  Object.assign(payload, { config: { serverURL: "http://localhost:3129", admin: { user: "users" } },
    update: async () => {
      const local = await createLocalReq({ req: f.req }, payload);
      assert.equal(local === f.req, true);
      assert.equal(local.payload === payload, false, "Payload's original-instance rebinding must not remove the guard");
      return { id: "order" };
    },
  });
  await inPaymentTransaction(f.req, () => updateCommerce(f.req, "orders", "order", {}));
  assert.equal(f.req.payload === payload, true);
  assert.deepEqual(f.events, ["begin", "commit"]);
});

test("captured scoped API functions expire with their native transaction owner", async () => {
  const f = await nativeTransactionFixture();
  let writes = 0;
  Object.assign(f.req.payload, { update: async () => { writes++; return { id: "order" }; } });
  let captured: typeof f.req.payload.update | undefined;
  await inPaymentTransaction(f.req, async () => { captured = f.req.payload.update; });
  assert.ok(captured);
  await assert.rejects(captured({ collection: "orders", id: "order", data: {}, req: f.req }), /owner expired/);
  assert.equal(writes, 0);
});
