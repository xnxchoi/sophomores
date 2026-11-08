import assert from "node:assert/strict";
import { createHmac, randomBytes, scryptSync } from "node:crypto";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  validateConfig,
  loadConfig,
  issueSession,
  verifySession,
  cookieToken,
  verifyCredentials,
  SESSION_SECONDS,
  REMEMBER_SECONDS
} from "@/lib/preview-auth/session";
import { createAuthHandlers, parseForm } from "@/lib/preview-auth/auth";

// Test-only credentials are generated per run; retain Unicode password coverage.
const password = `${randomBytes(24).toString("base64url")} 🔥`;
const salt = "ab".repeat(16);
const rawConfig = {
  origin: "https://preview.sophomores.co",
  username: "team",
  passwordSalt: salt,
  passwordHash: scryptSync(password, Buffer.from(salt, "hex"), 64, {
    N: 16384,
    r: 8,
    p: 1
  }).toString("hex"),
  signingSecret: "cd".repeat(32)
};
const config = validateConfig(rawConfig);
const now = 1_800_000_000;
const cookieName = "__Host-sophomores-preview";
function signed(payload: unknown, secret = config.signingSecret) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${createHmac("sha256", Buffer.from(secret, "hex")).update(body).digest("base64url")}`;
}
interface CallOptions {
  method?: string;
  headers?: HeadersInit;
  body?: string | ReadableStream<Uint8Array>;
}
function fixture(options: Parameters<typeof createAuthHandlers>[1] = {}) {
  const handlers = createAuthHandlers(config, { clock: () => now * 1000, ...options });
  return async (path: string, { method = "GET", headers = {}, body }: CallOptions = {}) => {
    const init: RequestInit & { duplex?: "half" } = { method, headers, body };
    if (body instanceof ReadableStream) init.duplex = "half";
    const req = new Request(config.origin + path, init);
    const handler = path === "/api/session/verify" ? handlers.verify : path === "/api/session/logout" ? handlers.logout : handlers.login;
    return handler(req);
  };
}
function login(overrides: CallOptions = {}): CallOptions {
  return {
    method: "POST",
    headers: { origin: config.origin, "content-type": "application/x-www-form-urlencoded", "x-real-ip": "192.0.2.1" },
    body: new URLSearchParams({ username: "team", password, remember: "yes" }).toString(),
    ...overrides,
  };
}
function loginHeaders(extra: Record<string, string> = {}): HeadersInit {
  return { origin: config.origin, "content-type": "application/x-www-form-urlencoded", "x-real-ip": "192.0.2.1", ...extra };
}
function stream(chunks: Uint8Array[], onCancel?: () => void): ReadableStream<Uint8Array> {
  let index = 0;
  return new ReadableStream({ pull(controller) { if (index < chunks.length) controller.enqueue(chunks[index++]); else controller.close(); }, cancel: onCancel });
}
test("config fails closed on missing, malformed and unsupported fields", () => {
  assert.deepEqual(config, rawConfig);
  assert.ok(Object.isFrozen(config));
  for (const value of [
    null,
    [],
    {},
    { ...rawConfig, origin: "http://preview.sophomores.co" },
    { ...rawConfig, origin: "https://other.example" },
    { ...rawConfig, username: "" },
    { ...rawConfig, passwordSalt: "bad" },
    { ...rawConfig, passwordHash: "AA".repeat(64) },
    { ...rawConfig, signingSecret: "a" },
    { ...rawConfig, extra: true }
  ])
    assert.throws(() => validateConfig(value));
  assert.throws(() => loadConfig({}));
  assert.throws(() =>
    loadConfig({ PREVIEW_AUTH_CONFIG: "/nonexistent-preview-auth-file" })
  );
});

test("configuration loads only from valid absolute JSON file and startup failure hides details", (t) => {
  const dir = mkdtempSync(join(tmpdir(), "preview-auth-test-"));
  t.after(() => rmSync(dir, { recursive: true }));
  const path = join(dir, "config.json");
  writeFileSync(path, JSON.stringify(rawConfig));
  assert.deepEqual(loadConfig({ PREVIEW_AUTH_CONFIG: path }), config);
  writeFileSync(path, "secret-invalid-config");
  assert.throws(() => loadConfig({ PREVIEW_AUTH_CONFIG: path }));
  assert.throws(() => loadConfig({ PREVIEW_AUTH_CONFIG: "relative.json" }));
});
test("credential verification uses the configured scrypt password and exact username", async () => {
  assert.equal(await verifyCredentials(config, "team", password), true);
  assert.equal(await verifyCredentials(config, "team", "wrong"), false);
  assert.equal(await verifyCredentials(config, "Team", password), false);
  assert.equal(await verifyCredentials(config, null, password), false);
  assert.equal(await verifyCredentials(config, "team", null), false);
});

test("session signatures, fixed lifetimes, boundary expiry, rotation and strict token shape", () => {
  for (const remember of [true, false]) {
    const token = issueSession(config, remember, now);
    assert.equal(verifySession(config, token, now), true);
    const lifetime = remember ? REMEMBER_SECONDS : SESSION_SECONDS;
    assert.equal(verifySession(config, token, now + lifetime - 1), true);
    assert.equal(verifySession(config, token, now + lifetime), false);
    assert.equal(
      verifySession({ ...config, signingSecret: "ef".repeat(32) }, token, now),
      false
    );
    assert.equal(verifySession(config, token + "x", now), false);
  }
  const base = {
    v: 1,
    iat: now,
    exp: now + SESSION_SECONDS,
    nonce: "aa".repeat(16)
  };
  for (const token of [
    undefined,
    "",
    "x.y",
    "a.b.c",
    "a".repeat(5000),
    signed({ ...base, iat: now + 61 }),
    signed({ ...base, exp: now + REMEMBER_SECONDS + 1 }),
    signed({ ...base, exp: now }),
    signed({ ...base, v: 2 }),
    signed({ ...base, nonce: "bad" }),
    signed({ ...base, iat: now + 0.5 }),
    signed({ ...base, extra: true })
  ])
    assert.equal(verifySession(config, token, now), false);
  assert.equal(
    verifySession(
      config,
      signed({ ...base, iat: now + 60, exp: now + 60 + SESSION_SECONDS }),
      now
    ),
    true
  );
  assert.notEqual(
    issueSession(config, true, now),
    issueSession(config, true, now)
  );
});

test("cookie parser rejects duplicate, malformed and oversized cookies", () => {
  assert.equal(cookieToken(`other=x; ${cookieName}=abc`), "abc");
  for (const value of [
    undefined,
    "",
    `${cookieName}=`,
    `${cookieName}=a; ${cookieName}=b`,
    `${cookieName}=a=b`,
    "a".repeat(5000)
  ])
    assert.equal(cookieToken(value), null);
});

test("forms are strict and Unicode-safe, with no duplicate/unknown fields", () => {
  assert.equal(
    parseForm(
      new URLSearchParams({
        username: "team",
        password,
        remember: "yes"
      }).toString()
    ).password,
    password
  );
  for (const body of [
    "",
    "username=team",
    "username=team&password=",
    "username=a&username=b&password=c",
    "username=a&password=b&next=https://evil.test",
    "username=a&password=%QZ",
    "username=a&password=%FF",
    "username=a&password=b&remember=no",
    "username=a&password=" + "x".repeat(1025)
  ])
    assert.throws(() => parseForm(body));
});

test("remember and session login retain cookie compatibility and fixed safe redirects", async () => {
  const call = fixture();
  assert.equal((await call("/api/session/verify")).status, 401);
  assert.equal(await (await call("/api/session/verify", { method: "HEAD" })).text(), "");
  for (const remember of [true, false]) {
    const fields = { username: "team", password, ...(remember ? { remember: "yes" } : {}) };
    const response = await call("/api/session", login({ body: new URLSearchParams(fields).toString() }));
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/");
    const cookie = response.headers.get("set-cookie");
    assert.ok(cookie);
    for (const flag of ["Secure", "HttpOnly", "SameSite=Lax", "Path=/"]) assert.ok(cookie.includes(flag));
    assert.equal(cookie.includes(`Max-Age=${REMEMBER_SECONDS}`), remember);
    assert.equal(cookie.includes("Expires="), remember);
    assert.equal((await call("/api/session/verify", { headers: { cookie: cookie.split(";")[0] } })).status, 204);
    assert.equal((await call("/api/session/verify", { headers: { cookie: `${cookieName}=broken` } })).status, 401);
  }
});
test("wrong credentials redirect to a fixed error without echo or a Basic challenge", async () => {
  const call = fixture();
  const response = await call("/api/session", login({ body: "username=team&password=secret-must-not-echo" }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/login?error=credentials");
  assert.doesNotMatch(await response.text(), /secret-must-not-echo/);
  assert.equal(response.headers.get("www-authenticate"), null);
  assert.equal(response.headers.get("set-cookie"), null);
});
test("CSRF, duplicate origins, content type, strict bodies and source validation fail closed", async () => {
  const call = fixture();
  for (const origin of ["", "null", "https://evil.test", `${config.origin}, ${config.origin}`]) {
    assert.equal((await call("/api/session", login({ headers: loginHeaders({ origin }) }))).status, 403);
  }
  const duplicated = new Headers(loginHeaders()); duplicated.append("origin", config.origin);
  assert.equal((await call("/api/session", login({ headers: duplicated }))).status, 403);
  assert.equal((await call("/api/session", login({ headers: loginHeaders({ "content-type": "application/json" }) }))).status, 415);
  for (const body of ["username=x&username=y&password=z", "username=x&password=%FF", "username=x&password=y&redirect=/private"]) {
    assert.equal((await call("/api/session", login({ body }))).status, 400);
  }
  for (const ip of ["", "not-an-ip", "192.0.2.1, 192.0.2.2"]) {
    assert.equal((await call("/api/session", login({ headers: loginHeaders({ "x-real-ip": ip }) }))).status, 400);
  }
  assert.equal((await call("/api/session", login({ headers: loginHeaders({ "x-real-ip": "2001:db8::1" }) }))).status, 303);
});
test("body reading is bounded, cancels oversized streams, and rejects fatal UTF-8", async () => {
  const call = fixture({ verifyPassword: async () => true });
  assert.equal((await call("/api/session", login({ body: "a".repeat(4097) }))).status, 413);
  assert.equal((await call("/api/session", login({ headers: loginHeaders({ "content-length": "4097" }) }))).status, 413);
  let cancelled = false;
  const large = stream([new Uint8Array(2048), new Uint8Array(2049), new Uint8Array(20)], () => { cancelled = true; });
  assert.equal((await call("/api/session", login({ body: large }))).status, 413);
  assert.equal(cancelled, true);
  const invalid = stream([new TextEncoder().encode("username=team&password="), new Uint8Array([0xff])]);
  assert.equal((await call("/api/session", login({ body: invalid }))).status, 400);
  const broken = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("secret-stream-failure")); } });
  const result = await call("/api/session", login({ body: broken }));
  assert.equal(result.status, 400);
  assert.doesNotMatch(await result.text(), /secret-stream-failure/);
  const encoded = new TextEncoder().encode(new URLSearchParams({ username: "team", password }).toString());
  assert.equal((await call("/api/session", login({ body: stream([encoded.slice(0, 10), encoded.slice(10)]) }))).status, 303);
  assert.equal((await call("/api/session", login({ body: undefined }))).status, 400);
});
test("methods are restricted and every response is private, uncached and without Basic challenge", async () => {
  const call = fixture();
  for (const [path, allow] of [["/api/session/verify", "GET, HEAD"], ["/api/session", "POST"], ["/api/session/logout", "POST"]]) {
    const response = await call(path, { method: "PUT" });
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("allow"), allow);
    assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
    assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors/);
    assert.equal(response.headers.get("www-authenticate"), null);
  }
});
test("failed verifier is safe, releases concurrency and fails closed", async () => {
  const call = fixture({ verifyPassword: async () => { throw new Error("internal-secret-error"); } });
  for (let i = 0; i < 3; i++) {
    const response = await call("/api/session", login());
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /internal-secret-error/);
    assert.equal(response.headers.get("set-cookie"), null);
  }
});
test("limiter expires and fails closed when 1024 client entries are occupied", async () => {
  let clock = now * 1000;
  const call = fixture({ clock: () => clock, verifyPassword: async () => false });
  for (let i = 0; i < 1024; i++) {
    assert.equal((await call("/api/session", login({ headers: loginHeaders({ "x-real-ip": `198.18.${Math.floor(i / 256)}.${i % 256}` }) }))).status, 303);
  }
  assert.equal((await call("/api/session", login())).status, 429);
  clock += 15 * 60 * 1000;
  assert.equal((await call("/api/session", login())).status, 303);
});
test("five per-IP failures throttle; successful login resets its budget", async () => {
  let valid = false;
  const call = fixture({ verifyPassword: async () => valid });
  for (let i = 0; i < 5; i++) assert.equal((await call("/api/session", login())).status, 303);
  const limited = await call("/api/session", login());
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "900");
  valid = true;
  for (let i = 0; i < 8; i++) assert.equal((await call("/api/session", login({ headers: loginHeaders({ "x-real-ip": "192.0.2.2" }) }))).status, 303);
});
test("at most two password hashes run concurrently", async () => {
  const releases: Array<() => void> = [];
  const call = fixture({ verifyPassword: async () => { await new Promise<void>(resolve => releases.push(resolve)); return false; } });
  const first = call("/api/session", login());
  const second = call("/api/session", login());
  const deadline = Date.now() + 5000;
  while (releases.length < 2 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(releases.length, 2);
  assert.equal((await call("/api/session", login())).status, 429);
  releases.forEach(release => release());
  await Promise.all([first, second]);
});
test("logout requires an exact-origin POST and clears the existing cookie", async () => {
  const call = fixture();
  assert.equal((await call("/api/session/logout")).status, 405);
  assert.equal((await call("/api/session/logout", { method: "POST" })).status, 403);
  const response = await call("/api/session/logout", { method: "POST", headers: { origin: config.origin } });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/login");
  assert.match(response.headers.get("set-cookie") ?? "", /Max-Age=0/);
});
test("runtime defaults protected, rejects invalid modes and lazily caches config and handlers", async (t) => {
  const originalMode = process.env.PREVIEW_AUTH_MODE;
  const originalConfig = process.env.PREVIEW_AUTH_CONFIG;
  const dir = mkdtempSync(join(tmpdir(), "preview-runtime-test-"));
  t.after(() => {
    if (originalMode === undefined) delete process.env.PREVIEW_AUTH_MODE;
    else process.env.PREVIEW_AUTH_MODE = originalMode;
    if (originalConfig === undefined) delete process.env.PREVIEW_AUTH_CONFIG;
    else process.env.PREVIEW_AUTH_CONFIG = originalConfig;
    rmSync(dir, { recursive: true });
  });
  delete process.env.PREVIEW_AUTH_CONFIG;
  const runtime = await import("@/lib/preview-auth/runtime");
  delete process.env.PREVIEW_AUTH_MODE;
  assert.equal(runtime.authMode(), "protected");
  process.env.PREVIEW_AUTH_MODE = "protected";
  assert.equal(runtime.authMode(), "protected");
  process.env.PREVIEW_AUTH_MODE = "public";
  assert.equal(runtime.authMode(), "public");
  for (const value of ["", "false", "Public", " protected ", "private"]) {
    process.env.PREVIEW_AUTH_MODE = value;
    assert.throws(() => runtime.authMode());
  }
  assert.throws(() => runtime.getPreviewConfig());
  assert.throws(() => runtime.getPreviewHandlers());
  const path = join(dir, "config.json");
  writeFileSync(path, JSON.stringify(rawConfig));
  process.env.PREVIEW_AUTH_CONFIG = path;
  const loaded = runtime.getPreviewConfig();
  const handlers = runtime.getPreviewHandlers();
  writeFileSync(path, "now-invalid");
  assert.equal(runtime.getPreviewConfig(), loaded);
  assert.equal(runtime.getPreviewHandlers(), handlers);
  assert.deepEqual(loaded, config);
});
test("clock exceptions also fail closed without internal details", async () => {
  const handlers = createAuthHandlers(config, { clock: () => { throw new Error("secret-clock"); } });
  const response = await handlers.verify(new Request(config.origin + "/api/session/verify"));
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /secret-clock/);
});
