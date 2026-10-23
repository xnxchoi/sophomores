import assert from "node:assert/strict";
import { test } from "node:test";
import { createVerificationClient, createTrialSession } from "../lib/phone-verification/client";

const challenge = {
  id: "challenge-1", recipient: "verify@sophomores.co", body: "SPHMRS ABCDEF123456",
  expiresAt: "2026-10-23T12:00:00.000Z", mode: "trial" as const
};
const response = (data: unknown, status = 200) => new Response(JSON.stringify({ success: true, data }), { status });
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("client uses only same-origin no-store endpoints and validates challenge envelopes", async () => {
  const requests: { url: string; init?: RequestInit }[] = [];
  const client = createVerificationClient(async (url, init) => {
    requests.push({ url: String(url), init });
    return response(challenge);
  });
  const abort = new AbortController();
  assert.deepEqual(await client.create("+821012345678", abort.signal), challenge);
  assert.equal(requests[0].url, "/api/phone-verification/challenges");
  assert.equal(requests[0].init?.method, "POST");
  assert.equal(requests[0].init?.credentials, "same-origin");
  assert.equal(requests[0].init?.cache, "no-store");
  assert.equal(requests[0].init?.signal, abort.signal);
  assert.equal(requests[0].init?.body, JSON.stringify({ phone: "+821012345678" }));
});

test("client rejects malformed responses, live modes, invalid ids, dates and unsafe recipient/body values", async () => {
  for (const data of [null, { ...challenge, mode: "live" }, { ...challenge, id: "../other" },
    { ...challenge, expiresAt: "tomorrow" }, { ...challenge, recipient: "sms:attacker" },
    { ...challenge, body: "unsafe\u0000body" }]) {
    await assert.rejects(createVerificationClient(async () => response(data)).create("+821012345678"));
  }
  await assert.rejects(createVerificationClient(async () => new Response("not json")).create("+821012345678"));
  await assert.rejects(createVerificationClient(async () => new Response(JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "private detail" } }), { status: 429 })).create("+821012345678"), { code: "RATE_LIMITED" });
});

test("status is challenge-bound, accepts consumed, and excludes unsolicited proof tokens", async () => {
  const client = createVerificationClient(async () => response({ ...challenge, state: "consumed", proofToken: "must-not-reach-ui" }));
  assert.deepEqual(await client.status(challenge.id), { id: challenge.id, state: "consumed", expiresAt: challenge.expiresAt, mode: "trial" });
  await assert.rejects(client.status("other-id"));
  await assert.rejects(client.status("../bad"));
});

test("cancellation is a same-origin DELETE with keepalive cleanup and accepts empty success", async () => {
  let init: RequestInit | undefined;
  const client = createVerificationClient(async (_url, next) => { init = next; return new Response(null, { status: 204 }); });
  await client.cancel(challenge.id, true);
  assert.equal(init?.method, "DELETE");
  assert.equal(init?.keepalive, true);
  assert.equal(init?.credentials, "same-origin");
});

test("session prevents duplicate creation and cancels a late create after dismissal", async () => {
  let resolve!: (value: typeof challenge) => void;
  let creates = 0;
  const cancelled: string[] = [];
  const snapshots: unknown[] = [];
  const session = createTrialSession({
    create: () => { creates += 1; return new Promise((done) => { resolve = done; }); },
    status: async () => ({ id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" }),
    cancel: async (id) => { cancelled.push(id); }
  }, (snapshot) => snapshots.push(snapshot));
  void session.start("+821012345678");
  void session.start("+821012345678");
  assert.equal(creates, 1);
  session.dispose();
  const length = snapshots.length;
  resolve(challenge);
  await tick();
  assert.deepEqual(cancelled, [challenge.id]);
  assert.equal(snapshots.length, length, "dismissal must not restore a challenge or update React");
});

test("polls every two seconds without overlapping, aborts on close and stops terminal states", async () => {
  const queued: (() => void)[] = [];
  let resolveStatus!: (value: { id: string; state: "verified"; expiresAt: string; mode: "trial" }) => void;
  let signal: AbortSignal | undefined;
  let polls = 0;
  let latest: ReturnType<ReturnType<typeof createTrialSession>["snapshot"]> | undefined;
  const client = {
    create: async () => challenge,
    status: (_id: string, next?: AbortSignal) => { polls += 1; signal = next; return new Promise<{ id: string; state: "verified"; expiresAt: string; mode: "trial" }>((done) => { resolveStatus = done; }); },
    cancel: async () => {}
  };
  const scheduler = { set: (callback: () => void, delay: number) => { assert.equal(delay, 2000); queued.push(callback); return queued.length; }, clear: () => {} };
  const session = createTrialSession(client, (value) => { latest = value; }, scheduler);
  await session.start("+821012345678");
  assert.equal(queued.length, 1);
  queued.shift()?.();
  void session.refresh();
  assert.equal(polls, 1);
  resolveStatus({ id: challenge.id, state: "verified", expiresAt: challenge.expiresAt, mode: "trial" });
  await tick();
  assert.equal(latest?.status?.state, "verified");
  assert.equal(queued.length, 0);
  session.dispose();
  assert.equal(signal?.aborted, false, "completed calls do not need aborting");
  const other = createTrialSession(client, () => {}, scheduler);
  await other.start("+821012345678");
  void other.refresh();
  other.dispose();
  assert.equal(signal?.aborted, true);
});

test("status failures pause polling and surface retryable state instead of claiming verification", async () => {
  let state: ReturnType<ReturnType<typeof createTrialSession>["snapshot"]> | undefined;
  const session = createTrialSession({ create: async () => challenge, status: async () => { throw new Error("offline"); }, cancel: async () => {} }, (next) => { state = next; });
  await session.start("+821012345678");
  await session.refresh();
  assert.equal(state?.error, "status");
  assert.equal(state?.status?.state, "pending");
  assert.equal(state?.busy, false);
  session.dispose();
});

test("a create failure is retryable and reset does not discard a challenge before confirmed cancellation", async () => {
  let creates = 0;
  let cancellations = 0;
  const session = createTrialSession({
    create: async () => { if (++creates === 1) throw new Error("offline"); return challenge; },
    status: async () => ({ id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" }),
    cancel: async () => { if (++cancellations === 1) throw new Error("offline"); }
  }, () => {});
  await session.start("+821012345678");
  assert.equal(session.snapshot().error, "create");
  await session.start("+821012345678");
  assert.equal(session.snapshot().challenge?.id, challenge.id);
  await session.reset();
  assert.equal(session.snapshot().error, "cancel");
  assert.equal(session.snapshot().challenge?.id, challenge.id);
  await session.reset();
  assert.deepEqual(session.snapshot(), { challenge: null, status: null, busy: false, error: null });
  await session.reset();
  session.dispose();
  await session.start("+821012345678");
  assert.equal(creates, 2);
});

test("local expiry wins over an in-flight status response and cleanup failure cannot resurrect the view", async () => {
  let resolve!: (value: { id: string; state: "verified"; expiresAt: string; mode: "trial" }) => void;
  let abort: AbortSignal | undefined;
  const session = createTrialSession({
    create: async () => challenge,
    status: (_id, signal) => { abort = signal; return new Promise((done) => { resolve = done; }); },
    cancel: async () => { throw new Error("offline"); }
  }, () => {});
  await session.start("+821012345678");
  void session.refresh();
  session.expire();
  assert.equal(abort?.aborted, true);
  resolve({ id: challenge.id, state: "verified", expiresAt: challenge.expiresAt, mode: "trial" });
  await tick();
  assert.equal(session.snapshot().status?.state, "expired");
  assert.equal(session.snapshot().error, null);
  session.expire();
  session.dispose();
  await tick();
  assert.equal(session.snapshot().status?.state, "expired");
});
