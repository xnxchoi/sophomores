import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, keccak256, numberToHex, parseTransaction, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { confirmationDepth, maxFeeCeiling } from "@/lib/commerce/keys/unlock/transactions";
import { dispatchKeyGrants, reconcileKeyGrants, REPLACE_AFTER_MS, replaceStuckKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload } from "./support/fake-payload";
import { healthyChain, lockAbi, lockAddress, mockChain, receipt, recipient, target, transferLog } from "./support/mock-chain";

const now = () => new Date("2026-11-16T00:00:00Z");
const deep = () => numberToHex(100 + confirmationDepth[84532] - 1);
/** `latest` and `pending` counts answered separately; every send is captured. */
const chainWith = (counts: { latest: number; pending: number }, raws: Hex[]) => healthyChain({
  eth_getTransactionCount: (params) => numberToHex(params[1] === "latest" ? counts.latest : counts.pending),
  eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); },
});
const adapterOn = (handlers: ReturnType<typeof healthyChain>) => {
  const chain = mockChain(handlers);
  return { ...chain, adapter: createUnlockKeyGrantAdapter({ chainID: 84532, account: privateKeyToAccount(generatePrivateKey()), transport: chain.transport, now }) };
};
const replacement = { intentID: "intent-1", target, nonce: 3 };
const atLeastTenPercentAbove = (next: bigint, previous: bigint) => next > previous && next * 10n >= previous * 11n;

test("a replacement re-signs the same grant at the same nonce, raising both fees by at least 10%", async () => {
  const raws: Hex[] = [];
  const { adapter } = adapterOn(chainWith({ latest: 3, pending: 4 }, raws));
  const previous = { maxFeePerGas: "6000001", maxPriorityFeePerGas: "1000" };
  const outcome = await adapter.prepareReplacement({ ...replacement, previous });
  assert.equal(outcome.kind, "prepared");
  const { txHash, fee } = outcome as Extract<typeof outcome, { kind: "prepared" }>;
  assert.equal((await adapter.broadcast({ intentID: "intent-1", txHash })).kind, "submitted");
  const sent = parseTransaction(raws[0]);
  assert.equal(sent.nonce, 3, "the stuck grant's own nonce, not the pending count");
  assert.equal(keccak256(raws[0]), txHash);
  assert.ok(atLeastTenPercentAbove(sent.maxFeePerGas!, 6000001n));
  assert.ok(atLeastTenPercentAbove(sent.maxPriorityFeePerGas!, 1000n));
  assert.deepEqual(fee, { maxFeePerGas: String(sent.maxFeePerGas), maxPriorityFeePerGas: String(sent.maxPriorityFeePerGas) });
  const call = decodeFunctionData({ abi: lockAbi, data: sent.data! });
  assert.equal(call.functionName, "grantKeys");
  assert.equal(sent.to?.toLowerCase(), lockAddress);
  assert.deepEqual((call.args as [Hex[]])[0].map((address) => address.toLowerCase()), [recipient]);
});

test("the network's own estimate wins when it is above the raise", async () => {
  const raws: Hex[] = [];
  const { adapter } = adapterOn(chainWith({ latest: 3, pending: 4 }, raws));
  // Deliberately low: under Base Sepolia's floor base fee of 5,000,000 wei.
  const outcome = await adapter.prepareReplacement({ ...replacement, previous: { maxFeePerGas: "4000000", maxPriorityFeePerGas: "1" } });
  assert.equal(outcome.kind, "prepared");
  const { fee } = outcome as Extract<typeof outcome, { kind: "prepared" }>;
  assert.equal(fee.maxFeePerGas, "6000001", "base fee x 1.2 + tip, above 4,000,000 x 1.25");
  assert.equal(fee.maxPriorityFeePerGas, "2", "a tip of 1 wei still rises strictly");
});

test("a nonce the chain already counts as used is not replaced, and nothing is signed", async () => {
  const raws: Hex[] = [];
  const { adapter, methods } = adapterOn(chainWith({ latest: 4, pending: 4 }, raws));
  assert.deepEqual(await adapter.prepareReplacement({ ...replacement, previous: { maxFeePerGas: "100", maxPriorityFeePerGas: "1" } }), { kind: "nonceConsumed" });
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("no raise that fits under the ceiling means the replacement is refused with its own code", async () => {
  const raws: Hex[] = [];
  const { adapter, methods } = adapterOn(chainWith({ latest: 3, pending: 4 }, raws));
  const ceiling = maxFeeCeiling[84532];
  for (const previous of [{ maxFeePerGas: String(ceiling), maxPriorityFeePerGas: "1" }, { maxFeePerGas: String(ceiling * 95n / 100n), maxPriorityFeePerGas: "1" }]) {
    assert.deepEqual(await adapter.prepareReplacement({ ...replacement, previous }), { kind: "definitelyNotSent", code: "fee_ceiling_reached" });
  }
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("through the worker: a stuck grant is replaced at its nonce, and reconcile settles on the hash that mined", async () => {
  const raws: Hex[] = [];
  const counts = { latest: 0, pending: 0 };
  let mined: Hex | undefined;
  const handlers = chainWith(counts, raws);
  handlers.eth_getTransactionReceipt = (params) => params[0] === mined ? receipt("0x1", [transferLog(11n)]) : null;
  handlers.eth_getTransactionByHash = () => null;
  handlers.eth_blockNumber = deep;
  const { adapter } = adapterOn(handlers);
  const { payload, rows } = fakePayload([{ id: "k", operationKey: "unlock-grant:v1:o:1", entitlement: "adm", state: "pending", attempts: 0, target }]);
  const start = Date.UTC(2026, 10, 16, 12);
  assert.equal(await dispatchKeyGrants({ payload, adapter, now: () => new Date(start) }), 1);
  const later = () => new Date(start + REPLACE_AFTER_MS + 1000);
  assert.equal(await replaceStuckKeyGrants({ payload, adapter, now: later }), 1);
  const [intent] = rows["commerce-key-grant-intents"];
  const [original, replaced] = raws.map((raw) => parseTransaction(raw));
  assert.deepEqual([original.nonce, replaced.nonce, intent.nonce], [0, 0, 0]);
  assert.ok(atLeastTenPercentAbove(replaced.maxFeePerGas!, original.maxFeePerGas!));
  assert.deepEqual((intent.sends as { txHash: string }[]).map((send) => send.txHash), raws.map((raw) => keccak256(raw)));
  mined = keccak256(raws[1]);
  counts.latest = 1;
  await reconcileKeyGrants({ payload, adapter, now: later });
  assert.deepEqual([intent.state, intent.tokenID, intent.settledTxHash, intent.txHash], ["granted", "11", mined, keccak256(raws[0])]);
});
