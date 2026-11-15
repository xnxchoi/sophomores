import assert from "node:assert/strict";
import { test } from "node:test";
import type { KeyGrantAdapter, ReplaceOutcome, TransactionFee } from "@/lib/commerce/keys/contracts";
import { dispatchKeyGrants, MAX_REPLACEMENTS, reconcileKeyGrants, REPLACE_AFTER_MS, replaceStuckKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload, type Row } from "./support/fake-payload";

const target = { chainID: 84532, lock: `0x${"a".repeat(40)}`, recipient: `0x${"b".repeat(40)}` };
const signer = `eip155:84532:0x${"1".repeat(40)}`;
const hashOf = (fill: string) => `0x${fill.repeat(64)}`;
const at = Date.UTC(2026, 10, 16, 12);
const now = () => new Date(at);
const ago = (ms: number) => new Date(at - ms).toISOString();
const first = { txHash: hashOf("d"), maxFeePerGas: "100", maxPriorityFeePerGas: "10", sentAt: ago(REPLACE_AFTER_MS + 60_000) };

/** A grant broadcast at nonce 7 and unconfirmed since `first.sentAt`. */
const stuck = (extra: Record<string, unknown> = {}): Row => ({
  id: "k", operationKey: "unlock-grant:v1:order:1", entitlement: "adm", state: "submitted", attempts: 1, attemptID: "attempt-1", target,
  txHash: first.txHash, signer, nonce: 7, sends: [first], submittedAt: first.sentAt, lastSentAt: first.sentAt, ...extra,
});

type Replace = KeyGrantAdapter["prepareReplacement"];
const adapter = (replace: Replace, broadcast: KeyGrantAdapter["broadcast"] = async () => ({ kind: "submitted" })) => {
  const calls: { nonce: number; previous: TransactionFee }[] = [];
  const broadcasts: string[] = [];
  const released: string[] = [];
  const a: KeyGrantAdapter & { calls: typeof calls; broadcasts: string[]; released: string[] } = {
    signer, calls, broadcasts, released,
    async prepare() { throw new Error("no new grant expected"); },
    async prepareReplacement(input) { calls.push({ nonce: input.nonce, previous: input.previous }); return replace(input); },
    async broadcast(input) { broadcasts.push(input.txHash); return broadcast(input); },
    release({ txHash }) { released.push(txHash); },
    async reconcile() { return { kind: "unknown" }; },
  };
  return a;
};
const replacedWith = (fill: string, fee = { maxFeePerGas: "130", maxPriorityFeePerGas: "13" }): Replace => async () => ({ kind: "prepared", txHash: hashOf(fill), fee });

test("a grant unconfirmed past its deadline is re-signed at the same nonce with a higher fee, recorded beside the earlier hash before broadcast", async () => {
  const { payload, rows, events } = fakePayload([stuck()]);
  const [intent] = rows["commerce-key-grant-intents"];
  let seen: unknown;
  const a = adapter(replacedWith("e"), async () => { seen = structuredClone(intent.sends); events.push("broadcast"); return { kind: "submitted" }; });
  assert.equal(await replaceStuckKeyGrants({ payload, adapter: a, now }), 1);
  assert.deepEqual(a.calls, [{ nonce: 7, previous: { maxFeePerGas: "100", maxPriorityFeePerGas: "10" } }], "same nonce; the last send's fee is the one to beat");
  const second = { txHash: hashOf("e"), maxFeePerGas: "130", maxPriorityFeePerGas: "13", sentAt: now().toISOString() };
  assert.deepEqual(seen, [first, second], "the replacement hash was durable before broadcast");
  assert.deepEqual(a.broadcasts, [hashOf("e")]);
  assert.deepEqual([intent.state, intent.txHash, intent.nonce, intent.lastSentAt], ["submitted", first.txHash, 7, now().toISOString()], "the first hash and the nonce never change");
  const lock = events.find((event) => event.startsWith(`lock:key-signer:${signer}@`));
  assert.ok(lock && events.indexOf(lock) < events.indexOf("broadcast") && events.indexOf("broadcast") < events.indexOf(`commit:${lock.split("@")[1]}`), "replacement runs inside the signer lock");
});

test("a grant inside its deadline, another signer's grant, or one already settled is left alone", async () => {
  const { payload } = fakePayload([
    stuck({ id: "young", operationKey: "young", lastSentAt: ago(REPLACE_AFTER_MS - 60_000), sends: [{ ...first, sentAt: ago(REPLACE_AFTER_MS - 60_000) }] }),
    stuck({ id: "other", operationKey: "other", signer: `eip155:84532:0x${"2".repeat(40)}` }),
    stuck({ id: "done", operationKey: "done", state: "granted", tokenID: "1" }),
  ]);
  const a = adapter(replacedWith("e"));
  assert.equal(await replaceStuckKeyGrants({ payload, adapter: a, now }), 0);
  assert.deepEqual(a.calls, []);
});

test("replacement does not wait for reconcile's pushed-back recheck time", async () => {
  const { payload, rows } = fakePayload([stuck({ nextAttemptAt: new Date(at + 60_000).toISOString() })]);
  await replaceStuckKeyGrants({ payload, adapter: adapter(replacedWith("e")), now });
  assert.equal((rows["commerce-key-grant-intents"][0].sends as unknown[]).length, 2);
});

test("after the last allowed replacement, the intent goes to ambiguous with a code, and reconcile still settles any hash", async () => {
  const sends = Array.from({ length: MAX_REPLACEMENTS + 1 }, (_, index) => ({ ...first, txHash: hashOf(String(index + 1)) }));
  const { payload, rows } = fakePayload([stuck({ sends, submittedAt: ago(60 * 60_000) })]);
  const [intent] = rows["commerce-key-grant-intents"];
  const a = adapter(replacedWith("e"));
  await replaceStuckKeyGrants({ payload, adapter: a, now });
  assert.deepEqual(a.calls, [], "no replacement past the cap");
  assert.deepEqual([intent.state, intent.lastErrorCode], ["ambiguous", "replacement_exhausted"]);
  await replaceStuckKeyGrants({ payload, adapter: a, now });
  assert.deepEqual(a.calls, [], "still none on a later pass");
  // An unanswered reconcile long past the submit time keeps the replacement code for the person who looks.
  await reconcileKeyGrants({ payload, adapter: a, now });
  assert.equal(intent.lastErrorCode, "replacement_exhausted");
  intent.nextAttemptAt = ago(1);
  const mined = sends[2].txHash;
  await reconcileKeyGrants({ payload, adapter: { ...a, reconcile: async ({ txHash }) => txHash === mined ? { kind: "confirmed", tokenID: "4" } : { kind: "unknown" } }, now });
  assert.deepEqual([intent.state, intent.tokenID, intent.settledTxHash], ["granted", "4", mined]);
});

test("a replacement that cannot be raised under the fee ceiling ends in ambiguous with its own code", async () => {
  const { payload, rows } = fakePayload([stuck()]);
  const a = adapter(async () => ({ kind: "definitelyNotSent", code: "fee_ceiling_reached" }));
  await replaceStuckKeyGrants({ payload, adapter: a, now });
  const [intent] = rows["commerce-key-grant-intents"];
  assert.deepEqual([intent.state, intent.lastErrorCode, (intent.sends as unknown[]).length], ["ambiguous", "replacement_fee_ceiling", 1]);
  await replaceStuckKeyGrants({ payload, adapter: a, now });
  assert.equal(a.calls.length, 1, "not retried");
});

test("a replacement that was not sent never makes the intent retryable at a new nonce", async () => {
  const failures: [string, Replace, KeyGrantAdapter["broadcast"] | undefined, number][] = [
    ["prepare refused", async () => ({ kind: "definitelyNotSent", code: "rpc_unavailable" }), undefined, 1],
    ["prepare threw", async () => { throw new Error("rpc down"); }, undefined, 1],
    ["broadcast refused", replacedWith("e"), async () => ({ kind: "definitelyNotSent", code: "not_prepared" }), 2],
    ["broadcast threw", replacedWith("e"), async () => { throw new Error("connection reset"); }, 2],
    ["broadcast unclear", replacedWith("e"), async () => ({ kind: "unknown" }), 2],
  ];
  for (const [label, replace, broadcast, recorded] of failures) {
    const { payload, rows } = fakePayload([stuck()]);
    await replaceStuckKeyGrants({ payload, adapter: adapter(replace, broadcast), now });
    const [intent] = rows["commerce-key-grant-intents"];
    assert.equal(intent.state, "submitted", `${label}: the original may still mine, so the state stays`);
    assert.match(String(intent.lastErrorCode), /^replacement_/, label);
    assert.equal((intent.sends as unknown[]).length, recorded, `${label}: a signed replacement stays recorded`);
    let prepared = 0;
    await dispatchKeyGrants({ payload, adapter: { ...adapter(replace), async prepare() { prepared++; return { kind: "definitelyNotSent", code: "x" }; } }, now: () => new Date(at + 24 * 60 * 60_000) });
    assert.equal(prepared, 0, `${label}: never dispatched again at a new nonce`);
    assert.equal(intent.nonce, 7);
  }
});

test("a nonce the chain has already consumed is not replaced; reconcile settles it", async () => {
  const { payload, rows } = fakePayload([stuck()]);
  const outcome: ReplaceOutcome = { kind: "nonceConsumed" };
  const a = adapter(async () => outcome);
  assert.equal(await replaceStuckKeyGrants({ payload, adapter: a, now }), 0);
  const [intent] = rows["commerce-key-grant-intents"];
  assert.deepEqual([intent.state, (intent.sends as unknown[]).length], ["submitted", 1]);
  assert.deepEqual(a.broadcasts, []);
});

test("an older ambiguous grant is replaced too, at its own nonce", async () => {
  const { payload, rows } = fakePayload([stuck({ state: "ambiguous", lastErrorCode: "outcome_unknown" })]);
  const a = adapter(replacedWith("e"));
  await replaceStuckKeyGrants({ payload, adapter: a, now });
  const [intent] = rows["commerce-key-grant-intents"];
  assert.deepEqual(a.calls.map((call) => call.nonce), [7]);
  assert.equal(intent.state, "ambiguous");
  assert.equal((intent.sends as unknown[]).length, 2);
});
