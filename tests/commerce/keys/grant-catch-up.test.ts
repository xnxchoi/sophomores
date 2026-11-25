import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeAbiParameters, keccak256, numberToHex, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { runKeyGrantTick } from "@/lib/commerce/keys/grant-catch-up";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { fakePayload, type Row } from "./support/fake-payload";
import { healthyChain, lockAddress, lockCalls, mockChain, recipient, uint, uintArray } from "./support/mock-chain";

// The key-grant tick (owner, 24 Nov: "automatic catchup it is"; coordinator: wire the cancel runner, OFF until go-live).
// Fake Payload and the scripted mock chain only: no RPC, no real key, no broadcast.
const live = { KEY_GRANT_POLYGON_LIVE: "1", KEY_GRANT_POLYGON_MAX_COST_WEI: "1000000000000000000" } as const;
const target = { chainID: 137, lock: lockAddress, recipient };
const now = () => new Date("2026-11-24T12:00:00Z");
const owed = (id: string, unit: number, extra: Record<string, unknown> = {}): Row =>
  ({ id, operationKey: `unlock-grant:v1:order-${id}:${unit}`, entitlement: "adm", state: "pending", attempts: 0, target, ...extra });

const bool = (value: boolean): Hex => encodeAbiParameters([{ type: "bool" }], [value]);
// The mock's block is number 100; at this head it sits exactly at Polygon's 256-block depth.
const buriedHead = numberToHex(100 + 256 - 1);

function grantAdapter(keyValid?: boolean | (() => never)) {
  const raws: Hex[] = [];
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(healthyChain({
    eth_chainId: () => numberToHex(137),
    eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); },
    ...(keyValid === undefined ? {} : {
      eth_blockNumber: () => buriedHead,
      eth_call: lockCalls({
        totalKeys: () => uint(0n), expirationDuration: () => uint(30n * 86_400n), grantKeys: () => uintArray([1n]),
        isValidKey: () => typeof keyValid === "function" ? keyValid() : bool(keyValid),
      }),
    }),
  }));
  const adapter = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, now, env: live, polygon: { lock: lockAddress, granter: account.address } });
  return { adapter, raws, requests: chain.requests };
}

/** An in-process stand-in for the advisory lock: one holder at a time. */
function runLock() {
  let held = false;
  let taken = 0;
  return {
    acquire: async () => { if (held) return null; held = true; taken += 1; return async () => { held = false; }; },
    get taken() { return taken; },
    hold() { held = true; },
  };
}

test("switch off: the tick runs nothing, takes no lock and reads nothing", async () => {
  const { adapter, requests } = grantAdapter();
  const { payload, rows } = fakePayload([owed("a", 1)]);
  const lock = runLock();
  for (const env of [{}, { KEY_GRANT_POLYGON_LIVE: "0" }]) {
    assert.deepEqual(await runKeyGrantTick({ payload, grant: adapter, acquire: lock.acquire, env, now }), { outcome: "off" });
  }
  assert.equal(lock.taken, 0);
  assert.equal(requests.length, 0);
  assert.equal(rows["commerce-key-grant-intents"][0].state, "pending");
});

test("an owed key is granted once; the next tick does not send it again", async () => {
  const { adapter, raws } = grantAdapter();
  const { payload, rows } = fakePayload([owed("a", 1)]);
  const lock = runLock();
  const first = await runKeyGrantTick({ payload, grant: adapter, acquire: lock.acquire, env: live, now });
  assert.deepEqual(first, { outcome: "ran", reconciled: 0, replaced: 0, dispatched: 1, cancelled: 0, seatsReleased: 0 });
  const second = await runKeyGrantTick({ payload, grant: adapter, acquire: lock.acquire, env: live, now });
  assert.equal(second.outcome === "ran" && second.dispatched, 0);
  assert.equal(raws.length, 1, "one transaction for the order");
  assert.equal(rows["commerce-key-grant-intents"][0].state, "submitted");
});

test("an ambiguous grant is never dispatched again by the tick", async () => {
  const { adapter, raws } = grantAdapter();
  const { payload, rows } = fakePayload([owed("a", 1, { state: "ambiguous", attempts: 1, attemptID: "x", lastErrorCode: "broadcast_unknown" })]);
  const result = await runKeyGrantTick({ payload, grant: adapter, acquire: runLock().acquire, env: live, now });
  assert.equal(result.outcome === "ran" && result.dispatched, 0);
  assert.equal(raws.length, 0);
  assert.equal(rows["commerce-key-grant-intents"][0].state, "ambiguous");
});

test("a busy run lock means the tick does nothing", async () => {
  const { adapter, raws } = grantAdapter();
  const { payload } = fakePayload([owed("a", 1)]);
  const lock = runLock();
  lock.hold();
  assert.deepEqual(await runKeyGrantTick({ payload, grant: adapter, acquire: lock.acquire, env: live, now }), { outcome: "busy" });
  assert.equal(raws.length, 0);
});

const refunded = (signer: string): Row => ({
  id: "k", operationKey: "unlock-grant:v1:order-k:1", entitlement: "adm", state: "granted", attempts: 1, attemptID: "attempt-1", target,
  txHash: `0x${"d".repeat(64)}`, signer, nonce: 3, tokenID: "5", cancelRequested: true,
});

test("a refunded key the owner has cancelled from his wallet is marked cancelled once the chain shows it, and nothing is signed", async () => {
  const { adapter, raws } = grantAdapter(false);
  const { payload, rows } = fakePayload([refunded(adapter.signer)]);
  const result = await runKeyGrantTick({ payload, grant: adapter, acquire: runLock().acquire, env: live, now });
  assert.equal(result.outcome === "ran" && result.cancelled, 1);
  const [row] = rows["commerce-key-grant-intents"];
  assert.deepEqual([row.state, row.lastErrorCode, typeof row.cancelledAt], ["cancelled", "key_not_valid", "string"], "the existing evidence code");
  assert.equal(raws.length, 0, "no cancel is signed or sent from our host");
});

test("a refunded key still valid on chain, or one whose state cannot be read, stays granted with its request recorded", async () => {
  for (const keyValid of [true, () => { throw new Error("upstream unavailable"); }] as const) {
    const { adapter, raws } = grantAdapter(keyValid);
    const { payload, rows } = fakePayload([refunded(adapter.signer)]);
    const result = await runKeyGrantTick({ payload, grant: adapter, acquire: runLock().acquire, env: live, now });
    assert.equal(result.outcome === "ran" && result.cancelled, 0);
    const [row] = rows["commerce-key-grant-intents"];
    assert.equal(row.state === "granted" && row.cancelRequested === true, true);
    assert.equal(raws.length, 0);
  }
});

test("unresolved owner cancels rotate: a full first page of still-valid keys does not starve the row behind it", async () => {
  // isValidKey answers per token: tokens 1..25 still valid, token 26 cancelled by the owner.
  const raws: Hex[] = [];
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(healthyChain({
    eth_chainId: () => numberToHex(137),
    eth_blockNumber: () => buriedHead,
    eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); },
    eth_call: lockCalls({ isValidKey: (params) => {
      const data = (params[0] as { data: Hex }).data;
      return bool(BigInt(`0x${data.slice(-64)}`) !== 26n);
    } }),
  }));
  const adapter = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, now, env: live, polygon: { lock: lockAddress, granter: account.address } });
  const rows: Row[] = Array.from({ length: 26 }, (_, index) => ({ ...refunded(adapter.signer), id: `k${index + 1}`, operationKey: `unlock-grant:v1:order-k${index + 1}:1`, tokenID: String(index + 1) }));
  const { payload, rows: stored } = fakePayload(rows);
  const result = await runKeyGrantTick({ payload, grant: adapter, acquire: runLock().acquire, env: live, now, limit: 30 });
  assert.equal(result.outcome === "ran" && result.cancelled, 1, "row 26 is reached in the same pass");
  const intents = stored["commerce-key-grant-intents"];
  assert.equal(intents.find((row) => row.id === "k26")?.state, "cancelled");
  assert.equal(intents.filter((row) => row.state === "granted" && typeof row.nextAttemptAt === "string").length, 25, "the still-valid ones are rechecked later");
  assert.equal(raws.length, 0);
});
