import assert from "node:assert/strict";
import test from "node:test";
import { confirmation, effects, isolateTransport, nativeProgress, openProofDatabase, type Attempt } from "./payment-postgres-fixture";

// Deliberately not *.test.ts: only the gated parent starts this application process.
test("isolated payment application worker", {
  skip: process.env.COMMERCE_PAYLOAD_DATABASE_TESTS !== "1" || !process.send,
  timeout: 45_000,
}, async (t) => {
  isolateTransport(t);
  const mode = process.env.I0_PROOF_WORKER;
  assert.ok(mode === "crash" || mode === "recover");
  const f = JSON.parse(process.env.I0_PROOF_ATTEMPT ?? "null") as Attempt;
  assert.ok(f?.transactionID && f.productID && f.customerID);
  const db = await openProofDatabase(false);
  t.after(async () => { await db.close(); process.disconnect?.(); });
  const attempt = await confirmation(db.payload, f, mode === "crash" ? {
    afterEffect: async (collection, req) => {
      if (collection !== "orders") return;
      const progress = await nativeProgress(req, f);
      assert.deepEqual({ ...progress, pid: 0 }, { pid: 0, orders: 1, stock: 10, allowance: 0, admissions: 0 });
      process.send?.({ type: "parked", progress });
      await new Promise<void>(() => { /* Parent SIGKILL interrupts before native COMMIT. */ });
    },
  } : {});
  assert.equal((await attempt.run()).status, 200);
  const recovered = await effects(db.pool, f);
  const retry = await confirmation(db.payload, f);
  assert.equal((await retry.run()).status, 200);
  assert.deepEqual(await effects(db.pool, f), recovered);
  process.send?.({ type: "recovered", effects: recovered });
});
