import assert from "node:assert/strict";
import { test } from "node:test";
import type { KeyGrantAdapter } from "@/lib/commerce/keys/contracts";
import { dispatchKeyGrants, reconcileKeyGrants } from "@/lib/commerce/keys/worker";
import { fakePayload, type Row } from "./support/fake-payload";

const target = { chainID: 84532, lock: `0x${"a".repeat(40)}`, recipient: `0x${"b".repeat(40)}` };
const hash = `0x${"c".repeat(64)}`;

const pending = (extra: Row | Record<string, unknown> = {}): Row => ({ id: "k", operationKey: "unlock-grant:v1:order:1", entitlement: "adm", state: "pending", attempts: 0, target, ...extra });
type Sent = { kind: "submitted" | "unknown"; txHash?: string } | { kind: "definitelyNotSent"; code: string };
/**
 * Test adapter: `send` decides one dispatch. A not-sent answer comes from
 * `prepare`; otherwise the grant is prepared under `txHash` (default `hash`) and
 * `broadcast` answers `submitted`/`unknown`, or throws when `send` threw.
 */
const adapter = (send: () => Promise<Sent>, reconcile: KeyGrantAdapter["reconcile"] = async () => ({ kind: "unknown" })) => {
  const answers = new Map<string, "submitted" | "unknown" | Error>();
  const released: string[] = [];
  const broadcasts: string[] = [];
  const a: KeyGrantAdapter & { released: string[]; broadcasts: string[] } = {
    released, broadcasts, reconcile,
    async prepare() {
      let sent: Sent;
      try { sent = await send(); } catch (error) { answers.set(hash, error as Error); return { kind: "prepared", txHash: hash }; }
      if (sent.kind === "definitelyNotSent") return sent;
      answers.set(sent.txHash ?? hash, sent.kind);
      return { kind: "prepared", txHash: sent.txHash ?? hash };
    },
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
  await assert.rejects(dispatchKeyGrants({ payload, adapter: a }));
  assert.deepEqual(seen, [hash, "submitted"], "the hash was on the intent before broadcast");
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
