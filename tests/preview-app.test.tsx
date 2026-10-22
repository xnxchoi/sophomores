import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import LoginPage from "../app/(auth)/login/page";
import LogoutPage from "../app/(auth)/logout/page";
import { POST as login } from "../app/(auth)/api/session/route";
import { POST as logout } from "../app/(auth)/api/session/logout/route";
import { GET as verify, HEAD as verifyHead } from "../app/(auth)/api/session/verify/route";
import { COOKIE_NAME, issueSession, validateConfig } from "../lib/preview-auth/session";

test("preview login remains a native form with password-manager semantics", async () => {
  const page = await LoginPage({ searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(page);
  assert.doesNotMatch(html, /<script|<link|<iframe|onSubmit|stylesheet/);
  assert.match(html, /<form(?=[^>]*method="post")(?=[^>]*action="\/api\/session")[^>]*>/);
  assert.match(html, /<input(?=[^>]*name="username")(?=[^>]*autoComplete="username")[^>]*>/);
  assert.match(html, /<input(?=[^>]*name="password")(?=[^>]*type="password")(?=[^>]*autoComplete="current-password")[^>]*>/);
  assert.match(html, /type="checkbox"[^>]*checked=""[^>]*name="remember"|type="checkbox"[^>]*name="remember"[^>]*checked=""/);
  assert.match(html, /<label[^>]*for="username"/);
  assert.match(html, /<label[^>]*for="password"/);
  assert.match(html, /focus-visible:outline-preview-accent/);
  assert.doesNotMatch(html, /role="alert"/);
});

test("credential error is server-rendered and untrusted query text is never echoed", async () => {
  const invalid = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ error: "credentials" }) }));
  assert.match(invalid, /role="alert"/);
  assert.match(invalid, /username or password is incorrect/);
  const malicious = renderToStaticMarkup(await LoginPage({ searchParams: Promise.resolve({ error: "<script>evil</script>" }) }));
  assert.doesNotMatch(malicious, /evil|role="alert"/);
});

test("logout requires a native POST confirmation and supports normal navigation", () => {
  const html = renderToStaticMarkup(<LogoutPage />);
  assert.match(html, /<form(?=[^>]*method="post")(?=[^>]*action="\/api\/session\/logout")[^>]*>/);
  assert.match(html, /href="\/"/);
});

test("App Router adapters fail closed and delegate verification and native posts", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "preview-routes-"));
  const previous = process.env.PREVIEW_AUTH_CONFIG;
  t.after(() => {
    if (previous === undefined) delete process.env.PREVIEW_AUTH_CONFIG;
    else process.env.PREVIEW_AUTH_CONFIG = previous;
    rmSync(directory, { recursive: true, force: true });
  });
  process.env.PREVIEW_AUTH_CONFIG = join(directory, "absent.json");
  const unavailable = await verify(new Request("https://preview.sophomores.co/api/session/verify"));
  assert.equal(unavailable.status, 503);
  assert.match(unavailable.headers.get("cache-control") ?? "", /no-store/);
  const head = await verifyHead(new Request("https://preview.sophomores.co/api/session/verify", { method: "HEAD" }));
  assert.equal(head.status, 503);
  assert.equal(await head.text(), "");
  const config = validateConfig({ origin: "https://preview.sophomores.co", username: "team", passwordSalt: "ab".repeat(16), passwordHash: "cd".repeat(64), signingSecret: "ef".repeat(32) });
  const path = join(directory, "config.json");
  writeFileSync(path, JSON.stringify(config));
  process.env.PREVIEW_AUTH_CONFIG = path;
  assert.equal((await verify(new Request(`${config.origin}/api/session/verify`))).status, 401);
  const token = issueSession(config, false, Math.floor(Date.now() / 1000));
  assert.equal((await verifyHead(new Request(`${config.origin}/api/session/verify`, { method: "HEAD", headers: { cookie: `${COOKIE_NAME}=${token}` } }))).status, 204);
  assert.equal((await login(new Request(`${config.origin}/api/session`, { method: "POST" }))).status, 403);
  const signedOut = await logout(new Request(`${config.origin}/api/session/logout`, { method: "POST", headers: { origin: config.origin } }));
  assert.equal(signedOut.status, 303);
  assert.match(signedOut.headers.get("set-cookie") ?? "", /Max-Age=0/);
});
