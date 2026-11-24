import assert from "node:assert/strict";
import { test } from "node:test";
import { keccak256, numberToHex, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { CancelPrepareOutcome, KeyCancelAdapter } from "@/lib/commerce/keys/contracts";
import { runKeyGrantTick } from "@/lib/commerce/keys/grant-catch-up";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { fakePayload, type Row } from "./support/fake-payload";
import { healthyChain, lockAddress, mockChain, recipient } from "./support/mock-chain";

// The key-grant tick (owner, 24 Nov: "automatic catchup it is"; coordinator: wire the cancel runner, OFF until go-live).
// Fake Payload and the scripted mock chain only: no RPC, no real key, no broadcast.
const live = { KEY_GRANT_POLYGON_LIVE: "1" } as const;
const target = { chainID: 137, lock: lockAddress, recipient };
const now = () => new Date("2026-11-24T12:00:00Z");
const owed = (id: string, unit: number, extra: Record<string, unknown> = {}): Row =>
  ({ id, operationKey: `unlock-grant:v1:order-${id}:${unit}`, entitlement: "adm", state: "pending", attempts: 0, target, ...extra });

function grantAdapter() {
  const raws: Hex[] = [];
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(healthyChain({
    eth_chainId: () => numberToHex(137),
    eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); },
  }));
  const adapter = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, now, env: live, polygon: { lock: lockAddress, granter: account.address } });
  return { adapter, raws, requests: chain.requests };
}

/** A lock-manager adapter that records what the cancel pass asks of it. */
function canceller() {
  const prepared: string[] = [];
  const broadcasts: string[] = [];
  const adapter: KeyCancelAdapter = {
    signer: `eip155:137:0x${"2".repeat(40)}`,
    async prepareCancel({ tokenID, nonceFloor }): Promise<CancelPrepareOutcome> {
      prepared.push(tokenID);
      return { kind: "prepared", txHash: `0x${"c".repeat(64)}`, raw: `0x02${"c".repeat(8)}`, nonce: nonceFloor, fee: { maxFeePerGas: "100", maxPriorityFeePerGas: "10" } };
    },
    async prepareCancelReplacement() { return { kind: "definitelyNotSent", code: "unused" }; },
    async rebroadcast() { return { kind: "accepted" }; },
    async broadcast({ txHash }) { broadcasts.push(txHash); return { kind: "submitted" }; },
    release() {},
    async reconcileCancel() { return { kind: "unknown" }; },
  };
  return { adapter, prepared, broadcasts };
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
  const cancel = canceller();
  for (const env of [{}, { KEY_GRANT_POLYGON_LIVE: "0" }]) {
    assert.deepEqual(await runKeyGrantTick({ payload, grant: adapter, cancel: cancel.adapter, acquire: lock.acquire, env, now }), { outcome: "off" });
  }
  assert.equal(lock.taken, 0);
  assert.equal(requests.length, 0);
  assert.equal(rows["commerce-key-grant-intents"][0].state, "pending");
});

test("an owed key is granted once; the next tick does not send it again", async () => {
  const { adapter, raws } = grantAdapter();
  const { payload, rows } = fakePayload([owed("a", 1)]);
  const lock = runLock();
  const first = await runKeyGrantTick({ payload, grant: adapter, cancel: null, acquire: lock.acquire, env: live, now });
  assert.deepEqual(first, { outcome: "ran", reconciled: 0, replaced: 0, dispatched: 1, cancels: "unconfigured" });
  const second = await runKeyGrantTick({ payload, grant: adapter, cancel: null, acquire: lock.acquire, env: live, now });
  assert.equal(second.outcome === "ran" && second.dispatched, 0);
  assert.equal(raws.length, 1, "one transaction for the order");
  assert.equal(rows["commerce-key-grant-intents"][0].state, "submitted");
});

test("an ambiguous grant is never dispatched again by the tick", async () => {
  const { adapter, raws } = grantAdapter();
  const { payload, rows } = fakePayload([owed("a", 1, { state: "ambiguous", attempts: 1, attemptID: "x", lastErrorCode: "broadcast_unknown" })]);
  const result = await runKeyGrantTick({ payload, grant: adapter, cancel: null, acquire: runLock().acquire, env: live, now });
  assert.equal(result.outcome === "ran" && result.dispatched, 0);
  assert.equal(raws.length, 0);
  assert.equal(rows["commerce-key-grant-intents"][0].state, "ambiguous");
});

test("a busy run lock means the tick does nothing", async () => {
  const { adapter, raws } = grantAdapter();
  const { payload } = fakePayload([owed("a", 1)]);
  const lock = runLock();
  lock.hold();
  assert.deepEqual(await runKeyGrantTick({ payload, grant: adapter, cancel: null, acquire: lock.acquire, env: live, now }), { outcome: "busy" });
  assert.equal(raws.length, 0);
});

test("a refund-marked granted key has its cancel executed once by the lock manager, not the granter", async () => {
  const { adapter } = grantAdapter();
  const granted: Row = {
    id: "k", operationKey: "unlock-grant:v1:order-k:1", entitlement: "adm", state: "granted", attempts: 1, attemptID: "attempt-1", target,
    txHash: `0x${"d".repeat(64)}`, signer: adapter.signer, nonce: 3, tokenID: "5", cancelRequested: true,
  };
  const { payload, rows } = fakePayload([granted]);
  const cancel = canceller();
  const lock = runLock();
  const first = await runKeyGrantTick({ payload, grant: adapter, cancel: cancel.adapter, acquire: lock.acquire, env: live, now });
  assert.equal(first.outcome === "ran" && first.cancels, 1);
  await runKeyGrantTick({ payload, grant: adapter, cancel: cancel.adapter, acquire: lock.acquire, env: live, now });
  assert.deepEqual(cancel.prepared, ["5"], "prepared once");
  assert.deepEqual(cancel.broadcasts, [`0x${"c".repeat(64)}`], "sent once");
  assert.equal(rows["commerce-key-grant-intents"][0].cancelTxHash, `0x${"c".repeat(64)}`, "written ahead on the intent");
});

test("without a lock-manager signer the cancel request stays recorded and unexecuted", async () => {
  const { adapter } = grantAdapter();
  const { payload, rows } = fakePayload([{
    id: "k", operationKey: "unlock-grant:v1:order-k:1", entitlement: "adm", state: "granted", attempts: 1, attemptID: "attempt-1", target,
    txHash: `0x${"d".repeat(64)}`, signer: adapter.signer, nonce: 3, tokenID: "5", cancelRequested: true,
  }]);
  const result = await runKeyGrantTick({ payload, grant: adapter, cancel: null, acquire: runLock().acquire, env: live, now });
  assert.equal(result.outcome === "ran" && result.cancels, "unconfigured");
  const [row] = rows["commerce-key-grant-intents"];
  assert.equal(row.state === "granted" && row.cancelRequested === true && row.cancelTxHash === undefined, true);
});
