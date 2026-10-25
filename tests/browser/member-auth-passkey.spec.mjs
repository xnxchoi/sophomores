// Isolated browser/cryptographic acceptance only. Never use a working database.
// node --env-file=.deployment/member-auth-local/browser-test.env --import tsx tests/browser/member-auth-passkey.spec.mjs
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Pool } from "pg";
import { getMigrations } from "better-auth/db/migration";
import { createMemberAuth, handleMemberAuthRequest } from "../../lib/member-auth/server.ts";
import { PgMemberRepository } from "../../lib/member-auth/repository.ts";
import { PgPhoneIdentifier } from "../../lib/member-auth/identifier.ts";
import { createPhoneIdentifierHandlers } from "../../lib/member-auth/identifier-http.ts";
import { digest, normalizePhone } from "../../lib/phone-verification/server/crypto.ts";

const database = process.env.MEMBER_AUTH_TEST_DATABASE_URL;
assert.ok(database, "An explicitly supplied disposable database is required");
const databaseUrl = new URL(database);
assert.ok(["postgres:", "postgresql:"].includes(databaseUrl.protocol));
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(databaseUrl.hostname));
assert.match(databaseUrl.pathname, /^\/sophomores_verification_test_[a-z0-9_]+$/);
assert.equal(databaseUrl.search + databaseUrl.hash, "");
const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(resolve(modulePath)).href : "playwright");
const artifactDirectory = resolve(process.env.ARTIFACT_DIR ?? "/tmp/sphmrs-member-passkey");
await mkdir(artifactDirectory, { recursive: true });
const pool = new Pool({ connectionString: database, options: "-c search_path=member_auth", max: 4,
  connectionTimeoutMillis: 2000, statement_timeout: 5000, lock_timeout: 1000 });
const notifications = [];
let config, auth, identifiers;
let phase = "setup";
const server = createServer(async (incoming, outgoing) => {
  try {
    if (incoming.url === "/") {
      outgoing.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      outgoing.end("<!doctype html><html><head><title>Isolated member passkey acceptance</title></head><body><h1>Virtual passkey acceptance</h1><p id='status'>Synthetic account, in-memory email and disposable database only.</p></body></html>");
      return;
    }
    const chunks = [];
    let length = 0;
    for await (const chunk of incoming) {
      length += chunk.length;
      if (length > 65536) throw new Error("Test request exceeded bound");
      chunks.push(chunk);
    }
    const request = new Request(config.origin + incoming.url, {
      method: incoming.method, headers: new Headers(Object.entries(incoming.headers).flatMap(([key, value]) =>
        value === undefined ? [] : Array.isArray(value) ? value.map(item => [key, item]) : [[key, value]])),
      ...(!["GET", "HEAD"].includes(incoming.method) && length ? { body: Buffer.concat(chunks) } : {}),
    });
    const response = incoming.url === "/api/member/identify"
      ? await identifiers[incoming.method === "DELETE" ? "clear" : "start"](request)
      : await handleMemberAuthRequest(auth, config, request);
    outgoing.statusCode = response.status;
    for (const [key, value] of response.headers) if (key !== "set-cookie") outgoing.setHeader(key, value);
    const cookies = response.headers.getSetCookie();
    if (cookies.length) outgoing.setHeader("set-cookie", cookies);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.writeHead(503, { "content-type": "text/plain" });
    outgoing.end("Isolated test handler unavailable");
  }
});
let browser;
let ownsSchema = false;
const report = { startedAt: new Date().toISOString(), scope: "Real Chromium virtual WebAuthn and Better Auth HTTP; synthetic accounts and phone-binding fixtures; memory mail only",
  repetitions: Number(process.env.REPEAT ?? 3), runs: [], screenshots: [],
  limitations: ["No real email or Google requests", "Phone binding is a fixture, not carrier proof", "No physical device, biometric, password-manager or hosted-RP proof"] };
assert.ok(Number.isInteger(report.repetitions) && report.repetitions >= 1 && report.repetitions <= 5);

async function api(page, path, body, method = body === undefined ? "GET" : "POST") {
  return page.evaluate(async ({ path, body, method }) => {
    const response = await fetch(path, { method, credentials: "same-origin",
      headers: body === undefined ? {} : { "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status };
  }, { path, body, method });
}

async function ceremony(page, kind, verified = true) {
  return page.evaluate(async ({ kind, verified }) => {
    const decode = value => Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), character => character.charCodeAt(0));
    const encode = value => btoa(String.fromCharCode(...new Uint8Array(value))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const optionsResponse = await fetch(`/api/auth/passkey/generate-${kind === "registration" ? "register" : "authenticate"}-options`, { credentials: "same-origin" });
    if (!optionsResponse.ok) return { status: optionsResponse.status, stage: "options" };
    const options = await optionsResponse.json();
    options.challenge = decode(options.challenge);
    options.timeout = 15000;
    for (const name of ["excludeCredentials", "allowCredentials"])
      if (options[name]) options[name] = options[name].map(item => ({ ...item, id: decode(item.id) }));
    if (kind === "registration") {
      options.user.id = decode(options.user.id);
      options.authenticatorSelection = { ...options.authenticatorSelection, userVerification: verified ? "required" : "discouraged" };
    } else options.userVerification = verified ? "required" : "discouraged";
    const credential = kind === "registration" ? await navigator.credentials.create({ publicKey: options }) : await navigator.credentials.get({ publicKey: options });
    const response = { id: credential.id, rawId: encode(credential.rawId), type: credential.type,
      authenticatorAttachment: credential.authenticatorAttachment,
      clientExtensionResults: credential.getClientExtensionResults(),
      response: kind === "registration"
        ? { clientDataJSON: encode(credential.response.clientDataJSON), attestationObject: encode(credential.response.attestationObject), transports: credential.response.getTransports() }
        : { clientDataJSON: encode(credential.response.clientDataJSON), authenticatorData: encode(credential.response.authenticatorData), signature: encode(credential.response.signature), userHandle: credential.response.userHandle ? encode(credential.response.userHandle) : undefined } };
    const body = kind === "registration" ? { response, name: "Browser fixture" } : { response };
    if (kind === "authentication") window.lastAssertion = body;
    const result = await fetch(`/api/auth/passkey/verify-${kind}`, { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: result.status, stage: "verification" };
  }, { kind, verified });
}

try {
  const existing = await pool.query("SELECT to_regnamespace('member_auth') AS namespace");
  assert.equal(existing.rows[0].namespace, null, "Refusing a nonempty/nonfresh auth test database");
  await server.listen(0, "127.0.0.1");
  await new Promise(resolveListening => server.listening ? resolveListening() : server.once("listening", resolveListening));
  const origin = `http://localhost:${server.address().port}`;
  config = { mode: "local", origin, databaseUrl: database, secret: randomBytes(32).toString("hex"),
    verificationSecret: randomBytes(32).toString("hex"), rpId: "localhost", google: null,
    mail: { host: "smtp.zeptomail.com", port: 465, username: "fixture", password: "fixture", from: "auth@fixture.invalid" } };
  const repository = new PgMemberRepository(pool);
  const identifier = new PgPhoneIdentifier(pool, { secret: config.secret, verificationSecret: config.verificationSecret, origin });
  auth = createMemberAuth(config, { pool, isActiveMember: id => repository.isActiveMember(id),
    assertPhoneIdentifier: (headers, id) => identifier.assert(headers, id), sendMail: async notification => { notifications.push(notification); } });
  identifiers = createPhoneIdentifierHandlers({ origin, identifier });
  await pool.query("CREATE SCHEMA member_auth");
  ownsSchema = true;
  await (await getMigrations(auth.options)).runMigrations();
  await repository.migrate();
  await identifier.migrate();
  browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}) });
  for (let repetition = 0; repetition < report.repetitions; repetition++) {
    const context = await browser.newContext();
    await context.route("**/*", route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    try {
      phase = "email-fixture";
      await page.goto(origin);
      const email = `passkey-${repetition}-${randomBytes(3).toString("hex")}@fixture.invalid`;
      assert.equal((await api(page, "/api/auth/email-otp/send-verification-otp", { email, type: "sign-in" })).status, 200);
      const notification = notifications.find(item => item.type === "email-otp" && item.email === email);
      assert.ok(notification && notification.otp.length === 6 && /^[A-Z0-9]{6}$/.test(notification.otp), "Memory OTP must exist");
      assert.equal((await api(page, "/api/auth/sign-in/email-otp", { email, otp: notification.otp })).status, 200);
      const identity = await page.evaluate(async () => { const session = await (await fetch("/api/auth/get-session")).json(); return { id: session?.user?.id, verified: session?.user?.emailVerified }; });
      assert.ok(identity.id);
      assert.equal(identity.verified, true);
      phase = "pending-enrollment-denied";
      assert.equal((await api(page, "/api/auth/passkey/generate-register-options")).status, 403);
      // This is deliberately a test-only phone-binding fixture, never a live MMS claim.
      const phone = `0108800000${repetition}`;
      await pool.query("INSERT INTO member_auth.phone_bindings(user_id,phone_hash,challenge_id,policy_version,verified_at) VALUES($1,$2,$3,$4,now())",
        [identity.id, digest(config.verificationSecret, "phone", normalizePhone(phone)), randomUUID(), "local-skt-zoho-arc-v1"]);
      const cdp = await context.newCDPSession(page);
      await cdp.send("WebAuthn.enable");
      const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", { options: {
        protocol: "ctap2", transport: "internal", hasResidentKey: true, hasUserVerification: true,
        isUserVerified: true, automaticPresenceSimulation: true } });
      phase = "registration-user-verification-required";
      await cdp.send("WebAuthn.setResponseOverrideBits", { authenticatorId, isBadUV: true });
      assert.notEqual((await ceremony(page, "registration", false)).status, 200);
      assert.equal(Number((await pool.query('SELECT count(*) FROM member_auth.passkey WHERE "userId"=$1', [identity.id])).rows[0].count), 0);
      await cdp.send("WebAuthn.clearCredentials", { authenticatorId });
      await cdp.send("WebAuthn.setResponseOverrideBits", { authenticatorId, isBadUV: false });
      phase = "registration";
      assert.equal((await ceremony(page, "registration")).status, 200);
      assert.equal(Number((await pool.query('SELECT count(*) FROM member_auth.passkey WHERE "userId"=$1', [identity.id])).rows[0].count), 1);
      assert.equal((await api(page, "/api/auth/sign-out", {})).status, 200);
      phase = "authentication-user-verification-required";
      await cdp.send("WebAuthn.setResponseOverrideBits", { authenticatorId, isBadUV: true });
      assert.notEqual((await ceremony(page, "authentication", false)).status, 200);
      assert.equal(await page.evaluate(async () => Boolean((await (await fetch("/api/auth/get-session")).json())?.user)), false);
      phase = "wrong-phone-selector-denied";
      await cdp.send("WebAuthn.setResponseOverrideBits", { authenticatorId, isBadUV: false });
      assert.equal((await api(page, "/api/member/identify", { phone: "01099999999" })).status, 200);
      assert.notEqual((await ceremony(page, "authentication")).status, 200);
      assert.equal(await page.evaluate(async () => Boolean((await (await fetch("/api/auth/get-session")).json())?.user)), false);
      assert.equal((await api(page, "/api/member/identify", undefined, "DELETE")).status, 200);
      phase = "authentication";
      assert.equal((await ceremony(page, "authentication")).status, 200);
      assert.equal(await page.evaluate(async () => (await (await fetch("/api/auth/get-session")).json())?.user?.id), identity.id);
      phase = "assertion-replay-denied";
      assert.equal((await api(page, "/api/auth/sign-out", {})).status, 200);
      assert.notEqual(await page.evaluate(async () => (await fetch("/api/auth/passkey/verify-authentication", {
        method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify(window.lastAssertion) })).status), 200);
      assert.equal(await page.evaluate(async () => Boolean((await (await fetch("/api/auth/get-session")).json())?.user)), false);
      await page.locator("#status").evaluate(element => { element.textContent = "Virtual passkey registration, authentication, UV enforcement, selector guard and replay checks passed."; });
      const screenshot = resolve(artifactDirectory, `virtual-passkey-${repetition + 1}.png`);
      await page.screenshot({ path: screenshot });
      report.screenshots.push(screenshot);
      report.runs.push({ repetition: repetition + 1, passed: true, checks: 7 });
    } finally { await context.close(); }
  }
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failedPhase = phase;
  report.failureType = error?.name ?? "Error";
  report.failureMessage = String(error?.message ?? "Unknown test failure").split("\n")[0].slice(0, 300);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await new Promise(resolveClose => server.close(resolveClose));
  if (ownsSchema) await pool.query("DROP SCHEMA member_auth CASCADE");
  await pool.end();
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(artifactDirectory, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: report.passed, runs: report.runs.length, failedPhase: report.failedPhase, artifactDirectory,
    realProvidersContacted: false, physicalDeviceTested: false }));
}
