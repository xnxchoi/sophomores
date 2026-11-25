import assert from "node:assert/strict";
import { test } from "node:test";
import { createTickAlerter, tickAlertFromLine, type TickAlertEmail } from "@/lib/commerce/keys/tick-alerts";

// Owner, 25 Nov: "email alerts via Zoho is fine". The tick's fixed journal lines become at most one email per kind per hour.
test("only the lines a person must act on become alerts, with fixed codes and intent IDs only", () => {
  assert.deepEqual(tickAlertFromLine('{"event":"key_grant_over_cap","intent":"i9"}'), { kind: "over_cap", detail: "intent i9" });
  assert.deepEqual(tickAlertFromLine('{"event":"key_grant_parked","intent":"i7","code":"role_hook_set"}'), { kind: "parked", detail: "intent i7: role_hook_set" });
  assert.deepEqual(tickAlertFromLine('{"event":"seat_sweep_failed","count":2}'), { kind: "seat_sweep_failed", detail: "count 2" });
  assert.deepEqual(tickAlertFromLine('{"outcome":"failure","reason":"rpc_file_not_owner_only"}'), { kind: "tick_failure", detail: "reason rpc_file_not_owner_only" });
  for (const quiet of ['{"outcome":"off"}', '{"outcome":"ran","reconciled":0,"overCap":["i9"]}', "not json", "", "[1]"]) assert.equal(tickAlertFromLine(quiet), null, quiet);
  assert.deepEqual(tickAlertFromLine('{"event":"key_grant_over_cap","intent":"a@b.c <x>"}'), { kind: "over_cap", detail: "intent unreadable" }, "nothing unexpected is copied into mail");
});

test("one email per kind per hour: the first at once, repeats listed once in the next email, a failed send retried", async () => {
  let clock = 0;
  const sent: TickAlertEmail[] = [];
  let failNext = false;
  const alerter = createTickAlerter({ host: "vps", now: () => clock, send: async (email) => { if (failNext) { failNext = false; throw new Error("smtp down"); } sent.push(email); } });
  const over = (intent: string) => alerter.push({ kind: "over_cap", detail: `intent ${intent}` });
  await over("i9");
  assert.equal(sent.length, 1);
  assert.match(sent[0].subject, /past the 256-block limit \(1\)/);
  assert.match(sent[0].text, /- intent i9/);
  clock += 2 * 60_000; await over("i9");
  clock += 2 * 60_000; await over("i10");
  await alerter.push({ kind: "tick_failure", detail: "reason rpc_url_in_env" });
  assert.equal(sent.length, 2, "another kind is not held back by over_cap's window");
  clock += 60 * 60_000;
  failNext = true;
  await alerter.flush();
  assert.equal(sent.length, 2, "failed send");
  await alerter.flush();
  assert.equal(sent.length, 3);
  assert.match(sent[2].subject, /\(2\)/);
  assert.match(sent[2].text, /- intent i9\n- intent i10/);
});
