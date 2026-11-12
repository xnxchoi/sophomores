import assert from "node:assert/strict";
import test from "node:test";
import { APIError } from "payload";
import { inPaymentEndpoint } from "../../../src/lib/commerce/_shared/transaction";
import { nativeTransactionFixture } from "./native-transaction-fixture";

// Official 5xx responses, like 4xx, remain the official handler's response after
// acknowledged rollback; only an unproved completion becomes outcome-unknown.
for (const status of [400, 401, 403, 404, 409, 500, 503]) {
  test("official " + status + " preserves its exact response after acknowledged rollback", async (t) => {
    const f = await nativeTransactionFixture();
    const logs: unknown[] = [];
    t.mock.method(f.req.payload.logger, "error", (entry: unknown) => { logs.push(entry); });
    const response = Response.json({ message: "Official rejection", detail: "must-not-log-sensitive-body" },
      { status, headers: { "x-official-response": "preserved" } });
    const returned = await inPaymentEndpoint(f.req, () => response);
    assert.equal(returned === response, true);
    assert.equal(returned.status, status);
    assert.equal(returned.headers.get("x-official-response"), "preserved");
    assert.deepEqual(await returned.json(), { message: "Official rejection", detail: "must-not-log-sensitive-body" });
    assert.deepEqual(f.events, ["begin", "rollback"]);
    assert.deepEqual(logs, [{ msg: "Official payment endpoint rejected", cause: "official-response-rejected", status }]);
    assert.equal(JSON.stringify(logs).includes("must-not-log-sensitive-body"), false);
  });
}

for (const fault of ["rejected-rollback", "absent-session"] as const) {
  test("official 409 stays outcome-unknown/503 with " + fault, async () => {
    const f = await nativeTransactionFixture(fault === "rejected-rollback" ? { rollbackError: new Error("lost rollback") } : {});
    await assert.rejects(inPaymentEndpoint(f.req, () => {
      if (fault === "absent-session") delete f.adapter.sessions[String(f.req.transactionID)];
      return Response.json({ message: "Official conflict" }, { status: 409 });
    }), (error: unknown) => {
      assert.ok(error instanceof APIError);
      assert.equal(error.status, 503);
      assert.match(error.message, /outcome unknown/i);
      return true;
    });
    assert.equal(f.events.includes("commit"), false);
    assert.equal(f.req.transactionID, undefined);
  });
}

test("an official thrown APIError retains its existing classification after acknowledged rollback", async () => {
  const f = await nativeTransactionFixture();
  const rejection = new APIError("Official conflict", 409);
  await assert.rejects(inPaymentEndpoint(f.req, () => { throw rejection; }), (error: unknown) => error === rejection);
  assert.deepEqual(f.events, ["begin", "rollback"]);
});
