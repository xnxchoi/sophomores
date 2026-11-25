import assert from "node:assert/strict";
import { test } from "node:test";
import { keccak256, numberToHex, type Hex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { runKeyGrantTick } from "@/lib/commerce/keys/grant-catch-up";
import { readKeyGrantQueue, ReceiptIncomplete } from "@/lib/commerce/keys/queue-receipt";
import { canonicalAlert, FENCE_REASONS, tickAlertEmail, tickAlertFromLine } from "@/lib/commerce/keys/tick-alerts";
import { createUnlockKeyGrantAdapter } from "@/lib/commerce/keys/unlock/adapter";
import { KeyGrantRunModeError, keyGrantRunScope, MAX_ALLOWED_INTENTS } from "@/lib/commerce/keys/unlock/polygon";
import { replaceStuckKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload, type Row } from "./support/fake-payload";
import { healthyChain, lockAddress, mockChain, recipient } from "./support/mock-chain";

// The supervised first run (VPS plan v4 H1, v5 K4): scope from the run mode, enforced where the worker chooses work.
// Fake Payload and the scripted mock chain only: no RPC, no real key, no broadcast.
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const live = { KEY_GRANT_POLYGON_LIVE: "1", KEY_GRANT_POLYGON_MAX_COST_WEI: "1000000000000000000" } as const;
const target = { chainID: 137, lock: lockAddress, recipient };
const now = () => new Date("2026-11-26T12:00:00Z");
const owed = (id: string, extra: Record<string, unknown> = {}): Row =>
  ({ id, operationKey: `unlock-grant:v1:order-${id}:1`, entitlement: "adm", state: "pending", attempts: 0, target, ...extra });
const code = (run: () => unknown) => { try { run(); return "none"; } catch (error) { return error instanceof KeyGrantRunModeError ? error.code : "other"; } };

function grantAdapter() {
  const raws: Hex[] = [];
  const account = privateKeyToAccount(generatePrivateKey());
  const chain = mockChain(healthyChain({
    eth_chainId: () => numberToHex(137),
    eth_sendRawTransaction: (params) => { raws.push(params[0] as Hex); return keccak256(params[0] as Hex); },
  }));
  const adapter = createUnlockKeyGrantAdapter({ chainID: 137, account, transport: chain.transport, now, env: live, polygon: { lock: lockAddress, granter: account.address } });
  return { adapter, raws };
}
const lock = () => { let held = false; return async () => { if (held) return null; held = true; return async () => { held = false; }; }; };

test("run mode: first-run needs an exact allowlist; scheduled refuses one; anything else refuses", () => {
  assert.deepEqual(keyGrantRunScope({}), { mode: "scheduled" });
  assert.deepEqual(keyGrantRunScope({ KEY_GRANT_TICK_MODE: "scheduled" }), { mode: "scheduled" });
  const first = keyGrantRunScope({ KEY_GRANT_TICK_MODE: "first-run", KEY_GRANT_POLYGON_ALLOWED_INTENTS: `${A},${B}` });
  assert.equal(first.mode === "first-run" && [...first.intents].join(), `${A},${B}`);
  for (const listed of [undefined, "", " ", `${A},`, `${A}, ${B}`, `${A},${A}`, A.toUpperCase(), "all", "*", "1",
    Array.from({ length: MAX_ALLOWED_INTENTS + 1 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`).join(",")]) {
    assert.equal(code(() => keyGrantRunScope({ KEY_GRANT_TICK_MODE: "first-run", ...(listed === undefined ? {} : { KEY_GRANT_POLYGON_ALLOWED_INTENTS: listed }) })), "allowlist_invalid", String(listed));
  }
  for (const listed of [A, "", "x"]) {
    assert.equal(code(() => keyGrantRunScope({ KEY_GRANT_POLYGON_ALLOWED_INTENTS: listed })), "allowlist_in_scheduled");
    assert.equal(code(() => keyGrantRunScope({ KEY_GRANT_TICK_MODE: "scheduled", KEY_GRANT_POLYGON_ALLOWED_INTENTS: listed })), "allowlist_in_scheduled");
  }
  for (const mode of ["", "First-run", "first_run", "live", "all"]) assert.equal(code(() => keyGrantRunScope({ KEY_GRANT_TICK_MODE: mode })), "mode_invalid");
});

test("a scoped tick grants only listed intents and skips owner-cancel and seat maintenance", async () => {
  const { adapter, raws } = grantAdapter();
  const { payload, rows } = fakePayload([owed(A), owed(B)]);
  const result = await runKeyGrantTick({ payload, grant: adapter, acquire: lock(), env: live, now, scope: new Set([A]) });
  assert.deepEqual(result, { outcome: "ran", reconciled: 0, replaced: 0, dispatched: 1, cancelled: 0, seatsReleased: 0, seatSweepFailures: 0, overCap: [], maintenance: "skipped_allowlist" });
  assert.equal(raws.length, 1);
  const state = (id: string) => rows["commerce-key-grant-intents"].find((row) => row.id === id)?.state;
  assert.equal(state(A), "submitted");
  assert.equal(state(B), "pending", "an intent outside the list is never claimed");
});

test("an empty scope does nothing at all", async () => {
  const { adapter, raws } = grantAdapter();
  const { payload, rows } = fakePayload([owed(A)]);
  const result = await runKeyGrantTick({ payload, grant: adapter, acquire: lock(), env: live, now, scope: new Set() });
  assert.equal(result.outcome === "ran" && result.dispatched, 0);
  assert.equal(raws.length, 0);
  assert.equal(rows["commerce-key-grant-intents"][0].state, "pending");
});

test("replacement never touches a stuck grant outside the list", async () => {
  const { adapter, raws } = grantAdapter();
  const stuck = owed(B, { state: "submitted", signer: adapter.signer, nonce: 0, txHash: `0x${"1".repeat(64)}`, lastSentAt: "2026-11-26T11:00:00.000Z",
    sends: [{ txHash: `0x${"1".repeat(64)}`, raw: "0x02", sentAt: "2026-11-26T11:00:00.000Z" }] });
  const { payload, rows } = fakePayload([stuck]);
  assert.equal(await replaceStuckKeyGrants({ payload, adapter, now, scope: new Set([A]) }), 0);
  assert.equal(raws.length, 0);
  assert.deepEqual(rows["commerce-key-grant-intents"][0].sends, stuck.sends);
});

test("fence alerts: fixed reasons only, their own subject; the tick's new refusals are recognised", () => {
  for (const reason of FENCE_REASONS) assert.deepEqual(canonicalAlert({ kind: "fence", reason }), { kind: "fence", reason });
  assert.deepEqual(canonicalAlert({ kind: "fence", reason: "rm -rf /" }), { kind: "fence", reason: "unrecognised" });
  assert.deepEqual(canonicalAlert({ kind: "fence", reason: "fence_install_failed", extra: "0xabc" }), { kind: "fence", reason: "fence_install_failed" });
  assert.equal(tickAlertEmail("fence", ["reason fence_install_failed"]).subject, "[Sophomores] Key job fenced: its network is cut (1)");
  for (const reason of ["mode_invalid", "allowlist_invalid", "allowlist_in_scheduled"]) {
    assert.deepEqual(tickAlertFromLine(JSON.stringify({ outcome: "failure", reason })), { kind: "tick_failure", reason });
  }
});

test("queue receipt: listed by intent, target checked, the signer's in-flight intents included; incomplete reads fail", async () => {
  const signer = "0x2cdb060e373f0efe93beffd1478cde739cbc5336";
  const caip = `eip155:137:${signer}`;
  const { payload, rows } = fakePayload([
    owed(A, { recipientMode: "member_safe", beneficiaryUser: "m1", nonce: 4, txHash: "0xaa", sends: [{}], state: "submitted", signer: caip }),
    owed(B, { recipientMode: "member_safe", beneficiaryUser: "m2" }),
    owed("c", { target: { chainID: 8453, lock: lockAddress, recipient }, state: "ambiguous", signer: caip }),
    owed("d", { target: { chainID: 8453, lock: lockAddress, recipient } }),
    owed("e", { target: null }),
    owed("f", { state: "granted" }),
  ]);
  rows["member-wallets"] = [
    { id: "w1", activeSlot: "m1", status: "active", safeAddress: recipient, walletKey: `137:${recipient}` },
    { id: "w2", activeSlot: "m2", status: "active", safeAddress: "0x000000000000000000000000000000000000dEaD", walletKey: "137:0x000000000000000000000000000000000000dEaD" },
  ];
  const pins = { lock: lockAddress, granter: signer } as never;
  const receipt = await readKeyGrantQueue({ payload, signer, pins });
  const byID = Object.fromEntries(receipt.lines.map((line) => [line.intent, line]));
  assert.deepEqual(Object.keys(byID).sort(), [A, B, "c", "e"].sort(), "other chains only when in flight for this signer; granted only with a cancel");
  assert.deepEqual(byID[A], { intent: A, state: "submitted", attempts: 0, nonce: 4, hasTxHash: true, sends: 1, cancelRequested: false, target: "ok", signerInFlight: true });
  assert.equal(byID[B]!.target, "recipient_mismatch");
  assert.equal(byID.c!.target, "chain_other");
  assert.equal(byID.c!.signerInFlight, true);
  assert.equal(byID.e!.target, "target_unset");
  assert.deepEqual(receipt.summary, { receipt: "complete", intents: 4, byState: { submitted: 1, pending: 2, ambiguous: 1 } });
  assert.equal(JSON.stringify(receipt).toLowerCase().includes(recipient.slice(2).toLowerCase()), false, "no address is printed");

  const broken = { ...payload, find: async () => { throw new Error("db"); } } as never;
  await assert.rejects(readKeyGrantQueue({ payload: broken, signer, pins }));
  let calls = 0;
  const moving = { ...payload, find: async (args: never) => { const found = await payload.find(args); calls += 1; return { ...found, totalDocs: found.totalDocs + calls }; } } as never;
  await assert.rejects(readKeyGrantQueue({ payload: moving, signer, pins }), ReceiptIncomplete);
});
