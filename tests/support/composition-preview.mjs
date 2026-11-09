// Synthetic, loopback-only preview of actual production composition components.
// No env loader, provider request, auth session, database or real account data.
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.NODE_ENV === "production") {
  throw new Error("Test fixtures cannot run as production servers");
}
const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(import.meta.url);
const tooling = createRequire(require.resolve("tsx"));
const { build } = tooling("esbuild");
const postcss = tooling("postcss");
const tailwind = tooling("@tailwindcss/postcss");
const checkoutPreview = process.argv.includes("--checkout");
const port = checkoutPreview ? 3082 : 3081;
const origin = `http://127.0.0.1:${port}`;

const bundle = await build({
  absWorkingDir: root,
  entryPoints: [checkoutPreview ? "tests/fixtures/checkout-preview.tsx" : "tests/fixtures/composition-preview.tsx"],
  outfile: "preview.js",
  write: false,
  bundle: true,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  tsconfig: join(root, "tsconfig.json"),
  define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' },
  loader: { ".css": "empty", ".scss": "empty" },
  plugins: [
    {
      name: "composition-fixture-boundaries",
      setup(builder) {
        builder.onResolve(
          {
            filter:
              /^@\/(providers\/MiddleMan|components\/core\/cursorWrapper|components\/ui\/skeleton)$/
          },
          ({ path }) => ({
            path,
            namespace: "composition-fixture"
          })
        );
        builder.onLoad(
          { filter: /.*/, namespace: "composition-fixture" },
          ({ path }) => ({
            loader: "js",
            // No Skeleton is mounted here; this fixture does not validate its behavior.
            contents: path.endsWith("skeleton")
              ? 'export function Skeleton() { throw new Error("Skeleton is outside this composition fixture validation"); }'
              : path.endsWith("MiddleMan")
              ? "export function useIsMobile() { return { isMobile: false }; }"
              : `export function useCursorHandlers(_kind, { onEnter, onLeave } = {}) {
              return { onMouseEnter: onEnter, onMouseLeave: onLeave };
            }
            export function useDomCursor({ onEnter, onLeave } = {}) {
              return { onMouseEnter: onEnter, onMouseLeave: onLeave };
            }`
          })
        );
      }
    }
  ]
});
const from = join(root, "src/styles/globals.css");
const css = await postcss([tailwind()]).process(
  (await readFile(from, "utf8")) +
    (checkoutPreview ? '\n@source "../tests/fixtures/checkout-preview.tsx";' : '\n@source "../tests/fixtures/composition-preview.tsx";'),
  { from }
);
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>UI test fixture</title><link rel="icon" href="data:,">
<link rel="stylesheet" href="/preview.css"></head>
<body><div id="root"></div><script src="/preview.js" defer></script></body></html>`;
const assets = new Map([
  ["/", { type: "text/html; charset=utf-8", body: html }],
  [
    "/preview.js",
    {
      type: "text/javascript; charset=utf-8",
      body: bundle.outputFiles[0].contents
    }
  ],
  ["/preview.css", { type: "text/css; charset=utf-8", body: css.css }]
]);

if (process.argv.includes("--check")) {
  console.log("Composition fixture compiled; no server started.");
} else {
  const server = createServer({ maxHeaderSize: 8192 }, (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src data:; font-src 'none'; connect-src 'none'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"
    );
    const send = (status, type, body) => {
      response.writeHead(status, { "Content-Type": type });
      response.end(body);
    };
    if (
      request.headers.host !== `127.0.0.1:${port}` ||
      (request.headers.origin && request.headers.origin !== origin) ||
      request.headers["sec-fetch-site"] === "cross-site"
    ) {
      send(403, "text/plain; charset=utf-8", "Fixture origin denied");
      return;
    }
    if (request.method !== "GET") {
      response.setHeader("Allow", "GET");
      send(405, "text/plain; charset=utf-8", "GET only");
      return;
    }
    try {
      const url = new URL(request.url ?? "/", origin);
      const paymentReturn = checkoutPreview && url.pathname === "/tickets/payment"
        && /^\?paymentId=[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(url.search);
      if (url.origin !== origin || (url.search && !paymentReturn) || url.hash) {
        send(400, "text/plain; charset=utf-8", "Invalid fixture URL");
        return;
      }
      const fixturePage = checkoutPreview && ["/tickets", "/tickets/payment", "/terms", "/privacy", "/refund"].includes(url.pathname);
      const asset = assets.get(fixturePage ? "/" : url.pathname);
      if (!asset) {
        send(404, "text/plain; charset=utf-8", "Fixture asset not found");
        return;
      }
      send(200, asset.type, asset.body);
    } catch {
      send(400, "text/plain; charset=utf-8", "Invalid fixture request");
    }
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 1000;
  server.on("error", (error) => {
    console.error("Composition fixture failed:", error.message);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Composition fixture: ${origin}`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () =>
      server.close(() => {
        process.exitCode = 0;
      })
    );
  }
}
