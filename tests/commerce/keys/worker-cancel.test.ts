import assert from "node:assert/strict";
import { test } from "node:test";
import type { CancelPrepareOutcome, CancelReconcileOutcome, KeyCancelAdapter, KeyGrantAdapter, RebroadcastOutcome, ReplaceOutcome, TransactionFee } from "@/lib/commerce/keys/contracts";
import { cancelKeyGrants, MAX_REPLACEMENTS, REBROADCAST_AFTER_MS, reconcileKeyGrants, REPLACE_AFTER_MS } from "@/lib/commerce/keys/worker";
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

type Script = {
  prepare?: () => Promise<CancelPrepareOutcome>; broadcast?: KeyCancelAdapter["broadcast"]; reconcile?: (txHash: string) => Promise<CancelReconcileOutcome>;
  resend?: () => Promise<RebroadcastOutcome>; replace?: () => Promise<ReplaceOutcome>;
};
const rawOf = (fill: string) => `0x02${fill.repeat(8)}`;
const canceller = (script: Script = {}, signer = manager) => {
  const prepared: { tokenID: string; nonceFloor: number }[] = [];
  const broadcasts: string[] = [];
  const resent: string[] = [];
  const replacements: { nonce: number; previous: TransactionFee }[] = [];
  const a: KeyCancelAdapter & { prepared: typeof prepared; broadcasts: string[]; resent: string[]; replacements: typeof replacements } = {
    signer, prepared, broadcasts, resent, replacements,
    async prepareCancel({ tokenID, nonceFloor }) {
      prepared.push({ tokenID, nonceFloor });
      return script.prepare ? script.prepare() : { kind: "prepared", txHash: hashOf("c"), raw: rawOf("c"), nonce: nonceFloor, fee };
    },
    async prepareCancelReplacement({ nonce, previous }) {
      replacements.push({ nonce, previous });
      return script.replace ? script.replace() : { kind: "prepared", txHash: hashOf("e"), raw: rawOf("e"), fee: { maxFeePerGas: "130", maxPriorityFeePerGas: "13" } };
    },
    async rebroadcast({ raw }) { resent.push(raw); return script.resend ? script.resend() : { kind: "accepted" }; },
    async broadcast(input) { broadcasts.push(input.txHash); return script.broadcast ? script.broadcast(input) : { kind: "submitted" }; },
    release() {},
    async reconcileCancel({ txHash }) { return script.reconcile ? script.reconcile(txHash) : { kind: "unknown" }; },
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

test("a cancel whose broadcast was lost is re-sent from its recorded bytes, never re-signed, and settles", async () => {
  const { payload, rows } = fakePayload([granted()]);
  const a = canceller({ broadcast: async () => ({ kind: "unknown" }) });
  await pass(payload, a);
  const [intent] = rows["commerce-key-grant-intents"];
  assert.deepEqual(intent.cancelSends, [{ txHash: hashOf("c"), raw: rawOf("c"), ...fee, sentAt: new Date(at).toISOString(), accepted: false }], "raw bytes written ahead");
  await pass(payload, a, 0.5);
  assert.deepEqual(a.resent, [], "not before the re-send interval");
  await pass(payload, a, REBROADCAST_AFTER_MS / 60_000 + 1);
  assert.deepEqual(a.resent, [rawOf("c")], "the same bytes again");
  assert.deepEqual([a.prepared.length, a.broadcasts.length, a.replacements.length], [1, 1, 0], "never signed again");
  assert.equal((intent.cancelSends as { accepted: boolean }[])[0].accepted, true);
  a.reconcileCancel = async () => ({ kind: "confirmed" });
  intent.nextAttemptAt = null;
  await pass(payload, a, 30);
  assert.equal(intent.state, "cancelled");
});

test("an accepted cancel unconfirmed past its deadline is replaced at its nonce with a higher fee, and settles on whichever mined", async () => {
  const { payload, rows } = fakePayload([granted()]);
  const [intent] = rows["commerce-key-grant-intents"];
  const a = canceller({ reconcile: async (txHash) => txHash === hashOf("e") ? { kind: "confirmed" } : { kind: "unknown" } });
  await pass(payload, a);
  await pass(payload, a, REPLACE_AFTER_MS / 60_000 + 1);
  assert.deepEqual(a.replacements, [{ nonce: 0, previous: fee }], "same nonce, raised from the accepted send's fee");
  assert.deepEqual((intent.cancelSends as { txHash: string; accepted: boolean }[]).map((send) => [send.txHash, send.accepted]), [[hashOf("c"), true], [hashOf("e"), true]]);
  assert.equal(intent.cancelTxHash, hashOf("c"), "the first hash never changes");
  intent.nextAttemptAt = null;
  await pass(payload, a, REPLACE_AFTER_MS / 60_000 + 2);
  assert.equal(intent.state, "cancelled", "settled on the replacement");
});

test("cancel replacement is capped; the stopped nonce then holds the manager's new cancels", async () => {
  const sends = Array.from({ length: MAX_REPLACEMENTS + 1 }, (_, index) => ({ txHash: hashOf(String(index + 1)), ...fee, sentAt: new Date(at - 60 * 60_000).toISOString(), raw: rawOf(String(index + 1)), accepted: true }));
  const stuck = granted({ cancelAttemptID: "c1", cancelTxHash: sends[0].txHash, cancelSigner: manager, cancelNonce: 2, cancelSends: sends, cancelLastSentAt: sends[0].sentAt, cancelSubmittedAt: sends[0].sentAt });
  const next = granted({ id: "k2", operationKey: "unlock-grant:v1:order:2", entitlement: "adm2", tokenID: "6" });
  const { payload, rows } = fakePayload([stuck, next]);
  const a = canceller();
  await pass(payload, a);
  const [first, second] = rows["commerce-key-grant-intents"];
  assert.deepEqual([first.state, first.lastErrorCode], ["granted", "cancel_replacement_exhausted"]);
  assert.deepEqual(a.replacements, []);
  await pass(payload, a, 1);
  assert.deepEqual(a.prepared, [], "no new cancel is signed behind the stopped nonce");
  assert.equal(second.cancelTxHash, undefined);
});
test("a cancel proven unsent is cleared and retried after a backoff", async () => {
  const { payload, rows } = fakePayload([granted()]);
  let first = true;
  const a = canceller({ prepare: async () => {
    if (first) { first = false; return { kind: "definitelyNotSent", code: "rpc_unavailable" }; }
    return { kind: "prepared", txHash: hashOf("c"), raw: rawOf("c"), nonce: 0, fee };
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
