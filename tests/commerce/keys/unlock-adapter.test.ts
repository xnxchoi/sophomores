import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, keccak256, maxUint256, numberToHex, parseTransaction, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { KeyGrantAdapter } from "@/lib/commerce/keys/contracts";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { confirmationDepth, maxFeeCeiling } from "@/lib/commerce/keys/unlock/transactions";
import { dispatchKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload } from "./support/fake-payload";
import { hashOf, healthyChain, lockAbi, lockAddress, lockCalls, mockChain, receipt, recipient, revertNotGranter, RpcFailure, target, transferLog, uint, uintArray } from "./support/mock-chain";

// Throwaway, well-known test scalar; never funded anywhere.
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const now = () => new Date("2026-11-16T00:00:00Z");
const input = { intentID: "intent-1", attemptID: "attempt-1", target, nonceFloor: 0 };
// The mocked receipts sit in block 100; `deep` is the head at which they reach Base Sepolia's depth.
const deep = () => numberToHex(100 + confirmationDepth[84532] - 1);
// Each adapter gets its own throwaway signer, so per-signer nonce lanes never leak between tests.
const adapterOn = (handlers: ReturnType<typeof healthyChain>, options: { holdMs?: number } = {}) => {
  const chain = mockChain(handlers);
  return { ...chain, adapter: createUnlockKeyGrantAdapter({ chainID: 84532, account: privateKeyToAccount(generatePrivateKey()), transport: chain.transport, now, ...options }) };
};
/** One dispatch as the worker runs it: prepare, (hash made durable), broadcast. */
async function submit(adapter: KeyGrantAdapter, grant: typeof input = input) {
  const prepared = await adapter.prepare(grant);
  if (prepared.kind !== "prepared") return prepared;
  return { ...(await adapter.broadcast({ intentID: grant.intentID, txHash: prepared.txHash })), txHash: prepared.txHash };
}
const nonceOf = (raw: Hex) => parseTransaction(raw).nonce;

test("Base mainnet (8453) is refused when the adapter is built", () => {
  assert.throws(() => createUnlockKeyGrantAdapter({ chainID: 8453, account, transport: mockChain({}).transport }), /8453/);
});

test("every chain except Base Sepolia (84532) is refused when the adapter is built, including Polygon (137)", () => {
  for (const chainID of [137, 8453, 1, 11155111]) {
    assert.throws(() => createUnlockKeyGrantAdapter({ chainID, account, transport: mockChain({}).transport }), new RegExp(String(chainID)));
  }
});

test("8453 and 137 targets are refused before any request reaches a chain", async () => {
  for (const chainID of [8453, 137]) {
    const { adapter, requests } = adapterOn(healthyChain());
    const elsewhere = { ...target, chainID };
    assert.deepEqual(await submit(adapter, { ...input, target: elsewhere }), { kind: "definitelyNotSent", code: "chain_not_enabled" });
    assert.deepEqual(await adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target: elsewhere }), { kind: "unknown" });
    assert.equal(requests.length, 0);
  }
});

test("a revert in simulation is definitely not sent, and nothing is broadcast", async () => {
  const { adapter, methods } = adapterOn(healthyChain({ eth_call: lockCalls({ totalKeys: () => uint(0n), expirationDuration: () => uint(1n), grantKeys: revertNotGranter }) }));
  assert.deepEqual(await submit(adapter), { kind: "definitelyNotSent", code: "simulation_reverted" });
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("an RPC failure before broadcast is definitely not sent", async () => {
  const { adapter, methods } = adapterOn(healthyChain({ eth_getTransactionCount: () => { throw new RpcFailure(-32000, "upstream unavailable"); } }));
  assert.deepEqual(await submit(adapter), { kind: "definitelyNotSent", code: "rpc_unavailable" });
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("a failure during broadcast is unknown and carries the locally computed hash", async () => {
  let raw: Hex | undefined;
  const { adapter } = adapterOn(healthyChain({ eth_sendRawTransaction: (params) => { raw = params[0] as Hex; throw new RpcFailure(-32000, "connection reset"); } }));
  const outcome = await submit(adapter);
  assert.ok(raw, "the signed transaction reached the broadcast call");
  assert.deepEqual(outcome, { kind: "unknown", txHash: keccak256(raw!) });
});

test("a node answering with a different hash is unknown, never submitted", async () => {
  let raw: Hex | undefined;
  const { adapter } = adapterOn(healthyChain({ eth_sendRawTransaction: (params) => { raw = params[0] as Hex; return hashOf("9"); } }));
  assert.deepEqual(await submit(adapter), { kind: "unknown", txHash: keccak256(raw!) });
});

test("a broadcast grants one key to the target recipient on the target lock", async () => {
  let raw: Hex | undefined;
  const { adapter } = adapterOn(healthyChain({ eth_sendRawTransaction: (params) => { raw = params[0] as Hex; return keccak256(raw); } }));
  const outcome = await submit(adapter);
  assert.deepEqual(outcome, { kind: "submitted", txHash: keccak256(raw!) });
  const transaction = parseTransaction(raw!);
  assert.equal(transaction.chainId, 84532);
  assert.equal(transaction.to?.toLowerCase(), lockAddress);
  const call = decodeFunctionData({ abi: lockAbi, data: transaction.data! });
  assert.equal(call.functionName, "grantKeys");
  const [recipients, expirations, managers] = call.args as [Hex[], bigint[], Hex[]];
  assert.deepEqual(recipients.map((address) => address.toLowerCase()), [recipient]);
  assert.deepEqual(expirations, [BigInt(now().getTime() / 1000) + 30n * 86_400n], "expiry follows the lock's own duration");
  assert.deepEqual(managers, ["0x0000000000000000000000000000000000000000"], "the holder manages their own key");
});

test("a lock with non-expiring keys grants a non-expiring key", async () => {
  let raw: Hex | undefined;
  const { adapter } = adapterOn(healthyChain({
    eth_call: lockCalls({ totalKeys: () => uint(0n), expirationDuration: () => uint(maxUint256), grantKeys: () => uintArray([1n]) }),
    eth_sendRawTransaction: (params) => { raw = params[0] as Hex; return keccak256(raw); },
  }));
  await submit(adapter);
  const call = decodeFunctionData({ abi: lockAbi, data: parseTransaction(raw!).data! });
  assert.deepEqual((call.args as [Hex[], bigint[], Hex[]])[1], [maxUint256]);
});

test("reconcile confirms a successful receipt with the minted token ID", async () => {
  const { adapter } = adapterOn({ eth_getTransactionReceipt: () => receipt("0x1", [transferLog(42n)]), eth_blockNumber: deep });
  assert.deepEqual(await adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target }), { kind: "confirmed", tokenID: "42" });
});

test("reconcile reports a reverted receipt as definitely reverted", async () => {
  const { adapter } = adapterOn({ eth_getTransactionReceipt: () => receipt("0x0", []), eth_blockNumber: deep });
  assert.deepEqual(await adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target }), { kind: "definitelyReverted", code: "tx_reverted" });
});

test("confirmation depth is a per-chain setting, conservative for Polygon", () => {
  assert.ok(confirmationDepth[84532] >= 2, "Base Sepolia waits beyond inclusion");
  assert.ok(confirmationDepth[137] > 157, "Polygon waits past its largest publicly reported reorg (157 blocks)");
});

test("a receipt one block short of the chain's depth stays unknown, whether it succeeded or reverted", async () => {
  const shallow = () => numberToHex(100 + confirmationDepth[84532] - 2);
  for (const answer of [receipt("0x1", [transferLog(42n)]), receipt("0x0", [])]) {
    const { adapter } = adapterOn({ eth_getTransactionReceipt: () => answer, eth_blockNumber: shallow });
    assert.deepEqual(await adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target }), { kind: "unknown" });
  }
  const { adapter } = adapterOn({ eth_getTransactionReceipt: () => receipt("0x1", [transferLog(42n)]), eth_blockNumber: () => { throw new RpcFailure(-32000, "upstream unavailable"); } });
  assert.deepEqual(await adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target }), { kind: "unknown" }, "an unknown head is not depth");
});

test("pending and unseen transactions are told apart, and both stay unknown", async () => {
  const notFound = () => null;
  const pending = adapterOn({ eth_getTransactionReceipt: notFound, eth_getTransactionByHash: () => ({ hash: hashOf("c"), blockNumber: null, blockHash: null, transactionIndex: null, from: `0x${"e".repeat(40)}`, to: lockAddress, nonce: "0x0", gas: "0x1", value: "0x0", input: "0x", type: "0x2", maxFeePerGas: "0x1", maxPriorityFeePerGas: "0x1", chainId: "0x14a34", v: "0x0", r: hashOf("1"), s: hashOf("2"), yParity: "0x0", accessList: [] }) });
  assert.equal((await pending.adapter.inspect(hashOf("c"))).status, "pending");
  assert.deepEqual(await pending.adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target }), { kind: "unknown" });
  const unseen = adapterOn({ eth_getTransactionReceipt: notFound, eth_getTransactionByHash: notFound });
  assert.equal((await unseen.adapter.inspect(hashOf("c"))).status, "not_found");
  assert.deepEqual(await unseen.adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target }), { kind: "unknown" });
});

test("an unreachable chain is unknown on reconcile", async () => {
  const { adapter } = adapterOn({ eth_getTransactionReceipt: () => { throw new RpcFailure(-32000, "upstream unavailable"); } });
  assert.equal((await adapter.inspect(hashOf("c"))).status, "unavailable");
  assert.deepEqual(await adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target }), { kind: "unknown" });
});

test("a success that does not prove exactly one mint to the recipient on the lock stays unknown", async () => {
  const other = `0x${"d".repeat(40)}` as const;
  const cases = [
    receipt("0x1", []),
    receipt("0x1", [transferLog(1n, { to: other })]),
    receipt("0x1", [transferLog(1n, { address: other })]),
    receipt("0x1", [transferLog(1n, { from: other })]),
    receipt("0x1", [transferLog(1n), transferLog(2n)]),
    receipt("0x1", [transferLog(1n)], other),
  ];
  for (const answer of cases) {
    const { adapter } = adapterOn({ eth_getTransactionReceipt: () => answer, eth_blockNumber: deep });
    assert.deepEqual(await adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target }), { kind: "unknown" });
  }
});

test("a recipient who already holds a key on the lock, valid or expired, is refused before signing", async () => {
  // PublicLock v14 grantKeys always mints (never extends); with a key held it reverts MAX_KEYS_REACHED or mints a second key.
  const { adapter, methods } = adapterOn(healthyChain({ eth_call: lockCalls({ totalKeys: () => uint(1n), expirationDuration: () => uint(1n), grantKeys: () => uintArray([2n]) }) }));
  assert.deepEqual(await submit(adapter), { kind: "definitelyNotSent", code: "recipient_has_key" });
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("a transport on another chain is refused before any lock read, and never reconciled", async () => {
  const { adapter, methods } = adapterOn(healthyChain({ eth_chainId: () => numberToHex(1), eth_getTransactionReceipt: () => receipt("0x1", [transferLog(1n)]) }));
  assert.deepEqual(await submit(adapter), { kind: "definitelyNotSent", code: "chain_mismatch" });
  assert.deepEqual(await adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target }), { kind: "unknown" });
  assert.deepEqual(methods().filter((method) => method !== "eth_chainId"), []);
});

// The RPC's `pending` count lags (it equals `latest`): every request answers 0.
const lagging = (raws: Hex[], answer: (raw: Hex) => unknown = (raw) => keccak256(raw)) =>
  healthyChain({ eth_getTransactionCount: () => "0x0", eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return answer(params[0] as Hex); } });

test("two and three sequential grants from one signer take consecutive nonces even when the RPC's pending count lags", async () => {
  for (const count of [2, 3]) {
    const raws: Hex[] = [];
    const { adapter } = adapterOn(lagging(raws));
    for (let index = 0; index < count; index++) assert.equal((await submit(adapter)).kind, "submitted");
    assert.deepEqual(raws.map(nonceOf), Array.from({ length: count }, (_, index) => index));
  }
});

test("a prepared grant holds its signer: a concurrent prepare waits and takes the next nonce", async () => {
  const raws: Hex[] = [];
  const { adapter } = adapterOn(lagging(raws));
  const first = await adapter.prepare(input);
  let secondDone = false;
  const second = adapter.prepare(input).then((outcome) => { secondDone = true; return outcome; });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(secondDone, false, "the second prepare waits for the first broadcast");
  assert.equal(first.kind, "prepared");
  await adapter.broadcast({ intentID: "intent-1", txHash: (first as { txHash: string }).txHash });
  const prepared = await second;
  await adapter.broadcast({ intentID: "intent-1", txHash: (prepared as { txHash: string }).txHash });
  assert.deepEqual(raws.map(nonceOf), [0, 1]);
});

test("a released or expired prepare never broadcasts, and its nonce is reused", async () => {
  const raws: Hex[] = [];
  const { adapter } = adapterOn(lagging(raws), { holdMs: 30 });
  const released = await adapter.prepare(input);
  adapter.release({ txHash: (released as { txHash: string }).txHash });
  assert.deepEqual(await adapter.broadcast({ intentID: "intent-1", txHash: (released as { txHash: string }).txHash }), { kind: "definitelyNotSent", code: "not_prepared" });
  const expired = await adapter.prepare(input);
  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.deepEqual(await adapter.broadcast({ intentID: "intent-1", txHash: (expired as { txHash: string }).txHash }), { kind: "definitelyNotSent", code: "not_prepared" });
  assert.equal((await submit(adapter)).kind, "submitted");
  assert.deepEqual(raws.map(nonceOf), [0], "only the last grant was sent, at the first nonce");
});

test("after an unknown broadcast the next grant never reuses that nonce, whether or not the node holds it", async () => {
  // Its nonce is recorded on its intent, which a replacement re-signs; handing it to another grant would let that replacement overwrite it.
  for (const held of [true, false]) {
    const raws: Hex[] = [];
    let first = true;
    const handlers = lagging(raws, (raw) => { if (first) { first = false; throw new RpcFailure(-32000, "connection reset"); } return keccak256(raw); });
    handlers.eth_getTransactionByHash = (params) => held ? { hash: params[0], blockNumber: null, blockHash: null, transactionIndex: null, from: `0x${"e".repeat(40)}`, to: lockAddress, nonce: "0x0", gas: "0x1", value: "0x0", input: "0x", type: "0x2", maxFeePerGas: "0x1", maxPriorityFeePerGas: "0x1", chainId: "0x14a34", v: "0x0", r: hashOf("1"), s: hashOf("2"), yParity: "0x0", accessList: [] } : null;
    const { adapter } = adapterOn(handlers);
    assert.equal((await submit(adapter)).kind, "unknown");
    assert.equal((await submit(adapter)).kind, "submitted");
    assert.deepEqual(raws.map(nonceOf), [0, 1], held ? "the held transaction keeps its nonce" : "the unseen one keeps it too; its own replacement fills the gap");
  }
});

test("the adapter names its signer as a CAIP-10 account, and a prepared grant reports the nonce and fee it signed", async () => {
  const raws: Hex[] = [];
  const signer = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(lagging(raws));
  const adapter = createUnlockKeyGrantAdapter({ chainID: 84532, account: signer, transport: chain.transport, now });
  assert.equal(adapter.signer, `eip155:84532:${signer.address.toLowerCase()}`);
  const prepared = await adapter.prepare({ ...input, nonceFloor: 5 });
  assert.equal(prepared.kind, "prepared");
  const { txHash, nonce, fee } = prepared as Extract<typeof prepared, { kind: "prepared" }>;
  await adapter.broadcast({ intentID: input.intentID, txHash });
  const sent = parseTransaction(raws[0]);
  assert.equal(nonce, 5, "the worker's floor wins over a lagging pending count");
  assert.equal(sent.nonce, 5);
  assert.deepEqual(fee, { maxFeePerGas: String(sent.maxFeePerGas), maxPriorityFeePerGas: String(sent.maxPriorityFeePerGas) }, "the fee recorded is the fee signed");
});

test("a first send whose fee would pass the chain's ceiling is not sent", async () => {
  const { adapter, methods } = adapterOn(healthyChain({ eth_getBlockByNumber: () => ({ ...(healthyChain().eth_getBlockByNumber([]) as object), baseFeePerGas: numberToHex(maxFeeCeiling[84532]) }) }));
  assert.deepEqual(await submit(adapter), { kind: "definitelyNotSent", code: "fee_above_ceiling" });
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("one dispatch pass sends two and three grants with consecutive nonces through the worker", async () => {
  for (const count of [2, 3]) {
    const raws: Hex[] = [];
    const { adapter } = adapterOn(lagging(raws));
    const intents = Array.from({ length: count }, (_, index) => ({ id: `i${index}`, operationKey: `unlock-grant:v1:o:${index + 1}`, entitlement: "adm", state: "pending", attempts: 0, target }));
    const { payload, rows } = fakePayload(intents);
    assert.equal(await dispatchKeyGrants({ payload, adapter }), count);
    assert.deepEqual(raws.map(nonceOf), Array.from({ length: count }, (_, index) => index));
    assert.deepEqual(rows["commerce-key-grant-intents"].map((row) => [row.state, row.txHash]), raws.map((raw) => ["submitted", keccak256(raw)]));
  }
});

test("a hanging send times out as unknown, not definitely not sent", async (t) => {
  let enter!: () => void;
  const entered = new Promise<void>(resolve => { enter = resolve; });
  let answer!: (hash: Hex) => void;
  const pending = new Promise<Hex>(resolve => { answer = resolve; });
  const { adapter, methods } = adapterOn(healthyChain({
    eth_sendRawTransaction: () => { enter(); return pending; },
  }));
  const prepared = await adapter.prepare(input);
  assert.equal(prepared.kind, "prepared");
  if (prepared.kind !== "prepared") return;
  t.mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const result = adapter.broadcast({ intentID: input.intentID, txHash: prepared.txHash });
    await entered;
    t.mock.timers.tick(5_000);
    assert.deepEqual(await result, { kind: "unknown" });
    assert.equal(methods().filter(method => method === "eth_sendRawTransaction").length, 1);
  } finally {
    answer(prepared.txHash as Hex);
    t.mock.timers.reset();
  }
});
