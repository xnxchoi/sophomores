// Loopback-only, in-memory visual fixture. No upstream, environment credentials,
// identity, cookie, database, mail, or production auth override is used here.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { recoveryReviewSchema } from "../../lib/member-auth/recovery/contracts.ts";

if (process.env.NODE_ENV === "production")
  throw new Error("Visual fixtures are not production servers");
const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const tooling = createRequire(require.resolve("tsx"));
const { build } = tooling("esbuild");
const postcss = tooling("postcss");
const tailwind = tooling("@tailwindcss/postcss");
const directory = await mkdtemp(join(tmpdir(), "sphmrs-review-visual-"));
const port = Number(process.env.RECOVERY_REVIEW_PREVIEW_PORT ?? 3079);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid fixture port");
const origin = `http://127.0.0.1:${port}`;
const configuration = z.strictObject({
  mode: z.enum(["success", "conflict", "unavailable", "malformed"]),
  delayMs: z.int().min(0).max(5000)
});
let state = { mode: "success", delayMs: 0, revision: 0 };
let compiling;
async function compile() {
  if (compiling) return compiling;
  compiling = (async () => {
    await build({
      absWorkingDir: root,
      entryPoints: ["tests/fixtures/recovery-review-preview.tsx"],
      outfile: join(directory, "preview.js"),
      bundle: true,
      platform: "browser",
      format: "iife",
      jsx: "automatic",
      define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' },
      tsconfig: join(root, "tsconfig.json"),
      loader: { ".css": "empty", ".scss": "empty" },
      plugins: [
        {
          name: "fixture-document-only",
          setup(builder) {
            builder.onResolve({ filter: /^@payloadcms\/ui$/ }, () => ({
              path: resolve(root, "tests/fixtures/recovery-review-payload.tsx")
            }));
          }
        }
      ]
    });
    const from = join(root, "styles/staff-login.css");
    const css =
      (await readFile(from, "utf8")) +
      '\n@source "../tests/fixtures/recovery-review-preview.tsx";';
    const output = await postcss([tailwind()]).process(css, { from });
    await writeFile(join(directory, "preview.css"), output.css);
  })();
  try {
    await compiling;
  } finally {
    compiling = undefined;
  }
}
const vendorCss = await readFile(require.resolve("@payloadcms/next/css"));
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
  const send = (status, type, body) => {
    response.writeHead(status, { "Content-Type": type });
    response.end(body);
  };
  const json = (status, body) =>
    send(status, "application/json", JSON.stringify(body));
  try {
    if (
      request.headers.host !== `127.0.0.1:${port}` ||
      (request.headers.origin && request.headers.origin !== origin) ||
      request.headers["sec-fetch-site"] === "cross-site"
    ) {
      json(403, { success: false });
      return;
    }
    const url = new URL(request.url ?? "/", origin);
    if (url.origin !== origin || url.search) {
      json(400, { success: false });
      return;
    }
    if (request.method === "POST" && request.headers.origin !== origin) {
      json(403, { success: false });
      return;
    }
    const body = async () => {
      if (request.headers["content-type"]?.split(";")[0] !== "application/json")
        throw new Error("JSON only");
      let bytes = 0;
      const chunks = [];
      for await (const chunk of request) {
        bytes += chunk.length;
        if (bytes > 4096) throw new Error("Fixture body too large");
        chunks.push(chunk);
      }
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    };
    if (url.pathname === "/fixture/state") {
      if (request.method === "GET") json(200, state);
      else if (request.method === "POST") {
        const parsed = configuration.safeParse(await body());
        if (!parsed.success) {
          json(400, { success: false });
          return;
        }
        state = { ...parsed.data, revision: 0 };
        json(200, { fixture: true });
      } else json(405, { success: false });
      return;
    }
    if (
      url.pathname ===
        "/api/member/recovery/019a4000-0000-7000-8000-000000000001/review" &&
      request.method === "POST"
    ) {
      const input = recoveryReviewSchema.safeParse(await body());
      if (!input.success) {
        json(400, { success: false });
        return;
      }
      const captured = state;
      if (captured.delayMs)
        await new Promise((done) => setTimeout(done, captured.delayMs));
      if (
        captured !== state ||
        captured.mode === "conflict" ||
        input.data.expectedRevision !== state.revision
      ) {
        json(409, { success: false });
        return;
      }
      if (captured.mode === "unavailable") {
        json(503, { success: false });
        return;
      }
      if (captured.mode === "malformed") {
        json(200, { success: true, data: { status: "recovered" } });
        return;
      }
      state = { ...state, revision: state.revision + 1 };
      json(200, { success: true, data: { revision: state.revision } });
      return;
    }
    if (url.pathname.startsWith("/api/")) {
      json(503, { success: false, fixture: true });
      return;
    }
    if (request.method !== "GET") {
      json(405, { success: false });
      return;
    }
    if (url.pathname === "/") {
      response.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
      );
      send(
        200,
        "text/html; charset=utf-8",
        '<!doctype html><html lang="en" data-theme="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Synthetic review preview</title><link rel="stylesheet" href="/vendor.css"><link rel="stylesheet" href="/preview.css"></head><body><div id="root"></div><script src="/preview.js"></script></body></html>'
      );
    } else if (url.pathname === "/preview.js") {
      await compile();
      send(
        200,
        "text/javascript",
        await readFile(join(directory, "preview.js"))
      );
    } else if (url.pathname === "/preview.css") {
      await compile();
      send(200, "text/css", await readFile(join(directory, "preview.css")));
    } else if (url.pathname === "/vendor.css") send(200, "text/css", vendorCss);
    else send(404, "text/plain", "No fixture route");
  } catch {
    if (!response.headersSent) json(400, { success: false, fixture: true });
    else response.end();
  }
});
server.requestTimeout = 5000;
server.headersTimeout = 5000;
server.listen(port, "127.0.0.1", () =>
  console.log(origin + " · synthetic review controls only")
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => server.close());
