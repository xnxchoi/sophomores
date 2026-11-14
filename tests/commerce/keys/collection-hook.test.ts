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
