import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import PublicLockV15 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV15.json";
import { decodeFunctionData, numberToHex, type Abi, type AbiFunction, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { createUnlockKeyCancelAdapter } from "@/lib/commerce/keys/unlock/cancel";
import { dispatchKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload } from "./support/fake-payload";
import { address, healthyChain, lockAbi, lockAddress, lockCalls, mockChain, recipient, uint, uintArray } from "./support/mock-chain";

// Owner, 24 Nov: "our lock is v15". The Signet lock reads publicLockVersion 15; Edition I reads 14. Our adapters
// use the v14 ABI, so every fragment they call or decode must be identical in v15, and a v15 lock whose role hook
// is set (it decides who holds the granter and manager roles) parks instead of being signed for.

const live = { KEY_GRANT_POLYGON_LIVE: "1", KEY_GRANT_POLYGON_MAX_COST_WEI: "1000000000000000000" } as const;
const target = { chainID: 137, lock: lockAddress, recipient };
const zero = `0x${"0".repeat(40)}` as const;
const hook = `0x${"9".repeat(40)}` as const;
const bool = (value: boolean): Hex => (value ? `0x${"0".repeat(63)}1` : `0x${"0".repeat(64)}`);

type Fragment = { type: string; name?: string; inputs?: unknown; outputs?: unknown; stateMutability?: string; anonymous?: boolean };
const fragments = (abi: readonly Fragment[], type: string, name: string) =>
  abi.filter((item) => item.type === type && item.name === name)
    .map(({ inputs, outputs, stateMutability, anonymous }) => JSON.stringify({ inputs, outputs, stateMutability, anonymous }));

test("every PublicLock function, event and error our adapters use is identical in the v14 and v15 ABIs", async () => {
  const sources = await Promise.all(["adapter.ts", "cancel.ts"].map((file) => readFile(`src/lib/commerce/keys/unlock/${file}`, "utf8")));
  const used = (pattern: RegExp) => [...new Set(sources.flatMap((source) => [...source.matchAll(pattern)].map((match) => match[1])))];
  const functions = used(/functionName: "(\w+)"/g);
  const readNames = used(/read\([^,]+, "(\w+)"/g);
  const events = used(/eventName: "(\w+)"/g);
  // The adapters' own read list must be what the source calls; a new call without a check here fails this test.
  assert.deepEqual([...new Set([...functions, ...readNames])].sort(),
    ["expirationDuration", "expireAndRefundFor", "grantKeys", "isLockManager", "isValidKey", "ownerOf", "totalKeys"]);
  assert.deepEqual(events.sort(), ["CancelKey", "Transfer"]);
  const v14 = PublicLockV14.abi as readonly Fragment[];
  const v15 = PublicLockV15.abi as readonly Fragment[];
  for (const name of [...functions, ...readNames, "publicLockVersion"]) {
    assert.equal(fragments(v14, "function", name).length, 1, name);
    assert.deepEqual(fragments(v15, "function", name), fragments(v14, "function", name), name);
  }
  for (const name of events) assert.deepEqual(fragments(v15, "event", name), fragments(v14, "event", name), name);
  assert.deepEqual(fragments(v15, "error", "ONLY_LOCK_MANAGER_OR_KEY_GRANTER"), fragments(v14, "error", "ONLY_LOCK_MANAGER_OR_KEY_GRANTER"));
  // v15 adds the role hook the preflight reads.
  assert.equal(fragments(v14, "function", "onHasRoleHook").length, 0);
  assert.equal((v15 as readonly AbiFunction[]).find((item) => item.name === "onHasRoleHook")?.outputs[0]?.type, "address");
});

const polygon = (calls: Record<string, () => Hex> = {}) => healthyChain({
  eth_chainId: () => numberToHex(137),
  eth_call: lockCalls({ totalKeys: () => uint(0n), expirationDuration: () => uint(30n * 86_400n), grantKeys: () => uintArray([1n]),
    publicLockVersion: () => uint(15n), onHasRoleHook: () => address(zero), isLockManager: () => bool(true), ownerOf: () => address(recipient),
    isValidKey: () => bool(true), expireAndRefundFor: () => "0x", ...calls }),
});
function granter(handlers: ReturnType<typeof healthyChain>) {
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(handlers);
  return { ...chain, adapter: createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, env: live, polygon: { lock: lockAddress, granter: account.address } }) };
}
function canceller(handlers: ReturnType<typeof healthyChain>) {
  const chain = mockChain(handlers);
  return { ...chain, adapter: createUnlockKeyCancelAdapter({ chainID: 137, account: privateKeyToAccount(generatePrivateKey()), transport: chain.transport, env: live, polygonLock: lockAddress }) };
}
const callAbi = [...lockAbi, { type: "function", name: "onHasRoleHook", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" }] as Abi;
const calledFunctions = (requests: { method: string; params?: unknown[] }[]) => requests.filter((request) => request.method === "eth_call")
  .map((request) => decodeFunctionData({ abi: callAbi, data: (request.params?.[0] as { data: Hex }).data }).functionName);
const previous = { maxFeePerGas: "1", maxPriorityFeePerGas: "1" };

test("a v15 lock with a role hook set parks grants and replacements before any simulation or signature", async () => {
  const { adapter, requests } = granter(polygon({ onHasRoleHook: () => address(hook) }));
  assert.deepEqual(await adapter.prepare({ intentID: "i", attemptID: "a", target, nonceFloor: 0 }), { kind: "definitelyNotSent", code: "role_hook_set" });
  assert.deepEqual(await adapter.prepareReplacement({ intentID: "i", target, nonce: 0, previous }), { kind: "definitelyNotSent", code: "role_hook_set" });
  assert.equal(calledFunctions(requests).some((name) => name === "grantKeys" || name === "totalKeys"), false);
  assert.equal(requests.some((request) => request.method === "eth_sendRawTransaction" || request.method === "eth_estimateGas"), false);
});

test("a v15 lock with no hook, and a v14 lock (no hook to read), grant as before", async () => {
  const v15 = granter(polygon());
  assert.equal((await v15.adapter.prepare({ intentID: "i", attemptID: "a", target, nonceFloor: 0 })).kind, "prepared");
  assert.deepEqual(calledFunctions(v15.requests).slice(0, 2), ["publicLockVersion", "onHasRoleHook"]);
  const v14 = granter(polygon({ publicLockVersion: () => uint(14n), onHasRoleHook: () => { throw new Error("v14 has no hook"); } }));
  assert.equal((await v14.adapter.prepare({ intentID: "i", attemptID: "a", target, nonceFloor: 0 })).kind, "prepared");
  assert.equal(calledFunctions(v14.requests).includes("onHasRoleHook"), false);
});

test("an unreadable lock version or hook is retried (rpc_unavailable), never signed or parked", async () => {
  const down = (): Hex => { throw new Error("down"); };
  for (const calls of [{ publicLockVersion: down }, { onHasRoleHook: down }] as Record<string, () => Hex>[]) {
    const { adapter, requests } = granter(polygon(calls));
    assert.deepEqual(await adapter.prepare({ intentID: "i", attemptID: "a", target, nonceFloor: 0 }), { kind: "definitelyNotSent", code: "rpc_unavailable" });
    assert.equal(calledFunctions(requests).includes("grantKeys"), false);
  }
});

test("a v15 lock with a role hook set parks owner cancels before the lock-manager check", async () => {
  const { adapter, requests } = canceller(polygon({ onHasRoleHook: () => address(hook) }));
  assert.deepEqual(await adapter.prepareCancel({ intentID: "i", target, tokenID: "5", nonceFloor: 0 }), { kind: "definitelyNotSent", code: "role_hook_set" });
  assert.deepEqual(await adapter.prepareCancelReplacement({ intentID: "i", target, tokenID: "5", nonce: 0, previous }), { kind: "definitelyNotSent", code: "role_hook_set" });
  assert.equal(calledFunctions(requests).some((name) => name === "isLockManager" || name === "expireAndRefundFor"), false);
});

test("Base Sepolia never reads the role hook", async () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(healthyChain());
  const adapter = createUnlockKeyGrantAdapter({ chainID: 84532, account, transport: chain.transport });
  assert.equal((await adapter.prepare({ intentID: "i", attemptID: "a", target: { ...target, chainID: 84532 }, nonceFloor: 0 })).kind, "prepared");
  assert.equal(calledFunctions(chain.requests).some((name) => name === "publicLockVersion" || name === "onHasRoleHook"), false);
});

test("a grant parked on a role hook is loud: one fixed line, the intent stays parked for a person", async () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (line: unknown) => { lines.push(String(line)); };
  try {
    const { adapter } = granter(polygon({ onHasRoleHook: () => address(hook) }));
    const { payload, rows } = fakePayload([{ id: "i7", operationKey: "unlock-grant:v1:order-7:1", entitlement: "adm", state: "pending", attempts: 0, target }]);
    await dispatchKeyGrants({ payload, adapter });
    const row = rows["commerce-key-grant-intents"][0];
    assert.deepEqual([row.state, row.lastErrorCode, row.nextAttemptAt], ["failed_retryable", "role_hook_set", null]);
  } finally {
    console.error = original;
  }
  assert.deepEqual(lines.map((line) => JSON.parse(line)), [{ event: "key_grant_parked", intent: "i7", code: "role_hook_set" }]);
});
