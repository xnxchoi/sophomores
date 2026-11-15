import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, keccak256, maxUint256, numberToHex, parseTransaction, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { confirmationDepth, createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { hashOf, healthyChain, lockAbi, lockAddress, lockCalls, mockChain, receipt, recipient, revertNotGranter, RpcFailure, target, transferLog, uint, uintArray } from "./support/mock-chain";

// Throwaway, well-known test scalar; never funded anywhere.
const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const now = () => new Date("2026-11-16T00:00:00Z");
const input = { intentID: "intent-1", attemptID: "attempt-1", target };
// The mocked receipts sit in block 100; `deep` is the head at which they reach Base Sepolia's depth.
const deep = () => numberToHex(100 + confirmationDepth[84532] - 1);
const adapterOn = (handlers: ReturnType<typeof healthyChain>) => {
  const chain = mockChain(handlers);
  return { ...chain, adapter: createUnlockKeyGrantAdapter({ chainID: 84532, account, transport: chain.transport, now }) };
};

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
    assert.deepEqual(await adapter.submit({ ...input, target: elsewhere }), { kind: "definitelyNotSent", code: "chain_not_enabled" });
    assert.deepEqual(await adapter.reconcile({ intentID: "intent-1", txHash: hashOf("c"), target: elsewhere }), { kind: "unknown" });
    assert.equal(requests.length, 0);
  }
});

test("a revert in simulation is definitely not sent, and nothing is broadcast", async () => {
  const { adapter, methods } = adapterOn(healthyChain({ eth_call: lockCalls({ expirationDuration: () => uint(1n), grantKeys: revertNotGranter }) }));
  assert.deepEqual(await adapter.submit(input), { kind: "definitelyNotSent", code: "simulation_reverted" });
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("an RPC failure before broadcast is definitely not sent", async () => {
  const { adapter, methods } = adapterOn(healthyChain({ eth_getTransactionCount: () => { throw new RpcFailure(-32000, "upstream unavailable"); } }));
  assert.deepEqual(await adapter.submit(input), { kind: "definitelyNotSent", code: "rpc_unavailable" });
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("a failure during broadcast is unknown and carries the locally computed hash", async () => {
  let raw: Hex | undefined;
  const { adapter } = adapterOn(healthyChain({ eth_sendRawTransaction: (params) => { raw = params[0] as Hex; throw new RpcFailure(-32000, "connection reset"); } }));
  const outcome = await adapter.submit(input);
  assert.ok(raw, "the signed transaction reached the broadcast call");
  assert.deepEqual(outcome, { kind: "unknown", txHash: keccak256(raw!) });
});

test("a node answering with a different hash is unknown, never submitted", async () => {
  let raw: Hex | undefined;
  const { adapter } = adapterOn(healthyChain({ eth_sendRawTransaction: (params) => { raw = params[0] as Hex; return hashOf("9"); } }));
  assert.deepEqual(await adapter.submit(input), { kind: "unknown", txHash: keccak256(raw!) });
});

test("a broadcast grants one key to the target recipient on the target lock", async () => {
  let raw: Hex | undefined;
  const { adapter } = adapterOn(healthyChain({ eth_sendRawTransaction: (params) => { raw = params[0] as Hex; return keccak256(raw); } }));
  const outcome = await adapter.submit(input);
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
    eth_call: lockCalls({ expirationDuration: () => uint(maxUint256), grantKeys: () => uintArray([1n]) }),
    eth_sendRawTransaction: (params) => { raw = params[0] as Hex; return keccak256(raw); },
  }));
  await adapter.submit(input);
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
