import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { decodeFunctionData, keccak256, numberToHex, parseTransaction, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { createUnlockKeyCancelAdapter } from "@/lib/commerce/keys/unlock/cancel";
import {
  loadPolygonKeyGranterAccount, POLYGON_KEY_GRANTER, POLYGON_SIGNET_LOCK, polygonKeyGrantsLive,
} from "@/lib/commerce/keys/unlock/polygon";
import { chainEnabled, confirmationDepth, maxFeeCeiling } from "@/lib/commerce/keys/unlock/transactions";
import { dispatchKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload } from "./support/fake-payload";
import { healthyChain, lockAbi, lockAddress, mockChain, receipt, recipient, transferLog } from "./support/mock-chain";

// Polygon (137) key grants for paid orders (owner, 24 Nov): the pinned Signet lock, the pinned grant signer, and a
// go-live switch that stays off until the owner flips it. Everything here runs against the scripted mock chain:
// no RPC, no signing with a real key, no broadcast.
const live = { KEY_GRANT_POLYGON_LIVE: "1" } as const;
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
