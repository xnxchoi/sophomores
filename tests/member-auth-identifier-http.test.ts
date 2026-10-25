import assert from "node:assert/strict";
import { test } from "node:test";
import { createPhoneIdentifierHandlers, identifierUnavailable } from "../lib/member-auth/identifier-http";
import { IDENTIFIER_COOKIE, IdentifierError } from "../lib/member-auth/identifier";

const origin = "http://localhost:3240";
const token = "A".repeat(43);
function setup(error?: IdentifierError) {
  const starts: unknown[] = [], cleared: string[] = [];
  const handlers = createPhoneIdentifierHandlers({ origin, identifier: {
    start: async (phone: string, ip: string) => { starts.push({ phone, ip }); if (error) throw error; return { token }; },
    clear: async (value: string) => { cleared.push(value); if (error) throw error; }
  } });
  return { handlers, starts, cleared };
}
function request(method = "POST", body: string | null = JSON.stringify({ phone: "01012345678" }), extra: Record<string, string> = {}, url = origin + "/api/member/identify") {
  return new Request(url, { method, headers: { origin, "content-type": "application/json", ...extra }, body });
}
function streamDelete(stream: ReadableStream<Uint8Array>, extra: Record<string, string> = {}) {
  return new Request(origin + "/api/member/identify", {
    method: "DELETE", headers: { origin, ...extra }, body: stream, duplex: "half"
  } as RequestInit & { duplex: "half" });
}

test("known and unknown numbers have identical neutral responses without identifying data", async () => {
  const s = setup();
  const bodies = [];
  for (const phone of ["01012345678", "01087654321"]) {
    const response = await s.handlers.start(request("POST", JSON.stringify({ phone }), { "x-forwarded-for": "private-spoofed-ip" }));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", new RegExp(`${IDENTIFIER_COOKIE}=[A-Za-z0-9_-]{43}`));
    // This is not an authentication cookie. Lax retains the account-selection
    // constraint on top-level Google and email-link GET callbacks.
    for (const attribute of ["HttpOnly", "SameSite=Lax", "Path=/api", "Max-Age=300"]) assert.ok(response.headers.get("set-cookie")?.includes(attribute));
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.text();
    assert.doesNotMatch(body, /010|email|token|session|password/);
    bodies.push(body);
  }
  assert.equal(bodies[0], bodies[1]);
  assert.deepEqual(JSON.parse(bodies[0]), { success: true, data: { identified: true } });
  assert.deepEqual(s.starts, [{ phone: "01012345678", ip: "loopback" }, { phone: "01087654321", ip: "loopback" }]);
});

test("identifier endpoints enforce method, exact browser origin, host and JSON schema", async () => {
  const cases: [Request, number][] = [
    [request("PUT"), 405], [request("POST", "{}", { origin: "https://evil.example" }), 403],
    [request("POST", "{}", { host: "evil.example" }), 403],
    [request("POST", "{}", { "sec-fetch-site": "cross-site" }), 403],
    [request("POST", "{}", { "content-type": "text/plain" }), 415],
    [request("POST", "{}", {}, origin + "/api/member/identify?x=1"), 403],
    [request("POST", "{}", {}, "http://127.0.0.1:3240/api/member/identify"), 403],
    [request("POST", null), 400], [request("POST", "{"), 400],
    [request("POST", "[]"), 400], [request("POST", "null"), 400],
    [request("POST", '{"phone":"01012345678","email":"private@example.com"}'), 400],
    [request("POST", '{"phone":123}'), 400], [request("POST", '{"phone":""}'), 400],
    [request("POST", "x".repeat(513)), 413],
    [request("POST", "{}", { "content-length": "513" }), 413],
    [request("POST", "{}", { rsc: "1" }), 403]
  ];
  for (const [input, status] of cases) {
    const s = setup();
    const response = await s.handlers.start(input);
    assert.equal(response.status, status);
    assert.equal(s.starts.length, 0);
    assert.equal(response.headers.has("set-cookie"), false);
  }
});

test("rate and storage failures are truthful fixed errors without private information", async () => {
  for (const [code, status] of [["RATE_LIMITED", 429], ["UNAVAILABLE", 503], ["INVALID_INPUT", 400]] as const) {
    const s = setup(new IdentifierError(code));
    const response = await s.handlers.start(request());
    assert.equal(response.status, status);
    assert.equal(response.headers.has("set-cookie"), false);
    assert.doesNotMatch(await response.text(), /01012345678|@|secret/);
    if (status === 429) assert.equal(response.headers.get("retry-after"), "60");
  }
});

test("unconfigured identification returns a fixed unavailable envelope", async () => {
  const response = identifierUnavailable();
  assert.equal(response.status, 503);
  assert.equal(response.headers.has("set-cookie"), false);
  assert.deepEqual(await response.json(), { success: false, error: {
    code: "UNAVAILABLE", message: "The account identifier request could not be completed."
  } });
});

test("explicit same-origin clearing works for valid, absent and malformed abandoned choices", async () => {
  for (const cookie of [undefined, `${IDENTIFIER_COOKIE}=${token}`, `${IDENTIFIER_COOKIE}=malformed`, `${IDENTIFIER_COOKIE}=${token}; ${IDENTIFIER_COOKIE}=${token}`]) {
    const s = setup();
    const response = await s.handlers.clear(request("DELETE", null, cookie ? { cookie } : {}));
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
    assert.deepEqual(await response.json(), { success: true, data: { identified: false } });
    assert.deepEqual(s.cleared, cookie === `${IDENTIFIER_COOKIE}=${token}` ? [token] : []);
  }
  const s = setup();
  assert.equal((await s.handlers.clear(request("DELETE", null, { origin: "https://evil.example" }))).status, 403);
  assert.equal((await s.handlers.clear(request("DELETE", "{}"))).status, 400);
  assert.equal((await setup(new IdentifierError("UNAVAILABLE")).handlers.clear(request("DELETE", null, { cookie: `${IDENTIFIER_COOKIE}=${token}` }))).status, 503);
});

test("DELETE accepts Next-style empty body streams and clears choices idempotently", async () => {
  for (const length of [undefined, "0"]) {
    const s = setup();
    for (let attempt = 0; attempt < 2; attempt++) {
      const stream = new ReadableStream<Uint8Array>({ start(controller) {
        controller.enqueue(new Uint8Array());
        controller.close();
      } });
      const response = await s.handlers.clear(streamDelete(stream, {
        cookie: `${IDENTIFIER_COOKIE}=${token}`, ...(length === undefined ? {} : { "content-length": length })
      }));
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { success: true, data: { identified: false } });
      assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
    }
    assert.deepEqual(s.cleared, [token, token]);
  }
});

test("DELETE rejects body bytes, contradictory lengths, and foreign origins before clearing", async () => {
  for (const [bytes, extra, status] of [
    [new Uint8Array([0]), { "content-length": "0" }, 400],
    [new Uint8Array([1]), {}, 400],
    [new Uint8Array(), { "content-length": "1" }, 400],
    [new Uint8Array(), { "content-length": "invalid" }, 400],
    [new Uint8Array(), { origin: "https://evil.example" }, 403]
  ] as const) {
    const s = setup();
    const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(bytes); controller.close(); } });
    const response = await s.handlers.clear(streamDelete(stream, { cookie: `${IDENTIFIER_COOKIE}=${token}`, ...extra }));
    assert.equal(response.status, status);
    assert.equal(response.headers.has("set-cookie"), false);
    assert.deepEqual(s.cleared, []);
  }
});

test("DELETE bounds repeated empty chunks and cancels the reader", async () => {
  const s = setup();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array()); },
    cancel() { cancelled = true; }
  });
  const response = await s.handlers.clear(streamDelete(stream));
  assert.equal(response.status, 400);
  assert.equal(cancelled, true);
  assert.deepEqual(s.cleared, []);
});

test("DELETE times out hanging bodies, cancels reading, and never waits for hanging cancellation", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const s = setup();
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull() { return new Promise<void>(() => undefined); },
    cancel() { cancelled = true; return new Promise<void>(() => undefined); }
  });
  const pending = s.handlers.clear(streamDelete(stream, { cookie: `${IDENTIFIER_COOKIE}=${token}` }));
  t.mock.timers.tick(5000);
  const response = await pending;
  assert.equal(response.status, 408);
  assert.equal(cancelled, true);
  assert.equal(response.headers.has("set-cookie"), false);
  assert.deepEqual(s.cleared, []);
});
