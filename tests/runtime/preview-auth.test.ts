import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { once } from "node:events";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs";
import { request, type IncomingHttpHeaders } from "node:http";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test, { type TestContext } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const origin = "https://preview.sophomores.co";
// Test-only credentials are generated per run; retain HTML-special and Unicode coverage.
const password = `${randomBytes(24).toString("base64url")} <& 🔥`;
const salt = "a1".repeat(16);
const config = {
  origin,
  username: "team",
  passwordSalt: salt,
  passwordHash: scryptSync(password, Buffer.from(salt, "hex"), 64, {
    N: 16384,
    r: 8,
    p: 1
  }).toString("hex"),
  signingSecret: "b2".repeat(32)
};

async function unusedPort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  return address.port;
}

async function startNext(t: TestContext, env: Record<string, string> = {}) {
  assert.ok(
    existsSync(join(root, ".next/BUILD_ID")),
    "Run pnpm build before the production-runtime suite"
  );
  const port = await unusedPort();
  const directory = mkdtempSync(join(tmpdir(), "next-preview-runtime-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  // Isolate Next's automatic .env loading as well as the child environment.
  const standalone = join(root, ".next/standalone");
  symlinkSync(
    join(standalone, "node_modules"),
    join(directory, "node_modules"),
    "dir"
  );
  symlinkSync(join(root, "public"), join(directory, "public"), "dir");
  mkdirSync(join(directory, ".next"));
  for (const name of readdirSync(join(standalone, ".next"))) {
    if (name !== "static")
      symlinkSync(
        join(standalone, ".next", name),
        join(directory, ".next", name)
      );
  }
  symlinkSync(
    join(root, ".next/static"),
    join(directory, ".next/static"),
    "dir"
  );
  copyFileSync(
    join(root, ".next/standalone/server.js"),
    join(directory, "server.js")
  );
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ private: true })
  );
  // Deliberately do not inherit .env credentials, NODE_OPTIONS, or other secrets.
  const child = spawn(process.execPath, [join(directory, "server.js")], {
    cwd: directory,
    env: {
      PATH: process.env.PATH ?? "",
      NODE_ENV: "production",
      NEXT_TELEMETRY_DISABLED: "1",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      ...env
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let logs = "";
  child.stdout.on("data", (chunk: Buffer) => {
    logs = `${logs}${chunk.toString()}`.slice(-12000);
  });
  child.stderr.on("data", (chunk: Buffer) => {
    logs = `${logs}${chunk.toString()}`.slice(-12000);
  });
  t.after(async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const stopped = once(child, "exit");
    child.kill("SIGTERM");
    const timer = setTimeout(() => child.kill("SIGKILL"), 3000);
    try {
      await stopped;
    } finally {
      clearTimeout(timer);
    }
  });
  const base = `http://127.0.0.1:${port}`;
  const call = (path: string, init: RequestInit = {}) =>
    fetch(`${base}${path}`, {
      ...init,
      redirect: "manual",
      signal: AbortSignal.timeout(10000)
    });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    assert.equal(child.exitCode, null, `Next exited before readiness: ${logs}`);
    try {
      const response = await call("/login");
      await response.text();
      ready = true;
      break;
    } catch {
      /* Retry only while the bounded server readiness condition is false. */
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.equal(ready, true, `Next must become reachable: ${logs}`);
  return { call, port, logs: () => logs };
}

function fixture(t: TestContext): string {
  const directory = mkdtempSync(join(tmpdir(), "next-preview-auth-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, "config.json");
  writeFileSync(path, JSON.stringify(config), { mode: 0o600 });
  return path;
}

function formHeaders(ip = "192.0.2.10"): Record<string, string> {
  return {
    origin,
    "content-type": "application/x-www-form-urlencoded",
    "x-real-ip": ip
  };
}

function form(remember = true): URLSearchParams {
  return new URLSearchParams({
    username: "team",
    password,
    ...(remember ? { remember: "yes" } : {})
  });
}

async function rawPost(
  port: number,
  headers: string[],
  chunks: Buffer[]
): Promise<{ status: number; headers: IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: "127.0.0.1",
        port,
        path: "/api/session",
        method: "POST",
        headers
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body })
        );
        res.on("error", reject);
      }
    );
    req.setTimeout(10000, () =>
      req.destroy(new Error("Raw request timed out"))
    );
    req.on("error", reject);
    for (const chunk of chunks) req.write(chunk);
    req.end();
  });
}

function assertPrivate(response: Response): void {
  assert.match(response.headers.get("cache-control") ?? "", /no-store/);
  assert.equal(response.headers.get("www-authenticate"), null);
}

function assertLoginRedirect(response: Response): void {
  assert.ok(
    [302, 303, 307, 308].includes(response.status),
    `Expected login redirect, got ${response.status}`
  );
  assert.equal(
    new URL(response.headers.get("location") ?? "", origin).pathname,
    "/login"
  );
}

test(
  "built Next fails closed without valid runtime configuration, unless public is explicit",
  { timeout: 45000 },
  async (t) => {
    const closed = await startNext(t, {
      PREVIEW_AUTH_CONFIG: "/nonexistent/synthetic-preview-auth.json"
    });
    for (const path of [
      "/",
      "/login",
      "/api/session/verify",
      "/_next/static/probe.js",
      "/_next/static/chunks/auth.css",
      "/favicon.ico",
      "/api/probe"
    ]) {
      const response = await closed.call(path);
      assert.equal(response.status, 503, `Missing configuration: ${path}`);
      assertPrivate(response);
      assert.doesNotMatch(
        await response.text(),
        /synthetic-preview-auth|signingSecret|passwordHash/
      );
    }
    const invalid = await startNext(t, {
      PREVIEW_AUTH_MODE: "publc",
      PREVIEW_AUTH_CONFIG: "/nonexistent/config.json"
    });
    assert.equal((await invalid.call("/")).status, 503);
    const open = await startNext(t, { PREVIEW_AUTH_MODE: "public" });
    assert.equal((await open.call("/")).status, 200);
  }
);

test(
  "built Next preserves private assets, native login forms, sessions, and hostile-request defenses",
  { timeout: 60000 },
  async (t) => {
    const server = await startNext(t, { PREVIEW_AUTH_CONFIG: fixture(t) });
    const login = await server.call("/login");
    assert.equal(login.status, 200);
    assertPrivate(login);
    assert.equal(
      login.headers.get("referrer-policy"),
      "same-origin",
      "Native form POST must retain its same-origin Origin header"
    );
    const markup = await login.text();
    assert.match(markup, /<form[^>]+action="\/api\/session"/);
    assert.match(markup, /method="post"/i);
    assert.match(markup, /autocomplete="username"/i);
    assert.match(markup, /autocomplete="current-password"/i);
    assert.match(markup, /<label[^>]*for="[^" ]+"/);
    assert.doesNotMatch(markup, new RegExp(config.passwordHash));
    const csp = login.headers.get("content-security-policy") ?? "";
    assert.match(csp, /default-src 'none'/);
    assert.match(csp, /style-src 'self'/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval/);
    assert.doesNotMatch(csp, /script-src (?!'none')/);
    assert.match(csp, /form-action 'self'/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.doesNotMatch(markup, /\/__preview\//);
    const loginStylesheets = [...markup.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)]
      .map(([tag]) => tag.match(/href="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&"))
      .filter((path): path is string => Boolean(path));
    assert.ok(loginStylesheets.length > 0, "Login must load its compiled Tailwind root stylesheet");
    let loginCss = "";
    for (const path of loginStylesheets) {
      assert.match(path, /^\/_next\/static\/(?:chunks|css)\/[A-Za-z0-9_-]+\.css(?:\?|$)/);
      const stylesheet = await server.call(path);
      assert.equal(stylesheet.status, 200, `Anonymous auth stylesheet ${path}`);
      assert.match(stylesheet.headers.get("content-type") ?? "", /text\/css/);
      assert.equal(stylesheet.headers.get("x-content-type-options"), "nosniff");
      loginCss += await stylesheet.text();
      const head = await server.call(path, { method: "HEAD" });
      assert.equal(head.status, 200);
      assert.equal(await head.text(), "");
      assert.equal((await server.call(path, { method: "POST" })).status, 401);
    }
    assert.match(loginCss, /\.bg-preview-surface/);
    assert.match(loginCss, /--color-preview-surface/);
    assert.doesNotMatch(loginCss, /--color-teaser-|wordmark|@font-face|Manrope|Nib|url\(/i);
    const loginScripts = [...markup.matchAll(/<script\b[^>]*src="([^"]+)"/g)]
      .map((match) => match[1].replaceAll("&amp;", "&"));
    for (const path of loginScripts) {
      assert.equal((await server.call(path)).status, 401, `Auth JS stays private ${path}`);
    }

    const retiredPaths = [
      "/__preview/login",
      "/__preview/logout",
      "/__preview/session",
      "/__preview/session/logout",
      "/__preview/verify"
    ];
    for (const path of retiredPaths) {
      for (const method of ["GET", "HEAD", "POST"]) {
        const response = await server.call(path, { method });
        assert.equal(response.status, 401, `Retired route ${method} ${path}`);
        assertPrivate(response);
      }
    }

    for (const path of [
      "/",
      "/account",
      "/account/continue",
      "/api/probe",
      "/favicon.ico",
      "/static-fallback.css",
      "/_next/static/media/probe.woff2",
      "/_next/static/chunks/probe.css.map",
      "/_next/static/probe.js",
      "/_next/image?url=%2Ffavicon.ico&w=64&q=75"
    ]) {
      const response = await server.call(path, {
        headers: { accept: "text/html" }
      });
      if (["/", "/account", "/account/continue"].includes(path)) {
        assert.notEqual(
          response.status,
          500,
          `Document ${path}: ${server.logs()}`
        );
        assertLoginRedirect(response);
      } else assert.equal(response.status, 401);
      assertPrivate(response);
      assert.doesNotMatch(
        await response.text(),
        /<main|webpackChunk|data:image/
      );
    }
    const forgedHeaders: Record<string, string>[] = [
      { "x-middleware-subrequest": "proxy:proxy:proxy:proxy:proxy" },
      {
        "x-middleware-subrequest":
          "middleware:middleware:middleware:middleware:middleware"
      },
      {
        "x-preview-authenticated": "1",
        "x-forwarded-host": "localhost",
        "x-forwarded-proto": "https"
      }
    ];
    for (const headers of forgedHeaders)
      assertLoginRedirect(
        await server.call("/account", {
          headers: { ...headers, accept: "text/html" }
        })
      );
    for (const initialPath of [
      "/login",
      "/login?_rsc=probe",
      "/logout?_rsc=probe",
      "/api/session/verify?_rsc=probe",
      ...loginStylesheets
    ]) {
      let path = initialPath;
      let result = await server.call(path, {
        headers: { rsc: "1", accept: "text/x-component" }
      });
      // Next may first canonicalize the RSC cache key with a redirect. Follow
      // only the same auth path locally, never a user-controlled destination.
      for (
        let redirect = 0;
        result.status === 307 && redirect < 3;
        redirect++
      ) {
        const location = new URL(result.headers.get("location") ?? "", origin);
        assert.equal(location.pathname, new URL(initialPath, origin).pathname);
        path = `${location.pathname}${location.search}`;
        result = await server.call(path, {
          headers: { rsc: "1", accept: "text/x-component" }
        });
      }
      assert.equal(result.status, 401, `Unauthenticated RSC: ${initialPath}`);
      assert.doesNotMatch(
        result.headers.get("content-type") ?? "",
        /text\/x-component/
      );
    }
    assert.equal((await server.call("/api/session/verify")).status, 401);
    assert.equal(
      (await server.call("/api/session/verify", { method: "HEAD" })).status,
      401
    );

    // ASCII-only so HTML escaping cannot conceal accidental credential reflection.
    const wrongPassword = `${password.split(" ")[0]}-incorrect`;
    const wrong = await server.call("/api/session", {
      method: "POST",
      headers: formHeaders(),
      body: new URLSearchParams({
        username: "team",
        password: wrongPassword
      })
    });
    assert.equal(wrong.status, 303);
    assert.match(wrong.headers.get("location") ?? "", /error=credentials/);
    assert.equal((await wrong.text()).includes(wrongPassword), false);
    const signedIn = await server.call("/api/session", {
      method: "POST",
      headers: formHeaders(),
      body: form()
    });
    assert.equal(signedIn.status, 303);
    assert.equal(
      new URL(signedIn.headers.get("location") ?? "", origin).pathname,
      "/"
    );
    const setCookie = signedIn.headers.get("set-cookie") ?? "";
    for (const flag of [
      "__Host-sophomores-preview=",
      "Secure",
      "HttpOnly",
      "SameSite=Lax",
      "Path=/",
      "Max-Age=2592000"
    ])
      assert.ok(setCookie.includes(flag), flag);
    const cookie = setCookie.split(";")[0];
    for (const path of retiredPaths) {
      assert.equal(
        (await server.call(path, { headers: { cookie } })).status,
        404,
        `Retired route must not remain mounted: ${path}`
      );
    }
    for (let reuse = 0; reuse < 3; reuse++) {
      const verified = await server.call("/api/session/verify", {
        headers: { cookie }
      });
      assert.equal(verified.status, 204);
      assert.equal(
        verified.headers.get("set-cookie"),
        null,
        "Session expiry must not slide"
      );
    }
    const home = await server.call("/", { headers: { cookie } });
    assert.equal(home.status, 200);
    const homeMarkup = await home.text();
    const assetPaths = [
      ...new Set(
        [
          ...homeMarkup.matchAll(
            /(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g
          )
        ].map((match) => match[1].replaceAll("&amp;", "&"))
      )
    ];
    assert.ok(
      assetPaths.length > 0,
      "Authenticated production page must reference real compiled assets"
    );
    const siteStylesheets = assetPaths.filter((path) => new URL(path, origin).pathname.endsWith(".css"));
    assert.ok(siteStylesheets.length > 0, "Site must load its own stylesheet graph");
    assert.ok(siteStylesheets.every((path) => !loginStylesheets.includes(path)), "Auth and site CSS graphs must remain separate");
    let siteCss = "";
    for (const path of assetPaths) {
      const anonymous = await server.call(path);
      if (siteStylesheets.includes(path)) {
        assert.equal(anonymous.status, 200, `Compiled CSS is non-secret: ${path}`);
        assert.match(anonymous.headers.get("content-type") ?? "", /text\/css/);
        siteCss += await anonymous.text();
      } else {
        assert.equal(anonymous.status, 401, `Non-CSS asset stays private: ${path}`);
      }
      assert.equal(
        (await server.call(path, { headers: { cookie } })).status,
        200,
        `Authenticated asset ${path}`
      );
    }
    assert.match(siteCss, /--color-teaser-/);
    assert.doesNotMatch(siteCss, /preview-surface|preview-accent|preview-foreground/);
    const sessionOnly = await server.call("/api/session", {
      method: "POST",
      headers: formHeaders(),
      body: form(false)
    });
    assert.equal(sessionOnly.status, 303);
    assert.doesNotMatch(
      sessionOnly.headers.get("set-cookie") ?? "",
      /Max-Age|Expires/i
    );
    const logoutPage = await server.call("/logout", {
      headers: { cookie }
    });
    assert.equal(logoutPage.status, 200);
    assert.equal(logoutPage.headers.get("referrer-policy"), "same-origin");
    assert.match(
      await logoutPage.text(),
      /action="\/api\/session\/logout"/
    );
    const rejectedLogout = await server.call("/api/session/logout", {
      method: "POST",
      headers: { origin: "https://untrusted.example", cookie }
    });
    assert.equal(rejectedLogout.status, 403);
    const logout = await server.call("/api/session/logout", {
      method: "POST",
      headers: { origin, cookie }
    });
    assert.equal(logout.status, 303);
    assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/);
    assert.equal((await server.call("/api/session/verify")).status, 401);

    const rawHeaders = [
      "Host",
      `127.0.0.1:${server.port}`,
      "Origin",
      origin,
      "Content-Type",
      "application/x-www-form-urlencoded",
      "X-Real-IP",
      "192.0.2.20"
    ];
    const oversized = await rawPost(
      server.port,
      [...rawHeaders, "Transfer-Encoding", "chunked"],
      [Buffer.from("username=team&password="), Buffer.alloc(4200, 97)]
    );
    assert.equal(
      oversized.status,
      413,
      "Chunked requests must obey the body limit"
    );
    const invalidUtf8 = await rawPost(server.port, rawHeaders, [
      Buffer.from("username=team&password="),
      Buffer.from([0xc3, 0x28])
    ]);
    assert.equal(invalidUtf8.status, 400, "Invalid UTF-8 must be rejected");
    const duplicateOrigin = await rawPost(
      server.port,
      [...rawHeaders, "Origin", origin],
      [Buffer.from(form().toString())]
    );
    assert.ok(
      [400, 403].includes(duplicateOrigin.status),
      "Duplicate Origin must fail closed"
    );
    const duplicateField = await server.call("/api/session", {
      method: "POST",
      headers: formHeaders(),
      body: `${form()}&username=team`
    });
    assert.equal(duplicateField.status, 400);
    const crossOrigin = await server.call("/api/session", {
      method: "POST",
      headers: { ...formHeaders(), origin: "https://untrusted.example" },
      body: form()
    });
    assert.equal(crossOrigin.status, 403);

    for (let attempt = 0; attempt < 5; attempt++) {
      const failed = await server.call("/api/session", {
        method: "POST",
        headers: formHeaders("192.0.2.30"),
        body: new URLSearchParams({ username: "team", password: "incorrect" })
      });
      assert.equal(failed.status, 303, `Failed attempt ${attempt + 1}`);
    }
    const limited = await server.call("/api/session", {
      method: "POST",
      headers: formHeaders("192.0.2.30"),
      body: form()
    });
    assert.equal(limited.status, 429);
    assert.ok(limited.headers.get("retry-after"));
    assert.doesNotMatch(
      server.logs(),
      new RegExp(
        `${password.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|${config.passwordHash}|${config.signingSecret}`
      )
    );
  }
);
