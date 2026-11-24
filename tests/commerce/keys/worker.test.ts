import assert from "node:assert/strict";
import { test } from "node:test";
import type { KeyGrantAdapter } from "@/lib/commerce/keys/contracts";
import { dispatchKeyGrants, reconcileKeyGrants, replaceStuckKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload, type Row } from "./support/fake-payload";

const target = { chainID: 84532, lock: `0x${"a".repeat(40)}`, recipient: `0x${"b".repeat(40)}` };
const hash = `0x${"c".repeat(64)}`;

const pending = (extra: Row | Record<string, unknown> = {}): Row => ({ id: "k", operationKey: "unlock-grant:v1:order:1", entitlement: "adm", state: "pending", attempts: 0, target, ...extra });
const signer = `eip155:84532:0x${"1".repeat(40)}`;
const fee = { maxFeePerGas: "100", maxPriorityFeePerGas: "10" };
/** Stand-in signed bytes; the in-memory store runs no collection hooks. */
const raw = "0x02f8";
type Sent = { kind: "submitted" | "unknown"; txHash?: string } | { kind: "definitelyNotSent"; code: string };
/**
 * Test adapter: `send` decides one dispatch. A not-sent answer comes from
 * `prepare`; otherwise the grant is prepared under `txHash` (default `hash`) at
 * the nonce floor the worker passed, and `broadcast` answers
 * `submitted`/`unknown`, or throws when `send` threw.
 */
const adapter = (send: () => Promise<Sent>, reconcile: KeyGrantAdapter["reconcile"] = async () => ({ kind: "unknown" })) => {
  const answers = new Map<string, "submitted" | "unknown" | Error>();
  const released: string[] = [];
  const broadcasts: string[] = [];
  const floors: number[] = [];
  const a: KeyGrantAdapter & { released: string[]; broadcasts: string[]; floors: number[] } = {
    signer, released, broadcasts, floors, reconcile,
    async prepare({ nonceFloor }) {
      floors.push(nonceFloor);
      let sent: Sent;
      try { sent = await send(); } catch (error) { answers.set(hash, error as Error); return { kind: "prepared", txHash: hash, raw, nonce: nonceFloor, fee }; }
      if (sent.kind === "definitelyNotSent") return sent;
      answers.set(sent.txHash ?? hash, sent.kind);
      return { kind: "prepared", txHash: sent.txHash ?? hash, raw, nonce: nonceFloor, fee };
    },
    async prepareReplacement() { throw new Error("no replacement expected"); },
    async rebroadcast() { throw new Error("no re-send expected"); },
    async broadcast({ txHash }) {
      broadcasts.push(txHash);
      const answer = answers.get(txHash);
      if (answer instanceof Error) throw answer;
      return { kind: answer ?? "unknown" };
    },
    release({ txHash }) { released.push(txHash); },
  };
  return a;
};

test("a broadcast grant stays submitted with its hash; reconciliation grants it with evidence", async () => {
  const { payload, rows } = fakePayload([pending()]);
  const a = adapter(async () => ({ kind: "submitted" }), async () => ({ kind: "confirmed", tokenID: "7" }));
  assert.equal(await dispatchKeyGrants({ payload, adapter: a }), 1);
  const [intent] = rows["commerce-key-grant-intents"];
  assert.equal(intent.state, "submitted");
  assert.equal(intent.txHash, hash);
  assert.equal(intent.attempts, 1);
  await reconcileKeyGrants({ payload, adapter: a });
  assert.equal(intent.state, "granted");
  assert.equal(intent.tokenID, "7");
});

test("the hash is durable before broadcast, so a crash after broadcast still reconciles", async () => {
  const { payload, rows } = fakePayload([pending()]);
  const [intent] = rows["commerce-key-grant-intents"];
  const seen: unknown[] = [];
  let crashed = false;
  // The broadcast answer is unclear, so the worker must write an outcome afterwards; that write never happens.
  const a = adapter(async () => ({ kind: "unknown" }), async () => ({ kind: "confirmed", tokenID: "3" }));
  const broadcast = a.broadcast.bind(a);
  a.broadcast = async (input) => {
    seen.push(intent.txHash, intent.state);
    const answer = await broadcast(input);
    crashed = true; // the process dies before the outcome is recorded
    return answer;
  };
  const update = payload.update.bind(payload);
  payload.update = (async (args: never) => { if (crashed) throw new Error("process died"); return update(args); }) as typeof payload.update;
  await dispatchKeyGrants({ payload, adapter: a });
  assert.deepEqual(seen, [hash, "submitted"], "the hash was on the intent before broadcast");
  assert.equal(intent.lastErrorCode, "grant_broadcast_pending", "failed outcome persistence keeps the conservative fence");
  assert.equal((intent.sends as { raw?: string }[])[0].raw, undefined);
  crashed = false;
  assert.deepEqual([intent.state, intent.txHash], ["submitted", hash], "the dead process left the hash behind");
  await reconcileKeyGrants({ payload, adapter: a });
  assert.equal(intent.state, "granted");
});

test("a prepared grant whose intent moved on is released and never broadcast", async () => {
  const { payload, rows } = fakePayload([pending()]);
  const a = adapter(async () => { rows["commerce-key-grant-intents"][0].attemptID = "someone-else"; return { kind: "submitted" }; });
  await dispatchKeyGrants({ payload, adapter: a });
  assert.deepEqual(a.released, [hash]);
  assert.deepEqual(a.broadcasts, []);
  assert.equal(rows["commerce-key-grant-intents"][0].txHash, undefined);
});

test("a throw while preparing is proven non-execution; a throw while broadcasting is ambiguous", async () => {
  const { payload, rows } = fakePayload([pending()]);
  const a = adapter(async () => ({ kind: "submitted" }));
  a.prepare = async () => { throw new Error("rpc down"); };
  await dispatchKeyGrants({ payload, adapter: a });
  assert.equal(rows["commerce-key-grant-intents"][0].state, "failed_retryable");
  assert.equal(rows["commerce-key-grant-intents"][0].lastErrorCode, "adapter_threw");
});

test("a broadcast throw or unknown outcome becomes ambiguous and is never dispatched again", async () => {
  for (const submit of [async () => { throw new Error("rpc down"); }, async () => ({ kind: "unknown" as const })]) {
    const { payload, rows } = fakePayload([pending()]);
    let calls = 0;
    const a = adapter(async () => { calls++; return submit(); });
    await dispatchKeyGrants({ payload, adapter: a });
    assert.equal(rows["commerce-key-grant-intents"][0].state, "ambiguous");
    await dispatchKeyGrants({ payload, adapter: a });
    assert.equal(calls, 1, "ambiguous work is not resubmitted");
  }
});

test("only proven non-execution is retryable; held admissions are not dispatched", async () => {
  const notSent = fakePayload([pending()]);
  await dispatchKeyGrants({ payload: notSent.payload, adapter: adapter(async () => ({ kind: "definitelyNotSent", code: "nonce_too_low" })) });
  assert.equal(notSent.rows["commerce-key-grant-intents"][0].state, "failed_retryable");
  assert.equal(notSent.rows["commerce-key-grant-intents"][0].lastErrorCode, "nonce_too_low");
  const held = fakePayload([pending()], [{ id: "adm", status: "available", benefitReview: true }]);
  let calls = 0;
  assert.equal(await dispatchKeyGrants({ payload: held.payload, adapter: adapter(async () => { calls++; return { kind: "submitted" }; }) }), 0);
  assert.equal(calls, 0);
  assert.equal(held.rows["commerce-key-grant-intents"][0].state, "pending");
});

test("reconciliation settles a submitted hash without resubmitting", async () => {
  const { payload, rows } = fakePayload([pending({ state: "submitted", txHash: hash, attemptID: "x" })]);
  let submits = 0;
  await reconcileKeyGrants({ payload, adapter: adapter(async () => { submits++; return { kind: "unknown" }; }, async () => ({ kind: "confirmed", tokenID: "9" })) });
  assert.equal(rows["commerce-key-grant-intents"][0].state, "granted");
  assert.equal(submits, 0);
});

test("held rows at the head of the queue cannot starve later eligible work", async () => {
  const held = Array.from({ length: 30 }, (_, index): Row => pending({ id: `held-${index}`, operationKey: `k${index}`, entitlement: "held" }));
  const { payload, rows } = fakePayload([...held, pending({ id: "ok", operationKey: "ok" })], [{ id: "held", status: "available", benefitReview: true }, { id: "adm", status: "available" }]);
  assert.equal(await dispatchKeyGrants({ payload, adapter: adapter(async () => ({ kind: "submitted" })) }), 1);
  assert.equal(rows["commerce-key-grant-intents"].find((row) => row.id === "ok")!.state, "submitted");
});

test("a retry after a proven revert is a fresh attempt; the old attempt's result never lands on it", async () => {
  const old = `0x${"d".repeat(64)}`;
  const { payload, rows } = fakePayload([pending({ state: "failed_retryable", txHash: old, attemptID: "first", attempts: 1, nextAttemptAt: new Date(0).toISOString() })]);
  await dispatchKeyGrants({ payload, adapter: adapter(async () => ({ kind: "submitted", txHash: hash })) });
  const [intent] = rows["commerce-key-grant-intents"];
  assert.equal(intent.state, "submitted");
  assert.equal(intent.txHash, hash, "the new attempt records its own hash");
  assert.notEqual(intent.attemptID, "first");
  assert.equal(intent.attempts, 2);
});

test("more held rows than one pass can scan still never block later work, even with passes far apart", async () => {
  const created = (index: number) => new Date(Date.UTC(2026, 10, 1, 0, 0, index)).toISOString();
  const held = Array.from({ length: 1200 }, (_, index): Row => pending({ id: `held-${index}`, operationKey: `k${index}`, entitlement: "held", createdAt: created(index) }));
  const { payload, rows } = fakePayload([...held, pending({ id: "ok", operationKey: "ok", createdAt: created(5000) })], [{ id: "held", status: "available", benefitReview: true }, { id: "adm", status: "available" }]);
  const a = adapter(async () => ({ kind: "submitted" }));
  let clock = Date.UTC(2026, 10, 15);
  const now = () => new Date(clock);
  // Each pass is an hour apart, so every earlier deferral has expired again.
  for (let pass = 0; pass < 3; pass++) { await dispatchKeyGrants({ payload, adapter: a, now }); clock += 60 * 60_000; }
  assert.equal(rows["commerce-key-grant-intents"].find((row) => row.id === "ok")!.state, "submitted");
  assert.ok(rows["commerce-key-grant-intents"].filter((row) => row.entitlement === "held").every((row) => row.state === "pending" && row.nextAttemptAt));
});

test("a failed retry is deferred, and an unanswered reconcile is pushed back instead of blocking", async () => {
  const notSent = fakePayload([pending()]);
  await dispatchKeyGrants({ payload: notSent.payload, adapter: adapter(async () => ({ kind: "definitelyNotSent", code: "x" })) });
  const [failed] = notSent.rows["commerce-key-grant-intents"];
  assert.equal(failed.state, "failed_retryable");
  assert.ok(String(failed.nextAttemptAt) > new Date().toISOString(), "retry waits for its backoff");
  const quiet = fakePayload([pending({ state: "ambiguous", txHash: hash, attemptID: "x" })]);
  await reconcileKeyGrants({ payload: quiet.payload, adapter: adapter(async () => ({ kind: "unknown" }), async () => ({ kind: "unknown" })) });
  assert.equal(quiet.rows["commerce-key-grant-intents"][0].state, "ambiguous");
  assert.ok(quiet.rows["commerce-key-grant-intents"][0].nextAttemptAt);
});

test("refused chains, invalid targets and recipients who already hold a key are parked, never retried", async () => {
  for (const code of ["chain_not_enabled", "invalid_target", "recipient_has_key"]) {
    const { payload, rows } = fakePayload([pending()]);
    let calls = 0;
    const a = adapter(async () => { calls++; return { kind: "definitelyNotSent", code }; });
    let clock = Date.UTC(2026, 10, 16);
    for (let pass = 0; pass < 3; pass++) { await dispatchKeyGrants({ payload, adapter: a, now: () => new Date(clock) }); clock += 24 * 60 * 60_000; }
    const [intent] = rows["commerce-key-grant-intents"];
    assert.equal(calls, 1, `${code} is attempted once`);
    assert.equal(intent.state, "failed_retryable");
    assert.equal(intent.lastErrorCode, code);
  }
});

test("a grant still unconfirmed past the age limit is surfaced as ambiguous, and still reconciled", async () => {
  const at = Date.UTC(2026, 10, 16, 12);
  const now = () => new Date(at);
  const minutesAgo = (minutes: number) => new Date(at - minutes * 60_000).toISOString();
  const { payload, rows } = fakePayload([
    pending({ id: "old", operationKey: "old", state: "submitted", txHash: hash, attemptID: "x", submittedAt: minutesAgo(31) }),
    pending({ id: "young", operationKey: "young", state: "submitted", txHash: `0x${"e".repeat(64)}`, attemptID: "y", submittedAt: minutesAgo(5) }),
    pending({ id: "unsure", operationKey: "unsure", state: "ambiguous", txHash: `0x${"f".repeat(64)}`, attemptID: "z", submittedAt: minutesAgo(45), lastErrorCode: "outcome_unknown" }),
  ]);
  await reconcileKeyGrants({ payload, adapter: adapter(async () => ({ kind: "unknown" })), now });
  const byID = (id: string) => rows["commerce-key-grant-intents"].find((row) => row.id === id)!;
  assert.equal(byID("old").state, "ambiguous");
  assert.equal(byID("old").lastErrorCode, "confirmation_overdue");
  assert.equal(byID("young").state, "submitted");
  assert.equal(byID("unsure").lastErrorCode, "confirmation_overdue");
  byID("old").nextAttemptAt = minutesAgo(1);
  await reconcileKeyGrants({ payload, adapter: adapter(async () => ({ kind: "unknown" }), async () => ({ kind: "confirmed", tokenID: "5" })), now });
  assert.equal(byID("old").state, "granted", "surfacing does not stop reconciliation");
});

test("a claim interrupted before its hash was recorded is proven unsent and retried after the age limit", async () => {
  const at = Date.UTC(2026, 10, 16, 12);
  const minutesAgo = (minutes: number) => new Date(at - minutes * 60_000).toISOString();
  const { payload, rows } = fakePayload([
    pending({ id: "stale", operationKey: "stale", state: "submitted", attemptID: "x", attempts: 1, dispatchStartedAt: minutesAgo(11) }),
    pending({ id: "fresh", operationKey: "fresh", state: "submitted", attemptID: "y", attempts: 1, dispatchStartedAt: minutesAgo(1) }),
  ]);
  await dispatchKeyGrants({ payload, adapter: adapter(async () => ({ kind: "submitted" })), now: () => new Date(at) });
  const byID = (id: string) => rows["commerce-key-grant-intents"].find((row) => row.id === id)!;
  assert.equal(byID("stale").state, "failed_retryable");
  assert.equal(byID("stale").lastErrorCode, "dispatch_interrupted");
  assert.equal(byID("fresh").state, "submitted", "a claim still in flight is left alone");
});

test("the signer, nonce and fee are written ahead with the hash, inside the signer lock", async () => {
  const at = new Date("2026-11-16T12:00:00Z");
  const { payload, rows, events } = fakePayload([pending()]);
  const [intent] = rows["commerce-key-grant-intents"];
  const a = adapter(async () => ({ kind: "submitted" }));
  const broadcast = a.broadcast.bind(a);
  let seen: unknown;
  a.broadcast = async (input) => {
    seen = structuredClone({ signer: intent.signer, nonce: intent.nonce, sends: intent.sends, lastSentAt: intent.lastSentAt });
    events.push("broadcast");
    return broadcast(input);
  };
  await dispatchKeyGrants({ payload, adapter: a, now: () => at });
  assert.deepEqual(seen, { signer, nonce: 0, sends: [{ txHash: hash, ...fee, sentAt: at.toISOString(), accepted: false }], lastSentAt: at.toISOString() }, "durable hash and nonce, but never expose unbroadcast raw bytes");
  assert.equal((intent.sends as { accepted: boolean }[])[0].accepted, true, "counted once the node accepted it");
  const lock = events.find((event) => event.startsWith(`lock:key-signer:${signer}@`));
  assert.ok(lock, "the signer lock was taken");
  const holder = lock.split("@")[1];
  const order = (event: string) => events.indexOf(event);
  assert.ok(order(lock) < order("broadcast") && order("broadcast") < order(`commit:${holder}`), "broadcast happened while the signer lock was held");
});

test("the next nonce is one past this signer's highest in-flight nonce, grants and cancels alike", async () => {
  const other = `eip155:84532:0x${"2".repeat(40)}`;
  const inFlight = (id: string, extra: Record<string, unknown>) => pending({ id, operationKey: id, txHash: `0x${id.padStart(64, "0")}`, signer, ...extra });
  const { payload } = fakePayload([
    pending(),
    inFlight("a1", { state: "submitted", nonce: 9 }),
    inFlight("a2", { state: "ambiguous", nonce: 10 }),
    inFlight("a3", { state: "granted", nonce: 40, tokenID: "1" }),
    inFlight("a4", { state: "failed_retryable", nonce: 41, lastErrorCode: "recipient_has_key" }),
    inFlight("a5", { state: "submitted", nonce: 50, signer: other }),
    inFlight("a6", { state: "granted", nonce: 2, tokenID: "2", cancelSigner: signer, cancelNonce: 11, cancelTxHash: hash }),
  ]);
  const a = adapter(async () => ({ kind: "submitted" }));
  await dispatchKeyGrants({ payload, adapter: a });
  assert.deepEqual(a.floors, [12], "settled grants and other signers do not count; 10 and 11 compare as numbers");
});

test("a nonce another in-flight grant already holds is never recorded or broadcast", async () => {
  const { payload, rows } = fakePayload([pending()]);
  const a = adapter(async () => {
    // Another process recorded nonce 0 for this signer after the floor was read (its lock was lost).
    rows["commerce-key-grant-intents"].push(pending({ id: "rival", operationKey: "rival", state: "submitted", signer, nonce: 0, txHash: `0x${"9".repeat(64)}` }));
    return { kind: "submitted" };
  });
  await dispatchKeyGrants({ payload, adapter: a });
  const [intent] = rows["commerce-key-grant-intents"];
  assert.deepEqual(a.broadcasts, []);
  assert.deepEqual(a.released, [hash]);
  assert.deepEqual([intent.state, intent.lastErrorCode, intent.txHash], ["failed_retryable", "nonce_conflict", undefined]);
});

test("a claim whose signer lock cannot be taken is recorded as not sent, not left for the sweep", async () => {
  const { payload, rows, hooks } = fakePayload([pending()]);
  hooks.onLock = (key) => { if (key.startsWith("key-signer:")) throw new Error("lock timeout"); };
  let prepares = 0;
  await dispatchKeyGrants({ payload, adapter: adapter(async () => { prepares++; return { kind: "submitted" }; }) });
  const [intent] = rows["commerce-key-grant-intents"];
  assert.equal(prepares, 0);
  assert.deepEqual([intent.state, intent.lastErrorCode], ["failed_retryable", "signer_lock_unavailable"]);
});

test("reconcile checks every recorded hash, and whichever mined settles the intent", async () => {
  const [first, second, third] = ["d", "e", "f"].map((fill) => `0x${fill.repeat(64)}`);
  const sends = [first, second, third].map((txHash) => ({ txHash, ...fee, sentAt: new Date(0).toISOString() }));
  for (const [mined, outcome, state] of [[second, { kind: "confirmed", tokenID: "8" }, "granted"], [first, { kind: "definitelyReverted", code: "tx_reverted" }, "failed_retryable"]] as const) {
    const { payload, rows } = fakePayload([pending({ state: "submitted", txHash: first, attemptID: "x", signer, nonce: 3, sends })]);
    const asked: string[] = [];
    await reconcileKeyGrants({ payload, adapter: adapter(async () => ({ kind: "unknown" }), async ({ txHash }) => { asked.push(txHash); return txHash === mined ? outcome : { kind: "unknown" }; }) });
    const [intent] = rows["commerce-key-grant-intents"];
    assert.deepEqual([...asked].sort(), [first, second, third].sort(), "every recorded hash is checked");
    assert.equal(intent.state, state);
    assert.equal(intent.settledTxHash, mined);
    if (state === "granted") assert.equal(intent.tokenID, "8");
  }
});

test("dispatch holds new grants while the signer has a nonce stopped for a person", async () => {
  const other = `eip155:84532:0x${"2".repeat(40)}`;
  for (const code of ["replacement_exhausted", "replacement_fee_ceiling", "replacement_write_ahead_failed", "replacement_rebroadcast_failed"]) {
    const dead = pending({ id: "dead", operationKey: "dead", state: "ambiguous", signer, nonce: 4, txHash: `0x${"d".repeat(64)}`, lastErrorCode: code });
    const { payload, rows } = fakePayload([dead, pending()]);
    const a = adapter(async () => ({ kind: "submitted" }));
    assert.equal(await dispatchKeyGrants({ payload, adapter: a }), 0, code);
    assert.deepEqual(a.floors, [], `${code}: nothing is signed behind the stopped nonce`);
    assert.equal(rows["commerce-key-grant-intents"].find((row) => row.id === "k")!.state, "pending");
    // Another signer is not held, and the hold lifts once the stopped nonce settles.
    assert.equal(await dispatchKeyGrants({ payload, adapter: { ...adapter(async () => ({ kind: "submitted" })), signer: other } }), 1);
  }
  const cancelDead = pending({ id: "dead", operationKey: "dead", state: "granted", tokenID: "1", cancelSigner: signer, cancelNonce: 2, cancelTxHash: `0x${"d".repeat(64)}`, lastErrorCode: "cancel_replacement_exhausted" });
  const { payload } = fakePayload([cancelDead, pending()]);
  assert.equal(await dispatchKeyGrants({ payload, adapter: adapter(async () => ({ kind: "submitted" })) }), 0, "a stopped cancel nonce holds the same signer too");
  const settled = fakePayload([pending({ id: "dead", operationKey: "dead", state: "granted", tokenID: "1", signer, nonce: 4, txHash: `0x${"d".repeat(64)}`, lastErrorCode: "replacement_exhausted" }), pending()]);
  assert.equal(await dispatchKeyGrants({ payload: settled.payload, adapter: adapter(async () => ({ kind: "submitted" })) }), 1, "a stopped nonce that later settled no longer holds");
});

test("a hold placed during first preparation prevents write-ahead and broadcast", async () => {
  const { payload, rows } = fakePayload([pending()]);
  const adapterUnderHold = adapter(async () => {
    rows.transactions[0].commerceReviewHold = true;
    return { kind: "submitted" };
  });
  await dispatchKeyGrants({ payload, adapter: adapterUnderHold });
  const [intent] = rows["commerce-key-grant-intents"];
  assert.equal(adapterUnderHold.floors.length, 1);
  assert.deepEqual(adapterUnderHold.released, [hash]);
  assert.deepEqual(adapterUnderHold.broadcasts, []);
  assert.equal(intent.txHash, undefined);
  assert.equal(intent.lastErrorCode, "grant_held");
});

test("post-write-ahead suppression keeps hash evidence without raw bytes and immediately parks only that signer", async () => {
  const second = pending({ id: "next", operationKey: "next", entitlement: "second", createdAt: "2026-11-22" });
  const { payload, rows, hooks } = fakePayload([pending({ createdAt: "2026-11-21" }), second], [
    { id: "adm", status: "available" }, { id: "second", status: "available" },
  ]);
  const [intent, next] = rows["commerce-key-grant-intents"];
  const now = () => new Date("2026-11-23");
  hooks.onLock = key => {
    if (key === "admission:adm" && intent.txHash) rows["commerce-admissions"][0].returnAcceptedAt = "2026-11-21";
  };
  const a = adapter(async () => ({ kind: "submitted" }));
  await dispatchKeyGrants({ payload, adapter: a, now });
  assert.deepEqual(a.released, [hash]);
  assert.deepEqual(a.broadcasts, []);
  assert.deepEqual(a.floors, [0], "the same pass must not allocate nonce 1");
  assert.equal(intent.txHash, hash);
  assert.equal(intent.nonce, 0);
  assert.equal(intent.signer, signer);
  assert.equal(intent.lastErrorCode, "grant_broadcast_suppressed");
  assert.deepEqual(intent.sends, [{ txHash: hash, ...fee, sentAt: now().toISOString(), accepted: false }]);
  assert.equal(next.state, "pending");
  let recoveryCalls = 0;
  const recovery = { ...a, reconcile: async () => { recoveryCalls++; return { kind: "unknown" as const }; },
    rebroadcast: async () => { recoveryCalls++; return { kind: "unknown" as const }; },
    prepareReplacement: async () => { recoveryCalls++; return { kind: "definitelyNotSent" as const, code: "unexpected" }; } };
  const later = () => new Date("2026-11-24");
  await reconcileKeyGrants({ payload, adapter: recovery, now: later });
  assert.equal(await replaceStuckKeyGrants({ payload, adapter: recovery, now: later }), 0);
  assert.equal(await dispatchKeyGrants({ payload, adapter: recovery, now: later }), 0);
  assert.equal(recoveryCalls, 0, "don't reconcile or replace a proven suppressed first send");
  assert.equal(next.state, "pending");
  const b = adapter(async () => ({ kind: "submitted", txHash: `0x${"b".repeat(64)}` }));
  assert.equal(await dispatchKeyGrants({ payload, adapter: { ...b, signer: `eip155:84532:0x${"2".repeat(40)}` }, now: later }), 1);
  assert.deepEqual(b.floors, [0], "a different signer makes progress");
});

test("an attempted but ambiguous broadcast retains recovery bytes, and cannot be labelled suppressed", async () => {
  const { payload, rows } = fakePayload([pending()]);
  const [intent] = rows["commerce-key-grant-intents"];
  const a = adapter(async () => ({ kind: "unknown" }), async () => ({ kind: "confirmed", tokenID: "7" }));
  await dispatchKeyGrants({ payload, adapter: a });
  assert.deepEqual(a.broadcasts, [hash]);
  assert.equal(intent.state, "ambiguous");
  assert.equal(intent.lastErrorCode, "outcome_unknown");
  assert.equal((intent.sends as { raw?: string }[])[0].raw, raw);
  assert.equal(await reconcileKeyGrants({ payload, adapter: a }), 1);
  assert.equal(intent.tokenID, "7");
});

test("a competing pass checks for a parked nonce again after acquiring the signer lock", async () => {
  const otherHash = `0x${"e".repeat(64)}`;
  const { payload, rows, hooks } = fakePayload([pending(), pending({
    id: "prior", operationKey: "prior", state: "submitted", signer, nonce: 0, txHash: otherHash,
    sends: [{ txHash: otherHash, ...fee, sentAt: new Date(0).toISOString(), accepted: true }],
  })]);
  const [next, prior] = rows["commerce-key-grant-intents"];
  let entered = false;
  hooks.onLock = key => {
    if (key !== `key-signer:${signer}`) return;
    // Model another pass publishing its fence just before this pass takes ownership.
    entered = true;
    prior.sends = [{ txHash: otherHash, ...fee, sentAt: new Date(0).toISOString(), accepted: false }];
    prior.lastErrorCode = "grant_broadcast_suppressed";
  };
  const a = adapter(async () => ({ kind: "submitted" }));
  await dispatchKeyGrants({ payload, adapter: a });
  assert.equal(entered, true, "the contender reached the signer lock");
  assert.deepEqual(a.floors, [], "no higher nonce was handed to prepare");
  assert.equal(next.lastErrorCode, "signer_held");
  assert.equal(next.txHash, undefined);
});

test("a timeout followed by a hold parks the unresolved nonce before a competing grant can sign", async () => {
  const next = pending({ id: "next", operationKey: "next", entitlement: "other", createdAt: "2026-11-22" });
  const { payload, rows } = fakePayload([pending({ createdAt: "2026-11-21" }), next], [
    { id: "adm", status: "available" }, { id: "other", status: "available" },
  ]);
  const at = Date.UTC(2026, 10, 23);
  const now = () => new Date(at);
  const [initial, competing] = rows["commerce-key-grant-intents"];
  // The adapter's timeout result is unknown even when the request never arrived.
  const a = adapter(async () => ({ kind: "unknown" }));
  assert.equal(await dispatchKeyGrants({ payload, adapter: a, now, limit: 1 }), 1);
  assert.deepEqual([initial.state, initial.lastErrorCode, initial.nonce], ["ambiguous", "outcome_unknown", 0]);
  rows["commerce-admissions"][0].benefitReview = true;

  assert.equal(await dispatchKeyGrants({ payload, adapter: a, now }), 0, "block even before the recovery pass is due");
  assert.deepEqual(a.floors, [0], "do not allocate a higher nonce");
  const later = () => new Date(at + 60 * 60_000);
  let resends = 0;
  const recovery = { ...a, rebroadcast: async () => { resends++; return { kind: "accepted" as const }; } };
  assert.equal(await replaceStuckKeyGrants({ payload, adapter: recovery, now: later }), 0);
  assert.equal(resends, 0, "a held grant must not be re-sent");
  assert.equal(initial.lastErrorCode, "grant_recovery_held");
  assert.equal(initial.txHash, hash);
  assert.equal((initial.sends as { raw: string }[])[0].raw, raw);
  await reconcileKeyGrants({ payload, adapter: recovery, now: later });
  assert.equal(initial.lastErrorCode, "grant_recovery_held", "an unknown receipt cannot clear the park");
  assert.equal(await dispatchKeyGrants({ payload, adapter: recovery, now: later }), 0);
  assert.equal(competing.state, "pending");

  const b = adapter(async () => ({ kind: "submitted", txHash: `0x${"e".repeat(64)}` }));
  assert.equal(await dispatchKeyGrants({ payload, adapter: { ...b, signer: `eip155:84532:0x${"2".repeat(40)}` }, now: later }), 1);
  assert.deepEqual(b.floors, [0], "the park applies only to the affected signer");
});

test("an unresolved send without a hold can recover at the same nonce before normal dispatch resumes", async () => {
  const next = pending({ id: "next", operationKey: "next", entitlement: "other", createdAt: "2026-11-22" });
  const { payload, rows } = fakePayload([pending({ createdAt: "2026-11-21" }), next], [
    { id: "adm", status: "available" }, { id: "other", status: "available" },
  ]);
  const now = () => new Date("2026-11-23");
  const later = () => new Date("2026-11-24");
  const a = adapter(async () => ({ kind: "unknown" }));
  await dispatchKeyGrants({ payload, adapter: a, now, limit: 1 });
  assert.equal(await dispatchKeyGrants({ payload, adapter: a, now }), 0);
  const resent: string[] = [];
  await replaceStuckKeyGrants({ payload, adapter: { ...a, rebroadcast: async ({ raw }) => {
    resent.push(raw);
    return { kind: "accepted" };
  } }, now: later });
  assert.deepEqual(resent, [raw], "recovery sends only the already-recorded bytes");
  const [initial, competing] = rows["commerce-key-grant-intents"];
  assert.equal(initial.txHash, hash);
  assert.equal((initial.sends as { accepted: boolean }[])[0].accepted, true);
  const b = adapter(async () => ({ kind: "submitted", txHash: `0x${"e".repeat(64)}` }));
  assert.equal(await dispatchKeyGrants({ payload, adapter: b, now: later }), 1);
  assert.deepEqual(b.floors, [1]);
  assert.equal(competing.state, "submitted");
});

test("the same final shared event token cannot bind to a second entitlement", async () => {
  const shared = { ...target, ticketTier: "guest", ticketMode: "shared" };
  const { payload, rows } = fakePayload([
    pending({ state: "submitted", attemptID: "a", txHash: hash, target: shared }),
    pending({ id: "k2", operationKey: "unlock-grant:v1:order:2", entitlement: "adm2", state: "submitted", attemptID: "b", txHash: hash, target: shared }),
  ]);
  const a = adapter(async () => ({ kind: "unknown" }), async () => ({ kind: "confirmed", tokenID: "7" }));
  assert.equal(await reconcileKeyGrants({ payload, adapter: a }), 1);
  const [first, second] = rows["commerce-key-grant-intents"];
  assert.equal(first.ticketTokenKey, `84532:${target.lock}:7`);
  assert.equal(second.state, "ambiguous");
  assert.equal(second.lastErrorCode, "ticket_token_conflict");
  assert.equal(second.ticketTokenKey, undefined);
});
