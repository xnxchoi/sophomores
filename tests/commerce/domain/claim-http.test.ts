import assert from "node:assert/strict";
import test from "node:test";
import { APIError } from "payload";
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
