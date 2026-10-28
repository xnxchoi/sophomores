import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { test } from "node:test";
import {
  receiverProcessEnvironment, superviseMemberReceiver, runMemberPreviewChildren
} from "../../scripts/member-auth-receiver";

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
class FakeChild extends EventEmitter {
  pid: number | undefined = 123;
  connected = true;
  exitCode: number | null = null;
  signalCode: NodeJS.Signals | null = null;
  signals: NodeJS.Signals[] = [];
  replies: unknown[] = [];
  exitOnTerm = true;
  kill(signal: NodeJS.Signals = "SIGTERM") {
    this.signals.push(signal);
    if (signal === "SIGKILL" || this.exitOnTerm) queueMicrotask(() => this.exit(null, signal));
    return true;
  }
  send(reply: unknown, callback?: (error: Error | null) => void) {
    this.replies.push(reply); callback?.(null); return true;
  }
  exit(code: number | null, signal: NodeJS.Signals | null = null) {
    this.exitCode = code; this.signalCode = signal; this.connected = false;
    this.emit("exit", code, signal);
  }
  process() { return this as unknown as ChildProcess; }
}

test("receiver environment includes only local runtime settings, not member or inbox OAuth secrets", () => {
  const env = receiverProcessEnvironment({ PATH: "/bin", HOME: "/private/home", NODE_OPTIONS: "--inspect",
    NODE_ENV: "test", PHONE_VERIFICATION_MODE: "local", PHONE_VERIFICATION_TRANSPORT: "zoho-poll",
    PHONE_VERIFICATION_DATABASE_URL: "synthetic-local-db", PHONE_VERIFICATION_STATE_SECRET: "state",
    PHONE_VERIFICATION_ZOHO_ACCOUNT_ID: "123", PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY: "/private/health",
    PHONE_VERIFICATION_ZOHO_CLIENT_ID: "oauth-id", PHONE_VERIFICATION_ZOHO_CLIENT_SECRET: "oauth-secret",
    PHONE_VERIFICATION_ZOHO_REFRESH_TOKEN: "oauth-token", PHONE_VERIFICATION_TEST_DATABASE_URL: "do-not-use",
    MEMBER_AUTH_SECRET: "member", MEMBER_AUTH_GOOGLE_CLIENT_SECRET: "google", MEMBER_AUTH_SMTP_PASS: "smtp" });
  assert.equal(env.PHONE_VERIFICATION_DATABASE_URL, "synthetic-local-db");
  assert.equal(env.PHONE_VERIFICATION_ZOHO_ACCOUNT_ID, "123");
  assert.equal(env.PHONE_VERIFICATION_RECEIVER_HEALTH_DIRECTORY, "/private/health");
  assert.equal(env.PATH, "/bin");
  assert.equal(env.NODE_ENV, "test");
  assert.equal(receiverProcessEnvironment({}).NODE_ENV, "development");
  assert.equal(receiverProcessEnvironment({ NODE_ENV: "untrusted" }).NODE_ENV, "development");
  for (const key of ["NODE_OPTIONS", "MEMBER_AUTH_SECRET", "MEMBER_AUTH_GOOGLE_CLIENT_SECRET", "MEMBER_AUTH_SMTP_PASS",
    "PHONE_VERIFICATION_ZOHO_CLIENT_ID", "PHONE_VERIFICATION_ZOHO_CLIENT_SECRET", "PHONE_VERIFICATION_ZOHO_REFRESH_TOKEN",
    "PHONE_VERIFICATION_TEST_DATABASE_URL"]) assert.equal(env[key], undefined);
});

test("supervisor owns one IPC worker and shares one budget through three bounded restarts", async () => {
  const children: FakeChild[] = [], delays: number[] = [], calls: unknown[] = [], seen: unknown[] = [];
  const controller = new AbortController();
  const run = superviseMemberReceiver({ root: "/repo", env: { PHONE_VERIFICATION_MODE: "local" }, signal: controller.signal,
    spawn: (command, args, options: SpawnOptions) => {
      assert.ok(args.includes("--max-old-space-size=256"), "receiver heap must be bounded");
      calls.push({ command, args, options }); const child = new FakeChild(); children.push(child);
      queueMicrotask(() => child.emit("spawn")); return child.process();
    }, sleep: async (ms) => { delays.push(ms); }, log: () => {},
    budget: { handle: (message) => { seen.push(message); return { type: "receiver:budget-result", id: 1, allowed: true, retryAfterMs: 0 }; } } });
  await tick();
  children[0].emit("message", { type: "receiver:budget", id: 1 });
  assert.equal(children[0].replies.length, 1);
  for (let index = 0; index < 4; index++) { children[index].exit(1); await tick(); }
  await run;
  assert.deepEqual(delays, [1000, 5000, 15000]);
  assert.equal(children.length, 4);
  assert.equal(seen.length, 1);
  const first = calls[0] as { args: string[]; options: SpawnOptions };
  assert.deepEqual(first.args.slice(-2), ["/repo/scripts/phone-verification-receive.ts", "serve"]);
  assert.deepEqual(first.options.stdio, ["ignore", "inherit", "inherit", "ipc"]);
  assert.equal(first.options.cwd, "/repo");
  assert.equal(children.every(child => child.listenerCount("message") === 0 && child.listenerCount("exit") === 0), true);
});

test("permanent configuration/duplicate exit and failed spawn do not overlap workers", async () => {
  let count = 0;
  const child = new FakeChild();
  const permanent = superviseMemberReceiver({ root: "/repo", env: {}, signal: new AbortController().signal,
    spawn: () => { count++; queueMicrotask(() => child.exit(78)); return child.process(); }, log: () => {} });
  await permanent; assert.equal(count, 1);
  const delays: number[] = [];
  await superviseMemberReceiver({ root: "/repo", env: {}, signal: new AbortController().signal,
    spawn: () => { count++; throw new Error("private spawn detail"); },
    sleep: async (ms) => { delays.push(ms); }, log: (text) => assert.doesNotMatch(text, /private/) });
  assert.equal(count, 5); assert.deepEqual(delays, [1000, 5000, 15000]);
});

test("asynchronous spawn failure is bounded and emits no raw error", async () => {
  const errors: string[] = [];
  let count = 0;
  await superviseMemberReceiver({ root: "/repo", env: {}, signal: new AbortController().signal,
    spawn: () => { count++; const child = new FakeChild(); child.pid = undefined;
      queueMicrotask(() => child.emit("error", new Error("synthetic private credential"))); return child.process(); },
    sleep: async () => {}, log: text => errors.push(text) });
  assert.equal(count, 4); assert.ok(errors.length); assert.doesNotMatch(errors.join(" "), /synthetic|credential/);
});

test("preview abort terminates only its child and escalates an unresponsive owned worker", async () => {
  const controller = new AbortController(); const child = new FakeChild(); child.exitOnTerm = false;
  const run = superviseMemberReceiver({ root: "/repo", env: {}, signal: controller.signal, shutdownMs: 5,
    spawn: () => child.process(), log: () => {} });
  await tick(); controller.abort(); await run;
  assert.deepEqual(child.signals, ["SIGTERM", "SIGKILL"]);
  assert.equal(child.listenerCount("exit"), 0);
});

test("failed owned-child cleanup is fatal rather than starting an overlapping worker", async () => {
  let count = 0;
  const child = new FakeChild();
  child.kill = (signal: NodeJS.Signals = "SIGTERM") => { child.signals.push(signal); return false; };
  const run = superviseMemberReceiver({ root: "/repo", env: {}, signal: new AbortController().signal,
    shutdownMs: 1, spawn: () => { count++; return child.process(); }, sleep: async () => {}, log: () => {} });
  child.emit("error", new Error("synthetic child error after spawning"));
  await assert.rejects(run, /shutdown deadline|cleanup could not be confirmed/);
  assert.equal(count, 1);
});

test("abort during backoff cancels later workers and already-aborted supervision does nothing", async () => {
  const controller = new AbortController(); let count = 0;
  const child = new FakeChild();
  const run = superviseMemberReceiver({ root: "/repo", env: {}, signal: controller.signal,
    spawn: () => { count++; return child.process(); }, log: () => {},
    sleep: async (_ms, signal) => { controller.abort(); assert.equal(signal.aborted, true); throw Error("cancelled"); } });
  child.exit(1); await run; assert.equal(count, 1);
  await superviseMemberReceiver({ root: "/repo", env: {}, signal: AbortSignal.abort(),
    spawn: () => assert.fail("spawned after stop"), log: () => {} });
});

test("Next spawn failure never starts the receiver; Next exit cancels and joins its companion", async () => {
  let starts = 0; const failed = new FakeChild(); failed.pid = undefined;
  const failing = runMemberPreviewChildren({ next: failed.process(), signal: new AbortController().signal,
    startReceiver: async () => { starts++; }, log: () => {} });
  failed.emit("error", new Error("private startup error"));
  await assert.rejects(failing, /preview child could not start/i); assert.equal(starts, 0);
  const next = new FakeChild(); let stopped = false;
  const normal = runMemberPreviewChildren({ next: next.process(), signal: new AbortController().signal,
    startReceiver: async (signal) => { starts++; await new Promise<void>(resolve => signal.addEventListener("abort", () => { stopped = true; resolve(); }, { once: true })); }, log: () => {} });
  next.emit("spawn"); await tick(); assert.equal(starts, 1);
  next.exit(0); assert.equal(await normal, 0); assert.equal(stopped, true);
});

test("external stop cancels both owned children; receiver failure leaves Next available", async () => {
  const next = new FakeChild(); const controller = new AbortController(); const logs: string[] = [];
  const run = runMemberPreviewChildren({ next: next.process(), signal: controller.signal,
    startReceiver: async () => { throw new Error("private receiver detail"); }, log: text => logs.push(text) });
  next.emit("spawn"); await tick();
  assert.equal(next.exitCode, null); assert.deepEqual(next.signals, []);
  controller.abort(); assert.equal(await run, 0);
  assert.deepEqual(next.signals, ["SIGTERM"]); assert.doesNotMatch(logs.join(" "), /private/);
});
