import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { encodeAbiParameters, keccak256, numberToHex, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { runKeyGrantTick } from "@/lib/commerce/keys/grant-catch-up";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { fakePayload, type Row } from "./support/fake-payload";
import { overCapTick } from "./support/over-cap-tick";
import { address, healthyChain, lockAddress, lockCalls, mockChain, receipt, recipient, transferLog, uint, uintArray } from "./support/mock-chain";

// The key-grant tick (owner, 24 Nov: "automatic catchup it is"; coordinator: wire the cancel runner, OFF until go-live).
// Fake Payload and the scripted mock chain only: no RPC, no real key, no broadcast.
const live = { KEY_GRANT_POLYGON_LIVE: "1", KEY_GRANT_POLYGON_MAX_COST_WEI: "1000000000000000000" } as const;
const target = { chainID: 137, lock: lockAddress, recipient };
const now = () => new Date("2026-11-24T12:00:00Z");
const owed = (id: string, unit: number, extra: Record<string, unknown> = {}): Row =>
  ({ id, operationKey: `unlock-grant:v1:order-${id}:${unit}`, entitlement: "adm", state: "pending", attempts: 0, target, ...extra });

const bool = (value: boolean): Hex => encodeAbiParameters([{ type: "bool" }], [value]);
// The mock's block is number 100, and the mock names it finalized (Polygon settles at the finalized block).
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
        ownerOf: () => address(recipient), // the key exists at the checkpoint and is the recipient's (Review-A r7)
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
  assert.deepEqual(first, { outcome: "ran", reconciled: 0, replaced: 0, dispatched: 1, cancelled: 0, seatsReleased: 0, seatSweepFailures: 0, overCap: [] });
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
    }, ownerOf: () => address(recipient) }),
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

test("a failed seat sweep does not fail the tick: it is counted, written as one fixed line, and the next tick retries", async () => {
  const { adapter } = grantAdapter();
  const { payload, rows } = fakePayload([]);
  const lines: string[] = [];
  const ledger = rows["commerce-reconciliations"];
  delete rows["commerce-reconciliations"]; // the sweep's ledger read now throws
  const failed = await runKeyGrantTick({ payload, grant: adapter, acquire: runLock().acquire, env: live, now, log: (line) => lines.push(line) });
  assert.deepEqual(failed, { outcome: "ran", reconciled: 0, replaced: 0, dispatched: 0, cancelled: 0, seatsReleased: 0, seatSweepFailures: 1, overCap: [] });
  assert.deepEqual(lines, ['{"event":"seat_sweep_failed","count":1}'], "no message, id or customer data");
  rows["commerce-reconciliations"] = ledger;
  const retried = await runKeyGrantTick({ payload, grant: adapter, acquire: runLock().acquire, env: live, now, log: (line) => lines.push(line) });
  assert.equal(retried.outcome === "ran" && retried.seatSweepFailures, 0);
  assert.equal(lines.length, 1);
  assert.equal(rows["commerce-reconciliations"].length, 1, "the retry saved its cursor");
});

// Review-A, 25 Nov (r10): the over-cap alert must survive the tick's exit. Its intent IDs ride in the result line, and
// both lines are written synchronously before an immediate exit.
test("an over-cap grant is reported in the tick's result line and as one alert line, and stays submitted", async () => {
  const { run, rows, methods } = overCapTick();
  const lines: string[] = [];
  const result = await run((line) => lines.push(line));
  assert.deepEqual(result, { outcome: "ran", reconciled: 0, replaced: 0, dispatched: 0, cancelled: 0, seatsReleased: 0, seatSweepFailures: 0, overCap: ["00000000-0000-4000-8000-0000000000a1"] });
  assert.deepEqual(lines, ['{"event":"key_grant_over_cap","intent":"00000000-0000-4000-8000-0000000000a1"}']);
  assert.equal(rows["commerce-key-grant-intents"][0].state, "submitted");
  assert.equal(methods().includes("eth_getBlockByHash"), false);
});

test("under a cron-style redirect and under pipes, both over-cap lines reach the log before the process exits", () => {
  const fixture = join("tests", "commerce", "keys", "support", "over-cap-tick-exit.ts");
  const folder = mkdtempSync(join(tmpdir(), "over-cap-"));
  try {
    // The runbook's cron line: `... >> <log> 2>&1`.
    const log = join(folder, "tick.log");
    const cron = spawnSync("sh", ["-c", `node --import tsx "${fixture}" >> "${log}" 2>&1`], { encoding: "utf8", timeout: 60_000 });
    assert.equal(cron.status, 0);
    const logged = readFileSync(log, "utf8").trim().split("\n");
    assert.ok(logged.includes('{"event":"key_grant_over_cap","intent":"00000000-0000-4000-8000-0000000000a1"}'), "stderr alert line in the log");
    assert.ok(logged.some((line) => line.startsWith("{\"outcome\":\"ran\"") && JSON.parse(line).overCap[0] === "00000000-0000-4000-8000-0000000000a1"), "result line with overCap");
    // Pipes, as a systemd service's stdout and stderr (not proven on systemd itself here: macOS).
    const piped = spawnSync("node", ["--import", "tsx", fixture], { encoding: "utf8", timeout: 60_000 });
    assert.equal(piped.status, 0);
    assert.deepEqual(JSON.parse(piped.stdout.trim()).overCap, ["00000000-0000-4000-8000-0000000000a1"]);
    assert.ok(piped.stderr.includes('{"event":"key_grant_over_cap","intent":"00000000-0000-4000-8000-0000000000a1"}'));
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test("with KEY_GRANT_ALERT_SPOOL set, the exit edge also leaves the over-cap alert in the durable spool", () => {
  const fixture = join("tests", "commerce", "keys", "support", "over-cap-tick-exit.ts");
  const folder = mkdtempSync(join(tmpdir(), "over-cap-spool-"));
  try {
    const run = spawnSync("node", ["--import", "tsx", fixture], { encoding: "utf8", timeout: 60_000, env: { ...process.env, KEY_GRANT_ALERT_SPOOL: folder } });
    assert.equal(run.status, 0);
    const files = readdirSync(folder).filter((name) => name.endsWith(".alert.json"));
    assert.equal(files.length, 1);
    assert.deepEqual(JSON.parse(readFileSync(join(folder, files[0]), "utf8")), { kind: "over_cap", intent: "00000000-0000-4000-8000-0000000000a1" });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

// Review-A, 25 Nov: a tick must end inside its unit timeout. Reconcile starts no row after its deadline; rows not
// reached keep their due time and settle on the next tick.
test("past the reconcile deadline no row is started, and the next tick settles it", async () => {
  const { grant, payload, rows } = settlingTick();
  const stopped = await runKeyGrantTick({ payload, grant, acquire: runLock().acquire, env: live, now, budgetMs: -1 });
  assert.equal(stopped.outcome === "ran" && stopped.reconciled, 0);
  assert.equal(rows["commerce-key-grant-intents"][0].state, "submitted");
  assert.equal(rows["commerce-key-grant-intents"][0].nextAttemptAt, undefined, "not deferred: first in line next tick");
  const next = await runKeyGrantTick({ payload, grant, acquire: runLock().acquire, env: live, now });
  assert.equal(next.outcome === "ran" && next.reconciled, 1);
  assert.equal(rows["commerce-key-grant-intents"][0].state, "granted");
});

function settlingTick() {
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(healthyChain({
    eth_chainId: () => numberToHex(137),
    eth_getTransactionReceipt: () => receipt("0x1", [transferLog(42n)]),
    eth_blockNumber: () => numberToHex(101),
  }));
  const grant = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, now, env: live, polygon: { lock: lockAddress, granter: account.address } });
  const { payload, rows } = fakePayload([{ id: "00000000-0000-4000-8000-0000000000a1", operationKey: "unlock-grant:v1:order-d:1", entitlement: "adm", state: "submitted", attempts: 1, attemptID: "a1", txHash: `0x${"c".repeat(64)}`, target }]);
  return { grant, payload, rows };
}

// Review-A, 25 Nov (r3, r4): one deadline shared by hashes and passes. A multi-hash row whose budget runs out after a
// revert, with another hash unread, is left exactly as it was. After expiry nothing more is read or written: no later
// pass, no housekeeping (interrupted claim, retryable requeue), no seat sweep, no RPC. The next tick settles it all.
test("after the tick deadline no pass, query, write or RPC starts; the next tick picks everything up", async () => {
  const [older, latest] = [`0x${"a".repeat(64)}`, `0x${"b".repeat(64)}`];
  let clock = Date.parse("2026-11-25T12:00:00Z");
  let expired = false;
  let rpcAtExpiry = -1;
  let slowOnce = true;
  const tickNow = () => new Date(clock);
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(healthyChain({
    eth_chainId: () => numberToHex(137),
    eth_blockNumber: () => numberToHex(101),
    // The latest send reverted (slowly, past the deadline); the older send at the same nonce is the one that mined.
    eth_getTransactionReceipt: ([hash]) => {
      if (hash === latest) { if (slowOnce) { slowOnce = false; clock += 20 * 60_000; expired = true; rpcAtExpiry = chain.requests.length; } return { ...receipt("0x0", []), transactionHash: latest }; }
      return { ...receipt("0x1", [transferLog(42n)]), transactionHash: older };
    },
  }));
  const grant = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, now: tickNow, env: live, polygon: { lock: lockAddress, granter: account.address } });
  const send = (txHash: string) => ({ txHash, maxFeePerGas: "1", maxPriorityFeePerGas: "1", sentAt: "2026-11-25T11:00:00.000Z", accepted: true });
  const { payload: store, rows } = fakePayload([
    { id: "00000000-0000-4000-8000-0000000000b1", operationKey: "unlock-grant:v1:order-m:1", entitlement: "adm", state: "submitted", attempts: 1, attemptID: "a1", txHash: latest, signer: grant.signer, nonce: 3, sends: [send(older), send(latest)], target },
    owed("later", 1),
    { id: "interrupted", operationKey: "unlock-grant:v1:order-i:1", entitlement: "adm", state: "submitted", attempts: 1, attemptID: "ai", dispatchStartedAt: "2026-11-25T10:00:00.000Z", target },
    { id: "retryable", operationKey: "unlock-grant:v1:order-r:1", entitlement: "adm", state: "failed_retryable", attempts: 1, lastErrorCode: "tx_reverted", target },
  ]);
  // Every Payload call made after the deadline expired is recorded.
  const afterExpiry: string[] = [];
  const payload = new Proxy(store, { get(target, property, receiver) {
    const value = Reflect.get(target, property, receiver);
    return typeof value === "function" ? (...args: unknown[]) => { if (expired) afterExpiry.push(String(property)); return value.apply(target, args); } : value;
  } });
  const first = await runKeyGrantTick({ payload, grant, acquire: runLock().acquire, env: live, now: tickNow });
  assert.deepEqual(first, { outcome: "ran", reconciled: 0, replaced: 0, dispatched: 0, cancelled: 0, seatsReleased: 0, seatSweepFailures: 0, overCap: [] });
  assert.deepEqual(afterExpiry, [], "no Payload read or write after expiry");
  assert.equal(chain.requests.length, rpcAtExpiry, "no RPC after expiry (the older hash is not read)");
  const byID = (id: string) => rows["commerce-key-grant-intents"].find((row) => row.id === id)!;
  assert.deepEqual([byID("00000000-0000-4000-8000-0000000000b1").state, byID("00000000-0000-4000-8000-0000000000b1").lastErrorCode, byID("00000000-0000-4000-8000-0000000000b1").nextAttemptAt], ["submitted", undefined, undefined], "not reverted, not deferred");
  assert.equal(byID("later").state, "pending");
  assert.equal(byID("interrupted").state, "submitted", "the interrupted claim waits");
  assert.equal(byID("retryable").state, "failed_retryable", "the retryable row waits");
  expired = false;
  const second = await runKeyGrantTick({ payload, grant, acquire: runLock().acquire, env: live, now: tickNow });
  assert.equal(second.outcome === "ran" && second.reconciled, 1);
  assert.deepEqual([byID("00000000-0000-4000-8000-0000000000b1").state, byID("00000000-0000-4000-8000-0000000000b1").tokenID, byID("00000000-0000-4000-8000-0000000000b1").settledTxHash], ["granted", "42", older]);
  assert.notEqual(byID("interrupted").state, "submitted", "housekeeping ran on the next tick");
  assert.notEqual(byID("retryable").state, "failed_retryable", "requeued on the next tick");
});
