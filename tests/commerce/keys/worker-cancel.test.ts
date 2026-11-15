import assert from "node:assert/strict";
import { test } from "node:test";
import type { CancelPrepareOutcome, CancelReconcileOutcome, KeyCancelAdapter, KeyGrantAdapter } from "@/lib/commerce/keys/contracts";
import { cancelKeyGrants, reconcileKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload, type Row } from "./support/fake-payload";

const target = { chainID: 84532, lock: `0x${"a".repeat(40)}`, recipient: `0x${"b".repeat(40)}` };
const granter = `eip155:84532:0x${"1".repeat(40)}`;
const manager = `eip155:84532:0x${"2".repeat(40)}`;
const hashOf = (fill: string) => `0x${fill.repeat(64)}`;
const fee = { maxFeePerGas: "100", maxPriorityFeePerGas: "10" };
const at = Date.UTC(2026, 10, 16, 12);

/** A key granted by the grant signer, then refunded by hand (ADR-0009). */
const granted = (extra: Record<string, unknown> = {}): Row => ({
  id: "k", operationKey: "unlock-grant:v1:order:1", entitlement: "adm", state: "granted", attempts: 1, attemptID: "attempt-1", target,
  txHash: hashOf("d"), signer: granter, nonce: 3, tokenID: "5", cancelRequested: true, ...extra,
});

type Script = { prepare?: () => Promise<CancelPrepareOutcome>; broadcast?: KeyCancelAdapter["broadcast"]; reconcile?: () => Promise<CancelReconcileOutcome> };
const canceller = (script: Script = {}, signer = manager) => {
  const prepared: { tokenID: string; nonceFloor: number }[] = [];
  const broadcasts: string[] = [];
  const a: KeyCancelAdapter & { prepared: typeof prepared; broadcasts: string[] } = {
    signer, prepared, broadcasts,
    async prepareCancel({ tokenID, nonceFloor }) {
      prepared.push({ tokenID, nonceFloor });
      return script.prepare ? script.prepare() : { kind: "prepared", txHash: hashOf("c"), nonce: nonceFloor, fee };
    },
    async broadcast(input) { broadcasts.push(input.txHash); return script.broadcast ? script.broadcast(input) : { kind: "submitted" }; },
    release() {},
    async reconcileCancel() { return script.reconcile ? script.reconcile() : { kind: "unknown" }; },
  };
  return a;
};
const pass = (payload: Parameters<typeof cancelKeyGrants>[0]["payload"], adapter: KeyCancelAdapter, minutes = 0) => cancelKeyGrants({ payload, adapter, now: () => new Date(at + minutes * 60_000) });

test("a cancel requested on a granted key is sent once by the lock manager, written ahead, and reconciled to cancelled", async () => {
  const { payload, rows, events } = fakePayload([granted()]);
  const [intent] = rows["commerce-key-grant-intents"];
  const a = canceller();
  let seen: unknown;
  const broadcast = a.broadcast.bind(a);
  a.broadcast = async (input) => { seen = [intent.cancelTxHash, intent.cancelSigner, intent.cancelNonce]; return broadcast(input); };
  await pass(payload, a);
  assert.deepEqual(a.prepared, [{ tokenID: "5", nonceFloor: 0 }]);
  assert.deepEqual(seen, [hashOf("c"), manager, 0], "the cancel hash was durable before broadcast");
  assert.equal(intent.state, "granted", "a sent cancel is not yet a cancelled key");
  assert.ok(events.some((event) => event.startsWith(`lock:key-signer:${manager}@`)), "the manager's signer lock was taken");
  await pass(payload, a, 1);
  assert.equal(a.broadcasts.length, 1, "an unanswered cancel is never sent again");
  a.reconcileCancel = async () => ({ kind: "confirmed" });
  intent.nextAttemptAt = new Date(at).toISOString();
  await pass(payload, a, 5);
  assert.deepEqual([intent.state, intent.cancelledAt, intent.cancelTxHash], ["cancelled", new Date(at + 5 * 60_000).toISOString(), hashOf("c")]);
  await pass(payload, a, 60);
  assert.deepEqual([a.prepared.length, a.broadcasts.length], [1, 1], "exactly once");
});

test("the grant signer is never used to cancel", async () => {
  const { payload, rows } = fakePayload([granted()]);
  const a = canceller({}, granter);
  await pass(payload, a);
  await pass(payload, a, 24 * 60);
  const [intent] = rows["commerce-key-grant-intents"];
  assert.deepEqual(a.prepared, [], "nothing is even prepared with the grant signer");
  assert.deepEqual([intent.state, intent.lastErrorCode], ["granted", "cancel_signer_is_granter"]);
});

test("a key no longer valid on chain is recorded cancelled without a transaction", async () => {
  const { payload, rows } = fakePayload([granted()]);
  const a = canceller({ prepare: async () => ({ kind: "keyNotValid" }) });
  await pass(payload, a);
  const [intent] = rows["commerce-key-grant-intents"];
  assert.deepEqual([intent.state, intent.lastErrorCode, intent.cancelTxHash, a.broadcasts.length], ["cancelled", "key_not_valid", undefined, 0]);
});

test("a grant that lands after the refund is reconciled, then cancelled", async () => {
  const { payload, rows } = fakePayload([granted({ state: "submitted", tokenID: undefined, sends: [{ txHash: hashOf("d"), ...fee, sentAt: new Date(at).toISOString() }] })]);
  const [intent] = rows["commerce-key-grant-intents"];
  const a = canceller({ reconcile: async () => ({ kind: "confirmed" }) });
  await pass(payload, a);
  assert.equal(a.prepared.length, 0, "nothing to cancel before the grant is known");
  const grants = { signer: granter, async reconcile() { return { kind: "confirmed", tokenID: "9" } as const; } } as unknown as KeyGrantAdapter;
  await reconcileKeyGrants({ payload, adapter: grants, now: () => new Date(at) });
  assert.deepEqual([intent.state, intent.tokenID], ["granted", "9"], "the late grant is recorded first");
  await pass(payload, a, 1);
  assert.deepEqual(a.prepared.map((call) => call.tokenID), ["9"]);
  await pass(payload, a, 10);
  assert.equal(intent.state, "cancelled");
});

test("an unclear cancel broadcast is never re-sent; it is settled from its recorded hash", async () => {
  const { payload, rows } = fakePayload([granted()]);
  const a = canceller({ broadcast: async () => ({ kind: "unknown" }) });
  await pass(payload, a);
  await pass(payload, a, 30);
  const [intent] = rows["commerce-key-grant-intents"];
  assert.equal(a.broadcasts.length, 1);
  assert.equal(intent.cancelTxHash, hashOf("c"));
  a.reconcileCancel = async () => ({ kind: "confirmed" });
  await pass(payload, a, 60);
  assert.equal(intent.state, "cancelled");
});

test("a cancel proven unsent is cleared and retried after a backoff", async () => {
  const { payload, rows } = fakePayload([granted()]);
  let first = true;
  const a = canceller({ prepare: async () => {
    if (first) { first = false; return { kind: "definitelyNotSent", code: "rpc_unavailable" }; }
    return { kind: "prepared", txHash: hashOf("c"), nonce: 0, fee };
  } });
  await pass(payload, a);
  const [intent] = rows["commerce-key-grant-intents"];
  assert.deepEqual([intent.cancelAttemptID ?? null, intent.lastErrorCode], [null, "rpc_unavailable"]);
  await pass(payload, a, 1);
  assert.equal(a.prepared.length, 1, "waits for its backoff");
  await pass(payload, a, 60);
  assert.deepEqual([a.prepared.length, a.broadcasts.length, intent.cancelTxHash], [2, 1, hashOf("c")]);
});

test("a cancel the lock refuses, or one that reverted, waits for a person", async () => {
  for (const [label, script] of [
    ["not a lock manager", { prepare: async () => ({ kind: "definitelyNotSent", code: "not_lock_manager" }) }],
    ["reverted", { reconcile: async () => ({ kind: "definitelyReverted", code: "tx_reverted" }) }],
  ] as [string, Script][]) {
    const { payload, rows } = fakePayload([granted()]);
    const a = canceller(script);
    for (let minutes = 0; minutes < 3 * 24 * 60; minutes += 24 * 60) await pass(payload, a, minutes);
    const [intent] = rows["commerce-key-grant-intents"];
    assert.equal(intent.state, "granted", label);
    assert.match(String(intent.lastErrorCode), label === "reverted" ? /^cancel_reverted$/ : /^not_lock_manager$/);
    assert.ok(a.broadcasts.length <= 1, `${label}: never re-sent`);
  }
});

test("granted keys without a cancel request are never touched", async () => {
  const { payload } = fakePayload([granted({ cancelRequested: false })]);
  const a = canceller();
  await pass(payload, a);
  assert.deepEqual(a.prepared, []);
});
