import assert from "node:assert/strict";
import { test } from "node:test";
import { createVerificationClient, createTrialSession as createTimedTrialSession } from "@/lib/phone-verification/client";

// Existing transport/lifecycle tests need no wall-clock presentation delay.
const createTrialSession: typeof createTimedTrialSession = (client, change, scheduler, timing) =>
  createTimedTrialSession(client, change, scheduler, timing ?? { now: () => 0, delay: async () => {} });

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

test("background checks never toggle visible busy state while manual checks still do", async () => {
  const queued: (() => void)[] = [];
  const snapshots: { busy: boolean }[] = [];
  let resolve!: (value: { id: string; state: "pending"; expiresAt: string; mode: "trial" }) => void;
  const session = createTrialSession({
    create: async () => challenge,
    status: () => new Promise((done) => { resolve = done; }),
    cancel: async () => {}
  }, (next) => snapshots.push(next), {
    set: (callback) => { queued.push(callback); return callback; },
    clear: () => {}
  });
  await session.start("+821012345678");
  snapshots.length = 0;
  queued.shift()?.();
  assert.equal(session.snapshot().busy, false, "automatic polling must not flash the status button");
  resolve({ id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" });
  await tick();
  assert.ok(snapshots.every((snapshot) => !snapshot.busy));
  assert.equal(session.snapshot().status?.state, "pending");
  const manual = session.refresh();
  assert.equal(session.snapshot().busy, true, "explicit user checks retain a bounded pending indication");
  resolve({ id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" });
  await manual;
  assert.equal(session.snapshot().busy, false);
  session.dispose();
});

test("reset aborts a background check and its late result cannot overwrite a new challenge", async () => {
  const queued: (() => void)[] = [];
  let resolve!: (value: { id: string; state: "verified"; expiresAt: string; mode: "trial" }) => void;
  let signal: AbortSignal | undefined;
  let creates = 0;
  let cancellations = 0;
  const session = createTrialSession({
    create: async () => ({ ...challenge, id: `challenge-${++creates}` }),
    status: (_id, next) => { signal = next; return new Promise((done) => { resolve = done; }); },
    cancel: async () => { cancellations++; }
  }, () => {}, { set: (callback) => { queued.push(callback); return callback; }, clear: () => {} });
  await session.start("+821012345678");
  queued.shift()?.();
  await session.reset();
  assert.equal(signal?.aborted, true);
  assert.equal(cancellations, 1);
  assert.equal(session.snapshot().challenge, null);
  await session.start("+821012345678");
  resolve({ id: "challenge-1", state: "verified", expiresAt: challenge.expiresAt, mode: "trial" });
  await tick();
  assert.equal(session.snapshot().challenge?.id, "challenge-2");
  assert.equal(session.snapshot().status?.id, "challenge-2");
  assert.equal(session.snapshot().status?.state, "pending");
  assert.equal(session.snapshot().error, null);
  session.dispose();
});

test("a rejected background check cannot publish an error after reset", async () => {
  const queued: (() => void)[] = [];
  let reject!: (error: Error) => void;
  const session = createTrialSession({
    create: async () => challenge,
    status: () => new Promise((_done, failed) => { reject = failed; }),
    cancel: async () => {}
  }, () => {}, { set: (callback) => { queued.push(callback); return callback; }, clear: () => {} });
  await session.start("+821012345678");
  queued.shift()?.();
  await session.reset();
  reject(new Error("late abort"));
  await tick();
  assert.deepEqual(session.snapshot(), { challenge: null, status: null, busy: false, error: null });
  session.dispose();
});

test("background expiry and disposal suppress late success without duplicate status requests", async () => {
  for (const terminal of ["expiry", "disposal"] as const) {
    const queued: (() => void)[] = [];
    const snapshots: unknown[] = [];
    let resolve!: (value: { id: string; state: "verified"; expiresAt: string; mode: "trial" }) => void;
    let signal: AbortSignal | undefined;
    let polls = 0;
    const session = createTrialSession({
      create: async () => challenge,
      status: (_id, next) => { polls++; signal = next; return new Promise((done) => { resolve = done; }); },
      cancel: async () => {}
    }, (next) => snapshots.push(next), { set: (callback) => { queued.push(callback); return callback; }, clear: () => {} });
    await session.start("+821012345678");
    queued.shift()?.();
    void session.refresh();
    assert.equal(polls, 1);
    if (terminal === "expiry") session.expire();
    else session.dispose();
    assert.equal(signal?.aborted, true);
    const length = snapshots.length;
    resolve({ id: challenge.id, state: "verified", expiresAt: challenge.expiresAt, mode: "trial" });
    await tick();
    assert.equal(snapshots.length, length);
    assert.equal(session.snapshot().status?.state, terminal === "expiry" ? "expired" : "pending");
    assert.equal(session.snapshot().error, null);
    session.dispose();
  }
});

test("background timeout pauses polling with a retryable error, never verification", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const queued: (() => void)[] = [];
  let signal: AbortSignal | undefined;
  const session = createTrialSession({
    create: async () => challenge,
    status: (_id, next) => {
      signal = next;
      return new Promise((_done, reject) => next?.addEventListener("abort", () => reject(new Error("timeout")), { once: true }));
    },
    cancel: async () => {}
  }, () => {}, { set: (callback) => { queued.push(callback); return callback; }, clear: () => {} });
  await session.start("+821012345678");
  queued.shift()?.();
  assert.equal(session.snapshot().busy, false);
  context.mock.timers.tick(10_000);
  await tick();
  assert.equal(signal?.aborted, true);
  assert.equal(session.snapshot().status?.state, "pending");
  assert.equal(session.snapshot().busy, false);
  assert.equal(session.snapshot().error, "status");
  assert.equal(queued.length, 0);
  session.dispose();
});

function foregroundClock() {
  let now = 0;
  let waits: { deadline: number; resolve: () => void }[] = [];
  const durations: number[] = [];
  return {
    durations,
    timing: {
      now: () => now,
      delay: (ms: number, signal: AbortSignal) => {
        durations.push(ms);
        return new Promise<void>((resolve, reject) => {
          const abort = () => reject(new Error("cancelled presentation"));
          signal.addEventListener("abort", abort, { once: true });
          waits = [...waits, { deadline: now + ms, resolve: () => {
            signal.removeEventListener("abort", abort);
            resolve();
          } }];
        });
      }
    },
    advance: (ms: number) => {
      now += ms;
      const ready = waits.filter((wait) => wait.deadline <= now);
      waits = waits.filter((wait) => wait.deadline > now);
      for (const wait of ready) wait.resolve();
    }
  };
}

test("manual checking remains perceptible before fast pending, success and failure outcomes", async () => {
  for (const outcome of ["pending", "verified", "failure"] as const) {
    const clock = foregroundClock();
    const session = createTrialSession({
      create: async () => challenge,
      status: async () => {
        if (outcome === "failure") throw new Error("offline");
        return { id: challenge.id, state: outcome, expiresAt: challenge.expiresAt, mode: "trial" };
      },
      cancel: async () => {}
    }, () => {}, { set: () => 1, clear: () => {} }, clock.timing);
    await session.start("+821012345678");
    const checked = session.refresh();
    assert.equal(session.snapshot().busy, true);
    await tick();
    assert.deepEqual(clock.durations, [600]);
    assert.equal(session.snapshot().busy, true);
    assert.equal(session.snapshot().status?.state, "pending");
    assert.equal(session.snapshot().error, null);
    clock.advance(599);
    await tick();
    assert.equal(session.snapshot().busy, true);
    clock.advance(1);
    await checked;
    assert.equal(session.snapshot().busy, false);
    assert.equal(session.snapshot().status?.state, outcome === "verified" ? "verified" : "pending");
    assert.equal(session.snapshot().error, outcome === "failure" ? "status" : null);
    session.dispose();
  }
});

test("a manual click promotes and joins the in-flight background check without a duplicate GET", async () => {
  const clock = foregroundClock();
  const queued: (() => void)[] = [];
  let polls = 0;
  let resolve!: (value: { id: string; state: "pending"; expiresAt: string; mode: "trial" }) => void;
  const session = createTrialSession({
    create: async () => challenge,
    status: () => { polls++; return new Promise((done) => { resolve = done; }); },
    cancel: async () => {}
  }, () => {}, { set: (callback) => { queued.push(callback); return callback; }, clear: () => {} }, clock.timing);
  await session.start("+821012345678");
  queued.shift()?.();
  assert.equal(session.snapshot().busy, false);
  clock.advance(250);
  const manual = session.refresh();
  const duplicate = session.refresh();
  assert.equal(polls, 1);
  assert.equal(session.snapshot().busy, true, "a click must visibly acknowledge joining the existing check");
  clock.advance(100);
  resolve({ id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" });
  await tick();
  assert.deepEqual(clock.durations, [500]);
  clock.advance(499);
  await tick();
  assert.equal(session.snapshot().busy, true);
  clock.advance(1);
  await Promise.all([manual, duplicate]);
  assert.equal(session.snapshot().busy, false);
  assert.equal(session.snapshot().error, null);
  assert.equal(polls, 1);
  session.dispose();
});

test("manual checks stay busy for the actual request if it exceeds the presentation minimum", async () => {
  const clock = foregroundClock();
  let resolve!: (value: { id: string; state: "verified"; expiresAt: string; mode: "trial" }) => void;
  const session = createTrialSession({
    create: async () => challenge,
    status: () => new Promise((done) => { resolve = done; }),
    cancel: async () => {}
  }, () => {}, { set: () => 1, clear: () => {} }, clock.timing);
  await session.start("+821012345678");
  const checked = session.refresh();
  clock.advance(900);
  await tick();
  assert.equal(session.snapshot().busy, true);
  assert.equal(session.snapshot().status?.state, "pending");
  resolve({ id: challenge.id, state: "verified", expiresAt: challenge.expiresAt, mode: "trial" });
  await checked;
  assert.equal(session.snapshot().busy, false);
  assert.equal(session.snapshot().status?.state, "verified");
  assert.deepEqual(clock.durations, []);
  session.dispose();
});

test("reset, expiry and disposal fence a status result waiting for its foreground hold", async () => {
  for (const terminal of ["reset", "expiry", "disposal"] as const) {
    const clock = foregroundClock();
    const snapshots: unknown[] = [];
    let signal: AbortSignal | undefined;
    const session = createTrialSession({
      create: async () => challenge,
      status: async (_id, next) => {
        signal = next;
        return { id: challenge.id, state: "verified", expiresAt: challenge.expiresAt, mode: "trial" };
      },
      cancel: async () => {}
    }, (next) => snapshots.push(next), { set: () => 1, clear: () => {} }, clock.timing);
    await session.start("+821012345678");
    const checked = session.refresh();
    await tick();
    assert.equal(session.snapshot().busy, true);
    assert.deepEqual(clock.durations, [600]);
    if (terminal === "reset") await session.reset();
    else if (terminal === "expiry") session.expire();
    else session.dispose();
    assert.equal(signal?.aborted, true);
    const length = snapshots.length;
    clock.advance(600);
    await checked;
    assert.equal(snapshots.length, length);
    assert.equal(session.snapshot().status?.state, terminal === "reset" ? undefined : terminal === "expiry" ? "expired" : "pending");
    assert.equal(session.snapshot().error, null);
    session.dispose();
  }
});

test("the default foreground delay keeps real timer semantics and aborts on expiry", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout", "Date"], now: 1000 });
  const session = createTimedTrialSession({
    create: async () => challenge,
    status: async () => ({ id: challenge.id, state: "pending", expiresAt: challenge.expiresAt, mode: "trial" }),
    cancel: async () => {}
  }, () => {}, { set: () => 1, clear: () => {} });
  await session.start("+821012345678");
  const checked = session.refresh();
  await tick();
  context.mock.timers.tick(599);
  await tick();
  assert.equal(session.snapshot().busy, true);
  context.mock.timers.tick(1);
  await checked;
  assert.equal(session.snapshot().busy, false);
  assert.equal(session.snapshot().status?.state, "pending");
  const cancelled = session.refresh();
  await tick();
  assert.equal(session.snapshot().busy, true);
  session.expire();
  await cancelled;
  assert.equal(session.snapshot().status?.state, "expired");
  assert.equal(session.snapshot().error, null);
  session.dispose();
});

test("manual promotion still holds a background timeout error before publishing it", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const clock = foregroundClock();
  const queued: (() => void)[] = [];
  const session = createTrialSession({
    create: async () => challenge,
    status: (_id, signal) => new Promise((_done, reject) =>
      signal?.addEventListener("abort", () => reject(new Error("timeout")), { once: true })),
    cancel: async () => {}
  }, () => {}, { set: (callback) => { queued.push(callback); return callback; }, clear: () => {} }, clock.timing);
  await session.start("+821012345678");
  queued.shift()?.();
  clock.advance(10_000);
  context.mock.timers.tick(10_000);
  const manual = session.refresh();
  await tick();
  assert.equal(session.snapshot().busy, true);
  assert.equal(session.snapshot().error, null);
  assert.deepEqual(clock.durations, [600]);
  clock.advance(600);
  await manual;
  assert.equal(session.snapshot().busy, false);
  assert.equal(session.snapshot().error, "status");
  assert.equal(session.snapshot().status?.state, "pending");
  session.dispose();
});
