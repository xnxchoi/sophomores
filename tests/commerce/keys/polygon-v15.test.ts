import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import PublicLockV14 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV14.json";
import PublicLockV15 from "@unlock-protocol/contracts/dist/abis/PublicLock/PublicLockV15.json";
import { decodeFunctionData, keccak256, numberToHex, parseTransaction, type Abi, type AbiFunction, type Hex, type LocalAccount } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { createUnlockKeyCancelAdapter } from "@/lib/commerce/keys/unlock/cancel";
import { dispatchKeyGrants, reconcileKeyGrants, reconcileOneKeyGrant } from "@/lib/commerce/keys/worker";
import { fakePayload } from "./support/fake-payload";
import { ANCESTRY_CAP, MAX_RECOVERY_WALK } from "@/lib/commerce/keys/unlock/transactions";
import { address, cancelLog, hashOf, healthyChain, lockAbi, lockAddress, lockCalls, mockChain, receipt, recipient, transferLog, uint, uintArray } from "./support/mock-chain";

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

const polygon = (calls: Record<string, (params: unknown[]) => Hex> = {}, methods: Record<string, (params: unknown[]) => unknown> = {}) => healthyChain({
  eth_chainId: () => numberToHex(137),
  eth_call: lockCalls({ totalKeys: () => uint(0n), expirationDuration: () => uint(30n * 86_400n), grantKeys: () => uintArray([1n]),
    publicLockVersion: () => uint(15n), onHasRoleHook: () => address(zero), isLockManager: () => bool(true), ownerOf: () => address(recipient),
    isValidKey: () => bool(true), expireAndRefundFor: () => "0x", ...calls }),
  ...methods,
  ...(typeof (methods.eth_getBlockByNumber as Partial<View> | undefined)?.byHash === "function" ? { eth_getBlockByHash: (methods.eth_getBlockByNumber as View).byHash } : {}),
});
function granter(handlers: ReturnType<typeof healthyChain>, account: LocalAccount = privateKeyToAccount(generatePrivateKey())) {
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

// Review-A, 25 Nov (r5): depth alone does not make a receipt canonical. A receipt whose block is not the canonical
// block at its height (reorged out, or served by a node on a stale fork) settles nothing and triggers no retry.
test("a buried receipt whose block is not the canonical block at its height stays unknown, success or revert", async () => {
  const deep = () => numberToHex(150);
  const finalized = { ...(healthyChain().eth_getBlockByNumber([]) as object), number: "0x64", hash: hashOf("1") };
  const atHeight = (hash: Hex | null) => (params: unknown[]) => {
    if (params[0] === "finalized") return finalized;
    assert.equal(params[0], "0x64");
    return hash === null ? null : { ...(healthyChain().eth_getBlockByNumber([]) as object), number: "0x64", hash };
  };
  const reorged = atHeight(hashOf("7"));
  const grants: [string, unknown, (params: unknown[]) => unknown, string][] = [
    ["canonical success", receipt("0x1", [transferLog(42n)]), atHeight(hashOf("1")), "confirmed"],
    ["canonical revert", receipt("0x0", []), atHeight(hashOf("1")), "definitelyReverted"],
    ["reorged success", receipt("0x1", [transferLog(42n)]), reorged, "unknown"],
    ["reorged revert", receipt("0x0", []), reorged, "unknown"],
    ["block unavailable", receipt("0x0", []), atHeight(null), "unknown"],
    ["block read fails", receipt("0x0", []), () => { throw new Error("down"); }, "unknown"],
  ];
  for (const [label, answer, block, kind] of grants) {
    const { adapter, methods } = granter(polygon({}, { eth_getTransactionReceipt: () => answer, eth_blockNumber: deep, eth_getBlockByNumber: block }));
    assert.equal((await adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, kind, label);
    assert.equal(methods().includes("eth_getBlockByNumber"), true, label);
  }
  for (const [label, block, kind] of [["canonical", atHeight(hashOf("1")), "confirmed"], ["reorged", reorged, "unknown"]] as const) {
    const { adapter } = canceller(polygon({}, { eth_getTransactionReceipt: () => receipt("0x1", [cancelLog(5n)]), eth_blockNumber: deep, eth_getBlockByNumber: block }));
    assert.equal((await adapter.reconcileCancel({ txHash: hashOf("c"), target, tokenID: "5" })).kind, kind, label);
  }
  for (const [label, block, kind] of [["canonical", atHeight(hashOf("1")), "definitelyReverted"], ["reorged", reorged, "unknown"]] as const) {
    const { adapter } = canceller(polygon({}, { eth_getTransactionReceipt: () => receipt("0x0", []), eth_blockNumber: deep, eth_getBlockByNumber: block }));
    assert.equal((await adapter.reconcileCancel({ txHash: hashOf("c"), target, tokenID: "5" })).kind, kind, label);
  }
});

// Review-A, 25 Nov (r5): the hook can change between signing and a re-send of the recorded bytes.
test("re-sending recorded bytes re-reads the role hook: set is refused, unreadable sends nothing, clear is sent", async () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const first = granter(polygon(), account);
  const prepared = await first.adapter.prepare({ intentID: "i", attemptID: "a", target, nonceFloor: 0 });
  assert.equal(prepared.kind, "prepared");
  const raw = (prepared as { raw: string }).raw as Hex;
  first.adapter.release({ txHash: keccak256(raw) });
  const record = { raw, txHash: keccak256(raw), nonce: parseTransaction(raw).nonce!, target };
  const down = (): Hex => { throw new Error("down"); };
  const cases: [string, Record<string, () => Hex>, string][] = [
    ["hook set", { onHasRoleHook: () => address(hook) }, "refused"],
    ["hook unreadable", { onHasRoleHook: down }, "unavailable"],
    ["version unreadable", { publicLockVersion: down }, "unavailable"],
    ["hook clear", {}, "accepted"],
  ];
  for (const [label, calls, kind] of cases) {
    const { adapter, methods } = granter(polygon(calls, { eth_sendRawTransaction: (params) => keccak256(params[0] as Hex) }), account);
    const answer = await adapter.rebroadcast(record);
    assert.deepEqual(answer, kind === "refused" ? { kind, code: "role_hook_set" } : { kind }, label);
    assert.equal(methods().includes("eth_sendRawTransaction"), kind === "accepted", label);
  }
});

// Owner, 25 Nov (r6): Polygon trusts a receipt once its block is finalized (milestones), not after a fixed 256 blocks.
const blockAt = (number: number, hash: Hex, parentHash: Hex = hashOf("2")) => ({ ...(healthyChain().eth_getBlockByNumber([]) as object), number: numberToHex(number), hash, parentHash });
const filler = (number: number): Hex => `0x${"a".repeat(8)}${number.toString(16).padStart(56, "0")}`;
type View = ((params: unknown[]) => unknown) & { byHash: (params: unknown[]) => unknown };
/**
 * A node's view: the block it names `finalized`, the hash it numbers at each height (answers in call order when a
 * list; unlisted heights get a filler hash), and by-hash answers whose parent is the numbered hash one height down.
 * `forks` adds blocks only reachable by hash (a fork's block: its height and parent).
 */
function view(finalized: [number, Hex] | null | "fails", numberedHashes: Record<number, Hex | Hex[]>, forks: Record<Hex, [number, Hex]> = {}, ancestry: Record<number, Hex> = {}): View {
  const served: Record<number, number> = {};
  // The by-hash (parent-link) chain: `ancestry` where given, otherwise the first numbered answer.
  const first = (number: number): Hex => { if (ancestry[number]) return ancestry[number]; const answer = numberedHashes[number]; return answer === undefined ? filler(number) : Array.isArray(answer) ? answer[0] : answer; };
  const byNumber = ([tag]: unknown[]) => {
    if (tag === "finalized") {
      if (finalized === "fails") throw new Error("unsupported block tag");
      return finalized && blockAt(finalized[0], finalized[1], first(finalized[0] - 1));
    }
    const number = Number(BigInt(tag as string));
    const answer = numberedHashes[number] ?? first(number);
    const hash = Array.isArray(answer) ? answer[Math.min((served[number] = (served[number] ?? -1) + 1), answer.length - 1)] : answer;
    return blockAt(number, hash, first(number - 1));
  };
  const byHash = ([hash]: unknown[]) => {
    const key = (hash as string).toLowerCase() as Hex;
    if (forks[key]) return blockAt(forks[key][0], key, forks[key][1]);
    for (let number = 0; number < 2_000; number++) if (first(number).toLowerCase() === key) return blockAt(number, first(number), first(number - 1));
    return null;
  };
  return Object.assign(byNumber, { byHash });
}

test("Polygon settles a receipt once its block is at or below the finalized block, and never without one", async () => {
  const [one, five, nine] = [hashOf("1"), hashOf("5"), hashOf("9")];
  const cases: [string, ReturnType<typeof view>, number, string][] = [
    ["finalized at the receipt's block", view([100, one], { 100: one }), 101, "confirmed"],
    ["finalized past it", view([105, five], { 100: one, 105: five }), 105, "confirmed"],
    ["finalized one block short", view([99, nine], { 99: nine, 100: one }), 400, "unknown"],
    ["no finalized block", view(null, { 100: one }), 400, "unknown"],
    ["finalized read fails", view("fails", { 100: one }), 400, "unknown"],
    ["finalized past the head", view([120, five], { 100: one, 120: five }), 110, "unknown"],
  ];
  for (const [label, blocks, head, kind] of cases) {
    const { adapter, requests } = granter(polygon({}, { eth_getTransactionReceipt: () => receipt("0x1", [transferLog(42n)]), eth_blockNumber: () => numberToHex(head), eth_getBlockByNumber: blocks }));
    assert.equal((await adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, kind, label);
    assert.ok(requests.some((request) => request.method === "eth_getBlockByNumber" && request.params?.[0] === "finalized"), label);
  }
});

// Review-A, 25 Nov (r7): the finalized checkpoint is itself checked against the node's numbered block at its height,
// and the receipt's block is read in that same view. A disagreement is unknown: no settle, and no revert to retry from.
test("a finalized checkpoint the node does not number at its height, or a view that moves, settles nothing", async () => {
  const [one, five, other] = [hashOf("1"), hashOf("5"), hashOf("7")];
  const cases: [string, ReturnType<typeof view>][] = [
    ["finalized names another block at its height", view([105, five], { 100: one, 105: other })],
    ["finalized at the receipt's height names another block", view([100, other], { 100: one })],
    ["the settled height is renumbered during the reads", view([105, five], { 100: one, 105: [five, other] })],
  ];
  for (const [answer, kind] of [[receipt("0x1", [transferLog(42n)]), "confirmed"], [receipt("0x0", []), "definitelyReverted"]] as const) {
    const consistent = granter(polygon({}, { eth_getTransactionReceipt: () => answer, eth_blockNumber: () => numberToHex(105), eth_getBlockByNumber: view([105, five], { 100: one, 105: five }) }));
    assert.equal((await consistent.adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, kind, "consistent view");
    for (const [label, blocks] of cases) {
      const { adapter } = granter(polygon({}, { eth_getTransactionReceipt: () => answer, eth_blockNumber: () => numberToHex(105), eth_getBlockByNumber: blocks }));
      assert.equal((await adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, "unknown", `${label} (${kind})`);
    }
  }
  const { adapter } = canceller(polygon({}, { eth_getTransactionReceipt: () => receipt("0x0", []), eth_blockNumber: () => numberToHex(105), eth_getBlockByNumber: cases[0][1] }));
  assert.equal((await adapter.reconcileCancel({ txHash: hashOf("c"), target, tokenID: "5" })).kind, "unknown", "cancel: no false revert");
});

// Review-A, 25 Nov (r7): isValidKey is false for a token not yet minted at a lagging checkpoint, so invalidity counts
// only when the token exists there and is this recipient's.
test("a key counts as already invalid only if, at the finalized block, it exists, is the recipient's, and is not valid", async () => {
  const final = view([100, hashOf("5")], { 100: hashOf("5") });
  const cases: [string, Hex | "reverts", Hex, boolean | null][] = [
    ["recipient's key, cancelled", address(recipient), bool(false), true],
    ["not minted yet at the checkpoint (zero owner)", address(zero), bool(false), null],
    ["not minted yet at the checkpoint (ownerOf reverts)", "reverts", bool(false), null],
    ["held by someone else", address(`0x${"d".repeat(40)}`), bool(false), null],
    ["still valid", address(recipient), bool(true), false],
  ];
  for (const [label, owner, valid, expected] of cases) {
    const reads: unknown[] = [];
    const { adapter } = granter(polygon({
      isValidKey: ([, at]) => { reads.push(at); return valid; },
      ownerOf: ([, at]) => { reads.push(at); if (owner === "reverts") throw new Error("execution reverted"); return owner; },
    }, { eth_blockNumber: () => numberToHex(101), eth_getBlockByNumber: final }));
    let result: boolean | null;
    try { result = await adapter.keyInvalidAtDepth({ target, tokenID: "5" }); } catch { result = null; }
    assert.equal(result, expected, label);
    assert.ok(reads.every((at) => JSON.stringify(at) === JSON.stringify({ blockHash: hashOf("5"), requireCanonical: true })), label);
  }
});

// Review-A, 25 Nov (r8): a receipt below the checkpoint must be on the checkpoint's own ancestry (parentHash links,
// at most ANCESTRY_CAP blocks), not merely match a numbered read a mixed-backend RPC could serve from a fork.
test("a receipt below the finalized block settles only on the finalized block's ancestry, within the cap", async () => {
  const [one, five, forked] = [hashOf("1"), hashOf("5"), hashOf("6")];
  const onFork = (answer: ReturnType<typeof receipt>) => ({ ...answer, blockHash: forked });
  // The checkpoint (105) is canonical and its ancestry runs through `one` at 100; the lower numbered read and the
  // receipt come from a fork whose block at 100 is `forked`.
  const mixed = () => view([105, five], { 100: forked, 105: five }, { [forked]: [100, hashOf("4")] }, { 100: one });
  const canonicalOnly = () => view([105, five], { 100: one, 105: five });
  for (const [answer, kind] of [[receipt("0x1", [transferLog(42n)]), "confirmed"], [receipt("0x0", []), "definitelyReverted"]] as const) {
    const honest = granter(polygon({}, { eth_getTransactionReceipt: () => answer, eth_blockNumber: () => numberToHex(105), eth_getBlockByNumber: canonicalOnly() }));
    assert.equal((await honest.adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, kind, "on the ancestry");
    assert.equal(honest.methods().filter((method) => method === "eth_getBlockByHash").length, 5, "one read per link, 105 down to 101");
    const fork = granter(polygon({}, { eth_getTransactionReceipt: () => onFork(answer), eth_blockNumber: () => numberToHex(105), eth_getBlockByNumber: mixed() }));
    assert.equal((await fork.adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, "unknown", `forked lower block (${kind})`);
    const cancel = canceller(polygon({}, { eth_getTransactionReceipt: () => onFork(answer), eth_blockNumber: () => numberToHex(105), eth_getBlockByNumber: mixed() }));
    assert.equal((await cancel.adapter.reconcileCancel({ txHash: hashOf("c"), target, tokenID: "5" })).kind, "unknown", `cancel: forked lower block (${kind})`);
  }
  // A broken link (a block that names another height) defers too.
  const broken = view([105, five], { 100: one, 105: five }, { [hashOf("f")]: [999, one] });
  const lying = Object.assign((params: unknown[]) => broken(params), { byHash: (params: unknown[]) => {
    const block = broken.byHash(params) as { number: string } | null;
    return block && block.number === numberToHex(103) ? { ...block, number: numberToHex(90) } : block;
  } });
  const link = granter(polygon({}, { eth_getTransactionReceipt: () => receipt("0x0", []), eth_blockNumber: () => numberToHex(105), eth_getBlockByNumber: lying }));
  assert.equal((await link.adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, "unknown", "broken link");
});

test("a receipt more than ANCESTRY_CAP blocks below the finalized block is deferred, with no walk", async () => {
  const cap = Number(ANCESTRY_CAP);
  const top = hashOf("5");
  const within = granter(polygon({}, { eth_getTransactionReceipt: () => receipt("0x1", [transferLog(42n)]), eth_blockNumber: () => numberToHex(100 + cap),
    eth_getBlockByNumber: view([100 + cap, top], { 100: hashOf("1"), [100 + cap]: top }) }));
  assert.equal((await within.adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, "confirmed", "exactly at the cap");
  const beyond = granter(polygon({}, { eth_getTransactionReceipt: () => receipt("0x0", []), eth_blockNumber: () => numberToHex(101 + cap),
    eth_getBlockByNumber: view([101 + cap, top], { 100: hashOf("1"), [101 + cap]: top }) }));
  assert.equal((await beyond.adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, "unknown", "one past the cap: no revert");
  assert.equal(beyond.methods().includes("eth_getBlockByHash"), false);
});

// Review-A, 25 Nov (r9): the tick keeps the 256-block cap and alerts; a person settles an over-cap grant with the
// one-shot, reconcile-only command (scripts/key-grant-reconcile-one.ts), which raises the walk for ONE recorded hash.
function recoveryAdapter(handlers: ReturnType<typeof healthyChain>, ancestryCap?: bigint) {
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(handlers);
  return { ...chain, adapter: createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, env: live, polygon: { lock: lockAddress, granter: account.address }, ancestryCap }) };
}
const inFlight = () => fakePayload([{ id: "i9", operationKey: "unlock-grant:v1:order-9:1", entitlement: "adm", state: "submitted", attempts: 1, attemptID: "a9", txHash: hashOf("c"), target }]);
const neverSent = (methods: string[]) => !methods.some((method) => ["eth_sendRawTransaction", "eth_estimateGas", "eth_getTransactionCount"].includes(method));
async function capturingErrors<T>(work: () => Promise<T>): Promise<{ result: T; lines: string[] }> {
  const lines: string[] = [];
  const original = console.error;
  console.error = (line: unknown) => { lines.push(String(line)); };
  try { return { result: await work(), lines }; } finally { console.error = original; }
}

test("a grant 300 blocks below the finalized block: the tick defers and alerts; the one-shot command settles it", async () => {
  const [one, top] = [hashOf("1"), hashOf("5")];
  const chain = () => polygon({}, { eth_getTransactionReceipt: () => receipt("0x1", [transferLog(42n)]), eth_blockNumber: () => numberToHex(400), eth_getBlockByNumber: view([400, top], { 100: one, 400: top }) });
  const { payload, rows } = inFlight();
  const tick = recoveryAdapter(chain());
  const { result, lines } = await capturingErrors(() => reconcileKeyGrants({ payload, adapter: tick.adapter }));
  assert.equal(result, 0);
  assert.deepEqual(lines.map((line) => JSON.parse(line)), [{ event: "key_grant_over_cap", intent: "i9" }]);
  assert.equal(rows["commerce-key-grant-intents"][0].state, "submitted");
  assert.equal(tick.methods().includes("eth_getBlockByHash"), false, "the tick never walks past its cap");
  const recovery = recoveryAdapter(chain(), 400n);
  assert.deepEqual(await reconcileOneKeyGrant({ payload, adapter: recovery.adapter, intentID: "i9", txHash: hashOf("c").toUpperCase().replace("0X", "0x") }), { outcome: "settled", state: "granted" });
  const row = rows["commerce-key-grant-intents"][0];
  assert.deepEqual([row.state, row.tokenID, row.settledTxHash], ["granted", "42", hashOf("c")]);
  assert.equal(recovery.methods().filter((method) => method === "eth_getBlockByHash").length, 300, "one read per link");
  assert.ok(neverSent(recovery.methods()), "reconcile only: nothing built, signed or sent");
});

test("the one-shot command cannot settle on forked or missing evidence, and refuses what is not one recorded in-flight hash", async () => {
  const [one, top, forked] = [hashOf("1"), hashOf("5"), hashOf("6")];
  for (const [label, answer] of [["success", receipt("0x1", [transferLog(42n)])], ["revert", receipt("0x0", [])]] as const) {
    const { payload, rows } = inFlight();
    const fork = recoveryAdapter(polygon({}, { eth_getTransactionReceipt: () => ({ ...answer, blockHash: forked }), eth_blockNumber: () => numberToHex(400),
      eth_getBlockByNumber: view([400, top], { 100: forked, 400: top }, { [forked]: [100, hashOf("4")] }, { 100: one }) }), 400n);
    assert.deepEqual(await reconcileOneKeyGrant({ payload, adapter: fork.adapter, intentID: "i9", txHash: hashOf("c") }), { outcome: "unknown" }, `forked ${label}`);
    assert.equal(rows["commerce-key-grant-intents"][0].state, "submitted", `forked ${label}`);
    const short = recoveryAdapter(polygon({}, { eth_getTransactionReceipt: () => answer, eth_blockNumber: () => numberToHex(400), eth_getBlockByNumber: view([400, top], { 100: one, 400: top }) }), 299n);
    assert.deepEqual(await reconcileOneKeyGrant({ payload, adapter: short.adapter, intentID: "i9", txHash: hashOf("c") }), { outcome: "unknown", code: "beyond_ancestry_cap" }, `walk too short ${label}`);
  }
  const { payload, rows } = inFlight();
  const missing = recoveryAdapter(polygon({}, { eth_getTransactionReceipt: () => null, eth_getTransactionByHash: () => null, eth_blockNumber: () => numberToHex(400), eth_getBlockByNumber: view([400, top], { 100: one, 400: top }) }), 400n);
  assert.deepEqual(await reconcileOneKeyGrant({ payload, adapter: missing.adapter, intentID: "i9", txHash: hashOf("c") }), { outcome: "unknown" }, "no receipt");
  assert.deepEqual(await reconcileOneKeyGrant({ payload, adapter: missing.adapter, intentID: "i9", txHash: hashOf("d") }), { outcome: "refused", reason: "hash_not_recorded" });
  assert.deepEqual(await reconcileOneKeyGrant({ payload, adapter: missing.adapter, intentID: "nope", txHash: hashOf("c") }), { outcome: "refused", reason: "not_found" });
  rows["commerce-key-grant-intents"][0].state = "granted";
  assert.deepEqual(await reconcileOneKeyGrant({ payload, adapter: missing.adapter, intentID: "i9", txHash: hashOf("c") }), { outcome: "refused", reason: "not_in_flight" });
  assert.ok(neverSent(missing.methods()));
  assert.throws(() => recoveryAdapter(healthyChain(), MAX_RECOVERY_WALK + 1n), /bounded/);
  assert.throws(() => recoveryAdapter(healthyChain(), 0n), /bounded/);
});

// Review-A, 25 Nov: one slow RPC cannot hold the tick. A routine walk past its time budget is unknown (deferred).
test("an ancestry walk past its time budget is unknown, never settled or reverted", async () => {
  const [one, top] = [hashOf("1"), hashOf("5")];
  const account = privateKeyToAccount(generatePrivateKey());
  for (const [label, answer] of [["success", receipt("0x1", [transferLog(42n)])], ["revert", receipt("0x0", [])]] as const) {
    const chain = mockChain(polygon({}, { eth_getTransactionReceipt: () => answer, eth_blockNumber: () => numberToHex(105), eth_getBlockByNumber: view([105, top], { 100: one, 105: top }) }));
    const adapter = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, env: live, polygon: { lock: lockAddress, granter: account.address }, walkBudgetMs: 0 });
    assert.equal((await adapter.reconcile({ intentID: "i", txHash: hashOf("c"), target })).kind, "unknown", label);
    assert.equal(chain.methods().includes("eth_getBlockByHash"), false, label);
  }
});
