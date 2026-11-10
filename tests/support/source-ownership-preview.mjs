// Synthetic, loopback-only preview of actual production graphics components.
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
const port = 3086;
const origin = `http://127.0.0.1:${port}`;

const bundle = await build({
  absWorkingDir: root,
  entryPoints: ["tests/fixtures/source-ownership-preview.tsx"],
  outfile: "preview.js",
  write: false,
  bundle: true,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  tsconfig: join(root, "tsconfig.json"),
  define: { "process.env": "{}", "process.env.NODE_ENV": '"development"' },
  loader: { ".css": "empty", ".scss": "empty" },
  plugins: [{
    name: "source-ownership-fixture-provider-boundary",
    setup(builder) {
      builder.onResolve({ filter: /^@\/providers\/RP_Pro$/ }, () => ({ path: "rp-store", namespace: "synthetic-rp" }));
      builder.onLoad({ filter: /.*/, namespace: "synthetic-rp" }, () => ({
        loader: "js",
        resolveDir: root,
        contents: 'import { create } from "zustand"; export const useRPStore = create(() => ({ navIsOpen: false }));'
      }));
    }
  }]
});
const from = join(root, "src/styles/globals.css");
const css = await postcss([tailwind()]).process(
  (await readFile(from, "utf8")) +
    '\n@source "../../tests/fixtures/source-ownership-preview.tsx";',
  { from }
);
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Synthetic Batch7c graphics fixture</title><link rel="icon" href="data:,">
<link rel="stylesheet" href="/preview.css"></head>
<body><div id="root"></div><script src="/preview.js" defer></script></body></html>`;
const assets = new Map([
  ["/assets/seamless.png", { type: "image/png", body: await readFile(join(root, "public/assets/seamless.png")) }],
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
  console.log("Source ownership fixture compiled; no server started.");
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
      "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'none'; connect-src 'self'; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"
    );
    const send = (status, type, body) => {
      response.writeHead(status, { "Content-Type": type });
      response.end(body);
    };
    // A browser extension's address-bar navigation may retain cross-site fetch
    // metadata. Allow only the inert top-level GET document, never embeds,
    // subresources or writes. Host and explicit Origin checks still apply.
    const topLevelDocument = request.method === "GET" && request.url === "/"
      && request.headers["sec-fetch-mode"] === "navigate"
      && request.headers["sec-fetch-dest"] === "document";
    if (
      request.headers.host !== `127.0.0.1:${port}` ||
      (request.headers.origin && request.headers.origin !== origin) ||
      (request.headers["sec-fetch-site"] === "cross-site" && !topLevelDocument)
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
      if (url.origin !== origin || url.search || url.hash) {
        send(400, "text/plain; charset=utf-8", "Invalid fixture URL");
        return;
      }
      const asset = assets.get(url.pathname);
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
    console.error("Source ownership fixture failed:", error.message);
    process.exitCode = 1;
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Source ownership fixture: ${origin}`);
  });
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () =>
      server.close(() => {
        process.exitCode = 0;
      })
    );
  }
}
