import assert from "node:assert/strict";
import test from "node:test";

test("I0 isolated PostgreSQL payment durability", {
  skip: process.env.COMMERCE_PAYLOAD_DATABASE_TESTS !== "1", timeout: 180_000,
}, async (t) => {
  const { isolateTransport, openProofDatabase, seedAttempt, confirmation, effects } = await import("./payment-postgres-fixture");
  isolateTransport(t);
  const db = await openProofDatabase();
  t.after(db.close);
  t.diagnostic(`PostgreSQL ${db.version}; loopback only; provider evidence synthetic`);
  const f = await seedAttempt(db.payload);
  const before = await effects(db.pool, f);
  assert.deepEqual(before, { orders: 0, stock: 10, reserved: 1, allowance: 0, admissions: 0, fulfillment: 0, status: "pending" });
  const attempt = await confirmation(db.payload, f);
  const response = await attempt.run();
  assert.equal(response.status, 200, "Native acknowledgement must yield successful official settlement");
  const after = await effects(db.pool, f);
  t.diagnostic(`committed effects: ${JSON.stringify(after)}`);
  assert.deepEqual(after, { orders: 1, stock: 9, reserved: 0, allowance: 1, admissions: 1, fulfillment: 1, status: "succeeded" });
  const retry = await confirmation(db.payload, f);
  assert.equal((await retry.run()).status, 200);
  assert.deepEqual(await effects(db.pool, f), after, "Retry must not duplicate any effect");
});
