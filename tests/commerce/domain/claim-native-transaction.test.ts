import assert from "node:assert/strict";
import test from "node:test";
import { APIError, type PayloadRequest } from "payload";
import { lockCommerce, readCommerce, findCommerce, createCommerce, updateCommerce } from "../../../src/lib/commerce/_shared/transaction";
import { nativeClaimFixture } from "./claim-native-fixture";

const generic = "Commerce operation could not be completed";
const expired = () => new APIError("matched expiry", 410, { code: "CLAIM_EXPIRED" }, true);

async function unknown(response: Response) {
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_RESULT_UNKNOWN" });
}

test("native SQL rollback acknowledgement, not adapter resolution, permits a known claim outcome", async (t) => {
  const f = await nativeClaimFixture(async () => { throw expired(); });
  t.after(f.cleanup);
  const response = await f.run();
  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_EXPIRED" });
  assert.deepEqual(f.events, ["begin", "rollback"]);
  assert.equal(f.req.transactionID, undefined);
  assert.deepEqual(Object.keys(f.adapter.sessions), ["foreign"]);
});

for (const useOriginal of [false, true]) {
  test("native rollback failure remains unknown even when Payload absorbs it: original=" + useOriginal, async (t) => {
    const rejection = expired();
    const f = await nativeClaimFixture(async () => { throw rejection; }, { rollbackError: useOriginal ? rejection : new Error("driver rollback lost") });
    t.after(f.cleanup);
    await unknown(await f.run());
    assert.deepEqual(f.events, ["begin", "rollback"]);
    assert.equal(f.adapter.sessions.foreign, f.foreign);
  });
}

for (const kind of ["missing", "replaced"] as const) {
  test("a " + kind + " Payload session cannot turn its rollback no-op into acknowledgement", async (t) => {
    const f = await nativeClaimFixture(async (req) => {
      const id = String(await req.transactionID);
      if (kind === "missing") delete f.adapter.sessions[id];
      else f.adapter.sessions[id] = f.foreign;
      throw expired();
    });
    t.after(f.cleanup);
    await unknown(await f.run());
    assert.equal(f.adapter.sessions.foreign, f.foreign);
    if (kind === "replaced") assert.equal(Object.values(f.adapter.sessions).filter((session) => session === f.foreign).length, 2, "cleanup must not delete replacement-owned state");
  });
}

for (const operation of ["rollbackTransaction", "commitTransaction"] as const) {
  test("internal " + operation + " contaminates without callback deadlock or known response", { timeout: 2000 }, async (t) => {
    const f = await nativeClaimFixture(async (req) => {
      await f.adapter[operation](String(await req.transactionID));
      throw expired();
    });
    t.after(f.cleanup);
    await unknown(await f.run());
    assert.deepEqual(f.events, ["begin", "rollback"], "bridge signals must not finish the native transaction themselves");
  });
}

test("request transaction-ID loss blocks Local API pool fallback before the call", async (t) => {
  const f = await nativeClaimFixture(async (req) => {
    delete req.transactionID;
    await readCommerce(req, "users", "guest");
    return { admissionID: "admission" };
  });
  t.after(f.cleanup);
  await unknown(await f.run());
  assert.equal(f.calls.local, 0);
  assert.equal(f.calls.fallback, 0);
});

test("foreign request ownership is preserved and cannot be used by later claim writes", async (t) => {
  const f = await nativeClaimFixture(async (req) => {
    req.transactionID = "foreign";
    await updateCommerce(req, "commerce-admissions", "admission", { status: "claimed" });
    return { admissionID: "admission" };
  });
  t.after(f.cleanup);
  await unknown(await f.run());
  assert.equal(f.calls.local, 0);
  assert.equal(f.req.transactionID, "foreign");
  assert.equal(f.adapter.sessions.foreign, f.foreign);
});

const helpers: [string, (req: PayloadRequest) => Promise<unknown>][] = [
  ["lock", (req) => lockCommerce(req, ["admission:record"])],
  ["read", (req) => readCommerce(req, "users", "guest")],
  ["find", (req) => findCommerce(req, "commerce-claims", "id", "claim")],
  ["create", (req) => createCommerce(req, "commerce-claims", { admission: "admission" })],
  ["update", (req) => updateCommerce(req, "commerce-admissions", "admission", { status: "claimed" })],
];

for (const [name, operation] of helpers) {
  test(name + " and subsequent helpers remain blocked after swallowed contamination", async (t) => {
    const f = await nativeClaimFixture(async (req) => {
      await f.adapter.rollbackTransaction(String(await req.transactionID));
      try { await operation(req); } catch { /* A caller cannot recover ownership by swallowing the guard. */ }
      try { await updateCommerce(req, "commerce-admissions", "admission", { status: "claimed" }); } catch { /* Must stay blocked. */ }
      return { admissionID: "admission" };
    });
    t.after(f.cleanup);
    await unknown(await f.run());
    assert.equal(f.calls.local, 0);
    assert.equal(f.calls.fallback, 0);
  });
}

test("session loss during one Local API call prevents the next mutation", async (t) => {
  const f = await nativeClaimFixture(async (req) => {
    const original = req.payload.findByID.bind(req.payload);
    t.mock.method(req.payload, "findByID", async (args: Parameters<typeof original>[0]) => {
      const result = await original(args);
      delete f.adapter.sessions[String(await req.transactionID)];
      return result;
    });
    await readCommerce(req, "users", "guest");
    await updateCommerce(req, "commerce-admissions", "admission", { status: "claimed" });
    return { admissionID: "admission" };
  });
  t.after(f.cleanup);
  await unknown(await f.run());
  assert.equal(f.calls.local, 1);
  assert.equal(f.calls.fallback, 0);
});

test("inherited claim transactions are rejected before the mutation callback", async (t) => {
  const f = await nativeClaimFixture(async () => ({ admissionID: "admission" }), { inherited: true });
  t.after(f.cleanup);
  await unknown(await f.run());
  assert.equal(f.calls.claim, 0);
  assert.deepEqual(f.events, []);
  assert.equal(f.req.transactionID, "foreign");
  assert.equal(f.adapter.sessions.foreign, f.foreign);
});

for (const kind of ["start", "commit"] as const) {
  test("native " + kind + " failure cannot impersonate domain rejection", async (t) => {
    const f = await nativeClaimFixture(async () => ({ admissionID: "admission" }), kind === "start" ? { startError: expired() } : { commitError: expired() });
    t.after(f.cleanup);
    await unknown(await f.run());
    assert.equal(f.calls.claim, kind === "start" ? 0 : 1);
    assert.equal(f.adapter.sessions.foreign, f.foreign);
  });
}

test("unexpected native resolution after rejection has no private rollback acknowledgement", async (t) => {
  const f = await nativeClaimFixture(async () => { throw expired(); }, { swallowNativeRejection: true });
  t.after(f.cleanup);
  await unknown(await f.run());
});

test("native success commits once and cleans only owned registry/request state", async (t) => {
  const f = await nativeClaimFixture(async () => ({ admissionID: "admission" }));
  t.after(f.cleanup);
  const response = await f.run();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { admissionID: "admission" });
  assert.deepEqual(f.events, ["begin", "commit"]);
  assert.equal(f.req.transactionID, undefined);
  assert.deepEqual(Object.keys(f.adapter.sessions), ["foreign"]);
});


test("replacing the native database inside the owned session fails before Local API work", async (t) => {
  const f = await nativeClaimFixture(async (req) => {
    const session = f.adapter.sessions[String(await req.transactionID)];
    session.db = f.foreign.db as typeof session.db;
    await updateCommerce(req, "commerce-admissions", "admission", { status: "claimed" });
    return { admissionID: "admission" };
  });
  t.after(f.cleanup);
  await unknown(await f.run());
  assert.equal(f.calls.local, 0);
  assert.equal(f.calls.fallback, 0);
});

test("foreign ownership arriving during native startup is not overwritten or consumed", async (t) => {
  const f = await nativeClaimFixture(async () => ({ admissionID: "admission" }), {
    onQuery: (kind) => { if (kind === "begin") f.req.transactionID = "foreign"; },
  });
  t.after(f.cleanup);
  await unknown(await f.run());
  assert.equal(f.calls.claim, 0);
  assert.equal(f.req.transactionID, "foreign");
  assert.equal(f.adapter.sessions.foreign, f.foreign);
});


test("disabled native transactions fail closed before invoking claim mutations", async (t) => {
  const f = await nativeClaimFixture(async () => ({ admissionID: "admission" }));
  t.after(f.cleanup);
  f.adapter.transactionOptions = false;
  await unknown(await f.run());
  assert.equal(f.calls.claim, 0);
  assert.deepEqual(f.events, []);
});


test("the installed disabled adapter factory is rejected after options normalization", async (t) => {
  const f = await nativeClaimFixture(async () => ({ admissionID: "admission" }), { disabledTransactions: true });
  t.after(f.cleanup);
  assert.equal(f.adapter.transactionOptions, undefined);
  await unknown(await f.run());
  assert.equal(f.calls.claim, 0);
  assert.deepEqual(f.events, []);
});
