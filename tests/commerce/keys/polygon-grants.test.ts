import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { decodeFunctionData, encodeFunctionData, keccak256, numberToHex, parseTransaction, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { createUnlockKeyCancelAdapter } from "@/lib/commerce/keys/unlock/cancel";
import {
  loadPolygonKeyGranterAccount, POLYGON_KEY_GRANTER, POLYGON_SIGNET_LOCK, polygonEventLocks, polygonKeyGrantsLive,
} from "@/lib/commerce/keys/unlock/polygon";
import { chainEnabled, confirmationDepth, maxCostWei, maxFeeCeiling } from "@/lib/commerce/keys/unlock/transactions";
import { dispatchKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload } from "./support/fake-payload";
import { healthyChain, lockAbi, lockAddress, mockChain, receipt, recipient, transferLog } from "./support/mock-chain";

// Polygon (137) key grants for paid orders (owner, 24 Nov): the pinned Signet lock, the pinned grant signer, and a
// go-live switch that stays off until the owner flips it. Everything here runs against the scripted mock chain:
// no RPC, no signing with a real key, no broadcast.
// 1 POL: the approved budget a go-live would set from a quote (deployment/KEY-GRANTS.md).
const live = { KEY_GRANT_POLYGON_LIVE: "1", KEY_GRANT_POLYGON_MAX_COST_WEI: "1000000000000000000" } as const;
const off = {} as const;
const now = () => new Date("2026-11-24T00:00:00Z");
const polygonChain = (overrides: Parameters<typeof healthyChain>[0] = {}) => healthyChain({ eth_chainId: () => numberToHex(137), ...overrides });
const polygonTarget = { chainID: 137, lock: lockAddress, recipient };
// Each test gets its own throwaway signer, pinned as "the" granter, so nonce lanes never leak between tests.
function pinnedAdapter(handlers: Record<string, (params: unknown[]) => unknown>, env: Record<string, string> = live) {
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(handlers);
  const adapter = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, now, env, polygon: { lock: lockAddress, granter: account.address } });
  return { ...chain, adapter, account };
}

test("the pins are the owner's Signet lock and grant signer, and the switch is on only for the exact value 1", () => {
  assert.equal(POLYGON_SIGNET_LOCK.toLowerCase(), "0xcc95180d590365d88f8aad870c264d127b221506");
  assert.equal(POLYGON_KEY_GRANTER.toLowerCase(), "0x2cdb060e373f0efe93beffd1478cde739cbc5336");
  assert.equal(polygonKeyGrantsLive(live), true);
  for (const value of [undefined, "", "0", "true", "yes", "1 ", "on"]) {
    assert.equal(polygonKeyGrantsLive({ KEY_GRANT_POLYGON_LIVE: value }), false, String(value));
  }
  assert.equal(chainEnabled(137, off), false);
  assert.equal(chainEnabled(137, live), true);
  assert.equal(chainEnabled(84532, off), true, "Base Sepolia is unchanged");
  for (const chainID of [1, 8453, 11155111]) assert.equal(chainEnabled(chainID, live), false, `${chainID} stays refused`);
});

test("switch off: Polygon grant and cancel adapters are refused when built, before any request", () => {
  const account = privateKeyToAccount(generatePrivateKey());
  for (const env of [off, { KEY_GRANT_POLYGON_LIVE: "true" }]) {
    const { transport, requests } = mockChain(polygonChain());
    assert.throws(() => createUnlockKeyGrantAdapter({ chainID: 137, account, transport, env, polygon: { lock: lockAddress, granter: account.address } }), /137/);
    assert.throws(() => createUnlockKeyCancelAdapter({ chainID: 137, account, transport, env, polygonLock: lockAddress }), /137/);
    assert.equal(requests.length, 0);
  }
});

test("switch on: a signer other than the pinned granter is refused when the grant adapter is built", () => {
  const { transport, requests } = mockChain(polygonChain());
  assert.throws(() => createUnlockKeyGrantAdapter({ chainID: 137, account: privateKeyToAccount(generatePrivateKey()), transport, env: live }),
    /not the pinned key granter/);
  assert.equal(requests.length, 0);
});

test("switch on: a grant on any lock but the pinned one is not sent, and nothing reaches the chain", async () => {
  const { adapter, requests } = pinnedAdapter(polygonChain());
  const elsewhere = { ...polygonTarget, lock: `0x${"c".repeat(40)}` };
  assert.deepEqual(await adapter.prepare({ intentID: "i", attemptID: "a", target: elsewhere, nonceFloor: 0 }), { kind: "definitelyNotSent", code: "lock_not_enabled" });
  assert.deepEqual(await adapter.prepareReplacement({ intentID: "i", target: elsewhere, nonce: 0, previous: { maxFeePerGas: "1", maxPriorityFeePerGas: "1" } }),
    { kind: "definitelyNotSent", code: "lock_not_enabled" });
  assert.deepEqual(await adapter.reconcile({ intentID: "i", txHash: `0x${"d".repeat(64)}`, target: elsewhere }), { kind: "unknown" });
  assert.equal(requests.length, 0);
});

test("switch on: the pinned signer grants one key on the pinned lock, signed for chain 137", async () => {
  let raw: Hex | undefined;
  const { adapter } = pinnedAdapter(polygonChain({ eth_sendRawTransaction: (params) => { raw = params[0] as Hex; return keccak256(raw); } }));
  const prepared = await adapter.prepare({ intentID: "i", attemptID: "a", target: polygonTarget, nonceFloor: 0 });
  assert.equal(prepared.kind, "prepared");
  const { txHash } = prepared as Extract<typeof prepared, { kind: "prepared" }>;
  assert.deepEqual(await adapter.broadcast({ intentID: "i", txHash }), { kind: "submitted" });
  const sent = parseTransaction(raw!);
  assert.equal(sent.chainId, 137);
  assert.equal(sent.to?.toLowerCase(), lockAddress);
  const call = decodeFunctionData({ abi: lockAbi, data: sent.data! });
  assert.equal(call.functionName, "grantKeys");
  assert.deepEqual((call.args?.[0] as Hex[]).map((address) => address.toLowerCase()), [recipient]);
});

test("switch on: a grant is confirmed only at Polygon's 256-block depth", async () => {
  const minted = receipt("0x1", [transferLog(7n)]);
  let head = 100 + confirmationDepth[137] - 2;
  const { adapter } = pinnedAdapter(polygonChain({ eth_getTransactionReceipt: () => minted, eth_blockNumber: () => numberToHex(head) }));
  const txHash = `0x${"e".repeat(64)}`;
  assert.deepEqual(await adapter.reconcile({ intentID: "i", txHash, target: polygonTarget }), { kind: "unknown" }, "one block short");
  head += 1;
  assert.deepEqual(await adapter.reconcile({ intentID: "i", txHash, target: polygonTarget }), { kind: "confirmed", tokenID: "7" });
});

test("switch on: a fee above the Polygon ceiling is refused unsent", async () => {
  assert.equal(maxFeeCeiling[137], 3_000_000_000_000n, "3,000 gwei: a 169k-gas grant stays near USD 0.04 at POL USD 0.076");
  const { adapter, methods } = pinnedAdapter(polygonChain({
    eth_getBlockByNumber: () => ({ ...(healthyChain().eth_getBlockByNumber([]) as object), baseFeePerGas: numberToHex(maxFeeCeiling[137]) }),
  }));
  assert.deepEqual(await adapter.prepare({ intentID: "i", attemptID: "a", target: polygonTarget, nonceFloor: 0 }), { kind: "definitelyNotSent", code: "fee_above_ceiling" });
  assert.equal(methods().includes("eth_sendRawTransaction"), false);
});

test("switch on: an order's key is granted once, however often the dispatch pass runs", async () => {
  const raws: Hex[] = [];
  const { adapter } = pinnedAdapter(polygonChain({ eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); } }));
  const { payload, rows } = fakePayload([{ id: "i1", operationKey: "unlock-grant:v1:order-1:1", entitlement: "adm", state: "pending", attempts: 0, target: polygonTarget }]);
  assert.equal(await dispatchKeyGrants({ payload, adapter }), 1);
  assert.equal(await dispatchKeyGrants({ payload, adapter }), 0, "a submitted grant is never dispatched again");
  assert.equal(raws.length, 1);
  assert.deepEqual(rows["commerce-key-grant-intents"].map((row) => [row.state, row.txHash]), [["submitted", keccak256(raws[0])]]);
});

test("switch on: the cancel adapter refuses any lock but the pinned one", async () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const { transport, requests } = mockChain(polygonChain());
  const adapter = createUnlockKeyCancelAdapter({ chainID: 137, account, transport, env: live, polygonLock: lockAddress });
  const elsewhere = { ...polygonTarget, lock: `0x${"c".repeat(40)}` };
  assert.deepEqual(await adapter.prepareCancel({ intentID: "i", target: elsewhere, tokenID: "1", nonceFloor: 0 }), { kind: "definitelyNotSent", code: "lock_not_enabled" });
  assert.equal(requests.length, 0);
});

test("the pinned signer file refuses a key that derives any other address, without printing it", async () => {
  const directory = await mkdtemp(join(tmpdir(), "polygon-signer-"));
  try {
    const key = generatePrivateKey();
    const file = join(directory, "polygon-key-granter.env");
    await writeFile(file, `UNLOCK_LIVE_GRANTER_PRIVATE_KEY=${key}\nUNLOCK_LIVE_GRANTER_ADDRESS=${privateKeyToAccount(key).address}\n`);
    await chmod(file, 0o600);
    await assert.rejects(loadPolygonKeyGranterAccount(file), (error: Error) => {
      assert.match(error.message, /not the pinned Polygon key granter/);
      assert.equal(error.message.includes(key.slice(2)), false);
      return true;
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});


test("ADR-0026: the Polygon fee budget is required, bounded, and enforced on gas limit times max fee before signing", async () => {
  const account = privateKeyToAccount(generatePrivateKey());
  const build = (budget?: string) => createUnlockKeyGrantAdapter({ chainID: 137, account, transport: mockChain(polygonChain()).transport, now,
    env: { KEY_GRANT_POLYGON_LIVE: "1", ...(budget === undefined ? {} : { KEY_GRANT_POLYGON_MAX_COST_WEI: budget }) }, polygon: { lock: lockAddress, granter: account.address } });
  for (const budget of [undefined, "", "0", "-1", "1.5", "0x10", "5000000000000000001"]) {
    assert.throws(() => build(budget), /approved fee budget/, String(budget));
  }
  assert.equal(maxCostWei(137, { KEY_GRANT_POLYGON_MAX_COST_WEI: "5000000000000000000" }), 5n * 10n ** 18n, "5 POL is the most a go-live may approve");
  // The mock prepares 200,000 gas: a budget one wei under its worst case refuses the grant unsent.
  const raws: Hex[] = [];
  const handlers = polygonChain({ eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); } });
  const pinned = pinnedAdapter(handlers, { KEY_GRANT_POLYGON_LIVE: "1", KEY_GRANT_POLYGON_MAX_COST_WEI: "1" });
  assert.deepEqual(await pinned.adapter.prepare({ intentID: "i", attemptID: "a", target: polygonTarget, nonceFloor: 0 }), { kind: "definitelyNotSent", code: "fee_above_ceiling" });
  assert.deepEqual(await pinned.adapter.prepareReplacement({ intentID: "i", target: polygonTarget, nonce: 0, previous: { maxFeePerGas: "1", maxPriorityFeePerGas: "1" } }),
    { kind: "definitelyNotSent", code: "fee_ceiling_reached" }, "a replacement meets the same budget");
  assert.equal(raws.length, 0);
});

test("recorded bytes are re-sent only for our signer, on 137, to the pinned lock, as grantKeys, within budget; anything else is refused before RPC", async () => {
  const { adapter, account, requests } = pinnedAdapter(polygonChain({ eth_sendRawTransaction: (params) => keccak256(params[0] as Hex) }));
  const grantData = encodeFunctionData({ abi: lockAbi, functionName: "grantKeys", args: [[recipient], [1n], ["0x0000000000000000000000000000000000000000"]] });
  const sign = (signer: typeof account, overrides: Record<string, unknown> = {}) => signer.signTransaction({
    type: "eip1559", chainId: 137, to: lockAddress, data: grantData, nonce: 0, gas: 200_000n, maxFeePerGas: 100_000_000_000n, maxPriorityFeePerGas: 30_000_000_000n, ...overrides,
  } as never);
  const cases: [string, Hex, string][] = [
    ["another chain", await sign(account, { chainId: 84532 }), "rebroadcast_mismatch"],
    ["another sender", await sign(privateKeyToAccount(generatePrivateKey())), "rebroadcast_mismatch"],
    ["another lock", await sign(account, { to: `0x${"c".repeat(40)}` }), "rebroadcast_mismatch"],
    ["another operation", await sign(account, { data: encodeFunctionData({ abi: lockAbi, functionName: "setOwner", args: [recipient] }) }), "rebroadcast_mismatch"],
    ["a value transfer", await sign(account, { value: 1n }), "rebroadcast_mismatch"],
    ["over budget", await sign(account, { gas: 2_000_000n, maxFeePerGas: 2_000_000_000_000n }), "fee_above_cap"],
    ["unreadable", "0x02deadbeef" as Hex, "rebroadcast_unreadable"],
  ];
  // Each case is re-sent as its own record (its own hash and nonce), so only the content check can refuse it.
  const record = (raw: Hex) => ({ raw, txHash: keccak256(raw), nonce: 0, target: polygonTarget });
  for (const [label, raw, code] of cases) assert.deepEqual(await adapter.rebroadcast(record(raw)), { kind: "refused", code }, label);
  // Bound to the dispatch record (Review-A r2 HIGH 1): a different valid signed grant never counts as this intent's re-send.
  const own = await sign(account);
  const otherRecipient = await sign(account, { data: encodeFunctionData({ abi: lockAbi, functionName: "grantKeys", args: [[`0x${"e".repeat(40)}`], [1n], ["0x0000000000000000000000000000000000000000"]] }) });
  const otherNonce = await sign(account, { nonce: 1 });
  assert.deepEqual(await adapter.rebroadcast({ ...record(own), txHash: keccak256(otherNonce) }), { kind: "refused", code: "rebroadcast_mismatch" }, "bytes that do not hash to the recorded transaction");
  assert.deepEqual(await adapter.rebroadcast({ ...record(otherNonce) }), { kind: "refused", code: "rebroadcast_mismatch" }, "the record's nonce, not the bytes'");
  assert.deepEqual(await adapter.rebroadcast(record(otherRecipient)), { kind: "refused", code: "rebroadcast_mismatch" }, "a grant to another recipient");
  assert.deepEqual(await adapter.rebroadcast({ ...record(own), target: { ...polygonTarget, lock: `0x${"c".repeat(40)}` } }), { kind: "refused", code: "rebroadcast_mismatch" }, "a record on an unpinned lock");
  assert.equal(requests.length, 0, "nothing refused reached the chain");
  assert.deepEqual(await adapter.rebroadcast(record(own)), { kind: "accepted" }, "our own recorded grant is re-sent");
});

test("event locks are pinned by config only: a listed lock is granted, an unlisted one parks, a bad list refuses the build", async () => {
  const eventLock = `0x${"f".repeat(40)}`;
  const account = privateKeyToAccount(generatePrivateKey());
  const raws: Hex[] = [];
  const chain = mockChain(polygonChain({ eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); } }));
  const env = { ...live, KEY_GRANT_POLYGON_EVENT_LOCKS: ` ${eventLock} ,` };
  const adapter = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, now, env, polygon: { lock: lockAddress, granter: account.address } });
  const prepared = await adapter.prepare({ intentID: "i", attemptID: "a", target: { ...polygonTarget, lock: eventLock }, nonceFloor: 0 });
  assert.equal(prepared.kind, "prepared", "the configured event lock");
  adapter.release({ txHash: (prepared as { txHash: string }).txHash });
  assert.deepEqual(await adapter.prepare({ intentID: "i", attemptID: "a", target: { ...polygonTarget, lock: `0x${"c".repeat(40)}` }, nonceFloor: 0 }),
    { kind: "definitelyNotSent", code: "lock_not_enabled" }, "a lock only a CMS record names");
  assert.deepEqual(polygonEventLocks({}), []);
  assert.deepEqual(polygonEventLocks({ KEY_GRANT_POLYGON_EVENT_LOCKS: "0xef6414927acb08f4d5a35cc9e5de07b9f3255060" }).map((lock) => lock.toLowerCase()), ["0xef6414927acb08f4d5a35cc9e5de07b9f3255060"]);
  for (const bad of ["not-a-lock", "0x1234", `${eventLock},0x${"0".repeat(40)}`]) {
    assert.throws(() => createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, now, env: { ...live, KEY_GRANT_POLYGON_EVENT_LOCKS: bad }, polygon: { lock: lockAddress, granter: account.address } }),
      /KEY_GRANT_POLYGON_EVENT_LOCKS/, bad);
  }
});

test("a grant parked for a person is never silent: one fixed-format line with the intent and code only", async () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (line: unknown) => { lines.push(String(line)); };
  try {
    const { adapter } = pinnedAdapter(polygonChain());
    const { payload, rows } = fakePayload([{ id: "i9", operationKey: "unlock-grant:v1:order-9:1", entitlement: "adm", state: "pending", attempts: 0,
      target: { ...polygonTarget, lock: `0x${"c".repeat(40)}` } }]);
    await dispatchKeyGrants({ payload, adapter });
    assert.deepEqual([rows["commerce-key-grant-intents"][0].state, rows["commerce-key-grant-intents"][0].lastErrorCode, rows["commerce-key-grant-intents"][0].nextAttemptAt], ["failed_retryable", "lock_not_enabled", null]);
  } finally {
    console.error = original;
  }
  assert.deepEqual(lines.map((line) => JSON.parse(line)), [{ event: "key_grant_parked", intent: "i9", code: "lock_not_enabled" }]);
});
