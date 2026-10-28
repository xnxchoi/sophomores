import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { createReceiverBudget, createReceiverBudgetClient, ReceiverBudgetPause,
  requestReceiverBudget, type ReceiverBudgetChannel } from "../../scripts/phone-receiver-budget";

test("the real process adapter refuses unsupervised use; default parent clock grants bounded work", async () => {
  await assert.rejects(requestReceiverBudget(new AbortController().signal), /Receiver budget unavailable/);
  assert.equal(createReceiverBudget().handle({ type: "receiver:budget", id: 1 })?.allowed, true);
});

test("supervisor budget counts all requests across worker restarts within a rolling hour", () => {
  let now = 0;
  const budget = createReceiverBudget(() => now);
  for (let id = 1; id <= 600; id++) {
    assert.equal(budget.handle({ type: "receiver:budget", id })?.allowed, true);
    if (id === 300) now = 1000;
  }
  assert.deepEqual(budget.handle({ type: "receiver:budget", id: 1 }), {
    type: "receiver:budget-result", id: 1, allowed: false, retryAfterMs: 3599000
  }, "a restarted child beginning at id1 does not reset accounting");
  now = 3600000;
  assert.equal(budget.handle({ type: "receiver:budget", id: 2 })?.allowed, true);
  now = Number.NaN;
  assert.equal(budget.handle({ type: "receiver:budget", id: 3 })?.allowed, false);
});

test("malformed IPC never consumes budget or exposes payloads; clock rollback is conservative", () => {
  let now = 1000;
  const budget = createReceiverBudget(() => now);
  for (const value of [null, [], "secret", { type: "other", id: 1 },
    { type: "receiver:budget", id: 0 }, { type: "receiver:budget", id: 1, url: "secret" },
    { type: "receiver:budget", id: Infinity }]) assert.equal(budget.handle(value), null);
  for (let id = 1; id <= 600; id++) assert.equal(budget.handle({ type: "receiver:budget", id })?.allowed, true);
  now = 0;
  assert.equal(budget.handle({ type: "receiver:budget", id: 601 })?.retryAfterMs, 3600000);
});

function channelFixture() {
  const events = new EventEmitter();
  let connected = true;
  const sent: { type: string; id: number }[] = [];
  const channel: ReceiverBudgetChannel = {
    isConnected: () => connected,
    send: (message, done) => { sent.push(message); done(null); },
    onMessage: (listener) => { events.on("message", listener); return () => { events.off("message", listener); }; },
    onDisconnect: (listener) => { events.on("disconnect", listener); return () => { events.off("disconnect", listener); }; }
  };
  return { channel, events, sent, disconnect: () => { connected = false; events.emit("disconnect"); } };
}

test("budget client requires a matching bounded grant and cleans IPC listeners", async () => {
  const f = channelFixture();
  const request = createReceiverBudgetClient(f.channel);
  const granted = request(new AbortController().signal);
  f.events.emit("message", { type: "receiver:budget-result", id: 99, allowed: true, retryAfterMs: 0 });
  assert.equal(f.events.listenerCount("message"), 1);
  f.events.emit("message", { type: "receiver:budget-result", id: f.sent[0].id, allowed: true, retryAfterMs: 0 });
  await granted;
  assert.equal(f.events.listenerCount("message"), 0);
  assert.equal(f.events.listenerCount("disconnect"), 0);
  const denied = request(new AbortController().signal);
  const rejection = assert.rejects(denied, (error: unknown) => error instanceof ReceiverBudgetPause && error.retryAfterMs === 123);
  f.events.emit("message", { type: "receiver:budget-result", id: f.sent[1].id, allowed: false, retryAfterMs: 123 });
  await rejection;
});

test("budget timeout, disconnection, cancellation and send errors fail closed without private text", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  for (const mode of ["timeout", "disconnect", "abort", "send", "throw"] as const) {
    const f = channelFixture();
    if (mode === "send") f.channel.send = (_message, done) => done(new Error("private payload"));
    if (mode === "throw") f.channel.send = () => { throw new Error("private payload"); };
    const controller = new AbortController();
    const pending = createReceiverBudgetClient(f.channel)(controller.signal);
    const rejected = assert.rejects(pending, (error: Error) => !error.message.includes("private"));
    if (mode === "timeout") context.mock.timers.tick(2000);
    if (mode === "disconnect") f.disconnect();
    if (mode === "abort") controller.abort();
    await rejected;
    assert.equal(f.events.listenerCount("message"), 0);
    assert.equal(f.events.listenerCount("disconnect"), 0);
  }
  const f = channelFixture();
  const request = createReceiverBudgetClient(f.channel);
  await assert.rejects(request(AbortSignal.abort()));
  assert.equal(f.sent.length, 0);
  f.disconnect();
  await assert.rejects(request(new AbortController().signal));
});

test("untrusted or unbounded budget replies cannot authorize provider requests", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const f = channelFixture();
  const pending = createReceiverBudgetClient(f.channel)(new AbortController().signal);
  const rejected = assert.rejects(pending);
  for (const value of [null, [], { type: "receiver:budget-result", id: f.sent[0].id, allowed: true, retryAfterMs: 100 },
    { type: "receiver:budget-result", id: f.sent[0].id, allowed: false, retryAfterMs: 3600001 }]) f.events.emit("message", value);
  context.mock.timers.tick(2000);
  await rejected;
});
