import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { boundedSend, deliverTickAlerts, spoolTickAlert, SPOOL_MAX_FILES, tickAlertFromLine, type TickAlertEmail } from "@/lib/commerce/keys/tick-alerts";

// Owner, 25 Nov: "email alerts via Zoho is fine". Review-A, 25 Nov: per-event schema, durable intake, bounded send.
const id = "3f0c8a2e-1b4d-4c6e-9a7f-0123456789ab";
const fake = ["Synthetic", "Marker", "0123456789abcdef"].join("");

test("each alert line passes a per-event schema: UUID intents, fixed codes and reasons, bounded counts", () => {
  assert.deepEqual(tickAlertFromLine(`{"event":"key_grant_over_cap","intent":"${id}"}`), { kind: "over_cap", detail: `intent ${id}` });
  assert.deepEqual(tickAlertFromLine(`{"event":"key_grant_parked","intent":"${id}","code":"replacement_rebroadcast_role_hook_set"}`), { kind: "parked", detail: `intent ${id}: replacement_rebroadcast_role_hook_set` });
  assert.deepEqual(tickAlertFromLine('{"event":"seat_sweep_failed","count":2}'), { kind: "seat_sweep_failed", detail: "count 2" });
  assert.deepEqual(tickAlertFromLine('{"outcome":"failure","reason":"rpc_file_not_owner_only"}'), { kind: "tick_failure", detail: "reason rpc_file_not_owner_only" });
  // Token-shaped or unexpected values never reach the mail body.
  for (const [line, detail] of [
    [`{"event":"key_grant_over_cap","intent":"${fake}"}`, "intent unrecognised"],
    [`{"event":"key_grant_parked","intent":"${id}","code":"${fake}"}`, `intent ${id}: unrecognised`],
    ['{"event":"seat_sweep_failed","count":1e9}', "count unrecognised"],
    [`{"outcome":"failure","reason":"${fake}"}`, "reason unrecognised"],
  ] as const) assert.equal(tickAlertFromLine(line)?.detail, detail, line);
  for (const quiet of ['{"outcome":"off"}', `{"outcome":"ran","overCap":["${id}"]}`, "not json", "", "[1]"]) assert.equal(tickAlertFromLine(quiet), null, quiet);
});

function spool() {
  const dir = mkdtempSync(join(tmpdir(), "alert-spool-"));
  return { dir, statePath: join(dir, "..", `${dir.split("/").pop()}.state.json`), done: () => rmSync(dir, { recursive: true, force: true }) };
}

test("spooled alerts survive a restart; one email per kind per hour; files deleted only after a sent email; backoff on failure", async () => {
  const { dir, statePath, done } = spool();
  try {
    let clock = 1_000_000;
    const sent: TickAlertEmail[] = [];
    let down = false;
    const deliver = () => deliverTickAlerts({ dir, statePath, now: () => clock, send: async (email) => { if (down) throw new Error("smtp down"); sent.push(email); } });
    await spoolTickAlert(dir, { kind: "over_cap", detail: `intent ${id}` }, () => clock);
    assert.deepEqual(await deliver(), { sent: 1, waiting: 0, backingOff: false });
    assert.match(sent[0].subject, /past the 256-block limit \(1\)/);
    // The same intent again within the hour waits on disk, across a "restart" (a fresh call reading the state file).
    clock += 2 * 60_000; await spoolTickAlert(dir, { kind: "over_cap", detail: `intent ${id}` }, () => clock);
    clock += 2 * 60_000; await spoolTickAlert(dir, { kind: "over_cap", detail: `intent ${id}` }, () => clock);
    assert.deepEqual(await deliver(), { sent: 0, waiting: 2, backingOff: false });
    clock += 60 * 60_000;
    down = true;
    assert.deepEqual(await deliver(), { sent: 0, waiting: 2, backingOff: true });
    assert.equal(readdirSync(dir).filter((name) => name.endsWith(".alert.json")).length, 2, "kept after a failed send");
    down = false;
    clock += 30_000;
    assert.equal((await deliver()).backingOff, true, "still within the 1-minute backoff");
    clock += 60_000;
    assert.deepEqual(await deliver(), { sent: 1, waiting: 0, backingOff: false });
    assert.match(sent[1].subject, /\(1\)/, "the repeated intent is listed once");
  } finally { done(); }
});

test("a tampered spool file is reported as unrecognised, and a full spool leaves one overflow marker that is mailed", async () => {
  const { dir, statePath, done } = spool();
  try {
    writeFileSync(join(dir, "000000000000001-aa.alert.json"), JSON.stringify({ kind: "over_cap", detail: `intent ${fake}` }));
    for (let n = 0; n < SPOOL_MAX_FILES; n++) await spoolTickAlert(dir, { kind: "seat_sweep_failed", detail: "count 1" }, () => 2_000 + n);
    assert.equal(await spoolTickAlert(dir, { kind: "seat_sweep_failed", detail: "count 1" }), false);
    assert.ok(readdirSync(dir).includes("overflow"));
    const sent: TickAlertEmail[] = [];
    await deliverTickAlerts({ dir, statePath, now: () => 10_000_000, send: async (email) => { sent.push(email); } });
    const failure = sent.find((email) => /tick failed/.test(email.subject))!;
    assert.match(failure.text, /reason unrecognised/);
    assert.match(failure.text, /reason alert_backlog_full/);
    assert.ok(!sent.some((email) => email.text.includes(fake)));
    assert.ok(!readdirSync(dir).includes("overflow"), "cleared once mailed");
  } finally { done(); }
});

test("a send that hangs is cut off", async () => {
  await assert.rejects(boundedSend(new Promise(() => {}), 20), /timed out/);
});
