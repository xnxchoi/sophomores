import assert from "node:assert/strict";
import { test } from "node:test";
import type { PayloadRequest } from "payload";
import { withCommerceWrite } from "@/lib/commerce/access";
import { CommerceKeyGrantIntents } from "@/payload/collections/commerce-key-grant-intents";

const hook = CommerceKeyGrantIntents.hooks!.beforeChange![0];
const hash = (c: string) => `0x${c.repeat(64)}`;
const original = { id: "k", operationKey: "unlock-grant:v1:o:1", order: "o", payment: "t", entitlement: "a", beneficiaryUser: "u", recipientMode: "member_safe",
  state: "failed_retryable", txHash: hash("d"), target: { chainID: 84532, lock: `0x${"a".repeat(40)}`, recipient: `0x${"b".repeat(40)}` } };
const run = (data: Record<string, unknown>, originalDoc: Record<string, unknown> = original, operation = "update") => {
  const req = {} as PayloadRequest;
  return withCommerceWrite(req, async () => hook({ data, originalDoc, operation, req } as never));
};

test("key grants are server owned", async () => {
  await assert.rejects(Promise.resolve().then(() => hook({ data: { state: "pending" }, originalDoc: original, operation: "update", req: {} } as never)), /server owned/);
});

test("only a proven-nonexecution retry may clear the recorded hash", async () => {
  await run({ state: "pending", txHash: null });
  await assert.rejects(run({ state: "pending", txHash: hash("e") }), /cannot change/);
  await assert.rejects(run({ state: "submitted", txHash: null }, { ...original, state: "submitted" }), /cannot change/);
});

test("identity, transitions and grants are guarded", async () => {
  await assert.rejects(run({ beneficiaryUser: "someone-else" }), /immutable/);
  await assert.rejects(run({ state: "granted" }, { ...original, state: "ambiguous" }), /confirmation evidence/);
  await assert.rejects(run({ state: "pending" }, { ...original, state: "ambiguous" }), /cannot move/);
  await assert.rejects(run({ recipientMode: "guest_email", state: "awaiting_wallet" }, {}, "create"), /not enabled/);
  await assert.rejects(run({ recipientMode: "member_safe", beneficiaryUser: "u", state: "pending" }, {}, "create"), /awaiting a wallet/);
  assert.equal((await run({ recipientMode: "member_safe", beneficiaryUser: "u" }, {}, "create") as { state: string }).state, "awaiting_wallet");
});

const send = (fill: string) => ({ txHash: hash(fill), maxFeePerGas: "100", maxPriorityFeePerGas: "10", sentAt: "2026-11-16T00:00:00.000Z" });
const inFlight = { ...original, state: "submitted", txHash: hash("d"), signer: `eip155:84532:0x${"1".repeat(40)}`, nonce: 7, sends: [send("d")] };

test("recorded sends are append-only, and the nonce and signer of an attempt never change", async () => {
  await run({ sends: [send("d"), send("e")] }, inFlight);
  await assert.rejects(run({ sends: [send("e")] }, inFlight), /append-only/);
  await assert.rejects(run({ sends: [send("e"), send("d")] }, inFlight), /append-only/);
  await assert.rejects(run({ sends: [] }, inFlight), /append-only/);
  await assert.rejects(run({ sends: [send("d"), { ...send("e"), txHash: "0x1" }] }, inFlight), /Invalid transaction hash/);
  await assert.rejects(run({ nonce: 8 }, inFlight), /nonce/);
  await assert.rejects(run({ signer: `eip155:84532:0x${"2".repeat(40)}` }, inFlight), /signer/);
  await assert.rejects(run({ txHash: hash("e"), sends: [send("d")], nonce: 1, signer: inFlight.signer }, { ...original, state: "submitted", txHash: null }), /first recorded send/);
  // A proven-nonexecution retry starts a fresh attempt.
  await run({ state: "pending", txHash: null, sends: null, nonce: null, signer: null }, { ...inFlight, state: "failed_retryable" });
});

test("a settled hash must be one the intent recorded", async () => {
  await run({ state: "granted", tokenID: "1", settledTxHash: hash("d") }, inFlight);
  await assert.rejects(run({ state: "granted", tokenID: "1", settledTxHash: hash("9") }, inFlight), /recorded/);
});

const keyHeld = { ...inFlight, state: "granted", tokenID: "5", cancelRequested: true };

test("a granted key is cancelled only with recorded evidence", async () => {
  await assert.rejects(run({ state: "cancelled", cancelledAt: "2026-11-16T00:00:00.000Z" }, keyHeld), /evidence/);
  await run({ state: "cancelled", cancelledAt: "2026-11-16T00:00:00.000Z", lastErrorCode: "key_not_valid" }, keyHeld);
  await run({ state: "cancelled", cancelledAt: "2026-11-16T00:00:00.000Z" }, { ...keyHeld, cancelTxHash: hash("c") });
  await assert.rejects(run({ state: "cancelled", cancelledAt: "2026-11-16T00:00:00.000Z" }, { ...keyHeld, cancelRequested: false, cancelTxHash: hash("c") }), /requested/);
});

test("a recorded cancel hash never changes, and is cleared only with its whole unsent attempt", async () => {
  const sent = { ...keyHeld, cancelAttemptID: "c1", cancelTxHash: hash("c"), cancelNonce: 2, cancelSigner: `eip155:84532:0x${"2".repeat(40)}` };
  await assert.rejects(run({ cancelTxHash: hash("e") }, sent), /cancel transaction/);
  await assert.rejects(run({ cancelTxHash: null }, sent), /cancel transaction/);
  await run({ cancelTxHash: null, cancelAttemptID: null, cancelNonce: null, cancelSigner: null }, sent);
  await assert.rejects(run({ cancelTxHash: "0x1" }, keyHeld), /Invalid transaction hash/);
});
