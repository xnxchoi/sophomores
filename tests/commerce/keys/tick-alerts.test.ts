import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { boundedSend, createTickAlertLog, deliverTickAlerts, spoolTickAlert, SPOOL_MAX_FILES, tickAlertFromLine, type TickAlertEmail } from "@/lib/commerce/keys/tick-alerts";

// Owner, 25 Nov: "email alerts via Zoho is fine". Review-A, 25 Nov: per-event schema, the spool as a trust boundary,
// durable intake with a cap across producers, loud spool failures, bounded send.
const id = "3f0c8a2e-1b4d-4c6e-9a7f-0123456789ab";
const fake = ["Synthetic", "Marker", "0123456789abcdef"].join("");

test("each alert line passes a per-event schema: UUID intents, fixed codes and reasons, bounded counts", () => {
  assert.deepEqual(tickAlertFromLine(`{"event":"key_grant_over_cap","intent":"${id}"}`), { kind: "over_cap", intent: id });
  assert.deepEqual(tickAlertFromLine(`{"event":"key_grant_parked","intent":"${id}","code":"replacement_rebroadcast_role_hook_set"}`), { kind: "parked", intent: id, code: "replacement_rebroadcast_role_hook_set" });
  assert.deepEqual(tickAlertFromLine('{"event":"seat_sweep_failed","count":2}'), { kind: "seat_sweep_failed", count: "2" });
  assert.deepEqual(tickAlertFromLine('{"outcome":"failure","reason":"rpc_file_not_owner_only"}'), { kind: "tick_failure", reason: "rpc_file_not_owner_only" });
  assert.deepEqual(tickAlertFromLine(`{"event":"key_grant_over_cap","intent":"${fake}"}`), { kind: "over_cap", intent: "unrecognised" });
  assert.deepEqual(tickAlertFromLine(`{"event":"key_grant_parked","intent":"${id}","code":"${fake}"}`), { kind: "parked", intent: id, code: "unrecognised" });
  assert.deepEqual(tickAlertFromLine('{"event":"seat_sweep_failed","count":1e9}'), { kind: "seat_sweep_failed", count: "unrecognised" });
  assert.deepEqual(tickAlertFromLine(`{"outcome":"failure","reason":"${fake}"}`), { kind: "tick_failure", reason: "unrecognised" });
  for (const quiet of ['{"outcome":"off"}', `{"outcome":"ran","overCap":["${id}"]}`, "not json", "", "[1]"]) assert.equal(tickAlertFromLine(quiet), null, quiet);
});

function spool() {
  const dir = mkdtempSync(join(tmpdir(), "alert-spool-"));
  return { dir, statePath: `${dir}.state.json`, done: () => { rmSync(dir, { recursive: true, force: true }); rmSync(`${dir}.state.json`, { force: true }); } };
}
const slots = (dir: string) => readdirSync(dir).filter((name) => /^slot-\d{3}\.alert\.json$/.test(name));

test("the spool is a trust boundary: shape-valid but non-allowlisted fields, extra fields, symlinks and oversized files are never mailed", async () => {
  const { dir, statePath, done } = spool();
  const outside = mkdtempSync(join(tmpdir(), "alert-outside-"));
  try {
    writeFileSync(join(dir, "slot-001.alert.json"), JSON.stringify({ kind: "parked", intent: id, code: "made_up_code" }));
    writeFileSync(join(dir, "slot-002.alert.json"), JSON.stringify({ kind: "tick_failure", reason: "looks_fine_but_unknown" }));
    writeFileSync(join(dir, "slot-003.alert.json"), JSON.stringify({ kind: "over_cap", intent: "bad", detail: `intent ${fake}`, extra: fake }));
    writeFileSync(join(dir, "slot-004.alert.json"), JSON.stringify({ kind: "seat_sweep_failed", count: 99_999 }));
    writeFileSync(join(dir, "slot-005.alert.json"), JSON.stringify({ kind: "over_cap", intent: id }) + " ".repeat(600));
    const target = join(outside, "target.json");
    writeFileSync(target, JSON.stringify({ kind: "over_cap", intent: id }));
    symlinkSync(target, join(dir, "slot-006.alert.json"));
    writeFileSync(join(dir, "not-a-slot.json"), JSON.stringify({ kind: "over_cap", intent: fake }));
    const sent: TickAlertEmail[] = [];
    await deliverTickAlerts({ dir, statePath, now: () => 10_000_000, send: async (email) => { sent.push(email); } });
    const all = sent.map((email) => email.text).join("\n");
    assert.match(all, new RegExp(`intent ${id}: unrecognised`));
    assert.match(all, /- reason unrecognised/);
    assert.match(all, /- intent unrecognised/);
    assert.match(all, /- count unrecognised/);
    assert.ok(!all.includes(fake) && !all.includes("made_up_code") && !all.includes("looks_fine_but_unknown"));
    const overCap = sent.find((email) => email.subject.includes("256-block"))!;
    assert.equal(overCap.text.split("\n").filter((line) => line.startsWith("- ")).join("|"), "- intent unrecognised", "the oversized and symlinked over-cap files are not trusted");
    assert.equal(readFileSync(target, "utf8").length > 0, true, "the symlink's target is untouched");
    assert.deepEqual(slots(dir), [], "slots cleared once mailed");
    assert.ok(readdirSync(dir).includes("not-a-slot.json"), "files outside the slot names are ignored");
  } finally { done(); rmSync(outside, { recursive: true, force: true }); }
});

test("the 500-alert cap holds across concurrent producers, and a full spool or a failed write is never silent", async () => {
  const { dir, done } = spool();
  try {
    const results = await Promise.all(Array.from({ length: SPOOL_MAX_FILES + 20 }, () => spoolTickAlert(dir, { kind: "seat_sweep_failed", count: "1" })));
    assert.equal(results.filter((result) => result === "written").length, SPOOL_MAX_FILES);
    assert.equal(results.filter((result) => result === "full").length, 20);
    assert.equal(slots(dir).length, SPOOL_MAX_FILES);
    assert.ok(readdirSync(dir).includes("overflow"));
    assert.equal(readdirSync(dir).filter((name) => name.endsWith(".tmp")).length, 0, "no temporary files left");
    const lines: string[] = [];
    const full = createTickAlertLog(dir, (line) => lines.push(line));
    full.log(`{"event":"key_grant_over_cap","intent":"${id}"}`);
    await full.settled();
    const missing = createTickAlertLog(join(dir, "no-such-dir"), (line) => lines.push(line));
    missing.log(`{"event":"key_grant_over_cap","intent":"${id}"}`);
    await missing.settled();
    assert.deepEqual(lines, [
      `{"event":"key_grant_over_cap","intent":"${id}"}`, '{"event":"alert_spool_full"}',
      `{"event":"key_grant_over_cap","intent":"${id}"}`, '{"event":"alert_spool_failed"}',
    ]);
  } finally { done(); }
});

test("spooled alerts survive a restart; one email per kind per hour; files deleted only after a sent email; backoff on failure; overflow mailed", async () => {
  const { dir, statePath, done } = spool();
  try {
    let clock = 1_000_000;
    const sent: TickAlertEmail[] = [];
    let down = false;
    const deliver = () => deliverTickAlerts({ dir, statePath, now: () => clock, send: async (email) => { if (down) throw new Error("smtp down"); sent.push(email); } });
    await spoolTickAlert(dir, { kind: "over_cap", intent: id });
    assert.deepEqual(await deliver(), { sent: 1, waiting: 0, backingOff: false });
    assert.match(sent[0].subject, /past the 256-block limit \(1\)/);
    clock += 2 * 60_000; await spoolTickAlert(dir, { kind: "over_cap", intent: id });
    clock += 2 * 60_000; await spoolTickAlert(dir, { kind: "over_cap", intent: id });
    assert.deepEqual(await deliver(), { sent: 0, waiting: 2, backingOff: false });
    clock += 60 * 60_000;
    down = true;
    assert.deepEqual(await deliver(), { sent: 0, waiting: 2, backingOff: true });
    assert.equal(slots(dir).length, 2, "kept after a failed send");
    down = false;
    clock += 30_000;
    assert.equal((await deliver()).backingOff, true, "still within the 1-minute backoff");
    clock += 60_000;
    assert.deepEqual(await deliver(), { sent: 1, waiting: 0, backingOff: false });
    assert.match(sent[1].subject, /\(1\)/, "the repeated intent is listed once");
    writeFileSync(join(dir, "overflow"), "");
    await deliver();
    assert.match(sent[2].text, /reason alert_backlog_full/);
    assert.ok(!readdirSync(dir).includes("overflow"));
  } finally { done(); }
});

test("a send that hangs is cut off", async () => {
  await assert.rejects(boundedSend(new Promise(() => {}), 20), /timed out/);
});
