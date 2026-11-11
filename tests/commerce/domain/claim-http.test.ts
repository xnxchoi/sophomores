import assert from "node:assert/strict";
import test from "node:test";
import { APIError } from "payload";
import { claimGuestAdmission } from "../../../src/lib/commerce/guests";
import { commerceStorageFake, saleSeed } from "./storage-fake";
import { nativeClaimFixture } from "./claim-native-fixture";

const token = "a".repeat(43);
const generic = "Commerce operation could not be completed";
const known = [
  ["CLAIM_INVALID", 400], ["CLAIM_EXPIRED", 410], ["CLAIM_CONSUMED", 409],
  ["CLAIM_UNAVAILABLE", 409], ["ACCOUNT_NOT_ELIGIBLE", 403], ["EVENT_ALREADY_BOUND", 409],
] as const;

type FailureOptions = { claim?: () => Promise<{ admissionID: string }>; commit?: () => Promise<void>; rollback?: () => Promise<void>; inherited?: boolean; user?: Record<string, unknown> | null; originHeader?: string; runtime?: boolean; principalID?: string; };

async function fixture(options: FailureOptions = {}, body: unknown = { action: "claim", token }) {
  const calls = { begin: 0, commit: 0, rollback: 0, claim: 0 };
  const native = await nativeClaimFixture(async () => {
    calls.claim++;
    return options.claim ? options.claim() : { admissionID: "admission" };
  }, { ...options, body, onQuery: async (kind) => {
    if (kind === "begin") calls.begin++;
    if (kind === "commit") { calls.commit++; await options.commit?.(); }
    if (kind === "rollback") { calls.rollback++; await options.rollback?.(); }
  } });
  return { run: native.run, calls };
}

for (const [code, status] of known) {
  test("a confirmed owned rollback carries only the allowlisted " + code, async () => {
    const f = await fixture({ claim: async () => { throw new APIError("private diagnostic " + token, status, { code }, true); } });
    const response = await f.run();
    assert.equal(response.status, status);
    assert.deepEqual(await response.json(), { error: generic, code });
    assert.deepEqual(f.calls, { begin: 1, commit: 0, rollback: 1, claim: 1 });
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
}

test("successful claim commits once and preserves the receipt", async () => {
  const f = await fixture(); const response = await f.run();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { admissionID: "admission" });
  assert.deepEqual(f.calls, { begin: 1, commit: 1, rollback: 0, claim: 1 });
});

test("infrastructure and malformed public-looking errors remain unknown", async () => {
  for (const error of [new Error("private-other-account " + token), new APIError("wrong pair", 410, { code: "CLAIM_INVALID" }, true), new APIError("not public", 410, { code: "CLAIM_EXPIRED" }, false), new APIError("unknown", 409, { code: "PRIVATE_INTERNAL_STATE" }, true)]) {
    const f = await fixture({ claim: async () => { throw error; } });
    const response = await f.run();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_RESULT_UNKNOWN" });
  }
});

test("typed-looking commit failures cannot impersonate a domain rejection", async () => {
  const f = await fixture({ commit: async () => { throw new APIError("private commit", 410, { code: "CLAIM_EXPIRED" }, true); } });
  const response = await f.run();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_RESULT_UNKNOWN" });
  assert.deepEqual(f.calls, { begin: 1, commit: 1, rollback: 1, claim: 1 });
});

test("failed rollback remains unknown even if it throws the original rejection object", async () => {
  const rejection = new APIError("expiry", 410, { code: "CLAIM_EXPIRED" }, true);
  for (const rollbackError of [new Error("private rollback"), rejection]) {
    const f = await fixture({ claim: async () => { throw rejection; }, rollback: async () => { throw rollbackError; } });
    const response = await f.run();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_RESULT_UNKNOWN" });
  }
});

test("an inherited transaction cannot claim rollback confirmation", async () => {
  const f = await fixture({ inherited: true, claim: async () => { throw new APIError("expiry", 410, { code: "CLAIM_EXPIRED" }, true); } });
  const response = await f.run();
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_RESULT_UNKNOWN" });
  assert.deepEqual(f.calls, { begin: 0, commit: 0, rollback: 0, claim: 0 });
});

test("non-claim rejection keeps the staff consumer's exact legacy body and status", async () => {
  const f = await fixture({}, { action: "accept-unit-return", orderID: "order", units: [1], evidenceID: "evidence" });
  const response = await f.run();
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: generic });
});

test("existing authentication and origin rejection remain ahead of all claim work", async () => {
  for (const options of [{ user: null }, { originHeader: "https://attacker.invalid" }, { runtime: false }, { principalID: "another-account" }]) {
    const f = await fixture(options); const response = await f.run();
    assert.equal(response.status, options.user === null ? 401 : 403);
    assert.equal(f.calls.begin, 0);
    assert.equal(f.calls.claim, 0);
  }
});


const malformedBearers: [string, unknown][] = [
  ["missing", { action: "claim" }],
  ...[["punctuation", "!"], ["empty", ""], ["short", "a".repeat(42)], ["long", "a".repeat(44)],
    ["unicode", "🌙".repeat(43)], ["null", null], ["number", 42], ["boolean", true],
    ["array", [token]], ["object", { token }], ["noncoercible object", { toString: null }]]
    .map(([name, value]) => [String(name), { action: "claim", token: value }] as [string, unknown]),
];

for (const [name, body] of malformedBearers) {
  test("actual endpoint classifies malformed bearer after owned rollback: " + name, async () => {
    const f = await fixture({}, body);
    const response = await f.run();
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_INVALID" });
    assert.deepEqual(f.calls, { begin: 1, commit: 0, rollback: 1, claim: 0 });
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
}

test("malformed bearer classification does not bypass authentication or origin checks", async () => {
  for (const options of [{ user: null }, { originHeader: "https://attacker.invalid" }, { runtime: false }, { principalID: "another-account" }]) {
    const f = await fixture(options, { action: "claim", token: "!" });
    const response = await f.run();
    assert.equal(response.status, options.user === null ? 401 : 403);
    assert.deepEqual(f.calls, { begin: 0, commit: 0, rollback: 0, claim: 0 });
  }
});

test("malformed bearer cannot claim known rejection without owned rollback proof", async () => {
  for (const options of [{ inherited: true }, { rollback: async () => { throw new Error("rollback lost"); } }]) {
    const f = await fixture(options, { action: "claim", token: "!" });
    const response = await f.run();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_RESULT_UNKNOWN" });
    assert.equal(f.calls.claim, 0);
  }
});

test("strict claim envelopes still reject extra fields without accepting or executing them", async () => {
  for (const body of [{ action: "claim", token, extra: "not accepted" }, { action: "claim", token: "!", extra: true }]) {
    const f = await fixture({}, body);
    const response = await f.run();
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: generic });
    assert.deepEqual(f.calls, { begin: 0, commit: 0, rollback: 0, claim: 0 });
  }
});

// Hybrid: installed native transaction + in-memory Local API rows. No pool, DB,
// provider transport, durability or real PostgreSQL concurrency is represented.
async function recoveryFixture(t: import("node:test").TestContext, options: Parameters<typeof nativeClaimFixture>[1] = {}, active = true) {
  const { createHash } = await import("node:crypto");
  const fake = commerceStorageFake({ ...saleSeed(), users: [{ id: "guest", emailVerified: true, banned: false }],
    "commerce-admissions": [{ id: "admission", order: "order", buyer: "buyer", event: "e", guestName: "Guest", status: "checked-in" }],
    "commerce-claims": [{ id: "claim", admission: "admission", tokenDigest: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60_000).toISOString(), consumedAt: null, revokedAt: null }] });
  await fake.transaction({ collection: "users", id: "guest" }, async (req) => {
    await claimGuestAdmission({ req, token }, async () => true);
  });
  const before = structuredClone(fake.rows);
  let attemptedWrites = 0;
  const native = await nativeClaimFixture(async (req) => fake.transaction({ collection: "users", id: "guest" }, async (storage) => {
    const read = storage.payload.findByID.bind(storage.payload);
    const find = storage.payload.find.bind(storage.payload);
    t.mock.method(req.payload, "findByID", async (args: Parameters<typeof read>[0]) => {
      assert.equal(args.req === req, true);
      return read({ ...args, req: storage });
    });
    t.mock.method(req.payload, "find", async (args: Parameters<typeof find>[0]) => {
      assert.equal(args.req === req, true);
      return find({ ...args, req: storage });
    });
    const failWrite = async () => { attemptedWrites++; assert.fail("Recovery must not write"); };
    t.mock.method(req.payload, "create", failWrite);
    t.mock.method(req.payload, "update", failWrite);
    t.mock.method(req.payload.db, "updateOne", failWrite);
    return claimGuestAdmission({ req, token }, async () => active);
  }), options);
  return { ...native, rows: fake.rows, before, run: async () => {
    const response = await native.run();
    assert.equal(attemptedWrites, 0, "Even an unknown HTTP result must not hide a recovery write attempt");
    return response;
  } };
}

test("actual domain HTTP lost receipt replays only after native commit acknowledgement", async (t) => {
  const f = await recoveryFixture(t);
  for (let replay = 0; replay < 2; replay++) {
    Object.defineProperty(f.req, "body", { value: new Response(JSON.stringify({ action: "claim", token })).body });
    const response = await f.run();
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { admissionID: "admission" });
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  assert.equal(f.events.filter((event) => event === "commit").length, 2);
  assert.equal(f.events.includes("rollback"), false);
  assert.deepEqual(f.rows, f.before);
});

test("recovered domain receipt is not success until native commit settles", async (t) => {
  let confirm: (() => void) | undefined;
  let entered: (() => void) | undefined;
  const commitEntered = new Promise<void>((resolve) => { entered = resolve; });
  const completion = new Promise<void>((resolve) => { confirm = resolve; });
  const f = await recoveryFixture(t, { onQuery: async (kind) => {
    if (kind === "commit") { entered?.(); await completion; }
  } });
  let settled = false;
  const result = Promise.resolve(f.run()).then((response) => { settled = true; return response; });
  await commitEntered;
  assert.equal(settled, false);
  confirm?.();
  assert.equal((await result).status, 200);
  assert.deepEqual(f.rows, f.before);
});

for (const fault of ["commit", "rollback", "inherited", "ownership"] as const) {
  test("actual domain HTTP recovery remains unknown on native " + fault + " failure", async (t) => {
    const f: Awaited<ReturnType<typeof recoveryFixture>> = await recoveryFixture(t, {
      ...(fault === "commit" ? { commitError: new APIError("private commit", 410, { code: "CLAIM_EXPIRED" }, true) } : {}),
      ...(fault === "rollback" ? { rollbackError: new Error("private rollback") } : {}),
      ...(fault === "inherited" ? { inherited: true } : {}),
      ...(fault === "ownership" ? { onQuery: async (kind: string) => {
        if (kind === "commit") {
          const id = await f.req.transactionID;
          if (id) delete f.adapter.sessions[String(id)];
        }
      } } : {}),
    }, fault !== "rollback");
    const response = await f.run();
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_RESULT_UNKNOWN" });
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(f.rows, f.before);
  });
}

test("actual domain HTTP foreign recovery reveals no admission identity", async (t) => {
  const f = await recoveryFixture(t, { user: { collection: "users", id: "private-other-account" }, principalID: "private-other-account" });
  const response = await f.run();
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: generic, code: "CLAIM_CONSUMED" });
  assert.equal(f.events.includes("commit"), false);
  assert.equal(f.events.includes("rollback"), true);
  assert.deepEqual(f.rows, f.before);
});
