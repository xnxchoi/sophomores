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
  const result = await attempt.runAdmitted();
  assert.equal(mode, "recover", "the crash worker must not return a settlement result");
  assert.equal(result.status, 202);
  assert.equal((await result.json()).outcome, "join");
  assert.equal(attempt.reads(), 0);
  const recovered = await effects(db.control, f);
  process.send?.({ type: "recovered", effects: recovered });
});
