import assert from "node:assert/strict";
import test from "node:test";
import { hasLocalRequestAuthority } from "../../lib/phone-verification/server/local-request";
import { createMemberHandlers } from "../../lib/member-auth/http";
import { createPhoneIdentifierHandlers } from "../../lib/member-auth/identifier-http";
import { createPhoneVerificationHandlers, SESSION_COOKIE } from "../../lib/phone-verification/server/http";

const origin = "http://localhost:3000";
const internal = "http://127.0.0.1:3000";
const token = "a".repeat(43);
const member = createMemberHandlers({ origin, capabilities: { emailOtp: false, magicLink: false, google: false, passkey: true },
  resolvePrincipal: async () => ({ userId: "member", emailVerified: true, sessionCreatedAt: new Date() }),
  service: { bind: async () => ({ phoneBound: true, member: true }),
    status: async () => ({ authenticated: false, emailVerified: false, phoneBound: false, member: false }) },
});
const identifier = createPhoneIdentifierHandlers({ origin, identifier: {
  start: async () => ({ token }), clear: async () => undefined,
} });
const phone = createPhoneVerificationHandlers({ origin, webhookSecret: "fixture", mailboxId: "100", zohoUserId: "101", zohoIntegrationId: "102",
  service: { issue: async () => ({ id: "challenge" }),
    status: async () => ({ id: "challenge", state: "verified", expiresAt: new Date().toISOString(), mode: "local" }),
    cancel: async () => undefined } as never,
  deliveries: { enqueueDelivery: async () => undefined } as never,
});
const cases = [
  { path: "/api/member/status", method: "GET", invoke: member.status, status: 200 },
  { path: "/api/phone-verification/bind", method: "POST", body: { challengeId: "069a74b7-17a2-4368-b3a2-60298eb1bd6a", phone: "01012345678" }, invoke: member.bind, status: 200 },
  { path: "/api/member/identify", method: "POST", body: { phone: "01012345678" }, invoke: identifier.start, status: 200 },
  { path: "/api/member/identify", method: "DELETE", invoke: identifier.clear, status: 200 },
  { path: "/api/phone-verification/challenges", method: "POST", body: { phone: "01012345678" }, invoke: phone.issue, status: 201 },
  { path: "/api/phone-verification/challenges/challenge", method: "GET", invoke: (request: Request) => phone.status(request, "challenge"), status: 200 },
  { path: "/api/phone-verification/challenges/challenge", method: "DELETE", invoke: (request: Request) => phone.cancel(request, "challenge"), status: 200 },
];

function request(item: typeof cases[number], options: { url?: string; headers?: Record<string, string> } = {}) {
  return new Request(`${options.url ?? internal}${item.path}`, { method: item.method,
    headers: { Host: "localhost:3000", Origin: origin, "Content-Type": "application/json",
      Cookie: `${SESSION_COOKIE}=${token}`, ...options.headers },
    body: "body" in item ? JSON.stringify(item.body) : undefined,
  });
}

test("local authority accepts Next's normalized loopback URL only with the explicit canonical Host", () => {
  assert.equal(hasLocalRequestAuthority(new Request(`${origin}/api/member/status`), origin), true);
  assert.equal(hasLocalRequestAuthority(new Request(`${internal}/api/member/status`), origin), false);
  assert.equal(hasLocalRequestAuthority(new Request(`${internal}/api/member/status`, { headers: { Host: "localhost:3000" } }), origin), true);
  for (const [url, host] of [
    [internal, "evil.invalid"], [origin, "127.0.0.1:3000"], ["http://evil.invalid:3000", "localhost:3000"],
    ["http://127.0.0.1:3001", "localhost:3000"], ["https://127.0.0.1:3000", "localhost:3000"],
  ]) assert.equal(hasLocalRequestAuthority(new Request(`${url}/api/member/status`, { headers: { Host: host } }), origin), false);
  assert.equal(hasLocalRequestAuthority(new Request(`${internal}/api/member/status`, { headers: { "X-Forwarded-Host": "localhost:3000" } }), origin), false);
});

test("all member and phone handlers accept canonical browser authority after Next URL normalization", async () => {
  for (const item of cases) assert.equal((await item.invoke(request(item))).status, item.status, `${item.method} ${item.path}`);
});

test("normalized local requests still reject forged hosts, cross-site/RSC/query requests and wrong browser origins", async () => {
  const invalidHeaders: Record<string, string>[] = [{ Host: "evil.invalid" }, { "Sec-Fetch-Site": "cross-site" }, { RSC: "1" }];
  for (const item of cases) {
    for (const headers of invalidHeaders) {
      assert.equal((await item.invoke(request(item, { headers }))).status, 403, `${item.method} ${item.path}`);
    }
    assert.equal((await item.invoke(new Request(`${internal}${item.path}?extra=1`, { method: item.method,
      headers: { Host: "localhost:3000", Origin: origin, "Content-Type": "application/json", Cookie: `${SESSION_COOKIE}=${token}` },
      body: "body" in item ? JSON.stringify(item.body) : undefined }))).status, 403);
    assert.equal((await item.invoke(request(item, { url: "http://evil.invalid:3000" }))).status, 403);
    if (item.method !== "GET") assert.equal((await item.invoke(request(item, { headers: { Origin: "https://evil.invalid" } }))).status, 403);
  }
});
