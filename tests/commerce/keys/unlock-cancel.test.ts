import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeFunctionData, encodeAbiParameters, keccak256, numberToHex, parseTransaction, recoverTransactionAddress, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { confirmationDepth } from "@/lib/commerce/keys/unlock/transactions";
import { createUnlockKeyCancelAdapter } from "@/lib/commerce/keys/unlock/cancel";
import { cancelKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload } from "./support/fake-payload";
import { cancelLog, healthyChain, lockAbi, lockAddress, lockCalls, mockChain, receipt, recipient, revertNotGranter, RpcFailure, target, transferLog } from "./support/mock-chain";

const manager = privateKeyToAccount(generatePrivateKey());
const deep = () => numberToHex(100 + confirmationDepth[84532] - 1);
const bool = (value: boolean): Hex => encodeAbiParameters([{ type: "bool" }], [value]);
const address = (value: Hex): Hex => encodeAbiParameters([{ type: "address" }], [value]);
/** A lock on which `manager` is a lock manager and token 5 is the recipient's valid key. */
const lockState = (overrides: Partial<Record<string, () => Hex>> = {}) => lockCalls({
  isLockManager: () => bool(true), ownerOf: () => address(recipient), isValidKey: () => bool(true), expireAndRefundFor: () => "0x", ...overrides,
});
const cancellerOn = (handlers: ReturnType<typeof healthyChain>, account = manager) => {
  const chain = mockChain(handlers);
  return { ...chain, adapter: createUnlockKeyCancelAdapter({ chainID: 84532, account, transport: chain.transport }) };
};
const input = { intentID: "intent-1", target, tokenID: "5", nonceFloor: 0 };

test("the cancel adapter is refused on every chain but Base Sepolia, and names its signer", () => {
  for (const chainID of [8453, 137, 1]) assert.throws(() => createUnlockKeyCancelAdapter({ chainID, account: manager }), /refused/);
  assert.equal(cancellerOn(healthyChain()).adapter.signer, `eip155:84532:${manager.address.toLowerCase()}`);
});

test("a cancel signs expireAndRefundFor(token, 0) on the target lock with the manager key", async () => {
  const raws: Hex[] = [];
  const { adapter } = cancellerOn(healthyChain({ eth_call: lockState(), eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); } }));
  const prepared = await adapter.prepareCancel({ ...input, nonceFloor: 2 });
  assert.equal(prepared.kind, "prepared");
  const { txHash, nonce } = prepared as Extract<typeof prepared, { kind: "prepared" }>;
  assert.deepEqual(await adapter.broadcast({ intentID: "intent-1", txHash }), { kind: "submitted" });
  const sent = parseTransaction(raws[0]);
  assert.equal(nonce, 2);
  assert.equal(sent.to?.toLowerCase(), lockAddress);
  assert.equal((await recoverTransactionAddress({ serializedTransaction: raws[0] as never })).toLowerCase(), manager.address.toLowerCase());
  const call = decodeFunctionData({ abi: lockAbi, data: sent.data! });
  assert.equal(call.functionName, "expireAndRefundFor");
  assert.deepEqual(call.args, [5n, 0n], "no on-chain refund: the KRW refund is PortOne's");
});

test("a signer that is not a lock manager is refused before anything is signed", async () => {
  const { adapter, methods } = cancellerOn(healthyChain({ eth_call: lockState({ isLockManager: () => bool(false) }) }));
  assert.deepEqual(await adapter.prepareCancel(input), { kind: "definitelyNotSent", code: "not_lock_manager" });
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("only canonical, depth-confirmed invalidity needs no cancel transaction", async () => {
  const head = BigInt(deep());
  const hash = `0x${"1".repeat(64)}` as const;
  const reads: unknown[] = [];
  for (const mode of ["deep-invalid", "shallow-invalid", "block-unavailable", "other-buried-owner", "not-canonical"]) {
    reads.length = 0;
    const { adapter, methods } = cancellerOn(healthyChain({
      eth_blockNumber: () => numberToHex(head),
      eth_getBlockByNumber: ([height]) => {
        assert.equal(height, "0x64");
        return mode === "block-unavailable" ? null : { number: height, hash };
      },
      eth_call: lockCalls({
        isLockManager: () => bool(true),
        ownerOf: ([, block]) => address(typeof block === "object" && mode === "other-buried-owner" ? `0x${"d".repeat(40)}` : recipient),
        isValidKey: ([, block]) => {
          reads.push(block);
          if (typeof block === "object" && mode === "not-canonical") throw new RpcFailure(-32000, "non-canonical block");
          return bool(typeof block === "object" && mode === "shallow-invalid");
        },
      }),
    }));
    const outcome = await adapter.prepareCancel(input);
    assert.equal(outcome.kind, mode === "deep-invalid" ? "confirmedKeyInvalid" : "definitelyNotSent", mode);
    assert.equal(methods().includes("eth_sendRawTransaction"), false, mode);
    if (mode !== "block-unavailable") assert.deepEqual(reads, ["latest", { blockHash: hash, requireCanonical: true }], mode);
  }
});

test("a token held by someone other than the intent's recipient, a malformed token, a revert or an RPC failure are not sent", async () => {
  const cases: [string, ReturnType<typeof healthyChain>, string, string?][] = [
    ["other owner", healthyChain({ eth_call: lockState({ ownerOf: () => address(`0x${"d".repeat(40)}`) }) }), "token_mismatch"],
    ["malformed token", healthyChain({ eth_call: lockState() }), "invalid_token", "5e3"],
    ["simulation revert", healthyChain({ eth_call: lockState({ expireAndRefundFor: revertNotGranter }) }), "simulation_reverted"],
    ["rpc failure", healthyChain({ eth_call: lockState(), eth_getTransactionCount: () => { throw new RpcFailure(-32000, "upstream unavailable"); } }), "rpc_unavailable"],
    ["other chain", healthyChain({ eth_chainId: () => numberToHex(1) }), "chain_mismatch"],
  ];
  for (const [label, handlers, code, tokenID] of cases) {
    const { adapter, methods } = cancellerOn(handlers);
    assert.deepEqual(await adapter.prepareCancel({ ...input, tokenID: tokenID ?? "5" }), { kind: "definitelyNotSent", code }, label);
    assert.equal(methods().includes("eth_sendRawTransaction"), false, label);
  }
  const { adapter } = cancellerOn(healthyChain());
  assert.deepEqual(await adapter.prepareCancel({ ...input, target: { ...target, chainID: 137 } }), { kind: "definitelyNotSent", code: "chain_not_enabled" });
});

test("reconcile confirms only one CancelKey for this token from the lock, with no refund, at depth", async () => {
  const at = (answer: unknown, head = deep) => cancellerOn({ eth_getTransactionReceipt: () => answer, eth_blockNumber: head }).adapter;
  const reconcile = (answer: unknown, head = deep) => at(answer, head).reconcileCancel({ txHash: `0x${"c".repeat(64)}`, target, tokenID: "5" });
  assert.deepEqual(await reconcile(receipt("0x1", [cancelLog(5n)])), { kind: "confirmed" });
  assert.deepEqual(await reconcile(receipt("0x0", [])), { kind: "definitelyReverted", code: "tx_reverted" });
  const other = `0x${"d".repeat(40)}` as const;
  for (const answer of [
    receipt("0x1", []),
    receipt("0x1", [cancelLog(6n)]),
    receipt("0x1", [cancelLog(5n, { refund: 1n })]),
    receipt("0x1", [cancelLog(5n, { address: other })]),
    receipt("0x1", [cancelLog(5n), cancelLog(5n)]),
    receipt("0x1", [transferLog(5n)]),
    receipt("0x1", [cancelLog(5n)], other),
  ]) assert.deepEqual(await reconcile(answer), { kind: "unknown" });
  assert.deepEqual(await reconcile(receipt("0x1", [cancelLog(5n)]), () => numberToHex(100 + confirmationDepth[84532] - 2)), { kind: "unknown" }, "one block short");
});

test("through the worker: a refunded key is cancelled on chain by the manager and recorded cancelled", async () => {
  const raws: Hex[] = [];
  let mined = false;
  const { adapter } = cancellerOn(healthyChain({
    eth_call: lockState(),
    eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); },
    eth_getTransactionReceipt: () => mined ? receipt("0x1", [cancelLog(5n)]) : null,
    eth_getTransactionByHash: () => null,
    eth_blockNumber: deep,
  }));
  const granter = `eip155:84532:0x${"1".repeat(40)}`;
  const { payload, rows } = fakePayload([{ id: "k", operationKey: "unlock-grant:v1:o:1", entitlement: "adm", state: "granted", attempts: 1, target, txHash: `0x${"d".repeat(64)}`, signer: granter, nonce: 0, tokenID: "5", cancelRequested: true }]);
  const start = Date.UTC(2026, 10, 16, 12);
  await cancelKeyGrants({ payload, adapter, now: () => new Date(start) });
  const [intent] = rows["commerce-key-grant-intents"];
  assert.equal(raws.length, 1);
  assert.deepEqual([intent.cancelTxHash, intent.cancelSigner], [keccak256(raws[0]), adapter.signer]);
  mined = true;
  await cancelKeyGrants({ payload, adapter, now: () => new Date(start + 60_000) });
  assert.equal(intent.state, "cancelled");
  assert.equal(raws.length, 1, "sent exactly once");
});

test("a cancel replacement re-signs expireAndRefundFor(token, 0) at the same nonce with higher fees, unless the nonce is used", async () => {
  const raws: Hex[] = [];
  const counts = { latest: 2 };
  const { adapter } = cancellerOn(healthyChain({
    eth_call: lockState(),
    eth_getTransactionCount: (params) => numberToHex(params[1] === "latest" ? counts.latest : 3),
    eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); },
  }));
  const previous = { maxFeePerGas: "6000001", maxPriorityFeePerGas: "1000" };
  const outcome = await adapter.prepareCancelReplacement({ intentID: "intent-1", target, tokenID: "5", nonce: 2, previous });
  assert.equal(outcome.kind, "prepared");
  const { txHash, raw, fee } = outcome as Extract<typeof outcome, { kind: "prepared" }>;
  assert.equal(keccak256(raw as Hex), txHash);
  assert.deepEqual(await adapter.broadcast({ intentID: "intent-1", txHash }), { kind: "submitted" });
  const sent = parseTransaction(raws[0]);
  assert.equal(sent.nonce, 2);
  assert.ok(BigInt(fee.maxFeePerGas) * 10n >= 6000001n * 11n && BigInt(fee.maxPriorityFeePerGas) * 10n >= 1000n * 11n);
  assert.deepEqual(decodeFunctionData({ abi: lockAbi, data: sent.data! }).args, [5n, 0n]);
  counts.latest = 3;
  assert.deepEqual(await adapter.prepareCancelReplacement({ intentID: "intent-1", target, tokenID: "5", nonce: 2, previous }), { kind: "nonceConsumed" });
  // Bound to its record: the same hash, nonce, lock and token (Review-A, 24 Nov).
  assert.deepEqual(await adapter.rebroadcast({ raw, txHash, nonce: 2, target, tokenID: "5" }), { kind: "accepted" });
  assert.deepEqual(await adapter.rebroadcast({ raw, txHash, nonce: 2, target, tokenID: "6" }), { kind: "refused", code: "rebroadcast_mismatch" }, "another token");
});
