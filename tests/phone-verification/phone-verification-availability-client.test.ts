import assert from "node:assert/strict";
import { test } from "node:test";
import { createTrialSession, createVerificationClient } from "@/lib/phone-verification/client";

const challenge = { id: "availability-fixture", recipient: "verify@example.invalid",
  body: "SPHMRS FIXTURE", expiresAt: "2041-01-01T00:05:00.000Z", mode: "trial" as const };
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
const unavailable = (code = "RECEIVER_UNAVAILABLE") => Response.json({ success: false, error: { code } }, { status: 503 });

test("an offline receiver prevents a challenge without pretending the phone is pending", async () => {
  const session = createTrialSession(createVerificationClient(async () => unavailable()), () => {});
  await session.start("01012345678");
  assert.equal(session.snapshot().challenge, null);
  assert.equal(session.snapshot().status, null);
  assert.equal(session.snapshot().busy, false);
  assert.equal(session.snapshot().error, "receiver");
  session.dispose();
});

test("receiver outage pauses automatic waiting and preserves the proof for an explicit retry", async () => {
  const queued: (() => void)[] = [];
  let healthy = false;
  const client = createVerificationClient(async (_url, init) => {
    if (init?.method === "POST") return Response.json({ success: true, data: challenge });
    if (init?.method === "DELETE") return Response.json({ success: true, data: { cancelled: true } });
    return healthy ? Response.json({ success: true, data: { ...challenge, state: "verified" } }) : unavailable();
  });
  const session = createTrialSession(client, () => {}, {
    set: (callback) => { queued.push(callback); return callback; }, clear: () => {}
  }, { now: () => 0, delay: async () => {} });
  await session.start("01012345678");
  queued.shift()?.();
  await tick();
  assert.equal(session.snapshot().error, "receiver");
  assert.equal(session.snapshot().status?.state, "pending");
  assert.equal(session.snapshot().challenge?.id, challenge.id);
  assert.equal(session.snapshot().busy, false);
  assert.equal(queued.length, 0, "outage must not poll indefinitely");
  healthy = true;
  await session.refresh();
  assert.equal(session.snapshot().error, null);
  assert.equal(session.snapshot().status?.state, "verified");
  session.dispose();
});

test("unknown server errors remain generic and late receiver errors cannot resurrect reset challenges", async () => {
  const failed = createTrialSession(createVerificationClient(async () => unavailable("PRIVATE_PROVIDER_ERROR")), () => {});
  await failed.start("01012345678");
  assert.equal(failed.snapshot().error, "create");
  failed.dispose();
  let reject!: (error: unknown) => void;
  const receiverError = await createVerificationClient(async () => unavailable()).status(challenge.id).catch(error => error);
  const session = createTrialSession({ create: async () => challenge,
    status: () => new Promise((_resolve, fail) => { reject = fail; }), cancel: async () => {}
  }, () => {}, { set: () => 1, clear: () => {} }, { now: () => 0, delay: async () => {} });
  await session.start("01012345678");
  const refresh = session.refresh();
  await session.reset();
  reject(receiverError);
  await refresh;
  assert.deepEqual(session.snapshot(), { challenge: null, status: null, busy: false, error: null });
  session.dispose();
});

test("retrying an offline receiver keeps it unavailable until a successful status result", async () => {
  let next: () => Promise<Response> = async () => unavailable();
  const client = createVerificationClient(async (_url, init) => init?.method === "POST"
    ? Response.json({ success: true, data: challenge }) : next());
  const session = createTrialSession(client, () => {}, { set: () => 1, clear: () => {} },
    { now: () => 0, delay: async () => {} });
  await session.start("01012345678");
  await session.refresh();
  assert.equal(session.snapshot().error, "receiver");
  let resolve!: (response: Response) => void;
  next = () => new Promise((done) => { resolve = done; });
  const retry = session.refresh();
  assert.equal(session.snapshot().busy, true);
  assert.equal(session.snapshot().error, "receiver", "a retry is not readiness evidence");
  resolve(unavailable("UNAVAILABLE"));
  await retry;
  assert.equal(session.snapshot().error, "receiver", "a different network failure does not restore readiness");
  next = async () => Response.json({ success: true, data: { ...challenge, state: "pending" } });
  await session.refresh();
  assert.equal(session.snapshot().error, null);
  assert.equal(session.snapshot().status?.state, "pending");
  session.dispose();
});
