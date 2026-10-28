import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { proxy } from "../../proxy";
import { COOKIE_NAME, issueSession, validateConfig } from "../../lib/preview-auth/session";

const config = validateConfig({ origin: "https://preview.sophomores.co", username: "team", passwordSalt: "ab".repeat(16), passwordHash: "cd".repeat(64), signingSecret: "ef".repeat(32) });

test("private proxy fails closed across documents, APIs, compiled assets and spoofed headers", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "preview-proxy-"));
  const configPath = join(directory, "config.json");
  writeFileSync(configPath, JSON.stringify(config));
  const previousMode = process.env.PREVIEW_AUTH_MODE;
  const previousConfig = process.env.PREVIEW_AUTH_CONFIG;
  t.after(() => {
    if (previousMode === undefined) delete process.env.PREVIEW_AUTH_MODE;
    else process.env.PREVIEW_AUTH_MODE = previousMode;
    if (previousConfig === undefined) delete process.env.PREVIEW_AUTH_CONFIG;
    else process.env.PREVIEW_AUTH_CONFIG = previousConfig;
    rmSync(directory, { recursive: true, force: true });
  });
  process.env.PREVIEW_AUTH_MODE = "protected";
  process.env.PREVIEW_AUTH_CONFIG = configPath;
  const request = (path: string, headers: Record<string, string> = {}, method = "GET", host = "preview.sophomores.co") => new NextRequest(`https://${host}${path}`, { method, headers });
  const call = (path: string, headers: Record<string, string> = {}, method = "GET") => proxy(request(path, headers, method));
  await t.test("missing or invalid config fails closed before a runtime config is loaded", () => {
    delete process.env.PREVIEW_AUTH_CONFIG;
    assert.equal(call("/login").status, 503);
    assert.equal(call("/_next/static/chunks/auth.css").status, 503);
    process.env.PREVIEW_AUTH_CONFIG = join(directory, "missing.json");
    assert.equal(call("/login").status, 503);
    const invalidPath = join(directory, "invalid.json");
    writeFileSync(invalidPath, "{}");
    process.env.PREVIEW_AUTH_CONFIG = invalidPath;
    assert.equal(call("/login").status, 503);
    process.env.PREVIEW_AUTH_CONFIG = configPath;
  });
  await t.test("documents redirect to fixed canonical login without reflecting destination", () => {
    const response = call("/account?next=https://evil.test", { accept: "text/html" });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "https://preview.sophomores.co/login");
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.match(response.headers.get("x-robots-tag") ?? "", /noindex/);
    assert.equal(proxy(request("/", { accept: "text/html", host: "evil.test", "x-forwarded-host": "evil.test" }, "GET", "evil.test")).headers.get("location"), "https://preview.sophomores.co/login");
  });
  await t.test("assets, APIs, RSC and writes never redirect to HTML or disclose content", () => {
    for (const path of ["/_next/static/chunks/app.js", "/_next/static/media/font.woff2", "/_next/image?url=%2Fphoto.png", "/photo.png", "/api/private", "/unknown"]) {
      assert.equal(call(path).status, 401, path);
    }
    assert.equal(call("/", { accept: "text/html", rsc: "1" }).status, 401);
    assert.equal(call("/?_rsc=secret", { accept: "text/html" }).status, 401);
    assert.equal(call("/", { accept: "text/html" }, "POST").status, 401);
    assert.equal(call("/_next/static/app.js", { accept: "text/html" }).status, 401);
  });
  await t.test("only read-only compiled CSS is public, without opening other asset classes", () => {
    for (const path of ["/_next/static/chunks/a1b2c3.css", "/_next/static/css/auth-theme_1.css", "/_next/static/chunks/site.css?v=1"]) {
      for (const method of ["GET", "HEAD"]) {
        const response = call(path, {}, method);
        assert.equal(response.headers.get("x-middleware-next"), "1", `${method} ${path}`);
        assert.match(response.headers.get("cache-control") ?? "", /no-store/);
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
      }
      for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) {
        assert.equal(call(path, {}, method).status, 401, `${method} ${path}`);
      }
      const rscHeaders: Record<string, string>[] = [{ rsc: "1" }, { accept: "text/x-component" }];
      for (const headers of rscHeaders) {
        assert.equal(call(path, headers).status, 401, `RSC ${path}`);
      }
      assert.equal(call(`${path}${path.includes("?") ? "&" : "?"}_rsc=probe`).status, 401);
    }
    for (const path of [
      "/styles.css", "/app/(auth)/index.css", "/_next/static/media/font.css",
      "/_next/static/chunks/nested/auth.css", "/_next/static/chunks/.css",
      "/_next/static/chunks/auth.css.map", "/_next/static/chunks/auth.css.js",
      "/_next/static/chunks/auth.CSS", "/_next/static/chunks/auth.css/",
      "/_next/static/chunks/%2e%2e%2fauth.css", "/_next/static/chunks/..%5cauth.css",
      "/_next/static/chunks/sub%2fauth.css", "/_next/static/chunks/sub%5cauth.css",
      "/_next/static/chunks/%252e%252e%252fauth.css", "/_next/static/chunks/auth%00.css",
      "/_next/static/chunks/auth.css%00", "/_next/static/chunks/auth.css%0a",
      "/_next/static/chunks/auth%0d.css", "/_next/static/chunks/auth.css;source.map"
    ]) {
      for (const method of ["GET", "HEAD"]) assert.equal(call(path, {}, method).status, 401, `${method} ${path}`);
    }
  });
  await t.test("only exact auth path and method pairs are public", () => {
    for (const path of ["/login", "/logout", "/api/session/verify"]) {
      assert.equal(call(path).headers.get("x-middleware-next"), "1", path);
      assert.equal(call(path, {}, "HEAD").headers.get("x-middleware-next"), "1", path);
    }
    for (const path of ["/api/session", "/api/session/logout"]) assert.equal(call(path, {}, "POST").headers.get("x-middleware-next"), "1");
    for (const path of ["/login/extra", "/logout/extra", "/api/session", "/api/session/verify/extra"]) assert.equal(call(path).status, 401);
    assert.equal(call("/login", {}, "POST").status, 401);
    assert.equal(call("/login", { rsc: "1" }).status, 401);
    const csp = call("/login").headers.get("content-security-policy") ?? "";
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /style-src 'self'/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
    assert.match(csp, /form-action 'self'/);
    assert.equal(call("/login").headers.get("referrer-policy"), "same-origin");
    assert.equal(call("/logout").headers.get("referrer-policy"), "same-origin");
    assert.equal(call("/api/session/verify").headers.get("referrer-policy"), "no-referrer");
  });
  await t.test("retired preview-prefixed routes are not authentication exceptions", () => {
    for (const path of ["/__preview/login", "/__preview/logout", "/__preview/session", "/__preview/session/logout", "/__preview/verify"]) {
      for (const method of ["GET", "HEAD", "POST"]) {
        const response = call(path, {}, method);
        assert.equal(response.status, 401, `${method} ${path}`);
        assert.equal(response.headers.get("x-middleware-next"), null);
      }
      const document = call(path, { accept: "text/html" });
      assert.equal(document.status, 303, path);
      assert.equal(document.headers.get("location"), `${config.origin}/login`);
    }
  });
  await t.test("forged trust and middleware headers do not confer authentication", () => {
    assert.equal(call("/_next/static/app.js", { "x-forwarded-host": "localhost", "x-real-ip": "127.0.0.1", "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy", authorization: "Basic dGVhbTpwYXNz" }).status, 401);
  });
  await t.test("signed existing cookie works on private content beyond the CSS exemption", () => {
    const token = issueSession(config, true, Math.floor(Date.now() / 1000));
    for (const path of ["/", "/api/private", "/_next/static/app.js", "/photo.png"]) {
      const response = call(path, { cookie: `${COOKIE_NAME}=${token}` });
      assert.equal(response.headers.get("x-middleware-next"), "1", path);
      assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    }
    assert.equal(call("/api/private", { cookie: `${COOKIE_NAME}=${token}x` }).status, 401);
  });
  await t.test("invalid modes fail closed even after successful configuration", () => {
    process.env.PREVIEW_AUTH_MODE = "bogus";
    assert.equal(call("/").status, 503);
  });
  await t.test("public mode is explicit and cannot expose the preview hostname", () => {
    process.env.PREVIEW_AUTH_MODE = "public";
    assert.equal(proxy(request("/", {}, "GET", "sophomores.co")).headers.get("x-middleware-next"), "1");
    assert.notEqual(call("/").headers.get("x-middleware-next"), "1");
    assert.notEqual(proxy(request("/", { host: "preview.sophomores.co" }, "GET", "localhost")).headers.get("x-middleware-next"), "1");
    delete process.env.PREVIEW_AUTH_MODE;
    assert.equal(call("/").status, 401);
  });
});
