// Local visual acceptance only. No upstream proxy, credentials, mailer, or session storage.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
// Reuse tsx's installed esbuild and the project's existing Tailwind/PostCSS pipeline.
const tooling = createRequire(require.resolve("tsx"));
const { build } = tooling("esbuild");
const postcss = tooling("postcss");
const tailwind = tooling("@tailwindcss/postcss");
const directory = await mkdtemp(join(tmpdir(), "sphmrs-staff-visual-"));
const port = Number(process.env.STAFF_PREVIEW_PORT ?? 3077);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Invalid local fixture port.");
const origin = "http://127.0.0.1:" + port;
const allowedModes = new Set(["wrong-code", "unavailable", "verify-unavailable", "verified"]);

async function compile() {
  await build({
    absWorkingDir: root,
    entryPoints: ["tests/fixtures/staff-login-preview.tsx"],
    outfile: join(directory, "preview.js"),
    bundle: true,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    tsconfig: join(root, "tsconfig.json"),
    loader: { ".css": "empty", ".scss": "empty" }
  });
  const from = join(root, "src/styles/staff-login.css");
  const result = await postcss([tailwind()]).process(await readFile(from, "utf8"), { from });
  await writeFile(join(directory, "preview.css"), result.css);
}

await compile();
const vendorCss = await readFile(require.resolve("@payloadcms/next/css"));
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  const send = (status, type, body) => {
    response.writeHead(status, { "Content-Type": type });
    response.end(body);
  };
  const json = (status, body) => send(status, "application/json", JSON.stringify(body));
  try {
    if (request.headers.host !== "127.0.0.1:" + port || (request.headers.origin && request.headers.origin !== origin)) {
      json(403, { code: "FIXTURE_ONLY", message: "Local fixture origin required." });
      return;
    }
    const url = new URL(request.url ?? "/", origin);
    if (url.pathname.startsWith("/api/")) {
      const referer = new URL(request.headers.referer ?? origin);
      const mode = allowedModes.has(referer.searchParams.get("mode")) ? referer.searchParams.get("mode") : "wrong-code";
      let length = 0;
      for await (const chunk of request) {
        length += chunk.length;
        if (length > 16_384) { json(413, { code: "FIXTURE_ONLY", message: "Fixture request too large." }); return; }
      }
      const paths = ["/api/auth/email-otp/send-verification-otp", "/api/auth/sign-in/magic-link", "/api/auth/sign-in/email-otp"];
      if (request.method !== "POST" || !paths.includes(url.pathname)) {
        json(503, { code: "FIXTURE_ONLY", message: "No backend exists in this visual fixture." });
        return;
      }
      const delay = Math.min(5000, Math.max(0, Number(referer.searchParams.get("delay")) || 0));
      if (delay) await new Promise((done) => setTimeout(done, delay));
      const verifying = url.pathname.endsWith("/sign-in/email-otp");
      if (mode === "unavailable" || (mode === "verify-unavailable" && verifying)) {
        json(503, { code: "UNAVAILABLE", message: "Synthetic delivery failure." });
      } else if (verifying && mode !== "verified") {
        json(400, { code: "INVALID_OTP", message: "Synthetic incorrect code." });
      } else {
        // No Set-Cookie header is ever emitted. 'verified' only exercises fixture navigation.
        json(200, { success: true });
      }
      return;
    }
    if (request.method !== "GET") { send(405, "text/plain", "Fixture method not allowed."); return; }
    if (url.pathname === "/" || url.pathname === "/admin/login") {
      const theme = url.searchParams.get("theme") === "light" ? "light" : "dark";
      response.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
      send(200, "text/html; charset=utf-8", '<!doctype html><html lang="en" data-theme="' + theme + '"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Staff login · synthetic visual fixture</title><link rel="stylesheet" href="/vendor.css"><link rel="stylesheet" href="/preview.css"></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
    } else if (url.pathname === "/preview.js") {
      await compile();
      send(200, "text/javascript", await readFile(join(directory, "preview.js")));
    } else if (url.pathname === "/preview.css") {
      const from = join(root, "src/styles/staff-login.css");
      const result = await postcss([tailwind()]).process(await readFile(from, "utf8"), { from });
      send(200, "text/css", result.css);
    } else if (url.pathname === "/vendor.css") {
      send(200, "text/css", vendorCss);
    } else if (url.pathname === "/fixture-complete" && url.search === "") {
      send(200, "text/plain", "Synthetic verification completed. No real staff session was created.");
    } else {
      send(404, "text/plain", "No route exists in this visual fixture.");
    }
  } catch (error) {
    console.error("Staff visual fixture request failed:", error);
    if (!response.headersSent) json(500, { code: "FIXTURE_ONLY", message: "Visual fixture unavailable." });
    else response.end();
  }
});
server.listen(port, "127.0.0.1", () => console.log(origin + "/admin/login · synthetic APIs only · " + directory));
server.on("error", (error) => { console.error(error); process.exitCode = 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => server.close());
