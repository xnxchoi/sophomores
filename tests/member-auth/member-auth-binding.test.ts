import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { MemberError, type MemberBindingRepository, type MemberPrincipal } from "../../lib/member-auth/contracts";
import { MemberBindingService } from "../../lib/member-auth/service";
import { createMemberHandlers } from "../../lib/member-auth/http";
import { digest } from "../../lib/phone-verification/server/crypto";
import { SESSION_COOKIE } from "../../lib/phone-verification/server/http";

const now = new Date("2040-01-01T12:00:00Z");
const secret = "a".repeat(64);
const token = "b".repeat(43);
const challengeId = randomUUID();
const principal: MemberPrincipal = { userId: "member-1", emailVerified: true, sessionCreatedAt: new Date(now.getTime() - 60_000) };
const capabilities = { emailOtp: true, magicLink: true, google: false, passkey: true };

function ports() {
  const calls: { rates: unknown[]; binds: unknown[] } = { rates: [], binds: [] };
  const repository: MemberBindingRepository = {
    async enforceBindRate(input) { calls.rates.push(input); },
    async bind(input) {
      calls.binds.push(input);
      return { userId: input.userId, challengeId: input.challengeId, policyVersion: "local-skt-zoho-arc-v1", verifiedAt: now };
    },
    async getBinding() { return null; },
    async isActiveMember() { return false; },
    async findBoundUserByPhoneHash() { return null; }
  };
  return { calls, repository };
}

test("binding hashes the submitted phone and existing anonymous session without exposing proof", async () => {
  const p = ports();
  const service = new MemberBindingService(p.repository, { verificationSecret: secret, now: () => now });
  const result = await service.bind({ principal, challengeId, phone: "+82 10-1234-5678", verificationSessionToken: token });
  assert.deepEqual(result, { phoneBound: true, member: true });
  assert.equal(p.calls.binds.length, 1);
  assert.deepEqual(p.calls.binds[0], {
    userId: principal.userId,
    challengeId,
    phoneHash: digest(secret, "phone", "01012345678"),
    sessionHash: digest(secret, "session", token),
    sessionCreatedAt: principal.sessionCreatedAt,
    now
  });
  assert.equal(p.calls.rates.length, 1);
  assert.doesNotMatch(JSON.stringify(p.calls), /01012345678|821012345678|bbbbbbbb/);
});

test("binding rejects missing, unverified, stale, future and malformed principals before storage", async () => {
  const invalid = [null, undefined, {}, { ...principal, userId: "" }, { ...principal, userId: "x".repeat(129) }, { ...principal, emailVerified: false }, { ...principal, emailVerified: "true" }, { ...principal, sessionCreatedAt: "2040-01-01" }, { ...principal, sessionCreatedAt: new Date(NaN) }, { ...principal, sessionCreatedAt: new Date(now.getTime() + 1) }, { ...principal, sessionCreatedAt: new Date(now.getTime() - 900_001) }];
  for (const value of invalid) {
    const p = ports();
    const service = new MemberBindingService(p.repository, { verificationSecret: secret, now: () => now });
    await assert.rejects(service.bind({ principal: value as MemberPrincipal, challengeId, phone: "01012345678", verificationSessionToken: token }), MemberError);
    assert.deepEqual(p.calls, { binds: [], rates: [] });
  }
});

test("binding validates runtime inputs, boundaries and configured secret", async () => {
  const p = ports();
  assert.throws(() => new MemberBindingService(p.repository, { verificationSecret: "short" }));
  const service = new MemberBindingService(p.repository, { verificationSecret: secret, now: () => now });
  for (const input of [null, [], {}, { principal, challengeId: "bad", phone: "01012345678", verificationSessionToken: token }, { principal, challengeId, phone: "010';DROP TABLE", verificationSessionToken: token }, { principal, challengeId, phone: null, verificationSessionToken: token }, { principal, challengeId, phone: "01012345678", verificationSessionToken: " " }]) {
    await assert.rejects(service.bind(input as never), MemberError);
  }
  assert.equal(p.calls.binds.length, 0);
  await service.bind({ principal: { ...principal, sessionCreatedAt: new Date(now.getTime() - 900_000) }, challengeId, phone: "01012345678", verificationSessionToken: token });
});

test("storage failures are fixed safe errors and known conflicts/rate failures survive", async () => {
  for (const error of [new Error("postgres://secret@private"), new MemberError("PHONE_CONFLICT"), new MemberError("RATE_LIMITED")]) {
    const p = ports();
    const service = new MemberBindingService({ ...p.repository, async bind() { throw error; } }, { verificationSecret: secret, now: () => now });
    await assert.rejects(service.bind({ principal, challengeId, phone: "01012345678", verificationSessionToken: token }), (result: unknown) => result instanceof MemberError && result.code === (error instanceof MemberError ? error.code : "UNAVAILABLE") && !result.message.includes("secret"));
  }
  const p = ports();
  const service = new MemberBindingService({ ...p.repository, async enforceBindRate() { throw new MemberError("RATE_LIMITED"); } }, { verificationSecret: secret, now: () => now });
  await assert.rejects(service.bind({ principal, challengeId, phone: "01012345678", verificationSessionToken: token }), { code: "RATE_LIMITED" });
  assert.equal(p.calls.binds.length, 0);
});

test("membership status derives from binding plus verified principal and authoritative membership", async () => {
  const p = ports();
  const binding = { userId: principal.userId, challengeId, policyVersion: "local-skt-zoho-arc-v1", verifiedAt: now };
  const service = new MemberBindingService({ ...p.repository, async getBinding() { return binding; }, async isActiveMember() { return true; } }, { verificationSecret: secret, now: () => now });
  assert.deepEqual(await service.status(null), { authenticated: false, emailVerified: false, phoneBound: false, member: false });
  assert.deepEqual(await service.status(principal), { authenticated: true, emailVerified: true, phoneBound: true, member: true });
  assert.deepEqual(await service.status({ ...principal, emailVerified: false }), { authenticated: true, emailVerified: false, phoneBound: true, member: false });
  const pending = new MemberBindingService(p.repository, { verificationSecret: secret, now: () => now });
  assert.deepEqual(await pending.status(principal), { authenticated: true, emailVerified: true, phoneBound: false, member: false });
  const unavailable = new MemberBindingService({ ...p.repository, async getBinding() { throw new Error("sensitive"); } }, { verificationSecret: secret, now: () => now });
  await assert.rejects(unavailable.status(principal), { code: "UNAVAILABLE" });
});

function handlers(overrides: Partial<Parameters<typeof createMemberHandlers>[0]> = {}) {
  const p = ports();
  return createMemberHandlers({ origin: "http://localhost:3240", service: new MemberBindingService(p.repository, { verificationSecret: secret, now: () => now }), capabilities, resolvePrincipal: async () => principal, ...overrides });
}
function request(body: unknown = { challengeId, phone: "01012345678" }, headers: Record<string, string> = {}) {
  return new Request("http://localhost:3240/api/phone-verification/bind", { method: "POST", headers: { Origin: "http://localhost:3240", Host: "localhost:3240", "Content-Type": "application/json", Cookie: `${SESSION_COOKIE}=${token}`, ...headers }, body: JSON.stringify(body) });
}

test("binding HTTP requires own cookie and email session; strips every reusable/raw value", async () => {
  const h = handlers();
  const response = await h.bind(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: { phoneBound: true, member: true } });
  assert.match(response.headers.get("cache-control")!, /no-store/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await handlers({ resolvePrincipal: async () => null }).bind(request())).status, 401);
  for (const cookie of ["", `${SESSION_COOKIE}=bad`, `${SESSION_COOKIE}=${token}; ${SESSION_COOKIE}=${token}`, "x".repeat(8193)]) {
    const r = await h.bind(request(undefined, { Cookie: cookie }));
    assert.equal(r.status, 400);
  }
});

test("HTTP rejects cross-origin, wrong host/method, extra fields, malformed JSON and content", async () => {
  const h = handlers();
  const invalidHeaders: Record<string, string>[] = [{ Origin: "https://evil.test" }, { Host: "evil.test" }, { "Sec-Fetch-Site": "cross-site" }, { RSC: "1" }];
  for (const headers of invalidHeaders) assert.equal((await h.bind(request(undefined, headers))).status, 403);
  assert.equal((await h.bind(new Request("http://localhost:3240/api/phone-verification/bind"))).status, 405);
  assert.equal((await h.bind(request(undefined, { "Content-Type": "text/plain" }))).status, 415);
  for (const body of [null, [], {}, { challengeId, phone: "01012345678", proofToken: "forged" }, { challengeId, phone: 12 }, { challengeId: "bad", phone: "01012345678" }]) assert.equal((await h.bind(request(body))).status, 400);
  const malformed = new Request("http://localhost:3240/api/phone-verification/bind", { method: "POST", headers: { Origin: "http://localhost:3240", "Content-Type": "application/json" }, body: "{" });
  assert.equal((await h.bind(malformed)).status, 400);
  assert.equal((await h.bind(request(undefined, { "Content-Length": "9999" }))).status, 413);
  assert.equal((await h.bind(request({ challengeId, phone: "a".repeat(2200) }))).status, 413);
});

test("HTTP status is safe, no-store, neutral for no session and never exposes proof or identity", async () => {
  const request = new Request("http://localhost:3240/api/member/status");
  const response = await handlers({ resolvePrincipal: async () => null }).status(request);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, data: { authenticated: false, emailVerified: false, phoneBound: false, member: false, capabilities } });
  const failure = await handlers({ resolvePrincipal: async () => { throw new Error("secret"); } }).status(request);
  assert.equal(failure.status, 503);
  assert.doesNotMatch(await failure.text(), /secret/);
  assert.equal((await handlers().status(new Request("http://localhost:3240/api/member/status?x=1"))).status, 403);
  assert.equal((await handlers().status(new Request("https://public.example/api/member/status"))).status, 403);
});

test("HTTP preserves rate retry advice and bounds stalled/missing bodies", async () => {
  const p = ports();
  const service = new MemberBindingService({ ...p.repository, async enforceBindRate() { throw new MemberError("RATE_LIMITED"); } }, { verificationSecret: secret, now: () => now });
  const rate = await handlers({ service }).bind(request());
  assert.equal(rate.status, 429);
  assert.equal(rate.headers.get("retry-after"), "60");
  const missing = new Request("http://localhost:3240/api/phone-verification/bind", { method: "POST", headers: { Origin: "http://localhost:3240", "Content-Type": "application/json", Cookie: `${SESSION_COOKIE}=${token}` } });
  assert.equal((await handlers().bind(missing)).status, 400);
  const stream = new ReadableStream<Uint8Array>({ pull() {} });
  const stalled = new Request("http://localhost:3240/api/phone-verification/bind", { method: "POST", headers: { Origin: "http://localhost:3240", "Content-Type": "application/json", Cookie: `${SESSION_COOKIE}=${token}` }, body: stream, duplex: "half" } as RequestInit);
  assert.equal((await handlers({ bodyTimeoutMs: 5 }).bind(stalled)).status, 408);
  assert.throws(() => handlers({ origin: "https://public.example" }));
});
